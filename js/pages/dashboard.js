import { getState, getEntityBalance } from '../state.js';
import { fmtCurrency, fmtNum, fmtDate, balanceLabel } from '../utils.js';
import { kpiCard, card, emptyState, badge } from '../components.js';

export function render() {
  const st = getState();
  const clients = st.entities.filter(e => e.type === 'client');
  const shippers = st.entities.filter(e => e.type === 'shipping');

  // Sort transactions and bank transfers
  const recentInvs = [...st.transactions].sort((a, b) => parseInt(b.invoiceNumber) - parseInt(a.invoiceNumber)).slice(0, 5);
  const recentBT = [...st.bankTransfers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  // Card 1: Total entities
  const totalEntities = clients.length + shippers.length;

  // Card 2: Total records
  const totalTx = st.transactions.length + st.bankTransfers.length;

  // Card 3 logic:
  // 1. إجمالي الأرصدة (Total balances where office owes money)
  const totalDain = clients.concat(shippers).reduce((acc, ent) => {
    const b = getEntityBalance(ent.id);
    const isClient = ent.type === 'client';
    // Client > 0 means office owes the client (دائن له)
    // Shipping < 0 means office owes the transport company (دائن له)
    if (isClient && b > 0) return acc + b;
    if (!isClient && b < 0) return acc + Math.abs(b);
    return acc;
  }, 0);

  // 2. Profit Logic: Incoming (client deposits) - Outgoing (transport payments)
  const totalIncoming = st.bankTransfers.filter(b => b.type === 'deposit' && clients.some(c => c.id === b.entityId)).reduce((s, b) => s + Number(b.amount), 0);
  const totalOutgoing = st.bankTransfers.filter(b => b.type === 'withdrawal' && shippers.some(c => c.id === b.entityId)).reduce((s, b) => s + Number(b.amount), 0);
  const profit = totalIncoming - totalOutgoing;

  // 3. Separate USD account
  const totalUsd = st.transactions.reduce((acc, t) => {
    return acc + (t.items || []).reduce((s, it) => it.currency === 'USD' ? s + Number(it.price) : s, 0);
  }, 0);

  function balBadge(bal, isClient) {
    if (bal === 0) return '';
    const lbl = balanceLabel(bal, isClient);
    const color = lbl.startsWith('دائن') ? 'green' : 'red';
    return badge(lbl, color);
  }

  return `
    <div class="space-y-6">
      <!-- 3 Compact Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${kpiCard('users', 'إجمالي العملاء وشركات النقل', fmtNum(totalEntities), 'cyan')}
        ${kpiCard('file-text', 'إجمالي الفواتير والتحويلات', fmtNum(totalTx), 'violet')}
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-3 flex flex-col justify-center">
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي الأرصدة (دائن)</span><span class="font-bold text-emerald-600">${fmtCurrency(totalDain)}</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي الأرباح والخسائر</span><span class="font-bold border-b border-dashed border-slate-300 pb-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}">${fmtCurrency(profit)}</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">حساب الدولار</span><span class="font-bold text-blue-600">${fmtNum(totalUsd)} دولار امريكي</span></div>
        </div>
      </div>

      <!-- Balances -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${card('أرصدة العملاء', clients.length ? `
          <div class="overflow-x-auto"><table class="w-full text-sm">
            <thead><tr class="text-slate-500 border-b border-slate-100">
              <th class="text-right pb-3 font-semibold">العميل</th>
              <th class="text-right pb-3 font-semibold">الرصيد</th>
              <th class="text-right pb-3 font-semibold">الحالة</th>
            </tr></thead><tbody>${clients.map(c => {
    const bal = getEntityBalance(c.id);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
                <td class="py-2.5 font-medium">${c.name}</td>
                <td class="py-2.5 ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-red-600' : ''} font-semibold">${fmtCurrency(bal)}</td>
                <td class="py-2.5">${balBadge(bal, true)}</td>
              </tr>`;
  }).join('')}</tbody></table></div>` : emptyState('users', 'لا يوجد عملاء بعد'))}

        ${card('أرصدة شركات النقل', shippers.length ? `
          <div class="overflow-x-auto"><table class="w-full text-sm">
            <thead><tr class="text-slate-500 border-b border-slate-100">
              <th class="text-right pb-3 font-semibold">الشركة</th>
              <th class="text-right pb-3 font-semibold">الرصيد</th>
              <th class="text-right pb-3 font-semibold">الحالة</th>
            </tr></thead><tbody>${shippers.map(s => {
    const bal = getEntityBalance(s.id);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
                <td class="py-2.5 font-medium">${s.name}</td>
                <td class="py-2.5 ${bal > 0 ? 'text-red-600' : bal < 0 ? 'text-emerald-600' : ''} font-semibold">${fmtCurrency(bal)}</td>
                <td class="py-2.5">${balBadge(bal, false)}</td>
              </tr>`;
  }).join('')}</tbody></table></div>` : emptyState('ship', 'لا يوجد شركات نقل بعد'))}
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${card('آخر الفواتير', recentInvs.length ? `
          <div class="overflow-x-auto"><table class="w-full text-sm">
            <thead><tr class="text-slate-500 border-b border-slate-100">
              <th class="text-right pb-3 font-semibold">رقم الفاتورة</th>
              <th class="text-right pb-3 font-semibold">الجهة</th>
              <th class="text-right pb-3 font-semibold">المبلغ</th>
              <th class="text-right pb-3 font-semibold">التاريخ</th>
              <th class="text-right pb-3 font-semibold">إجراءات</th>
            </tr></thead><tbody>${recentInvs.map(t => {
    const ent = st.entities.find(e => e.id === t.entityId);
    const pg = t.type === 'client' ? 'client-invoices' : 'shipping-invoices';
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
                <td class="py-2.5 font-mono text-xs">${t.invoiceNumber || '-'}</td>
                <td class="py-2.5">${ent?.name || '-'}</td>
                <td class="py-2.5 font-semibold">${fmtCurrency(t.total)}</td>
                <td class="py-2.5 text-slate-500">${fmtDate(t.date)}</td>
                <td class="py-2.5"><div class="flex items-center gap-1">
                  <button onclick="window._nav('${pg}')" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="عرض"><i data-lucide="eye" class="w-4 h-4"></i></button>
                  <button onclick="window._dashPrint('${t.id}')" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="طباعة"><i data-lucide="printer" class="w-4 h-4"></i></button>
                </div></td>
              </tr>`;
  }).join('')}</tbody></table></div>` : emptyState('file-text', 'لا توجد فواتير بعد'))}

        ${card('آخر التحويلات', recentBT.length ? `
          <div class="overflow-x-auto"><table class="w-full text-sm">
            <thead><tr class="text-slate-500 border-b border-slate-100">
              <th class="text-right pb-3 font-semibold">النوع</th>
              <th class="text-right pb-3 font-semibold">الجهة</th>
              <th class="text-right pb-3 font-semibold">المبلغ</th>
              <th class="text-right pb-3 font-semibold">التاريخ</th>
              <th class="text-right pb-3 font-semibold">إجراءات</th>
            </tr></thead><tbody>${recentBT.map(b => {
    const ent = st.entities.find(e => e.id === b.entityId);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
                <td class="py-2.5">${b.type === 'deposit' ? badge('إيداع', 'green') : badge('تحويل', 'red')}</td>
                <td class="py-2.5">${ent?.name || '-'}</td>
                <td class="py-2.5 font-semibold">${fmtCurrency(b.amount)}</td>
                <td class="py-2.5 text-slate-500">${fmtDate(b.date)}</td>
                <td class="py-2.5">
                  <button onclick="window._nav('bank-transfers')" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="عرض"><i data-lucide="eye" class="w-4 h-4"></i></button>
                </td>
              </tr>`;
  }).join('')}</tbody></table></div>` : emptyState('arrow-left-right', 'لا توجد تحويلات بعد'))}
      </div>
    </div>`;
}

export function init() {
  window._dashPrint = (id) => {
    const st = getState();
    const t = st.transactions.find(x => x.id === id);
    if (!t) return;
    const pg = t.type === 'client' ? 'client-invoices' : 'shipping-invoices';
    window._nav(pg);
    setTimeout(() => {
      const fn = t.type === 'client' ? window._ciPrint : window._siPrint;
      if (fn) fn(id);
    }, 400);
  };
}
