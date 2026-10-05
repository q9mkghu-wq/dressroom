import { send, body, isAdmin, fail } from './_lib/http.js';
import { setJSON, getJSON } from './_lib/redis.js';
import { C, getSettings, validPrices } from './_lib/catalog.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return send(res, 200, await getSettings());
    if (req.method !== 'PUT') return send(res, 405, { error: '허용되지 않는 요청이에요.' });
    if (!isAdmin(req)) return send(res, 401, { error: '관리자 비밀번호가 맞지 않아요.' });

    const b = body(req);
    const cur = (await getJSON('settings')) || {};
    if (b.prices !== undefined) {
      if (!validPrices(b.prices)) return send(res, 400, { error: '단가 형식이 올바르지 않아요.' });
      cur.prices = b.prices;
    }
    if (b.sets !== undefined) {
      if (!Array.isArray(b.sets) || b.sets.length < 1 || b.sets.length > 100 || !b.sets.every(C.validSet))
        return send(res, 400, { error: '세트 형식이 올바르지 않아요.' });
      const names = new Set(b.sets.map(s => s.k.trim()));
      if (names.size !== b.sets.length) return send(res, 400, { error: '세트 이름이 겹쳐요.' });
      cur.sets = b.sets.map(s => ({ g: s.g.trim(), k: s.k.trim(), ax: s.ax, ay: s.ay, items: s.items.map(m => ({ t: m.t, w: m.w, r: m.r, x: Math.round(m.x), y: Math.round(m.y) })) }));
    }
    if (b.shippingFee !== undefined) {
      if (!Number.isInteger(b.shippingFee) || b.shippingFee < 0 || b.shippingFee > 1000000) return send(res, 400, { error: '배송비 형식이 올바르지 않아요.' });
      cur.shippingFee = b.shippingFee;
    }
    cur.updatedAt = new Date().toISOString();
    await setJSON('settings', cur);
    return send(res, 200, await getSettings());
  } catch (e) { return fail(res, e); }
}
