# Ecommerce Backend

Backend e-commerce **multi-outlet** (satu bisnis, banyak cabang — bukan SaaS multi-tenant)
untuk dijual per-bisnis oleh software house. Dibangun dengan **NestJS 11 + Drizzle ORM +
PostgreSQL**, dengan Redis (BullMQ) untuk job asinkron.

## Fitur

| Area | Ringkasan |
|---|---|
| **Auth** | Register/login email+password, **login Google (GIS)**, session token opaque 30 hari, guard global + `@Public()`, role `super_admin`/`admin`/`customer`, rate limiting |
| **Katalog** | Products + variants (dual SKU: `sku_number` publik auto-sequence, `sku_code` internal auto/override), media library WebP tanpa duplikat, brands, categories (tree), attributes (+ nested values), promo terjadwal ber-prioritas |
| **Multi-outlet** | Master cabang (`servesOnline`, `isOnlineDefault`, koordinat), **inventori per-outlet** (`stock` + `reservedStock`), transfer stok antar outlet (DRAFT → SENT → RECEIVED) |
| **Jejak audit stok** | Ledger `stock_movements` append-only — SEMUA mutasi stok (pembelian, penjualan, reservasi, transfer, koreksi, retur) lewat satu pintu dan tercatat dengan snapshot sesudah-mutasi + aktor + dokumen sumber |
| **Pembelian** | Suppliers, purchase order (DRAFT → ORDERED → RECEIVED), penerimaan parsial (GRN) dengan over-receipt ber-flag, **quick-receive** 1 langkah untuk UMKM |
| **Cart & checkout** | Cart per user terikat satu outlet, validasi stok live, routing outlet otomatis (sanggup semua item → terdekat → default), **reservasi stok 2 fase anti-overselling**, checkout idempoten (`Idempotency-Key`), auto-expire reservasi via BullMQ |
| **Pembayaran** | Abstraksi `PaymentGateway` (dummy HMAC siap diganti Midtrans/Xendit), webhook idempoten, **pembayaran tunai POS**, **refund penuh + restock opsional** |
| **Invoice** | Generate PDF (Puppeteer) → upload R2 → email lampiran (Resend) via queue; status UNPAID/PARTIALLY_PAID/PAID/OVERDUE/VOID |

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | **PRD** — latar belakang, persona, goals, kebutuhan fungsional per modul, business rules, roadmap |
| [`docs/ERD.md`](docs/ERD.md) | **ERD** — diagram relasi entitas (Mermaid) per bounded context + catatan integritas |
| [`docs/BUSINESS-FLOW.md`](docs/BUSINESS-FLOW.md) | **Flow bisnis end-to-end** — pengadaan → penjualan → pembayaran → refund, state machine & sequence diagram |
| [`docs/openapi.yaml`](docs/openapi.yaml) | **Kontrak API lengkap** (OpenAPI 3.0, multi-file) — termasuk konvensi envelope response, error code, role, pagination, dan idempotensi |
| [`docs/README.md`](docs/README.md) | Struktur spec multi-file + cara menambah endpoint baru |
| [`.env.example`](.env.example) | Seluruh variabel environment beserta penjelasannya |
| [`drizzle/migrations/`](drizzle/migrations) | Riwayat migrasi database (drizzle-kit) |

Pratinjau dokumentasi API: `pnpm docs:preview` — build HTML (Redoc) lalu membukanya di browser.

## Prasyarat

- Node.js 20+ dan **pnpm**
- PostgreSQL 14+
- Docker (untuk Redis): `docker-compose.yml` sudah disediakan

## Setup

```bash
# 1. Dependensi
pnpm install
pnpm approve-builds          # pilih: puppeteer, sharp, bcrypt (sekali saja)

# 2. Konfigurasi
cp .env.example .env         # lalu isi nilainya (lihat komentar di file)

# 3. Redis (broker BullMQ)
docker compose up -d

# 4. Migrasi database
pnpm db:migrate              # DB kosong / mengikuti riwayat migrasi
# pnpm db:push               # alternatif sinkron schema utk DB development
#                              (JANGAN dipakai bila migrasi memuat pemindahan data)

# 5. Jalankan
pnpm start:dev
```

API berjalan di **`http://localhost:3000/api/v1`** (URI versioning; `PORT` bisa
diubah di `.env`). Contoh: `GET http://localhost:3000/api/v1/products`.

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm start:dev` | Jalankan dengan hot-reload |
| `pnpm build` / `pnpm start:prod` | Build & jalankan produksi |
| `pnpm lint` | ESLint + Prettier (autofix) |
| `pnpm test` | Unit test (Jest) |
| `pnpm db:generate` | Generate migrasi dari perubahan schema |
| `pnpm db:migrate` | Terapkan migrasi |
| `pnpm db:studio` | Drizzle Studio (GUI database) |
| `pnpm docs:lint` | Validasi spec OpenAPI (Redocly) |
| `pnpm docs:build` | Build dokumentasi HTML (Redoc) ke `docs/dist/index.html` |
| `pnpm docs:preview` | Build + buka dokumentasi di browser (macOS `open`) |
| `pnpm docs:bundle` | Gabungkan spec ke satu file (`docs/dist/`) utk generator client |

## Arsitektur & konvensi

```
src/
├── domains/<nama>/          # controller + service + repository + dto + module
├── common/                  # exceptions (defineAppError), pagination cursor,
│                            #   interceptor envelope, filter error, tipe bersama
└── infrastructure/          # database (Drizzle schema), storage (R2), mail,
                             #   pdf (Puppeteer), image (WebP), queue (BullMQ)
```

Konvensi penting (detail lengkap di `docs/openapi.yaml` → `info.description`):

- **Versioning** — semua route di `/api/v1/...` (URI versioning NestJS,
  `defaultVersion: '1'`); endpoint v2 kelak cukup `@Version('2')` per-handler,
  berdampingan dengan v1.
- **Envelope response** otomatis: single `{ ok, data }`, list `{ ok, data, metadata }`,
  error `{ ok: false, error: { code, category, message, details } }`.
- **Identitas dari token** — `Authorization: Bearer <token>`; tidak ada `userId` di body/path
  selain subresource admin. Guard global; route publik ditandai `@Public()`.
- **Uang** = integer Rupiah penuh (`bigint`), tanpa desimal.
- **Soft delete** via `deletedAt`; **pagination** cursor keyset tanpa count.
- **Stok**: available = `stock - reservedStock`; mutasi hanya lewat `OutletsRepository`
  dan selalu menulis ledger dalam transaksi yang sama.
- **Operasi kritis idempoten**: checkout (header `Idempotency-Key`), webhook payment,
  pay-cash, refund — aman terhadap retry.

## Testing

```bash
pnpm test           # 23 suites — util murni (diskon, SKU, ranking outlet, status PO,
                    #   signature gateway) + service ber-mock (users, auth, variants)
pnpm test:cov       # dengan coverage
```

## Lisensi

**Proprietary — All Rights Reserved.** Lihat [LICENSE](LICENSE). Tidak untuk
digunakan/didistribusikan tanpa izin tertulis pemegang hak cipta.
