// ── Reusable UI component generators ──
import { escapeHtml, escapeAttr } from './utils.js';

export function kpiCard(icon, label, value, color = 'cyan') {
    const grad = {
        cyan: 'from-cyan-500 to-cyan-600', violet: 'from-violet-500 to-violet-600',
        emerald: 'from-emerald-500 to-emerald-600', amber: 'from-amber-500 to-amber-600',
        red: 'from-red-500 to-red-600', blue: 'from-blue-500 to-blue-600'
    };
    return `<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 flex items-center gap-4">
    <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${grad[color] || grad.cyan} flex items-center justify-center text-white">
      <i data-lucide="${icon}" class="w-6 h-6"></i></div>
    <div><p class="text-xs text-slate-500 font-medium">${escapeHtml(label)}</p>
    <p class="text-lg font-bold text-slate-800 mt-0.5">${escapeHtml(value)}</p></div></div>`;
}

export function card(title, body, extra = '') {
    return `<div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
    ${title ? `<div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <h3 class="font-bold text-slate-800">${escapeHtml(title)}</h3>${extra}</div>` : ''}
    <div class="p-6">${body}</div></div>`;
}

export function primaryBtn(text, onclick = '', icon = '', extra = '') {
    return `<button onclick="${escapeAttr(onclick)}" class="bg-gradient-to-l from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 hover:shadow-xl transition-all flex items-center gap-2 ${extra}">
    ${icon ? `<i data-lucide="${icon}" class="w-4 h-4"></i>` : ''}${escapeHtml(text)}</button>`;
}

export function secondaryBtn(text, onclick = '', icon = '', extra = '') {
    return `<button onclick="${escapeAttr(onclick)}" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${extra}">
    ${icon ? `<i data-lucide="${icon}" class="w-4 h-4"></i>` : ''}${escapeHtml(text)}</button>`;
}

export function dangerBtn(text, onclick = '', icon = '', extra = '') {
    return `<button onclick="${escapeAttr(onclick)}" class="bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${extra}">
    ${icon ? `<i data-lucide="${icon}" class="w-4 h-4"></i>` : ''}${escapeHtml(text)}</button>`;
}

export function input(label, name, type = 'text', value = '', extra = '') {
    return `<div class="space-y-1.5"><label class="block text-sm font-semibold text-slate-700">${escapeHtml(label)}</label>
    <input type="${type}" name="${name}" value="${escapeAttr(value)}" ${extra}
      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all" /></div>`;
}

export function select(label, name, options, value = '', extra = '') {
    const opts = options.map(o => `<option value="${escapeAttr(o.value)}" ${o.value == value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
    return `<div class="space-y-1.5"><label class="block text-sm font-semibold text-slate-700">${escapeHtml(label)}</label>
    <select name="${name}" ${extra}
      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all appearance-none cursor-pointer"
      style="background-image:url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22%3e%3cpath d=%22M6 9l6 6 6-6%22/%3e%3c/svg%3e');background-repeat:no-repeat;background-position:left 12px center;background-size:16px">
      <option value="">-- اختر --</option>${opts}</select></div>`;
}

export function textarea(label, name, value = '', rows = 3) {
    return `<div class="space-y-1.5"><label class="block text-sm font-semibold text-slate-700">${escapeHtml(label)}</label>
    <textarea name="${name}" rows="${rows}"
      class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all resize-none">${escapeHtml(value)}</textarea></div>`;
}

export function emptyState(icon, msg) {
    return `<div class="flex flex-col items-center justify-center py-16 text-slate-400">
    <i data-lucide="${icon}" class="w-16 h-16 mb-4 opacity-50"></i>
    <p class="text-lg font-medium">${escapeHtml(msg)}</p></div>`;
}

export function badge(text, color = 'slate') {
    const map = {
        green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700',
        blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700',
        slate: 'bg-slate-100 text-slate-600', violet: 'bg-violet-100 text-violet-700'
    };
    return `<span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold ${map[color] || map.slate}">${escapeHtml(text)}</span>`;
}
