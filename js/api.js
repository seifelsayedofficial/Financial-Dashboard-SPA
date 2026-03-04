import { getState, updateConfig } from './state.js';

let timer = null;

export async function fetchRate() {
    try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        const d = await r.json();
        if (d.result === 'success' && d.rates?.EGP) {
            const rate = d.rates.EGP;
            updateConfig({ exchangeRate: rate, lastRateUpdate: new Date().toISOString() });
            displayRate(rate);
            return rate;
        }
    } catch (e) { console.warn('Rate fetch failed', e); }
    return getState().config.exchangeRate;
}

export function displayRate(rate) {
    const el = document.getElementById('rate-value');
    if (el) el.textContent = Number(rate).toFixed(2);
}

export function startAutoRefresh() {
    fetchRate();
    timer = setInterval(fetchRate, 5 * 60 * 1000);
}

export function stopAutoRefresh() { if (timer) clearInterval(timer); }

export function getCurrentRate() { return getState().config.exchangeRate || 50; }
