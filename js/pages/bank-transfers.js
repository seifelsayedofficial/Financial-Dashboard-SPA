import { getState, addBankTransfer, updateBankTransfer, deleteBankTransfer } from '../state.js';
import { fmtCurrency, fmtDate, todayISO, toast, showModal, closeModal } from '../utils.js';
import { card, primaryBtn, secondaryBtn, emptyState, badge, input, select, textarea } from '../components.js';
import { Router } from '../router.js';

export function render() {
  const st = getState();
  const transfers = [...st.bankTransfers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `<div class="space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      ${primaryBtn('تحويل جديد', 'window._btNew()', 'plus')}
    </div>
    <!-- Single Search Bar -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
      <div class="relative">
        <i data-lucide="search" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
        <input type="text" id="bt-search" placeholder="بحث باسم الجهة، المبلغ، الملاحظات، أو التاريخ..." oninput="window._btFilter()" 
          class="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20" />
      </div>
    </div>
    <div id="bt-list">
      ${renderList(transfers, st)}
    </div>
  </div>`;
}

function renderList(transfers, st) {
  if (!transfers.length) return emptyState('arrow-left-right', 'لا توجد تحويلات بنكية');
  return card('', `<div class="overflow-x-auto"><table class="w-full text-sm">
    <thead><tr class="text-slate-500 border-b border-slate-100">
      <th class="text-right pb-3 font-semibold">النوع</th>
      <th class="text-right pb-3 font-semibold">الجهة</th>
      <th class="text-right pb-3 font-semibold">المبلغ</th>
      <th class="text-right pb-3 font-semibold">التاريخ</th>
      <th class="text-right pb-3 font-semibold">ملاحظات</th>
      <th class="text-right pb-3 font-semibold">إجراءات</th>
    </tr></thead><tbody>${transfers.map(b => {
    const ent = st.entities.find(e => e.id === b.entityId);
    return `<tr class="border-b border-slate-50 hover:bg-slate-50/50">
        <td class="py-2.5">${b.type === 'deposit' ? badge('إيداع', 'green') : badge('تحويل', 'red')}</td>
        <td class="py-2.5">${ent?.name || '-'}</td>
        <td class="py-2.5 font-semibold">${fmtCurrency(b.amount)}</td>
        <td class="py-2.5 text-slate-500">${fmtDate(b.date)}</td>
        <td class="py-2.5 text-slate-500 text-xs truncate max-w-[200px]" title="${b.notes || ''}">${b.notes || '-'}</td>
        <td class="py-2.5">
          <div class="flex items-center gap-1">
            ${b.linkedInvoice ? `<button onclick="window._btViewInvoice('${b.linkedInvoice}')" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="عرض الفاتورة"><i data-lucide="file-text" class="w-4 h-4"></i></button>` : ''}
            <button onclick="window._btEdit('${b.id}')" class="p-1.5 rounded-lg hover:bg-slate-100 text-blue-500" title="تعديل"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button onclick="window._btDelete('${b.id}')" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('')}</tbody></table></div>`);
}

function btForm(st, editData = null) {
  const isEdit = !!editData;
  const entities = st.entities;
  return `<div class="p-6 space-y-5">
      <h2 class="text-lg font-bold text-slate-800">${isEdit ? 'تعديل التحويل' : 'تحويل بنكي جديد'}</h2>
      <form id="bt-form" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${select('النوع', 'type', [{ value: 'deposit', label: 'إيداع' }, { value: 'withdrawal', label: 'تحويل' }], editData?.type || '')}
          ${select('الجهة', 'entityId', entities.map(e => ({ value: e.id, label: e.name + (e.type === 'client' ? ' (عميل)' : ' (نقل)') })), editData?.entityId || '')}
          ${input('المبلغ', 'amount', 'number', editData?.amount || '', 'step="0.01" min="0"')}
          ${input('التاريخ', 'date', 'date', editData?.date || todayISO())}
          ${input('رقم الفاتورة المرتبطة (اختياري)', 'linkedInvoice', 'text', editData?.linkedInvoice || '')}
        </div>
        ${textarea('ملاحظات', 'notes', 2, editData?.notes || '')}
        <div class="flex justify-end gap-3">
          ${secondaryBtn('إلغاء', 'window._closeModal()')}
          ${primaryBtn('حفظ', '', 'check', 'type-submit')}
        </div>
      </form>
    </div>`;
}

export function init() {
  window._btNew = () => {
    showModal(btForm(getState()), {
      onInit: () => {
        const f = document.getElementById('bt-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const fd = new FormData(f);
          if (!fd.get('entityId') || !fd.get('type') || !Number(fd.get('amount'))) {
            toast('يرجى ملء جميع الحقول المطلوبة', 'warning'); return;
          }
          addBankTransfer({
            type: fd.get('type'), entityId: fd.get('entityId'), amount: Number(fd.get('amount')),
            date: fd.get('date'), linkedInvoice: fd.get('linkedInvoice') || '',
            notes: fd.get('notes') || ''
          });
          toast('تم حفظ التحويل', 'success'); closeModal(); Router.navigate('bank-transfers');
        };
      }
    });
  };

  window._btEdit = (id) => {
    const st = getState();
    const bt = st.bankTransfers.find(b => b.id === id);
    if (!bt) return;
    showModal(btForm(st, bt), {
      onInit: () => {
        const f = document.getElementById('bt-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const fd = new FormData(f);
          if (!fd.get('entityId') || !fd.get('type') || !Number(fd.get('amount'))) {
            toast('يرجى ملء جميع الحقول المطلوبة', 'warning'); return;
          }
          updateBankTransfer(id, {
            type: fd.get('type'), entityId: fd.get('entityId'), amount: Number(fd.get('amount')),
            date: fd.get('date'), linkedInvoice: fd.get('linkedInvoice') || '',
            notes: fd.get('notes') || ''
          });
          toast('تم التعديل بنجاح', 'success'); closeModal(); Router.navigate('bank-transfers');
        };
      }
    });
  };

  window._btDelete = (id) => {
    if (confirm('هل تريد حذف هذا التحويل؟')) {
      deleteBankTransfer(id); toast('تم الحذف', 'success'); Router.navigate('bank-transfers');
    }
  };

  window._btViewInvoice = (invNum) => {
    const st = getState();
    const t = st.transactions.find(x => x.invoiceNumber === invNum || x.id === invNum);
    if (!t) {
      toast('الفاتورة غير موجودة', 'error'); return;
    }
    const pg = t.type === 'client' ? 'client-invoices' : 'shipping-invoices';
    window._nav(pg);
    setTimeout(() => {
      const fn = t.type === 'client' ? window._ciPrint : window._siPrint;
      if (fn) fn(t.id);
    }, 400);
  };

  window._btFilter = () => {
    const st = getState();
    const search = (document.getElementById('bt-search')?.value || '').toLowerCase();
    let filtered = [...st.bankTransfers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (search) {
      filtered = filtered.filter(b => {
        const ent = st.entities.find(e => e.id === b.entityId);
        return (ent?.name || '').toLowerCase().includes(search) ||
          (ent?.type === 'client' ? 'عميل' : 'شركة نقل').includes(search) ||
          (b.amount || '').toString().includes(search) ||
          (b.notes || '').toLowerCase().includes(search) ||
          (b.date || '').includes(search) ||
          (b.linkedInvoice || '').toLowerCase().includes(search);
      });
    }
    document.getElementById('bt-list').innerHTML = renderList(filtered, st);
    if (window.lucide) lucide.createIcons();
  };

  window._closeModal = closeModal;
}
