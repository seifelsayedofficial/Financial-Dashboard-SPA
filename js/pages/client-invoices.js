import { getState, addTransaction, deleteTransaction, getNextInvoiceIdForEntity } from '../state.js';
import { fmtCurrency, fmtNum, fmtDate, todayISO, toast, showModal, closeModal, printInvoice, escapeHtml, escapeAttr } from '../utils.js';
import { getCurrentRate } from '../api.js';
import { card, primaryBtn, secondaryBtn, emptyState, badge, input, select } from '../components.js';
import { Router } from '../router.js';

export function render() {
  const st = getState();
  // Sort oldest to newest
  const invs = st.transactions.filter(t => t.type === 'client').sort((a, b) => parseInt(a.invoiceNumber) - parseInt(b.invoiceNumber));

  return `<div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      ${primaryBtn('فاتورة جديدة', 'window._ciNew()', 'plus')}
      <div class="text-sm text-slate-500">إجمالي الفواتير: <span class="font-bold text-slate-800">${fmtNum(invs.length)}</span></div>
    </div>
    <!-- Search Bar -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
      <div class="relative">
        <i data-lucide="search" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
        <input type="text" id="ci-search" placeholder="بحث برقم الفاتورة، الشهادة، المبلغ، الحاويات أو التاريخ..." oninput="window._ciFilter()"
          class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20" />
      </div>
    </div>
    <div id="ci-list">
      ${renderList(invs, st)}
    </div>
  </div>`;
}

function renderList(invs, st) {
  if (!invs.length) return emptyState('file-text', 'لا توجد فواتير عملاء');
  return card('', `<div class="overflow-x-auto"><table class="w-full text-sm">
      <thead><tr class="text-slate-500 border-b border-slate-100">
        <th class="text-right pb-3 font-semibold">رقم الفاتورة</th>
        <th class="text-right pb-3 font-semibold">العميل</th>
        <th class="text-right pb-3 font-semibold">المبلغ</th>
        <th class="text-right pb-3 font-semibold">الحاويات</th>
        <th class="text-right pb-3 font-semibold">التاريخ</th>
        <th class="text-right pb-3 font-semibold bg-slate-50/50">إجراءات</th>
      </tr></thead><tbody>${invs.map(t => {
    const ent = st.entities.find(e => e.id === t.entityId);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
          <td class="py-2.5 font-mono text-xs">${t.invoiceNumber}</td>
          <td class="py-2.5">${escapeHtml(ent?.name || '-')}</td>
          <td class="py-2.5 font-semibold">${fmtCurrency(t.total)}</td>
          <td class="py-2.5 text-xs font-mono">${t.containerCount || '-'}</td>
          <td class="py-2.5 text-slate-500">${fmtDate(t.date)}</td>
          <td class="py-2.5"><div class="flex items-center gap-1">
            <button onclick="window._ciPrint('${t.id}')" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="طباعة"><i data-lucide="printer" class="w-4 h-4"></i></button>
            <button onclick="window._ciDelete('${t.id}')" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div></td>
        </tr>`;
  }).join('')}</tbody></table></div>`);
}

function invoiceForm(st) {
  const clients = st.entities.filter(e => e.type === 'client');
  const rate = getCurrentRate();
  return `<div class="p-6 space-y-5">
    <h2 class="text-lg font-bold text-slate-800">فاتورة عميل جديدة</h2>
    <form id="ci-form" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${select('العميل', 'entityId', [{ value: '', label: 'اختر العميل...' }, ...clients.map(c => ({ value: c.id, label: c.name }))], '', 'id="ci-entity" onchange="window._ciEntityChange()"')}
        <div id="ci-sub-wrap">${select('الفرع', 'subsidiaryId', [], '')}</div>
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700">رقم الفاتورة</label>
          <input type="text" name="invoiceNumber" id="ci-inv-num" readonly
            class="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm cursor-not-allowed text-slate-500" placeholder="بناءً على العميل..." />
        </div>
        ${input('التاريخ', 'date', 'date', todayISO())}
        ${input('رقم الشهادة (اختياري)', 'certificateNumber')}
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700">عدد الحاويات</label>
          <input type="text" name="containerCount" id="ci-container" placeholder="مثال: 1x40 2*20"
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 font-mono" />
        </div>
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700">سعر الصرف (USD→EGP)</label>
          <input type="number" name="exchangeRate" id="ci-rate" value="${rate}" readonly
            class="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm cursor-not-allowed text-slate-500" />
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold text-slate-700">البنود</label>
          <button type="button" onclick="window._ciAddItem()" class="text-xs text-violet-600 hover:underline flex items-center gap-1"><i data-lucide="plus" class="w-3 h-3"></i> إضافة بند</button>
        </div>
        <div id="ci-items" class="space-y-3"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${input('قيمة النولون (للحساب فقط)', 'freight', 'number', '0', 'id="ci-freight" step="0.01" onchange="window._ciCalc()"')}
        ${input('الضريبة (%)', 'taxRate', 'number', '14', 'id="ci-tax-rate" step="0.1" onchange="window._ciCalc()"')}
        <div class="space-y-1.5"><label class="block text-sm font-semibold text-slate-700">قيمة الضريبة المضافة</label>
          <input type="text" id="ci-freight-tax" class="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono" readonly /></div>
      </div>
      <div class="bg-slate-50 rounded-xl p-4 space-y-2">
        <div class="flex justify-between text-sm"><span class="text-slate-500">إجمالي البنود</span><span id="ci-subtotal" class="font-semibold">0</span></div>
        <div class="flex justify-between text-sm"><span class="text-slate-500">الضريبة المضافة فقط</span><span id="ci-freight-total" class="font-semibold">0</span></div>
        <div class="flex justify-between text-base font-bold border-t border-slate-200 pt-2"><span>الإجمالي النهائي</span><span id="ci-total">0</span></div>
      </div>
      <div class="flex justify-end gap-3">
        ${secondaryBtn('إلغاء', 'window._closeModal()')}
        ${primaryBtn('حفظ الفاتورة', '', 'check', 'type-submit')}
      </div>
    </form>
  </div>`;
}

let items = [];

function renderItems() {
  const wrap = document.getElementById('ci-items');
  if (!wrap) return;
  wrap.innerHTML = items.map((it, i) => `
    <div class="bg-slate-50 rounded-xl p-3 space-y-2">
      <div class="flex items-center gap-2">
        <input type="text" value="${escapeAttr(it.description)}" onchange="window._ciUpdateItem(${i},'description',this.value)" placeholder="الوصف" class="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
        <input type="number" value="${it.price}" onchange="window._ciUpdateItem(${i},'price',this.value)" placeholder="السعر" min="0" step="0.01" class="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none text-center" />
        <select onchange="window._ciUpdateItem(${i},'currency',this.value)" class="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none cursor-pointer">
          <option value="EGP" ${it.currency === 'EGP' ? 'selected' : ''}>جنيه مصري</option>
          <option value="USD" ${it.currency === 'USD' ? 'selected' : ''}>دولار امريكي</option>
        </select>
        <span class="text-sm font-semibold min-w-[100px] text-center">${fmtNum(itemEgp(it))} ج.م</span>
        <button type="button" onclick="window._ciRemoveItem(${i})" class="p-1 rounded hover:bg-red-50 text-red-400"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <textarea onchange="window._ciUpdateItem(${i},'notes',this.value)" placeholder="ملاحظات (اختياري)" rows="1" class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none resize-none">${escapeHtml(it.notes || '')}</textarea>
    </div>`).join('');
  if (window.lucide) lucide.createIcons({ nodes: [wrap] });
}

function itemEgp(it) {
  const rate = Number(document.getElementById('ci-rate')?.value) || getCurrentRate();
  return it.currency === 'USD' ? it.price * rate : it.price;
}

function calc() {
  const rate = Number(document.getElementById('ci-rate')?.value) || getCurrentRate();
  const freight = Number(document.getElementById('ci-freight')?.value) || 0;
  const taxRate = Number(document.getElementById('ci-tax-rate')?.value) || 0;

  // Freight is only used to calculate VAT, it's NOT added to the invoice total.
  const tax = freight * (taxRate / 100);
  const subtotal = items.reduce((s, it) => s + (it.currency === 'USD' ? it.price * rate : it.price), 0);
  const total = subtotal + tax;

  const taxEl = document.getElementById('ci-freight-tax');
  const subEl = document.getElementById('ci-subtotal');
  const ftEl = document.getElementById('ci-freight-total');
  const totEl = document.getElementById('ci-total');

  if (taxEl) taxEl.value = fmtNum(tax);
  if (subEl) subEl.textContent = fmtNum(subtotal);
  if (ftEl) ftEl.textContent = fmtNum(tax);
  if (totEl) totEl.textContent = fmtNum(total);
}

export function init() {
  items = [{ description: '', price: 0, currency: 'EGP', notes: '' }];

  window._ciNew = () => {
    items = [{ description: '', price: 0, currency: 'EGP', notes: '' }];
    showModal(invoiceForm(getState()), {
      maxWidth: 'max-w-3xl',
      onInit: () => {
        renderItems(); calc();
        const f = document.getElementById('ci-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const fd = new FormData(f);
          const entityId = fd.get('entityId');
          if (!entityId) { toast('يرجى اختيار العميل', 'warning'); return; }
          if (!items.some(it => it.description)) { toast('يرجى إضافة بند واحد على الأقل', 'warning'); return; }

          const rate = Number(fd.get('exchangeRate')) || getCurrentRate();
          const freight = Number(fd.get('freight')) || 0;
          const taxRate = Number(fd.get('taxRate')) || 0;
          const tax = freight * (taxRate / 100);
          const subtotal = items.reduce((s, it) => s + (it.currency === 'USD' ? it.price * rate : it.price), 0);
          const total = subtotal + tax;

          addTransaction({
            type: 'client', entityId: entityId, subsidiaryId: fd.get('subsidiaryId') || null,
            invoiceNumber: fd.get('invoiceNumber'), certificateNumber: fd.get('certificateNumber') || null,
            date: fd.get('date'), containerCount: (fd.get('containerCount') || '').trim() || null,
            items: items.map(it => ({ ...it })),
            freight, freightTax: tax, subtotal, total, currency: 'EGP', exchangeRate: rate
          });
          toast('تم حفظ الفاتورة', 'success'); closeModal(); Router.navigate('client-invoices');
        };
      }
    });
  };

  window._ciEntityChange = () => {
    const eId = document.getElementById('ci-entity')?.value;
    const invNumInput = document.getElementById('ci-inv-num');
    const wrap = document.getElementById('ci-sub-wrap');

    if (eId) {
      const nextId = getNextInvoiceIdForEntity(eId);
      if (invNumInput) invNumInput.value = nextId;
      const subs = getState().subsidiaries.filter(s => s.entityId === eId);
      if (wrap) wrap.innerHTML = select('الفرع', 'subsidiaryId', subs.map(s => ({ value: s.id, label: s.name })));
    } else {
      if (invNumInput) invNumInput.value = '';
      if (wrap) wrap.innerHTML = select('الفرع', 'subsidiaryId', [], '');
    }
  };

  window._ciAddItem = () => { items.push({ description: '', price: 0, currency: 'EGP', notes: '' }); renderItems(); calc(); };
  window._ciRemoveItem = (i) => { items.splice(i, 1); renderItems(); calc(); };
  window._ciUpdateItem = (i, k, v) => {
    items[i][k] = (k === 'price') ? (Number(v) || 0) : v;
    renderItems(); calc();
  };
  window._ciCalc = calc;

  window._ciDelete = (id) => {
    if (confirm('هل تريد حذف هذه الفاتورة؟')) {
      deleteTransaction(id); toast('تم الحذف', 'success'); Router.navigate('client-invoices');
    }
  };

  window._ciFilter = () => {
    const st = getState();
    const term = (document.getElementById('ci-search')?.value || '').toLowerCase();
    let invs = st.transactions.filter(t => t.type === 'client').sort((a, b) => parseInt(a.invoiceNumber) - parseInt(b.invoiceNumber));
    if (term) {
      invs = invs.filter(t => {
        const searchStr = [
          t.invoiceNumber, t.certificateNumber, t.total, t.containerCount, t.date,
          ...(t.items || []).map(it => it.notes)
        ].join(' ').toLowerCase();
        return searchStr.includes(term);
      });
    }
    document.getElementById('ci-list').innerHTML = renderList(invs, st);
    if (window.lucide) lucide.createIcons();
  };

  window._ciPrint = (id) => {
    const st = getState();
    const t = st.transactions.find(x => x.id === id);
    if (!t) return;
    const ent = st.entities.find(e => e.id === t.entityId);
    const sub = t.subsidiaryId ? st.subsidiaries.find(s => s.id === t.subsidiaryId) : null;
    const logo = st.companyLogo ? `<img src="${st.companyLogo}" class="logo" />` : '';
    const html = `
      <div class="inv-header"><div>${logo}<p class="co-name">${escapeHtml(st.config.companyName)}</p><p class="inv-title">فاتورة عميل</p></div>
        <div class="inv-info"><p class="lbl">رقم الفاتورة</p><p class="val">${t.invoiceNumber}</p>
          ${t.certificateNumber ? `<p class="lbl">رقم الشهادة</p><p class="val">${t.certificateNumber}</p>` : ''}
          <p class="lbl">التاريخ</p><p class="val">${fmtDate(t.date)}</p>
          <p class="lbl">العميل</p><p class="val">${escapeHtml(ent?.name || '-')} ${sub ? `(${escapeHtml(sub.name)})` : ''}</p>
          ${t.containerCount ? `<p class="lbl">الحاويات</p><p class="val">${t.containerCount}</p>` : ''}</div></div>
      <table><thead><tr><th>#</th><th>الوصف</th><th>السعر</th><th>العملة</th><th>المعادل</th></tr></thead>
        <tbody>${(t.items || []).map((it, i) => {
      const egp = it.currency === 'USD' ? (Number(it.price) * (t.exchangeRate || 1)) : Number(it.price);
      return `<tr><td>${i + 1}</td><td>${escapeHtml(it.description)}${it.notes ? `<br/><small style="color:#94a3b8">${escapeHtml(it.notes)}</small>` : ''}</td><td>${fmtNum(it.price)}</td><td>${it.currency === 'USD' ? 'دولار امريكي' : 'جنيه مصري'}</td><td>${fmtNum(egp)}</td></tr>`;
    }).join('')}</tbody></table>
      <div class="totals"><table class="totals-table">
        <tr><td>إجمالي البنود</td><td>${fmtNum(t.subtotal)}</td></tr>
        ${Number(t.freight) ? `<tr><td>النولون (تسوية فقط)</td><td>${fmtNum(t.freight)}</td></tr>` : ''}
        ${Number(t.freightTax) ? `<tr><td>ضريبة النولون المضافة</td><td>${fmtNum(t.freightTax)}</td></tr>` : ''}
        <tr class="total-row"><td>الإجمالي النهائي</td><td>${fmtCurrency(t.total)} </td></tr>
      </table></div>`;
    printInvoice(html, `فاتورة ${t.invoiceNumber}`);
  };

  window._closeModal = closeModal;
}
