(function () {
  'use strict';
  var C = window.INVITE || {};
  var $ = function (id) { return document.getElementById(id); };
  var plain = function (s) { return String(s || '').replace(/[ً-ٰٟ]/g, '').trim(); };
  var groom = C.groom || '';
  var bride = C.bride || '';
  var monogram = plain(groom).charAt(0) + ' ' + plain(bride).charAt(0);
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Time (Asia/Amman) ---------- */
  function ammanOffset(ts) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Amman', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var p = {};
    f.formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  function target() {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(C.eventDate || '').trim());
    if (!m) return null;
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    var t = guess - ammanOffset(guess);
    var o2 = ammanOffset(t);
    if (guess - o2 !== t) t = guess - o2;
    return isNaN(t) ? null : t;
  }
  var T = target();

  /* ---------- Fill content ---------- */
  function ph(text) { var s = document.createElement('span'); s.className = 'ph'; s.textContent = '[ ' + text + ' ]'; return s; }
  var dateLabel = null, timeLabel = null, shortTime = null;
  if (T !== null) {
    dateLabel = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { timeZone: 'Asia/Amman', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(T));
    var tf = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { timeZone: 'Asia/Amman', hour: 'numeric', minute: '2-digit' });
    var hm = function (t) { return tf.formatToParts(new Date(t)).filter(function (x) { return x.type === 'hour' || x.type === 'minute' || x.type === 'literal' && x.value === ':'; }).map(function (x) { return x.value; }).join(''); };
    var em = /^(\d{2}):(\d{2})$/.exec(String(C.endTime || '').trim());
    if (em) {
      var E = T + ((+em[1] * 60 + +em[2]) - (+String(C.eventDate).slice(11, 13) * 60 + +String(C.eventDate).slice(14, 16))) * 60000;
      timeLabel = 'من ' + hm(T) + ' حتى ' + hm(E) + ' مساءً';
      shortTime = hm(T) + ' – ' + hm(E) + ' مساءً';
    } else {
      timeLabel = 'الساعة ' + tf.format(new Date(T));
    }
  }
  var values = {
    groom: groom, bride: bride, monogram: monogram,
    date: dateLabel || ph('التاريخ'),
    time: shortTime || timeLabel || ph('الوقت'),
    timeFull: timeLabel || ph('يُحدَّد لاحقًا'),
    venue: (C.venueName || '').trim() || ph('اسم القاعة'),
    address: (C.venueAddress || '').trim() || null
  };
  document.querySelectorAll('[data-f]').forEach(function (el) {
    var v = values[el.getAttribute('data-f')];
    if (v == null) return;
    el.textContent = '';
    el.appendChild(typeof v === 'string' ? document.createTextNode(v) : v.cloneNode(true));
  });
  if (!(C.venueAddress || '').trim()) { var al = $('addrLine'); if (al) al.remove(); }

  /* ---------- Countdown ---------- */
  var nf = new Intl.NumberFormat('ar-u-nu-arab', { minimumIntegerDigits: 2, useGrouping: false });
  var cd = [$('cd-d'), $('cd-h'), $('cd-m'), $('cd-s')];
  var timer = null;
  function tick() {
    var now = Date.now();
    if (now >= T) {
      $('countWrap').hidden = true; $('celebrate').hidden = false;
      clearInterval(timer); return;
    }
    var s = Math.floor((T - now) / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    [d, h, m, s].forEach(function (n, i) { cd[i].textContent = nf.format(n); });
  }
  if (T !== null) {
    $('countNote').hidden = true;
    cd.forEach(function (el) { el.classList.remove('idle'); });
    tick();
    timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && $('countWrap').hidden === false) tick(); });
  }

  /* ---------- Map ---------- */
  var mapBtn = $('mapBtn');
  if (/^https?:\/\//i.test(String(C.mapsUrl || '').trim())) {
    mapBtn.href = C.mapsUrl.trim(); mapBtn.removeAttribute('aria-disabled'); $('mapHint').hidden = true;
  } else {
    mapBtn.classList.add('off'); mapBtn.addEventListener('click', function (e) { e.preventDefault(); });
  }

  /* ---------- Music (only after user gesture) ---------- */
  var audio = null, musicBtn = $('musicBtn');
  var src = String(C.musicUrl || '').trim();
  function setPlaying(on) {
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', on ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
    $('icPlay').hidden = on; $('icPause').hidden = !on;
  }
  function play() {
    if (!src) return;
    if (!audio) { audio = new Audio(src); audio.loop = true; audio.volume = 0.55; audio.preload = 'none'; }
    var p = audio.play();
    if (p && p.then) p.then(function () { setPlaying(true); }, function () { setPlaying(false); }); else setPlaying(true);
  }
  if (src) {
    musicBtn.addEventListener('click', function () {
      if (audio && !audio.paused) { audio.pause(); setPlaying(false); } else play();
    });
  }

  /* ---------- Open the envelope ---------- */
  var intro = $('intro'), env = $('env'), main = $('main'), openBtn = $('openBtn');
  function open() {
    if (openBtn.disabled) return;
    openBtn.disabled = true;
    play();
    env.classList.add('is-opening'); intro.classList.add('opening');
    setTimeout(function () {
      main.hidden = false;
      intro.classList.add('leaving');
      if (src) musicBtn.hidden = false;
    }, reduced ? 50 : 2300);
    setTimeout(function () { intro.classList.add('gone'); main.querySelector('h2').setAttribute('tabindex', '-1'); }, reduced ? 100 : 3300);
  }
  openBtn.addEventListener('click', open);
  if (location.hash === '#open') { reduced = true; open(); }
})();
