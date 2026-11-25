(function () {
  'use strict';
  // Set the real WhatsApp number (digits, with country code) when the client supplies it. Empty in the demo: nothing is ever sent.
  var WA_NUMBER = '';
  var isAr = document.documentElement.lang === 'ar';
  var T = isAr ? {
    noNum: 'وضع تجريبي: رقم واتساب غير مُعدّ. تم نسخ الرسالة.', copied: 'تم نسخ القائمة', hello: 'مرحبًا، أود طلب المنتجات التالية:',
    qty: 'الكمية', branch: 'الفرع', recv: 'الاستلام', pickup: 'استلام من الفرع', delivery: 'طلب توصيل', results: function (n) { return n + ' منتج'; },
    remove: 'إزالة', added: 'تمت الإضافة إلى القائمة', cleared: 'تم المسح', sar: 'ر.س', inc: 'زيادة', dec: 'إنقاص',
    bmi: ['نقص في الوزن', 'وزن ضمن النطاق المعتاد', 'زيادة في الوزن', 'سمنة'], bmiN: 'مؤشر تقريبي للمعلومات فقط. اسأل الصيدلي أو الطبيب.',
    water: 'تقدير تقريبي', bad: 'أدخل قيمًا صحيحة', due: 'التاريخ التقريبي', dueN: 'تقدير فقط. راجع طبيبك.', ask: 'مرحبًا، أود سؤال الصيدلي عن: ',
    t1: 'اقتراح: ', save: 'حفظ', unsave: 'إزالة الحفظ', dark: 'الوضع الداكن', light: 'الوضع الفاتح'
  } : {
    noNum: 'Demo mode: WhatsApp number not set. Message copied instead.', copied: 'List copied', hello: 'Hello, I would like to request these products:',
    qty: 'Qty', branch: 'Branch', recv: 'Receiving', pickup: 'Pick up at branch', delivery: 'Delivery request', results: function (n) { return n + (n === 1 ? ' product' : ' products'); },
    remove: 'Remove', added: 'Added to your list', cleared: 'Cleared', sar: 'SAR', inc: 'Increase', dec: 'Decrease',
    bmi: ['Below the usual range', 'Within the usual range', 'Above the usual range', 'Well above the usual range'], bmiN: 'Rough guide for information only. Ask the pharmacist or doctor.',
    water: 'Rough estimate', bad: 'Please enter valid values', due: 'Approximate date', dueN: 'Estimate only. Check with your doctor.', ask: 'Hello, I would like to ask the pharmacist about: ',
    t1: 'Suggestion: ', save: 'Save', unsave: 'Remove from saved', dark: 'Dark mode', light: 'Light mode'
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function norm(s) { return String(s).toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'); }

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  var toastEl = $('#toast'), toastT;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3200); }

  // theme
  var tb = $('#themeBtn');
  function setTheme(d) {
    if (d) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
    if (tb) { tb.setAttribute('aria-pressed', d ? 'true' : 'false'); }
    try { localStorage.setItem('albaida_theme', d ? 'dark' : 'light'); } catch (e) {}
  }
  if (tb) {
    tb.setAttribute('aria-pressed', document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
    tb.addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') !== 'dark'); });
  }

  // mobile menu
  var mb = $('#menuBtn'), nav = $('#nav');
  if (mb && nav) {
    mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  }

  // Riyadh open/closed
  function riyadhHour() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var h = 0, m = 0; p.forEach(function (x) { if (x.type === 'hour') h = +x.value % 24; if (x.type === 'minute') m = +x.value; });
      return h + m / 60;
    } catch (e) { return null; }
  }
  var rh = riyadhHour();
  $$('.open-status').forEach(function (el) {
    if (rh === null) return;
    var on = rh >= +el.dataset.openFrom && rh < +el.dataset.openTo;
    el.textContent = on ? el.dataset.openLabel : el.dataset.closedLabel; el.classList.add(on ? 'on' : 'off'); el.dataset.on = on ? '1' : '0';
  });
  var oo = $('#onlyOpen');
  if (oo) oo.addEventListener('click', function () {
    var p = oo.getAttribute('aria-pressed') !== 'true'; oo.setAttribute('aria-pressed', p ? 'true' : 'false');
    $$('#branchGrid .branch').forEach(function (b) { var s = $('.open-status', b); b.hidden = p && s && s.dataset.on !== '1'; });
  });

  // WhatsApp helper
  function openWa(text) {
    if (!WA_NUMBER) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
      toast(T.noNum); return;
    }
    window.open('https://wa.me/' + encodeURIComponent(WA_NUMBER) + '?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  }
  $$('[data-wa]').forEach(function (b) { b.addEventListener('click', function () { openWa(b.dataset.waText || ''); }); });

  // contact form
  var cf = $('#contactForm');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('#cName'), m = $('#cMsg'), ok = true;
    [[n, $('#eName')], [m, $('#eMsg')]].forEach(function (p) { var bad = !p[0].value.trim(); p[1].hidden = !bad; p[0].setAttribute('aria-invalid', bad ? 'true' : 'false'); if (bad) ok = false; });
    if (!ok) { (n.value.trim() ? m : n).focus(); return; }
    var b = $('#cBranch');
    openWa(n.value.trim() + ' (' + T.branch + ': ' + b.options[b.selectedIndex].text + ')\n' + m.value.trim());
  });

  // home search
  var hs = $('#homeSearch');
  if (hs) hs.addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#hq').value.trim().slice(0, 60);
    location.href = hs.dataset.target + (v ? '#q=' + encodeURIComponent(v) : '');
  });

  // ---- cart
  var KEY = 'albaida_demo_cart_v2', FKEY = 'albaida_demo_saved_v2', RKEY = 'albaida_demo_recent_v2';
  function cleanCart(o) {
    var out = {}; if (!o || typeof o !== 'object') return out;
    Object.keys(o).forEach(function (id) {
      var v = o[id]; if (!/^P\d{3}$/.test(id) || !v) return;
      var q = parseInt(v.q, 10); if (!(q >= 1 && q <= 99)) return;
      out[id] = { q: q, ar: String(v.ar || '').slice(0, 80), en: String(v.en || '').slice(0, 80) };
    });
    return out;
  }
  var cart = cleanCart(lsGet(KEY, {}));
  var drawer = $('#drawer'), cl = $('#cartList'), ce = $('#cartEmpty'), lastFocus = null;
  function save() { lsSet(KEY, cart); renderCart(); }
  function renderCart() {
    var ids = Object.keys(cart), n = 0; ids.forEach(function (i) { n += cart[i].q; });
    var cc = $('#cartCount'); if (cc) cc.textContent = n;
    var cbn = $('#cartBtn'); if (cbn) cbn.setAttribute('aria-label', (isAr ? 'قائمة الطلب ' : 'Request list ') + n);
    if (!cl) return;
    cl.textContent = ''; if (ce) ce.hidden = ids.length > 0;
    ids.forEach(function (id) {
      var li = document.createElement('li'), s = document.createElement('span'); s.textContent = isAr ? cart[id].ar : cart[id].en;
      var qd = document.createElement('span'); qd.className = 'qty';
      function b(txt, lab, fn) { var x = document.createElement('button'); x.type = 'button'; x.textContent = txt; x.setAttribute('aria-label', lab + ' ' + s.textContent); x.addEventListener('click', fn); return x; }
      var num = document.createElement('strong'); num.textContent = cart[id].q;
      qd.appendChild(b('−', T.dec, function () { if (cart[id].q <= 1) delete cart[id]; else cart[id].q--; save(); }));
      qd.appendChild(num);
      qd.appendChild(b('+', T.inc, function () { if (cart[id].q < 99) cart[id].q++; save(); }));
      qd.appendChild(b('×', T.remove, function () { delete cart[id]; save(); }));
      li.appendChild(s); li.appendChild(qd); cl.appendChild(li);
    });
  }
  function addItem(id, ar, en) {
    if (!/^P\d{3}$/.test(id)) return;
    if (cart[id]) { if (cart[id].q < 99) cart[id].q++; } else cart[id] = { q: 1, ar: ar.slice(0, 80), en: en.slice(0, 80) };
    save(); toast(T.added);
  }
  function openDrawer(el) { lastFocus = document.activeElement; el.hidden = false; var f = $('button', el); if (f) f.focus(); }
  function closeDrawer(el) { el.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  var cb = $('#cartBtn');
  if (cb && drawer) {
    cb.addEventListener('click', function () { openDrawer(drawer); });
    $('#closeCart').addEventListener('click', function () { closeDrawer(drawer); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer) closeDrawer(drawer); });
    function listText() {
      var lines = [T.hello], ids = Object.keys(cart);
      ids.forEach(function (id) { lines.push('- ' + (isAr ? cart[id].ar : cart[id].en) + ' (' + T.qty + ': ' + cart[id].q + ')'); });
      var br = $('#cartBranch'), rv = $('input[name=recv]:checked');
      lines.push(T.branch + ': ' + br.options[br.selectedIndex].text);
      lines.push(T.recv + ': ' + (rv && rv.value === 'delivery' ? T.delivery : T.pickup));
      return lines.join('\n');
    }
    $('#sendWa').addEventListener('click', function () { if (Object.keys(cart).length) openWa(listText()); });
    $('#copyList').addEventListener('click', function () {
      if (!Object.keys(cart).length) return;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(listText()).then(function () { toast(T.copied); }, function () {}); else toast(T.copied);
    });
    $('#printList').addEventListener('click', function () { window.print(); });
    $('#clearCart').addEventListener('click', function () { cart = {}; save(); toast(T.cleared); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    [drawer, $('#pmodal')].forEach(function (d) { if (d && !d.hidden) closeDrawer(d); });
    if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); if (mb) { mb.setAttribute('aria-expanded', 'false'); mb.focus(); } }
  });

  // ---- wishlist
  var saved = lsGet(FKEY, []); if (!Array.isArray(saved)) saved = []; saved = saved.filter(function (x) { return /^P\d{3}$/.test(x); });
  function paintFav(c) {
    var on = saved.indexOf(c.dataset.id) > -1, f = $('[data-fav]', c);
    if (f) { f.setAttribute('aria-pressed', on ? 'true' : 'false'); f.classList.toggle('on', on); }
  }
  var cards = $$('.product');
  cards.forEach(function (c) {
    paintFav(c);
    var f = $('[data-fav]', c); if (f) f.addEventListener('click', function () {
      var i = saved.indexOf(c.dataset.id); if (i > -1) saved.splice(i, 1); else saved.push(c.dataset.id);
      lsSet(FKEY, saved); cards.forEach(function (x) { if (x.dataset.id === c.dataset.id) paintFav(x); }); if (typeof applyFilters === 'function') applyFilters();
    });
    var a = $('[data-add]', c); if (a) a.addEventListener('click', function () { addItem(c.dataset.id, c.dataset.tar, c.dataset.ten); });
    var v = $('[data-view]', c); if (v) v.addEventListener('click', function () { openProduct(c); });
  });

  // ---- recently viewed + modal
  var pm = $('#pmodal'), cur = null;
  var recent = lsGet(RKEY, []); if (!Array.isArray(recent)) recent = []; recent = recent.filter(function (x) { return /^P\d{3}$/.test(x); }).slice(0, 6);
  function renderRecent() {
    var w = $('#recentWrap'), l = $('#recent'); if (!w || !l) return;
    l.textContent = ''; var n = 0;
    recent.forEach(function (id) {
      var c = cards.filter(function (x) { return x.dataset.id === id; })[0]; if (!c) return; n++;
      var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = isAr ? c.dataset.tar : c.dataset.ten;
      b.addEventListener('click', function () { openProduct(c); }); li.appendChild(b); l.appendChild(li);
    });
    w.hidden = n === 0;
  }
  function openProduct(c) {
    if (!pm) return; cur = c; var d = c.dataset, name = isAr ? d.tar : d.ten;
    $('#pmTitle').textContent = name; $('#pmCat').textContent = d.catlabel; $('#pmPrice').textContent = d.price;
    $('#pmOld').textContent = (+d.old > 0) ? d.old : ''; $('#pmOld').style.textDecoration = 'line-through';
    $('#pmDesc').textContent = isAr ? 'وصف نموذجي للمنتج في قسم ' + d.catlabel + '. سيُستبدل بالبيانات الحقيقية من العميل.' : 'Sample product description in ' + d.catlabel + '. To be replaced with real data from the client.';
    var im = $('#pmImg'); im.className = 'p-img cat-' + d.cat; im.setAttribute('aria-label', d.catlabel);
    im.textContent = ''; var src = $('.p-img > svg', c); if (src) im.appendChild(src.cloneNode(true));
    recent = [d.id].concat(recent.filter(function (x) { return x !== d.id; })).slice(0, 6); lsSet(RKEY, recent); renderRecent();
    openDrawer(pm);
  }
  if (pm) {
    $('#pmClose').addEventListener('click', function () { closeDrawer(pm); });
    pm.addEventListener('click', function (e) { if (e.target === pm) closeDrawer(pm); });
    $('#pmAdd').addEventListener('click', function () { if (cur) addItem(cur.dataset.id, cur.dataset.tar, cur.dataset.ten); });
    $('#pmAsk').addEventListener('click', function () { if (cur) openWa(T.ask + (isAr ? cur.dataset.tar : cur.dataset.ten)); });
  }
  renderCart(); renderRecent();


  // ---- home slider
  var sld = $('#slider');
  if (sld) {
    var slides = $$('.slide', sld), dots = $$('.dot', sld), idx = 0, timer = null, paused = false;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.hidden = k !== idx; });
      dots.forEach(function (d, k) { d.setAttribute('aria-pressed', k === idx ? 'true' : 'false'); });
    }
    function start() { stop(); if (!paused && !reduce) timer = setInterval(function () { show(idx + 1); }, 6000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    $('#slPrev').addEventListener('click', function () { show(idx - 1); start(); });
    $('#slNext').addEventListener('click', function () { show(idx + 1); start(); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); start(); }); });
    var sp = $('#slPause');
    sp.addEventListener('click', function () { paused = !paused; sp.setAttribute('aria-pressed', paused ? 'true' : 'false'); sp.textContent = paused ? '▶' : '⏸'; if (paused) stop(); else start(); });
    sld.addEventListener('focusin', stop); sld.addEventListener('mouseenter', stop);
    sld.addEventListener('focusout', start); sld.addEventListener('mouseleave', start);
    if (reduce) { paused = true; sp.setAttribute('aria-pressed', 'true'); sp.textContent = '▶'; }
    start();
  }
  // ---- home tabs
  var tabs = $$('.tab');
  if (tabs.length) {
    function selTab(k, focus) {
      tabs.forEach(function (t, j) { var on = j === k; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; if (on && focus) t.focus(); });
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { selTab(k); });
      t.addEventListener('keydown', function (e) {
        var d = document.documentElement.dir === 'rtl' ? -1 : 1;
        if (e.key === 'ArrowRight') { e.preventDefault(); selTab((k + d + tabs.length) % tabs.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); selTab((k - d + tabs.length) % tabs.length, true); }
      });
    });
  }

  // ---- products filters
  var grid = $('#grid'), applyFilters;
  if (grid) {
    var q = $('#q'), sort = $('#sort'), maxp = $('#maxp'), oOff = $('#onlyOffers'), oSav = $('#onlySaved');
    var cat = 'all', need = 'all', list = cards.filter(function (c) { return grid.contains(c); });
    var NEEDS_OK = ['immunity', 'kids', 'hair', 'skin', 'diabetes', 'sports'], CATS_OK = ['vitamins', 'skin', 'baby', 'personal', 'firstaid', 'devices', 'sports'];
    function setPressed(sel, key, val) { $$(sel).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset[key] === val ? 'true' : 'false'); }); }
    applyFilters = function () {
      var term = norm(q.value.trim()), mx = +maxp.value, shown = 0;
      list.forEach(function (c) {
        var d = c.dataset;
        var ok = (cat === 'all' || d.cat === cat) && (need === 'all' || (' ' + d.needs + ' ').indexOf(' ' + need + ' ') > -1 || d.needs.split(/[ ,]+/).indexOf(need) > -1) &&
          (!term || norm(d.name).indexOf(term) > -1) && (!mx || +d.price <= mx) && (!oOff.classList.contains('on') || +d.off > 0) && (!oSav.classList.contains('on') || saved.indexOf(d.id) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      var s = sort.value, vis = list.slice();
      if (s === 'plh') vis.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
      else if (s === 'phl') vis.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
      else if (s === 'off') vis.sort(function (a, b) { return b.dataset.off - a.dataset.off; });
      else vis.sort(function (a, b) { return list.indexOf(a) - list.indexOf(b); });
      if (s !== 'def' || grid.dataset.sorted) { vis.forEach(function (c) { grid.appendChild(c); }); grid.dataset.sorted = s !== 'def' ? '1' : ''; }
      $('#resultCount').textContent = T.results(shown); $('#empty').hidden = shown !== 0;
    };
    // toggles use class "on" mirror of aria-pressed
    [oOff, oSav].forEach(function (b) { b.addEventListener('click', function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); applyFilters(); }); });
    $$('.chip[data-cat]').forEach(function (b) { b.addEventListener('click', function () { cat = b.dataset.cat; setPressed('.chip[data-cat]', 'cat', cat); applyFilters(); }); });
    $$('.chip[data-need]').forEach(function (b) { b.addEventListener('click', function () { need = b.dataset.need; setPressed('.chip[data-need]', 'need', need); applyFilters(); }); });
    q.addEventListener('input', applyFilters); sort.addEventListener('change', applyFilters); maxp.addEventListener('change', applyFilters);
    var h = location.hash.replace(/^#/, '');
    h.split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 0) return; var k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k === 'cat' && CATS_OK.indexOf(v) > -1) { cat = v; setPressed('.chip[data-cat]', 'cat', v); }
      if (k === 'need' && NEEDS_OK.indexOf(v) > -1) { need = v; setPressed('.chip[data-need]', 'need', v); }
      if (k === 'q') q.value = v.slice(0, 60);
    });
    applyFilters();
  }
  var og = $('#offerGrid'); if (og && !grid) { /* offers page: cards already filtered at build time */ }

  // ---- finder
  var ff = $('#finderForm');
  if (ff) ff.addEventListener('submit', function (e) {
    e.preventDefault();
    var who = $('input[name=who]:checked', ff), goal = $('input[name=goal]:checked', ff);
    $('#fErr').hidden = !!(who && goal); if (!(who && goal)) return;
    var map = { immunity: 'need=immunity', hair: 'need=hair', skin: 'need=skin', sports: 'need=sports', diabetes: 'need=diabetes', kids: 'need=kids' };
    var label = goal.dataset.label, g = goal.value;
    if (who.value === 'child' && (g === 'immunity' || g === 'skin')) { map[g] = 'need=kids'; }
    $('#fTitle').textContent = T.t1 + label;
    $('#fText').textContent = isAr ? 'نقترح أن تتصفح قسم «' + label + '» ثم تسأل الصيدلي لتأكيد الأنسب لك. لم نحفظ أي إجابة.' : 'We suggest browsing the "' + label + '" shelf, then asking the pharmacist to confirm what suits you. No answers are stored.';
    var a = $('#fLink'); a.href = a.getAttribute('href').split('#')[0] + '#' + map[g];
    var ask = $('#fAsk'); ask.dataset.waText = T.ask + label;
    var r = $('#finderResult'); r.hidden = false; r.scrollIntoView({ block: 'nearest' });
  });
  // data-wa buttons were bound earlier; fAsk is handled above only once (avoid double): remove earlier binding effect by guarding
  // ---- tools
  function num(el) { var v = parseFloat(el.value); return isFinite(v) ? v : NaN; }
  var bf = $('#bmiForm');
  if (bf) bf.addEventListener('submit', function (e) {
    e.preventDefault(); var w = num($('#bmiW')), h = num($('#bmiH')), o = $('#bmiOut');
    if (!(w >= 20 && w <= 300 && h >= 100 && h <= 250)) { o.textContent = T.bad; return; }
    var b = w / Math.pow(h / 100, 2), i = b < 18.5 ? 0 : b < 25 ? 1 : b < 30 ? 2 : 3;
    o.textContent = 'BMI ' + b.toFixed(1) + ': ' + T.bmi[i] + '. ' + T.bmiN;
  });
  var wf = $('#waterForm');
  if (wf) wf.addEventListener('submit', function (e) {
    e.preventDefault(); var w = num($('#wW')), o = $('#waterOut');
    if (!(w >= 20 && w <= 300)) { o.textContent = T.bad; return; }
    o.textContent = T.water + ': ' + (w * 0.033).toFixed(1) + (isAr ? ' لتر يوميًا تقريبًا.' : ' L per day.');
  });
  var df = $('#dueForm');
  if (df) df.addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#dueD').value, o = $('#dueOut'), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) { o.textContent = T.bad; return; }
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), now = Date.now();
    if (isNaN(d) || d.getTime() > now + 86400000 || d.getTime() < now - 300 * 86400000) { o.textContent = T.bad; return; }
    d.setUTCDate(d.getUTCDate() + 280);
    o.textContent = T.due + ': ' + d.toLocaleDateString(isAr ? 'ar-SA-u-nu-latn' : 'en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) + '. ' + T.dueN;
  });

  // service worker
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
