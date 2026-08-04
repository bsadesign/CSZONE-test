/* ==========================================================================
   CS:ZONE — общий скрипт сайта. Без зависимостей.
   ========================================================================== */
(function () {
  'use strict';

  var CLUB = {
    tel:     '+79180080885',
    telH:    '8 918 008-08-85',
    tg:      'https://t.me/cszoneclub',      // канал клуба: анонсы, акции
    tgAdmin: 'https://t.me/cszone_admin',    // администратор: сюда уходит бронь
    addr:    'г. Краснодар, ул. Командорская 3к2'
  };

  /* ------------------------------------------------------------------------
     ЖЕЛЕЗО — единственный источник правды.
     Отсюда берут данные: страница «Железо», подсказка при наведении на место
     и панель выбранного места на странице брони. Правите здесь — меняется всюду.
     ------------------------------------------------------------------------ */
  var SPECS = {
    standart: {
      label: 'STANDART',
      core: [
        ['Процессор',  'Intel Core i5-10400F'],
        ['Видеокарта', 'RTX 2060 SUPER 8 ГБ'],
        ['ОЗУ',        '16 ГБ DDR4 3200']
      ],
      gear: [
        ['Монитор',    'ASUS, 165 Гц, 25/27″'],
        ['Клавиатура', 'ASUS TUF Gaming K3'],
        ['Наушники',   'IO Graphite 2'],
        ['Мышь',       'Logitech G102']
      ]
    },
    bootcamp: {
      label: 'BOOTCAMP',
      core: [
        ['Процессор',  'Intel Core i5-10400F'],
        ['Видеокарта', 'RTX 3060'],
        ['ОЗУ',        '16 ГБ DDR4 3200']
      ],
      gear: [
        ['Монитор',    'ASUS, 280 Гц, 25/27″'],
        ['Клавиатура', 'ASUS ROG Strix NX'],
        ['Наушники',   'HyperX Cloud II'],
        ['Мышь',       'Free Wolf A7 / Logitech G403']
      ]
    },
    tv: {
      label: 'TV',
      core: [['Экран', 'Телевизор 65″']],
      gear: []
    }
  };

  /* ------------------------------------------------------------------------
     СТРУКТУРА ЗАЛА — нумерация подтверждена заказчиком.
     Буткемп I — №01–05, зал STANDART — №06–30, Буткемп II — №31–36.
     ------------------------------------------------------------------------ */
  var HALL = [
    { key: 'bootcamp1', title: 'Буткемп I',     meta: '5 мест · №01–05',  from: 1,  to: 5  },
    { key: 'standart',  title: 'Зал STANDART',  meta: '25 мест · №06–30', from: 6,  to: 30 },
    { key: 'bootcamp2', title: 'Буткемп II',    meta: '6 мест · №31–36',  from: 31, to: 36 }
  ];
  var TVZONES = [
    { key: 'tv',  label: 'TV 1', sub: 'STANDART' },
    { key: 'tv',  label: 'TV 2', sub: 'STANDART' },
    { key: 'vip', label: 'VIP',  sub: 'TV VIP'   }
  ];

  /* Машины, снятые с линии. Их нет и в выдаче API — статус им не приходит,
     поэтому помечаем вручную: место видно на схеме, но выбрать его нельзя.
     Вернулись в строй — убрать номер отсюда, больше нигде править не нужно. */
  var OUT_OF_SERVICE = [15, 16, 17, 18, 19];
  var OUT_TEXT = 'временно не работает';

  var ZONE_NAME = {
    standart: 'Зал STANDART', bootcamp1: 'Буткемп I', bootcamp2: 'Буткемп II',
    tv: 'Standart TV', vip: 'TV VIP'
  };
  /* какая конфигурация стоит в какой зоне */
  var ZONE_SPEC = {
    standart: 'standart', bootcamp1: 'bootcamp', bootcamp2: 'bootcamp',
    tv: 'tv', vip: 'tv'
  };

  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* у ТВ-зон «место» звучит криво — там экран */
  function seatWord(zone) { return (zone === 'tv' || zone === 'vip') ? 'экран' : 'место'; }

  function specRows(spec) {
    var row = function (r) {
      return '<div class="sp__r"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
    };
    var html = spec.core.map(row).join('');
    if (spec.gear.length) html += '<div class="sp__div"></div>' + spec.gear.map(row).join('');
    return '<dl class="sp">' + html + '</dl>';
  }

  /* ------------------------------------------------------- мобильное меню */
  function menu() {
    var b = $('.burger'), d = $('.drawer');
    if (!b || !d) return;
    var toggle = function (open) {
      if (open) { d.setAttribute('data-open', ''); } else { d.removeAttribute('data-open'); }
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    b.addEventListener('click', function () { toggle(!d.hasAttribute('data-open')); });
    $$('a', d).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* ------------------------------------------------------ появление блоков */
  function reveals() {
    var items = $$('[data-rise]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); }); return;
    }
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (r) {
        if (!r.isIntersecting) return;
        var d = r.target.getAttribute('data-rise');
        r.target.style.transitionDelay = (d ? parseInt(d, 10) : 0) + 'ms';
        r.target.classList.add('is-in');
        io.unobserve(r.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------ карта зала */
  function seatEl(label, sub, zone, value, extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'seat' + (extraClass ? ' ' + extraClass : '');
    b.setAttribute('data-zone', zone);
    b.setAttribute('data-value', value);
    b.setAttribute('aria-label', ZONE_NAME[zone] + ', ' + seatWord(zone) + ' ' + label +
      ' — ' + SPECS[ZONE_SPEC[zone]].label);
    b.innerHTML = label + '<small>' + sub + '</small>';
    return b;
  }

  function hallMap() {
    var host = $('[data-hall]');
    if (!host) return;
    var mode = host.getAttribute('data-hall'); // "link" (главная) | "pick" (бронь)

    HALL.forEach(function (g) {
      var wrap = document.createElement('div');
      wrap.className = 'hall__group';
      wrap.innerHTML = '<div class="hall__gt"><b>' + g.title + '</b><span>' + g.meta +
        ' · ' + SPECS[ZONE_SPEC[g.key]].label + '</span></div>';
      var grid = document.createElement('div');
      grid.className = 'seats';
      for (var n = g.from; n <= g.to; n++) {
        var out = OUT_OF_SERVICE.indexOf(n) >= 0;
        var seat = seatEl(pad(n), out ? 'Не работает' : 'PC', g.key, pad(n),
                          out ? 'seat--out' : '');
        if (out) {
          seat.setAttribute('data-out', '');
          seat.setAttribute('aria-disabled', 'true');
          seat.setAttribute('aria-label',
            ZONE_NAME[g.key] + ', место ' + pad(n) + ' — ' + OUT_TEXT);
        }
        grid.appendChild(seat);
      }
      wrap.appendChild(grid);
      host.appendChild(wrap);
    });

    var tv = document.createElement('div');
    tv.className = 'hall__group';
    tv.innerHTML = '<div class="hall__gt"><b>ТВ-зоны</b><span>3 экрана · 65″</span></div>';
    var tgrid = document.createElement('div');
    tgrid.className = 'seats';
    TVZONES.forEach(function (z) {
      tgrid.appendChild(seatEl(z.label, z.sub, z.key, z.label,
        'seat--tv' + (z.key === 'vip' ? ' seat--vip' : '')));
    });
    tv.appendChild(tgrid);
    host.appendChild(tv);

    tooltip(host);
    liveStatus(host);

    host.addEventListener('click', function (e) {
      var s = e.target.closest ? e.target.closest('.seat') : null;
      if (!s) return;
      var zone = s.getAttribute('data-zone'), val = s.getAttribute('data-value');
      if (mode === 'link') {
        if (s.getAttribute('aria-disabled') === 'true') return;
        window.location.href = 'booking.html?zone=' + zone + '&pc=' + encodeURIComponent(val);
        return;
      }
      if (s.getAttribute('aria-disabled') === 'true') {
        var st = s.getAttribute('data-state');
        var t = $('#booking-toast');
        if (t) {
          t.textContent = s.hasAttribute('data-out')
            ? 'Место ' + val + ' ' + OUT_TEXT + '. Выберите другое.'
            : 'Место ' + val + ' сейчас ' + (STATE_NAME[st] || 'недоступно') +
              '. Выберите другое или уточните у администратора.';
          t.setAttribute('data-on', '');
        }
        return;
      }
      $$('.seat[data-on]', host).forEach(function (o) { o.removeAttribute('data-on'); });
      s.setAttribute('data-on', '');
      setSeat(zone, val);
    });
  }

  /* ------------------------------------------------ ЗАНЯТОСТЬ МЕСТ ------- *
     Данные о занятости берём из API клуба (Cloudflare Worker поверх Gizmo).
     Ответ:

       { "updatedAt": "2026-08-04T15:45:48.099Z",
         "totals": { "all": 31, "free": 19, "occupied": 9,
                     "reserved": 0, "unavailable": 3 },
         "computers": [ { "number": 1, "status": "occupied",
                          "isOutOfOrder": false, "isLocked": false }, … ] }

     API знает не про все 36 мест — те, которых нет в ответе, остаются
     без статуса и кликаются как обычно. Если API недоступен, устарел или
     отдал мусор, карта работает как раньше: сбой на стороне клуба не должен
     ломать сайт. Резервный источник — локальный status.json (старый формат).
     ---------------------------------------------------------------------- */
  var LIVE = {
    url:      'https://cszone-status-api.sburchinskij1.workers.dev/api/pcs',
    fallback: 'status.json',
    pollMs:    30000,  // как часто опрашиваем API
    maxAgeSec: 600     // старше — считаем данные неактуальными
  };
  var STATE_NAME = {
    free: 'свободно', busy: 'занято', reserved: 'забронировано', off: 'выключен'
  };

  /* статусы API -> состояния карты зала */
  var API_STATE = {
    free: 'free', occupied: 'busy', reserved: 'reserved',
    unavailable: 'off', offline: 'off'
  };

  /* Приводим оба формата к одному виду: { updated, hosts: { "01": "free" } } */
  function normalize(data) {
    if (!data) return null;

    if (data.computers && data.computers.length) {
      var hosts = {};
      data.computers.forEach(function (pc) {
        var n = parseInt(pc.number, 10);
        if (!(n > 0)) return;
        var st = API_STATE[pc.status];
        // сломанные и заблокированные машины не предлагаем к брони
        if (pc.isOutOfOrder || pc.isLocked) st = 'off';
        if (st) hosts[pad(n)] = st;
      });
      return { updated: data.updatedAt || data.cloudUpdatedAt, hosts: hosts };
    }

    if (data.hosts) return { updated: data.updated, hosts: data.hosts };
    return null;
  }

  function liveStatus(host) {
    if (!window.fetch) return;
    var pill = $('[data-live]');
    var timer = null;

    function clear() {
      $$('.seat[data-state]', host).forEach(function (s) {
        s.removeAttribute('data-state');
        s.removeAttribute('aria-disabled');
        s.setAttribute('aria-label', s.getAttribute('data-label-base') || s.getAttribute('aria-label'));
      });
      if (pill) pill.hidden = true;
    }

    function apply(raw) {
      var data = normalize(raw);
      if (!data || !data.hosts) { clear(); return; }
      var age = (Date.now() - new Date(data.updated).getTime()) / 1000;
      // небольшое расхождение часов клиента и сервера — не повод прятать данные
      if (!(age > -120) || age > LIVE.maxAgeSec) { clear(); return; }

      $$('.seat', host).forEach(function (s) {
        // машины, снятые с линии, статусами не управляются
        if (s.hasAttribute('data-out')) return;
        var st = data.hosts[s.getAttribute('data-value')];
        if (!STATE_NAME[st]) { s.removeAttribute('data-state'); s.removeAttribute('aria-disabled'); return; }
        s.setAttribute('data-state', st);
        if (st !== 'free') s.setAttribute('aria-disabled', 'true');
        else s.removeAttribute('aria-disabled');
        if (!s.getAttribute('data-label-base')) s.setAttribute('data-label-base', s.getAttribute('aria-label'));
        s.setAttribute('aria-label', s.getAttribute('data-label-base') + ' — ' + STATE_NAME[st]);
      });

      if (pill) {
        var free = $$('.seat[data-state="free"]', host).length;
        var busy = $$('.seat[data-state="busy"]', host).length +
                   $$('.seat[data-state="reserved"]', host).length;
        var t = new Date(data.updated);
        var hhmm = pad(t.getHours()) + ':' + pad(t.getMinutes());
        pill.innerHTML = '<i></i>Данные из клуба · свободно ' + free +
          ' · занято ' + busy + ' · обновлено ' + hhmm;
        pill.hidden = false;
      }
    }

    function get(url) {
      return fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(),
        { cache: 'no-store', mode: 'cors', credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : null; });
    }

    function tick() {
      get(LIVE.url)
        .catch(function () { return null; })
        .then(function (d) {
          // API не ответил — пробуем локальный файл, если клуб его выкладывает
          if (d) return d;
          return get(LIVE.fallback).catch(function () { return null; });
        })
        .then(function (d) { if (d) { apply(d); } else { clear(); } })
        .catch(clear);
    }

    tick();
    timer = setInterval(tick, LIVE.pollMs);
    // не дёргаем сервер клуба, пока вкладку не смотрят
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearInterval(timer); timer = null; }
      else if (!timer) { tick(); timer = setInterval(tick, LIVE.pollMs); }
    });
  }

  /* ------------------------------- характеристики при наведении на место -- */
  function tooltip(host) {
    var box = host.closest('.hall') || host;
    var tip = document.createElement('div');
    tip.className = 'spec-tip';
    tip.setAttribute('aria-hidden', 'true');
    box.appendChild(tip);

    var show = function (seat) {
      var zone = seat.getAttribute('data-zone'), val = seat.getAttribute('data-value');
      var spec = SPECS[ZONE_SPEC[zone]];
      if (seat.hasAttribute('data-out')) {
        tip.innerHTML = '<p class="spec-tip__h"><b>Не работает</b>' +
          '<span>' + esc(ZONE_NAME[zone]) + ' · место ' + esc(val) + '</span></p>' +
          '<p class="spec-tip__t">Машина снята с линии на время ремонта. ' +
          'Выберите соседнее место — железо там такое же.</p>';
      } else {
        tip.innerHTML = '<p class="spec-tip__h"><b>' + esc(spec.label) + '</b>' +
          '<span>' + esc(ZONE_NAME[zone]) + ' · ' + seatWord(zone) + ' ' + esc(val) + '</span></p>' +
          specRows(spec);
      }

      // позиционируем над местом, при нехватке места — под ним
      var b = box.getBoundingClientRect(), s = seat.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var left = (s.left - b.left) + s.width / 2 - w / 2;
      left = Math.max(8, Math.min(left, b.width - w - 8));
      var top = (s.top - b.top) - h - 12;
      if (s.top - h - 12 < 80) { top = (s.top - b.top) + s.height + 12; }
      tip.style.left = Math.round(left) + 'px';
      tip.style.top  = Math.round(top) + 'px';
      tip.setAttribute('data-on', '');
    };
    var hide = function () { tip.removeAttribute('data-on'); };

    var canHover = !window.matchMedia ||
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (canHover) {
      host.addEventListener('mouseover', function (e) {
        var s = e.target.closest ? e.target.closest('.seat') : null;
        if (s) show(s);
      });
      host.addEventListener('mouseleave', hide);
    }
    // с клавиатуры подсказка нужна всегда
    host.addEventListener('focusin', function (e) {
      var s = e.target.closest ? e.target.closest('.seat') : null;
      if (s) show(s);
    });
    host.addEventListener('focusout', hide);
  }

  function setSeat(zone, val) {
    var z = $('#f-zone'), p = $('#f-pc');
    if (z) z.value = zone;
    if (p) p.value = val;
    var live = $('#pick-live');
    if (live) live.textContent = ZONE_NAME[zone] + ' · ' + seatWord(zone) + ' ' + val;
    var panel = $('#spec-panel');
    if (panel) {
      var spec = SPECS[ZONE_SPEC[zone]];
      panel.innerHTML = '<p class="eyebrow">Железо на этом месте</p>' +
        '<p class="spec-panel__h">' + esc(spec.label) + ' · ' + esc(ZONE_NAME[zone]) +
        ' · ' + seatWord(zone) + ' ' + esc(val) + '</p>' + specRows(spec);
      panel.hidden = false;
    }
  }

  /* --------------------------------------------------------- форма брони */
  function booking() {
    var form = $('#booking-form');
    if (!form) return;

    var q = new URLSearchParams(window.location.search);
    if (q.get('pc')) {
      var zone = q.get('zone');
      if (!ZONE_NAME[zone]) zone = 'standart';
      setSeat(zone, q.get('pc'));
      var s = $('.seat[data-value="' + q.get('pc') + '"][data-zone="' + zone + '"]');
      if (s) s.setAttribute('data-on', '');
    }
    var d = $('#f-date');
    if (d && !d.value) {
      var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      d.value = t.toISOString().slice(0, 10);
      d.min = d.value;
    }
    // выбор зоны руками сбрасывает подсветку места, если оно из другой зоны
    var zsel = $('#f-zone');
    if (zsel) zsel.addEventListener('change', function () {
      var on = $('.seat[data-on]');
      if (on && on.getAttribute('data-zone') !== zsel.value) {
        on.removeAttribute('data-on');
        if ($('#f-pc')) $('#f-pc').value = '';
        setSeat(zsel.value, 'любое свободное');
        if ($('#f-pc')) $('#f-pc').value = '';
      }
    });

    function text() {
      var g = function (id) { var el = $(id); return el ? el.value.trim() : ''; };
      var zv = $('#f-zone') ? $('#f-zone').value : '';
      var lines = [
        'Заявка на бронь — CS:ZONE',
        'Имя: ' + (g('#f-name') || '—'),
        'Телефон: ' + (g('#f-phone') || '—'),
        'Дата: ' + (g('#f-date') || '—') + ', время: ' + (g('#f-time') || '—'),
        'Длительность: ' + (g('#f-hours') || '—') + ' ч',
        'Зона: ' + (ZONE_NAME[zv] || '—') +
          (g('#f-pc') ? ', ' + seatWord(zv) + ' ' + g('#f-pc') : ''),
        'Гостей: ' + (g('#f-people') || '1')
      ];
      if (g('#f-note')) lines.push('Комментарий: ' + g('#f-note'));
      return lines.join('\n');
    }

    function flash(msg) {
      var t = $('#booking-toast');
      if (!t) return;
      t.textContent = msg;
      t.setAttribute('data-on', '');
      clearTimeout(flash.t);
      flash.t = setTimeout(function () { t.removeAttribute('data-on'); }, 6000);
    }

    function valid() {
      var need = ['#f-name', '#f-phone', '#f-date', '#f-time'];
      for (var i = 0; i < need.length; i++) {
        var el = $(need[i]);
        if (el && !el.value.trim()) {
          el.focus();
          flash('Заполните: ' + $('label[for="' + el.id + '"]').textContent.toLowerCase());
          return false;
        }
      }
      return true;
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); });

    var send = $('#btn-send');
    if (send) send.addEventListener('click', function () {
      if (!valid()) return;
      var msg = text();
      var open = function () { window.open(CLUB.tgAdmin, '_blank', 'noopener'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function () {
          flash('Заявка скопирована. Вставьте её в Telegram и отправьте — администратор подтвердит бронь.');
          open();
        }, function () { flash('Скопировать не удалось. Позвоните — ' + CLUB.telH); open(); });
      } else { flash('Открываем Telegram. Заявку продиктуйте или вставьте вручную.'); open(); }
    });

    var copy = $('#btn-copy');
    if (copy) copy.addEventListener('click', function () {
      if (!valid()) return;
      var msg = text();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function () { flash('Текст заявки скопирован.'); });
      } else { flash('Скопируйте вручную:\n' + msg); }
    });
  }

  /* ------------------------------------------------- страница «Железо» --- */
  function renderHardware() {
    var host = $('[data-hardware]');
    if (!host) return;
    var a = SPECS.standart, b = SPECS.bootcamp;
    var line = function (i, set) {
      return '<tr><th scope="row">' + esc(a[set][i][0]) + '</th>' +
             '<td>' + esc(a[set][i][1]) + '</td>' +
             '<td>' + esc(b[set][i][1]) + '</td></tr>';
    };
    var rows = a.core.map(function (_, i) { return line(i, 'core'); }).join('') +
      '<tr class="tbl__div"><td colspan="3"></td></tr>' +
      a.gear.map(function (_, i) { return line(i, 'gear'); }).join('');

    // на узком экране трёхколоночное сравнение не читается — стопкой
    var stacked = ['standart', 'bootcamp'].map(function (k) {
      var z = SPECS[k];
      var meta = k === 'standart' ? '25 ПК · №06–30' : '11 ПК · №01–05 + №31–36';
      return '<div class="hw-stack"><p class="hw-stack__h"><b>' + esc(z.label) + '</b>' +
        '<span>' + esc(meta) + '</span></p>' + specRows(z) + '</div>';
    }).join('');

    host.innerHTML =
      '<div class="panel cut-l only-wide" data-rise>' +
        '<table class="tbl tbl--cmp">' +
          '<caption>Конфигурации по зонам</caption>' +
          '<thead><tr><th>Конфигурация</th>' +
            '<th>STANDART<span>25 ПК · №06–30</span></th>' +
            '<th>BOOTCAMP<span>11 ПК · №01–05 + №31–36</span></th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="panel cut-l only-narrow" data-rise>' + stacked + '</div>' +
      '<div class="panel cut-l" data-rise="90">' +
        '<p class="eyebrow">ТВ-зоны</p>' +
        '<h3 style="margin-top:14px;font-size:1.3rem">Два Standart TV и TV VIP</h3>' +
        '<p style="margin-top:12px;color:var(--ash);max-width:56ch">' +
          'В каждой ТВ-зоне телевизор 65″. Играть можно компанией — по брони.</p>' +
      '</div>';
    reveals();
  }

  /* ------------------------------------------------------- ПРАЙС --------- *
     Цены заказчика. Одна структура на страницу «Цены» и на блок на главной.
     Два временных окна: 08:00–17:00 и 17:00–08:00.
     ---------------------------------------------------------------------- */
  var PRICES = {
    packs: [
      { label: '1 час',   hours: 1 },
      { label: '3 часа',  hours: 3 },
      { label: '5 часов', hours: 5 }
    ],
    windows: [
      { key: 'day', label: 'Днём',    when: '08:00–17:00' },
      { key: 'eve', label: 'Вечером', when: '17:00–08:00' }
    ],
    zones: [
      { name: 'Зал STANDART', sub: 'RTX 2060 SUPER · 165 Гц · №06–30',
        weekday: { day: [120, 320, 470], eve: [130, 340, 510] },
        weekend: { day: [130, 340, 510], eve: [150, 400, 590] } },
      { name: 'Буткемпы I и II', sub: 'RTX 3060 · 280 Гц · №01–05 + №31–36',
        weekday: { day: [130, 340, 510], eve: [150, 400, 590] },
        weekend: { day: [150, 400, 590], eve: [170, 450, 680] } },
      { name: 'Аренда TV', sub: '65″ · до 2 человек',
        weekday: { day: [230, 520, 790],  eve: [270, 610, 930] },
        weekend: { day: [270, 610, 930],  eve: [310, 700, 1070] } },
      { name: 'Аренда TV VIP', sub: '65″ · до 2 человек',
        weekday: { day: [300, 670, 1040], eve: [340, 760, 1180] },
        weekend: { day: [340, 760, 1180], eve: [380, 850, 1320] } }
    ],
    night: {
      title: 'Ночь', when: '21:00–08:00', hours: 11,
      rows: [
        { name: 'Зал STANDART',  weekday: 550,  weekend: 600  },
        { name: 'Буткемпы',      weekday: 650,  weekend: 700  },
        { name: 'Аренда TV VIP', weekday: 1450, weekend: 1500 }
      ]
    },
    marathon: {
      title: 'Марафон', when: '24 часа', hours: 24,
      rows: [
        { name: 'Зал STANDART', price: 1500 },
        { name: 'Буткемпы',     price: 1700 }
      ]
    }
  };

  /* -------------------------------------------------------- АКЦИИ -------- */
  var PROMOS = [
    { mark: 'НОЧЬ', title: 'Энергетик в подарок',
      text: 'Забронировали ночь — банка ваша.',
      cond: 'При покупке тарифа «Ночь» энергетик получает каждый гость.' },
    { mark: '5 → 4', title: 'Пятый в команде играет бесплатно',
      text: 'Приходите составом на буткемп — оплачиваете четыре места из пяти.',
      cond: 'Действует при покупке любого пакета времени.' },
    { mark: '+100 ₽', title: 'Отзыв — 100 ₽ на баланс',
      text: 'Расскажите, как поиграли, и получите деньги на игровой счёт.',
      cond: 'Отзыв о клубе — 100 ₽ на баланс, начисляет администратор.',
      href: 'https://yandex.ru/maps/org/cs_zone/221049266006/reviews/',
      hrefLabel: 'Оставить отзыв' }
  ];

  /* неразрывные пробелы: «1 500 ₽» не должно разрываться переносом */
  var rub = function (n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0₽';
  };
  var perHour = function (price, hours) {
    return hours > 1 ? '≈ ' + Math.round(price / hours) + ' ₽/час' : '';
  };

  function renderPrices() {
    var host = $('[data-prices]');
    if (!host) return;
    var mode = 'weekday';

    function zoneCard(z) {
      var head = '<div class="tariff__h"><h3>' + esc(z.name) + '</h3>' +
        '<span>' + esc(z.sub) + '</span></div>';
      var cols = PRICES.windows.map(function (w) {
        var rows = PRICES.packs.map(function (pk, i) {
          var price = z[mode][w.key][i];
          var ph = perHour(price, pk.hours);
          return '<div class="tariff__r"><span class="tariff__pk">' + esc(pk.label) + '</span>' +
            '<span class="tariff__p">' + rub(price) +
            (ph ? '<i>' + ph + '</i>' : '') + '</span></div>';
        }).join('');
        return '<div class="tariff__col"><p class="tariff__w"><b>' + esc(w.label) + '</b>' +
          '<span>' + esc(w.when) + '</span></p>' + rows + '</div>';
      }).join('');
      return '<article class="tariff cut">' + head +
        '<div class="tariff__cols">' + cols + '</div></article>';
    }

    function nightCard() {
      var n = PRICES.night;
      var rows = n.rows.map(function (r) {
        return '<div class="tariff__r"><span class="tariff__pk">' + esc(r.name) + '</span>' +
          '<span class="tariff__p">' + rub(r[mode]) +
          '<i>' + perHour(r[mode], n.hours) + '</i></span></div>';
      }).join('');
      return '<article class="tariff tariff--wide cut">' +
        '<div class="tariff__h"><h3>' + esc(n.title) + '</h3><span>' + esc(n.when) +
        ' · 11 часов</span></div><div class="tariff__col">' + rows + '</div></article>';
    }

    function marathonCard() {
      var m = PRICES.marathon;
      var rows = m.rows.map(function (r) {
        return '<div class="tariff__r"><span class="tariff__pk">' + esc(r.name) + '</span>' +
          '<span class="tariff__p">' + rub(r.price) +
          '<i>' + perHour(r.price, m.hours) + '</i></span></div>';
      }).join('');
      return '<article class="tariff tariff--wide cut">' +
        '<div class="tariff__h"><h3>' + esc(m.title) + '</h3><span>' + esc(m.when) +
        ' подряд · одна цена</span></div><div class="tariff__col">' + rows + '</div></article>';
    }

    function draw() {
      host.innerHTML =
        '<div class="seg" role="group" aria-label="День недели">' +
          '<button type="button" class="seg__b" data-mode="weekday"' +
            (mode === 'weekday' ? ' data-on aria-pressed="true"' : ' aria-pressed="false"') +
            '>Будни</button>' +
          '<button type="button" class="seg__b" data-mode="weekend"' +
            (mode === 'weekend' ? ' data-on aria-pressed="true"' : ' aria-pressed="false"') +
            '>Выходные</button>' +
        '</div>' +
        '<div class="tariffs">' + PRICES.zones.map(zoneCard).join('') + '</div>' +
        '<div class="tariffs tariffs--2">' + nightCard() + marathonCard() + '</div>';
    }

    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.seg__b') : null;
      if (!b || b.getAttribute('data-mode') === mode) return;
      mode = b.getAttribute('data-mode');
      draw();
    });

    draw();
    var soon = $('[data-soon]'); if (soon) soon.hidden = true;
  }

  /* блок «от какой цены» на главной — из тех же данных, чтобы не расходились */
  function renderPriceTeaser() {
    var host = $('[data-price-teaser]');
    if (!host) return;
    var cells = PRICES.zones.map(function (z) {
      return '<div><dt>' + esc(z.name) + '</dt><dd>' + z.weekday.day[0] +
        '<small>₽/час</small></dd></div>';
    }).join('');
    host.innerHTML = '<dl class="facts">' + cells + '</dl>' +
      '<p class="hall__note" style="margin-top:22px">Будни днём, один час. ' +
      'Ночь ' + esc(PRICES.night.when) + ' — от ' + rub(PRICES.night.rows[0].weekday) +
      ', марафон 24 часа — от ' + rub(PRICES.marathon.rows[0].price) + '. ' +
      '<a href="prices.html" style="color:var(--amber)">Весь прайс</a></p>';
  }

  function renderPromos() {
    var host = $('[data-promos]');
    if (!host || !PROMOS.length) return;
    host.innerHTML = PROMOS.map(function (pr, i) {
      return '<article class="promo cut" data-rise="' + (i * 80) + '">' +
        '<p class="promo__mark">' + esc(pr.mark) + '</p>' +
        '<h3>' + esc(pr.title) + '</h3>' +
        '<p class="promo__t">' + esc(pr.text) + '</p>' +
        (pr.href ? '<a class="btn btn--ghost btn--sm" href="' + pr.href +
          '" target="_blank" rel="noopener" style="align-self:flex-start">' +
          esc(pr.hrefLabel) + '</a>' : '') +
        '<p class="promo__cond">' + esc(pr.cond) + '</p></article>';
    }).join('');
    var soon = $('[data-soon]'); if (soon) soon.hidden = true;
    reveals();
  }

  /* ---------------------------------------------------------------- старт */
  function init() {
    menu(); reveals(); hallMap(); booking();
    renderPrices(); renderPriceTeaser(); renderPromos(); renderHardware();
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
