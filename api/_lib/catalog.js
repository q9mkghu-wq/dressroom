import '../../js/catalog.js';
import { hasDb, getJSON } from './redis.js';

export const C = globalThis.DR_CATALOG;

export function validPrices(p) {
  if (!p || typeof p !== 'object') return false;
  return Object.entries(p).every(([k, v]) => {
    const [t, w] = k.split('-');
    return C.validItem(t, Number(w)) && Number.isInteger(v) && v >= 0 && v <= 100000000;
  });
}

// 저장된 설정 + 기본값
export async function getSettings() {
  let saved = null;
  if (hasDb()) saved = await getJSON('settings');
  const prices = { ...C.DEFAULT_PRICES, ...(saved && saved.prices ? saved.prices : {}) };
  const sets = saved && Array.isArray(saved.sets) && saved.sets.length ? saved.sets.filter(C.validSet) : null;
  const shippingFee = saved && Number.isInteger(saved.shippingFee) ? saved.shippingFee : 0;
  return { prices, sets, shippingFee };
}
