// d-servers: "What you get" data for server pages and the /servers/ cards.
// Every number below comes from that server's own example case in data/content/*.json (field `case` = index).
// Math checked by hand on 2026-10-30. Names are the invented example names from the case. Nothing else is invented.
// Servers without an entry get a generic result slip built from their first case (see ServerOutput.astro).
import type { Server } from '../../data/servers';

export type Tone = 'ok' | 'warn';
export interface DocPreview {
  kind: 'doc';
  case: number;
  file: string; // PDF, DOCX, CSV, Text
  doc: string; // Invoice, Quote, Credit note ...
  number?: string;
  to?: [string, string]; // label, value
  meta?: [string, string][];
  cols: string[];
  rows: string[][];
  totals: [string, string][]; // last one is the grand total
  stamp?: { text: string; tone: Tone };
  note?: string;
}
export interface TablePreview {
  kind: 'table';
  case: number;
  file: string;
  title: string;
  sub?: string;
  cols: string[];
  rows: string[][];
  foot?: [string, string];
  stamp?: { text: string; tone: Tone };
  note?: string;
}
export type Preview = DocPreview | TablePreview;

export const PREVIEWS: Record<string, Preview> = {
  // 12 h x 90 = 1,080 + 300 = 1,380; VAT 23% = 317.40; total 1,697.40
  invoice: {
    kind: 'doc', case: 0, file: 'PDF', doc: 'Invoice', number: 'INV-2026-0001', to: ['Bill to', 'Acme'],
    meta: [['Due', 'in 14 days'], ['Currency', 'EUR']],
    cols: ['Item', 'Qty', 'Price', 'EUR'],
    rows: [['API work', '12 h', '90.00', '1,080.00'], ['Setup fee', '1', '300.00', '300.00']],
    totals: [['Subtotal', '1,380.00'], ['VAT 23%', '317.40'], ['Total EUR', '1,697.40']],
    stamp: { text: 'Ready to send', tone: 'ok' },
  },
  // 6,500 + 400 = 6,900; VAT 23% = 1,587.00; gross 8,487.00
  quotes: {
    kind: 'doc', case: 0, file: 'Text', doc: 'Quote', number: 'Q-2026-0001', to: ['For', 'Piekarnia Rogal'],
    meta: [['Valid', '14 days'], ['Currency', 'PLN']],
    cols: ['Item', 'Qty', 'Price', 'PLN'],
    rows: [['5-page website', '1', '6,500.00', '6,500.00'], ['Hosting setup', '1', '400.00', '400.00']],
    totals: [['Net', '6,900.00'], ['VAT 23%', '1,587.00'], ['Gross PLN', '8,487.00']],
    stamp: { text: 'Sent', tone: 'ok' },
    note: 'Free tier gives email-ready text. The A4 PDF of a quote is Pro.',
  },
  // 2 x 24 = 48.00; VAT 22% = 10.56; total 58.56
  'credit-note': {
    kind: 'doc', case: 0, file: 'PDF', doc: 'Credit note', number: 'Against 2026/118', to: ['Reason', 'Goods returned'],
    meta: [['Currency', 'EUR']],
    cols: ['Item', 'Qty', 'Price', 'EUR'],
    rows: [['Mug, returned', '2', '24.00', '48.00']],
    totals: [['Net', '48.00'], ['VAT 22%', '10.56'], ['Credit EUR', '58.56']],
    stamp: { text: 'Final', tone: 'ok' },
  },
  // 6,200 + 0 + 12,250 = 18,450
  'statement-of-account': {
    kind: 'table', case: 0, file: 'Text', title: 'Aging, Drukarnia Ventis', sub: 'As of today, 3 open invoices',
    cols: ['Bucket', 'PLN'],
    rows: [['0-30 days', '6,200.00'], ['31-60 days', '0.00'], ['Over 60 days', '12,250.00']],
    foot: ['Outstanding', '18,450.00'],
    stamp: { text: 'Overdue', tone: 'warn' },
  },
  // 1.5 h x 95 = 142.50; 2 h 40 min x 95 = 253.33; total 4 h 10 min, 395.83
  'time-tracker': {
    kind: 'table', case: 0, file: 'CSV', title: 'Bergbahn app, time entries', sub: 'Rate EUR 95 an hour, frozen on each entry',
    cols: ['Task', 'Time', 'EUR'],
    rows: [['Interviews (timer)', '2 h 40 min', '253.33'], ['Report write-up (yesterday)', '1 h 30 min', '142.50']],
    foot: ['4 h 10 min', '395.83'],
  },
  // 46 x 24 = 1,104.00; OT premium 6 h x 12 = 72.00; tax 18% of 1,104 = 198.72; net 1,104 - 198.72 + 72 = 977.28
  payroll: {
    kind: 'table', case: 1, file: 'Text', title: 'Pay estimate, Luis', sub: '46 hours at 24.00 USD, tax estimate 18%',
    cols: ['Line', 'USD'],
    rows: [['Gross, 46 h x 24.00', '1,104.00'], ['Overtime premium, 6 h', '72.00'], ['Estimated tax 18%', '-198.72']],
    foot: ['Net pay', '977.28'],
    note: 'An estimate, not a payroll system. The overtime premium is not taxed in the code.',
  },
  spreadsheet: {
    kind: 'table', case: 0, file: 'Table', title: 'orders_q3.xlsx, net sales by region', sub: 'Computed from all 3,412 rows, largest first',
    cols: ['Region', 'PLN'],
    rows: [['Mazowieckie', '1,284,300'], ['3 more regions', '...'], ['Opolskie', '96,420']],
    foot: ['Rows read', '3,412'],
  },
  pdf: {
    kind: 'doc', case: 0, file: 'PDF', doc: 'FV-2026-031-paid.pdf', number: 'Copy of FV-2026-031.pdf', to: ['Original', 'Untouched'],
    cols: ['Step', 'Tool'],
    rows: [['Read pages and size', 'pdf_info'], ['Stamp PAID on the copy', 'pdf_stamp']],
    totals: [['Saved as', 'FV-2026-031-paid.pdf']],
    stamp: { text: 'Paid', tone: 'ok' },
  },
  // 49 + 89 + 120 = 258 a month
  'bank-statement': {
    kind: 'table', case: 0, file: 'Table', title: 'Recurring charges, mBank CSV', sub: 'Last 3 months',
    cols: ['Charge', 'Every', 'PLN'],
    rows: [['Software plan', 'month', '49.00'], ['Software plan', 'month', '89.00'], ['Software plan', 'month', '120.00']],
    foot: ['A month', '258.00'],
  },
  // 2 x 4.50 = 9.00 + 3.20 + 2.75 = 14.95; 8.25% = 1.23; 16.18
  receipts: {
    kind: 'doc', case: 0, file: 'Text', doc: 'Receipt', number: 'Cafe, tax 8.25%', to: ['For', 'Expense claim'],
    cols: ['Item', 'Qty', 'Price', 'Total'],
    rows: [['Coffee', '2', '4.50', '9.00'], ['Bagel', '1', '3.20', '3.20'], ['Orange juice', '1', '2.75', '2.75']],
    totals: [['Subtotal', '14.95'], ['Tax 8.25%', '1.23'], ['Total', '16.18']],
  },
  // 84 gross / 1.2 = 70.00 net + 14.00 VAT
  'expense-tracker': {
    kind: 'table', case: 0, file: 'Table', title: 'Expense, Harper wedding', sub: 'Jessops, memory card, billable',
    cols: ['Line', 'GBP'],
    rows: [['Net', '70.00'], ['VAT 20%', '14.00']],
    foot: ['Paid', '84.00'],
  },
  // 23.4 x 0.45 = 10.53
  'mileage-log': {
    kind: 'table', case: 0, file: 'Table', title: 'Trip log', sub: 'Home office to the Hale site, business',
    cols: ['Trip', 'Miles', 'GBP'],
    rows: [['Site visit, Patel kitchen', '23.4', '10.53']],
    foot: ['Rate on file', '0.45 a mile'],
  },
  'loan-calculator': {
    kind: 'table', case: 0, file: 'Table', title: '380,000 USD over 30 years', sub: 'Two offers side by side',
    cols: ['Rate', 'A month', 'Interest'],
    rows: [['6.5%', '2,401.86', '484,669'], ['6.1%', '2,302.78', '449,001']],
    foot: ['Lower rate saves', 'about 35,700'],
  },
  'dunning-letters': {
    kind: 'doc', case: 1, file: 'Text', doc: 'Second reminder', number: 'INV-0388', to: ['Overdue', '35 days'],
    cols: ['Item', 'GBP'],
    rows: [['INV-0388', '2,400.00'], ['Late fee', '2% a month']],
    totals: [['Send date', 'on record']],
    stamp: { text: 'Overdue', tone: 'warn' },
  },
  docx: {
    kind: 'doc', case: 0, file: 'DOCX', doc: 'Proposal', number: 'Riverbend Clinics', to: ['Project', 'Dashboard rebuild'],
    meta: [['Valid until', '30 November']],
    cols: ['Section', ''],
    rows: [['Scope', 'Dashboard rebuild'], ['Deliverables', '3'], ['Timeline', '6 weeks']],
    totals: [['Price USD', '9,600']],
  },
  // 950 + 20% VAT = 1,140.00
  recurring: {
    kind: 'table', case: 0, file: 'Schedule', title: 'Retainer, Harbour Dental', sub: 'Bills on the 1st of every month from November, due in 14 days',
    cols: ['Line', 'GBP'],
    rows: [['Retainer', '950.00'], ['VAT 20%', '190.00']],
    foot: ['Each month', '1,140.00'],
  },
  // 2 x 180 = 360.00; 23% = 82.80; 442.80
  'billing-docs': {
    kind: 'doc', case: 0, file: 'Text', doc: 'Credit note', number: 'Against INV-2026-0031', to: ['Reason', 'Hosting setup not needed'],
    meta: [['Currency', 'PLN']],
    cols: ['Item', 'Qty', 'Price', 'PLN'],
    rows: [['Hours credited', '2', '180.00', '360.00']],
    totals: [['Net', '360.00'], ['VAT 23%', '82.80'], ['Credit PLN', '442.80']],
  },
  // 3,000 - 1,850 = 1,150
  deposits: {
    kind: 'table', case: 0, file: 'Table', title: 'Deposit, Klein BV', sub: 'Retainer applied to INV-2026-0044',
    cols: ['Movement', 'EUR'],
    rows: [['Retainer received', '3,000.00'], ['Applied to INV-2026-0044', '-1,850.00']],
    foot: ['Left on deposit', '1,150.00'],
  },
  // 1,000 - 42.50 - 89.99 - 25.00 = 842.51
  'petty-cash': {
    kind: 'table', case: 0, file: 'Table', title: 'Petty cash float', sub: 'Custodian Beata, imprest 1,000 PLN',
    cols: ['Voucher', 'PLN'],
    rows: [['Coffee and milk', '-42.50'], ['Printer toner', '-89.99'], ['Courier to the lab', '-25.00']],
    foot: ['Balance', '842.51'],
  },
};

const LABELS: Record<string, string> = {
  invoice: 'PDF invoice', quotes: 'Quote', 'credit-note': 'PDF credit note', 'statement-of-account': 'Statement and aging',
  'time-tracker': 'Timesheet CSV', payroll: 'Pay estimate', spreadsheet: 'Table from your file', pdf: 'Stamped PDF',
  'bank-statement': 'Spend report', receipts: 'Receipt total', 'expense-tracker': 'Expense ledger', 'mileage-log': 'Mileage log',
  'loan-calculator': 'Payment table', 'dunning-letters': 'Reminder letter', docx: 'Word document',
  recurring: 'Billing schedule', 'billing-docs': 'Credit note', deposits: 'Deposit ledger', 'petty-cash': 'Cash vouchers',
};

const BUYER_ORDER = [
  'invoice', 'quotes', 'spreadsheet', 'pdf', 'bank-statement', 'time-tracker',
  'credit-note', 'statement-of-account', 'expense-tracker', 'dunning-letters', 'recurring', 'docx',
  'receipts', 'payroll', 'office-suite', 'billing-docs', 'cash-book', 'mileage-log', 'duplicate-invoice-check',
  'three-way-match', 'supplier-statement-check', 'deposits', 'petty-cash', 'service-agreement', 'resume',
];
/** Buyer-value rank. Listed ids first, then servers with Pro, then the rest A-Z. */
export function buyerRank(s: Pick<Server, 'id' | 'paid' | 'satellite'>): number {
  const i = BUYER_ORDER.indexOf(s.id);
  if (i >= 0) return i;
  return 100 + (s.satellite ? 200 : 0) + (s.paid ? 0 : 50);
}

/** Short output label for cards: what the server hands back. From the hand preview, else from case results. */
export function outputType(s: Server): string {
  if (LABELS[s.id]) return LABELS[s.id];
  const r = s.cases.map((c) => c.result ?? '').join(' ');
  if (/\bPDF\b/.test(r)) return 'PDF';
  if (/\b(Word|DOCX)\b/i.test(r)) return 'Word file';
  if (/\bCSV\b/.test(r)) return 'CSV';
  if (/\b(XLSX|Excel)\b/i.test(r)) return 'Excel file';
  if (/\b(PNG|JPEG|WebP|image)\b/i.test(r)) return 'Image';
  if (/\b(ZIP|archive)\b/i.test(r)) return 'Archive';
  if (/\b(email|letter|reminder)\b/i.test(r)) return 'Ready-to-send text';
  if (/\b(table|schedule|report|summary|list)\b/i.test(r)) return 'Report';
  return s.category === 'calculators' ? 'Figures' : 'Answer';
}
