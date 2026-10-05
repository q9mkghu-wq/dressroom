import { send, body, fail } from './_lib/http.js';
import { cmd, setJSON, hasDb } from './_lib/redis.js';
import { getSettings } from './_lib/catalog.js';
import { buildOrder, newOrderId } from './_lib/order.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: '허용되지 않는 요청이에요.' });
  try {
    if (!hasDb()) return send(res, 503, { error: '주문 저장소가 아직 연결되지 않았어요. 관리자에게 문의해 주세요.', code: 'DB_NOT_CONFIGURED' });
    let built;
    try { built = buildOrder(body(req), await getSettings()); }
    catch (e) { return send(res, 400, { error: e.message }); }
    if (built.amount < 100) return send(res, 400, { error: '결제 금액이 올바르지 않아요.' });

    const id = newOrderId(), now = Date.now();
    const order = { id, createdAt: new Date(now).toISOString(), status: 'pending', ...built };
    await setJSON(`order:${id}`, order);
    await cmd('ZADD', 'orders', now, id);
    return send(res, 200, {
      orderId: id, amount: order.amount, orderName: order.orderName,
      customerName: order.customer.name, customerEmail: order.customer.email || undefined, customerMobilePhone: order.customer.phone
    });
  } catch (e) { return fail(res, e); }
}
