# PRD — Ecommerce Backend Multi-Outlet

| | |
|---|---|
| **Produk** | Backend e-commerce untuk UMKM kecil–menengah dengan banyak cabang |
| **Model bisnis** | Dijual **per-bisnis** oleh software house (satu deployment = satu bisnis). **Bukan** SaaS multi-tenant |
| **Status** | Backend feature-complete untuk siklus jual-beli inti; lihat [Roadmap](#8-out-of-scope--roadmap) |
| **Dokumen terkait** | [ERD](./ERD.md) · [Business Flow](./BUSINESS-FLOW.md) · [Kontrak API](../docs/openapi.yaml) |

---

## 1. Latar belakang & masalah

UMKM dengan 2–5 cabang umumnya menjalankan toko online dan kasir offline dengan stok
yang tidak sinkron: overselling di web karena stok cabang tidak terlihat, stok "selisih"
tanpa jejak siapa/kapan/kenapa, dan pembelian ke supplier yang tidak tercatat sehingga
harga modal tidak diketahui. Solusi SaaS besar terlalu mahal/kompleks; spreadsheet tidak
punya integritas.

**Tesis produk**: satu backend yang menjadikan *stok per-cabang* sebagai pusat kebenaran —
semua transaksi (jual online, jual kasir, beli, pindah cabang, koreksi, retur) bergerak
melalui satu pintu yang tervalidasi dan ter-audit.

## 2. Persona & peran

| Persona | Role sistem | Kebutuhan utama |
|---|---|---|
| **Pemilik bisnis** | `super_admin` | Melihat dashboard analitik, mengatur user/role, melihat jejak audit stok |
| **Admin/staf gudang/kasir** | `admin` | Kelola katalog & stok, terima barang (PO/GRN), transfer antar cabang, layani POS, refund |
| **Pembeli** | `customer` | Belanja di web: katalog → cart → checkout → bayar → terima invoice |
| **Sistem eksternal** | — | Payment gateway memanggil webhook (HMAC) |

## 3. Goals & non-goals

**Goals**
1. Nol overselling — stok divalidasi atomik saat checkout, direservasi sampai dibayar/kedaluwarsa.
2. Setiap pergerakan stok ter-audit (siapa, kapan, berapa, dokumen sumber).
3. Satu backend melayani dua kanal: web (customer) dan POS (kasir) dengan stok yang sama.
4. Operasional pembelian tercatat (PO → penerimaan, harga modal tersimpan).
5. UX UMKM: alur kilat (quick-receive, pay-cash) di atas mesin yang tetap formal.

**Non-goals (eksplisit)**
- Multi-tenant / multi-bisnis dalam satu deployment.
- Integrasi kurir/ongkir otomatis (ongkir saat ini input dari client).
- Akuntansi penuh (AP/AR, jurnal); hanya menyiapkan datanya (unit_cost, ledger).
- Portal supplier; komunikasi PO ke supplier terjadi di luar sistem (WA/email).

## 4. Kebutuhan fungsional (per modul)

### 4.1 Auth & otorisasi
- Registrasi publik (selalu `customer`), login email+password, **login Google (GIS)** —
  verifikasi ID token server-side; akun Google baru terdaftar tanpa password.
- Session token opaque 30 hari (hash di DB, revocable), **dua transport**:
  Bearer header (mobile/desktop) dan cookie httpOnly (web).
- Guard global (default semua route butuh sesi; pengecualian `@Public()`),
  otorisasi role via `@Roles`, kepemilikan resource via assertSelfOrAdmin.
- Akun `suspended` ditolak saat login maupun pada sesi aktif.
- Rate limit: global 100/menit/IP; login & Google 10/menit; register 5/menit; webhook 30/menit.

### 4.2 Katalog
- Produk dengan **variant** (kombinasi attribute, mis. Warna×Ukuran), dual SKU
  (`sku_number` publik auto-sequence; `sku_code` internal auto `BRAND-SLUG-VALUE`, bisa override).
- Media library per produk (konversi WebP, tanpa duplikat); variant me-reuse media.
- Brands, categories (hierarki/tree), attributes + nilai (mis. warna ber-hex).
- Promo terjadwal per produk (PERCENTAGE ber-cap / FIXED), overlap diresolusi `priority`.
- Wizard create 2 langkah: produk → variant; variant create auto-declare attribute.
- Semua **GET katalog publik** (storefront tanpa login); mutasi admin.

### 4.3 Multi-outlet & inventori
- Master cabang: alamat/kota/provinsi/koordinat, `servesOnline`, satu `isOnlineDefault`.
- **Stok per (outlet, variant)**: `stock` fisik + `reservedStock`; available = selisihnya.
- Penyesuaian stok (opname/koreksi) = set absolut → tercatat ledger `ADJUSTMENT` ber-alasan.
- **Ledger `stock_movements`** append-only: 8 tipe mutasi, delta bertanda, snapshot pasca-mutasi,
  aktor, dan referensi dokumen — endpoint riwayat per variant per outlet.
- Transfer antar outlet: DRAFT → SENT (stok keluar dari available asal) → RECEIVED (masuk tujuan).

### 4.4 Cart & checkout (ONLINE)
- Satu cart per user, terikat **satu outlet** terpilih; harga selalu live (diskon aktif).
- Ganti outlet → seluruh item ter-revalidasi; item kurang stok **ditandai**, tidak dihapus.
- Routing outlet otomatis: kandidat `servesOnline` yang sanggup memenuhi **semua** item
  → terdekat (kota → provinsi → haversine) → fallback default; user boleh override
  (hanya outlet yang sanggup).
- **Kebijakan A**: tak ada outlet sanggup → checkout ditolak dengan detail per item
  (`requested` vs `bestAvailable`); split-order & backorder di luar scope.
- **Reservasi 2 fase**: checkout menahan `reservedStock` (atomic, anti-race);
  bayar → finalisasi (stok fisik berkurang); batal/kedaluwarsa → reservasi lepas.
- Checkout **idempoten** via header `Idempotency-Key` (retry = order yang sama).
- TTL pembayaran (default 30 menit) → auto-expire via job BullMQ.
- Checkout membuat **invoice** tertaut (1:1) dan mengosongkan cart.

### 4.5 POS (OFFLINE)
- Kasir (admin) membuat order untuk pelanggan terdaftar dengan item eksplisit,
  outlet = tempat kasir; tanpa routing & alamat.
- **Pay-cash** satu langkah: order PENDING → PAID + payment `cash` + invoice pipeline.

### 4.6 Pembayaran & invoice
- Abstraksi `PaymentGateway` (DI token) — implementasi pertama dummy ber-HMAC;
  Midtrans/Xendit tinggal implement interface.
- Inisiasi idempoten (maks satu attempt PENDING per order); webhook memverifikasi
  signature, mencocokkan nominal, lalu order PAID + finalisasi stok + invoice PAID.
- Invoice: nomor auto, snapshot item, status UNPAID→…→PAID/VOID; **pipeline asinkron**
  generate PDF (Puppeteer) → upload R2 → email lampiran (Resend) via BullMQ dengan retry.
- **Refund penuh** order PAID (admin): order REFUNDED, payment REFUNDED, restock opsional
  (ledger `REFUND_RESTOCK`); invoice tetap PAID sebagai dokumen historis; dana di luar sistem.

### 4.7 Pembelian (purchasing)
- Master supplier; PO per outlet tujuan dengan `unit_cost` per item (dasar COGS).
- Siklus: DRAFT (item bebas diubah) → ORDERED → penerimaan **parsial & berulang** (GRN)
  → PARTIALLY_RECEIVED/RECEIVED otomatis dari progres; cancel hanya sebelum ada penerimaan.
- **Over-receipt diizinkan** dan ditandai per item GRN.
- **Quick-receive**: PO+GRN+stok dalam satu transaksi — UX "Barang Masuk" satu layar
  untuk UMKM yang belanja tanpa memesan dulu.

### 4.8 Analytics (dashboard, admin)
- Sales: summary (revenue/order/AOV + growth MoM & YoY + refund/cancellation rate),
  time series day/week/month (timezone configurable), revenue per kategori.
- Product: best sellers (qty/revenue), slow-moving & dead stock (≥ N hari tanpa penjualan,
  terurut nilai stok tertahan), views vs purchases per produk.
- Inventory: alert low-stock (ambang via param) & out-of-stock per outlet.
- Sumber views: event publik `POST /events/product-view` (anonim, throttled);
  conversion visitor→order site-wide memakai analytics eksternal (keputusan produk).

## 5. Business rules kunci

| # | Aturan |
|---|---|
| BR-1 | Available stock = `stock − reservedStock`; tidak pernah negatif (CHECK + update bersyarat) |
| BR-2 | Satu order = satu outlet; satu order = maksimal satu invoice |
| BR-3 | Revenue diakui pada `paidAt` (status PAID); refund dilaporkan terpisah, tidak mengurangi diam-diam |
| BR-4 | Harga di cart selalu live; snapshot harga hanya terjadi saat checkout (order_items) |
| BR-5 | Semua mutasi stok wajib melalui `OutletsRepository` dan menulis ledger dalam transaksi yang sama |
| BR-6 | Transisi status order/PO/transfer memakai conditional update (kebal race webhook vs expire) |
| BR-7 | Registrasi publik tidak pernah menerima `role`; pembuatan admin hanya oleh admin |
| BR-8 | Operasi non-idempoten yang dipicu retry (checkout, webhook, pay-cash, refund) harus aman dipanggil ulang |

## 6. Kebutuhan non-fungsional

- **Keamanan**: bcrypt cost 12; token sesi di-hash; HMAC webhook timing-safe; CORS origin
  eksplisit + credentials; anti enumerasi email pada login; cookie httpOnly+secure+lax.
- **Konsistensi API**: base path ber-versi `/api/v1` (URI versioning — v2 dapat hidup
  berdampingan per-endpoint); envelope `{ok,data[,metadata]}`; error terstruktur ber-kode;
  pagination cursor keyset tanpa count; validasi DTO class-validator (whitelist + forbid).
- **Skala sasaran**: ratusan order/hari, 2–5 outlet, puluhan ribu SKU — agregasi analitik
  on-the-fly cukup; jalur scaling (materialized view, partisi ledger/views) tanpa ubah API.
- **Observabilitas**: request-id middleware; job queue retry exponential; failure reason tercatat.
- **Kualitas**: build+lint strict (no `any`), unit test untuk util murni & service kritis.

## 7. Metrik keberhasilan produk

1. **0 kejadian overselling** pada operasi normal (terukur: tidak ada `available < 0`).
2. 100% mutasi stok punya baris ledger (terukur: rekonsiliasi `outlet_inventory` vs replay ledger).
3. Selisih stok opname bulanan menurun (ledger menjawab "ke mana barangnya").
4. Waktu input "barang masuk" < 1 menit via quick-receive.
5. Dashboard menjawab: produk apa yang laku, stok mana yang mati, cabang mana yang kehabisan.

## 8. Out of scope / roadmap

| Item | Status |
|---|---|
| Gateway riil (Midtrans/Xendit) | Interface siap; implement saat go-live |
| Ongkir otomatis (RajaOngkir/biteship) | Field `shippingFee` siap |
| Split order multi-outlet & backorder | Ditunda by-decision (kebijakan A dipilih) |
| Harga/diskon per outlet | Ditunda; titik resolusi harga sudah terpusat |
| AP/3-way match (tagihan supplier) | Data `unit_cost` PO/GRN sudah menyiapkan |
| Verifikasi email/phone (OTP), magic link, 2FA | Primitif & error code tersedia |
| PDF invoice untuk customer (ber-kepemilikan) | Invoice masih admin-only |
| E2E test alur checkout→bayar | Unit test ada; e2e belum |
