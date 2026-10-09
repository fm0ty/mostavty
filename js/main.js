/* ==========================================================================
   MOstavTY — hlavní skript
   Bez závislostí, vanilla JS. Každý modul si sám ověří, že jeho prvky
   na stránce existují, takže stejný soubor lze vložit na všechny stránky.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Konfigurace ------------------------------------------------------ */
  // Access Key z https://web3forms.com — na něj je navázaný e-mail, kam
  // chodí poptávky z formuláře. Pokud byste chtěli adresu změnit, udělá
  // se to v účtu Web3Forms, ne tady.
  var WEB3FORMS_KEY = 'faaf9da8-8a22-444e-a782-af08c1c1ed9d';

  var ready = function (fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  };

  /* --- Hlášky formuláře podle jazyka stránky ----------------------------
     Jazyk se bere z <html lang="…">. Chybí-li překlad, použije se čeština. */
  var STRINGS = {
    cs: {
      required:  'Toto pole je povinné.',
      consent:   'Bez souhlasu nemůžeme zprávu zpracovat.',
      email:     'Zadejte e-mail ve formátu jmeno@domena.cz',
      phone:     'Zadejte telefon včetně předvolby, např. +420 123 456 789',
      short:     'Napište prosím alespoň pár slov (min. 10 znaků).',
      checkForm: 'Zkontrolujte prosím zvýrazněná pole.',
      sending:   'Odesílám zprávu…',
      sendingBtn:'Odesílám…',
      okQuiet:   'Děkujeme, zpráva byla odeslána.',
      ok:        'Děkujeme! Zprávu jsme dostali a ozveme se do jednoho pracovního dne.',
      failed:    'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu, nebo nám zavolejte.',
      offline:   'Zprávu se nepodařilo odeslat — zkontrolujte připojení, nebo nám prosím zavolejte.',
      testMode:  'Testovací režim: formulář je funkční, ale chybí Web3Forms klíč (viz js/main.js). Data jsou vypsaná v konzoli prohlížeče.',
      subject:   'Nová poptávka z webu MOstavTY',
      count1:    '1 realizace',
      countFew:  '{n} realizace',
      countMany: '{n} realizací',
      lightbox:  'Zvětšená fotografie',
      close:     'Zavřít',
      prev:      'Předchozí',
      next:      'Další'
    },
    en: {
      required:  'This field is required.',
      consent:   'We cannot process your message without your consent.',
      email:     'Enter an e-mail in the format name@domain.com',
      phone:     'Enter a phone number including the country code, e.g. +420 123 456 789',
      short:     'Please write at least a few words (min. 10 characters).',
      checkForm: 'Please check the highlighted fields.',
      sending:   'Sending your message…',
      sendingBtn:'Sending…',
      okQuiet:   'Thank you, your message has been sent.',
      ok:        'Thank you! We have received your message and will get back to you within one working day.',
      failed:    'The message could not be sent. Please try again, or give us a call.',
      offline:   'The message could not be sent — please check your connection, or give us a call.',
      testMode:  'Test mode: the form works, but the Web3Forms key is missing (see js/main.js). The data is printed in the browser console.',
      subject:   'New enquiry from the MOstavTY website',
      count1:    '1 project',
      countFew:  '{n} projects',
      countMany: '{n} projects',
      lightbox:  'Enlarged photograph',
      close:     'Close',
      prev:      'Previous',
      next:      'Next'
    },
    de: {
      required:  'Dieses Feld ist erforderlich.',
      consent:   'Ohne Ihre Einwilligung können wir die Nachricht nicht bearbeiten.',
      email:     'Geben Sie eine E-Mail im Format name@domain.de ein',
      phone:     'Geben Sie die Telefonnummer mit Vorwahl ein, z. B. +420 123 456 789',
      short:     'Bitte schreiben Sie mindestens ein paar Worte (mind. 10 Zeichen).',
      checkForm: 'Bitte prüfen Sie die markierten Felder.',
      sending:   'Nachricht wird gesendet…',
      sendingBtn:'Senden…',
      okQuiet:   'Vielen Dank, Ihre Nachricht wurde gesendet.',
      ok:        'Vielen Dank! Wir haben Ihre Nachricht erhalten und melden uns innerhalb eines Werktages.',
      failed:    'Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.',
      offline:   'Die Nachricht konnte nicht gesendet werden — bitte prüfen Sie Ihre Verbindung oder rufen Sie uns an.',
      testMode:  'Testmodus: Das Formular funktioniert, aber der Web3Forms-Schlüssel fehlt (siehe js/main.js). Die Daten stehen in der Browser-Konsole.',
      subject:   'Neue Anfrage über die Website MOstavTY',
      count1:    '1 Projekt',
      countFew:  '{n} Projekte',
      countMany: '{n} Projekte',
      lightbox:  'Vergrößertes Foto',
      close:     'Schließen',
      prev:      'Zurück',
      next:      'Weiter'
    }
  };

  var LANG = (document.documentElement.getAttribute('lang') || 'cs')
             .slice(0, 2).toLowerCase();
  var T = STRINGS[LANG] || STRINGS.cs;

  /* ======================================================================
     1) Mobilní navigace
     ====================================================================== */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (!toggle || !nav) { return; }

    function close() {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.removeProperty('overflow');
    }

    function open() {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { close(); } else { open(); }
    });

    // Zavřít po kliknutí na odkaz v menu
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { close(); }
    });

    // Zavřít Escapem
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });

    // Při přechodu na desktop uklidit stav
    var mq = window.matchMedia('(min-width: 961px)');
    var onChange = function (e) { if (e.matches) { close(); } };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }
  }

  /* ======================================================================
     2) Stín hlavičky při scrollu
     ====================================================================== */
  function initHeaderShadow() {
    var header = document.querySelector('.header');
    if (!header) { return; }

    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });

    update();
  }

  /* ======================================================================
     3) Zvýraznění aktivní stránky v navigaci
        Nastaví aria-current="page" podle aktuální URL, takže v HTML
        stačí jeden a tentýž blok navigace.
     ====================================================================== */
  function initActiveLink() {
    var links = document.querySelectorAll('.nav__link, .footer a[href$=".html"]');
    if (!links.length) { return; }

    var path = window.location.pathname.split('/').pop() || 'index.html';

    Array.prototype.forEach.call(links, function (link) {
      var href = link.getAttribute('href');
      if (!href) { return; }
      var target = href.split('/').pop().split('#')[0];
      if (target === path && link.classList.contains('nav__link')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ======================================================================
     4) Objevování prvků při scrollu
     ====================================================================== */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) { return; }

    // Bez IntersectionObserver (staré prohlížeče) vše prostě zobrazíme
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.05 });

    Array.prototype.forEach.call(items, function (el) { observer.observe(el); });
  }

  /* ======================================================================
     5) Odpočet čísel ve statistikách
     ====================================================================== */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) { return; }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        observer.unobserve(el);

        var target = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        if (isNaN(target)) { return; }

        if (reduce) { el.textContent = target + suffix; return; }

        var duration = 1100;
        var start = null;

        function step(ts) {
          if (start === null) { start = ts; }
          var p = Math.min((ts - start) / duration, 1);
          // easeOutCubic
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) { window.requestAnimationFrame(step); }
        }

        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(nums, function (el) { observer.observe(el); });
  }

  /* ======================================================================
     6) FAQ accordion
     ====================================================================== */
  function initFaq() {
    var buttons = document.querySelectorAll('.faq__q');
    if (!buttons.length) { return; }

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) { return; }
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.setAttribute('data-open', String(!isOpen));
      });
    });
  }

  /* ======================================================================
     7) Filtr referencí
     ====================================================================== */
  function initFilter() {
    var filter = document.querySelector('.filter');
    var gallery = document.querySelector('[data-gallery]');
    if (!filter || !gallery) { return; }

    var buttons = filter.querySelectorAll('.filter__btn');
    var items = gallery.querySelectorAll('[data-category]');
    var counter = document.querySelector('[data-filter-count]');

    function apply(category) {
      var shown = 0;
      Array.prototype.forEach.call(items, function (item) {
        var match = category === 'vse' || item.getAttribute('data-category') === category;
        item.hidden = !match;
        if (match) { shown++; }
      });
      if (counter) {
        var tpl = shown === 1 ? T.count1
                : (shown >= 2 && shown <= 4) ? T.countFew
                : T.countMany;
        counter.textContent = tpl.replace('{n}', shown);
      }
    }

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        apply(btn.getAttribute('data-filter'));
      });
    });
  }

  /* ======================================================================
     8) Lightbox pro galerii
     ====================================================================== */
  function initLightbox() {
    var triggers = document.querySelectorAll('[data-lightbox]');
    if (!triggers.length) { return; }

    var items = Array.prototype.slice.call(triggers);
    var index = 0;
    var lastFocus = null;

    // Vytvoříme lightbox jen když je na stránce galerie
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', T.lightbox);
    box.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="' + T.close + '">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="' + T.prev + '">&#8249;</button>' +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="' + T.next + '">&#8250;</button>' +
      '<figure class="lightbox__figure">' +
        '<div data-lb-media></div>' +
        '<figcaption class="lightbox__caption" data-lb-caption></figcaption>' +
      '</figure>';
    document.body.appendChild(box);

    var media = box.querySelector('[data-lb-media]');
    var caption = box.querySelector('[data-lb-caption]');
    var btnClose = box.querySelector('.lightbox__close');
    var btnPrev = box.querySelector('.lightbox__nav--prev');
    var btnNext = box.querySelector('.lightbox__nav--next');

    function render(i) {
      index = (i + items.length) % items.length;
      var trigger = items[index];
      var full = trigger.getAttribute('data-lightbox');
      var text = trigger.getAttribute('data-caption') || '';

      if (full && full !== '#') {
        // Skutečná fotka
        media.innerHTML = '';
        var img = document.createElement('img');
        img.src = full;
        img.alt = text;
        media.appendChild(img);
      } else {
        // Placeholder — zkopírujeme obsah z náhledu
        var inner = trigger.querySelector('.placeholder, img, svg');
        media.innerHTML = '';
        if (inner) {
          var clone = inner.cloneNode(true);
          clone.style.width = 'min(900px, 86vw)';
          clone.style.height = '58vh';
          media.appendChild(clone);
        }
      }
      caption.textContent = text;
    }

    function open(i) {
      lastFocus = document.activeElement;
      render(i);
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }

    function close() {
      box.classList.remove('is-open');
      document.body.style.removeProperty('overflow');
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    items.forEach(function (trigger, i) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        open(i);
      });
      // Klávesová dostupnost, pokud trigger není <a>/<button>
      if (!trigger.matches('a, button')) {
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
        });
      }
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { render(index - 1); });
    btnNext.addEventListener('click', function () { render(index + 1); });

    box.addEventListener('click', function (e) {
      if (e.target === box) { close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) { return; }
      if (e.key === 'Escape') { close(); }
      if (e.key === 'ArrowLeft') { render(index - 1); }
      if (e.key === 'ArrowRight') { render(index + 1); }
    });
  }

  /* ======================================================================
     9) Kontaktní formulář (Web3Forms) + validace
     ====================================================================== */
  function initForm() {
    var form = document.querySelector('[data-form]');
    if (!form) { return; }

    var status = form.querySelector('.form__status');
    var submit = form.querySelector('[type="submit"]');

    /* --- Validace jednoho pole --- */
    function validateField(field) {
      var errorEl = form.querySelector('[data-error-for="' + field.name + '"]');
      var msg = '';
      var value = (field.value || '').trim();

      if (field.hasAttribute('required')) {
        if (field.type === 'checkbox' && !field.checked) {
          msg = T.consent;
        } else if (field.type !== 'checkbox' && !value) {
          msg = T.required;
        }
      }

      if (!msg && value && field.type === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
          msg = T.email;
        }
      }

      if (!msg && value && field.type === 'tel') {
        // Povolíme mezery, +, závorky; vyžadujeme alespoň 9 číslic
        var digits = value.replace(/\D/g, '');
        if (digits.length < 9) { msg = T.phone; }
      }

      if (!msg && field.name === 'message' && value && value.length < 10) {
        msg = T.short;
      }

      if (errorEl) { errorEl.textContent = msg; }
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }

    /* --- Validace celého formuláře --- */
    function validateAll() {
      var fields = form.querySelectorAll('input[name], select[name], textarea[name]');
      var firstBad = null;
      var ok = true;

      Array.prototype.forEach.call(fields, function (field) {
        if (field.classList.contains('hp-input') || field.type === 'hidden') { return; }
        if (!validateField(field)) {
          ok = false;
          if (!firstBad) { firstBad = field; }
        }
      });

      if (firstBad) { firstBad.focus(); }
      return ok;
    }

    // Validace při opuštění pole; po první chybě i při psaní
    form.addEventListener('blur', function (e) {
      if (e.target.matches('input[name], select[name], textarea[name]')) {
        validateField(e.target);
      }
    }, true);

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') { validateField(e.target); }
    });

    function setStatus(state, text) {
      if (!status) { return; }
      status.setAttribute('data-state', state);
      status.textContent = text;
    }

    /* --- Odeslání --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot kontrolujeme jako první. Je to skryté pole, které člověk
      // nevidí a nevyplní — pokud v něm něco je, odesílá to bot. Tiše
      // předstíráme úspěch, ať se nedozví, podle čeho jsme ho poznali.
      var hp = form.querySelector('.hp-input');
      if (hp && hp.value) {
        setStatus('ok', T.okQuiet);
        form.reset();
        return;
      }

      if (!validateAll()) {
        setStatus('error', T.checkForm);
        return;
      }

      var data = new FormData(form);

      // Doplníme kontext, aby byl e-mail čitelný
      data.append('subject', T.subject);
      data.append('from_name', 'Web MOstavTY');

      // Testovací režim, dokud není vložený klíč
      if (!WEB3FORMS_KEY || WEB3FORMS_KEY.indexOf('VLOZTE') === 0) {
        var preview = {};
        data.forEach(function (v, k) { preview[k] = v; });
        console.warn('[MOstavTY] Web3Forms klíč není nastavený — formulář běží v testovacím režimu.');
        console.table(preview);
        setStatus('ok', T.testMode);
        return;
      }

      data.append('access_key', WEB3FORMS_KEY);

      if (submit) {
        submit.setAttribute('aria-busy', 'true');
        submit.dataset.label = submit.textContent;
        submit.textContent = T.sendingBtn;
      }
      setStatus('sending', T.sending);

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json.success) {
            setStatus('ok', T.ok);
            form.reset();
            Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (f) {
              f.setAttribute('aria-invalid', 'false');
            });
          } else {
            setStatus('error', T.failed);
          }
        })
        .catch(function () {
          setStatus('error', T.offline);
        })
        .then(function () {
          if (submit) {
            submit.removeAttribute('aria-busy');
            if (submit.dataset.label) { submit.textContent = submit.dataset.label; }
          }
        });
    });
  }

  /* ======================================================================
     10) Předvyplnění služby z URL
         Odkaz "Mám zájem" na stránce služby může vést na
         kontakt.html?sluzba=sadrokarton a formulář se nastaví sám.
     ====================================================================== */
  function initPrefill() {
    var select = document.querySelector('[data-form] select[name="service"]');
    if (!select || !window.URLSearchParams) { return; }

    var param = new URLSearchParams(window.location.search).get('sluzba');
    if (!param) { return; }

    Array.prototype.forEach.call(select.options, function (opt) {
      if (opt.value === param) { select.value = param; }
    });
  }

  /* ======================================================================
     11) Rok v patičce
     ====================================================================== */
  function initYear() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* --- Start ------------------------------------------------------------ */
  ready(function () {
    initNav();
    initHeaderShadow();
    initActiveLink();
    initReveal();
    initCounters();
    initFaq();
    initFilter();
    initLightbox();
    initForm();
    initPrefill();
    initYear();
  });
})();
