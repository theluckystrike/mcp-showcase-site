// Category ids from BRIEF section 5.1. `hue` drives the category color (oklch).
export interface Category {
  id: string;
  name: string;
  short: string;
  blurb: string;
  hue: number;
  icon: string; // SVG path data, 24x24, stroke icon
}

export const CATEGORIES: Category[] = [
  { id: 'invoicing', name: 'Invoicing and billing', short: 'Invoicing', hue: 285,
    blurb: 'Quotes, invoices, credit notes, reminders and statements as real documents.',
    icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4' },
  { id: 'payables', name: 'Payables checks and matching', short: 'Payables', hue: 25,
    blurb: 'Catch duplicate supplier invoices and match bills to orders and receipts.',
    icon: 'M4 7h16M4 12h10M4 17h7M17 15l2 2 3-4' },
  { id: 'bookkeeping', name: 'Bookkeeping and cash', short: 'Bookkeeping', hue: 160,
    blurb: 'Bank imports, a cash book, petty cash, budgets and fixed assets.',
    icon: 'M4 19V9M10 19V5M16 19v-7M22 19H2' },
  { id: 'time-expenses', name: 'Time, expenses and travel', short: 'Time and expenses', hue: 200,
    blurb: 'Timers, expense ledgers, mileage and per diem on public rate tables.',
    icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  { id: 'documents', name: 'Documents and files', short: 'Documents', hue: 240,
    blurb: 'PDF, Word, spreadsheets, images and zip files handled from chat.',
    icon: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3' },
  { id: 'contracts-hr', name: 'Contracts, HR and careers', short: 'Contracts and HR', hue: 330,
    blurb: 'Service agreements, clause libraries, leave, onboarding and resumes.',
    icon: 'M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M12 3v4' },
  { id: 'operations', name: 'Operations and field work', short: 'Operations', hue: 55,
    blurb: 'Work orders, job cards, change orders, checklists and maintenance.',
    icon: 'M14 6l4 4-8 8H6v-4zM13 7l4 4M3 21h18' },
  { id: 'purchasing', name: 'Purchasing, stock and logistics', short: 'Purchasing', hue: 120,
    blurb: 'Requisitions, goods receipts, suppliers, packing lists and price tracking.',
    icon: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10' },
  { id: 'web-dev', name: 'Web and developer utilities', short: 'Web and dev', hue: 265,
    blurb: 'Backlinks, QR codes and other utilities for the web.',
    icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14' },
  { id: 'calculators', name: 'Calculators and data', short: 'Calculators', hue: 95,
    blurb: 'Loans, rates, tax, currencies and schedules computed exactly.',
    icon: 'M6 3h12v18H6zM9 7h6M9 12h1M14 12h1M9 16h1M14 16h1' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

// Fallback when content files have no category yet. Content JSON overrides this.
export const FALLBACK_CATEGORY: Record<string, string> = {
  invoice: 'invoicing', quotes: 'invoicing', recurring: 'invoicing', 'credit-note': 'invoicing',
  'billing-docs': 'invoicing', 'dunning-letters': 'invoicing', 'statement-of-account': 'invoicing',
  deposits: 'invoicing', 'stripe-billing': 'invoicing',
  'three-way-match': 'payables', 'duplicate-invoice-check': 'payables', 'supplier-statement-check': 'payables',
  'cash-book': 'bookkeeping', 'bank-statement': 'bookkeeping', 'petty-cash': 'bookkeeping',
  budget: 'bookkeeping', 'asset-register': 'bookkeeping', receipts: 'bookkeeping',
  'time-tracker': 'time-expenses', 'expense-tracker': 'time-expenses', 'mileage-log': 'time-expenses',
  'per-diem': 'time-expenses', pomodoro: 'time-expenses', calendar: 'time-expenses', timezone: 'time-expenses',
  pdf: 'documents', docx: 'documents', spreadsheet: 'documents', image: 'documents', zip: 'documents',
  'office-suite': 'documents',
  'service-agreement': 'contracts-hr', clauses: 'contracts-hr', resume: 'contracts-hr', leave: 'contracts-hr',
  onboarding: 'contracts-hr', payroll: 'contracts-hr', 'bill-of-sale': 'contracts-hr',
  'job-card': 'operations', 'work-order': 'operations', 'change-order': 'operations',
  'delivery-schedule': 'operations', 'maintenance-log': 'operations', checklist: 'operations', kanban: 'operations',
  'purchase-requisition': 'purchasing', 'goods-receipt': 'purchasing', 'supplier-list': 'purchasing',
  'packing-list': 'purchasing', 'price-tracker': 'purchasing', catalogue: 'purchasing',
  'backlink-checker': 'web-dev', barcode: 'web-dev',
  'loan-calculator': 'calculators', 'hourly-rate': 'calculators', 'tax-calc': 'calculators',
  currency: 'calculators', amortization: 'calculators',
};
