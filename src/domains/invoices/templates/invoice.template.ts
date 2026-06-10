import { CompanyInfo } from '../../../infrastructure/config/company.config';
import { InvoiceItemSnapshot } from '../../../infrastructure/database/schema';
import { formatRupiah } from '../../../common/utils/currency.util';

export interface InvoiceTemplateData {
  company: CompanyInfo;
  invoiceNumber: string;
  issueDate: Date;
  customerName: string;
  customerEmail: string;
  items: InvoiceItemSnapshot[];
  subtotal: number;
  total: number;
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'long',
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderItemRows(items: InvoiceItemSnapshot[]): string {
  return items
    .map(
      (item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>${escapeHtml(item.description)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatRupiah(item.unitPrice)}</td>
          <td class="num">${formatRupiah(item.lineTotal)}</td>
        </tr>`
    )
    .join('');
}

/**
 * Render HTML invoice siap cetak (A4) dengan format mata uang Rupiah.
 */
export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const { company } = data;

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        color: #18181b;
        font-size: 12px;
        margin: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #18181b;
        padding-bottom: 16px;
        margin-bottom: 24px;
      }
      .company { max-width: 60%; }
      .company img { max-height: 56px; margin-bottom: 8px; }
      .company h1 { font-size: 18px; margin: 0 0 4px; }
      .company p { margin: 2px 0; color: #52525b; }
      .invoice-meta { text-align: right; }
      .invoice-meta h2 {
        font-size: 24px;
        letter-spacing: 2px;
        margin: 0 0 8px;
        text-transform: uppercase;
        color: #18181b;
      }
      .invoice-meta p { margin: 2px 0; color: #52525b; }
      .bill-to { margin-bottom: 24px; }
      .bill-to .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #71717a;
        margin-bottom: 4px;
      }
      .bill-to strong { font-size: 14px; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      thead th {
        background: #f4f4f5;
        text-align: left;
        padding: 10px 12px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #e4e4e7;
      }
      tbody td {
        padding: 10px 12px;
        border-bottom: 1px solid #f1f1f4;
        vertical-align: top;
      }
      .num { text-align: right; white-space: nowrap; }
      thead th.num { text-align: right; }
      .totals { width: 280px; margin-left: auto; }
      .totals tr td { border: none; padding: 6px 12px; }
      .totals .total-row td {
        border-top: 2px solid #18181b;
        font-size: 14px;
        font-weight: bold;
      }
      .footer {
        margin-top: 40px;
        padding-top: 12px;
        border-top: 1px solid #e4e4e7;
        color: #a1a1aa;
        font-size: 11px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company">
        <img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.name)}" />
        <h1>${escapeHtml(company.name)}</h1>
        <p>${escapeHtml(company.address)}</p>
        <p>${escapeHtml(company.email)} &middot; ${escapeHtml(company.phone)}</p>
      </div>
      <div class="invoice-meta">
        <h2>Invoice</h2>
        <p><strong>${escapeHtml(data.invoiceNumber)}</strong></p>
        <p>${escapeHtml(dateFormatter.format(data.issueDate))}</p>
      </div>
    </div>

    <div class="bill-to">
      <div class="label">Ditagihkan kepada</div>
      <strong>${escapeHtml(data.customerName)}</strong>
      <p>${escapeHtml(data.customerEmail)}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Deskripsi</th>
          <th class="num">Qty</th>
          <th class="num">Harga</th>
          <th class="num">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${renderItemRows(data.items)}
      </tbody>
    </table>

    <table class="totals">
      <tbody>
        <tr>
          <td>Subtotal</td>
          <td class="num">${formatRupiah(data.subtotal)}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="num">${formatRupiah(data.total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Terima kasih atas kepercayaan Anda &middot; ${escapeHtml(company.name)}
    </div>
  </body>
</html>`;
}
