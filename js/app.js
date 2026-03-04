import { loadState } from './state.js';
import { Router } from './router.js';
import { startAutoRefresh, displayRate } from './api.js';

// Import pages
import * as dashboard from './pages/dashboard.js';
import * as clientInvoices from './pages/client-invoices.js';
import * as shippingInvoices from './pages/shipping-invoices.js';
import * as bankTransfers from './pages/bank-transfers.js';
import * as accountStatement from './pages/account-statement.js';
import * as admin from './pages/admin.js';

// ── Boot ──
const state = loadState();

// Register pages
Router.register('dashboard', dashboard);
Router.register('client-invoices', clientInvoices);
Router.register('shipping-invoices', shippingInvoices);
Router.register('bank-transfers', bankTransfers);
Router.register('account-statement', accountStatement);
Router.register('admin', admin);

// ── Sidebar ──
const navItems = [
  { page: 'dashboard', icon: 'layout-dashboard', label: 'لوحة التحكم' },
  { page: 'client-invoices', icon: 'file-text', label: 'فواتير العملاء' },
  { page: 'shipping-invoices', icon: 'ship', label: 'فواتير النقل' },
  { page: 'bank-transfers', icon: 'building-2', label: 'التحويلات البنكية' },
  { page: 'account-statement', icon: 'scroll-text', label: 'كشف حساب' },
  { page: 'admin', icon: 'settings', label: 'الإدارة' }
];

const nav = document.getElementById('nav-items');
nav.innerHTML = navItems.map(n => `
  <button data-page="${n.page}" onclick="window._nav('${n.page}')"
    class="nav-item relative w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all group">
    <i data-lucide="${n.icon}" class="w-5 h-5"></i>
    <span class="tooltip absolute right-full mr-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
      ${n.label}
    </span>
  </button>
`).join('');

window._nav = (page) => Router.navigate(page);

// ── Init ──
lucide.createIcons();
displayRate(state.config.exchangeRate);
startAutoRefresh();
Router.boot();

// ── PWA ──
let deferredPrompt = null;
const installBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (result.outcome === 'accepted') installBtn.classList.add('hidden');
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { });
}
