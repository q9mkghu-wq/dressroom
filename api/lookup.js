import { send, body, fail } from './_lib/http.js';
import { getJSON } from './_lib/redis.js';
import { publicOrder, digits } from './_lib/order.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: '허용되지 않는 요청이에요.' });
  try {
    const b = body(req), id = String(b.orderId || '').trim().toUpperCase(), phone = digits(b.phone);
    if (!/^[A-Z0-9_=-]{6,64}$/.test(id) || phone.length < 9) return send(res, 400, { error: '주문번호와 휴대폰 번호를 확인해 주세요.' });
    const o = await getJSON(`order:${id}`);
    if (!o || o.customer.phone !== phone) return send(res, 404, { error: '일치하는 주문이 없어요. 주문번호와 휴대폰 번호를 확인해 주세요.' });
    return send(res, 200, { order: publicOrder(o) });
  } catch (e) { return fail(res, e); }
}
