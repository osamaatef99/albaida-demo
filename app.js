(function () {
  'use strict';
  // ---- configuration: set the real WhatsApp number (digits only, with country code) when the client supplies it.
  var WA_NUMBER = ''; // empty in the demo: no message is ever sent to anyone
  var isAr = document.documentElement.lang === 'ar';
  var T = isAr ? {
    noNum: 'وضع تجريبي: رقم واتساب غير مُعدّ. تم نسخ الرسالة.', copied: 'تم نسخ القائمة', hello: 'مرحبًا، أود طلب المنتجات التالية:',
    qty: 'الكمية', branch: 'الفرع', results: function (n) { return n + ' منتج'; }, remove: 'إزالة', add: 'تمت الإضافة', empty: 'القائمة فارغة'
  } : {
    noNum: 'Demo mode: WhatsApp number not set. Message copied instead.', copied: 'List copied', hello: 'Hello, I would like to request these products:',
    qty: 'Qty', branch: 'Branch', results: function (n) { return n + (n === 1 ? ' product' : ' products'); }, remove: 'Remove', add: 'Added', empty: 'List is empty'
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // toast
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  // mobile menu
  var mb = $('#menuBtn'), nav = $('#nav');
  if (mb && nav) {
    mb.addEventListener('click', function () {
      var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.focus(); }
    });
  }

  // open/closed status in Riyadh time
  function riyadhHour() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var h = 0, m = 0; p.forEach(function (x) { if (x.type === 'hour') h = +x.value % 24; if (x.type === 'minute') m = +x.value; });
      return h + m / 60;
    } catch (e) { return null; }
  }
  $$('.open-status').forEach(function (el) {
    var h = riyadhHour(); if (h === null) return;
    var from = +el.dataset.openFrom, to = +el.dataset.openTo, on = h >= from && h < to;
    el.textContent = on ? el.dataset.openLabel : el.dataset.closedLabel; el.classList.add(on ? 'on' : 'off');
  });

  // WhatsApp helper (safe: never sends anywhere unless a number is configured)
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
    [[n, $('#eName')], [m, $('#eMsg')]].forEach(function (p) {
      var bad = !p[0].value.trim(); p[1].hidden = !bad; p[0].setAttribute('aria-invalid', bad ? 'true' : 'false'); if (bad) ok = false;
    });
    if (!ok) { (n.value.trim() ? m : n).focus(); return; }
    var b = $('#cBranch'); var bn = b.options[b.selectedIndex].text;
    openWa(n.value.trim() + ' (' + T.branch + ': ' + bn + ')\n' + m.value.trim());
  });

  // ---- products page
  var grid = $('#grid'); if (!grid) return;
  var cards = $$('.product', grid), q = $('#q'), sort = $('#sort'), chips = $$('.chip');
  var cat = 'all', KEY = 'albaida_demo_cart_v1';
  function norm(s) { return s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'); }
  function apply() {
    var term = norm(q.value.trim()), shown = 0;
    cards.forEach(function (c) {
      var ok = (cat === 'all' || c.dataset.cat === cat) && (!term || norm(c.dataset.name).indexOf(term) > -1);
      c.hidden = !ok; if (ok) shown++;
    });
    var arr = cards.slice(), v = sort.value;
    if (v === 'plh') arr.sort(function (a, b) { return a.dataset.price - b.dataset.price; });
    else if (v === 'phl') arr.sort(function (a, b) { return b.dataset.price - a.dataset.price; });
    else if (v === 'az') arr.sort(function (a, b) { return a.dataset.name.localeCompare(b.dataset.name, isAr ? 'ar' : 'en'); });
    else arr.sort(function (a, b) { return a.dataset.id < b.dataset.id ? -1 : 1; });
    arr.forEach(function (c) { grid.appendChild(c); });
    $('#resultCount').textContent = T.results(shown); $('#empty').hidden = shown !== 0;
  }
  function setCat(c) {
    cat = c; chips.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.filter === c ? 'true' : 'false'); }); apply();
  }
  chips.forEach(function (b) { b.addEventListener('click', function () { setCat(b.dataset.filter); }); });
  q.addEventListener('input', apply); sort.addEventListener('change', apply);
  var m = /cat=([a-z]+)/.exec(location.hash); if (m && chips.some(function (b) { return b.dataset.filter === m[1]; })) cat = m[1];
  setCat(cat);

  // cart (kept in this browser only)
  var cart = {};
  try { var raw = JSON.parse(localStorage.getItem(KEY) || '{}'); if (raw && typeof raw === 'object') Object.keys(raw).forEach(function (k) {
    var el = $('.product[data-id="' + k + '"]'); var n = parseInt(raw[k], 10); if (el && n > 0 && n < 100) cart[k] = n; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  var drawer = $('#drawer'), list = $('#cartList'), lastFocus;
  function titleOf(id) { var el = $('.product[data-id="' + id + '"] h3'); return el ? el.textContent : id; }
  function render() {
    var ids = Object.keys(cart), total = 0;
    list.textContent = '';
    ids.forEach(function (id) {
      total += cart[id];
      var li = document.createElement('li'), s = document.createElement('span'); s.textContent = titleOf(id);
      var qd = document.createElement('div'); qd.className = 'qty';
      function btn(t, label, d) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.setAttribute('aria-label', label + ' ' + titleOf(id));
        b.addEventListener('click', function () { cart[id] += d; if (cart[id] <= 0) delete cart[id]; if (cart[id] > 99) cart[id] = 99; save(); render(); }); return b; }
      var n = document.createElement('span'); n.textContent = cart[id]; n.setAttribute('aria-label', T.qty);
      qd.appendChild(btn('−', T.remove, -1)); qd.appendChild(n); qd.appendChild(btn('+', T.add, 1));
      li.appendChild(s); li.appendChild(qd); list.appendChild(li);
    });
    $('#cartCount').textContent = total; $('#cartEmpty').hidden = ids.length > 0;
  }
  $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () {
    var id = b.dataset.id; cart[id] = Math.min(99, (cart[id] || 0) + 1); save(); render(); toast(T.add + ': ' + b.dataset.title); }); });
  function open() { lastFocus = document.activeElement; drawer.hidden = false; $('#closeCart').focus(); }
  function close() { drawer.hidden = true; if (lastFocus) lastFocus.focus(); }
  $('#openCart').addEventListener('click', open); $('#closeCart').addEventListener('click', close);
  drawer.addEventListener('click', function (e) { if (e.target === drawer) close(); });
  document.addEventListener('keydown', function (e) {
    if (drawer.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // focus trap
      var f = $$('button,select,[href],input', drawer).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return; var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  function text() {
    var b = $('#cartBranch'); var lines = [T.hello];
    Object.keys(cart).forEach(function (id) { lines.push('- ' + titleOf(id) + ' × ' + cart[id]); });
    lines.push(T.branch + ': ' + b.options[b.selectedIndex].text); return lines.join('\n');
  }
  $('#sendWa').addEventListener('click', function () { if (!Object.keys(cart).length) { toast(T.empty); return; } openWa(text()); });
  $('#copyList').addEventListener('click', function () {
    if (!Object.keys(cart).length) { toast(T.empty); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text()).then(function () { toast(T.copied); }, function () {}); });
  $('#clearCart').addEventListener('click', function () { cart = {}; save(); render(); });
  render();
})();
