# Dokumentasi API (OpenAPI 3.0)

Spec dipecah per bagian agar mudah di-maintain — `openapi.yaml` adalah root
yang me-`$ref` file lain; tooling (Redocly, openapi-typescript, dll.)
me-resolve multi-file secara otomatis.

## Struktur

```
docs/
├── openapi.yaml            # root: info, servers, tags, security + $ref tiap path
├── paths/                  # operasi per domain (1 file = 1 controller area)
│   ├── auth.yaml             /auth/*
│   ├── users.yaml            /users, /users/{id}, /users/{id}/password
│   ├── contacts.yaml         /users/{userId}/contacts/*
│   ├── brands|categories|attributes.yaml
│   ├── products.yaml         /products/* (produk, attribute, media, thumbnail)
│   ├── variants.yaml         /products/{productId}/variants/*
│   ├── discounts.yaml        /products/{productId}/discounts/*
│   ├── outlets.yaml          /outlets/* (+ inventory + movements/ledger)
│   ├── cart.yaml             /cart/*
│   ├── orders.yaml           /orders/* (checkout, offline, cancel, outlet-options)
│   ├── payments.yaml         /payments/* (initiate, cash, refund, webhook)
│   ├── invoices.yaml         /invoices/*
│   ├── suppliers.yaml        /suppliers/*
│   ├── purchase-orders.yaml  /purchase-orders/* (+ items, receipts, quick-receive)
│   └── stock-transfers.yaml  /stock-transfers/*
└── components/
    ├── parameters.yaml     # Cursor, Limit, Idempotency-Key, path id, dll.
    ├── responses.yaml      # Error default + wrapper envelope per entitas
    └── schemas/            # skema entitas per kelompok
        ├── common.yaml       ErrorResponse, CursorMeta
        ├── auth.yaml         AuthResult, User, Session, NotificationPref
        ├── contacts.yaml     Contact, ContactInput
        ├── catalog.yaml      Brand, Category, Attribute, Product, Variant, Discount, ...
        ├── outlets.yaml      Outlet, Inventory, StockMovement
        ├── cart.yaml         Cart, CartItem, OutletOption
        ├── orders.yaml       Order, OrderItem
        ├── payments.yaml     Payment, Invoice
        └── purchasing.yaml   Supplier, PurchaseOrder, GoodsReceipt, StockTransfer
```

## Perintah

```bash
pnpm docs:lint      # validasi spec (Redocly) — wajib hijau sebelum commit
pnpm docs:preview   # preview dokumentasi interaktif di browser
pnpm docs:bundle    # gabungkan ke docs/dist/openapi.bundled.yaml (utk generator
                    # client yang tidak mendukung multi-file)
```

## Menambah endpoint baru

1. Tambahkan operasi di `paths/<domain>.yaml` dengan key slug path
   (mis. `/orders/{id}/cancel` → `orders-id-cancel`).
2. Daftarkan path-nya di `openapi.yaml` → `paths:` dengan `$ref` ke key itu.
3. Skema entitas baru masuk ke `components/schemas/<kelompok>.yaml`;
   referensikan dari file paths dengan relative ref
   (`../components/schemas/<kelompok>.yaml#/NamaSkema`).
4. Jalankan `pnpm docs:lint`.

Konvensi konten (envelope, role, error code, idempotensi, rate limit) ada di
`info.description` pada `openapi.yaml` — selaraskan deskripsi endpoint baru
dengan perilaku controller sebenarnya.
