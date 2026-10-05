import { send, body, fail, tossAuth } from './_lib/http.js';
import { getJSON, setJSON } from './_lib/redis.js';
import { publicOrder } from './_lib/order.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: '허용되지 않는 요청이에요.' });
  try {
    const { paymentKey, orderId, amount } = body(req);
    if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || !/^[A-Za-z0-9_=-]{6,64}$/.test(orderId))
      return send(res, 400, { error: '결제 정보가 올바르지 않아요.' });
    const order = await getJSON(`order:${orderId}`);
    if (!order) return send(res, 404, { error: '주문을 찾을 수 없어요.' });

    // 이미 승인된 주문(새로고침 등)은 그대로 성공 처리
    if (order.status !== 'pending') {
      if (order.payment && order.payment.paymentKey === paymentKey) return send(res, 200, { ok: true, order: publicOrder(order) });
      return send(res, 409, { error: '이미 처리된 주문이에요.' });
    }
    // 금액 위변조 방지: 서버에 저장된 금액과 비교
    if (Number(amount) !== order.amount) return send(res, 400, { error: '결제 금액이 주문 금액과 달라요. 다시 주문해 주세요.' });

    const r = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: tossAuth(), 'Content-Type': 'application/json', 'Idempotency-Key': `confirm-${orderId}` },
      body: JSON.stringify({ paymentKey, orderId, amount: order.amount })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      order.lastError = { code: j.code, message: j.message, at: new Date().toISOString() };
      await setJSON(`order:${orderId}`, order);
      return send(res, 400, { error: j.message || '결제 승인에 실패했어요.', code: j.code });
    }
    order.status = 'paid';
    order.payment = { paymentKey, method: j.method, approvedAt: j.approvedAt, totalAmount: j.totalAmount, receiptUrl: j.receipt && j.receipt.url };
    order.paidAt = new Date().toISOString();
    await setJSON(`order:${orderId}`, order);
    return send(res, 200, { ok: true, order: publicOrder(order) });
  } catch (e) { return fail(res, e); }
}
