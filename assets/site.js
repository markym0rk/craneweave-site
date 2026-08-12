/* ============================================================
   Craneweave — site runtime
   Price variant assignment · analytics stamping · reserve flow ·
   scroll instrumentation · motion.
   ============================================================ */

(function () {
  'use strict';

  document.body.classList.add('js');

  /* ---------- Config: fill these in before pushing traffic ---------- */
  var CFG = {
    STRIPE_LINK: '',        // Stripe Payment Link for the $50 undergrad deposit
    STRIPE_LINK_BSMD: '',   // Stripe Payment Link for the $50 BS/MD deposit
    FORM_ENDPOINT: '',      // e.g. Formspree endpoint for interest capture + coach applications
    CONTACT_EMAIL: 'team@craneweave.com'
  };

  /* ---------- Price variant: $199 / $299 / $449, assigned once, persisted ---------- */
  var VARIANTS = [199, 299, 449];
  var VKEY = 'cw_px_v';

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; path=/; max-age=31536000; SameSite=Lax';
  }

  function getVariant() {
    var v = null;
    try { v = localStorage.getItem(VKEY); } catch (e) {}
    if (!v) v = readCookie(VKEY);
    if (VARIANTS.indexOf(parseInt(v, 10)) === -1) {
      v = String(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
      try { localStorage.setItem(VKEY, v); } catch (e) {}
      writeCookie(VKEY, v);
    } else {
      v = String(parseInt(v, 10));
      try { localStorage.setItem(VKEY, v); } catch (e) {}
      writeCookie(VKEY, v);
    }
    return parseInt(v, 10);
  }

  var PRICE = getVariant();
  var PAGE = document.body.getAttribute('data-page') || 'unknown';

  /* Interpolate prices. [data-price] → variant. [data-price-bsmd] → variant + 100.
     /bsmd itself is priced flat in its HTML (premium test, no variants). */
  function paintPrices() {
    var els = document.querySelectorAll('[data-price]');
    for (var i = 0; i < els.length; i++) els[i].textContent = PRICE;
    var bs = document.querySelectorAll('[data-price-bsmd]');
    for (var j = 0; j < bs.length; j++) bs[j].textContent = PRICE + 100;
  }
  paintPrices();

  /* ---------- Traffic source ---------- */
  function getSource() {
    try {
      var saved = sessionStorage.getItem('cw_src');
      if (saved) return saved;
      var utm = new URLSearchParams(location.search).get('utm_source');
      var src = utm || (document.referrer ? new URL(document.referrer).hostname : 'direct');
      sessionStorage.setItem('cw_src', src);
      return src;
    } catch (e) { return 'direct'; }
  }
  var SRC = getSource();

  /* ---------- Analytics: every event stamped with variant, page, source ---------- */
  function track(name, props) {
    var payload = { variant: 'p' + PRICE, page: PAGE, src: SRC };
    if (props) for (var k in props) payload[k] = props[k];
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, cw: payload });
    if (typeof window.plausible === 'function') window.plausible(name, { props: payload });
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
  }
  window.cwTrack = track;
  track('page_view');

  /* ---------- Reserve flow ---------- */
  var modal = document.getElementById('reserve-modal');

  function openReserve(origin) {
    if (!modal) return;
    track('reserve_open', { origin: origin || 'unknown' });
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', 'open');
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-reserve]');
    if (opener) {
      e.preventDefault();
      openReserve(opener.getAttribute('data-open-reserve'));
      var preset = opener.getAttribute('data-track-preset');
      var sel = modal && modal.querySelector('select[name="track"]');
      if (preset && sel) sel.value = preset;
      return;
    }
    if (e.target.closest('[data-close-reserve]')) {
      e.preventDefault();
      if (modal) modal.close ? modal.close() : modal.removeAttribute('open');
    }
  });

  function mailtoFallback(subject, lines) {
    var body = lines.join('%0D%0A');
    window.location.href = 'mailto:' + CFG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) + '&body=' + body;
  }

  var reserveForm = document.getElementById('reserve-form');
  if (reserveForm) {
    reserveForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      new FormData(reserveForm).forEach(function (v, k) { d[k] = v; });
      track('reserve_submit', { track: d.track, grad_year: d.grad_year });

      var link = (d.track === 'bsmd' && CFG.STRIPE_LINK_BSMD) ? CFG.STRIPE_LINK_BSMD : CFG.STRIPE_LINK;
      if (link) {
        track('deposit_redirect', { track: d.track });
        var ref = ['p' + PRICE, d.track, SRC].join('_').replace(/[^a-zA-Z0-9_-]/g, '');
        window.location.href = link +
          (link.indexOf('?') === -1 ? '?' : '&') +
          'prefilled_email=' + encodeURIComponent(d.email) +
          '&client_reference_id=' + encodeURIComponent(ref);
      } else if (CFG.FORM_ENDPOINT) {
        d.type = 'reserve'; d.variant = 'p' + PRICE; d.src = SRC;
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(d)
        }).then(function () { showNote('reserve-note'); reserveForm.reset(); });
      } else {
        mailtoFallback('Reserve my spot — Fall 2026 cohort', [
          'Parent name: ' + d.parent_name,
          'Email: ' + d.email,
          'Student graduation year: ' + d.grad_year,
          'Track: ' + d.track
        ]);
        showNote('reserve-note');
      }
    });
  }

  /* "Just keep me posted" — interest tier, kept separate from deposits */
  var interestBtn = document.getElementById('interest-btn');
  if (interestBtn) {
    interestBtn.addEventListener('click', function () {
      var email = (modal.querySelector('input[name="email"]') || {}).value || '';
      track('interest_capture', { has_email: email ? 'yes' : 'no' });
      if (CFG.FORM_ENDPOINT && email) {
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ type: 'interest', email: email, variant: 'p' + PRICE, src: SRC })
        }).then(function () { showNote('reserve-note'); });
      } else {
        mailtoFallback('Keep me posted — Craneweave', ['Email: ' + (email || '(your email)')]);
        showNote('reserve-note');
      }
    });
  }

  function showNote(id) {
    var n = document.getElementById(id);
    if (n) n.classList.add('show');
  }

  /* ---------- Coach application form ---------- */
  var coachForm = document.getElementById('coach-form');
  if (coachForm) {
    coachForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      new FormData(coachForm).forEach(function (v, k) { d[k] = v; });
      track('coach_apply');
      if (CFG.FORM_ENDPOINT) {
        d.type = 'coach_application';
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(d)
        }).then(function () { showNote('coach-note'); coachForm.reset(); });
      } else {
        mailtoFallback('Coach application — Craneweave', [
          'Name: ' + d.name,
          'Email: ' + d.email,
          'School / program: ' + d.school,
          'Admissions history: ' + d.history,
          'LinkedIn: ' + d.linkedin
        ]);
        showNote('coach-note');
      }
    });
  }

  /* ---------- Scroll instrumentation ---------- */
  if ('IntersectionObserver' in window) {
    /* Reveal-on-scroll */
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { revealIO.observe(el); });

    /* Hero dossier settles once */
    var dossier = document.querySelector('.dossier');
    if (dossier) {
      var dIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { dossier.classList.add('settled'); dIO.disconnect(); }
        });
      }, { threshold: 0.2 });
      dIO.observe(dossier);
    }

    /* Honesty section: viewed, then passed (conversion delta instrument) */
    var honesty = document.getElementById('honesty');
    if (honesty) {
      var seen = false, passed = false;
      var hIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !seen) { seen = true; track('honesty_view'); }
          if (!en.isIntersecting && seen && !passed && en.boundingClientRect.top < 0) {
            passed = true; track('honesty_passed'); hIO.disconnect();
          }
        });
      }, { threshold: 0.3 });
      hIO.observe(honesty);
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    var d2 = document.querySelector('.dossier');
    if (d2) d2.classList.add('settled');
  }

  /* Scroll depth 50 / 90 */
  var fired = {};
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var depth = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    [0.5, 0.9].forEach(function (mark) {
      var key = 'd' + mark * 100;
      if (depth >= mark && !fired[key]) { fired[key] = true; track('scroll_' + mark * 100); }
    });
  }, { passive: true });

  /* FAQ opens */
  document.querySelectorAll('.faq details').forEach(function (dt) {
    dt.addEventListener('toggle', function () {
      if (dt.open) {
        var q = dt.querySelector('summary');
        track('faq_open', { q: q ? q.textContent.trim().slice(0, 60) : '' });
      }
    });
  });

  /* BS/MD track clicks */
  document.querySelectorAll('a[href*="/bsmd"]').forEach(function (a) {
    a.addEventListener('click', function () { track('bsmd_click'); });
  });
})();
