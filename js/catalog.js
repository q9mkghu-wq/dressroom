/* 상품 카탈로그: 브라우저와 서버(api)가 함께 쓰는 단일 원본입니다.
   모듈 종류, 판매 폭, 기본 단가, 색상, 기본 세트를 바꾸려면 이 파일만 고치세요. */
(function (root) {
  const DEPTH = 400, EXTRA = 6, CORNER = 600;
  const PILLAR = { black: { name: '블랙', hex: '#2B2C2F' }, white: { name: '화이트', hex: '#EFEFEC' } };
  const SHELF = {
    oak: { name: '라이트오크', hex: '#D5B68C' }, white: { name: '화이트', hex: '#F2F0EB' },
    beige: { name: '웜베이지', hex: '#E4D3BC' }, pink: { name: '베이비핑크', hex: '#F1D2D4' }
  };
  const TYPES = {
    hang2: { name: '2단행거장', widths: [800, 1000, 1200], desc: '위·아래 행거봉 + 중간 선반' },
    hang1: { name: '1단행거장', widths: [800, 1000, 1200], desc: '긴 옷 행거봉 + 하부 선반' },
    hangShelf: { name: '행거선반장', widths: [800], desc: '행거봉 + 선반 2칸' },
    drawer3: { name: '3단서랍장', widths: [800], desc: '서랍 3단 + 상부 행거봉' },
    shelf5: { name: '5단선반장', widths: [400, 800], desc: '오픈 선반 5단' },
    mirror: { name: '선반거울장', widths: [800], desc: '전신거울 + 선반' },
    corner: { name: '코너장', widths: [0], desc: '벽 모서리용 L자 선반' }
  };
  const DEFAULT_PRICES = {
    'hang1-800': 84500, 'hang1-1000': 98500, 'hang1-1200': 112500,
    'hang2-800': 91600, 'hang2-1000': 106900, 'hang2-1200': 122300,
    'hangShelf-800': 108000, 'drawer3-800': 153300, 'shelf5-800': 113300, 'shelf5-400': 88700,
    'mirror-800': 149900, 'corner-0': 128400
  };
  const OLD_SETS = [
    { g: '160cm', k: 'A', top: [['hang1', 800], ['hang2', 800]] },
    { g: '160cm', k: 'B', top: [['drawer3', 800], ['hang2', 800]] },
    { g: '160cm', k: 'C', top: [['drawer3', 800], ['hang1', 800]] },
    { g: '160cm', k: 'D', top: [['hang2', 800], ['mirror', 800]] },
    { g: '200cm', k: 'E', top: [['hang2', 1200], ['hang1', 800]] },
    { g: '200cm', k: 'F', top: [['hang2', 1200], ['drawer3', 800]] },
    { g: '200cm', k: 'G', top: [['hang2', 1200], ['mirror', 800]] },
    { g: '200cm', k: 'H', top: [['hang2', 1200], ['hang2', 800]] },
    { g: '224cm', k: 'I', top: [['corner', 0], ['hang1', 800], ['hang2', 800]] },
    { g: '224cm', k: 'J', top: [['corner', 0], ['drawer3', 800], ['hang2', 800]] },
    { g: '224cm', k: 'K', top: [['mirror', 800], ['hang2', 800], ['corner', 0]] },
    { g: '224cm', k: 'L', top: [['hang2', 800], ['hang2', 800], ['corner', 0]] },
    { g: '240cm', k: 'M', top: [['hang1', 800], ['hang2', 800], ['drawer3', 800]] },
    { g: '240cm', k: 'N', top: [['mirror', 800], ['hang2', 800], ['hang1', 800]] },
    { g: '240cm', k: 'O', top: [['shelf5', 800], ['drawer3', 800], ['hang1', 800]] },
    { g: '240cm', k: 'P', top: [['hang2', 1200], ['hang1', 1200]] },
    { g: '320cm', k: 'Q', top: [['shelf5', 800], ['drawer3', 800], ['hang1', 800], ['hang2', 800]] },
    { g: '320cm', k: 'R', top: [['hang1', 800], ['drawer3', 800], ['mirror', 800], ['hang2', 800]] },
    { g: '코너 L자', k: 'coner 01', top: [['corner', 0], ['hang1', 800], ['hang2', 800]], left: [['hang2', 1200]] },
    { g: '코너 L자', k: 'coner 02', top: [['corner', 0], ['hang1', 800], ['hang2', 800]], left: [['mirror', 800]] },
    { g: '코너 L자', k: 'coner 03', top: [['corner', 0], ['drawer3', 800], ['hang2', 800]], left: [['hang1', 1200]] },
    { g: '코너 L자', k: 'coner 04', top: [['corner', 0], ['hang1', 800], ['mirror', 800]], left: [['hang2', 800]] }
  ];
  const modLen = ([t, w]) => (t === 'corner' ? CORNER : w + EXTRA);
  function convertOld(o) {
    const items = [], tl = o.top.reduce((a, m) => a + modLen(m), 0), ce = o.top[o.top.length - 1][0] === 'corner';
    let x = ce ? -tl : 0;
    o.top.forEach(([t, w], i) => { items.push({ t, w, r: t === 'corner' ? (i === 0 ? 0 : 90) : 0, x, y: 0 }); x += modLen([t, w]); });
    if (o.left) { let y = CORNER; o.left.forEach(([t, w]) => { items.push({ t, w, r: 270, x: 0, y }); y += modLen([t, w]); }); }
    return { g: o.g, k: /^[A-Z]$/.test(o.k) ? 'SET ' + o.k : o.k, ax: ce ? 'r' : 'l', ay: 't', items };
  }
  const DEFAULT_SETS = OLD_SETS.map(convertOld);
  const validItem = (t, w) => !!TYPES[t] && (t === 'corner' ? w === 0 : TYPES[t].widths.includes(w));
  function validSet(st) {
    return !!st && typeof st.k === 'string' && st.k.trim().length > 0 && st.k.length <= 40 &&
      typeof st.g === 'string' && st.g.trim().length > 0 && st.g.length <= 30 &&
      (st.ax === 'l' || st.ax === 'r') && (st.ay === 't' || st.ay === 'b') &&
      Array.isArray(st.items) && st.items.length > 0 && st.items.length <= 40 &&
      st.items.every(m => m && validItem(m.t, m.w) && [0, 90, 180, 270].includes(m.r) && Number.isFinite(m.x) && Number.isFinite(m.y));
  }
  const itemName = (t, w) => (t === 'corner' ? '코너장' : `${w} ${TYPES[t].name}`);
  root.DR_CATALOG = { DEPTH, EXTRA, CORNER, PILLAR, SHELF, TYPES, DEFAULT_PRICES, DEFAULT_SETS, validItem, validSet, itemName };
})(typeof window !== 'undefined' ? window : globalThis);
