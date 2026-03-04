// ── Number Formatting (English digits, thousand sep, no trailing .00) ──
export function fmtNum(n) {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    const str = abs % 1 === 0
        ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).replace(/0+$/, '');
    return v < 0 ? '-' + str : str;
}

export function fmtCurrency(amount, currency = 'EGP') {
    const n = Number(amount) || 0;
    const abs = Math.abs(n);
    const str = abs % 1 === 0
        ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).replace(/0+$/, '');
    return `${n < 0 ? '-' : ''}${str} ${currency === 'USD' ? 'دولار امريكي' : 'جنيه مصري'}`;
}

// Balance status label helper
export function balanceLabel(bal, isClient = true) {
    if (bal === 0) return '';
    if (isClient) return bal > 0 ? 'دائن (له)' : 'مدين (عليه)';
    return bal > 0 ? 'مدين (عليه)' : 'دائن (له)';
}

export function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function todayISO() { return new Date().toISOString().split('T')[0]; }

// ── Toasts ──
const toastColors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
const toastIcons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };

export function toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `${toastColors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] transform -translate-x-full transition-transform duration-300`;
    el.innerHTML = `<i data-lucide="${toastIcons[type]}" class="w-5 h-5 shrink-0"></i><span class="text-sm font-medium">${msg}</span>`;
    c.appendChild(el);
    if (window.lucide) lucide.createIcons({ nodes: [el] });
    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.transform = 'translateX(-120%)';
        setTimeout(() => el.remove(), 310);
    }, 3000);
}

// ── Modal ──
export function showModal(html, opts = {}) {
    const bd = document.getElementById('modal-backdrop');
    const mc = document.getElementById('modal-content');
    mc.className = `modal-slide-up bg-white rounded-2xl shadow-2xl ${opts.maxWidth || 'max-w-2xl'} w-full mx-4 max-h-[90vh] overflow-y-auto`;
    mc.innerHTML = html;
    bd.classList.remove('hidden');
    bd.classList.add('flex');
    if (window.lucide) lucide.createIcons({ nodes: [mc] });
    bd.onclick = e => { if (e.target === bd) closeModal(); };
    if (opts.onInit) setTimeout(opts.onInit, 60);
}

export function closeModal() {
    const bd = document.getElementById('modal-backdrop');
    bd.classList.add('hidden');
    bd.classList.remove('flex');
}

// ── Print ──
export function printInvoice(bodyHtml, title = '') {
    const w = window.open('', '_blank', 'width=800,height=900');
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;padding:40px;direction:rtl;color:#1e293b}
@page{size:A4;margin:20mm}
.inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
.co-name{font-size:22px;font-weight:700}
.inv-title{font-size:16px;color:#475569;margin-top:4px}
.inv-info{text-align:left}
.lbl{font-size:11px;color:#94a3b8}.val{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#f1f5f9;padding:8px 12px;text-align:right;font-weight:600;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px}
.totals{margin-top:20px}.totals td{padding:5px 12px}
.total-row{font-weight:700;font-size:15px;border-top:2px solid #1e293b}
.logo{max-width:70px;max-height:70px}
@media print{body{padding:0}}
</style></head><body>${bodyHtml}</body>
<script>setTimeout(()=>window.print(),500)<\/script></html>`);
    w.document.close();
}

// ── File helpers ──
export function downloadJSON(data, filename) {
    const b = new Blob([data], { type: 'application/json' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = filename; a.click();
    URL.revokeObjectURL(u);
}

export function readFileText(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
}

export function readFileBase64(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}
