import { getState } from '../state.js';
import { fmtCurrency, fmtDate, showModal, closeModal, balanceLabel, printInvoice } from '../utils.js';
import { primaryBtn, secondaryBtn, select, emptyState, kpiCard } from '../components.js';

function getAvailableYears(st) {
  const years = new Set();
  st.transactions.forEach(t => years.add((t.date || t.createdAt).substring(0, 4)));
  st.bankTransfers.forEach(b => years.add((b.date || b.createdAt).substring(0, 4)));
  const sorted = Array.from(years).sort().reverse();
  return [{ value: '', label: 'كل السنوات' }, ...sorted.map(y => ({ value: y, label: y }))];
}

export function render() {
  const st = getState();
  const years = getAvailableYears(st);

  return `<div class="space-y-6">
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 class="font-bold text-slate-800 mb-4">اختر الجهة لعرض كشف الحساب</h3>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        ${select('نوع الجهة', 'as-type', [{ value: 'client', label: 'عملاء' }, { value: 'shipping', label: 'شركات النقل' }], '', 'id="as-type-sel" onchange="window._asTypeChange()"')}
        <div id="as-entity-wrap">${select('الجهة', 'as-entity', [], '', 'id="as-entity-sel"')}</div>
        ${select('السنة', 'as-year', years, '', 'id="as-year-sel"')}
        <div>${primaryBtn('عرض كشف الحساب', 'window._asShow()', 'scroll-text', 'w-full')}</div>
      </div>
    </div>
    <div id="as-preview"></div>
  </div>`;
}

export function init() {
  window._asTypeChange = () => {
    const type = document.getElementById('as-type-sel')?.value;
    const entities = getState().entities.filter(e => e.type === type);
    const wrap = document.getElementById('as-entity-wrap');
    if (wrap) wrap.innerHTML = select('الجهة', 'as-entity', entities.map(e => ({ value: e.id, label: e.name })), '', 'id="as-entity-sel"');
  };

  window._asShow = () => {
    const entityId = document.getElementById('as-entity-sel')?.value;
    const yearFilter = document.getElementById('as-year-sel')?.value;
    if (!entityId) return;
    const st = getState();
    const ent = st.entities.find(e => e.id === entityId);
    if (!ent) return;

    const isClient = ent.type === 'client';
    const originalOpening = Number(ent.openingBalance) || 0;

    const allMovements = [];

    // Invoices
    st.transactions.filter(t => t.entityId === entityId).forEach(t => {
      allMovements.push({
        date: t.date || t.createdAt,
        id: t.invoiceNumber,
        cert: t.certificateNumber || '-',
        desc: `فاتورة ${t.invoiceNumber}`,
        debit: isClient ? t.total : 0,
        credit: isClient ? 0 : t.total,
        type: 'invoice'
      });
    });

    // Direct bank transfers
    st.bankTransfers.filter(b => b.entityId === entityId).forEach(b => {
      if (b.type === 'deposit') {
        allMovements.push({
          date: b.date || b.createdAt,
          id: '-',
          cert: '-',
          desc: `إيداع ${b.linkedInvoice ? '- فاتورة ' + b.linkedInvoice : ''}`,
          debit: isClient ? 0 : b.amount,
          credit: isClient ? b.amount : 0,
          type: 'deposit'
        });
      } else {
        allMovements.push({
          date: b.date || b.createdAt,
          id: '-',
          cert: '-',
          desc: `تحويل ${b.linkedInvoice ? '- فاتورة ' + b.linkedInvoice : ''}`,
          debit: isClient ? 0 : 0,
          credit: isClient ? 0 : b.amount,
          type: 'withdrawal'
        });
        if (!isClient) {
          allMovements[allMovements.length - 1].debit = b.amount;
          allMovements[allMovements.length - 1].credit = 0;
        }
      }
    });

    // Sort by date ascending (oldest first)
    allMovements.sort((a, b) => new Date(a.date) - new Date(b.date));

    let displayMovements = allMovements;
    let openingForPeriod = originalOpening;

    if (yearFilter) {
      const beforeYear = allMovements.filter(m => m.date.substring(0, 4) < yearFilter);
      const debitSumBefore = beforeYear.reduce((s, m) => s + m.debit, 0);
      const creditSumBefore = beforeYear.reduce((s, m) => s + m.credit, 0);
      openingForPeriod = originalOpening + creditSumBefore - debitSumBefore;

      displayMovements = allMovements.filter(m => m.date.substring(0, 4) === yearFilter);
    }

    const periodDebits = displayMovements.reduce((s, m) => s + m.debit, 0);
    const periodCredits = displayMovements.reduce((s, m) => s + m.credit, 0);
    const finalBalance = openingForPeriod + periodCredits - periodDebits;

    // Store these values globally to access them in the print function
    window.__currentStatement = { ent, yearFilter, openingForPeriod, displayMovements, periodDebits, periodCredits, finalBalance, isClient };

    const modalHtml = `<div class="p-6 space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-800">كشف حساب: ${ent.name} ${yearFilter ? `(${yearFilter})` : ''}</h2>
          <p class="text-sm text-slate-500">${isClient ? 'عميل' : 'شركة النقل'}</p>
        </div>
        <div class="flex gap-2">
            ${secondaryBtn('طباعة كشف الحساب', 'window._asPrint()', 'printer')}
            <button onclick="window._closeModal()" class="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${kpiCard('wallet', 'رصيد الفتح للفترة', fmtCurrency(openingForPeriod), 'blue')}
        ${kpiCard('arrow-down-left', 'إجمالي المدين', fmtCurrency(periodDebits), 'red')}
        ${kpiCard('arrow-up-right', 'إجمالي الدائن', fmtCurrency(periodCredits), 'emerald')}
        ${kpiCard('scale', 'الرصيد النهائي', fmtCurrency(Math.abs(finalBalance)), finalBalance >= 0 ? 'cyan' : 'red')}
      </div>

      <!-- Statement Table -->
      ${displayMovements.length || openingForPeriod !== 0 ? `<div class="overflow-x-auto"><table class="w-full text-sm">
        <thead><tr class="text-slate-500 border-b border-slate-200 bg-slate-50">
          <th class="text-right p-3 font-semibold">التاريخ</th>
          <th class="text-right p-3 font-semibold">رقم السجل</th>
          <th class="text-right p-3 font-semibold">رقم الشهادة</th>
          <th class="text-right p-3 font-semibold">البيان</th>
          <th class="text-right p-3 font-semibold">المدين</th>
          <th class="text-right p-3 font-semibold">الدائن</th>
        </tr></thead><tbody>
          <tr class="border-b border-slate-100 bg-blue-50/50">
            <td class="p-3">-</td><td class="p-3">-</td><td class="p-3">-</td><td class="p-3 font-semibold">رصيد الفتح للفترة</td>
            <td class="p-3">${openingForPeriod < 0 ? fmtCurrency(Math.abs(openingForPeriod)) : '-'}</td>
            <td class="p-3">${openingForPeriod >= 0 ? fmtCurrency(openingForPeriod) : '-'}</td>
          </tr>
          ${displayMovements.map(m => `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
            <td class="p-3 text-slate-500">${fmtDate(m.date)}</td>
            <td class="p-3 font-mono">${m.id}</td>
            <td class="p-3 text-slate-500">${m.cert}</td>
            <td class="p-3">${m.desc}</td>
            <td class="p-3 ${m.debit ? 'text-red-600 font-semibold' : 'text-slate-300'}">${m.debit ? fmtCurrency(m.debit) : '-'}</td>
            <td class="p-3 ${m.credit ? 'text-emerald-600 font-semibold' : 'text-slate-300'}">${m.credit ? fmtCurrency(m.credit) : '-'}</td>
          </tr>`).join('')}
          <tr class="border-t-2 border-slate-300 font-bold bg-slate-50">
            <td class="p-3" colspan="4">الإجمالي خلال الفترة</td>
            <td class="p-3 text-red-600">${fmtCurrency(periodDebits)}</td>
            <td class="p-3 text-emerald-600">${fmtCurrency(periodCredits)}</td>
          </tr>
        </tbody></table></div>` : emptyState('scroll-text', 'لا توجد حركات')}

      <div class="text-center pt-2">
        <p class="text-sm font-semibold ${finalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}">
          الرصيد النهائي بعد الفترة: ${fmtCurrency(Math.abs(finalBalance))} ${balanceLabel(finalBalance, isClient)}
        </p>
      </div>
    </div>`;

    showModal(modalHtml, { maxWidth: 'max-w-5xl' });
  };

  window._asPrint = () => {
    if (!window.__currentStatement) return;
    const { ent, yearFilter, openingForPeriod, displayMovements, periodDebits, periodCredits, finalBalance, isClient } = window.__currentStatement;
    const st = getState();
    const logo = st.companyLogo ? `<img src="${st.companyLogo}" class="logo" />` : '';

    const html = `
      <div class="inv-header"><div>${logo}<p class="co-name">${st.config.companyName}</p><p class="inv-title">كشف حساب: ${ent.name} ${yearFilter ? `(${yearFilter})` : ''}</p></div>
        <div class="inv-info">
          <p class="lbl">الجهة</p><p class="val">${ent.name} - ${isClient ? 'عميل' : 'شركة نقل'}</p>
          <p class="lbl">تاريخ الإصدار</p><p class="val">${fmtDate(new Date().toISOString())}</p>
        </div>
      </div>
      
      <table><thead><tr>
        <th>التاريخ</th><th>رقم السجل</th><th>رقم الشهادة</th><th>البيان</th><th>مدين</th><th>دائن</th>
      </tr></thead>
        <tbody>
          <tr>
            <td>-</td><td>-</td><td>-</td><td>رصيد الفتح للفترة</td>
            <td>${openingForPeriod < 0 ? fmtCurrency(Math.abs(openingForPeriod)) : '-'}</td>
            <td>${openingForPeriod >= 0 ? fmtCurrency(openingForPeriod) : '-'}</td>
          </tr>
          ${displayMovements.map(m => `<tr>
            <td>${fmtDate(m.date)}</td><td>${m.id}</td><td>${m.cert}</td><td>${m.desc}</td>
            <td ${m.debit ? 'style="color:red"' : ''}>${m.debit ? fmtCurrency(m.debit) : '-'}</td>
            <td ${m.credit ? 'style="color:green"' : ''}>${m.credit ? fmtCurrency(m.credit) : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="totals"><table class="totals-table">
        <tr><td>إجمالي المدين للفترة</td><td style="color:red">${fmtCurrency(periodDebits)}</td></tr>
        <tr><td>إجمالي الدائن للفترة</td><td style="color:green">${fmtCurrency(periodCredits)}</td></tr>
        <tr class="total-row"><td>الرصيد النهائي</td><td>${fmtCurrency(Math.abs(finalBalance))} ${balanceLabel(finalBalance, isClient)}</td></tr>
      </table></div>`;

    printInvoice(html, `كشف حساب ${ent.name}`);
  };

  window._closeModal = closeModal;
}
