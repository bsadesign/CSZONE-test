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
  /* Характеристики машин приходят из HTML: build.py кладёт их в <head>
     одним JSON-блоком. Здесь они нужны только для подсказки на карте зала —
     таблица железа собирается на сборке и лежит в разметке готовой. */
  var SPECS = window.CSZONE_SPECS || {};

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

  /* Компьютеры, снятые с линии. Их нет и в выдаче API — статус им не приходит,
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

  /* «1 компьютер · 2 компьютера · 5 компьютеров» */
  function plural(n, one, few, many) {
    var d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return one;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  }
  function seatNoun(zone, n) {
    return (zone === 'tv' || zone === 'vip')
      ? plural(n, 'экран', 'экрана', 'экранов')
      : plural(n, 'компьютер', 'компьютера', 'компьютеров');
  }

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
        var seat = seatEl(pad(n), out ? 'Не работает' : 'Компьютер', g.key, pad(n),
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
      // Выбор набирается по одному месту: повторный клик снимает.
      // Так можно взять 01, 02, 03, 04 — это четыре компьютера в заявке.
      if (s.hasAttribute('data-on')) { s.removeAttribute('data-on'); }
      else { s.setAttribute('data-on', ''); }
      syncPick();
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
        // сломанные и заблокированные компьютеры не предлагаем к брони
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
        // компьютеры, снятые с линии, статусами не управляются
        if (s.hasAttribute('data-out')) return;
        var st = data.hosts[s.getAttribute('data-value')];
        if (!STATE_NAME[st]) { s.removeAttribute('data-state'); s.removeAttribute('aria-disabled'); return; }
        s.setAttribute('data-state', st);
        if (st !== 'free') {
          s.setAttribute('aria-disabled', 'true');
          // место заняли, пока гость заполнял заявку — тихо снимаем его с выбора
          s.removeAttribute('data-on');
        } else { s.removeAttribute('aria-disabled'); }
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
      syncPick();
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
          '<p class="spec-tip__t">Компьютер снят с линии на время ремонта. ' +
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

  /* --------------------------------------------------- выбранные места ---
     Отдельного состояния нет: что подсвечено в разметке, то и выбрано.
     Расходиться нечему — форма всегда пересобирается из того, что видит гость.
     ---------------------------------------------------------------------- */
  function picked() {
    var host = $('[data-hall="pick"]');
    // querySelectorAll возвращает узлы в порядке разметки, то есть по номерам
    return host ? $$('.seat[data-on]', host) : [];
  }

  /* Выбор по зонам: [{ zone: 'bootcamp1', vals: ['01','02'] }, …] */
  function pickByZone(list) {
    var out = [];
    list.forEach(function (s) {
      var z = s.getAttribute('data-zone'), hit = null;
      out.forEach(function (g) { if (g.zone === z) hit = g; });
      if (!hit) { hit = { zone: z, vals: [] }; out.push(hit); }
      hit.vals.push(s.getAttribute('data-value'));
    });
    return out;
  }

  function syncPick() {
    var list  = picked();
    var zsel  = $('#f-zone'), pcs = $('#f-pc');
    var live  = $('#pick-live'), clear = $('#pick-clear');
    var panel = $('#spec-panel');

    if (clear) clear.hidden = !list.length;

    if (!list.length) {
      if (pcs)   pcs.value = '';
      if (live)  live.textContent = 'пока ничего';
      if (panel) { panel.hidden = true; panel.innerHTML = ''; }
      return;
    }

    var groups = pickByZone(list);
    var vals   = list.map(function (s) { return s.getAttribute('data-value'); });
    var zone   = list[0].getAttribute('data-zone');
    var n      = vals.length;

    // в выпадающем списке одна зона — показываем ту, откуда первое место
    if (zsel) zsel.value = zone;
    if (pcs)  pcs.value  = vals.join(', ');
    if (live) {
      // места из разных зон — подписываем, из каких именно
      var listing = groups.length > 1
        ? groups.map(function (g) { return ZONE_NAME[g.zone] + ' ' + g.vals.join(', '); }).join(' · ')
        : vals.join(', ');
      live.textContent = n + ' ' + seatNoun(zone, n) + ' — ' + listing;
    }

    // «Гостей» подставляем по числу мест, но только пока гость не правил поле сам
    var ppl = $('#f-people');
    if (ppl && !ppl.hasAttribute('data-touched')) {
      ppl.value = n <= 5 ? String(n) : (n <= 10 ? '6–10' : 'Больше 10');
    }

    if (panel) {
      var specs = [];
      list.forEach(function (s) {
        var k = ZONE_SPEC[s.getAttribute('data-zone')];
        if (specs.indexOf(k) < 0) specs.push(k);
      });
      var body = specs.map(function (k) {
        var sp = SPECS[k];
        return (specs.length > 1
          ? '<p class="spec-panel__h" style="margin-top:18px">' + esc(sp.label) + '</p>'
          : '') + specRows(sp);
      }).join('');
      panel.innerHTML =
        '<p class="eyebrow">Железо на выбранных местах</p>' +
        '<p class="spec-panel__h">' + esc(groups.map(function (g) {
          return ZONE_NAME[g.zone] + ' — ' + g.vals.join(', ');
        }).join(' · ')) + '</p>' + body;
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
      var s = $('.seat[data-value="' + q.get('pc') + '"][data-zone="' + zone + '"]');
      if (s && s.getAttribute('aria-disabled') !== 'true') s.setAttribute('data-on', '');
    }
    syncPick();

    var d = $('#f-date');
    if (d && !d.value) {
      var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      d.value = t.toISOString().slice(0, 10);
      d.min = d.value;
    }

    // гость поправил число гостей руками — больше не подставляем его сами
    var ppl = $('#f-people');
    if (ppl) ppl.addEventListener('change', function () {
      ppl.setAttribute('data-touched', '');
    });

    // зону выбрали руками — набранные на схеме места сбрасываем
    var zsel = $('#f-zone');
    if (zsel) zsel.addEventListener('change', function () {
      var was = picked().length;
      picked().forEach(function (o) { o.removeAttribute('data-on'); });
      syncPick();
      if (was) flash('Выбор мест сброшен: зона поменялась. Отметьте места на схеме заново.');
    });

    var clear = $('#pick-clear');
    if (clear) clear.addEventListener('click', function () {
      picked().forEach(function (o) { o.removeAttribute('data-on'); });
      syncPick();
    });

    function text() {
      var g = function (id) { var el = $(id); return el ? el.value.trim() : ''; };
      var zv = $('#f-zone') ? $('#f-zone').value : '';
      var list = picked(), place;

      if (list.length) {
        // перечисляем по зонам: администратору сразу видно, что и где занять
        place = pickByZone(list).map(function (x) {
          return ZONE_NAME[x.zone] + ' — ' + x.vals.join(', ');
        }).join('; ') +
          ' (' + list.length + ' ' +
          seatNoun(list[0].getAttribute('data-zone'), list.length) + ')';
      } else {
        place = (ZONE_NAME[zv] || '—') +
          (g('#f-pc') ? ', ' + seatWord(zv) + ' ' + g('#f-pc') : ', любое свободное');
      }

      var lines = [
        'Заявка на бронь — CS:ZONE',
        'Имя: ' + (g('#f-name') || '—'),
        'Телефон: ' + (g('#f-phone') || '—'),
        'Дата: ' + (g('#f-date') || '—') + ', время: ' + (g('#f-time') || '—'),
        'Длительность: ' + (g('#f-hours') || '—') + ' ч',
        'Места: ' + place,
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

  /* --------------------------------------------- переключатель прайса ---- *
     Обе таблицы, будни и выходные, уже лежат в HTML — их положил build.py.
     Скрипту остаётся показать нужную и переставить состояние кнопок.
     Без JS страница тоже полная: видны будние цены, а выходные читаются
     поисковиком из разметки.
     ---------------------------------------------------------------------- */
  function priceToggle() {
    var host = $('[data-price-switch]');
    if (!host) return;
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.seg__b') : null;
      if (!b || b.hasAttribute('data-on')) return;
      var mode = b.getAttribute('data-mode');
      $$('.seg__b', host).forEach(function (o) {
        var on = o === b;
        if (on) { o.setAttribute('data-on', ''); } else { o.removeAttribute('data-on'); }
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $$('[data-when]', host).forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-when') !== mode;
      });
    });
  }

  /* ---------------------------------------------------------------- старт */
  function init() {
    menu(); reveals(); hallMap(); booking(); priceToggle();
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
