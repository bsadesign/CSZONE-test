# -*- coding: utf-8 -*-
"""Данные клуба и отрисовка прайса, акций и железа прямо в HTML.

Раньше всё это собирал JavaScript уже в браузере, а в исходном коде страницы
лежали заглушки «Прайс обновляется» и «Пока без активных акций». Человек
разницы не замечал, а поисковый робот видел именно заглушку и мог решить,
что цен на сайте нет. Теперь цены, акции и таблица железа пишутся в HTML
на сборке — JS остаётся только для переключателя «будни / выходные»,
которому нечего отдавать поисковику.

Здесь же единственный экземпляр данных: то, что нужно скриптам в браузере
(характеристики машин для подсказки на карте зала), build.py отдаёт
отдельным JSON-блоком в <head>. Двух копий цен и конфигураций больше нет.
"""
import json

# ---------------------------------------------------------------- ЖЕЛЕЗО ---
SPECS = {
    "standart": {
        "label": "STANDART",
        "core": [["Процессор", "Intel Core i5-10400F"],
                 ["Видеокарта", "RTX 2060 SUPER 8 ГБ"],
                 ["ОЗУ", "16 ГБ DDR4 3200"]],
        "gear": [["Монитор", "ASUS, 165 Гц, 25/27″"],
                 ["Клавиатура", "ASUS TUF Gaming K3"],
                 ["Наушники", "IO Graphite 2"],
                 ["Мышь", "Logitech G102"]],
    },
    "bootcamp": {
        "label": "BOOTCAMP",
        "core": [["Процессор", "Intel Core i5-10400F"],
                 ["Видеокарта", "RTX 3060"],
                 ["ОЗУ", "16 ГБ DDR4 3200"]],
        "gear": [["Монитор", "ASUS, 280 Гц, 25/27″"],
                 ["Клавиатура", "ASUS ROG Strix NX"],
                 ["Наушники", "HyperX Cloud II"],
                 ["Мышь", "Free Wolf A7 / Logitech G403"]],
    },
    "tv": {"label": "TV", "core": [["Экран", "Телевизор 65″"]], "gear": []},
}

ZONE_META = {"standart": "25 компьютеров · №06–30",
             "bootcamp": "11 компьютеров · №01–05 + №31–36"}

# ----------------------------------------------------------------- ПРАЙС ---
PACKS = [("1 час", 1), ("3 часа", 3), ("5 часов", 5)]
WINDOWS = [("day", "Днём", "08:00–17:00"), ("eve", "Вечером", "17:00–08:00")]

ZONES = [
    {"name": "Зал STANDART", "sub": "RTX 2060 SUPER · 165 Гц · №06–30",
     "weekday": {"day": [120, 320, 470], "eve": [130, 340, 510]},
     "weekend": {"day": [130, 340, 510], "eve": [150, 400, 590]}},
    {"name": "Буткемпы I и II", "sub": "RTX 3060 · 280 Гц · №01–05 + №31–36",
     "weekday": {"day": [130, 340, 510], "eve": [150, 400, 590]},
     "weekend": {"day": [150, 400, 590], "eve": [170, 450, 680]}},
    {"name": "Аренда TV", "sub": "65″ · до 2 человек",
     "weekday": {"day": [230, 520, 790], "eve": [270, 610, 930]},
     "weekend": {"day": [270, 610, 930], "eve": [310, 700, 1070]}},
    {"name": "Аренда TV VIP", "sub": "65″ · до 2 человек",
     "weekday": {"day": [300, 670, 1040], "eve": [340, 760, 1180]},
     "weekend": {"day": [340, 760, 1180], "eve": [380, 850, 1320]}},
]

NIGHT = {"title": "Ночь", "when": "21:00–08:00", "hours": 11,
         "rows": [{"name": "Зал STANDART", "weekday": 550, "weekend": 600},
                  {"name": "Буткемпы", "weekday": 650, "weekend": 700},
                  {"name": "Аренда TV VIP", "weekday": 1450, "weekend": 1500}]}

MARATHON = {"title": "Марафон", "when": "24 часа", "hours": 24,
            "rows": [{"name": "Зал STANDART", "price": 1500},
                     {"name": "Буткемпы", "price": 1700}]}

# ----------------------------------------------------------------- АКЦИИ ---
PROMOS = [
    {"mark": "НОЧЬ", "title": "Энергетик в подарок",
     "text": "Забронировали ночь — банка ваша.",
     "cond": "При покупке тарифа «Ночь» энергетик получает каждый гость."},
    {"mark": "5 → 4", "title": "Пятый в команде играет бесплатно",
     "text": "Приходите составом на буткемп — оплачиваете четыре места из пяти.",
     "cond": "Действует при покупке любого пакета времени."},
    {"mark": "+100 ₽", "title": "Отзыв — 100 ₽ на баланс",
     "text": "Расскажите, как поиграли, и получите деньги на игровой счёт.",
     "cond": "Отзыв о клубе — 100 ₽ на баланс, начисляет администратор.",
     "href": "https://yandex.ru/maps/org/cs_zone/221049266006/reviews/",
     "hrefLabel": "Оставить отзыв"},
]


# ------------------------------------------------------------ помощники ---
def esc(t):
    return (str(t).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def rub(n):
    """1500 -> «1 500 ₽» с неразрывными пробелами: цена не рвётся переносом."""
    s = ""
    d = str(n)
    for i, ch in enumerate(d):
        if i and (len(d) - i) % 3 == 0:
            s += "\u00A0"
        s += ch
    return s + "\u00A0₽"


def per_hour(price, hours):
    return "≈ %d ₽/час" % round(price / hours) if hours > 1 else ""


def spec_rows(spec):
    row = lambda r: ('<div class="sp__r"><dt>%s</dt><dd>%s</dd></div>'
                     % (esc(r[0]), esc(r[1])))
    html = "".join(row(r) for r in spec["core"])
    if spec["gear"]:
        html += '<div class="sp__div"></div>' + "".join(row(r) for r in spec["gear"])
    return '<dl class="sp">%s</dl>' % html


def specs_script():
    """Характеристики для подсказки на карте зала — единственное, что из этих
    данных реально нужно браузеру."""
    return ('<script>window.CSZONE_SPECS=%s;</script>'
            % json.dumps(SPECS, ensure_ascii=False, separators=(",", ":")))


# ----------------------------------------------------------- рендер цен ---
def _zone_card(z, mode):
    head = ('<div class="tariff__h"><h3>%s</h3><span>%s</span></div>'
            % (esc(z["name"]), esc(z["sub"])))
    cols = ""
    for key, label, when in WINDOWS:
        rows = ""
        for i, (pk, hours) in enumerate(PACKS):
            price = z[mode][key][i]
            ph = per_hour(price, hours)
            rows += ('<div class="tariff__r"><span class="tariff__pk">%s</span>'
                     '<span class="tariff__p">%s%s</span></div>'
                     % (esc(pk), rub(price), ("<i>%s</i>" % ph) if ph else ""))
        cols += ('<div class="tariff__col"><p class="tariff__w"><b>%s</b>'
                 '<span>%s</span></p>%s</div>' % (esc(label), esc(when), rows))
    return ('<article class="tariff cut">%s<div class="tariff__cols">%s</div></article>'
            % (head, cols))


def _night_card(mode):
    rows = "".join(
        '<div class="tariff__r"><span class="tariff__pk">%s</span>'
        '<span class="tariff__p">%s<i>%s</i></span></div>'
        % (esc(r["name"]), rub(r[mode]), per_hour(r[mode], NIGHT["hours"]))
        for r in NIGHT["rows"])
    return ('<article class="tariff tariff--wide cut"><div class="tariff__h">'
            '<h3>%s</h3><span>%s · 11 часов</span></div>'
            '<div class="tariff__col">%s</div></article>'
            % (esc(NIGHT["title"]), esc(NIGHT["when"]), rows))


def _marathon_card():
    rows = "".join(
        '<div class="tariff__r"><span class="tariff__pk">%s</span>'
        '<span class="tariff__p">%s<i>%s</i></span></div>'
        % (esc(r["name"]), rub(r["price"]), per_hour(r["price"], MARATHON["hours"]))
        for r in MARATHON["rows"])
    return ('<article class="tariff tariff--wide cut"><div class="tariff__h">'
            '<h3>%s</h3><span>%s подряд · одна цена</span></div>'
            '<div class="tariff__col">%s</div></article>'
            % (esc(MARATHON["title"]), esc(MARATHON["when"]), rows))


def prices_block():
    """Обе таблицы — будни и выходные — лежат в HTML сразу.
    JS только переключает, какая из них показана: скрытая помечена hidden,
    поэтому поисковик читает обе, а гость видит одну."""
    out = ('<div data-price-switch>'
           '<div class="seg" role="group" aria-label="День недели">'
           '<button type="button" class="seg__b" data-mode="weekday" data-on '
           'aria-pressed="true">Будни</button>'
           '<button type="button" class="seg__b" data-mode="weekend" '
           'aria-pressed="false">Выходные</button></div>')
    for mode in ("weekday", "weekend"):
        cards = "".join(_zone_card(z, mode) for z in ZONES)
        out += ('<div data-when="%s"%s>'
                '<div class="tariffs">%s</div>'
                '<div class="tariffs tariffs--2">%s%s</div></div>'
                % (mode, "" if mode == "weekday" else " hidden",
                   cards, _night_card(mode), _marathon_card()))
    return out + "</div>"


def price_teaser():
    cells = "".join('<div><dt>%s</dt><dd>%d<small>₽/час</small></dd></div>'
                    % (esc(z["name"]), z["weekday"]["day"][0]) for z in ZONES)
    return ('<dl class="facts">%s</dl>'
            '<p class="hall__note" style="margin-top:22px">Будни днём, один час. '
            'Ночь %s — от %s, марафон 24 часа — от %s. '
            '<a href="prices.html" style="color:var(--amber)">Весь прайс</a></p>'
            % (cells, esc(NIGHT["when"]), rub(NIGHT["rows"][0]["weekday"]),
               rub(MARATHON["rows"][0]["price"])))


def promos_block():
    out = ""
    for i, pr in enumerate(PROMOS):
        link = ('<a class="btn btn--ghost btn--sm" href="%s" target="_blank" '
                'rel="noopener" style="align-self:flex-start">%s</a>'
                % (pr["href"], esc(pr["hrefLabel"]))) if pr.get("href") else ""
        out += ('<article class="promo cut" data-rise="%d">'
                '<p class="promo__mark">%s</p><h3>%s</h3>'
                '<p class="promo__t">%s</p>%s'
                '<p class="promo__cond">%s</p></article>'
                % (i * 80, esc(pr["mark"]), esc(pr["title"]),
                   esc(pr["text"]), link, esc(pr["cond"])))
    return out


def hardware_block():
    a, b = SPECS["standart"], SPECS["bootcamp"]
    line = lambda i, s: ('<tr><th scope="row">%s</th><td>%s</td><td>%s</td></tr>'
                         % (esc(a[s][i][0]), esc(a[s][i][1]), esc(b[s][i][1])))
    rows = ("".join(line(i, "core") for i in range(len(a["core"])))
            + '<tr class="tbl__div"><td colspan="3"></td></tr>'
            + "".join(line(i, "gear") for i in range(len(a["gear"]))))
    stacked = "".join(
        '<div class="hw-stack"><p class="hw-stack__h"><b>%s</b><span>%s</span></p>%s</div>'
        % (esc(SPECS[k]["label"]), esc(ZONE_META[k]), spec_rows(SPECS[k]))
        for k in ("standart", "bootcamp"))
    return (
        '<div class="panel cut-l only-wide" data-rise>'
        '<table class="tbl tbl--cmp"><caption>Конфигурации по зонам</caption>'
        '<thead><tr><th>Конфигурация</th>'
        '<th>STANDART<span>%s</span></th>'
        '<th>BOOTCAMP<span>%s</span></th></tr></thead>'
        '<tbody>%s</tbody></table></div>'
        '<div class="panel cut-l only-narrow" data-rise>%s</div>'
        '<div class="panel cut-l" data-rise="90">'
        '<p class="eyebrow">ТВ-зоны</p>'
        '<h3 style="margin-top:14px;font-size:1.3rem">Два Standart TV и TV VIP</h3>'
        '<p style="margin-top:12px;color:var(--ash);max-width:56ch">'
        'В каждой ТВ-зоне телевизор 65″. Играть можно компанией — по брони.</p></div>'
        % (esc(ZONE_META["standart"]), esc(ZONE_META["bootcamp"]), rows, stacked))
