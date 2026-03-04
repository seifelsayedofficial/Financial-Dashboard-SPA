import { getState, addEntity, updateEntity, deleteEntity, addSubsidiary, updateSubsidiary, deleteSubsidiary, exportState, importState, setLogo } from '../state.js';
import { fmtCurrency, toast, showModal, closeModal, downloadJSON, readFileText, readFileBase64 } from '../utils.js';
import { card, primaryBtn, secondaryBtn, dangerBtn, input, select, emptyState } from '../components.js';
import { Router } from '../router.js';

export function render() {
  const st = getState();
  const clients = st.entities.filter(e => e.type === 'client');
  const shippers = st.entities.filter(e => e.type === 'shipping');

  return `<div class="space-y-6">
    <!-- Header Actions -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        ${primaryBtn('إضافة جهة جديدة', 'window._adminAddEntity()', 'plus')}
      </div>
      <div class="flex items-center gap-3">
        ${secondaryBtn('رفع الشعار', 'window._adminUploadLogo()', 'image')}
        ${secondaryBtn('تصدير النسخة', 'window._adminExport()', 'download')}
        ${secondaryBtn('استيراد النسخة', 'window._adminImport()', 'upload')}
      </div>
    </div>

    <!-- Logo Preview -->
    ${st.companyLogo ? `<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 flex items-center gap-4">
      <img src="${st.companyLogo}" class="w-16 h-16 rounded-xl object-contain border border-slate-200" />
      <div><p class="text-sm font-semibold text-slate-700">شعار الشركة</p>
        <button onclick="window._adminRemoveLogo()" class="text-xs text-red-500 hover:underline mt-1">إزالة الشعار</button></div>
    </div>` : ''}

    <!-- Clients -->
    ${card('العملاء (' + clients.length + ')', clients.length ? `
      <div class="space-y-3" id="clients-list">${clients.map(c => entityRow(c, st)).join('')}</div>
    ` : emptyState('users', 'لا يوجد عملاء'), primaryBtn('إضافة عميل', "window._adminAddEntity('client')", 'plus', 'text-xs !px-3 !py-1.5'))}

    <!-- Shippers -->
    ${card('شركات النقل (' + shippers.length + ')', shippers.length ? `
      <div class="space-y-3" id="shippers-list">${shippers.map(s => entityRow(s, st)).join('')}</div>
    ` : emptyState('ship', 'لا يوجد شركات نقل'), primaryBtn('إضافة شركة نقل', "window._adminAddEntity('shipping')", 'plus', 'text-xs !px-3 !py-1.5'))}

    <input type="file" id="import-file" accept=".json" class="hidden" />
    <input type="file" id="logo-file" accept="image/*" class="hidden" />
  </div>`;
}

function entityRow(ent, st) {
  const subs = st.subsidiaries.filter(s => s.entityId === ent.id);
  return `<div class="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
    <div class="flex items-center justify-between">
      <div>
        <p class="font-bold text-slate-800">${ent.name}</p>
        <p class="text-xs text-slate-500">${ent.type === 'client' ? 'عميل' : 'شركة النقل'} ${ent.phone ? '• ' + ent.phone : ''} • رصيد افتتاحي: ${fmtCurrency(ent.openingBalance)}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="window._adminEditEntity('${ent.id}')" class="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><i data-lucide="pencil" class="w-4 h-4"></i></button>
        <button onclick="window._adminDeleteEntity('${ent.id}','${ent.name}')" class="p-2 rounded-lg hover:bg-red-50 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    </div>
    ${subs.length ? `<div class="mt-3 mr-4 border-r-2 border-slate-200 pr-4 space-y-2">${subs.map(s => `
      <div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
        <span class="text-sm text-slate-700">${s.name}</span>
        <div class="flex items-center gap-1">
          <button onclick="window._adminEditSub('${s.id}')" class="p-1 rounded hover:bg-slate-200 text-slate-500"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button onclick="window._adminDeleteSub('${s.id}','${s.name}')" class="p-1 rounded hover:bg-red-50 text-red-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </div>`).join('')}</div>` : ''}
    <button onclick="window._adminAddSub('${ent.id}')" class="mt-2 text-xs text-violet-600 hover:underline flex items-center gap-1"><i data-lucide="plus" class="w-3 h-3"></i> إضافة فرع</button>
  </div>`;
}

export function init() {
  window._adminAddEntity = (type) => {
    showModal(`<div class="p-6 space-y-4">
      <h2 class="text-lg font-bold text-slate-800">إضافة جهة جديدة</h2>
      <form id="entity-form" class="space-y-4">
        ${select('النوع', 'type', [{ value: 'client', label: 'عميل' }, { value: 'shipping', label: 'شركة النقل' }], type || '')}
        ${input('الاسم', 'name')}
        ${input('الهاتف', 'phone', 'tel')}
        ${input('الرصيد الافتتاحي', 'openingBalance', 'number', '0')}
        <div class="flex justify-end gap-3 pt-2">
          ${secondaryBtn('إلغاء', 'window._closeModal()')}
          ${primaryBtn('حفظ', '', 'check', 'type-submit')}
        </div>
      </form>
    </div>`, {
      onInit: () => {
        const f = document.getElementById('entity-form');
        const btn = f.querySelector('.type-submit');
        btn.type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const fd = new FormData(f);
          const t = fd.get('type'), n = fd.get('name');
          if (!t || !n) { toast('يرجى ملء جميع الحقول المطلوبة', 'warning'); return; }
          addEntity({ type: t, name: n, phone: fd.get('phone') || '', openingBalance: Number(fd.get('openingBalance')) || 0 });
          toast('تمت الإضافة بنجاح', 'success');
          closeModal(); Router.navigate('admin');
        };
      }
    });
  };

  window._adminEditEntity = (id) => {
    const ent = getState().entities.find(e => e.id === id);
    if (!ent) return;
    showModal(`<div class="p-6 space-y-4">
      <h2 class="text-lg font-bold text-slate-800">تعديل الجهة</h2>
      <form id="entity-form" class="space-y-4">
        ${select('النوع', 'type', [{ value: 'client', label: 'عميل' }, { value: 'shipping', label: 'شركة النقل' }], ent.type)}
        ${input('الاسم', 'name', 'text', ent.name)}
        ${input('الهاتف', 'phone', 'tel', ent.phone || '')}
        ${input('الرصيد الافتتاحي', 'openingBalance', 'number', ent.openingBalance || 0)}
        <div class="flex justify-end gap-3 pt-2">
          ${secondaryBtn('إلغاء', 'window._closeModal()')}
          ${primaryBtn('تحديث', '', 'check', 'type-submit')}
        </div>
      </form>
    </div>`, {
      onInit: () => {
        const f = document.getElementById('entity-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const fd = new FormData(f);
          updateEntity(id, { type: fd.get('type'), name: fd.get('name'), phone: fd.get('phone'), openingBalance: Number(fd.get('openingBalance')) || 0 });
          toast('تم التحديث بنجاح', 'success');
          closeModal(); Router.navigate('admin');
        };
      }
    });
  };

  window._adminDeleteEntity = (id, name) => {
    if (confirm(`هل تريد حذف "${name}"؟ سيتم حذف جميع الفروع والمعاملات المرتبطة.`)) {
      deleteEntity(id); toast('تم الحذف', 'success'); Router.navigate('admin');
    }
  };

  window._adminAddSub = (entityId) => {
    showModal(`<div class="p-6 space-y-4">
      <h2 class="text-lg font-bold text-slate-800">إضافة فرع</h2>
      <form id="sub-form" class="space-y-4">
        ${input('اسم الفرع', 'name')}
        <div class="flex justify-end gap-3 pt-2">
          ${secondaryBtn('إلغاء', 'window._closeModal()')}
          ${primaryBtn('حفظ', '', 'check', 'type-submit')}
        </div>
      </form>
    </div>`, {
      onInit: () => {
        const f = document.getElementById('sub-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          const name = new FormData(f).get('name');
          if (!name) { toast('يرجى إدخال اسم الفرع', 'warning'); return; }
          addSubsidiary({ entityId, name });
          toast('تمت الإضافة', 'success'); closeModal(); Router.navigate('admin');
        };
      }
    });
  };

  window._adminEditSub = (id) => {
    const sub = getState().subsidiaries.find(s => s.id === id);
    if (!sub) return;
    showModal(`<div class="p-6 space-y-4">
      <h2 class="text-lg font-bold text-slate-800">تعديل الفرع</h2>
      <form id="sub-form" class="space-y-4">
        ${input('اسم الفرع', 'name', 'text', sub.name)}
        <div class="flex justify-end gap-3 pt-2">
          ${secondaryBtn('إلغاء', 'window._closeModal()')}
          ${primaryBtn('تحديث', '', 'check', 'type-submit')}
        </div>
      </form>
    </div>`, {
      onInit: () => {
        const f = document.getElementById('sub-form');
        f.querySelector('.type-submit').type = 'submit';
        f.onsubmit = ev => {
          ev.preventDefault();
          updateSubsidiary(id, { name: new FormData(f).get('name') });
          toast('تم التحديث', 'success'); closeModal(); Router.navigate('admin');
        };
      }
    });
  };

  window._adminDeleteSub = (id, name) => {
    if (confirm(`هل تريد حذف الفرع "${name}"؟`)) {
      deleteSubsidiary(id); toast('تم الحذف', 'success'); Router.navigate('admin');
    }
  };

  window._adminUploadLogo = () => {
    const f = document.getElementById('logo-file');
    f.onchange = async () => {
      if (f.files[0]) {
        const b64 = await readFileBase64(f.files[0]);
        setLogo(b64); toast('تم رفع الشعار', 'success'); Router.navigate('admin');
      }
    };
    f.click();
  };

  window._adminRemoveLogo = () => { setLogo(''); toast('تم إزالة الشعار', 'success'); Router.navigate('admin'); };

  window._adminExport = () => {
    downloadJSON(exportState(), `alexandria-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast('تم تصدير النسخة الاحتياطية', 'success');
  };

  window._adminImport = () => {
    const f = document.getElementById('import-file');
    f.onchange = async () => {
      if (f.files[0]) {
        const txt = await readFileText(f.files[0]);
        if (importState(txt)) { toast('تم استيراد البيانات بنجاح', 'success'); Router.navigate('admin'); }
        else toast('فشل استيراد الملف', 'error');
      }
    };
    f.click();
  };

  window._closeModal = closeModal;
}
