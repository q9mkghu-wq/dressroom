/* 쇼핑몰 공통 스크립트: 설정 불러오기, 장바구니, 금액 계산, 정면도 그림, 머리글/바닥글 */
(function () {
  const C = window.DR_CATALOG, SHOP = window.SHOP || {};
  const CART_KEY = 'dr-cart-v1';
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  const cm = mm => (Math.round(mm) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let settings = null;
  async function loadSettings() {
    if (settings) return settings;
    let s = null;
    try { const r = await fetch('/api/settings'); if (r.ok) s = await r.json(); } catch (e) { /* 오프라인/로컬 미리보기 */ }
    s = s || {};
    settings = {
      prices: { ...C.DEFAULT_PRICES, ...(s.prices || {}) },
      sets: Array.isArray(s.sets) && s.sets.length ? s.sets.filter(C.validSet) : C.DEFAULT_SETS,
      shippingFee: Number.isInteger(s.shippingFee) ? s.shippingFee : 0
    };
    return settings;
  }
  const price = (t, w) => (settings ? settings.prices : C.DEFAULT_PRICES)[`${t}-${w}`];

  // 장바구니 한 줄 = 하나의 구성(색상 + 모듈 목록 + 배치)
  const cart = {
    get() { try { const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } },
    save(lines) { try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch (e) {} updateCount(); },
    add(line) { const l = cart.get(); l.push({ ...line, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), qty: line.qty || 1 }); cart.save(l); },
    remove(id) { cart.save(cart.get().filter(l => l.id !== id)); },
    setQty(id, q) { cart.save(cart.get().map(l => (l.id === id ? { ...l, qty: Math.max(1, Math.min(20, q)) } : l))); },
    clear() { cart.save([]); },
    count() { return cart.get().reduce((s, l) => s + (l.qty || 1), 0); }
  };
  const lineUnit = l => l.items.reduce((s, it) => s + (price(it.t, it.w) || 0) * it.n, 0);
  function totals(lines) {
    const subtotal = lines.reduce((s, l) => s + lineUnit(l) * (l.qty || 1), 0);
    const shippingFee = lines.length ? (settings ? settings.shippingFee : 0) : 0;
    return { subtotal, shippingFee, total: subtotal + shippingFee };
  }
  // 배치(아이템 목록)를 모듈 수량으로 묶기
  function countItems(list) {
    const m = new Map();
    list.forEach(it => { const k = `${it.t}-${it.w}`; m.set(k, (m.get(k) || 0) + 1); });
    return [...m].map(([k, n]) => { const [t, w] = k.split('-'); return { t, w: Number(w), n }; });
  }
  function setToLine(st, pillar = 'black', shelf = 'oak') {
    return { name: st.k, pillar, shelf, items: countItems(st.items), layout: { set: st.k, items: st.items, ax: st.ax, ay: st.ay } };
  }
  const setTotal = st => countItems(st.items).reduce((s, it) => s + (price(it.t, it.w) || 0) * it.n, 0);
  function setSizeText(st) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    st.items.forEach(m => { const w = m.t === 'corner' ? C.CORNER : m.w + C.EXTRA, f = m.t === 'corner' ? { w, h: w } : (m.r % 180 === 0 ? { w, h: C.DEPTH } : { w: C.DEPTH, h: w }); x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x + f.w); y1 = Math.max(y1, m.y + f.h); });
    return y1 - y0 > C.DEPTH + 1 ? `${cm(x1 - x0)} × ${cm(y1 - y0)}cm` : `${cm(x1 - x0)}cm`;
  }

  // 정면도(앞에서 본 그림) SVG: 뒷벽(첫 줄) 모듈을 왼쪽부터 그립니다
  const RUNG = [100, 620, 1050, 1920], RUNG5 = [100, 620, 1050, 1485, 1920];
  const SHELVES = { hang2: [0, 2, 3], hang1: [0, 1, 3], hangShelf: [0, 1, 2, 3], drawer3: [0, 3], shelf5: [0, 1, 2, 3, 4], mirror: [0, 1, 2, 3, 4], corner: [0, 1, 3] };
  function elevation(items, pillar = 'black', shelf = 'oak', opts = {}) {
    if (!items || !items.length) return '';
    const minY = Math.min(...items.map(m => m.y));
    const row = items.filter(m => m.y === minY && (m.t === 'corner' || m.r % 180 === 0)).sort((a, b) => a.x - b.x);
    const extra = items.length - row.length;
    const ph = C.PILLAR[pillar].hex, sh = C.SHELF[shelf].hex, edge = pillar === 'white' ? '#9A9C98' : '#2B2C2F';
    const H = 2000, P = 34; let x = 0, g = '';
    row.forEach(m => {
      const w = m.t === 'corner' ? C.CORNER : m.w + C.EXTRA, rungs = (m.t === 'shelf5' || m.t === 'mirror') ? RUNG5 : RUNG;
      (SHELVES[m.t] || [0, 3]).forEach(i => { const y = H - rungs[i] - 22; g += `<rect x="${x + P}" y="${y}" width="${w - 2 * P}" height="22" fill="${sh}" stroke="${edge}" stroke-width="3"/>`; });
      if (['hang2', 'hang1', 'hangShelf', 'drawer3', 'corner'].includes(m.t)) g += `<line x1="${x + P}" y1="${H - 1840}" x2="${x + w - P}" y2="${H - 1840}" stroke="#8C8E8A" stroke-width="14"/>`;
      if (m.t === 'hang2') g += `<line x1="${x + P}" y1="${H - 980}" x2="${x + w - P}" y2="${H - 980}" stroke="#8C8E8A" stroke-width="14"/>`;
      if (m.t === 'drawer3') for (let i = 0; i < 3; i++) { const y = H - 122 - 200 * (i + 1); g += `<rect x="${x + P + 6}" y="${y}" width="${w - 2 * P - 12}" height="196" fill="${sh}" stroke="${edge}" stroke-width="3"/><rect x="${x + w / 2 - 70}" y="${y + 40}" width="140" height="12" fill="${edge}"/>`; }
      if (m.t === 'mirror') g += `<rect x="${x + P + 10}" y="${H - 1900}" width="${(w - 2 * P) * 0.42}" height="1780" fill="#CFDDE5" stroke="${edge}" stroke-width="6"/>`;
      if (m.t === 'corner') g += `<rect x="${x + P}" y="${H - 1940}" width="70" height="1940" fill="${sh}" opacity=".7"/>`;
      g += `<rect x="${x}" y="0" width="${P}" height="${H}" fill="${ph}" stroke="${edge}" stroke-width="3"/><rect x="${x + w - P}" y="0" width="${P}" height="${H}" fill="${ph}" stroke="${edge}" stroke-width="3"/>`;
      x += w;
    });
    const label = opts.label || '모듈 정면도';
    return `<svg viewBox="-20 -20 ${x + 40} ${H + 40}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMax meet">${g}</svg>` + (extra > 0 ? `<span class="elev-more">+ 옆벽 ${extra}개</span>` : '');
  }

  function updateCount() { document.querySelectorAll('[data-cart-count]').forEach(el => { const n = cart.count(); el.textContent = n; el.hidden = n === 0; }); }
  function header(active) {
    const nav = [['index', '/', '홈'], ['sets', '/#sets', '추천 세트'], ['planner', '/planner', '배치 플래너'], ['order', '/order', '주문 조회']];
    return `<header class="site-h"><a class="brand" href="/">${esc(SHOP.name || '드레스룸')}</a>
      <nav aria-label="주요 메뉴">${nav.map(([k, h, t]) => `<a href="${h}"${k === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}
      <a class="cart-link" href="/cart"${active === 'cart' ? ' aria-current="page"' : ''}>장바구니 <b data-cart-count hidden>0</b></a></nav></header>`;
  }
  function footer() {
    const v = x => (x ? esc(x) : '<em>입력 필요</em>');
    return `<footer class="site-f"><div class="f-in">
      <div><b>${esc(SHOP.name || '')}</b><p>고객센터 ${v(SHOP.phone)} · ${esc(SHOP.hours || '')}${SHOP.kakaoChannelUrl ? ` · <a href="${esc(SHOP.kakaoChannelUrl)}" target="_blank" rel="noopener">카카오톡 상담</a>` : ''}</p></div>
      <p class="biz">상호 ${v(SHOP.company)} | 대표 ${v(SHOP.ceo)} | 사업자등록번호 ${v(SHOP.bizNo)} | 통신판매업 신고 ${v(SHOP.mailOrderNo)}<br>주소 ${v(SHOP.address)} | 이메일 ${v(SHOP.email)} | 개인정보 보호책임자 ${v(SHOP.privacyOfficer)}</p>
      <p class="links"><a href="/policy#terms">이용약관</a><a href="/policy#privacy"><b>개인정보처리방침</b></a><a href="/policy#refund">교환·환불 안내</a></p>
    </div></footer>`;
  }
  function mount(active) {
    const h = document.getElementById('site-header'), f = document.getElementById('site-footer');
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();
    updateCount();
    window.addEventListener('storage', e => { if (e.key === CART_KEY) updateCount(); });
  }
  let tt; function toast(msg) { let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2800); }

  // 배치 공유 링크 (planner?layout=...)
  const encodeLayout = obj => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function decodeLayout(s) { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }

  window.Shop = { C, SHOP, won, cm, esc, loadSettings, price, cart, lineUnit, totals, countItems, setToLine, setTotal, setSizeText, elevation, mount, updateCount, toast, encodeLayout, decodeLayout, get settings() { return settings; } };
})();
