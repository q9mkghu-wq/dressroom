import { send, body, isAdmin, fail, tossAuth } from '../_lib/http.js';
import { cmd, getJSON, setJSON } from '../_lib/redis.js';
import { STATUS } from '../_lib/order.js';

export default async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: '관리자 비밀번호가 맞지 않아요.' });
  try {
    if (req.method === 'GET') {
      const page = Math.max(0, parseInt(req.query.page || '0', 10) || 0), size = 30;
      const total = await cmd('ZCARD', 'orders');
      const ids = await cmd('ZRANGE', 'orders', page * size, page * size + size - 1, 'REV');
      let orders = [];
      if (ids && ids.length) {
        const vals = await cmd('MGET', ...ids.map(id => `order:${id}`));
        orders = vals.filter(Boolean).map(v => JSON.parse(v));
      }
      return send(res, 200, { orders, total, page, size, statuses: STATUS });
    }
    if (req.method !== 'PATCH') return send(res, 405, { error: '허용되지 않는 요청이에요.' });

    const b = body(req);
    const o = await getJSON(`order:${String(b.orderId || '')}`);
    if (!o) return send(res, 404, { error: '주문을 찾을 수 없어요.' });

    if (b.action === 'cancel') {
      if (o.status === 'canceled') return send(res, 400, { error: '이미 취소된 주문이에요.' });
      if (o.payment && o.payment.paymentKey) {
        const r = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(o.payment.paymentKey)}/cancel`, {
          method: 'POST',
          headers: { Authorization: tossAuth(), 'Content-Type': 'application/json', 'Idempotency-Key': `cancel-${o.id}` },
          body: JSON.stringify({ cancelReason: String(b.reason || '판매자 취소').slice(0, 200) })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return send(res, 400, { error: j.message || '결제 취소에 실패했어요.', code: j.code });
        o.cancel = { at: new Date().toISOString(), reason: b.reason || '', refunded: true };
      } else {
        o.cancel = { at: new Date().toISOString(), reason: b.reason || '', refunded: false };
      }
      o.status = 'canceled';
    } else {
      if (b.status !== undefined) {
        if (!STATUS[b.status] || b.status === 'canceled' || b.status === 'pending') return send(res, 400, { error: '변경할 수 없는 상태예요.' });
        if (o.status === 'pending' || o.status === 'canceled') return send(res, 400, { error: '결제가 끝난 주문만 상태를 바꿀 수 있어요.' });
        o.status = b.status;
      }
      if (b.tracking !== undefined) o.tracking = String(b.tracking).slice(0, 100);
      if (b.adminMemo !== undefined) o.adminMemo = String(b.adminMemo).slice(0, 1000);
    }
    o.updatedAt = new Date().toISOString();
    await setJSON(`order:${o.id}`, o);
    return send(res, 200, { order: o });
  } catch (e) { return fail(res, e); }
}
