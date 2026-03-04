import { getState, getEntityBalance } from '../state.js';
import { fmtCurrency, fmtNum, fmtDate, balanceLabel, escapeHtml } from '../utils.js';
import { kpiCard, card, emptyState, badge } from '../components.js';

export function render() {
  const st = getState();
  const clients = st.entities.filter(e => e.type === 'client');
  const shippers = st.entities.filter(e => e.type === 'shipping');

  // Sort transactions and bank transfers
  const recentInvs = [...st.transactions].sort((a, b) => parseInt(b.invoiceNumber) - parseInt(a.invoiceNumber)).slice(0, 5);
  const recentBT = [...st.bankTransfers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  // Merged card: totals
  const totalEntities = clients.length + shippers.length;
  const totalTx = st.transactions.length + st.bankTransfers.length;

  // إجمالي الأرصدة (جنيه) = مجموع أرصدة العملاء (نفس الأرقام اللي في جدول أرصدة العملاء — الرصيد الموجب يظهر هنا)
  const totalDain = clients.reduce((s, c) => s + getEntityBalance(c.id), 0);
  // إجمالي الخسائر (المصروف الفعلي) = لكل شركة نقل: المصروف = الأقل بين (فواتيرها المستحقة، التحويلات لها).
  // محاسبياً: المبلغ المستهلك فقط يُحسب مصروفاً؛ الزيادة عن الفاتورة (مقدم/مدفوع زائد) = أصل أو ذمم مدينة وليست خسارة. راجع: prepayment vs expense, overpayment to supplier.
  const totalOutgoing = shippers.reduce((sum, s) => {
    const invTotal = st.transactions.filter(t => t.type === 'shipping' && t.entityId === s.id).reduce((a, t) => a + Number(t.total || 0), 0);
    const wdrawTotal = st.bankTransfers.filter(b => b.type === 'withdrawal' && b.entityId === s.id).reduce((a, b) => a + Number(b.amount || 0), 0);
    return sum + Math.min(invTotal, wdrawTotal);
  }, 0);
  const totalProfit = totalDain - totalOutgoing; // مؤشر تشغيلي: صافي مركز العملاء ناقص مصروف النقل. الربح المحاسبي الصريح = إيرادات (فواتير العملاء) − مصروفات؛ هنا نستخدم «أرصدة» كبديل مبسط.

  // كارت الدولار: من كل الفواتير (بنود بالدولار فقط)
  const usdFromClients = st.transactions.filter(t => t.type === 'client').reduce((acc, t) => acc + (t.items || []).reduce((s, it) => it.currency === 'USD' ? s + Number(it.price || 0) : s, 0), 0);
  const usdFromShipping = st.transactions.filter(t => t.type === 'shipping').reduce((acc, t) => acc + (t.items || []).reduce((s, it) => it.currency === 'USD' ? s + Number(it.price || 0) : s, 0), 0);
  const usdBalance = usdFromClients - usdFromShipping;

  function numColor(n) { return n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : ''; }

  function balBadge(bal, isClient) {
    if (bal === 0) return '';
    const lbl = balanceLabel(bal, isClient);
    const color = lbl.startsWith('دائن') ? 'green' : 'red';
    return badge(lbl, color);
  }

  return `
    <div class="space-y-6">
      <!-- ملخص: إجمالي العملاء وشركات النقل + إجمالي الفواتير والتحويلات (كارت واحد) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-3 flex flex-col justify-center">
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي العملاء وشركات النقل</span><span class="font-bold text-slate-800">${fmtNum(totalEntities)}</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي الفواتير والتحويلات</span><span class="font-bold text-slate-800">${fmtNum(totalTx)}</span></div>
        </div>
        <!-- إجمالي الأرصدة = مجموع أرصدة العملاء، الخسائر = المصروف الفعلي (الأقل بين الفاتورة والتحويل لكل شركة نقل)، الأرباح = أرصدة − خسائر -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-3 flex flex-col justify-center">
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500" title="مجموع أرصدة العملاء (الرصيد الموجب والسالب كما في جدول أرصدة العملاء)">إجمالي الأرصدة (جنيه)</span><span class="font-bold ${numColor(totalDain)}">${fmtCurrency(totalDain)}</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500" title="المصروف الفعلي لشركات النقل (الأقل بين الفاتورة والتحويل لكل شركة — المدفوع فوق المستحق يعتبر مقدم وليس خسارة)">إجمالي الخسائر (المدفوعات)</span><span class="font-bold ${numColor(-totalOutgoing)}">${fmtCurrency(totalOutgoing)}</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي الأرباح (أرصدة − خسائر)</span><span class="font-bold ${numColor(totalProfit)}">${fmtCurrency(totalProfit)}</span></div>
        </div>
        <!-- كارت حساب الدولار -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 space-y-3 flex flex-col justify-center">
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي رصيد الدولار</span><span class="font-bold ${numColor(usdBalance)}">${fmtNum(usdBalance)} دولار</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي أرباح الدولار</span><span class="font-bold text-emerald-600">${fmtNum(usdFromClients)} دولار</span></div>
          <div class="flex justify-between items-center"><span class="text-sm font-semibold text-slate-500">إجمالي خسائر الدولار</span><span class="font-bold text-red-600">${fmtNum(usdFromShipping)} دولار</span></div>
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
                <td class="py-2.5 font-medium">${escapeHtml(c.name)}</td>
                <td class="py-2.5 ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-red-600' : ''} font-semibold">${fmtCurrency(bal)}</td>
                <td class="py-2.5">${balBadge(bal, true)}</td>
              </tr>`;
  }).join('')}</tbody></table></div>` : emptyState('users', 'لا يوجد عملاء بعد'))}

        ${card('أرصدة شركات النقل', shippers.length ? `
          <div class="overflow-x-auto"><table class="w-full text-sm">
            <thead><tr class="text-slate-500 border-b border-slate-100">
              <th class="text-right pb-3 font-semibold">الشركة</th>
              <th class="text-right pb-3 font-semibold">الرصيد</th>
              <th class="text-right pb-3 font-semibold" title="مدين (عليه) = المستحق على المكتب للشركة. دائن (له) = سابقاً دفعنا أكثر من الفواتير.">الحالة</th>
            </tr></thead><tbody>${shippers.map(s => {
    const bal = getEntityBalance(s.id);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
                <td class="py-2.5 font-medium">${escapeHtml(s.name)}</td>
                <td class="py-2.5 ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-red-600' : ''} font-semibold">${fmtCurrency(bal)}</td>
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
                <td class="py-2.5">${escapeHtml(ent?.name || '-')}</td>
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
                <td class="py-2.5">${escapeHtml(ent?.name || '-')}</td>
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
