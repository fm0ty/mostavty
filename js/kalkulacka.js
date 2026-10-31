/* ==========================================================================
   MOstavTY — kalkulačka ceny rekonstrukce
   Běží jen na kalkulacka.html. Bez závislostí, ES5.

   ----------------------------------------------------------------------
   POZOR — CENÍK JE NA DVOU MÍSTECH
   Čísla v objektu PRICING níže musí odpovídat tabulkám na stránce
   rozpocet.html. Když měníte ceny, upravte obě místa.
   ----------------------------------------------------------------------

   JAK SE CENA SKLÁDÁ

   • komplet (na klíč)
       cena = výměra × cena za m² × koeficienty × pokrytí profesí
       Nic se nepřičítá za místnost — koupelna i kuchyň už jsou v ceně za
       metr. Rozpis po kategoriích je procentní rozpad téhle částky.

   • castecna (částečná)
       Cena za m² pokrývá vybrané profese, každá vybraná místnost se
       připočítává jako pevná položka.

   • koupelna / jadro
       Jen pevné položky, žádná složka za m².

   Okna, klimatizace a rekuperace nejsou nikdy v ceně za m² — připočítávají
   se vždy. Nakonec se přidá koordinace a rezerva.
   ========================================================================== */
(function () {
  'use strict';

  var NBSP = ' ';

  /* ======================================================================
     CENÍK — všechny částky v Kč bez DPH, práce i materiál
     ====================================================================== */
  var PRICING = {
    minJobCzk: 150000,

    /* Cena za m² podle typu nemovitosti, rozsahu a standardu */
    ratePerM2: {
      byt: {
        komplet:  { standard: 11000, nadstandard: 17000, premium: 25000 },
        castecna: { standard: 6600,  nadstandard: 10700, premium: 15000 },
        koupelna: { standard: 0, nadstandard: 0, premium: 0 },
        jadro:    { standard: 0, nadstandard: 0, premium: 0 }
      },
      dum: {
        komplet:  { standard: 11000, nadstandard: 17000, premium: 25000 },
        castecna: { standard: 6600,  nadstandard: 10700, premium: 15000 },
        koupelna: { standard: 0, nadstandard: 0, premium: 0 }
      },
      komercni: {
        komplet:  { standard: 9700, nadstandard: 14500, premium: 20500 },
        castecna: { standard: 6600, nadstandard: 10700, premium: 15000 },
        koupelna: { standard: 0, nadstandard: 0, premium: 0 }
      }
    },

    /* Pevné položky — za kus, ne za metr */
    fixedItems: {
      bathroom: { standard: 210000, nadstandard: 320000, premium: 450000 },
      wc: 55000,
      bytoveJadro: 160000,
      kitchenPrep: 55000,          /* jen stavební příprava, BEZ linky */
      dispositionChanges: 60000,
      windowsPerM2: 2300,          /* za m² podlahové plochy */
      airConditioningPerUnit: 60000,
      hrv: 155000
    },

    /* Kuchyňská linka na míru — podle dispozice */
    kitchenUnits: { small: 180000, mid: 220000, large: 260000 },

    /* Podíly profesí na ceně za m². Součet = 1,00 */
    tradeShares: {
      general: 0.20, elektro: 0.16, voda: 0.11, topeni: 0.09,
      podlahy: 0.15, dvere: 0.06, malby: 0.13, sdk: 0.10
    },
    minTradeCoverage: 0.30,

    coefficients: {
      buildingType: { panel: 1.00, cihla: 1.12, novostavba: 0.90, rodinny: 1.05 },
      floorAccess:  { prizemi: 1.00, vytah: 1.00, bezVytahu: 1.04 },
      smallArea:    { thresholdM2: 40, multiplier: 1.08 }
    },

    /* Koordinace, dozor a zařízení stavby — pásma podle ceny prací.
       Nad poslední pásmo 6 % zaokrouhlených na 500 Kč. */
    coordinationBands: [
      { upTo: 300000,  fee: 17000 },  { upTo: 400000,  fee: 33000 },
      { upTo: 500000,  fee: 37000 },  { upTo: 600000,  fee: 40000 },
      { upTo: 700000,  fee: 47500 },  { upTo: 800000,  fee: 55000 },
      { upTo: 900000,  fee: 62500 },  { upTo: 1000000, fee: 70000 },
      { upTo: 1500000, fee: 90000 },  { upTo: 2000000, fee: 120000 },
      { upTo: 2500000, fee: 150000 }
    ],
    coordinationAbovePct: 0.06,
    coordinationAboveRoundTo: 500,

    contingencyPct: 0.10,          /* rezerva na nepředvídané práce */

    extras: {
      architektura:   { label: 'Architektonický návrh a 3D vizualizace', pctOfConstruction: 0.05 },
      projekt:        { label: 'Projektová dokumentace a povolení', flat: 55000 },
      kuchynskaLinka: { label: 'Kuchyňská linka na míru vč. spotřebičů', dynamicKitchen: true },
      nabytek:        { label: 'Ostatní nábytek na míru', flat: 220000 }
    },

    vat: { residential: 0.12, commercial: 0.21 },

    duration: {
      bands: [
        { maxM2: 40, low: 5, high: 8 }, { maxM2: 70, low: 7, high: 11 },
        { maxM2: 110, low: 10, high: 15 }, { maxM2: 180, low: 13, high: 19 },
        { maxM2: 400, low: 17, high: 26 }
      ],
      scopeMultiplier: { komplet: 1.00, castecna: 0.65, koupelna: 0.35, jadro: 0.30 }
    },

    /* Na stovky — ať kalkulačka dá stejné číslo jako příklad výpočtu
       na stránce rozpocet.html (877 800 Kč), ne zaokrouhlenou verzi. */
    roundTo: 100
  };

  /* Profese — pořadí určuje, jak se vypíšou ve formuláři */
  var TRADES = [
    { id: 'elektro',    t: 'Kompletní elektroinstalace', d: 'Nové rozvody, rozvaděč, zásuvky' },
    { id: 'voda',       t: 'Rozvody vody a odpadů',      d: 'Nové rozvody v bytě' },
    { id: 'topeni',     t: 'Topení a radiátory',         d: 'Rozvody a nové radiátory' },
    { id: 'podlahy',    t: 'Nové podlahy',               d: 'Vyrovnání podkladu a krytina' },
    { id: 'dvere',      t: 'Vnitřní dveře a zárubně',    d: 'Obložkové zárubně a křídla' },
    { id: 'malby',      t: 'Malby a povrchy',            d: 'Štuky, penetrace, malba' },
    { id: 'sdk',        t: 'Sádrokartonové konstrukce',  d: 'Podhledy a předstěny' },
    { id: 'dispozice',  t: 'Dispoziční změny',           d: '+60 000 Kč' },
    { id: 'okna',       t: 'Výměna oken',                d: '+2 300 Kč/m² — vždy navíc' },
    { id: 'klima',      t: 'Klimatizace',                d: '+60 000 Kč za jednotku — vždy navíc' },
    { id: 'rekuperace', t: 'Rekuperace',                 d: '+155 000 Kč — vždy navíc' }
  ];

  /* Profese, které jsou součástí ceny za m² (mají podíl v tradeShares) */
  var SHARE_TRADES = ['elektro', 'voda', 'topeni', 'podlahy', 'dvere', 'malby', 'sdk'];

  var EXTRAS = [
    { id: 'architektura',   t: 'Architektonický návrh a 3D vizualizace', d: '5 % z ceny stavby' },
    { id: 'projekt',        t: 'Projektová dokumentace a povolení',      d: '+55 000 Kč' },
    { id: 'kuchynskaLinka', t: 'Kuchyňská linka na míru',                d: 'podle dispozice', requiresKitchen: true },
    { id: 'nabytek',        t: 'Ostatní nábytek na míru',                d: '+220 000 Kč' }
  ];

  /* Kategorie rozpisu — pořadí je pořadí výpisu */
  var CATS = [
    ['stavebni', 'Stavební práce'],
    ['elektro',  'Elektroinstalace'],
    ['voda',     'Voda, odpady a topení'],
    ['koupelny', 'Koupelny a WC'],
    ['povrchy',  'Podlahy a povrchy'],
    ['kuchyne',  'Kuchyň'],
    ['sluzby',   'Projekt a služby']
  ];

  /* ======================================================================
     Stav
     ====================================================================== */
  var state = {
    propertyType: 'byt',
    scope: 'komplet',
    area: 68,
    layout: '3_1',
    buildingType: 'panel',
    floorAccess: 'prizemi',
    standard: 'standard',
    vatPayer: 'ne',
    rooms: { koupelna: 1, wc: true, kuchyne: true },
    trades: ['elektro', 'voda', 'topeni', 'podlahy', 'dvere', 'malby', 'sdk'],
    extras: []
  };

  /* ======================================================================
     Pomocné
     ====================================================================== */
  function has(arr, v) { return arr.indexOf(v) > -1; }

  function fmtNum(v) {
    var s = String(Math.round(v)), out = '', c = 0, i;
    for (i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      if (++c % 3 === 0 && i > 0) { out = NBSP + out; }
    }
    return out;
  }
  function kc(v) { return fmtNum(v) + NBSP + 'Kč'; }
  function roundTo(v, step) { return Math.round(v / step) * step; }

  function isCommercial() { return state.propertyType === 'komercni'; }

  function ratesFor() {
    var byType = PRICING.ratePerM2[state.propertyType] || PRICING.ratePerM2.byt;
    return byType[state.scope] || byType.komplet;
  }

  function bathroomPrice() { return PRICING.fixedItems.bathroom[state.standard]; }

  function kitchenUnitsPrice() {
    var L = state.layout;
    if (L === '1kk' || L === '1_1' || L === '2kk' || L === '2_1') { return PRICING.kitchenUnits.small; }
    if (L === '3kk' || L === '3_1') { return PRICING.kitchenUnits.mid; }
    return PRICING.kitchenUnits.large;
  }

  /* Součin koeficientů: typ domu × přístup × malá výměra */
  function coefficient() {
    var C = PRICING.coefficients, k = 1;
    /* Typ domu se u komerčních prostor neuplatňuje */
    if (!isCommercial() && C.buildingType[state.buildingType]) {
      k *= C.buildingType[state.buildingType];
    }
    if (C.floorAccess[state.floorAccess]) { k *= C.floorAccess[state.floorAccess]; }
    if (state.area < C.smallArea.thresholdM2) { k *= C.smallArea.multiplier; }
    return k;
  }

  /* Jaký podíl ceny za m² je pokrytý vybranými profesemi */
  function tradeCoverage() {
    var sh = PRICING.tradeShares, cov = sh.general, i;
    for (i = 0; i < SHARE_TRADES.length; i++) {
      if (has(state.trades, SHARE_TRADES[i])) { cov += sh[SHARE_TRADES[i]]; }
    }
    return Math.max(cov, PRICING.minTradeCoverage);
  }

  /* Rozpad ceny na klíč do kategorií. Vždy se normalizuje na 1,0. */
  function turnkeyWeights() {
    var w = { stavebni: 0.20, elektro: 0.14, voda: 0.13, koupelny: 0.20, povrchy: 0.26, kuchyne: 0.07 };
    var baths = state.rooms.koupelna, waterOn, surf, sum = 0, k;

    w.koupelny = baths <= 0 ? 0 : w.koupelny * (1 + 0.5 * (baths - 1));
    if (state.rooms.wc) { w.koupelny += 0.03; }
    if (!state.rooms.kuchyne) { w.kuchyne = 0; }
    if (!has(state.trades, 'elektro')) { w.elektro = 0; }

    waterOn = (has(state.trades, 'voda') ? 1 : 0) + (has(state.trades, 'topeni') ? 1 : 0);
    w.voda = w.voda * (waterOn / 2);

    surf = (has(state.trades, 'podlahy') ? 1 : 0) + (has(state.trades, 'dvere') ? 1 : 0) +
           (has(state.trades, 'malby') ? 1 : 0);
    w.povrchy = w.povrchy * Math.max(0.25, surf / 3);

    if (has(state.trades, 'dispozice')) { w.stavebni += 0.06; }
    if (has(state.trades, 'sdk')) { w.stavebni += 0.04; }

    for (k in w) { if (w.hasOwnProperty(k)) { sum += w[k]; } }
    if (sum <= 0) { return { stavebni: 1, elektro: 0, voda: 0, koupelny: 0, povrchy: 0, kuchyne: 0 }; }
    for (k in w) { if (w.hasOwnProperty(k)) { w[k] = w[k] / sum; } }
    return w;
  }

  /* Okna, klimatizace a rekuperace — účtují se vždy navíc */
  function addOns(cats, area, coef) {
    var F = PRICING.fixedItems, total = 0, v, units;

    if (has(state.trades, 'okna')) {
      v = F.windowsPerM2 * area * coef;
      cats.stavebni += v; total += v;
    }
    if (has(state.trades, 'klima')) {
      /* Odhad: jedna jednotka na obývací pokoj, u větších dispozic víc */
      units = state.rooms.kuchyne ? 2 : 1;
      if (state.layout === '4kk' || state.layout === '4_1' || state.layout === '5plus') { units = 3; }
      v = F.airConditioningPerUnit * units * coef;
      cats.voda += v; total += v;
    }
    if (has(state.trades, 'rekuperace')) {
      v = F.hrv * coef;
      cats.voda += v; total += v;
    }
    return total;
  }

  function extraPrice(id, constructionBase) {
    var ex = PRICING.extras[id];
    if (!ex) { return 0; }
    if (ex.dynamicKitchen) { return kitchenUnitsPrice(); }
    if (ex.pctOfConstruction) { return constructionBase * ex.pctOfConstruction; }
    return ex.flat || 0;
  }

  function extraAvailable(id) {
    var i;
    for (i = 0; i < EXTRAS.length; i++) {
      if (EXTRAS[i].id === id && EXTRAS[i].requiresKitchen && !state.rooms.kuchyne) { return false; }
    }
    return true;
  }

  function coordinationFee(subtotal) {
    var bands = PRICING.coordinationBands, i, r;
    for (i = 0; i < bands.length; i++) {
      if (subtotal <= bands[i].upTo) { return bands[i].fee; }
    }
    r = PRICING.coordinationAboveRoundTo;
    return Math.round(subtotal * PRICING.coordinationAbovePct / r) * r;
  }

  /* ======================================================================
     Výpočet
     ====================================================================== */
  function estimate() {
    var std = state.standard;
    var area = Math.max(20, Math.min(400, state.area || 20));
    var rate = ratesFor()[std];
    var F = PRICING.fixedItems, coef = coefficient();
    var cats = { stavebni: 0, elektro: 0, voda: 0, koupelny: 0, povrchy: 0, kuchyne: 0, sluzby: 0 };
    var construction = 0;
    var turnkeyBase, w, base, sh, parts, act, fixed, addFixed, i, k;

    if (state.scope === 'komplet') {
      turnkeyBase = area * rate * coef * tradeCoverage();
      w = turnkeyWeights();
      for (k in w) { if (w.hasOwnProperty(k)) { cats[k] = turnkeyBase * w[k]; } }
      construction = turnkeyBase + addOns(cats, area, coef);

    } else {
      base = area * rate * tradeCoverage() * coef;
      if (base > 0) {
        sh = PRICING.tradeShares;
        parts = [
          [sh.general, 'stavebni', true],
          [sh.sdk,     'stavebni', has(state.trades, 'sdk')],
          [sh.elektro, 'elektro',  has(state.trades, 'elektro')],
          [sh.voda,    'voda',     has(state.trades, 'voda')],
          [sh.topeni,  'voda',     has(state.trades, 'topeni')],
          [sh.podlahy, 'povrchy',  has(state.trades, 'podlahy')],
          [sh.dvere,   'povrchy',  has(state.trades, 'dvere')],
          [sh.malby,   'povrchy',  has(state.trades, 'malby')]
        ];
        act = 0;
        for (i = 0; i < parts.length; i++) { if (parts[i][2]) { act += parts[i][0]; } }
        if (act <= 0) { act = sh.general; }
        for (i = 0; i < parts.length; i++) {
          if (parts[i][2]) { cats[parts[i][1]] += base * (parts[i][0] / act); }
        }
      }

      fixed = 0;
      addFixed = function (cat, v) { cats[cat] += v * coef; fixed += v * coef; };

      if (state.scope === 'jadro') {
        addFixed('koupelny', F.bytoveJadro);
        if (state.rooms.wc) { addFixed('koupelny', F.wc); }
      } else {
        if (state.rooms.koupelna > 0) { addFixed('koupelny', bathroomPrice() * state.rooms.koupelna); }
        if (state.rooms.wc) { addFixed('koupelny', F.wc); }
      }
      if (state.rooms.kuchyne && state.scope !== 'koupelna' && state.scope !== 'jadro') {
        addFixed('kuchyne', F.kitchenPrep);
      }
      if (has(state.trades, 'dispozice')) { addFixed('stavebni', F.dispositionChanges); }

      construction = base + fixed + addOns(cats, area, coef);
    }

    /* Služby navíc */
    var extrasTotal = 0;
    for (i = 0; i < state.extras.length; i++) {
      if (!extraAvailable(state.extras[i])) { continue; }
      extrasTotal += extraPrice(state.extras[i], construction);
    }
    cats.sluzby += extrasTotal;

    var subtotal = construction + extrasTotal;
    var coordination = subtotal > 0 ? coordinationFee(subtotal) : 0;
    var contingency = subtotal * PRICING.contingencyPct;
    var total = subtotal + coordination + contingency;

    /* Koordinaci zákazníkovi nevykazujeme jako vlastní řádek — rozpustíme
       ji do viditelných kategorií podle jejich podílu, ať rozpis sedí. */
    if (subtotal > 0 && coordination > 0) {
      for (k in cats) {
        if (cats.hasOwnProperty(k)) { cats[k] += coordination * (cats[k] / subtotal); }
      }
    }

    var belowMin = total > 0 && total < PRICING.minJobCzk;

    /* DPH: u komerčních prostor s plátcem DPH přenesená daňová povinnost */
    var reverseCharge = isCommercial() && state.vatPayer === 'ano';
    var vatRate = reverseCharge ? 0 : (isCommercial() ? PRICING.vat.commercial : PRICING.vat.residential);

    /* Rozpis. Každý řádek zaokrouhlíme, ale poslední dorovnáme tak, aby
       součet řádků dal přesně celkovou cenu — jinak by zákazník viděl
       rozpis, který nesedí na výsledek. */
    var breakdown = [], v;
    for (i = 0; i < CATS.length; i++) {
      v = cats[CATS[i][0]];
      if (v < 1) { continue; }
      breakdown.push({ category: CATS[i][1], czk: roundTo(v, PRICING.roundTo) });
    }

    var totalR = roundTo(total, PRICING.roundTo);
    var contingencyR = roundTo(contingency, PRICING.roundTo);

    if (breakdown.length) {
      var rowsSum = contingencyR, diff;
      for (i = 0; i < breakdown.length; i++) { rowsSum += breakdown[i].czk; }
      diff = totalR - rowsSum;
      if (diff !== 0) {
        /* Rozdíl ze zaokrouhlení přidáme k největší položce, kde je
           relativně nejméně vidět. */
        var biggest = 0;
        for (i = 1; i < breakdown.length; i++) {
          if (breakdown[i].czk > breakdown[biggest].czk) { biggest = i; }
        }
        breakdown[biggest].czk += diff;
      }
    }

    /* Doba prací */
    var bands = PRICING.duration.bands, band = bands[bands.length - 1];
    for (i = 0; i < bands.length; i++) {
      if (area <= bands[i].maxM2) { band = bands[i]; break; }
    }
    var dm = PRICING.duration.scopeMultiplier[state.scope] || 1;
    var wLow = Math.max(2, Math.round(band.low * dm));
    var wHigh = Math.max(wLow + 1, Math.round(band.high * dm));

    return {
      breakdown: breakdown,
      contingency: contingencyR,
      total: totalR,
      vatRate: vatRate,
      vat: roundTo(totalR * vatRate, PRICING.roundTo),
      withVat: roundTo(totalR * (1 + vatRate), PRICING.roundTo),
      reverseCharge: reverseCharge,
      belowMin: belowMin,
      weeksLow: wLow,
      weeksHigh: wHigh
    };
  }

  /* ======================================================================
     Vykreslení
     ====================================================================== */
  var el = {};

  function renderTrades() {
    var html = '', i, t, tick;
    tick = '<span class="check__tick"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
           ' stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"' +
           ' aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>';
    for (i = 0; i < TRADES.length; i++) {
      t = TRADES[i];
      html += '<label class="check"><input type="checkbox" name="trade" value="' + t.id + '"' +
              (has(state.trades, t.id) ? ' checked' : '') + '>' +
              '<span class="check__box">' + tick +
              '<span><span class="check__name">' + t.t + '</span>' +
              '<span class="check__price">' + t.d + '</span></span></span></label>';
    }
    el.trades.innerHTML = html;
  }

  function renderExtras() {
    var html = '', i, x, tick;
    tick = '<span class="check__tick"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"' +
           ' stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"' +
           ' aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>';
    for (i = 0; i < EXTRAS.length; i++) {
      x = EXTRAS[i];
      html += '<label class="check"><input type="checkbox" name="extra" value="' + x.id + '"' +
              (has(state.extras, x.id) ? ' checked' : '') + '>' +
              '<span class="check__box">' + tick +
              '<span><span class="check__name">' + x.t + '</span>' +
              '<span class="check__price" data-extra-price="' + x.id + '">' + x.d + '</span>' +
              '</span></span></label>';
    }
    el.extras.innerHTML = html;
  }

  /* Co má smysl zadávat, se liší podle rozsahu prací */
  function syncAvailability() {
    var scope = state.scope;
    var perM2 = scope === 'komplet' || scope === 'castecna';
    var fixedOnly = scope === 'koupelna' || scope === 'jadro';

    /* Bytové jádro jen u bytu */
    var jadroInput = el.form.querySelector('input[name="scope"][value="jadro"]');
    if (jadroInput) {
      jadroInput.disabled = state.propertyType !== 'byt';
      el.scopeJadro.style.display = state.propertyType === 'byt' ? '' : 'none';
    }

    /* Typ domu nemá u komerčních prostor vliv */
    el.groupBuilding.hidden = isCommercial();

    /* U rodinného domu nabízíme jen volby, které dávají smysl — panelový
       ani cihlový činžovní dům u rodinného domu nejsou. */
    var houseOnly = state.propertyType === 'dum';
    Array.prototype.forEach.call(el.form.querySelectorAll('input[name="buildingType"]'), function (inp) {
      var onlyForFlat = inp.value === 'panel' || inp.value === 'cihla';
      inp.disabled = houseOnly && onlyForFlat;
      inp.parentNode.style.display = (houseOnly && onlyForFlat) ? 'none' : '';
    });
    /* Když se zvolí rodinný dům a je vybraná bytová volba, přepneme na zděný */
    if (houseOnly) {
      var cur = el.form.querySelector('input[name="buildingType"]:checked');
      if (!cur || cur.disabled) {
        el.form.querySelector('input[name="buildingType"][value="rodinny"]').checked = true;
        state.buildingType = 'rodinny';
      }
    }

    /* Plátce DPH se ptáme jen u komerčních prostor */
    el.groupVat.hidden = !isCommercial();

    /* Výměra a profese nemají smysl, když se účtují jen pevné položky */
    el.groupParams.querySelector('[data-field-layout]').hidden = isCommercial();
    el.area.disabled = fixedOnly;
    el.groupTrades.hidden = fixedOnly;

    /* Kuchyň u samostatné koupelny a jádra nic neovlivní */
    var kuchyneInput = el.form.querySelector('input[name="room"][value="kuchyne"]');
    if (kuchyneInput) { kuchyneInput.disabled = fixedOnly; }

    /* Počet koupelen u bytového jádra neurčuje cenu (jádro je paušál) */
    var bathBtns = el.form.querySelectorAll('[data-count-btn="koupelna"]');
    var lockBath = scope === 'jadro';
    Array.prototype.forEach.call(bathBtns, function (b) {
      var dir = parseInt(b.getAttribute('data-dir'), 10);
      b.disabled = lockBath ||
        (dir < 0 && state.rooms.koupelna <= 0) ||
        (dir > 0 && state.rooms.koupelna >= 3);
    });

    /* Kuchyňská linka jde vybrat jen když je kuchyň v rozsahu */
    var kitchenExtra = el.form.querySelector('input[name="extra"][value="kuchynskaLinka"]');
    if (kitchenExtra) {
      var ok = state.rooms.kuchyne && !fixedOnly;
      kitchenExtra.disabled = !ok;
      if (!ok && kitchenExtra.checked) {
        kitchenExtra.checked = false;
        var ix = state.extras.indexOf('kuchynskaLinka');
        if (ix > -1) { state.extras.splice(ix, 1); }
      }
    }

    /* Ceny u zaškrtávátek, které se mění podle standardu a dispozice */
    el.priceWc.textContent = perM2 && state.scope === 'komplet'
      ? 'v ceně za m²' : '+' + kc(PRICING.fixedItems.wc);
    el.priceKuchyne.textContent = state.scope === 'komplet'
      ? 'v ceně za m²' : '+' + kc(PRICING.fixedItems.kitchenPrep) + ' (bez linky)';

    var kitchenPriceEl = el.form.querySelector('[data-extra-price="kuchynskaLinka"]');
    if (kitchenPriceEl) { kitchenPriceEl.textContent = '+' + kc(kitchenUnitsPrice()); }

    /* Nápovědy podle rozsahu */
    el.tradesHint.textContent = state.scope === 'komplet'
      ? 'U rekonstrukce na klíč je vybráno všechno. Když něco odškrtnete, cena se o jeho podíl sníží.'
      : 'Vyberte profese, které chcete. Cena za m² pokrývá jen vybrané.';

    el.roomsHint.textContent = state.scope === 'komplet'
      ? 'U rekonstrukce na klíč jsou už v ceně za metr — určují jen, jak se cena rozdělí po položkách.'
      : (fixedOnly
        ? 'U samostatné koupelny a jádra se účtují pevné položky.'
        : 'Každá vybraná místnost se u částečné rekonstrukce připočítává.');
  }

  function render() {
    var r = estimate(), html = '', i;

    for (i = 0; i < r.breakdown.length; i++) {
      html += '<li><span class="rows__k">' + r.breakdown[i].category + '</span>' +
              '<span class="rows__v">' + kc(r.breakdown[i].czk) + '</span></li>';
    }
    if (r.contingency > 0) {
      html += '<li><span class="rows__k">Rezerva 10 %</span>' +
              '<span class="rows__v">' + kc(r.contingency) + '</span></li>';
    }
    if (r.total > 0) {
      html += '<li data-sum><span class="rows__k">Celkem bez DPH</span>' +
              '<span class="rows__v">' + kc(r.total) + '</span></li>';
    }
    el.rows.innerHTML = html;

    if (r.total > 0) {
      el.result.classList.remove('result--empty');
      el.total.textContent = kc(r.total);
      if (r.reverseCharge) {
        el.vat.innerHTML = 'Přenesená daňová povinnost — DPH neúčtujeme.';
      } else {
        el.vat.innerHTML = 'S DPH ' + Math.round(r.vatRate * 100) + ' %: <strong>' +
                           kc(r.withVat) + '</strong>';
      }
      el.time.innerHTML = 'Doba prací: <strong>' + r.weeksLow + '–' + r.weeksHigh + ' týdnů</strong>';
    } else {
      el.result.classList.add('result--empty');
      el.total.textContent = 'Vyberte rozsah prací';
      el.vat.textContent = '';
      el.time.textContent = '';
    }

    if (r.belowMin) {
      el.min.hidden = false;
      el.min.innerHTML = 'Nejmenší zakázka, kterou bereme, je <strong>' +
        kc(PRICING.minJobCzk) + '</strong> bez DPH. Menší práce rádi doporučíme kolegům.';
    } else {
      el.min.hidden = true;
    }

    el.send.setAttribute('href', 'kontakt.html?' + buildQuery(r));
  }

  /* Odkaz na poptávku — předvyplní službu a popis záměru */
  function buildQuery(r) {
    var SCOPE_LABEL = {
      komplet: 'Kompletní rekonstrukce na klíč',
      castecna: 'Částečná rekonstrukce',
      koupelna: 'Pouze koupelna a WC',
      jadro: 'Bytové jádro'
    };
    var TYPE_LABEL = { byt: 'Byt', dum: 'Rodinný dům', komercni: 'Komerční prostor' };
    var STD_LABEL = { standard: 'standard', nadstandard: 'nadstandard', premium: 'prémiový' };
    var BUILD_LABEL = {
      panel: 'panelový dům', cihla: 'cihlový činžovní dům',
      novostavba: 'novostavba', rodinny: 'zděný rodinný dům'
    };

    /* Napojení na stávající předvyplnění: kontakt.html?sluzba=… */
    var sluzba = 'jine';
    if (state.scope === 'koupelna' || state.scope === 'jadro') { sluzba = 'koupelna'; }
    else if (state.propertyType === 'dum') { sluzba = 'rekonstrukce-domu'; }
    else if (state.propertyType === 'byt') { sluzba = 'rekonstrukce-bytu'; }

    var lines = [];
    lines.push(SCOPE_LABEL[state.scope] + ' — ' + TYPE_LABEL[state.propertyType].toLowerCase());
    if (state.scope !== 'koupelna' && state.scope !== 'jadro') {
      lines.push('Výměra: ' + state.area + ' m²');
    }
    if (!isCommercial() && BUILD_LABEL[state.buildingType]) {
      lines.push('Typ domu: ' + BUILD_LABEL[state.buildingType]);
    }
    if (state.floorAccess === 'bezVytahu') { lines.push('Přístup: patro bez výtahu'); }
    lines.push('Standard materiálů: ' + STD_LABEL[state.standard]);
    if (state.rooms.koupelna > 0 && state.scope !== 'jadro') {
      lines.push('Koupelny: ' + state.rooms.koupelna);
    }
    if (state.rooms.wc) { lines.push('Samostatné WC: ano'); }

    /* Výpis profesí má smysl jen u částečné rekonstrukce — u na klíč je
       vybráno vše a u samostatné koupelny či jádra se profese neřeší. */
    var tradeNames = [], i, j;
    if (state.scope === 'castecna') {
      for (i = 0; i < state.trades.length; i++) {
        for (j = 0; j < TRADES.length; j++) {
          if (TRADES[j].id === state.trades[i]) { tradeNames.push(TRADES[j].t); }
        }
      }
      if (tradeNames.length) { lines.push('Práce: ' + tradeNames.join(', ')); }
    }

    var extraNames = [];
    for (i = 0; i < state.extras.length; i++) {
      for (j = 0; j < EXTRAS.length; j++) {
        if (EXTRAS[j].id === state.extras[i]) { extraNames.push(EXTRAS[j].t); }
      }
    }
    if (extraNames.length) { lines.push('Služby navíc: ' + extraNames.join(', ')); }

    lines.push('');
    lines.push('Spočítáno kalkulačkou: ' + fmtNum(r.total) + ' Kč bez DPH' +
      (r.reverseCharge ? '' : ' (' + fmtNum(r.withVat) + ' Kč s DPH)'));

    return 'sluzba=' + encodeURIComponent(sluzba) +
           '&zprava=' + encodeURIComponent(lines.join('\n'));
  }

  /* ======================================================================
     Události
     ====================================================================== */
  function readForm() {
    var f = el.form;

    state.propertyType = f.querySelector('input[name="propertyType"]:checked').value;

    var scopeChecked = f.querySelector('input[name="scope"]:checked');
    /* Když se přepne na nemovitost bez bytového jádra, vrátíme se na klíč */
    if (!scopeChecked || scopeChecked.disabled) {
      f.querySelector('input[name="scope"][value="komplet"]').checked = true;
      state.scope = 'komplet';
    } else {
      state.scope = scopeChecked.value;
    }

    var area = parseInt(el.area.value, 10);
    state.area = isNaN(area) ? 20 : Math.max(20, Math.min(400, area));

    state.layout = f.querySelector('select[name="layout"]').value;
    state.buildingType = f.querySelector('input[name="buildingType"]:checked').value;
    state.floorAccess = f.querySelector('input[name="floorAccess"]:checked').value;
    state.standard = f.querySelector('input[name="standard"]:checked').value;

    var vat = f.querySelector('input[name="vatPayer"]:checked');
    state.vatPayer = vat ? vat.value : 'ne';

    state.rooms.wc = !!f.querySelector('input[name="room"][value="wc"]:checked');
    var kuch = f.querySelector('input[name="room"][value="kuchyne"]');
    state.rooms.kuchyne = !!(kuch && kuch.checked && !kuch.disabled);

    state.trades = [];
    Array.prototype.forEach.call(f.querySelectorAll('input[name="trade"]:checked'), function (c) {
      state.trades.push(c.value);
    });

    state.extras = [];
    Array.prototype.forEach.call(f.querySelectorAll('input[name="extra"]:checked'), function (c) {
      if (!c.disabled) { state.extras.push(c.value); }
    });
  }

  function update() {
    readForm();
    /* syncAvailability může některé volby zakázat nebo přepnout (bytové
       jádro u domu, typ domu u rodinného domu), proto stav načteme znovu,
       ať se počítá z toho, co je ve formuláři opravdu zaškrtnuté. */
    syncAvailability();
    readForm();
    render();
  }

  function initCounters() {
    Array.prototype.forEach.call(el.form.querySelectorAll('[data-count-btn]'), function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-count-btn');
        var dir = parseInt(btn.getAttribute('data-dir'), 10);
        var next = state.rooms[key] + dir;
        state.rooms[key] = Math.max(0, Math.min(3, next));
        el.form.querySelector('[data-count-val="' + key + '"]').textContent = String(state.rooms[key]);
        update();
      });
    });
  }

  function init() {
    var form = document.querySelector('[data-calc]');
    if (!form) { return; }

    el.form = form;
    el.trades = form.querySelector('[data-trades]');
    el.extras = form.querySelector('[data-extras]');
    el.area = form.querySelector('input[name="area"]');
    el.groupParams = form.querySelector('[data-group-params]');
    el.groupBuilding = form.querySelector('[data-group-building]');
    el.groupTrades = form.querySelector('[data-group-trades]');
    el.groupVat = form.querySelector('[data-group-vat]');
    el.scopeJadro = form.querySelector('[data-scope-jadro]');
    el.tradesHint = form.querySelector('[data-trades-hint]');
    el.roomsHint = form.querySelector('[data-rooms-hint]');
    el.priceWc = form.querySelector('[data-price-wc]');
    el.priceKuchyne = form.querySelector('[data-price-kuchyne]');
    el.result = form.querySelector('[data-result]');
    el.rows = form.querySelector('[data-rows]');
    el.total = form.querySelector('[data-total]');
    el.vat = form.querySelector('[data-vat]');
    el.time = form.querySelector('[data-time]');
    el.min = form.querySelector('[data-min]');
    el.send = form.querySelector('[data-send]');

    renderTrades();
    renderExtras();
    initCounters();

    form.addEventListener('change', update);
    form.addEventListener('input', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });

    /* Kalkulačka běží — odblokujeme ji (bez JS je schovaná) */
    document.body.classList.remove('no-js');

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
