import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';

import { users } from './schema/users.entity';
import { brands } from './schema/brands.entity';
import { categories } from './schema/categories.entity';
import { attributes, attributeValues } from './schema/attributes.entity';
import {
  products,
  productAttributes,
  productMedia,
} from './schema/products.entity';
import {
  productVariants,
  variantAttributes,
  variantMedia,
} from './schema/product-variants.entity';
import { orders, orderItems } from './schema/orders.entity';

// ─── constants ───────────────────────────────────────────────────────────────

const THUMBNAIL_URL = 'products/1780512857915_o0f6js.webp';
const CREATED_BY = '019efcac-4a97-7da8-b5a3-554bb9201506';
const OUTLET_ID = 2;

// ─── helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Cast unknown to number safely */
function asNum(v: unknown): number {
  return v as number;
}

/** Cast unknown to string safely */
function asStr(v: unknown): string {
  return v as string;
}

type Row = Record<string, unknown>;

/** Insert rows in chunks; returns inserted rows. */
async function chunkInsert(
  db: ReturnType<typeof drizzle>,
  table: Parameters<ReturnType<typeof drizzle>['insert']>[0],
  rows: Row[],
  chunkSize = 500
): Promise<Row[]> {
  const results: Row[] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const inserted = (await db
      .insert(table)
      .values(chunk)
      .returning()) as Row[];
    for (const row of inserted) results.push(row);
    process.stdout.write(
      `\r  inserted ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`
    );
  }
  console.log();
  return results;
}

// ─── static master data ──────────────────────────────────────────────────────

const BRAND_NAMES = [
  'Nike',
  'Adidas',
  'Puma',
  'New Balance',
  'Reebok',
  'Converse',
  'Vans',
  'Under Armour',
  'Fila',
  'Asics',
] as const;

const CATEGORY_TREE = [
  {
    name: 'Pakaian Pria',
    slug: 'pakaian-pria',
    children: ['Kaos Pria', 'Kemeja Pria', 'Celana Pria', 'Jaket Pria'],
  },
  {
    name: 'Pakaian Wanita',
    slug: 'pakaian-wanita',
    children: ['Kaos Wanita', 'Blouse Wanita', 'Celana Wanita', 'Jaket Wanita'],
  },
  {
    name: 'Sepatu',
    slug: 'sepatu',
    children: ['Sepatu Pria', 'Sepatu Wanita', 'Sepatu Anak', 'Sandal'],
  },
  {
    name: 'Aksesoris',
    slug: 'aksesoris',
    children: ['Topi', 'Tas', 'Kacamata', 'Jam Tangan'],
  },
  {
    name: 'Olahraga',
    slug: 'olahraga',
    children: [
      'Pakaian Olahraga',
      'Sepatu Olahraga',
      'Peralatan Gym',
      'Outdoor',
    ],
  },
] as const;

interface AttrValueDef {
  value: string;
  displayValue: string;
  colorHex?: string;
}

interface AttrDef {
  name: string;
  displayName: string;
  type: 'color' | 'text' | 'number';
  values: AttrValueDef[];
}

const ATTRIBUTE_DEFS: AttrDef[] = [
  {
    name: 'color',
    displayName: 'Warna',
    type: 'color',
    values: [
      { value: 'red', displayValue: 'Merah', colorHex: '#FF0000' },
      { value: 'blue', displayValue: 'Biru', colorHex: '#0000FF' },
      { value: 'black', displayValue: 'Hitam', colorHex: '#000000' },
      { value: 'white', displayValue: 'Putih', colorHex: '#FFFFFF' },
      { value: 'green', displayValue: 'Hijau', colorHex: '#008000' },
      { value: 'yellow', displayValue: 'Kuning', colorHex: '#FFFF00' },
      { value: 'navy', displayValue: 'Navy', colorHex: '#001F5B' },
      { value: 'grey', displayValue: 'Abu-abu', colorHex: '#808080' },
    ],
  },
  {
    name: 'size',
    displayName: 'Ukuran',
    type: 'text',
    values: [
      { value: 'xs', displayValue: 'XS' },
      { value: 's', displayValue: 'S' },
      { value: 'm', displayValue: 'M' },
      { value: 'l', displayValue: 'L' },
      { value: 'xl', displayValue: 'XL' },
      { value: 'xxl', displayValue: 'XXL' },
    ],
  },
  {
    name: 'material',
    displayName: 'Material',
    type: 'text',
    values: [
      { value: 'cotton', displayValue: 'Katun' },
      { value: 'polyester', displayValue: 'Polyester' },
      { value: 'linen', displayValue: 'Linen' },
      { value: 'wool', displayValue: 'Wool' },
      { value: 'denim', displayValue: 'Denim' },
    ],
  },
];

const PRODUCT_ADJECTIVES = [
  'Premium',
  'Classic',
  'Modern',
  'Sport',
  'Casual',
  'Slim',
  'Relaxed',
  'Essential',
  'Active',
  'Urban',
  'Heritage',
  'Performance',
  'Comfort',
  'Street',
  'Trend',
] as const;

const PRODUCT_NOUNS = [
  'Tee',
  'Shirt',
  'Jogger',
  'Hoodie',
  'Jacket',
  'Polo',
  'Shorts',
  'Sneaker',
  'Runner',
  'Cap',
  'Backpack',
  'Sling Bag',
  'Track Pants',
  'Windbreaker',
  'Vest',
] as const;

const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
] as const;
const ORDER_CHANNELS = ['ONLINE', 'OFFLINE'] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type OrderChannel = (typeof ORDER_CHANNELS)[number];

// ─── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL tidak ditemukan');

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    // ── 1. BRANDS ────────────────────────────────────────────────────────────
    console.log('\n[1/8] Seeding brands...');
    const brandRows: Row[] = BRAND_NAMES.map((name) => ({
      name,
      slug: slugify(name),
      logo: THUMBNAIL_URL,
      isActive: true,
    }));
    const insertedBrands = await chunkInsert(db, brands, brandRows);
    const brandIds: number[] = insertedBrands.map((b) => asNum(b['id']));
    console.log(`  → ${insertedBrands.length} brands`);

    // ── 2. CATEGORIES ────────────────────────────────────────────────────────
    console.log('\n[2/8] Seeding categories...');
    const categoryRows: Row[] = [];

    for (const cat of CATEGORY_TREE) {
      const parentId = uuidv7();
      categoryRows.push({
        id: parentId,
        parentId: null,
        name: cat.name,
        slug: cat.slug,
        isActive: true,
        sortOrder: 0,
      });
      cat.children.forEach((child, idx) => {
        categoryRows.push({
          id: uuidv7(),
          parentId,
          name: child,
          slug: slugify(child),
          isActive: true,
          sortOrder: idx,
        });
      });
    }
    const insertedCategories = await chunkInsert(db, categories, categoryRows);
    const leafCategoryIds: string[] = insertedCategories
      .filter((c) => c['parent_id'] !== null)
      .map((c) => asStr(c['id']));
    console.log(
      `  → ${insertedCategories.length} categories (${leafCategoryIds.length} leaf)`
    );

    // ── 3. ATTRIBUTES & VALUES ───────────────────────────────────────────────
    console.log('\n[3/8] Seeding attributes & values...');
    const attrRows: Row[] = ATTRIBUTE_DEFS.map((a) => ({
      name: a.name,
      displayName: a.displayName,
      type: a.type,
    }));
    const insertedAttrs = await chunkInsert(db, attributes, attrRows);

    const attrIdMap: Record<string, number> = {};
    for (const a of insertedAttrs) {
      attrIdMap[asStr(a['name'])] = asNum(a['id']);
    }

    const attrValueRows: Row[] = [];
    for (const def of ATTRIBUTE_DEFS) {
      const attributeId = attrIdMap[def.name];
      def.values.forEach((v, idx) => {
        attrValueRows.push({
          attributeId,
          value: v.value,
          displayValue: v.displayValue,
          colorHex: v.colorHex ?? null,
          sortOrder: idx,
          isActive: true,
        });
      });
    }
    const insertedAttrValues = await chunkInsert(
      db,
      attributeValues,
      attrValueRows
    );
    console.log(
      `  → ${insertedAttrs.length} attributes, ${insertedAttrValues.length} values`
    );

    // build attrName → value id array
    const attrValuesByAttr: Record<string, number[]> = {};
    for (const av of insertedAttrValues) {
      const attrId = asNum(av['attribute_id']); // pastikan number
      const attrName = Object.keys(attrIdMap).find(
        (k) => attrIdMap[k] === attrId
      );
      if (!attrName) continue;
      if (!attrValuesByAttr[attrName]) attrValuesByAttr[attrName] = [];
      attrValuesByAttr[attrName].push(asNum(av['id']));
    }

    const colorValues = attrValuesByAttr['color'] ?? [];
    const sizeValues = attrValuesByAttr['size'] ?? [];
    const materialValues = attrValuesByAttr['material'] ?? [];

    // ── 4. USERS ─────────────────────────────────────────────────────────────
    console.log('\n[4/8] Seeding 1 000 users...');
    const userRows: Row[] = Array.from({ length: 1000 }, (_, i) => ({
      id: uuidv7(),
      email: `customer${i + 1}@example.com`,
      name: `Customer ${i + 1}`,
      phone: `0812${String(i + 1).padStart(8, '0')}`,
      role: 'customer',
      status: 'active',
      emailIsVerified: true,
      password: 'Customer123!',
    }));
    const insertedUsers = await chunkInsert(db, users, userRows);
    const userIds: string[] = insertedUsers.map((u) => asStr(u['id']));
    console.log(`  → ${insertedUsers.length} users`);

    // ── 5. PRODUCTS ──────────────────────────────────────────────────────────
    console.log('\n[5/8] Seeding 10 000 products...');
    const productRows: Row[] = [];
    for (let i = 0; i < 10_000; i++) {
      const adj = PRODUCT_ADJECTIVES[i % PRODUCT_ADJECTIVES.length];
      const noun = PRODUCT_NOUNS[i % PRODUCT_NOUNS.length];
      const brandName = BRAND_NAMES[i % BRAND_NAMES.length];
      const name = `${brandName} ${adj} ${noun} ${i + 1}`;
      productRows.push({
        name,
        slug: `${slugify(name)}-${i + 1}`,
        description: `Deskripsi lengkap untuk ${name}. Produk berkualitas tinggi dengan bahan pilihan.`,
        shortDescription: `${adj} ${noun} dari ${brandName}`,
        categoryId: leafCategoryIds[i % leafCategoryIds.length],
        brandId: brandIds[i % brandIds.length],
        status: 'active',
        minPrice: randInt(50_000, 2_000_000),
        createdBy: CREATED_BY,
      });
    }
    const insertedProducts = await chunkInsert(db, products, productRows);
    const productIds: number[] = insertedProducts.map((p) => asNum(p['id']));
    const productNameMap: Record<number, string> = {};
    const productPriceMap: Record<number, number> = {};
    for (const p of insertedProducts) {
      const pid = asNum(p['id']);
      productNameMap[pid] = asStr(p['name']);
      productPriceMap[pid] = asNum(p['min_price']);
    }
    console.log(`  → ${insertedProducts.length} products`);

    // ── 6. PRODUCT MEDIA + THUMBNAIL ─────────────────────────────────────────
    console.log('\n[6/8] Seeding product media...');
    const mediaRows: Row[] = productIds.map((pid) => ({
      productId: pid,
      imageUrl: THUMBNAIL_URL,
      imageAlt: productNameMap[pid] ?? '',
      sortOrder: 0,
    }));
    const insertedMedia = await chunkInsert(db, productMedia, mediaRows);

    const productMediaMap: Record<number, number> = {};
    for (const m of insertedMedia) {
      productMediaMap[asNum(m['product_id'])] = asNum(m['id']);
    }
    console.log(`  → ${insertedMedia.length} media`);

    console.log('  Updating thumbnail_media_id...');
    const updatePairs = productIds
      .map((pid) => ({ pid, mid: productMediaMap[pid] }))
      .filter((x) => x.mid !== undefined);

    for (let i = 0; i < updatePairs.length; i += 500) {
      const chunk = updatePairs.slice(i, i + 500);

      // Gunakan unnest — lebih aman dan tidak ada string interpolation issue
      const pids = chunk.map((x) => x.pid);
      const mids = chunk.map((x) => x.mid);

      await pool.query(
        `UPDATE products SET thumbnail_media_id = v.mid
          FROM unnest($1::int[], $2::int[]) AS v(pid, mid)
         WHERE products.id = v.pid`,
        [pids, mids]
      );

      process.stdout.write(
        `\r  updated ${Math.min(i + 500, updatePairs.length)} / ${updatePairs.length}`
      );
    }
    console.log();

    // ── 7. PRODUCT ATTRIBUTES + VARIANTS ─────────────────────────────────────
    console.log('\n[7/8] Seeding product attributes & variants...');

    const productAttrRows: Row[] = [];
    for (const pid of productIds) {
      Object.entries(attrIdMap).forEach(([, attrId], idx) => {
        productAttrRows.push({
          productId: pid,
          attributeId: attrId,
          isRequired: true,
          sortOrder: idx,
        });
      });
    }
    await chunkInsert(db, productAttributes, productAttrRows);
    console.log(`  → ${productAttrRows.length} product attributes`);

    // variants — 5 per product
    const variantRows: Row[] = [];
    for (const pid of productIds) {
      const basePrice = productPriceMap[pid] ?? randInt(50_000, 2_000_000);
      for (let v = 0; v < 5; v++) {
        const colorDisplay =
          ATTRIBUTE_DEFS[0].values[v % colorValues.length]?.displayValue ??
          'Color';
        const sizeDisplay =
          ATTRIBUTE_DEFS[1].values[v % sizeValues.length]?.displayValue ??
          'Size';
        const price = basePrice + v * 10_000;
        variantRows.push({
          productId: pid,
          skuCode: `SKU-${pid}-V${v + 1}`,
          variantName: `${colorDisplay} / ${sizeDisplay}`,
          price,
          compareAtPrice: price + randInt(5_000, 50_000),
          weight: randInt(200, 2000),
          isDefault: v === 0,
          status: 'active',
        });
      }
    }

    console.log(`  Inserting ${variantRows.length} variants...`);
    const insertedVariants = await chunkInsert(
      db,
      productVariants,
      variantRows
    );
    const variantIds: number[] = insertedVariants.map((v) => asNum(v['id']));
    const variantPriceMap: Record<number, number> = {};
    const variantProductMap: Record<number, number> = {};
    for (const v of insertedVariants) {
      const vid = Number(v['id']);
      variantPriceMap[vid] = Number(v['price']);
      variantProductMap[vid] = Number(v['product_id']);
    }
    console.log(`  → ${insertedVariants.length} variants`);

    // variant attributes
    const variantAttrRows: Row[] = [];
    const variantMediaRows: Row[] = [];
    for (let i = 0; i < insertedVariants.length; i++) {
      const vid = asNum(insertedVariants[i]['id']);
      const pid = asNum(insertedVariants[i]['product_id']);
      const vIdx = i % 5;
      const mediaId = productMediaMap[pid];

      const colorValId = colorValues[vIdx % colorValues.length];
      const sizeValId = sizeValues[vIdx % sizeValues.length];
      const materialValId = materialValues[vIdx % materialValues.length];

      // skip kalau ada value yang undefined
      if (
        colorValId === undefined ||
        sizeValId === undefined ||
        materialValId === undefined
      ) {
        console.warn(`  ⚠ Skipping variant ${vid} — missing attribute value`);
        continue;
      }

      variantAttrRows.push({
        variantId: vid,
        attributeId: attrIdMap['color'],
        attributeValueId: colorValId,
      });
      variantAttrRows.push({
        variantId: vid,
        attributeId: attrIdMap['size'],
        attributeValueId: sizeValId,
      });
      variantAttrRows.push({
        variantId: vid,
        attributeId: attrIdMap['material'],
        attributeValueId: materialValId,
      });

      if (mediaId !== undefined) {
        variantMediaRows.push({
          variantId: vid,
          mediaId,
          sortOrder: 0,
          isDefault: true,
        });
      }
    }

    console.log(`  Inserting ${variantAttrRows.length} variant attributes...`);
    await chunkInsert(db, variantAttributes, variantAttrRows);

    console.log(`  Inserting ${variantMediaRows.length} variant media...`);
    await chunkInsert(db, variantMedia, variantMediaRows);

    // ── 8. ORDERS + ORDER ITEMS ──────────────────────────────────────────────
    console.log('\n[8/8] Seeding 20 000 orders...');

    const orderRowsBatch: Row[] = [];
    const orderItemRowsBatch: Row[] = [];

    for (let o = 0; o < 20_000; o++) {
      const orderId = uuidv7();
      const status: OrderStatus = rand(ORDER_STATUSES);
      const channel: OrderChannel = rand(ORDER_CHANNELS);

      const pickedVariants: number[] = [];
      while (pickedVariants.length < 5) {
        const vId = rand(variantIds);
        if (!pickedVariants.includes(vId)) pickedVariants.push(vId);
      }

      let subtotal = 0;
      let validItems = 0;
      for (const vId of pickedVariants) {
        const pid = variantProductMap[vId];

        // skip kalau pid undefined atau 0
        if (!pid) {
          console.warn(`  ⚠ variantProductMap miss for variantId=${vId}`);
          continue;
        }

        const unitPrice = variantPriceMap[vId] ?? 100_000;
        const qty = randInt(1, 5);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        validItems++;

        orderItemRowsBatch.push({
          orderId,
          productId: pid,
          variantId: vId,
          productName: productNameMap[pid] ?? 'Product',
          variantName: `Variant ${vId}`,
          skuCode: `SKU-${pid}-V${pickedVariants.indexOf(vId) + 1}`,
          unitPrice,
          discountAmount: 0,
          quantity: qty,
          lineTotal,
        });
      }

      if (validItems === 0) continue;

      const shippingFee = channel === 'ONLINE' ? randInt(9_000, 50_000) : 0;
      const total = subtotal + shippingFee;

      const now = new Date();
      const createdAt = new Date(
        now.getTime() - randInt(0, 180) * 24 * 60 * 60 * 1000
      );
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      orderRowsBatch.push({
        id: orderId,
        orderNumber: `ORD-${String(o + 1).padStart(8, '0')}`,
        userId: rand(userIds),
        outletId: OUTLET_ID,
        channel,
        status,
        invoiceId: null,
        shippingAddress:
          channel === 'ONLINE'
            ? {
                recipientName: `Customer ${randInt(1, 1000)}`,
                phone: `0812${String(o).padStart(8, '0')}`,
                street: `Jl. Contoh No. ${o + 1}`,
                district: 'Menteng',
                city: 'Jakarta Pusat',
                province: 'DKI Jakarta',
                postalCode: '10310',
                country: 'Indonesia',
                notes: null,
                latitude: null,
                longitude: null,
              }
            : null,
        subtotal,
        discountTotal: 0,
        shippingFee,
        total,
        expiresAt,
        paidAt:
          status === 'PAID'
            ? new Date(createdAt.getTime() + randInt(1, 60) * 60 * 1000)
            : null,
        cancelledAt:
          status === 'CANCELLED'
            ? new Date(createdAt.getTime() + randInt(1, 120) * 60 * 1000)
            : null,
        refundedAt:
          status === 'REFUNDED'
            ? new Date(createdAt.getTime() + randInt(2, 240) * 60 * 1000)
            : null,
        createdAt,
        updatedAt: createdAt,
      });
    }

    console.log(`  Inserting ${orderRowsBatch.length} orders...`);
    await chunkInsert(db, orders, orderRowsBatch, 200);

    console.log(`  Inserting ${orderItemRowsBatch.length} order items...`);
    await chunkInsert(db, orderItems, orderItemRowsBatch, 500);

    console.log('\n✅ Seeding selesai!');
    console.log(`   Brands     : ${insertedBrands.length}`);
    console.log(`   Categories : ${insertedCategories.length}`);
    console.log(
      `   Attributes : ${insertedAttrs.length} (${insertedAttrValues.length} values)`
    );
    console.log(`   Users      : ${insertedUsers.length}`);
    console.log(`   Products   : ${insertedProducts.length}`);
    console.log(`   Variants   : ${insertedVariants.length}`);
    console.log(`   Orders     : ${orderRowsBatch.length}`);
    console.log(`   Order items: ${orderItemRowsBatch.length}`);
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Seed gagal:', err);
    process.exit(1);
  });
