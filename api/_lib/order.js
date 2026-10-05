import crypto from 'node:crypto';
import { C } from './catalog.js';

export const STATUS = { pending: '결제 대기', paid: '결제 완료', preparing: '배송 준비', shipping: '배송 중', done: '배송 완료', canceled: '주문 취소' };

export function newOrderId() {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // KST
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `DR${ymd}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const digits = v => String(v || '').replace(/\D/g, '');

// 고객이 보낸 장바구니를 검증하고, 금액은 반드시 서버 단가로 다시 계산합니다.
export function buildOrder(input, settings) {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length < 1 || lines.length > 20) throw new Error('장바구니 구성이 올바르지 않아요.');
  const outLines = lines.map(l => {
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error('수량이 올바르지 않아요.');
    if (!C.PILLAR[l.pillar] || !C.SHELF[l.shelf]) throw new Error('색상 선택이 올바르지 않아요.');
    const items = Array.isArray(l.items) ? l.items : [];
    if (items.length < 1 || items.length > 30) throw new Error('모듈 구성이 올바르지 않아요.');
    const outItems = items.map(it => {
      const w = Number(it.w), n = Number(it.n);
      if (!C.validItem(it.t, w)) throw new Error('판매하지 않는 모듈이 포함돼 있어요.');
      if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error('모듈 수량이 올바르지 않아요.');
      const unit = settings.prices[`${it.t}-${w}`];
      if (!Number.isInteger(unit)) throw new Error('가격이 정해지지 않은 모듈이 있어요.');
      return { t: it.t, w, n, unit, name: C.itemName(it.t, w) };
    });
    const unitTotal = outItems.reduce((s, it) => s + it.unit * it.n, 0);
    let layout = null;
    if (l.layout && JSON.stringify(l.layout).length <= 20000) layout = l.layout;
    return { name: str(l.name, 60) || '맞춤 구성', pillar: l.pillar, shelf: l.shelf, qty, items: outItems, unitTotal, total: unitTotal * qty, layout };
  });
  const subtotal = outLines.reduce((s, l) => s + l.total, 0);
  const shippingFee = settings.shippingFee || 0;
  const amount = subtotal + shippingFee;

  const c = input.customer || {}, s = input.shipping || {};
  const customer = { name: str(c.name, 30), phone: digits(c.phone).slice(0, 11), email: str(c.email, 100) };
  if (!customer.name) throw new Error('주문자 이름을 입력해 주세요.');
  if (customer.phone.length < 9) throw new Error('휴대폰 번호를 확인해 주세요.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error('이메일 형식을 확인해 주세요.');
  const shipping = { receiver: str(s.receiver, 30) || customer.name, phone: digits(s.phone).slice(0, 11) || customer.phone, zip: digits(s.zip).slice(0, 5), addr1: str(s.addr1, 200), addr2: str(s.addr2, 100), date: str(s.date, 10), memo: str(s.memo, 300) };
  if (!shipping.addr1) throw new Error('배송 주소를 입력해 주세요.');
  if (input.agree !== true) throw new Error('주문 내용 확인 및 개인정보 수집에 동의해 주세요.');

  const first = outLines[0].name;
  const orderName = (outLines.length > 1 ? `${first} 외 ${outLines.length - 1}건` : first).slice(0, 100);
  return { lines: outLines, subtotal, shippingFee, amount, customer, shipping, orderName };
}

// 고객 조회용: 결제 키 등 내부 정보 제외
export function publicOrder(o) {
  return {
    id: o.id, createdAt: o.createdAt, status: o.status, statusText: STATUS[o.status] || o.status,
    orderName: o.orderName, lines: o.lines.map(l => ({ name: l.name, pillar: l.pillar, shelf: l.shelf, qty: l.qty, items: l.items, total: l.total })),
    subtotal: o.subtotal, shippingFee: o.shippingFee, amount: o.amount,
    shipping: { receiver: o.shipping.receiver, addr1: o.shipping.addr1, addr2: o.shipping.addr2, date: o.shipping.date },
    payment: o.payment ? { method: o.payment.method, approvedAt: o.payment.approvedAt, receiptUrl: o.payment.receiptUrl } : null,
    tracking: o.tracking || null
  };
}
