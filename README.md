# Alexandria Office Accounting System (مكتب الاسكندرية)

A lightweight, fully client-side Single Page Application (SPA) designed specifically for a logistics and import-export office. Built with Vanilla JavaScript and Tailwind CSS, providing a fast, modern, and purely local accounting experience entirely in Arabic (RTL).

## Features

- **Local First & PWA Ready**: All data is securely persisted within the browser's `localStorage`. No backend database required. Works offline via Service Worker caching.
- **Client & Transport Company Management**: Maintain balances, statements, and contact details for both clients and transport agencies.
- **Dynamic Invoices**:
  - **Client Invoices**: Dynamic line items, USD-to-EGP real-time exchange rates (auto-fetched), and freight VAT calculation modules.
  - **Shipping Invoices**: Track transport company fees, container payloads, and expenses seamlessly.
- **Bank Transfers**: Log deposits and withdrawals, explicitly link transactions to invoices, and compute detailed account statements.
- **Financial Dashboards**: Compact KPI views aggregating balances, outstanding dues, and real-time profit/loss across client deposits vs. transport payments.
- **Professional Exports & Printing**: Comprehensive print-ready layouts (A4 optimized) for both individual invoices and filtered full-year account statements. Custom company logo support.
- **Data Portability**: Full JSON backup export and import to keep local data safe.

## Tech Stack

- **HTML5 / CSS3 / JavaScript (ES6 Modules)**
- **Tailwind CSS** (via CDN for zero-build-step styling)
- **Lucide Icons**
- **Cairo Google Font**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
