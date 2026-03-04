const STORAGE_KEY = 'alexandria_office_state';

const defaultState = {
    entities: [],
    subsidiaries: [],
    transactions: [],
    bankTransfers: [],
    config: { exchangeRate: 50, lastRateUpdate: null, companyName: 'مكتب الاسكندرية' },
    companyLogo: ''
};

let state = null;
const listeners = new Set();

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        state = raw ? { ...defaultState, ...JSON.parse(raw) } : structuredClone(defaultState);
    } catch { state = structuredClone(defaultState); }
    return state;
}

export function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    listeners.forEach(fn => fn(state));
}

export function getState() { if (!state) loadState(); return state; }

export function updateConfig(patch) {
    Object.assign(state.config, patch);
    saveState();
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ── Entity CRUD ──
export function addEntity(data) {
    const e = { ...data, id: genId(), createdAt: new Date().toISOString() };
    state.entities.push(e); saveState(); return e;
}
export function updateEntity(id, data) {
    const i = state.entities.findIndex(e => e.id === id);
    if (i >= 0) { Object.assign(state.entities[i], data); saveState(); }
}
export function deleteEntity(id) {
    state.entities = state.entities.filter(e => e.id !== id);
    state.subsidiaries = state.subsidiaries.filter(s => s.entityId !== id);
    state.transactions = state.transactions.filter(t => t.entityId !== id);
    state.bankTransfers = state.bankTransfers.filter(b => b.entityId !== id);
    saveState();
}

// ── Subsidiary CRUD ──
export function addSubsidiary(data) {
    const s = { ...data, id: genId(), createdAt: new Date().toISOString() };
    state.subsidiaries.push(s); saveState(); return s;
}
export function updateSubsidiary(id, data) {
    const i = state.subsidiaries.findIndex(s => s.id === id);
    if (i >= 0) { Object.assign(state.subsidiaries[i], data); saveState(); }
}
export function deleteSubsidiary(id) {
    state.subsidiaries = state.subsidiaries.filter(s => s.id !== id); saveState();
}

// ── Transaction CRUD ──
export function addTransaction(data) {
    const t = { ...data, id: genId(), createdAt: new Date().toISOString() };
    state.transactions.push(t); saveState(); return t;
}
export function updateTransaction(id, data) {
    const i = state.transactions.findIndex(t => t.id === id);
    if (i >= 0) { Object.assign(state.transactions[i], data); saveState(); }
}
export function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id); saveState();
}

// ── BankTransfer CRUD ──
export function addBankTransfer(data) {
    const b = { ...data, id: genId(), createdAt: new Date().toISOString() };
    state.bankTransfers.push(b); saveState(); return b;
}
export function updateBankTransfer(id, data) {
    const i = state.bankTransfers.findIndex(b => b.id === id);
    if (i >= 0) { Object.assign(state.bankTransfers[i], data); saveState(); }
}
export function deleteBankTransfer(id) {
    state.bankTransfers = state.bankTransfers.filter(b => b.id !== id); saveState();
}

// ── Balance Calculations ──
export function getClientBalance(entityId) {
    const ent = state.entities.find(e => e.id === entityId);
    if (!ent) return 0;
    const opening = Number(ent.openingBalance) || 0;
    const deposits = state.bankTransfers
        .filter(b => b.entityId === entityId && b.type === 'deposit')
        .reduce((s, b) => s + Number(b.amount), 0);
    const invoices = state.transactions
        .filter(t => t.entityId === entityId && t.type === 'client')
        .reduce((s, t) => s + Number(t.total), 0);
    return opening + deposits - invoices;
}

export function getShippingBalance(entityId) {
    const ent = state.entities.find(e => e.id === entityId);
    if (!ent) return 0;
    const opening = Number(ent.openingBalance) || 0;
    const invoices = state.transactions
        .filter(t => t.entityId === entityId && t.type === 'shipping')
        .reduce((s, t) => s + Number(t.total), 0);
    const withdrawals = state.bankTransfers
        .filter(b => b.entityId === entityId && b.type === 'withdrawal')
        .reduce((s, b) => s + Number(b.amount), 0);
    return opening + invoices - withdrawals;
}

export function getEntityBalance(entityId) {
    const ent = state.entities.find(e => e.id === entityId);
    if (!ent) return 0;
    return ent.type === 'client' ? getClientBalance(entityId) : getShippingBalance(entityId);
}

// ── Import / Export ──
export function exportState() { return JSON.stringify(state, null, 2); }

export function importState(json) {
    try {
        const parsed = JSON.parse(json);
        state = { ...defaultState, ...parsed };
        saveState(); return true;
    } catch { return false; }
}

export function setLogo(base64) { state.companyLogo = base64; saveState(); }

// ── Per-Entity Sequential Invoice ID ──
export function getNextInvoiceIdForEntity(entityId) {
    const existing = state.transactions
        .filter(t => t.entityId === entityId)
        .map(t => parseInt(t.invoiceNumber))
        .filter(n => !isNaN(n));
    return existing.length ? Math.max(...existing) + 1 : 1;
}
