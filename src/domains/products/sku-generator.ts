export interface SkuCodeParts {
  brandName?: string | null;
  /** Slug produk (sudah unik) sebagai token pembeda utama antar-produk. */
  productSlug: string;
  valueLabels: string[];
}

/** Ambil maksimal `len` karakter alfanumerik uppercase dari sebuah teks. */
function abbreviate(text: string, len = 3): string {
  const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.slice(0, len) || 'X';
}

/** Normalisasi slug menjadi token SKU (uppercase, hanya huruf/angka/dash). */
function slugToken(slug: string): string {
  return (
    slug
      .replace(/[^a-zA-Z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase() || 'X'
  );
}

/**
 * Bentuk base SKU code internal: `BRAND-PRODUCT-VALUE...`
 * (mis. `APP-IPHONE-17-PRO-MAX-BLK-256`). Product token diambil dari slug
 * (unik) sehingga produk berbeda tidak bertabrakan. Brand opsional.
 * Keunikan akhir (suffix `-2`, `-3`) tetap ditangani di service sebagai backstop.
 */
export function buildSkuCode(parts: SkuCodeParts): string {
  const segments: string[] = [];
  if (parts.brandName) segments.push(abbreviate(parts.brandName));
  segments.push(slugToken(parts.productSlug));
  for (const label of parts.valueLabels) segments.push(abbreviate(label));
  return segments.join('-');
}
