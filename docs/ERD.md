# ERD — Ecommerce Backend

Diagram relasi entitas, dikelompokkan per bounded context agar terbaca.
Sumber kebenaran: `src/infrastructure/database/schema/*.entity.ts` (migrasi `drizzle/migrations/`).

**Konvensi id**: master data internal memakai `bigserial` (brands, attributes, products,
variants, outlets, suppliers); entitas publik/dokumen memakai `uuid` v7 time-ordered
(users, categories, invoices, orders, carts, payments, PO, GRN, transfers).
**Uang** = `bigint` Rupiah penuh. **Soft delete** = kolom `deleted_at`.

---

## 1. Identity & Auth

```mermaid
erDiagram
    users ||--o{ user_contacts : "punya alamat"
    users ||--o{ sessions : "punya sesi"
    users ||--o{ otp_verifications : "punya OTP"

    users {
        uuid id PK
        varchar email UK
        varchar name
        varchar phone
        enum role "super_admin | admin | customer"
        enum status "active | suspended"
        varchar password "nullable (akun OAuth-only)"
        jsonb oauth_metadata "provider google"
        jsonb notification_pref
        timestamptz last_login_at
        timestamptz deleted_at
    }
    user_contacts {
        uuid id PK
        uuid user_id FK
        varchar recipient_name
        varchar phone
        text street
        varchar district
        varchar city
        varchar province
        varchar postal_code
        decimal latitude
        decimal longitude
        boolean is_primary "maks 1 per user (partial unique)"
        boolean is_active
    }
    sessions {
        uuid id PK
        uuid user_id FK
        text token UK "SHA-256 hash, bukan plain"
        text user_agent
        text ip_address
        timestamptz expires_at "30 hari"
        timestamptz last_activity_at
    }
```

## 2. Katalog

```mermaid
erDiagram
    categories ||--o{ categories : "parent-child"
    categories ||--o{ products : ""
    brands |o--o{ products : ""
    users ||--o{ products : "created_by"
    products ||--o{ product_attributes : "deklarasi attribute"
    attributes ||--o{ product_attributes : ""
    attributes ||--o{ attribute_values : ""
    products ||--o{ product_media : "media library"
    products ||--o{ product_variants : ""
    products ||--o{ product_discounts : "promo terjadwal"
    product_variants ||--o{ variant_attributes : "nilai konkret"
    attribute_values ||--o{ variant_attributes : ""
    product_variants ||--o{ variant_media : "reuse media"
    product_media ||--o{ variant_media : ""

    products {
        bigserial id PK
        varchar name
        varchar slug UK
        uuid category_id FK
        bigint brand_id FK "nullable"
        enum status "draft | active | inactive"
        bigint thumbnail_media_id FK
        bigint min_price "cache variant termurah"
        uuid created_by FK
    }
    product_variants {
        bigserial id PK
        bigint product_id FK
        bigint sku_number UK "publik, auto pgSequence"
        varchar sku_code UK "internal BRAND-SLUG-VALUE"
        bigint price "Rupiah penuh"
        bigint compare_at_price
        integer weight "gram"
        boolean is_default "maks 1 per product (partial unique)"
        enum status "active | inactive"
    }
    product_discounts {
        bigserial id PK
        bigint product_id FK
        enum type "PERCENTAGE | FIXED"
        numeric percentage
        bigint fixed_amount
        bigint max_discount
        integer priority "besar menang saat overlap"
        timestamptz start_at
        timestamptz end_at
        boolean is_active
    }
```

> Stok **tidak** disimpan di `product_variants` — sepenuhnya per-outlet (lihat bagian 3).

## 3. Outlet, Inventori & Ledger Audit

```mermaid
erDiagram
    outlets ||--o{ outlet_inventory : "stok per variant"
    product_variants ||--o{ outlet_inventory : ""
    outlets ||--o{ stock_movements : "jejak audit"
    product_variants ||--o{ stock_movements : ""
    users |o--o{ stock_movements : "actor"

    outlets {
        bigserial id PK
        varchar name
        varchar code UK
        varchar city
        varchar province
        decimal latitude
        decimal longitude
        boolean is_active
        boolean serves_online "melayani order web"
        boolean is_online_default "maks 1 (partial unique)"
        jsonb opening_hours
    }
    outlet_inventory {
        bigserial id PK
        bigint outlet_id FK
        bigint variant_id FK
        integer stock "CHECK >= 0"
        integer reserved_stock "CHECK >= 0 dan <= stock"
    }
    stock_movements {
        bigserial id PK
        bigint outlet_id FK
        bigint variant_id FK
        enum type "PURCHASE_RECEIPT|ADJUSTMENT|SALE|RESERVE|RELEASE|TRANSFER_IN|TRANSFER_OUT|REFUND_RESTOCK"
        integer stock_change "delta bertanda"
        integer reserved_change "delta bertanda"
        integer stock_after "snapshot pasca-mutasi"
        integer reserved_after
        varchar ref_type "order | goods_receipt | stock_transfer"
        varchar ref_id
        uuid actor_id FK
        varchar note
    }
```

> `outlet_inventory` unik per `(outlet_id, variant_id)`. **Available = stock − reserved_stock.**
> `stock_movements` append-only; SEMUA mutasi stok lewat satu pintu (`OutletsRepository`)
> dan menulis ledger dalam transaksi yang sama.

## 4. Cart, Order, Payment, Invoice

```mermaid
erDiagram
    users ||--o| carts : "1 cart aktif"
    outlets |o--o{ carts : "outlet terpilih"
    carts ||--o{ cart_items : ""
    product_variants ||--o{ cart_items : ""

    users ||--o{ orders : ""
    outlets ||--o{ orders : "1 order = 1 outlet"
    orders ||--o{ order_items : "snapshot"
    products ||--o{ order_items : ""
    product_variants ||--o{ order_items : ""
    orders |o--|| invoices : "1:1 via invoice_id"
    orders ||--o{ payments : "attempt"
    users ||--o{ idempotency_keys : ""
    orders |o--o{ idempotency_keys : "hasil checkout"

    carts {
        uuid id PK
        uuid user_id FK "UK"
        bigint outlet_id FK "nullable"
    }
    cart_items {
        bigserial id PK
        uuid cart_id FK
        bigint variant_id FK
        integer quantity "CHECK > 0; tanpa snapshot harga"
    }
    orders {
        uuid id PK
        varchar order_number UK "ORD-YYYYMMDD-XXXXXX"
        uuid user_id FK
        bigint outlet_id FK
        enum channel "ONLINE | OFFLINE"
        enum status "PENDING|PAID|CANCELLED|EXPIRED|REFUNDED"
        uuid invoice_id FK "UK nullable"
        jsonb shipping_address "snapshot user_contacts"
        bigint subtotal
        bigint discount_total
        bigint shipping_fee
        bigint total
        timestamptz expires_at "TTL bayar"
        timestamptz paid_at
        timestamptz cancelled_at
        timestamptz refunded_at
    }
    order_items {
        bigserial id PK
        uuid order_id FK
        bigint product_id FK
        bigint variant_id FK
        varchar product_name "snapshot"
        varchar sku_code "snapshot"
        bigint unit_price "pasca-diskon"
        bigint discount_amount
        integer quantity
        bigint line_total
    }
    payments {
        uuid id PK
        uuid order_id FK
        varchar provider "dummy | cash"
        varchar payment_code
        bigint amount
        enum status "PENDING|SUCCEEDED|FAILED|EXPIRED|REFUNDED"
        timestamptz paid_at
    }
    idempotency_keys {
        bigserial id PK
        uuid user_id FK
        varchar scope "checkout"
        varchar key "unik per (user, scope, key)"
        uuid order_id FK "null = in-flight"
    }
    invoices {
        uuid id PK
        varchar invoice_number UK "INV-YYYYMMDD-XXXXXX"
        varchar customer_name
        varchar customer_email
        jsonb items "snapshot imutabel"
        bigint subtotal
        bigint total
        varchar status "UNPAID|PARTIALLY_PAID|PAID|OVERDUE|VOID"
        bigint amount_paid
        varchar pdf_key "R2 object"
        varchar pdf_status "PENDING|PROCESSING|READY|FAILED"
        varchar email_status "PENDING|SENT|FAILED"
    }
```

> `payments` punya partial unique: maksimal **satu attempt PENDING per order**.
> Invoice menyimpan item sebagai **jsonb snapshot** (imutabel terhadap perubahan katalog).

## 5. Pembelian (Purchasing)

```mermaid
erDiagram
    suppliers ||--o{ purchase_orders : ""
    outlets ||--o{ purchase_orders : "tujuan penerimaan"
    users ||--o{ purchase_orders : "created_by"
    purchase_orders ||--o{ purchase_order_items : ""
    product_variants ||--o{ purchase_order_items : ""
    purchase_orders ||--o{ goods_receipts : "GRN, parsial & berulang"
    users ||--o{ goods_receipts : "received_by"
    goods_receipts ||--o{ goods_receipt_items : ""
    purchase_order_items ||--o{ goods_receipt_items : ""

    suppliers {
        bigserial id PK
        varchar name
        varchar code UK
        boolean is_active
    }
    purchase_orders {
        uuid id PK
        varchar po_number UK "PO-YYYYMMDD-XXXXXX"
        bigint supplier_id FK
        bigint outlet_id FK
        enum status "DRAFT|ORDERED|PARTIALLY_RECEIVED|RECEIVED|CANCELLED"
        timestamptz expected_at
        uuid created_by FK
    }
    purchase_order_items {
        bigserial id PK
        uuid po_id FK
        bigint variant_id FK "unik per PO"
        integer qty_ordered "CHECK > 0"
        bigint unit_cost "harga beli, dasar COGS"
        integer qty_received "cache; boleh > qty_ordered"
    }
    goods_receipts {
        uuid id PK
        varchar receipt_number UK "GRN-YYYYMMDD-XXXXXX"
        uuid po_id FK
        bigint outlet_id FK
        uuid received_by FK
        timestamptz received_at
    }
    goods_receipt_items {
        bigserial id PK
        uuid receipt_id FK
        bigint po_item_id FK
        bigint variant_id FK
        integer qty_received "CHECK > 0"
        bigint unit_cost "snapshot"
        boolean over_received "melebihi sisa pesanan"
    }
```

## 6. Transfer Stok Antar Outlet

```mermaid
erDiagram
    outlets ||--o{ stock_transfers : "asal (from)"
    outlets ||--o{ stock_transfers : "tujuan (to)"
    users ||--o{ stock_transfers : "created_by"
    stock_transfers ||--o{ stock_transfer_items : ""
    product_variants ||--o{ stock_transfer_items : ""

    stock_transfers {
        uuid id PK
        varchar transfer_number UK "TRF-YYYYMMDD-XXXXXX"
        bigint from_outlet_id FK
        bigint to_outlet_id FK "CHECK beda dari asal"
        enum status "DRAFT|SENT|RECEIVED|CANCELLED"
        uuid created_by FK
        timestamptz sent_at
        timestamptz received_at
    }
    stock_transfer_items {
        bigserial id PK
        uuid transfer_id FK
        bigint variant_id FK "unik per transfer"
        integer quantity "CHECK > 0"
    }
```

## 7. Analytics (Event)

```mermaid
erDiagram
    products ||--o{ product_views : "view storefront"
    product_variants |o--o{ product_views : ""

    product_views {
        bigserial id PK
        bigint product_id FK
        bigint variant_id FK "nullable"
        timestamptz viewed_at "anonim, append-only"
    }
```

---

## Catatan integritas penting

| Mekanisme | Lokasi | Tujuan |
|---|---|---|
| Partial unique `is_primary` | `user_contacts` | Satu alamat utama per user |
| Partial unique `is_default` | `product_variants` | Satu variant default per product |
| Partial unique `is_online_default` | `outlets` | Satu outlet fallback routing online |
| Partial unique `status = PENDING` | `payments` | Satu attempt pembayaran aktif per order |
| Unique `(user, scope, key)` | `idempotency_keys` | Anti order ganda saat retry checkout |
| CHECK `reserved <= stock`, `>= 0` | `outlet_inventory` | Pagar terakhir anti-overselling |
| UPDATE atomic bersyarat | reservasi/finalisasi stok | Anti race antar checkout tanpa lock eksplisit |
| Append-only + snapshot after | `stock_movements` | Jejak audit stok dapat direkonstruksi |
