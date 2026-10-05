/* 세트를 3D로 보여주는 뷰어: mount()는 돌려 보는 화면, snapshot()은 정지 이미지 */
(function () {
  const C = window.DR_CATALOG;
  function build(items, opt = {}) {
    const T = window.THREE;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x8d8a82, 0.9));
    const sun = new T.DirectionalLight(0xffffff, 0.55); sun.position.set(3, 6, 5); scene.add(sun);
    const L = c => new T.MeshLambertMaterial({ color: c });
    const M = { frame: L(C.PILLAR[opt.pillar || 'black'].hex), shelf: L(C.SHELF[opt.shelf || 'oak'].hex), rod: L(0x9b9b9b), handle: L(0x6a6a6a), gap: L(0x55555a),
      mirror: new T.MeshPhongMaterial({ color: 0xc6d7e0, shininess: 120, specular: 0xffffff }) };
    const H = 2.0, D = C.DEPTH / 1000, P = 0.03, t = 0.02, RT = 0.018, BP = 0.08;
    const RUNG = [0.10, 0.62, 1.05, 1.92], RUNG5 = [0.10, 0.555, 1.01, 1.465, 1.92];
    const sY = (i, r = RUNG) => r[i] + RT / 2 + t / 2;
    const bx = (g, w, h, d, x, y, z, m) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
    const rodX = (g, len, y) => { const r = new T.Mesh(new T.CylinderGeometry(0.013, 0.013, len, 14), M.rod); r.rotation.z = Math.PI / 2; r.position.set(0, y, 0); g.add(r); };
    const rodAB = (g, a, b) => { const v = new T.Vector3().subVectors(b, a), r = new T.Mesh(new T.CylinderGeometry(0.013, 0.013, v.length(), 14), M.rod); r.position.copy(a).add(b).multiplyScalar(0.5); r.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); g.add(r); };
    function ladder(g, x0, z0, x1, z1, ix, iz, rungs = RUNG) {
      bx(g, P, H, P, x0, H / 2, z0, M.frame); bx(g, P, H, P, x1, H / 2, z1, M.frame);
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), o = P / 2 + 0.007;
      rungs.forEach(y => { const r = bx(g, 0.014, RT, len, (x0 + x1) / 2 + ix * o, y, (z0 + z1) / 2 + iz * o, M.frame); r.rotation.y = ang; });
    }
    const plate = (g, W, y, down) => bx(g, W - 2 * P - 0.004, BP, t, 0, down ? y - t / 2 - BP / 2 : y + t / 2 + BP / 2, -D / 2 + 0.01 + t / 2, M.shelf);
    function shelfR(g, W, i, r = RUNG) { const y = sY(i, r); bx(g, W - 2 * P, t, D - 0.02, 0, y, 0, M.shelf); plate(g, W, y, i === r.length - 1); }
    function base(W, r = RUNG) { const g = new T.Group(); [-1, 1].forEach(sx => ladder(g, sx * (W / 2 - P / 2), -D / 2 + P / 2, sx * (W / 2 - P / 2), D / 2 - P / 2, -sx, 0, r)); shelfR(g, W, 0, r); shelfR(g, W, r.length - 1, r); return g; }
    function chest(g, W) {
      const y0 = sY(0) + t / 2, h = 0.6; bx(g, W - 2 * P - 0.004, h, D - 0.04, 0, y0 + h / 2, 0, M.shelf);
      for (let i = 1; i < 3; i++) bx(g, W - 2 * P - 0.01, 0.006, 0.004, 0, y0 + h * i / 3, D / 2 - 0.018, M.gap);
      for (let i = 0; i < 3; i++) bx(g, 0.16, 0.012, 0.012, 0, y0 + h * (i + 0.5) / 3 + 0.07, D / 2 - 0.012, M.handle);
    }
    function corner() {
      const g = new T.Group(), Sz = C.CORNER / 1000, o = -Sz / 2, LW = 0.12, Se = Sz - P;
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(Se, 0); sh.lineTo(Se, D); sh.absarc(Sz, Sz, Sz - D, -Math.PI / 2, -Math.PI, true); sh.lineTo(0, Se); sh.lineTo(0, 0);
      const geo = new T.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
      [sY(0), sY(1), sY(3)].forEach((y, j) => {
        const m = new T.Mesh(geo, M.shelf); m.rotation.x = Math.PI / 2; m.position.set(o, y + t / 2, o); g.add(m);
        const py = j === 2 ? y - t / 2 - BP / 2 : y + t / 2 + BP / 2, run = Sz - P - LW;
        bx(g, run, BP, t, o + LW + run / 2, py, o + t / 2, M.shelf); bx(g, t, BP, run, o + t / 2, py, o + LW + run / 2, M.shelf);
      });
      ladder(g, o + Sz - P / 2, o + P / 2, o + Sz - P / 2, o + D - P / 2, -1, 0); ladder(g, o + P / 2, o + Sz - P / 2, o + D - P / 2, o + Sz - P / 2, 0, -1);
      const LH = sY(3) + t / 2; bx(g, LW, LH, t, o + LW / 2, LH / 2, o + t / 2, M.shelf); bx(g, t, LH, LW - t, o + t / 2, LH / 2, o + t + (LW - t) / 2, M.shelf);
      const ry = RUNG[3] - 0.08; rodAB(g, new T.Vector3(o + t, ry, o + D / 2), new T.Vector3(o + Sz - P, ry, o + D / 2));
      return g;
    }
    function module(m) {
      if (m.t === 'corner') return corner();
      const W = (m.w + C.EXTRA) / 1000, five = m.t === 'shelf5' || m.t === 'mirror', g = base(W, five ? RUNG5 : RUNG), inW = W - 2 * P, TR = RUNG[3] - 0.08;
      switch (m.t) {
        case 'hang2': rodX(g, inW, TR); shelfR(g, W, 2); rodX(g, inW, RUNG[2] - 0.07); break;
        case 'hang1': rodX(g, inW, TR); shelfR(g, W, 1); break;
        case 'hangShelf': rodX(g, inW, TR); shelfR(g, W, 2); shelfR(g, W, 1); break;
        case 'drawer3': rodX(g, inW, TR); chest(g, W); break;
        case 'shelf5': [1, 2, 3].forEach(i => shelfR(g, W, i, RUNG5)); break;
        case 'mirror': { [1, 2, 3].forEach(i => shelfR(g, W, i, RUNG5)); const mw = W * 0.4, mx = -W / 2 + P + mw / 2 + 0.01; bx(g, mw, H - 0.16, 0.02, mx, H / 2, D / 2 + 0.012, M.frame); bx(g, mw - 0.03, H - 0.2, 0.005, mx, H / 2, D / 2 + 0.024, M.mirror); break; }
      }
      return g;
    }
    // 세트 배치(평면 mm 좌표) → 3D 배치
    const root = new T.Group(); scene.add(root);
    items.forEach(m => {
      const w = m.t === 'corner' ? C.CORNER : m.w + C.EXTRA, f = m.t === 'corner' ? { w, h: w } : (m.r % 180 === 0 ? { w, h: C.DEPTH } : { w: C.DEPTH, h: w });
      const g = module(m); g.position.set((m.x + f.w / 2) / 1000, 0, (m.y + f.h / 2) / 1000); g.rotation.y = -m.r * Math.PI / 180; root.add(g);
    });
    const box = new T.Box3().setFromObject(root), ctr = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
    root.position.set(-ctr.x, 0, -ctr.z);
    if (opt.floor !== false) {
      const floor = new T.Mesh(new T.CircleGeometry(Math.max(size.x, size.z) * 0.85 + 0.6, 48), new T.MeshLambertMaterial({ color: 0xE4E1DA }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; scene.add(floor);
    }
    const radius = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z) / 2;
    const dispose = () => scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return { scene, M, size, radius, target: new T.Vector3(0, size.y / 2, 0), dispose };
  }
  // 화면에 꽉 차도록 카메라 거리 계산
  function fit(cam, built, th, ph, margin = 1.08) {
    const v = cam.fov * Math.PI / 360, h = Math.atan(Math.tan(v) * cam.aspect), sz = built.size;
    const ct = Math.abs(Math.cos(th)), st = Math.abs(Math.sin(th));
    const across = sz.x * ct + sz.z * st, deep = sz.x * st + sz.z * ct;
    const tall = sz.y * Math.cos(ph) + deep * Math.sin(ph);
    const r = Math.max(tall / 2 / Math.tan(v), across / 2 / Math.tan(h)) * margin + deep / 2, t = built.target;
    cam.position.set(t.x + r * Math.sin(th) * Math.cos(ph), t.y + r * Math.sin(ph), t.z + r * Math.cos(th) * Math.cos(ph));
    cam.lookAt(t);
    return r;
  }

  function mount(el, items, opt = {}) {
    if (!window.THREE || !items || !items.length) return null;
    const T = window.THREE;
    let R;
    try { R = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    el.innerHTML = ''; el.appendChild(R.domElement);
    const built = build(items, opt), cam = new T.PerspectiveCamera(32, 1, 0.05, 100);
    let th = opt.angle ?? -0.45, ph = 0.18, drag = null, idle = true, lastMove = 0;
    const cv = R.domElement;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; idle = false; });
    cv.addEventListener('pointermove', e => { if (!drag) return; th -= (e.clientX - drag.x) * 0.008; ph = Math.min(1.2, Math.max(0.02, ph + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY }; });
    const up = () => { drag = null; cv.style.cursor = 'grab'; lastMove = performance.now(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    new ResizeObserver(resize).observe(el); resize();
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(el);
    (function loop() { requestAnimationFrame(loop); if (!visible) return; if (!drag && !reduce && (idle || performance.now() - lastMove > 2500)) th += 0.0025; fit(cam, built, th, ph, 1.12); R.render(built.scene, cam); })();
    return { setColors(pillar, shelf) { built.M.frame.color.set(C.PILLAR[pillar].hex); built.M.shelf.color.set(C.SHELF[shelf].hex); } };
  }

  // 정지 이미지: 렌더러 하나를 돌려 쓰며 PNG 주소를 만듭니다
  let shared = null;
  function snapshot(items, opt = {}) {
    if (!window.THREE || !items || !items.length) return null;
    const T = window.THREE;
    if (!shared) {
      try { shared = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
      shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    const w = opt.width || 560, h = opt.height || 340;
    shared.setSize(w, h, false);
    const built = build(items, { ...opt, floor: false }), cam = new T.PerspectiveCamera(30, w / h, 0.05, 100);
    fit(cam, built, opt.angle ?? -0.5, opt.pitch ?? 0.2, 1.06);
    shared.setClearColor(0x000000, 0);
    shared.render(built.scene, cam);
    const url = shared.domElement.toDataURL('image/png');
    built.dispose();
    return url;
  }
  window.DRModel3D = { mount, snapshot };
})();
