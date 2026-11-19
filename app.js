/* Cosmetics demo store — all state lives in the visitor's browser (localStorage). No real orders are placed. */
(function () {
  'use strict';
  var S = window.STORE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return Math.round(n).toLocaleString('en-US') + ' ج.م.'; };
  var PAGE = document.body.dataset.page;
  var params = new URLSearchParams(location.search);

  /* ---------- storage ---------- */
  var mem = {};
  var db = {
    get: function (k, d) { try { var v = localStorage.getItem('cos_' + k); return v ? JSON.parse(v) : (k in mem ? mem[k] : d); } catch (e) { return k in mem ? mem[k] : d; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem('cos_' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var cart = function () { return db.get('cart', []).filter(function (l) { return item(l.id); }); };
  var wish = function () { return db.get('wish', []); };

  /* ---------- catalog ---------- */
  function P(id) { return S.products.find(function (p) { return p.id === id; }); }
  function item(id) {
    var p = P(id); if (p) return p;
    var b = S.bundles.find(function (x) { return x.id === id; }); if (!b) return null;
    var was = b.items.reduce(function (s, i) { return s + P(i).sizes[0][1]; }, 0);
    return Object.assign({}, b, { isBundle: true, was: was, sizes: [['مجموعة', Math.round(was * 0.8)]] });
  }
  var priceOf = function (id, si) { var it = item(id); return it.sizes[si || 0][1]; };
  var url = function (it) { return it.isBundle ? 'bundles.html#' + it.id : 'product.html?id=' + it.id; };
  function reviewsOf(id) {
    var idx = S.products.findIndex(function (p) { return p.id === id; });
    var seeds = [0, 1, 2].map(function (j) { return Object.assign({ sample: true }, S.reviews[(idx * 2 + j) % S.reviews.length]); });
    return (db.get('reviews', {})[id] || []).concat(seeds);
  }
  function avg(id) { var r = reviewsOf(id); return r.reduce(function (s, x) { return s + x.r; }, 0) / r.length; }

  /* ---------- icons ---------- */
  function svg(d, size, fill) {
    var a = fill ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    return '<svg aria-hidden="true" width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" ' + a + '>' + d + '</svg>';
  }
  var I = {
    truck: svg('<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>'),
    cart: svg('<path d="M3 4h2.5l2.2 11h10.5l2-8H7"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z"/>'.replace('.600', '.6')),
    leaf: svg('<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 14"/><path d="M5 19c3-5 6-8 10-10"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    flask: svg('<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.400a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>'.replace('.400', '.4')),
    drop: svg('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'),
    tag: svg('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>', 16),
    trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', 18),
    play: svg('<path d="M8 5l11 7-11 7z"/>', 22, true),
    star: svg('<path d="M12 3l2.7 5.7 6.3.8-4.6 4.3 1.2 6.200L12 17l-5.600 3 1.2-6.200L3 9.500l6.300-.8z"/>'.replace(/\.(\d)00/g, '.$1'), 18, true),
    prev: svg('<path d="M9 6l6 6-6 6"/>'),
    next: svg('<path d="M15 6l-6 6 6 6"/>')
  };
  function stars(n) {
    var h = '<span class="stars" role="img" aria-label="' + (Math.round(n * 10) / 10) + ' من 5">';
    for (var i = 1; i <= 5; i++) h += '<span class="' + (i <= Math.round(n) ? '' : 'off') + '">' + I.star + '</span>';
    return h + '</span>';
  }

  /* ---------- product illustrations ---------- */
  function pack(p, cls) {
    var k = p.pack, ink = '#2F4A3C', b = k.body || '#FBFAF6', c = k.cap, sh = '', ly = 140;
    var en = p.en.split('|');
    if (k.shape === 'bottle') { sh = '<rect x="83" y="16" width="34" height="38" rx="5" fill="' + c + '"/><rect x="58" y="52" width="84" height="172" rx="22" fill="' + b + '" stroke="#BFCBBE"/>'; ly = 132; }
    else if (k.shape === 'pump') { sh = '<path d="M68 22h36a6 6 0 0 1 6 6v6H68z" fill="' + c + '"/><rect x="94" y="32" width="12" height="26" fill="' + c + '"/><rect x="82" y="56" width="36" height="18" rx="4" fill="' + c + '"/><rect x="60" y="72" width="80" height="152" rx="14" fill="' + b + '" stroke="#BFCBBE"/>'; ly = 142; }
    else if (k.shape === 'tube') { sh = '<path d="M66 34a16 16 0 0 1 16-16h36a16 16 0 0 1 16 16v158H66z" fill="' + b + '" stroke="#BFCBBE"/><rect x="76" y="192" width="48" height="32" rx="6" fill="' + c + '"/>'; ly = 100; }
    else if (k.shape === 'jar') { sh = '<rect x="46" y="96" width="108" height="32" rx="8" fill="' + c + '"/><rect x="40" y="126" width="120" height="98" rx="16" fill="' + b + '" stroke="#BFCBBE"/>'; ly = 168; }
    else { sh = '<rect x="88" y="10" width="24" height="44" rx="12" fill="' + c + '"/><rect x="80" y="52" width="40" height="18" rx="3" fill="' + c + '"/><rect x="60" y="68" width="80" height="156" rx="16" fill="' + b + '" stroke="rgba(31,42,36,.18)"/><rect x="66" y="112" width="68" height="72" rx="5" fill="#FBFAF6"/>'; ly = 140; }
    var t = function (y, s) { return '<text x="100" y="' + y + '" text-anchor="middle" font-family="system-ui,sans-serif" font-size="6.6" letter-spacing=".7" fill="' + ink + '" opacity=".85">' + esc(s || '') + '</text>'; };
    return '<svg class="pack ' + (cls || '') + '" viewBox="0 0 200 240" direction="ltr" style="direction:ltr" role="img" aria-label="' + esc(p.name) + '"><ellipse cx="100" cy="229" rx="60" ry="6" fill="#1F2A24" opacity=".1"/>' + sh +
      '<text x="100" y="' + ly + '" text-anchor="middle" font-family="\'El Messiri\',serif" font-weight="700" font-size="15" fill="' + ink + '">Cosmetics</text>' + t(ly + 16, en[0]) + t(ly + 27, en[1]) + '</svg>';
  }
  function texture(p, cls) {
    return '<svg class="pack tex ' + (cls || '') + '" viewBox="0 0 200 240" role="img" aria-label="قوام المنتج"><path d="M40 130c-6-40 30-78 72-70 40 8 60 42 46 80-12 34-52 50-86 36-18-8-28-24-32-46z" fill="' + p.pack.tint + '" stroke="#BFCBBE"/><path d="M70 120c10-20 34-28 54-18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/></svg>';
  }
  function vis(it, cls) {
    if (it.isBundle) return '<div class="bvis">' + it.items.map(function (i) { return pack(P(i), cls || 'sm'); }).join('') + '</div>';
    return pack(it, cls);
  }

  /* ---------- shared pieces ---------- */
  function card(it) {
    var w = wish().indexOf(it.id) > -1;
    var tags = (it.tags || []).indexOf('new') > -1 ? '<span class="tag">جديد</span>' : '';
    var meta = it.isBundle ? '<span class="save">وفّري 20%</span>' : '<span class="step">' + (it.step ? 'الخطوة ' + it.step + ' · ' + S.steps[it.step] : S.cats[it.cat]) + '</span>';
    var rate = it.isBundle ? '' : '<div class="rating">' + stars(avg(it.id)) + '<span>(' + reviewsOf(it.id).length + ')</span></div>';
    var price = money(it.sizes[0][1]) + (it.isBundle ? '<s>' + it.was.toLocaleString('en-US') + '</s>' : '');
    return '<article class="card pcard" id="' + it.id + '"><a class="tile" href="' + url(it) + '" aria-label="' + esc(it.name) + '">' + tags + vis(it) + '</a>' +
      '<button class="wish' + (w ? ' on' : '') + '" type="button" data-act="wish" data-id="' + it.id + '" aria-pressed="' + w + '" aria-label="أضيفي إلى المفضلة">' + I.heart + '</button>' +
      meta + '<h3><a href="' + url(it) + '">' + esc(it.name) + '</a></h3>' + rate + '<p class="desc">' + esc(it.short) + '</p>' +
      '<div class="row"><span class="price">' + price + '</span><button class="btn btn-primary" type="button" data-act="add" data-id="' + it.id + '">أضيفي إلى السلة</button></div></article>';
  }
  var grid = function (list, n) { return '<div class="grid g' + (n || 4) + '">' + list.map(card).join('') + '</div>'; };
  function head(title, sub) { return '<div class="page-head"><div class="wrap"><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div></div>'; }
  function empty(icon, title, text, cta) { return '<div class="empty"><span class="ico">' + icon + '</span><h2>' + title + '</h2><p>' + text + '</p>' + (cta ? '<a class="btn btn-accent" href="' + cta[1] + '">' + cta[0] + '</a>' : '') + '</div>'; }

  var NAV = [['index.html', 'الرئيسية', 'home'], ['shop.html', 'المتجر', 'shop'], ['bundles.html', 'المجموعات', 'bundles'], ['routine.html', 'الروتين', 'routine'], ['about.html', 'من نحن', 'about'], ['membership.html', 'العضوية والنقاط', 'membership'], ['orders.html', 'طلباتي', 'orders']];
  function navLinks() { return NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[2] === PAGE ? ' class="on" aria-current="page"' : '') + '>' + n[1] + '</a>'; }).join(''); }
  function header() {
    return '<div class="demo-flag">متجر تجريبي للعرض — لا تُنفَّذ طلبات حقيقية</div>' +
      '<div class="announce">' + I.truck + '<span>توصيل مجاني للطلبات فوق ' + money(S.freeShip) + '</span></div>' +
      '<header class="header"><div class="wrap">' +
      '<button class="icon-btn menu-btn" type="button" data-act="menu" aria-label="القائمة">' + I.menu + '</button>' +
      '<a class="logo" href="index.html" dir="ltr" aria-label="Cosmetics — الرئيسية">Cosmetics<span>.</span></a>' +
      '<nav class="nav" aria-label="القائمة الرئيسية">' + navLinks() + '</nav>' +
      '<div class="tools"><button class="icon-btn lang" type="button" data-act="lang" aria-label="English">EN</button>' +
      '<button class="icon-btn" type="button" data-act="search" aria-label="بحث">' + I.search + '</button>' +
      '<a class="icon-btn" href="account.html" aria-label="حسابي">' + I.user + '</a>' +
      '<button class="icon-btn" type="button" data-act="cart" aria-label="السلة">' + I.cart + '<span class="count" id="cartCount"></span></button></div>' +
      '</div></header>' +
      '<div class="scrim" data-act="close"></div>' +
      '<aside class="drawer" id="cartDrawer" aria-label="سلة التسوق"></aside>' +
      '<aside class="drawer side-menu" id="menuDrawer" aria-label="القائمة"><div class="drawer-head"><h2>القائمة</h2><button class="icon-btn" type="button" data-act="close" aria-label="إغلاق">' + I.x + '</button></div><div class="drawer-body">' + navLinks() + '<a href="account.html">حسابي والمفضلة</a><a href="policies.html">السياسات</a></div></aside>' +
      '<div class="search-ov" id="searchOv" role="dialog" aria-label="بحث"><div class="bar"><input id="searchIn" type="search" placeholder="ابحثي عن منتج أو مكوّن…" aria-label="بحث"><button class="icon-btn" type="button" data-act="close" aria-label="إغلاق">' + I.x + '</button></div><div class="search-res" id="searchRes"></div></div>' +
      '<div class="modal" id="modal" role="dialog" aria-modal="true"></div>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
  }
  function footer() {
    return '<footer class="footer"><div class="wrap"><div class="cols">' +
      '<div><a class="logo" href="index.html" dir="ltr">Cosmetics<span>.</span></a><p>عناية يومية بالبشرة والشعر بتركيبات واضحة المكونات.</p><a href="#" data-act="soon">Instagram</a><a href="#" data-act="soon">Facebook</a><a href="#" data-act="soon">TikTok</a></div>' +
      '<div><h3>استكشفي</h3><a href="shop.html">المتجر</a><a href="bundles.html">المجموعات</a><a href="routine.html">اختبار الروتين</a><a href="membership.html">العضوية والنقاط</a><a href="about.html">من نحن</a></div>' +
      '<div><h3>السياسات</h3><a href="policies.html#privacy">سياسة الخصوصية</a><a href="policies.html#returns">الاستبدال والاسترجاع والتوصيل</a><a href="policies.html#terms">شروط الخدمة</a><a href="about.html#faq">الأسئلة الشائعة</a></div>' +
      '<div><h3>تواصلي معنا</h3><p dir="ltr" style="text-align:right">hello@cosmetics.example</p><p dir="ltr" style="text-align:right">+20 100 000 0000</p><p>القاهرة، مصر</p><a href="about.html#contact">نموذج التواصل</a></div>' +
      '</div><div class="legal"><span>© 2026 Cosmetics. جميع الحقوق محفوظة.</span><span>نموذج تجريبي — المنتجات والأسعار والتقييمات عيّنات للعرض فقط.</span></div></div></footer>';
  }

  /* ---------- cart logic ---------- */
  function totals(ship) {
    var c = cart();
    var sub = c.reduce(function (s, l) { return s + priceOf(l.id, l.si) * l.qty; }, 0);
    var code = db.get('promo', null);
    var disc = code && S.promos[code] ? Math.round(sub * S.promos[code]) : 0;
    var after = sub - disc;
    var fee = !c.length ? 0 : ship === 'express' ? S.ship.express : after >= S.freeShip ? 0 : S.ship.standard;
    return { sub: sub, disc: disc, ship: fee, total: after + fee, code: disc ? code : null, count: c.reduce(function (s, l) { return s + l.qty; }, 0) };
  }
  function addToCart(id, si, qty) {
    var c = cart(); si = si || 0; qty = qty || 1;
    var l = c.find(function (x) { return x.id === id && x.si === si; });
    if (l) l.qty = Math.min(20, l.qty + qty); else c.push({ id: id, si: si, qty: qty });
    db.set('cart', c); sync();
  }
  function lineHtml(l, i) {
    var it = item(l.id);
    return '<div class="line"><a class="thumb-s" href="' + url(it) + '" aria-label="' + esc(it.name) + '">' + vis(it, 'xs') + '</a>' +
      '<div class="meta"><b>' + esc(it.name) + '</b><small>' + esc(it.sizes[l.si][0]) + ' · ' + money(it.sizes[l.si][1]) + '</small>' +
      '<div class="qty sm"><button type="button" data-act="dec" data-i="' + i + '" aria-label="إنقاص الكمية">−</button><span>' + l.qty + '</span><button type="button" data-act="inc" data-i="' + i + '" aria-label="زيادة الكمية">+</button></div></div>' +
      '<div class="end"><b>' + money(it.sizes[l.si][1] * l.qty) + '</b><button class="rm" type="button" data-act="rm" data-i="' + i + '" aria-label="حذف ' + esc(it.name) + '">' + I.trash + '</button></div></div>';
  }
  function shipBar(t) {
    var left = S.freeShip - (t.sub - t.disc), pct = Math.min(100, Math.round((t.sub - t.disc) / S.freeShip * 100));
    return '<div class="shipbar"><span>' + (left > 0 ? 'أضيفي ' + money(left) + ' للحصول على توصيل مجاني' : 'مبروك! طلبك مؤهل للتوصيل المجاني') + '</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  }
  function summaryRows(t) {
    return '<div class="sum-row"><span>المجموع الفرعي</span><span>' + money(t.sub) + '</span></div>' +
      (t.disc ? '<div class="sum-row"><span>خصم (' + esc(t.code) + ')</span><span class="neg">− ' + money(t.disc) + '</span></div>' : '') +
      '<div class="sum-row"><span>التوصيل</span><span>' + (t.ship ? money(t.ship) : 'مجاني') + '</span></div>' +
      '<div class="sum-row total"><span>الإجمالي</span><span>' + money(t.total) + '</span></div>';
  }
  function renderDrawer() {
    var c = cart(), t = totals(), el = $('#cartDrawer');
    el.innerHTML = '<div class="drawer-head"><h2>سلة التسوق (' + t.count + ')</h2><button class="icon-btn" type="button" data-act="close" aria-label="إغلاق">' + I.x + '</button></div>' +
      (c.length ? '<div class="drawer-body">' + shipBar(t) + c.map(lineHtml).join('') + '</div><div class="drawer-foot"><div class="sum-row total" style="border:0;padding:0"><span>المجموع</span><span>' + money(t.sub) + '</span></div><a class="btn btn-accent btn-block" href="checkout.html">إتمام الطلب</a><a class="btn btn-ghost btn-block" href="cart.html">عرض السلة</a></div>'
        : '<div class="drawer-body">' + empty(I.cart, 'سلتك فارغة', 'ابدئي بإضافة منتجات روتينك.', ['تسوقي الآن', 'shop.html']) + '</div>');
  }
  function sync() {
    var t = totals();
    $('#cartCount').textContent = t.count || '';
    renderDrawer();
    if (PAGE === 'cart') pages.cart();
    if (PAGE === 'checkout') renderCheckoutSummary();
  }

  /* ---------- overlays ---------- */
  function closeAll() { $$('.drawer,.scrim,.search-ov,.modal').forEach(function (e) { e.classList.remove('on'); }); document.body.style.overflow = ''; }
  function open(id) { closeAll(); $(id).classList.add('on'); if (id !== '#searchOv' && id !== '#modal') $('.scrim').classList.add('on'); document.body.style.overflow = 'hidden'; }
  var toastT;
  function toast(msg) { var t = $('#toast'); t.innerHTML = I.check + '<span>' + esc(msg) + '</span>'; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2600); }
  function modal(html) { $('#modal').innerHTML = '<div class="box">' + html + '<button class="btn btn-ghost" type="button" data-act="close">إغلاق</button></div>'; open('#modal'); }
  function runSearch(q) {
    q = q.trim().toLowerCase();
    var res = !q ? S.products.filter(function (p) { return p.tags.indexOf('best') > -1; }) : S.products.filter(function (p) { return (p.name + ' ' + p.en + ' ' + p.short + ' ' + p.keys.join(' ') + ' ' + S.cats[p.cat]).toLowerCase().indexOf(q) > -1; });
    $('#searchRes').innerHTML = '<p class="note">' + (q ? res.length + ' نتيجة' : 'الأكثر طلبًا') + '</p>' + (res.length ? res.map(function (p) {
      return '<a class="line" href="' + url(p) + '"><span class="thumb-s">' + pack(p, 'xs') + '</span><span class="meta"><b>' + esc(p.name) + '</b><small>' + esc(p.short) + '</small></span><b>' + money(p.sizes[0][1]) + '</b></a>';
    }).join('') : '<p>لا توجد نتائج. جرّبي كلمة أخرى مثل «سيروم» أو «واقي».</p>');
  }

  /* ---------- forms ---------- */
  function field(name, label, o) {
    o = o || {};
    var inp = o.type === 'select' ? '<select id="f-' + name + '" name="' + name + '"><option value="">اختاري…</option>' + o.options.map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select>'
      : o.type === 'textarea' ? '<textarea id="f-' + name + '" name="' + name + '" placeholder="' + (o.ph || '') + '"></textarea>'
        : '<input id="f-' + name + '" name="' + name + '" type="' + (o.type || 'text') + '" placeholder="' + (o.ph || '') + '" autocomplete="' + (o.ac || 'off') + '"' + (o.dir ? ' dir="' + o.dir + '"' : '') + ' value="' + esc(o.val || '') + '">';
    return '<label class="field' + (o.full ? ' full' : '') + '" for="f-' + name + '">' + label + inp + '<span class="err" id="e-' + name + '"></span></label>';
  }
  function validate(form, rules) {
    var ok = true, data = {};
    Object.keys(rules).forEach(function (k) {
      var el = form.elements[k], v = (el.value || '').trim(), msg = rules[k](v);
      data[k] = v; el.closest('.field').classList.toggle('bad', !!msg); $('#e-' + k).textContent = msg || '';
      if (msg && ok) { el.focus(); ok = false; }
    });
    return ok ? data : null;
  }
  var req = function (m) { return function (v) { return v ? '' : m; }; };
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

  /* ---------- pages ---------- */
  var main;
  var pages = {};

  pages.home = function () {
    var best = S.products.filter(function (p) { return p.tags.indexOf('best') > -1; }).slice(0, 4);
    var cica = P('cica-cream'), oil = P('hair-oil');
    var slides = S.slides.map(function (s, i) {
      return '<div class="slide' + (i ? '' : ' on') + '"><div class="wrap"><div class="hero-text"><span class="eyebrow">' + s.eyebrow + '</span><h1>' + s.title + '</h1><p>' + s.text + '</p>' +
        (i ? '' : '<div class="chips"><a class="chip" href="shop.html?cat=skin">البشرة</a><a class="chip" href="shop.html?cat=hair">الشعر</a><a class="chip" href="shop.html?cat=body">الجسم</a><a class="chip hot" href="bundles.html">العروض</a></div>') +
        '<div class="cta-row"><a class="btn btn-accent" href="' + s.cta[1] + '">' + s.cta[0] + '</a>' + (i ? '' : '<a class="btn btn-ghost" href="routine.html">اكتشفي روتينك</a>') + '</div></div>' +
        '<div class="hero-art">' + s.ids.map(function (id) { return pack(P(id)); }).join('') + '</div></div></div>';
    }).join('');
    var dots = S.slides.map(function (s, i) { return '<button type="button" data-act="slide" data-i="' + i + '" class="' + (i ? '' : 'on') + '" aria-label="الشريحة ' + (i + 1) + '"></button>'; }).join('');
    main.innerHTML =
      '<section class="hero slider" aria-roledescription="carousel">' + slides + '<div class="slider-nav"><button class="arrow" type="button" data-act="slide" data-d="-1" aria-label="السابق">' + I.prev + '</button>' + dots + '<button class="arrow" type="button" data-act="slide" data-d="1" aria-label="التالي">' + I.next + '</button></div></section>' +
      '<div class="badges"><div class="wrap"><div class="badge">' + I.leaf + '<span>مناسب للبشرة الحساسة</span></div><div class="badge">' + I.shield + '<span>خالٍ من العطور</span></div><div class="badge">' + I.flask + '<span>مكونات معلنة بالكامل</span></div><div class="badge">' + I.truck + '<span>توصيل لكل المحافظات</span></div></div></div>' +
      '<section class="section feature"><div class="wrap"><a class="feature-art" href="' + url(cica) + '"><span class="tag">جديد</span>' + pack(cica, 'big') + '</a><div class="feature-body"><span class="eyebrow">' + cica.name + ' · ' + cica.sizes[0][0] + '</span><h2>أربعة مكونات تهدّئ البشرة وتقوّي حاجزها</h2><p>' + cica.desc + '</p>' +
      '<div class="ing">' + cica.keys.map(function (k) { return '<div><b>' + k[0] + '</b><span>' + k[1] + '</span></div>'; }).join('') + '</div><span class="price">' + money(cica.sizes[0][1]) + '</span>' +
      '<div class="cta-row"><button class="btn btn-accent" type="button" data-act="add" data-id="cica-cream">' + I.cart + ' أضيفي إلى السلة</button><a class="btn btn-ghost" href="' + url(cica) + '">كل التفاصيل</a></div></div></div></section>' +
      '<section class="section soft" id="routine"><div class="wrap"><div class="sec-head center"><span class="eyebrow">تسوقي حسب نوع البشرة</span><h2>روتينك يبدأ من هنا</h2><p>اختاري نوع بشرتك لنرتب لكِ الخطوات.</p></div>' +
      '<div class="tabs" role="tablist">' + Object.keys(S.skinTypes).map(function (k, i) { return '<button class="tab' + (i ? '' : ' on') + '" type="button" role="tab" data-act="skin" data-k="' + k + '">بشرة ' + S.skinTypes[k] + '</button>'; }).join('') + '</div><div id="routineGrid"></div></div></section>' +
      '<section class="section"><div class="wrap"><div class="sec-head spread"><div><span class="eyebrow">الأكثر طلبًا</span><h2>منتجات تحبها عميلاتنا</h2></div><a class="link" href="shop.html">كل المنتجات</a></div>' + grid(best) + '</div></section>' +
      '<section class="section dark split"><div class="wrap"><a class="split-art" href="' + url(oil) + '">' + pack(oil, 'big') + '</a><div class="split-body"><span class="eyebrow">العناية بالشعر</span><h2>زيت واحد لفروة مرتاحة وشعر أنعم</h2><p>' + oil.desc + '</p><ul class="ticks">' +
      ['يغذّي فروة الرأس', 'يقلل تقصّف الأطراف', 'يمنح الشعر لمعانًا', 'قوام خفيف سهل الغسل', 'بدون سيليكون', 'مناسب لكل أنواع الشعر'].map(function (x) { return '<li>' + I.check + '<span>' + x + '</span></li>'; }).join('') +
      '</ul><span class="price" style="color:#F4F6F1">' + money(oil.sizes[0][1]) + '</span><div class="cta-row"><button class="btn btn-light" type="button" data-act="add" data-id="hair-oil">أضيفي إلى السلة</button><a class="btn btn-ghost" style="border-color:#F4F6F1;color:#F4F6F1" href="shop.html?cat=hair">منتجات الشعر</a></div></div></div></section>' +
      '<section class="section"><div class="wrap"><div class="sec-head"><span class="eyebrow">تعلّمي معنا</span><h2>فيديوهات قصيرة</h2></div><div class="grid g4">' +
      S.videos.map(function (v, i) { return '<article class="card"><button class="thumb" type="button" data-act="video" data-i="' + i + '" style="border:0;cursor:pointer;width:100%" aria-label="تشغيل: ' + v + '"><span class="play">' + I.play + '</span></button><h3>' + v + '</h3><button class="link" type="button" data-act="video" data-i="' + i + '" style="border:0;background:none;font:inherit;font-weight:600;cursor:pointer;padding:0;align-self:flex-start">شاهدي</button></article>'; }).join('') + '</div></div></section>' +
      '<section class="section soft"><div class="wrap"><div class="sec-head center"><span class="eyebrow">آراء العملاء</span><h2>ماذا تقول عميلاتنا</h2><p>تقييمات تجريبية للعرض — تُستبدل بتقييمات حقيقية بعد الإطلاق.</p></div><div class="grid g3">' +
      S.reviews.slice(0, 3).map(function (r, i) { var p = best[i]; return '<article class="card pillar">' + stars(r.r) + '<p class="desc" style="font-size:16px">' + r.t + '</p><span class="who">' + r.n + ' · <a href="' + url(p) + '">' + p.name + '</a></span></article>'; }).join('') + '</div></div></section>' +
      '<section class="section"><div class="wrap"><div class="sec-head center"><span class="eyebrow">لماذا Cosmetics</span><h2>عناية يمكنكِ الوثوق بها</h2></div><div class="grid g3">' +
      [[I.leaf, 'مكونات مختارة بعناية', 'كل مكوّن مذكور بنسبته ودوره في التركيبة.'], [I.flask, 'تركيبات مبنية على العلم', 'نعتمد مكونات مدروسة بتركيزات فعّالة.'], [I.shield, 'لطيفة على البشرة', 'بدون عطور أو كحول مجفِّف أو أصباغ.']].map(function (x) { return '<article class="card pillar"><span class="ico">' + x[0] + '</span><h3>' + x[1] + '</h3><p class="desc">' + x[2] + '</p></article>'; }).join('') + '</div></div></section>' +
      '<section class="section soft"><div class="wrap"><div class="sec-head spread"><div><span class="eyebrow">المجموعات</span><h2>كمّلي روتينك ووفّري 20%</h2></div><a class="link" href="bundles.html">كل المجموعات</a></div>' + grid(S.bundles.slice(0, 4).map(function (b) { return item(b.id); })) + '</div></section>' +
      '<section class="section dark"><div class="wrap"><div class="member-head"><div><span class="eyebrow">العضوية</span><h2>مزايا العضوية</h2></div><a class="btn btn-light" href="membership.html">انضمي إلى قائمة الانتظار</a></div><div class="grid g4">' + benefits() + '</div></div></section>' +
      '<section class="closing"><div class="wrap"><h2>عناية واضحة. بشرة مرتاحة.</h2><p>اشتركي في النشرة لتصلك النصائح والعروض.</p><form class="news" data-form="news" novalidate><input type="email" name="email" placeholder="بريدك الإلكتروني" aria-label="البريد الإلكتروني" dir="ltr"><button class="btn btn-accent" type="submit">اشتركي</button></form></div></section>';
    showRoutine('dry');
    var cur = 0, n = S.slides.length, timer;
    function go(i) { cur = (i + n) % n; $$('.slide').forEach(function (s, j) { s.classList.toggle('on', j === cur); }); $$('.slider-nav button[data-i]').forEach(function (b, j) { b.classList.toggle('on', j === cur); }); }
    function auto() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 6500); }
    pages.home.go = function (el) { go(el.dataset.d ? cur - Number(el.dataset.d) * -1 : Number(el.dataset.i)); auto(); };
    auto();
  };
  function benefits() {
    return [[I.tag, 'أسعار الأعضاء', 'خصم خاص على كل المنتجات.'], [I.truck, 'شحن مجاني', 'على كل طلباتك داخل مصر.'], [I.star, 'نقاط مضاعفة', 'اجمعي النقاط أسرع مع كل طلب.'], [I.play, 'محتوى حصري', 'نصائح وروتينات للأعضاء فقط.']].map(function (x) { return '<div class="benefit"><span class="ico">' + x[0] + '</span><h3>' + x[1] + '</h3><p>' + x[2] + '</p></div>'; }).join('');
  }
  function showRoutine(k) {
    var ids = S.routines[k];
    $('#routineGrid').innerHTML = grid(ids.map(P), ids.length === 3 ? 3 : 4) + '<div style="text-align:center;margin-top:28px"><button class="btn btn-accent" type="button" data-act="addall" data-ids="' + ids.join(',') + '">أضيفي الروتين كاملًا — ' + money(ids.reduce(function (s, i) { return s + P(i).sizes[0][1]; }, 0)) + '</button></div>';
    $$('.tab[data-k]').forEach(function (t) { t.classList.toggle('on', t.dataset.k === k); t.setAttribute('aria-selected', t.dataset.k === k); });
  }

  pages.shop = function () {
    var max = Math.max.apply(null, S.products.map(function (p) { return p.sizes[0][1]; }));
    var st = { cat: params.get('cat') || '', q: params.get('q') || '', concerns: params.get('concern') ? [params.get('concern')] : [], max: max, sort: 'featured' };
    main.innerHTML = head('المتجر', 'كل منتجات العناية بالبشرة والشعر والجسم.') + '<section class="section" style="padding-top:40px"><div class="wrap shop">' +
      '<form class="filters" id="filters" aria-label="تصفية المنتجات"><fieldset><legend>الفئة</legend>' +
      [['', 'الكل']].concat(Object.keys(S.cats).map(function (k) { return [k, S.cats[k]]; })).map(function (c) { return '<label class="check"><input type="radio" name="cat" value="' + c[0] + '"' + (st.cat === c[0] ? ' checked' : '') + '>' + c[1] + '</label>'; }).join('') + '</fieldset>' +
      '<fieldset><legend>الاهتمام</legend>' + Object.keys(S.concerns).map(function (k) { return '<label class="check"><input type="checkbox" name="concern" value="' + k + '"' + (st.concerns.indexOf(k) > -1 ? ' checked' : '') + '>' + S.concerns[k] + '</label>'; }).join('') + '</fieldset>' +
      '<fieldset><legend>السعر حتى <span id="maxLbl">' + money(max) + '</span></legend><input type="range" name="max" min="100" max="' + max + '" step="10" value="' + max + '" aria-label="أقصى سعر"></fieldset>' +
      '<button class="btn btn-ghost" type="reset">مسح التصفية</button></form>' +
      '<div class="results"><div class="toolbar"><span id="resCount" aria-live="polite"></span><div style="display:flex;gap:8px;flex-wrap:wrap"><input type="search" id="shopQ" placeholder="بحث في المتجر" aria-label="بحث في المتجر" value="' + esc(st.q) + '"><select id="sort" aria-label="ترتيب"><option value="featured">الأكثر طلبًا</option><option value="low">السعر: من الأقل</option><option value="high">السعر: من الأعلى</option><option value="rate">الأعلى تقييمًا</option><option value="new">الأحدث</option></select></div></div><div id="shopGrid"></div></div></div></section>';
    function draw() {
      var list = S.products.filter(function (p) {
        return (!st.cat || p.cat === st.cat) && p.sizes[0][1] <= st.max &&
          (!st.concerns.length || st.concerns.some(function (c) { return p.concerns.indexOf(c) > -1; })) &&
          (!st.q || (p.name + ' ' + p.en + ' ' + p.short + ' ' + p.keys.join(' ')).toLowerCase().indexOf(st.q.toLowerCase()) > -1);
      });
      var by = { low: function (a, b) { return a.sizes[0][1] - b.sizes[0][1]; }, high: function (a, b) { return b.sizes[0][1] - a.sizes[0][1]; }, rate: function (a, b) { return avg(b.id) - avg(a.id); }, new: function (a, b) { return (b.tags.indexOf('new') > -1) - (a.tags.indexOf('new') > -1); }, featured: function (a, b) { return (b.tags.indexOf('best') > -1) - (a.tags.indexOf('best') > -1); } };
      list.sort(by[st.sort]);
      $('#resCount').textContent = list.length + ' منتج';
      $('#shopGrid').innerHTML = list.length ? grid(list, 3) : empty(I.search, 'لا توجد منتجات مطابقة', 'جرّبي تغيير التصفية أو مسحها.');
      var q = new URLSearchParams(); if (st.cat) q.set('cat', st.cat); if (st.q) q.set('q', st.q);
      history.replaceState(null, '', 'shop.html' + (q.toString() ? '?' + q : ''));
    }
    var f = $('#filters');
    function read() { st.cat = f.elements.cat.value; st.concerns = $$('input[name=concern]:checked', f).map(function (x) { return x.value; }); st.max = Number(f.elements.max.value); $('#maxLbl').textContent = money(st.max); draw(); }
    f.addEventListener('input', read);
    f.addEventListener('reset', function () { setTimeout(function () { f.elements.cat.value = ''; $$('input[name=concern]', f).forEach(function (x) { x.checked = false; }); st.q = ''; $('#shopQ').value = ''; read(); }, 0); });
    $('#shopQ').addEventListener('input', function (e) { st.q = e.target.value.trim(); draw(); });
    $('#sort').addEventListener('change', function (e) { st.sort = e.target.value; draw(); });
    pages.shop.redraw = draw;
    draw();
  };

  pages.product = function () {
    var p = P(params.get('id') || 'cica-cream');
    if (!p) { main.innerHTML = '<div class="wrap">' + empty(I.search, 'المنتج غير موجود', 'ربما تم تغيير الرابط.', ['العودة إلى المتجر', 'shop.html']) + '</div>'; return; }
    document.title = p.name + ' — Cosmetics';
    var st = { si: 0, qty: 1, view: 0 };
    var views = [function (c) { return pack(p, c); }, function (c) { return texture(p, c); }, function (c) { return '<div class="bvis">' + pack(p, c) + pack(p, c) + '</div>'; }];
    var related = S.products.filter(function (x) { return x.id !== p.id && x.cat === p.cat && x.step !== p.step; }).slice(0, 3);
    main.innerHTML = '<div class="wrap"><nav class="crumbs" aria-label="مسار التصفح"><a href="index.html">الرئيسية</a> / <a href="shop.html?cat=' + p.cat + '">' + S.cats[p.cat] + '</a> / <span>' + p.name + '</span></nav><div class="pdp">' +
      '<div class="gallery"><div class="main" id="gMain"></div><div class="thumbs">' + views.map(function (v, i) { return '<button type="button" data-act="view" data-i="' + i + '" aria-label="صورة ' + (i + 1) + '">' + v('') + '</button>'; }).join('') + '</div></div>' +
      '<div class="info"><span class="eyebrow">' + S.cats[p.cat] + (p.step ? ' · ' + S.steps[p.step] : '') + '</span><h1>' + p.name + '</h1><a class="rating" href="#reviews" id="rateTop"></a><p>' + p.desc + '</p><span class="price" id="pPrice"></span>' +
      '<span class="lab">الحجم</span><div class="opts">' + p.sizes.map(function (s, i) { return '<button class="opt" type="button" data-act="size" data-i="' + i + '">' + s[0] + '</button>'; }).join('') + '</div>' +
      '<span class="lab">الكمية</span><div class="buy"><div class="qty"><button type="button" data-act="pq" data-d="-1" aria-label="إنقاص الكمية">−</button><span id="pQty">1</span><button type="button" data-act="pq" data-d="1" aria-label="زيادة الكمية">+</button></div>' +
      '<button class="btn btn-accent" type="button" data-act="padd">' + I.cart + ' أضيفي إلى السلة</button><button class="btn btn-ghost" type="button" data-act="pbuy">اشتري الآن</button></div>' +
      '<button class="link" type="button" data-act="wish" data-id="' + p.id + '" id="pWish" style="border:0;background:none;font:inherit;font-weight:600;cursor:pointer;padding:0"></button>' +
      '<div class="notes"><div>' + I.truck + '<span>توصيل مجاني للطلبات فوق ' + money(S.freeShip) + '</span></div><div>' + I.shield + '<span>استبدال واسترجاع خلال 14 يومًا</span></div><div>' + I.leaf + '<span>' + p.concerns.map(function (c) { return S.concerns[c]; }).join(' · ') + '</span></div></div>' +
      '<div class="acc"><details open><summary>طريقة الاستخدام</summary><p>' + p.how + '</p></details><details><summary>المكونات الكاملة (INCI)</summary><p class="inci">' + p.inci + '</p></details><details><summary>التوصيل والاسترجاع</summary><p>التوصيل العادي 3–5 أيام عمل. يمكن استرجاع المنتج المغلق خلال 14 يومًا من الاستلام.</p></details></div></div></div></div>' +
      '<section class="section soft"><div class="wrap"><div class="sec-head center"><span class="eyebrow">المكونات الأساسية</span><h2>ماذا يوجد داخل العبوة</h2></div><div class="grid g' + (p.keys.length === 4 ? 4 : 3) + '">' + p.keys.map(function (k, i) { return '<article class="card pillar"><span class="ico">' + [I.leaf, I.flask, I.shield, I.drop][i] + '</span><h3>' + k[0] + '</h3><p class="desc">' + k[1] + '</p></article>'; }).join('') + '</div></div></section>' +
      '<section class="section" id="reviews"><div class="wrap two"><div class="main-col"><div class="sec-head" style="margin-bottom:0"><span class="eyebrow">التقييمات</span><h2>آراء العملاء</h2></div><div id="revList"></div></div>' +
      '<div class="side-col"><form class="panel" data-form="review" novalidate><h2>أضيفي تقييمك</h2><div><span class="lab">تقييمك</span><div class="rate-in">' + [5, 4, 3, 2, 1].map(function (n) { return '<input type="radio" name="r" id="r' + n + '" value="' + n + '"' + (n === 5 ? ' checked' : '') + '><label for="r' + n + '" aria-label="' + n + ' نجوم">' + I.star + '</label>'; }).join('') + '</div></div>' + field('rname', 'الاسم', { ac: 'name' }) + field('rtext', 'رأيك في المنتج', { type: 'textarea' }) + '<button class="btn btn-primary" type="submit">إرسال التقييم</button><p class="note">يُحفظ التقييم على جهازك فقط في هذه النسخة التجريبية.</p></form></div></div></section>' +
      (related.length ? '<section class="section soft"><div class="wrap"><div class="sec-head"><span class="eyebrow">كمّلي روتينك</span><h2>يُستخدم معه</h2></div>' + grid(related, 3) + '</div></section>' : '') +
      '<div class="buybar"><span class="price" id="bbPrice"></span><button class="btn btn-accent" type="button" data-act="padd">أضيفي إلى السلة</button></div>';
    function draw() {
      $('#gMain').innerHTML = (p.tags.indexOf('new') > -1 ? '<span class="tag">جديد</span>' : '') + views[st.view]('big');
      $$('.thumbs button').forEach(function (b, i) { b.classList.toggle('on', i === st.view); });
      $$('.opt').forEach(function (b, i) { b.classList.toggle('on', i === st.si); b.setAttribute('aria-pressed', i === st.si); });
      $('#pPrice').textContent = money(p.sizes[st.si][1]); $('#bbPrice').textContent = money(p.sizes[st.si][1] * st.qty); $('#pQty').textContent = st.qty;
      var w = wish().indexOf(p.id) > -1; $('#pWish').innerHTML = I.heart + (w ? ' في المفضلة — إزالة' : ' أضيفي إلى المفضلة');
    }
    function drawRev() {
      var rs = reviewsOf(p.id), a = avg(p.id);
      $('#rateTop').innerHTML = stars(a) + '<span>' + a.toFixed(1) + ' · ' + rs.length + ' تقييم</span>';
      $('#revList').innerHTML = '<div class="kv"><div><small>متوسط التقييم</small><b>' + a.toFixed(1) + ' / 5</b></div><div><small>عدد التقييمات</small><b>' + rs.length + '</b></div></div>' + rs.map(function (r) { return '<div class="rev"><div class="top">' + stars(r.r) + '<b>' + esc(r.n) + '</b>' + (r.sample ? '<span class="sample">تقييم تجريبي</span>' : '<span class="sample">تقييمك</span>') + '</div><p>' + esc(r.t) + '</p></div>'; }).join('');
    }
    pages.product.act = function (a, el) {
      if (a === 'view') st.view = Number(el.dataset.i);
      if (a === 'size') st.si = Number(el.dataset.i);
      if (a === 'pq') st.qty = Math.max(1, Math.min(10, st.qty + Number(el.dataset.d)));
      if (a === 'padd') { addToCart(p.id, st.si, st.qty); open('#cartDrawer'); }
      if (a === 'pbuy') { addToCart(p.id, st.si, st.qty); location.href = 'checkout.html'; }
      draw();
    };
    pages.product.review = function (form) {
      var d = validate(form, { rname: req('اكتبي اسمك'), rtext: function (v) { return v.length >= 5 ? '' : 'اكتبي رأيك (5 أحرف على الأقل)'; } });
      if (!d) return;
      var all = db.get('reviews', {}); (all[p.id] = all[p.id] || []).unshift({ n: d.rname, r: Number(form.elements.r.value), t: d.rtext }); db.set('reviews', all);
      form.reset(); drawRev(); toast('شكرًا! تمت إضافة تقييمك');
    };
    pages.product.redraw = draw;
    draw(); drawRev();
  };

  pages.bundles = function () {
    main.innerHTML = head('المجموعات', 'روتين كامل بسعر أقل: وفّري 20% على كل مجموعة.') + '<section class="section" style="padding-top:40px"><div class="wrap"><div class="grid g3">' +
      S.bundles.map(function (b) {
        var it = item(b.id);
        return '<article class="card pcard" id="' + b.id + '"><div class="tile">' + vis(it) + '</div><span class="save">وفّري ' + money(it.was - it.sizes[0][1]) + '</span><h3>' + b.name + '</h3>' +
          '<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">' + b.items.map(function (i) { return '<li class="desc"><a class="link" style="min-height:32px;font-weight:500" href="' + url(P(i)) + '">' + P(i).name + '</a> — ' + money(P(i).sizes[0][1]) + '</li>'; }).join('') + '</ul>' +
          '<div class="row"><span class="price">' + money(it.sizes[0][1]) + '<s>' + it.was.toLocaleString('en-US') + '</s></span><button class="btn btn-primary" type="button" data-act="add" data-id="' + b.id + '">أضيفي إلى السلة</button></div></article>';
      }).join('') + '</div></div></section>';
    if (location.hash && $(location.hash)) $(location.hash).scrollIntoView({ block: 'center' });
  };

  pages.routine = function () {
    var Q = [
      ['ما نوع بشرتك؟', Object.keys(S.skinTypes).map(function (k) { return [k, S.skinTypes[k]]; })],
      ['ما اهتمامك الأساسي؟', [['acne', 'الحبوب والمسام'], ['dull', 'البهتان والبقع'], ['aging', 'الخطوط الدقيقة'], ['none', 'ترطيب وراحة فقط']]],
      ['هل تستخدمين واقي الشمس يوميًا؟', [['yes', 'نعم، دائمًا'], ['some', 'أحيانًا'], ['no', 'لا']]]
    ];
    var ans = [];
    function draw() {
      var i = ans.length, body;
      if (i < Q.length) {
        body = '<div class="progress"><i style="width:' + (i / Q.length * 100) + '%"></i></div><span class="eyebrow">السؤال ' + (i + 1) + ' من ' + Q.length + '</span><h2 style="font-size:30px">' + Q[i][0] + '</h2><div class="opts-grid">' + Q[i][1].map(function (o) { return '<button class="choice" type="button" data-act="quiz" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' + (i ? '<button class="link" type="button" data-act="quizback" style="border:0;background:none;font:inherit;font-weight:600;cursor:pointer;align-self:flex-start">رجوع</button>' : '');
        main.innerHTML = head('اختبار الروتين', 'ثلاثة أسئلة سريعة لترتيب روتين يناسب بشرتك.') + '<section class="section" style="padding-top:40px"><div class="wrap"><div class="quiz panel">' + body + '</div></div></section>';
      } else {
        var ids = S.routines[ans[0]].slice(), add = S.addons[ans[1]];
        if (add && ids.indexOf(add) < 0) ids.splice(1, 0, add);
        var list = ids.map(P), sum = list.reduce(function (s, p) { return s + p.sizes[0][1]; }, 0);
        main.innerHTML = head('روتينك المقترح', 'لبشرة ' + S.skinTypes[ans[0]] + (ans[2] !== 'yes' ? ' — واقي الشمس أهم خطوة، لا تتجاوزيها.' : '.')) + '<section class="section" style="padding-top:40px"><div class="wrap two"><div class="main-col">' +
          list.map(function (p, i) { return '<div class="line"><span class="routine-step"><span class="num">' + (i + 1) + '</span></span><a class="thumb-s" href="' + url(p) + '">' + pack(p, 'xs') + '</a><div class="meta"><b>' + p.name + '</b><small>' + (p.step ? S.steps[p.step] + ' · ' : '') + p.short + '</small></div><div class="end"><b>' + money(p.sizes[0][1]) + '</b><button class="btn btn-ghost" style="min-height:40px;padding:0 14px;font-size:13px" type="button" data-act="add" data-id="' + p.id + '">أضيفي</button></div></div>'; }).join('') +
          '</div><div class="side-col"><div class="panel"><h2>الروتين كاملًا</h2><div class="sum-row"><span>' + list.length + ' منتجات</span><span>' + money(sum) + '</span></div><button class="btn btn-accent btn-block" type="button" data-act="addall" data-ids="' + ids.join(',') + '">أضيفي الكل إلى السلة</button><button class="btn btn-ghost btn-block" type="button" data-act="quizreset">أعيدي الاختبار</button><p class="note">اقتراح عام وليس نصيحة طبية. استشيري طبيب الجلدية للحالات الخاصة.</p></div></div></div></section>';
      }
    }
    pages.routine.act = function (a, el) { if (a === 'quiz') ans.push(el.dataset.v); if (a === 'quizback') ans.pop(); if (a === 'quizreset') ans = []; draw(); window.scrollTo(0, 0); };
    draw();
  };

  pages.cart = function () {
    var c = cart(), t = totals();
    if (!c.length) { main.innerHTML = head('سلة التسوق') + '<div class="wrap">' + empty(I.cart, 'سلتك فارغة', 'ابدئي بإضافة منتجات روتينك.', ['تسوقي الآن', 'shop.html']) + '</div>'; return; }
    var rec = S.products.filter(function (p) { return !c.some(function (l) { return l.id === p.id; }) && p.tags.indexOf('best') > -1; }).slice(0, 4);
    main.innerHTML = head('سلة التسوق', t.count + ' منتج في سلتك') + '<section class="section" style="padding-top:40px"><div class="wrap two"><div class="main-col">' + shipBar(t) + c.map(lineHtml).join('') + '<a class="link" href="shop.html">متابعة التسوق</a></div>' +
      '<div class="side-col"><div class="panel"><h2>ملخص الطلب</h2><form class="promo" data-form="promo" novalidate><input name="code" placeholder="كود الخصم" aria-label="كود الخصم" dir="ltr" value="' + esc(db.get('promo', '') || '') + '"><button class="btn btn-ghost" type="submit">تطبيق</button></form><p class="note">جرّبي الكود التجريبي WELCOME10</p>' + summaryRows(t) + '<a class="btn btn-accent btn-block" href="checkout.html">إتمام الطلب</a></div></div></div></section>' +
      (rec.length ? '<section class="section soft"><div class="wrap"><div class="sec-head"><h2>قد يعجبك أيضًا</h2></div>' + grid(rec) + '</div></section>' : '');
  };

  var shipSel = 'standard';
  function renderCheckoutSummary() {
    var el = $('#coSum'); if (!el) return;
    var c = cart(), t = totals(shipSel);
    if (!c.length) { pages.checkout(); return; }
    el.innerHTML = '<h2>طلبك (' + t.count + ')</h2>' + c.map(function (l) { var it = item(l.id); return '<div class="sum-row"><span>' + esc(it.name) + ' × ' + l.qty + '<br><small class="note">' + it.sizes[l.si][0] + '</small></span><span>' + money(it.sizes[l.si][1] * l.qty) + '</span></div>'; }).join('') + '<div style="border-top:1px solid var(--line)"></div>' + summaryRows(t) + '<p class="note">ستحصلين على ' + Math.floor(t.total / 10) + ' نقطة مع هذا الطلب.</p>';
    var lbl = $('#stdFee'); if (lbl) lbl.textContent = totals('standard').ship ? money(S.ship.standard) : 'مجاني';
  }
  pages.checkout = function () {
    if (!cart().length) { main.innerHTML = head('إتمام الطلب') + '<div class="wrap">' + empty(I.cart, 'لا توجد منتجات لإتمام الطلب', 'أضيفي منتجات إلى سلتك أولًا.', ['تسوقي الآن', 'shop.html']) + '</div>'; return; }
    var u = db.get('user', {}) || {};
    main.innerHTML = head('إتمام الطلب', 'نسخة تجريبية: لن يُرسل طلب حقيقي، وتُحفظ البيانات على جهازك فقط.') + '<section class="section" style="padding-top:40px"><div class="wrap"><form class="two" data-form="checkout" novalidate><div class="main-col">' +
      '<div class="panel"><h2>بيانات التوصيل</h2><div class="form">' + field('name', 'الاسم الكامل', { ac: 'name', val: u.name }) + field('phone', 'رقم الموبايل', { type: 'tel', ph: '01xxxxxxxxx', dir: 'ltr', ac: 'tel' }) + field('email', 'البريد الإلكتروني (اختياري)', { type: 'email', dir: 'ltr', ac: 'email', val: u.email, full: true }) + field('gov', 'المحافظة', { type: 'select', options: S.governorates }) + field('city', 'المدينة / المنطقة') + field('address', 'العنوان بالتفصيل', { full: true, ph: 'الشارع، رقم العمارة، الشقة', ac: 'street-address' }) + field('notes', 'ملاحظات للتوصيل (اختياري)', { type: 'textarea', full: true }) + '</div></div>' +
      '<div class="panel"><h2>طريقة التوصيل</h2><label class="radio"><input type="radio" name="ship" value="standard" checked><span>توصيل عادي<small>3–5 أيام عمل</small></span><b id="stdFee"></b></label><label class="radio"><input type="radio" name="ship" value="express"><span>توصيل سريع<small>1–2 يوم عمل</small></span><b>' + money(S.ship.express) + '</b></label></div>' +
      '<div class="panel"><h2>طريقة الدفع</h2><label class="radio"><input type="radio" name="pay" value="cod" checked><span>الدفع عند الاستلام<small>نقدًا لمندوب التوصيل</small></span></label><label class="radio off"><input type="radio" name="pay" value="card" disabled><span>بطاقة ائتمان / خصم<small>غير مفعّل في النسخة التجريبية</small></span></label></div></div>' +
      '<div class="side-col"><div class="panel"><div id="coSum" style="display:flex;flex-direction:column;gap:12px"></div><button class="btn btn-accent btn-block" type="submit">تأكيد الطلب</button><a class="btn btn-ghost btn-block" href="cart.html">تعديل السلة</a></div></div></form></div></section>';
    renderCheckoutSummary();
    $$('input[name=ship]').forEach(function (r) { r.addEventListener('change', function () { shipSel = r.value; renderCheckoutSummary(); }); });
  };
  function placeOrder(form) {
    var d = validate(form, {
      name: function (v) { return v.length >= 3 ? '' : 'اكتبي الاسم الكامل'; },
      phone: function (v) { return /^01[0125]\d{8}$/.test(v.replace(/\s/g, '')) ? '' : 'رقم موبايل مصري من 11 رقمًا يبدأ بـ 01'; },
      email: function (v) { return !v || isEmail(v) ? '' : 'بريد إلكتروني غير صحيح'; },
      gov: req('اختاري المحافظة'), city: req('اكتبي المدينة أو المنطقة'),
      address: function (v) { return v.length >= 8 ? '' : 'اكتبي العنوان بالتفصيل'; }
    });
    if (!d) { toast('راجعي الحقول المطلوبة'); return; }
    var t = totals(shipSel), id = 'CO-' + String(Date.now()).slice(-6);
    var o = { id: id, date: new Date().toISOString(), items: cart(), totals: t, ship: shipSel, to: { name: d.name, phone: d.phone, gov: d.gov, city: d.city, address: d.address }, points: Math.floor(t.total / 10) };
    var os = db.get('orders', []); os.unshift(o); db.set('orders', os);
    db.set('points', db.get('points', 0) + o.points); db.set('cart', []); db.set('promo', null);
    location.href = 'order.html?id=' + id;
  }
  function orderCard(o, full) {
    var age = (Date.now() - new Date(o.date).getTime()) / 60000, stage = age > 2 ? 2 : age > 0.5 ? 1 : 0;
    var steps = ['تم استلام الطلب', 'قيد التجهيز', 'خرج للتوصيل', 'تم التسليم'];
    return '<div class="panel order-card"><div class="head"><div><b style="font-size:18px;color:var(--primary)" dir="ltr">' + esc(o.id) + '</b><br><small class="note">' + new Date(o.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) + '</small></div><span class="pill">' + steps[stage] + '</span></div>' +
      '<div class="timeline">' + steps.map(function (s, i) { return '<div class="' + (i <= stage ? 'done' : '') + '">' + s + '</div>'; }).join('') + '</div>' +
      o.items.map(function (l) { var it = item(l.id); return it ? '<div class="sum-row"><span>' + esc(it.name) + ' × ' + l.qty + '</span><span>' + money(it.sizes[l.si][1] * l.qty) + '</span></div>' : ''; }).join('') +
      '<div class="sum-row total"><span>الإجمالي (' + (o.ship === 'express' ? 'توصيل سريع' : 'توصيل عادي') + ')</span><span>' + money(o.totals.total) + '</span></div>' +
      (full ? '<p class="note">التوصيل إلى: ' + esc(o.to.name) + ' — ' + esc(o.to.gov) + '، ' + esc(o.to.city) + '، ' + esc(o.to.address) + '<br>الدفع عند الاستلام · كسبتِ ' + o.points + ' نقطة</p>' : '') +
      '<div class="cta-row"><button class="btn btn-ghost" type="button" data-act="reorder" data-id="' + esc(o.id) + '">إعادة الطلب</button>' + (full ? '<a class="btn btn-primary" href="orders.html">كل طلباتي</a>' : '<a class="btn btn-primary" href="order.html?id=' + esc(o.id) + '">التفاصيل</a>') + '</div></div>';
  }
  pages.order = function () {
    var o = db.get('orders', []).find(function (x) { return x.id === params.get('id'); });
    main.innerHTML = o ? head('شكرًا لكِ! تم تأكيد طلبك', 'هذا تأكيد تجريبي — لم يُرسل طلب حقيقي.') + '<section class="section" style="padding-top:40px"><div class="wrap" style="max-width:760px">' + orderCard(o, true) + '</div></section>'
      : head('الطلب') + '<div class="wrap">' + empty(I.search, 'لم نجد هذا الطلب', 'الطلبات محفوظة على الجهاز الذي أُنشئت منه.', ['طلباتي', 'orders.html']) + '</div>';
  };
  pages.orders = function () {
    var os = db.get('orders', []);
    main.innerHTML = head('طلباتي', 'طلباتك التجريبية المحفوظة على هذا الجهاز.') + '<section class="section" style="padding-top:40px"><div class="wrap" style="max-width:860px;display:flex;flex-direction:column;gap:20px">' + (os.length ? os.map(function (o) { return orderCard(o); }).join('') : empty(I.truck, 'لا توجد طلبات بعد', 'عند إتمام أول طلب سيظهر هنا مع حالة التوصيل.', ['تسوقي الآن', 'shop.html'])) + '</div></section>';
  };

  pages.account = function () {
    var u = db.get('user', null), w = wish().map(item).filter(Boolean);
    main.innerHTML = head(u ? 'أهلًا، ' + esc(u.name) : 'حسابي', u ? esc(u.email) : 'سجّلي دخولك التجريبي لحفظ نقاطك ومفضلتك.') + '<section class="section" style="padding-top:40px"><div class="wrap">' +
      (u ? '<div class="kv" style="margin-bottom:28px"><div><small>رصيد النقاط</small><b>' + db.get('points', 0) + '</b></div><div><small>الطلبات</small><b>' + db.get('orders', []).length + '</b></div><div><small>المفضلة</small><b>' + w.length + '</b></div></div><div class="cta-row" style="margin-bottom:40px"><a class="btn btn-primary" href="orders.html">طلباتي</a><a class="btn btn-ghost" href="membership.html">العضوية والنقاط</a><button class="btn btn-ghost" type="button" data-act="logout">تسجيل الخروج</button></div>'
        : '<form class="panel" data-form="login" novalidate style="max-width:480px;margin-bottom:40px"><h2>دخول تجريبي</h2>' + field('lname', 'الاسم', { ac: 'name' }) + field('lemail', 'البريد الإلكتروني', { type: 'email', dir: 'ltr', ac: 'email' }) + '<button class="btn btn-accent" type="submit">دخول</button><p class="note">بدون كلمة مرور: هذه نسخة للعرض، والبيانات تبقى على جهازك.</p></form>') +
      '<div class="sec-head"><h2>المفضلة</h2></div>' + (w.length ? grid(w) : empty(I.heart, 'لا توجد منتجات في المفضلة', 'اضغطي على القلب في أي منتج لحفظه هنا.', ['تصفحي المتجر', 'shop.html'])) + '</div></section>';
  };

  pages.membership = function () {
    main.innerHTML = head('العضوية والنقاط', 'نقطة واحدة مقابل كل 10 ج.م. — وكل 100 نقطة تساوي خصم 10 ج.م.') + '<section class="section" style="padding-top:40px"><div class="wrap"><div class="kv" style="margin-bottom:40px"><div><small>رصيدك الحالي</small><b>' + db.get('points', 0) + ' نقطة</b></div><div><small>قيمته</small><b>' + money(Math.floor(db.get('points', 0) / 100) * 10) + '</b></div><div><small>طلباتك</small><b>' + db.get('orders', []).length + '</b></div></div></div>' +
      '<div class="dark section"><div class="wrap"><div class="sec-head center"><span class="eyebrow">قريبًا</span><h2>عضوية Cosmetics</h2><p>انضمي إلى قائمة الانتظار لتكوني أول من يعرف.</p></div><div class="grid g4">' + benefits() + '</div><form class="news" data-form="waitlist" novalidate><input type="email" name="email" placeholder="بريدك الإلكتروني" aria-label="البريد الإلكتروني" dir="ltr"><button class="btn btn-light" type="submit">انضمي إلى قائمة الانتظار</button></form></div></div></section>';
  };

  pages.about = function () {
    main.innerHTML = head('من نحن', 'علامة عناية بالبشرة والشعر تؤمن بالتركيبات الواضحة.') + '<section class="section"><div class="wrap"><div class="prose"><h2>قصتنا</h2><p>بدأت Cosmetics من فكرة بسيطة: روتين من خطوات قليلة ومكونات مفهومة يكفي معظم البشرات. نكتب نسبة كل مكوّن أساسي على العبوة، ونتجنب العطور والأصباغ.</p><p>هذا نص تعريفي تجريبي يُستبدل بقصة العلامة الحقيقية.</p></div><div class="grid g3" style="margin-top:40px">' +
      [[I.leaf, 'مكونات مختارة بعناية', 'كل مكوّن له دور واضح.'], [I.flask, 'مبنية على العلم', 'تركيزات فعّالة ومدروسة.'], [I.shield, 'لطيفة على البشرة', 'بدون عطور أو أصباغ.']].map(function (x) { return '<article class="card pillar"><span class="ico">' + x[0] + '</span><h3>' + x[1] + '</h3><p class="desc">' + x[2] + '</p></article>'; }).join('') + '</div></div></section>' +
      '<section class="section soft" id="faq"><div class="wrap"><div class="sec-head"><span class="eyebrow">مساعدة</span><h2>الأسئلة الشائعة</h2></div><div class="acc" style="max-width:820px">' + S.faqs.map(function (f) { return '<details><summary>' + f[0] + '</summary><p>' + f[1] + '</p></details>'; }).join('') + '</div></div></section>' +
      '<section class="section" id="contact"><div class="wrap"><form class="panel" data-form="contact" novalidate style="max-width:640px"><h2>تواصلي معنا</h2><div class="form">' + field('cname', 'الاسم', { ac: 'name' }) + field('cemail', 'البريد الإلكتروني', { type: 'email', dir: 'ltr', ac: 'email' }) + field('cmsg', 'رسالتك', { type: 'textarea', full: true }) + '</div><button class="btn btn-accent" type="submit">إرسال</button><p class="note">نموذج تجريبي: لا تُرسل الرسالة إلى أي جهة.</p></form></div></section>';
    if (location.hash && $(location.hash)) $(location.hash).scrollIntoView();
  };

  pages.policies = function () {
    var T = {
      privacy: ['سياسة الخصوصية', ['نجمع فقط البيانات اللازمة لتنفيذ طلبك: الاسم، رقم الهاتف والعنوان.', 'لا نشارك بياناتك مع أي طرف ثالث إلا شركة الشحن لتوصيل الطلب.', 'في هذه النسخة التجريبية تُحفظ كل البيانات على جهازك فقط ولا تُرسل إلى أي خادم.']],
      returns: ['الاستبدال والاسترجاع والتوصيل', ['التوصيل العادي من 3 إلى 5 أيام عمل، والسريع من يوم إلى يومين.', 'التوصيل مجاني للطلبات فوق ' + money(S.freeShip) + '.', 'يمكن استرجاع أو استبدال المنتج المغلق خلال 14 يومًا من الاستلام.', 'المنتجات المفتوحة لا تُسترجع إلا في حالة وجود عيب تصنيع.']],
      terms: ['شروط الخدمة', ['الأسعار بالجنيه المصري وتشمل ضريبة القيمة المضافة.', 'المحتوى للتثقيف العام وليس بديلًا عن استشارة الطبيب.', 'نحتفظ بحق تعديل الأسعار والعروض في أي وقت.']]
    };
    var cur = (location.hash || '#privacy').slice(1); if (!T[cur]) cur = 'privacy';
    main.innerHTML = head('السياسات', 'نصوص تجريبية تُستبدل بسياسات المتجر المعتمدة.') + '<section class="section" style="padding-top:40px"><div class="wrap"><div class="tabs tabs-left" role="tablist">' + Object.keys(T).map(function (k) { return '<button class="tab' + (k === cur ? ' on' : '') + '" type="button" role="tab" data-act="policy" data-k="' + k + '">' + T[k][0] + '</button>'; }).join('') + '</div><div class="prose"><h2>' + T[cur][0] + '</h2><ul>' + T[cur][1].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></div></section>';
  };

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act, c, i;
    if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
    if (a === 'add') { addToCart(el.dataset.id, 0, 1); toast('تمت الإضافة إلى السلة'); open('#cartDrawer'); }
    else if (a === 'addall') { el.dataset.ids.split(',').forEach(function (id) { addToCart(id, 0, 1); }); toast('تمت إضافة الروتين إلى السلة'); open('#cartDrawer'); }
    else if (a === 'inc' || a === 'dec' || a === 'rm') {
      c = cart(); i = Number(el.dataset.i);
      if (a === 'rm') c.splice(i, 1); else { c[i].qty += a === 'inc' ? 1 : -1; if (c[i].qty < 1) c.splice(i, 1); else c[i].qty = Math.min(20, c[i].qty); }
      db.set('cart', c); sync();
    }
    else if (a === 'wish') {
      var w = wish(), id = el.dataset.id, k = w.indexOf(id);
      if (k > -1) w.splice(k, 1); else w.push(id);
      db.set('wish', w); toast(k > -1 ? 'أُزيل من المفضلة' : 'أُضيف إلى المفضلة');
      $$('.wish[data-id="' + id + '"]').forEach(function (b) { b.classList.toggle('on', k < 0); b.setAttribute('aria-pressed', k < 0); });
      if (PAGE === 'product') pages.product.redraw(); if (PAGE === 'account') pages.account();
    }
    else if (a === 'cart') { renderDrawer(); open('#cartDrawer'); }
    else if (a === 'menu') open('#menuDrawer');
    else if (a === 'search') { open('#searchOv'); runSearch(''); $('#searchIn').value = ''; $('#searchIn').focus(); }
    else if (a === 'close') closeAll();
    else if (a === 'lang') toast('النسخة الإنجليزية قريبًا');
    else if (a === 'soon') toast('رابط تجريبي');
    else if (a === 'slide') pages.home.go(el);
    else if (a === 'skin') showRoutine(el.dataset.k);
    else if (a === 'video') modal('<h2>' + S.videos[el.dataset.i] + '</h2><div class="player">' + I.play + '<span>فيديو تجريبي — يُضاف الفيديو الحقيقي هنا</span></div>');
    else if (a === 'policy') { history.replaceState(null, '', '#' + el.dataset.k); pages.policies(); }
    else if (a === 'logout') { db.set('user', null); pages.account(); toast('تم تسجيل الخروج'); }
    else if (a === 'reorder') { var o = db.get('orders', []).find(function (x) { return x.id === el.dataset.id; }); if (o) { o.items.forEach(function (l) { if (item(l.id)) addToCart(l.id, l.si, l.qty); }); toast('أُضيفت منتجات الطلب إلى السلة'); open('#cartDrawer'); } }
    else if (PAGE === 'product' && pages.product.act) pages.product.act(a, el);
    else if (PAGE === 'routine' && pages.routine.act) pages.routine.act(a, el);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, k = f.dataset.form; if (!k) return; e.preventDefault();
    if (k === 'checkout') placeOrder(f);
    else if (k === 'review') pages.product.review(f);
    else if (k === 'promo') { var code = f.elements.code.value.trim().toUpperCase(); if (S.promos[code]) { db.set('promo', code); toast('تم تطبيق الخصم'); } else { db.set('promo', null); toast(code ? 'كود غير صحيح' : 'أُزيل الكود'); } sync(); }
    else if (k === 'news' || k === 'waitlist') { if (!isEmail(f.elements.email.value.trim())) { toast('اكتبي بريدًا إلكترونيًا صحيحًا'); f.elements.email.focus(); return; } f.reset(); toast(k === 'news' ? 'تم الاشتراك (تجريبي)' : 'أُضفتِ إلى قائمة الانتظار (تجريبي)'); }
    else if (k === 'login') { var d = validate(f, { lname: req('اكتبي اسمك'), lemail: function (v) { return isEmail(v) ? '' : 'بريد إلكتروني غير صحيح'; } }); if (d) { db.set('user', { name: d.lname, email: d.lemail }); pages.account(); toast('أهلًا ' + d.lname); } }
    else if (k === 'contact') { var c = validate(f, { cname: req('اكتبي اسمك'), cemail: function (v) { return isEmail(v) ? '' : 'بريد إلكتروني غير صحيح'; }, cmsg: function (v) { return v.length >= 10 ? '' : 'اكتبي رسالتك (10 أحرف على الأقل)'; } }); if (c) { f.reset(); toast('تم استلام رسالتك (تجريبي)'); } }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'searchIn') runSearch(e.target.value);
    var fl = e.target.closest && e.target.closest('.field.bad');
    if (fl) { fl.classList.remove('bad'); var er = $('.err', fl); if (er) er.textContent = ''; }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* ---------- boot ---------- */
  var page = $('.page');
  main = $('#main');
  page.insertAdjacentHTML('afterbegin', header());
  page.insertAdjacentHTML('beforeend', footer());
  (pages[PAGE] || pages.home)();
  sync();
})();
