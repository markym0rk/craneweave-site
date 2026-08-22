/* Craneweave — the only script on the site. Nothing here is required
   for content to render.
   1. Nav: scrolled state, mega-menus, mobile drawer.
   2. Pen marks, artifact underlines, season bars, ink drawings appear once in view.
   3. FAQ accordions.
   4. Pricing estimator.
   5. /start/ reservation: staged form, persisted, summarised, submitted.
   6. Intake forms: validate, post to FORM_ENDPOINT — or hand off honestly to email.
   7. Mobile sticky CTA.
   Analytics: every funnel event calls track(); it is a no-op until a
   Plausible-style `window.plausible` function exists on the page. */
(function () {
  'use strict';

  var CFG = {
    FORM_ENDPOINT: '',               /* a JSON endpoint (Formspree, Basin…); empty = email handoff */
    MAIL: 'team@craneweave.com'
  };

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqFine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  var reduce = !!(mqReduce && mqReduce.matches), fine = !!(mqFine && mqFine.matches);
  if (mqReduce && mqReduce.addEventListener) { mqReduce.addEventListener('change', function (e) { reduce = e.matches; }); mqFine.addEventListener('change', function (e) { fine = e.matches; }); }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function track(name, props) { try { if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} }); } catch (e) {} }

  /* ---------- shared: paths, goals, plans ---------- */
  var PATHS = { student: 'A student or applicant', professional: 'Me, as a professional', team: 'My organization — AI team', program: 'My organization — student program' };
  var GOALS = { college: 'College admissions', bsmd: 'BS/MD programs', mba: 'MBA admissions', law: 'Law school', med: 'Medical school', recruiting: 'Banking and consulting', ai: 'Individual AI coaching' };
  var STAGES = { now: 'Applying this cycle', next: 'Applying next cycle', exploring: 'Still exploring' };
  var RSTAGES = { now: 'Recruiting this cycle', next: 'Recruiting next cycle', exploring: 'Still exploring' };
  var PLANS = {
    core: { name: 'Core',            price: '$299',   per: '/month', meta: '4 reviews a month · 72-hour turnaround' },
    plus: { name: 'Plus',            price: '$499',   per: '/month', meta: '7 reviews a month · 48-hour turnaround · priority coach matching' },
    five: { name: 'Five-Month Plan', price: '$1,999', per: '',       meta: 'five months of coaching · 30 reviews to use any time · priority access around major deadlines' }
  };
  function priceOf(k) { var p = PLANS[k]; return p ? p.price + p.per : ''; }
  function reserveLabel(k) { var p = PLANS[k]; return p ? 'Reserve ' + (k === 'five' ? 'the ' : '') + p.name + ' — ' + priceOf(k) : 'Reserve your spot'; }
  /* The three shapes a reservation can take. */
  var MODES = {
    individual: { submit: null, /* reserveLabel(plan) */
                  hint: 'We’ll reserve your coaching spot under the plan you chose. No payment today.',
                  note: 'No payment today. You’ll review your coach match and expected start date before enrolling.',
                  doneH1: 'Your coaching spot is reserved.',
                  doneP: 'We’ve recorded {plan} at {price}. Nothing has been charged. We’ll email {email} with your coach match and expected start date before asking you to enroll.',
                  notes: 'Deadlines, priorities, what you’ve tried, or anything else that will help us match you.' },
    team:       { submit: 'Reserve a team pilot',
                  hint: 'We’ll reserve a team pilot and send the complete scope and price in writing. No payment today.',
                  note: 'Reserve a launch spot now. We’ll send the complete scope and price in writing before you commit.',
                  doneH1: 'Your team pilot is reserved.',
                  doneP: 'Nothing has been charged. We’ll send the complete pilot scope and price to {email} so you can review them before you commit.',
                  notes: 'Tools you have seats for, who’s in the pilot, and what a good result looks like.' },
    program:    { submit: 'Reserve a student cohort',
                  hint: 'We’ll reserve a student cohort and send the complete program structure and price in writing. No payment today.',
                  note: 'Reserve a launch spot now. We’ll send the complete program structure and price in writing before you commit.',
                  doneH1: 'Your student cohort is reserved.',
                  doneP: 'Nothing has been charged. We’ll send the complete program structure and price to {email} so you can review them before you commit.',
                  notes: 'Student population, deadlines, funding requirements, or support you already provide.' }
  };
  function modeOf(path) { return path === 'team' ? 'team' : path === 'program' ? 'program' : 'individual'; }
  function fill(s, map) { return s.replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : m; }); }
  function setLabel(btn, text) { /* keep the arrow span */
    var t = btn.firstChild;
    if (t && t.nodeType === 3) t.textContent = text + ' '; else btn.insertBefore(document.createTextNode(text + ' '), btn.firstChild);
  }
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function reveal(el, show) { /* show once with the entrance; hide instantly */
    if (!el) return;
    var was = !el.hidden;
    el.hidden = !show;
    if (show && !was) {
      el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      el.addEventListener('animationend', function h() { el.classList.remove('in'); el.removeEventListener('animationend', h); }); /* the entrance plays once; later changes inside are their own motion */
    }
  }
  /* A live value is written at once, then settles from a soft state. Only when it actually changed. */
  var quiet = false; /* set while a value is being typed or restored: write, don't settle */
  function jump(top) { /* an instant reposition, overriding scroll-behavior:smooth */
    try { window.scrollTo({ top: top, left: 0, behavior: 'instant' }); }
    catch (e) { var de = document.documentElement, prev = de.style.scrollBehavior; de.style.scrollBehavior = 'auto'; void getComputedStyle(de).scrollBehavior; window.scrollTo(0, top); de.style.scrollBehavior = prev; }
  }
  function settle(el) { /* bring a newly revealed panel into view at once, so its entrance is the only motion */
    var top = el.getBoundingClientRect().top + window.scrollY - 100;
    if (top < window.scrollY || el.getBoundingClientRect().bottom > window.innerHeight) jump(Math.max(0, top));
    el.focus({ preventScroll: true });
  }
  function swap(el, html, isHtml) {
    if (!el) return;
    var cur = isHtml ? el.innerHTML : el.textContent;
    if (cur === html) return;
    if (quiet) { if (isHtml) el.innerHTML = html; else el.textContent = html; return; }
    el.classList.add('swapping');
    if (isHtml) el.innerHTML = html; else el.textContent = html;
    void el.offsetWidth;
    requestAnimationFrame(function () { el.classList.remove('swapping'); });
  }

  /* ---------- 1. nav ---------- */
  var nav = $('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 4); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var menus = $$('.nav-links > li.has-menu');
    var closeAll = function (except) {
      menus.forEach(function (li) {
        if (li === except) return;
        var b = $('.menu-btn', li), m = $('.menu', li);
        if (b) b.setAttribute('aria-expanded', 'false');
        if (m) m.setAttribute('data-open', 'false');
      });
    };
    menus.forEach(function (li, i) {
      var btn = $('.menu-btn', li), menu = $('.menu', li), t, hoverOpenedAt = 0;
      if (!btn || !menu) return;
      if (!menu.id) menu.id = 'menu-' + i;
      btn.setAttribute('aria-controls', menu.id);
      var open = function () { closeAll(li); btn.setAttribute('aria-expanded', 'true'); menu.setAttribute('data-open', 'true'); };
      var close = function () { btn.setAttribute('aria-expanded', 'false'); menu.setAttribute('data-open', 'false'); };
      btn.addEventListener('click', function () {
        clearTimeout(t);
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        if (isOpen && Date.now() - hoverOpenedAt < 600) return; /* hover opened it a moment ago; a click should not close it */
        isOpen ? close() : open();
      });
      if (fine) {
        li.addEventListener('pointerenter', function () { clearTimeout(t); t = setTimeout(function () { open(); hoverOpenedAt = Date.now(); }, 60); });
        li.addEventListener('pointerleave', function () { clearTimeout(t); t = setTimeout(close, 140); });
      }
      li.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
      li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) close(); });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.has-menu')) closeAll(); });

    var drawer = $('.drawer'), burger = $('.burger');
    if (drawer && burger) {
      var closeBtn = $('.drawer .close'), panel = $('.drawer .panel'), lastFocus, focusT;
      panel.addEventListener('transitionend', function () { panel.style.willChange = ''; });
      var openDrawer = function () {
        lastFocus = document.activeElement;
        panel.style.willChange = 'transform';
        drawer.setAttribute('data-open', 'true'); burger.setAttribute('aria-expanded', 'true');
        clearTimeout(focusT); focusT = setTimeout(function () { closeBtn.focus(); }, reduce ? 0 : 60);
      };
      var closeDrawer = function () {
        clearTimeout(focusT);
        panel.style.willChange = 'transform';
        drawer.setAttribute('data-open', 'false'); burger.setAttribute('aria-expanded', 'false');
        if (lastFocus) lastFocus.focus();
      };
      burger.addEventListener('click', openDrawer);
      closeBtn.addEventListener('click', closeDrawer);
      $('.drawer .scrim').addEventListener('click', closeDrawer);
      drawer.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeDrawer();
        if (e.key === 'Tab') {
          var f = $$('a[href],button', $('.panel', drawer)).filter(function (el) { return el.offsetParent !== null; });
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      $$('.drawer a').forEach(function (a) { a.addEventListener('click', closeDrawer); });
    }
  }

  /* ---------- 2. marks that draw once in view ---------- */
  var drawables = $$('.pen, .pen-mark, .sheet[data-artifact], .season, .report');
  if (drawables.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      drawables.forEach(function (el) { el.classList.add('drawn'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); }
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
      drawables.forEach(function (el) {
        /* Hero marks draw after the fonts settle; everything else on scroll. */
        if (el.closest('.hero, .hero-v, .hero-plain, .cta-band')) { /* a hero is complete at first paint: its mark and its sheet */
          var go = function () { requestAnimationFrame(function () { el.classList.add('drawn'); }); };
          (document.fonts && document.fonts.ready) ? document.fonts.ready.then(go) : window.addEventListener('load', go);
        } else io.observe(el);
      });
    }
  }

  /* Ink drawings fade in the first time they are seen. Gated on decode, so the
     fade never plays on a box that is still empty. Hero drawings carry no
     data-ink: they are there at first paint. */
  var inked = $$('.plate[data-ink]');
  if (inked.length) {
    var draw = function (plate) {
      var img = plate.querySelector('img');
      var row = plate.closest('.system-grid, .strip, .path-grid, .people');
      var done = function () {
        if (row && !reduce) { /* siblings in a row arrive one after another, 60ms apart */
          var i = $$('.plate[data-ink]', row).indexOf(plate);
          if (i > 0) { plate.style.transitionDelay = (i * 60) + 'ms'; plate.addEventListener('transitionend', function () { plate.style.transitionDelay = ''; }, { once: true }); }
        }
        plate.classList.add('drawn');
      };
      if (img && img.decode) img.decode().then(done, done); else done();
    };
    if (reduce || !('IntersectionObserver' in window)) {
      inked.forEach(function (plate) { plate.classList.add('drawn'); });
    } else {
      var inkIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { draw(e.target); inkIo.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      inked.forEach(function (plate) { inkIo.observe(plate); });
    }
  }

  /* The season map's "now" marker follows the calendar. */
  (function () {
    var months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    var cur = months[new Date().getMonth()];
    var cells = $$('.season-m');
    if (!cells.length) return;
    var hit = false;
    cells.forEach(function (m) {
      var mo = ($('.mo', m) || {}).textContent || '';
      var first = mo.trim().toLowerCase().slice(0, 3);
      var is = first === cur;
      m.classList.toggle('now', is); if (is) hit = true;
    });
    if (!hit) cells.forEach(function (m) { m.classList.remove('now'); });
  })();

  /* ---------- 3. FAQ ---------- */
  $$('.faq').forEach(function (f) {
    var q = $('.faq-q', f), a = $('.faq-a', f);
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', open ? 'false' : 'true');
      a.setAttribute('data-open', open ? 'false' : 'true');
      if (!open) track('faq_open', { q: q.textContent.trim().slice(0, 60) });
    });
  });

  /* ---------- 4. pricing estimator ---------- */
  var estr = $('#estimator');
  if (estr) {
    var counts = { drafts: 3, strategy: 1, checks: 1 };
    var out = $('.est-out', estr), oPlan = $('.o-plan', out), oPrice = $('.o-price', out), oMeta = $('.o-meta', out), oBtn = $('.btn', out);
    var paintEst = function () {
      var total = counts.drafts + counts.strategy + counts.checks;
      var k = total <= 4 ? 'core' : total <= 7 ? 'plus' : 'five';
      var p = PLANS[k], why;
      if (total === 0) why = 'Nothing ready for review yet? Start with Core when you want your coach and plan in place.';
      else if (k === 'core') why = total + ' review' + (total === 1 ? ' fits' : 's fit') + ' in one month of Core.';
      else if (k === 'plus') why = total + ' reviews in a month fits Plus.';
      else if (total > 30) why = 'More than 30 reviews — the Five-Month Plan is the largest individual option. Teams and student programs can reserve a separately scoped pilot or cohort.';
      else why = total + ' reviews is more than Plus covers in a month—the Five-Month Plan pools 30 across five months.';
      swap(oPlan, p.name); swap(oPrice, p.price + (p.per ? '<small>' + p.per + '</small>' : ''), true); swap(oMeta, why);
      oBtn.setAttribute('href', '/start/?plan=' + k);
      if (oBtn.firstChild.textContent.trim() !== reserveLabel(k)) { oBtn.classList.add('swapping'); setLabel(oBtn, reserveLabel(k)); void oBtn.offsetWidth; requestAnimationFrame(function () { oBtn.classList.remove('swapping'); }); }
    };
    $$('.stepper', estr).forEach(function (s) {
      var key = s.getAttribute('data-key'), o = $('output', s), dec = $('.dec', s), inc = $('.inc', s);
      var set = function (v) {
        counts[key] = Math.max(0, Math.min(12, v)); o.textContent = counts[key];
        dec.setAttribute('aria-disabled', counts[key] === 0 ? 'true' : 'false'); inc.setAttribute('aria-disabled', counts[key] === 12 ? 'true' : 'false');
        paintEst();
      };
      set(counts[key]);
      $('.dec', s).addEventListener('click', function () { set(counts[key] - 1); });
      $('.inc', s).addEventListener('click', function () { set(counts[key] + 1); });
    });
    oBtn.addEventListener('click', function () { track('estimator_click', { plan: oBtn.getAttribute('href').split('=')[1] }); });
    paintEst();
  }

  /* ---------- 5. /start/ reservation ---------- */
  var start = $('#start');
  if (start) {
    var TEXT = ['role', 'tools', 'task', 'company', 'teamsize', 'tried', 'result', 'organization', 'students', 'when', 'yourrole', 'name', 'email', 'notes'];
    var RADIO = ['path', 'goal', 'stage', 'pgoal', 'rstage', 'focus', 'plan', 'goals', 'who'];
    var PATH_DETAIL = ['goal', 'stage', 'pgoal', 'rstage', 'focus', 'plan', 'goals', 'who', 'role', 'tools', 'task', 'company', 'teamsize', 'tried', 'result', 'organization', 'students', 'when', 'yourrole'];
    var freshState = function () {
      var s = { step: 1 };
      TEXT.concat(RADIO).forEach(function (k) { s[k] = ''; });
      return s;
    };
    var state = freshState();
    var q2 = new URLSearchParams(location.search);
    var qPath = PATHS[q2.get('path')] ? q2.get('path') : '';
    var qGoal = GOALS[q2.get('goal')] ? q2.get('goal') : '';
    var qStage = STAGES[q2.get('stage')] ? q2.get('stage') : '';
    var qPlan = PLANS[q2.get('plan')] ? q2.get('plan') : '';
    var routeQuery = !!(qPath || qGoal || qStage || qPlan);
    var pendingGoal = '', pendingStage = '', fromPricing = false;

    /* Retire the old, persistent draft. A route deep-link is an explicit new
       request; only a query-free visit resumes this tab's unfinished flow. */
    try { localStorage.removeItem('cw.start'); } catch (e) {}
    if (!routeQuery) {
      try {
        var restored = JSON.parse(sessionStorage.getItem('cw.start') || '{}');
        Object.keys(state).forEach(function (k) { if (restored[k] != null) state[k] = restored[k]; });
      } catch (e) {}
    }

    var radioAllowed = function (name, value) {
      return !value || $$('input[name="' + name + '"]', start).some(function (r) { return r.value === value; });
    };
    RADIO.forEach(function (k) { if (!radioAllowed(k, state[k])) state[k] = ''; });
    if (!PATHS[state.path]) state.path = '';
    var allowedByPath = {
      student: ['goal', 'stage', 'rstage', 'focus', 'plan', 'who'],
      professional: ['pgoal', 'rstage', 'focus', 'plan', 'role', 'tools', 'task'],
      team: ['company', 'teamsize', 'tried', 'result', 'yourrole'],
      program: ['organization', 'students', 'goals', 'when', 'yourrole']
    };
    PATH_DETAIL.forEach(function (k) {
      var allowed = state.path ? allowedByPath[state.path] : ['plan'];
      if (allowed.indexOf(k) < 0) state[k] = '';
    });
    if (state.path === 'student') {
      if (state.goal === 'recruiting') state.stage = '';
      else { state.rstage = ''; state.focus = ''; }
    } else if (state.path === 'professional') {
      if (state.pgoal === 'ai') { state.rstage = ''; state.focus = ''; }
      else if (state.pgoal === 'recruiting') { state.role = ''; state.tools = ''; state.task = ''; }
      else { state.rstage = ''; state.focus = ''; state.role = ''; state.tools = ''; state.task = ''; }
    }

    /* A goal without a path is unambiguous except recruiting, which is shared
       by students and professionals and is applied after the visitor chooses. */
    if (!qPath && qGoal) {
      if (qGoal === 'ai') qPath = 'professional';
      else if (qGoal === 'recruiting') { pendingGoal = qGoal; pendingStage = qStage; }
      else qPath = 'student';
    }
    if (qPath) {
      state.path = qPath;
      if (qPath === 'student' && qGoal && qGoal !== 'ai') state.goal = qGoal;
      else if (qPath === 'professional' && (qGoal === 'ai' || qGoal === 'recruiting')) state.pgoal = qGoal;
    }
    var selectedGoal = state.path === 'professional' ? state.pgoal : state.goal;
    if (qStage) {
      if (selectedGoal === 'recruiting') state.rstage = qStage;
      else if (state.path === 'student' && selectedGoal) state.stage = qStage;
    }
    if (qPlan && (!state.path || modeOf(state.path) === 'individual')) state.plan = qPlan;
    fromPricing = !!(qPlan && !state.path);
    if (q2.get('email') && EMAIL.test(q2.get('email'))) state.email = q2.get('email');

    var isRecruiting = function () { return state.path === 'student' ? state.goal === 'recruiting' : state.path === 'professional' && state.pgoal === 'recruiting'; };
    var needsStage = function () { return state.path === 'student' && !!state.goal && state.goal !== 'recruiting'; };
    var stepTwoReady = function () {
      if (state.path === 'student') return !!(state.goal && state.plan && (isRecruiting() ? state.rstage && state.focus : state.stage));
      if (state.path === 'professional') return !!(state.pgoal && state.plan && (state.pgoal === 'ai' ? state.role && state.task : state.rstage && state.focus));
      if (state.path === 'team') return !!(state.company && state.teamsize && state.tried && state.result);
      if (state.path === 'program') return !!(state.organization && state.students && state.goals && state.when);
      return false;
    };
    if (routeQuery) state.step = state.path ? (stepTwoReady() ? 3 : 2) : 1;
    else {
      state.step = Math.max(1, Math.min(3, Number(state.step) || 1));
      if (!state.path) state.step = 1;
      else if (state.step === 3 && !stepTwoReady()) state.step = 2;
    }
    if (q2.toString()) history.replaceState(null, '', location.pathname + location.hash); /* keep choices and email out of the URL */

    var stages = $$('.stage', start), bars = $$('.progress i', start), stepLabel = $('.progress span', start);
    var form = $('#start-form'); form.setAttribute('novalidate', '');
    var submitB = $('button[type="submit"]', form);
    var sum = { path: $('[data-sum="path"]'), goal: $('[data-sum="goal"]'), stage: $('[data-sum="stage"]'), plan: $('[data-sum="plan"]'), price: $('[data-sum="price"]'), who: $('[data-sum="who"]'), email: $('[data-sum="email"]'), note: $('.sum-note') };
    var whoRow = $$('[data-sum-row="who"], [data-sum="who"]');
    var lbl = { goal: $('[data-sum-label="goal"]'), stage: $('[data-sum-label="stage"]'), plan: $('[data-sum-label="plan"]') };
    var save = function () { try { sessionStorage.setItem('cw.start', JSON.stringify(state)); } catch (e) {} };
    var clearSaved = function () { try { sessionStorage.removeItem('cw.start'); } catch (e) {} };
    var mode = function () { return modeOf(state.path); };
    var syncFromDom = function () {
      TEXT.forEach(function (k) { var el = $('[name="' + k + '"]', start); if (el) state[k] = el.value.trim(); });
      RADIO.forEach(function (k) { var r = $('input[name="' + k + '"]:checked', start); if (r) state[k] = r.value; });
    };
    var clearFields = function (keys) {
      keys.forEach(function (k) {
        state[k] = '';
        $$('[name="' + k + '"]', start).forEach(function (input) {
          if (input.type === 'radio' || input.type === 'checkbox') input.checked = false;
          else input.value = '';
          input.removeAttribute('aria-invalid');
          (input.getAttribute('aria-describedby') || '').split(/\s+/).forEach(function (id) { var e = id && document.getElementById(id); if (e && e.classList.contains('field-error')) e.textContent = ''; });
        });
        var namedError = document.getElementById(k + '-error'); if (namedError) namedError.textContent = '';
      });
    };
    var checkRadio = function (name, value) {
      $$('input[name="' + name + '"]', start).forEach(function (r) { r.checked = r.value === value; });
    };

    /* Which questions show, given the path so far. */
    var variantOn = function (v) {
      var p = state.path;
      switch (v) {
        case 'individual': return p === 'student' || p === 'professional';
        case 'student': return p === 'student';
        case 'student-stage': return !!needsStage();
        case 'professional': return p === 'professional';
        case 'pro-ai': return p === 'professional' && state.pgoal === 'ai';
        case 'recruiting': return isRecruiting();
        case 'plan': return (p === 'student' && !!state.goal) || (p === 'professional' && !!state.pgoal);
        case 'team': return p === 'team';
        case 'program': return p === 'program';
        case 'org': return p === 'team' || p === 'program';
      }
      return true;
    };
    var paintVariants = function (animate) {
      $$('[data-variant]', start).forEach(function (v) {
        var on = variantOn(v.getAttribute('data-variant'));
        if (animate) reveal(v, on); else v.hidden = !on;
      });
    };

    var paintSummary = function () {
      var put = function (el, v) { if (!el) return; swap(el, v || '—'); el.classList.toggle('empty', !v); };
      var p = state.path, m = MODES[mode()];
      whoRow.forEach(function (el) { el.hidden = p !== 'student'; }); put(sum.who, state.who);
      put(sum.path, PATHS[p]);
      if (p === 'team') { lbl.goal.textContent = 'Company'; put(sum.goal, state.company); lbl.stage.textContent = 'Team size'; put(sum.stage, state.teamsize ? state.teamsize + ' people' : ''); }
      else if (p === 'program') { lbl.goal.textContent = 'Organization'; put(sum.goal, state.organization); lbl.stage.textContent = 'Number of students'; put(sum.stage, state.students); }
      else {
        lbl.goal.textContent = 'Goal'; lbl.stage.textContent = 'Stage or scope';
        put(sum.goal, p === 'professional' ? (state.pgoal === 'ai' ? GOALS.ai : state.pgoal === 'recruiting' ? GOALS.recruiting : '') : GOALS[state.goal]);
        put(sum.stage, p === 'professional' ? (state.pgoal === 'ai' ? state.role : RSTAGES[state.rstage]) : (state.goal === 'recruiting' ? RSTAGES[state.rstage] : STAGES[state.stage]));
      }
      lbl.plan.textContent = 'Plan';
      if (p === 'team') { put(sum.plan, 'Team pilot'); put(sum.price, 'In writing'); }
      else if (p === 'program') { put(sum.plan, 'Student cohort'); put(sum.price, 'In writing'); }
      else { put(sum.plan, state.plan && PLANS[state.plan] ? PLANS[state.plan].name : ''); put(sum.price, priceOf(state.plan)); }
      put(sum.email, state.email);
      var card = $('.summary-card'); if (card) card.setAttribute('data-has', (p || state.plan) ? 'true' : 'false');
      if (sum.note) {
        if (!p) sum.note.textContent = fromPricing && PLANS[state.plan] ? 'Selected on the pricing page: ' + PLANS[state.plan].name + ' at ' + priceOf(state.plan) + '.' : 'Choose a path to see what we’ll ask next.';
        else if (mode() === 'individual') sum.note.textContent = state.plan ? (PLANS[state.plan].meta.charAt(0).toUpperCase() + PLANS[state.plan].meta.slice(1) + '. ' + m.note) : 'Choose a path and plan to continue.';
        else sum.note.textContent = m.note;
      }
      /* step 3 and the done card speak in the reservation's current mode */
      var hint3 = $('[data-hint3]', start), notes = $('#s-notes', start);
      if (hint3) hint3.textContent = m.hint;
      if (notes) notes.placeholder = m.notes;
      setLabel(submitB, m.submit || reserveLabel(state.plan));
    };

    var show = function (n, byUser) {
      var prev = state.step;
      state.step = n; save();
      if (byUser) { /* reposition instantly, before the new stage paints — the stage entrance is then the only motion */
        var top = start.getBoundingClientRect().top + window.scrollY - 100;
        if (window.scrollY > top) jump(Math.max(0, top));
      }
      start.setAttribute('data-step', String(n));
      if (byUser) start.setAttribute('data-nav', n < prev ? 'back' : 'fwd'); else start.removeAttribute('data-nav');
      stages.forEach(function (s) { s.setAttribute('data-active', s.getAttribute('data-step') === String(n) ? 'true' : 'false'); });
      bars.forEach(function (b, i) { b.className = i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''; });
      if (stepLabel) stepLabel.textContent = 'Step ' + n + ' of 3';
      paintVariants(false); paintSummary();
      var h = $$('.stage[data-active="true"] h2.stage-h', start).filter(function (el) { return el.offsetParent !== null; })[0];
      if (h) { h.setAttribute('tabindex', '-1'); if (byUser) h.focus({ preventScroll: true }); }
      track('start_step', { step: n, path: state.path || 'none' });
    };

    RADIO.forEach(function (k) {
      $$('input[name="' + k + '"]', start).forEach(function (r) {
        r.checked = r.value === state[k];
        r.addEventListener('change', function () {
          state[k] = r.value;
          if (k === 'path') {
            clearFields(PATH_DETAIL);
            state.path = r.value;
            if (pendingGoal === 'recruiting' && modeOf(r.value) === 'individual') {
              if (r.value === 'student') { state.goal = 'recruiting'; checkRadio('goal', 'recruiting'); }
              else { state.pgoal = 'recruiting'; checkRadio('pgoal', 'recruiting'); }
              if (pendingStage) { state.rstage = pendingStage; checkRadio('rstage', pendingStage); }
            }
            if (fromPricing && qPlan && modeOf(r.value) === 'individual') { state.plan = qPlan; checkRadio('plan', qPlan); }
          } else if (k === 'goal') {
            pendingGoal = ''; pendingStage = '';
            clearFields(['stage', 'rstage', 'focus']);
          } else if (k === 'pgoal') {
            pendingGoal = ''; pendingStage = '';
            clearFields(['rstage', 'focus', 'role', 'tools', 'task']);
          }
          var err = document.getElementById(k + '-error'); if (err) err.textContent = '';
          $$('input[name="' + k + '"]', start).forEach(function (x) { x.removeAttribute('aria-invalid'); });
          paintVariants(true); paintSummary(); save();
        });
      });
    });
    TEXT.forEach(function (k) {
      var el = $('[name="' + k + '"]', start); if (!el) return;
      el.value = state[k] || '';
      el.addEventListener('input', function () { state[k] = el.value.trim(); if (el.value.trim() && el.getAttribute('aria-invalid') === 'true') invalid(el, ''); quiet = true; paintSummary(); quiet = false; save(); });
    });
    var reset = $('[data-reset]', start);
    if (reset) reset.addEventListener('click', function () {
      clearSaved();
      Object.keys(state).forEach(function (k) { state[k] = k === 'step' ? 1 : ''; });
      fromPricing = false; pendingGoal = ''; pendingStage = '';
      $$('input[type="radio"]', start).forEach(function (r) { r.checked = false; });
      $$('input[type="text"],input[type="email"],textarea', start).forEach(function (i) { i.value = ''; });
      $$('.field-error', start).forEach(function (e) { e.textContent = ''; });
      $$('[aria-invalid]', start).forEach(function (i) { i.removeAttribute('aria-invalid'); });
      show(1, true);
    });

    var invalid = function (input, msg) {
      var err = document.getElementById(input.id + '-error');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    var radioErr = function (name, msg) {
      var e = document.getElementById(name + '-error'), bad = !state[name];
      $$('input[name="' + name + '"]', start).forEach(function (r) { r.setAttribute('aria-invalid', bad ? 'true' : 'false'); });
      if (bad) { if (e) e.textContent = msg; return $('input[name="' + name + '"]', start); }
      if (e) e.textContent = ''; return null;
    };
    var textErr = function (names) {
      var first = null;
      names.forEach(function (k) { var el = $('[name="' + k + '"]', start); if (!el) return; if (!el.value.trim()) { invalid(el, 'Required.'); if (!first) first = el; } else invalid(el, ''); });
      return first;
    };
    var validateStep = function (n) {
      var bad = null, b;
      if (n === 1) bad = radioErr('path', 'Choose who coaching is for.');
      else if (n === 2) {
        if (state.path === 'student') {
          bad = radioErr('goal', 'Choose what you’re working toward.');
          if (!bad && isRecruiting()) { bad = radioErr('rstage', 'Choose the option that is closest.'); if (!bad) bad = radioErr('focus', 'Pick one.'); }
          else if (!bad && needsStage()) bad = radioErr('stage', 'Choose the option that is closest.');
          if (!bad) bad = radioErr('plan', 'Choose a plan.');
        } else if (state.path === 'professional') {
          bad = radioErr('pgoal', 'Pick one.');
          if (!bad && state.pgoal === 'ai') bad = textErr(['role', 'task']);
          if (!bad && state.pgoal === 'recruiting') { bad = radioErr('rstage', 'Choose the option that is closest.'); if (!bad) bad = radioErr('focus', 'Pick one.'); }
          if (!bad) bad = radioErr('plan', 'Choose a plan.');
        } else if (state.path === 'team') bad = textErr(['company', 'teamsize', 'tried', 'result']);
        else if (state.path === 'program') { bad = textErr(['organization', 'students']); if (!bad) bad = radioErr('goals', 'Pick one.'); if (!bad) bad = textErr(['when']); }
      }
      if (bad) { bad.focus(); return false; }
      return true;
    };

    $$('[data-next]', start).forEach(function (b) {
      b.addEventListener('click', function () { syncFromDom(); if (validateStep(state.step)) show(state.step + 1, true); });
    });
    $$('[data-back]', start).forEach(function (b) { b.addEventListener('click', function () { show(Math.max(1, state.step - 1), true); }); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.hasAttribute('data-sending')) return;
      syncFromDom();
      var nameEl = $('[name="name"]', form), emailEl = $('[name="email"]', form), ok = true, firstBad = null;
      if (!nameEl.value.trim()) { invalid(nameEl, 'Required.'); ok = false; firstBad = nameEl; } else invalid(nameEl, '');
      if (!EMAIL.test(emailEl.value.trim())) { invalid(emailEl, 'Enter an email address we can reply to.'); ok = false; firstBad = firstBad || emailEl; } else invalid(emailEl, '');
      if (variantOn('org')) { var rl = $('[name="yourrole"]', form); if (!rl.value.trim()) { invalid(rl, 'Required.'); ok = false; firstBad = firstBad || rl; } else invalid(rl, ''); }
      if (!ok) { var bads = $$('[aria-invalid="true"]', form); (bads[0] || firstBad).focus(); return; }
      var m = MODES[mode()], p = state.path;
      var goalKey = p === 'professional' ? state.pgoal : state.goal;
      var goalLabel = GOALS[goalKey] || '';
      var planLabel = state.plan && PLANS[state.plan] ? PLANS[state.plan].name + ' — ' + priceOf(state.plan) : '';
      var data = {
        path: PATHS[p], name: state.name, email: state.email, notes: state.notes, source: '/start/'
      };
      if (p === 'student') {
        data.goal = goalLabel; data.plan = planLabel; data.who = state.who;
        if (isRecruiting()) { data.stage = RSTAGES[state.rstage]; data.focus = state.focus; }
        else data.stage = STAGES[state.stage];
      } else if (p === 'professional') {
        data.goal = goalLabel; data.plan = planLabel;
        if (state.pgoal === 'ai') { data.role = state.role; data.tools = state.tools; data.task = state.task; }
        else { data.stage = RSTAGES[state.rstage]; data.focus = state.focus; }
      } else if (p === 'team') {
        data.company = state.company; data.teamsize = state.teamsize; data.tried = state.tried; data.result = state.result; data.role = state.yourrole;
      } else if (p === 'program') {
        data.organization = state.organization; data.students = state.students; data.goals = state.goals; data.when = state.when; data.role = state.yourrole;
      }
      Object.keys(data).forEach(function (k) { if (!data[k]) delete data[k]; });
      var subject = mode() === 'individual' ? reserveLabel(state.plan) + ' — ' + goalLabel : m.submit + ' — ' + (state.company || state.organization);
      submitB.setAttribute('aria-busy', 'true'); form.setAttribute('data-sending', '');
      var map = { plan: state.plan && PLANS[state.plan] ? PLANS[state.plan].name : '', price: priceOf(state.plan), email: state.email };
      send(data, subject, function () {
        clearSaved();
        $('.start-flow', start).hidden = true;
        var done = $('.start-done', start); done.hidden = false;
        var h = $('h2', done), first = m.doneH1.split(' ')[0], rest = m.doneH1.slice(first.length);
        h.innerHTML = '';
        var mark = document.createElement('span'); mark.className = 'pen'; mark.textContent = first;
        mark.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M1 5.5 Q 25 3.4, 50 5 T 99 4.4" pathLength="1"/></svg>');
        h.appendChild(mark); h.appendChild(document.createTextNode(rest));
        $('[data-done-p]', done).textContent = fill(m.doneP, map);
        h.setAttribute('tabindex', '-1'); settle(h);
        requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('drawn'); }); }); /* the pen signs the one success moment */
        track('start_done', { path: state.path, goal: goalKey || 'none', mode: mode() });
      }, function () {
        submitB.setAttribute('aria-busy', 'false'); form.removeAttribute('data-sending');
        clearSaved();
        fallback(form, subject, data);
        track('start_fallback', { path: state.path, goal: goalKey || 'none', mode: mode() });
      });
    });

    start.setAttribute('data-restoring', '');
    quiet = true; show(state.step); quiet = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { start.removeAttribute('data-restoring'); }); });
  }

  /* ---------- 6. intake forms ---------- */
  $$('form[data-intake]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.hasAttribute('data-sending')) return;
      var first = null;
      $$('[data-required]', form).forEach(function (input) {
        var value = input.value.trim();
        var bad = !value || (input.type === 'email' && !EMAIL.test(value));
        if (input.type === 'radio') { bad = !form.querySelector('input[name="' + input.name + '"]:checked'); }
        var err = document.getElementById(input.id + '-error');
        (input.type === 'radio' ? $$('input[name="' + input.name + '"]', form) : [input]).forEach(function (i) { i.setAttribute('aria-invalid', bad ? 'true' : 'false'); });
        var own = input.getAttribute('data-err');
        if (err) err.textContent = bad ? (own && !(input.type === 'email' && value) ? own : input.type === 'email' ? (value ? 'Enter a valid email address.' : 'Enter an email address we can reply to.') : input.type === 'radio' ? 'Pick one.' : 'Required.') : '';
        if (bad && !first) first = input;
      });
      if (first) {
        if (!form.hasAttribute('data-clearing')) { /* after the first failed submit, a corrected field clears its own error */
          form.setAttribute('data-clearing', '');
          form.addEventListener('input', clearOne); form.addEventListener('change', clearOne);
        }
        first.focus(); return;
      }

      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        data[el.name] = el.value;
      });
      data.source = window.location.pathname;
      var subject = form.getAttribute('data-subject') || 'Craneweave';
      var btn = $('button[type="submit"]', form); if (btn) btn.setAttribute('aria-busy', 'true'); form.setAttribute('data-sending', '');
      send(data, subject, function () { done(form); track('form_done', { form: form.getAttribute('data-intake') }); },
                          function () { if (btn) btn.setAttribute('aria-busy', 'false'); form.removeAttribute('data-sending'); fallback(form, subject, data); track('form_fallback', { form: form.getAttribute('data-intake') }); });
    });
  });

  function clearOne(e) {
    var input = e.target; if (!input || !input.name) return;
    var value = (input.value || '').trim(), good = input.type === 'radio' ? input.checked : input.type === 'email' ? EMAIL.test(value) : !!value;
    if (!good) return;
    var group = input.type === 'radio' ? $$('input[name="' + input.name + '"]', input.form) : [input];
    group.forEach(function (i) { i.setAttribute('aria-invalid', 'false'); var err = document.getElementById(i.id + '-error'); if (err) err.textContent = ''; });
  }
  function send(data, subject, ok, fail) {
    data.subject = subject;
    if (CFG.FORM_ENDPOINT && window.fetch) {
      fetch(CFG.FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) { if (!r.ok) throw new Error(r.status); ok(); }).catch(fail);
    } else fail();
  }
  function bodyOf(data) {
    return Object.keys(data).filter(function (k) { return k !== 'subject'; }).map(function (k) { return k + ': ' + data[k]; }).join('\n');
  }
  /* No endpoint answered. Say so, open the visitor's mail app, and give
     them the request to copy — never a false "Received". */
  function fallback(form, subject, data) {
    var old = form.parentNode.querySelector('.fallback'); if (old) old.remove();
    var body = bodyOf(data);
    var href = 'mailto:' + CFG.MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    var box = document.createElement('div'); box.className = 'fallback'; box.setAttribute('tabindex', '-1');
    box.innerHTML = '<p><strong>Your request wasn’t sent from this page.</strong> Your email app should open with a pre-filled message—press Send there. If it didn’t open, copy the request below and email it to <a href="mailto:' + CFG.MAIL + '">' + CFG.MAIL + '</a>:</p>' +
      '<textarea class="input" readonly aria-label="Your request"></textarea>' +
      '<div class="btn-row"><a class="btn sm" href="' + href + '">Open my email app</a><button class="btn ghost sm" type="button" data-copy>Copy the request</button></div>';
    $('textarea', box).value = 'To: ' + CFG.MAIL + '\nSubject: ' + subject + '\n\n' + body;
    $('[data-copy]', box).addEventListener('click', function () {
      var b = this, t = $('textarea', box);
      var okc = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy the request'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(okc, function () { t.select(); });
      else { t.select(); try { document.execCommand('copy'); okc(); } catch (e) {} }
    });
    form.parentNode.insertBefore(box, form.nextSibling);
    settle(box);
    setTimeout(function () { window.location.href = href; }, 150);
  }
  function done(form) {
    var p = document.createElement('p');
    p.className = 'form-done';
    if (form.id) p.id = form.id;
    p.innerHTML = '<span></span><small></small>';
    var pr = $('input[name="plan"]:checked', form), map = { plan: pr ? pr.getAttribute('data-name') : 'your plan', price: pr ? pr.getAttribute('data-price') : '' };
    p.firstChild.textContent = fill(form.getAttribute('data-done') || 'Received. We’ll reply in writing.', map);
    p.lastChild.textContent = fill(form.getAttribute('data-done-sub') || 'Check your inbox for a reply from ' + CFG.MAIL + '.', map);
    p.setAttribute('tabindex', '-1');
    var link = form.getAttribute('data-done-link');
    if (link) { var a = document.createElement('a'); a.className = 'arrowlink'; a.href = link; a.textContent = form.getAttribute('data-done-link-label') || 'Continue →'; p.appendChild(a); }
    form.parentNode.replaceChild(p, form);
    settle(p);
  }

  /* ---------- 7. mobile sticky CTA ---------- */
  var bar = $('.sticky-bar'), hero = $('.hero, .hero-v, .hero-plain');
  if (bar && hero && 'IntersectionObserver' in window) {
    var heroIn = true, ctaIn = false, footIn = false;
    var paintBar = function () { bar.setAttribute('data-show', (!heroIn && !ctaIn && !footIn) ? 'true' : 'false'); };
    new IntersectionObserver(function (e) { heroIn = e[0].isIntersecting; paintBar(); }, { threshold: 0 }).observe(hero);
    var cta = $('.cta-band'); if (cta) new IntersectionObserver(function (e) { ctaIn = e[0].isIntersecting; paintBar(); }, { threshold: 0.2 }).observe(cta);
    var foot = $('footer'); if (foot) new IntersectionObserver(function (e) { footIn = e[0].isIntersecting; paintBar(); }, { threshold: 0 }).observe(foot);
    $('a', bar).addEventListener('click', function () { track('sticky_click', { page: location.pathname }); });
  }
})();
