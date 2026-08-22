/* Craneweave — the only script on the site. Nothing here is required
   for content to render.
   1. Nav: scrolled state, mega-menus, mobile drawer.
   2. Pen marks, artifact underlines, season bars, ink drawings appear once in view.
   3. Hero request widget: goal listbox → stage → live plan estimate → /start/.
   4. FAQ accordions.
   5. Pricing estimator.
   6. /start/ intake: staged form, persisted, summarised, submitted.
   7. Intake forms: validate, post to FORM_ENDPOINT — or hand off honestly to email.
   8. Mobile sticky CTA.
   Analytics: every funnel event calls track(); it is a no-op until a
   Plausible-style `window.plausible` function exists on the page. */
(function () {
  'use strict';

  var CFG = {
    FORM_ENDPOINT: '',               /* a JSON endpoint (Formspree, Basin…); empty = email handoff */
    MAIL: 'team@craneweave.com'
  };

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function track(name, props) { try { if (typeof window.plausible === 'function') window.plausible(name, { props: props || {} }); } catch (e) {} }

  /* ---------- shared: goals + plans ---------- */
  var GOALS = {
    college:    { label: 'College admissions',   href: '/college/',       cohort: false },
    bsmd:       { label: 'BS/MD programs',       href: '/bsmd/',          cohort: false },
    mba:        { label: 'MBA admissions',       href: '/mba/',           cohort: 'October 2026' },
    law:        { label: 'Law school',           href: '/law/',           cohort: 'October 2026' },
    med:        { label: 'Medical school',       href: '/med/',           cohort: 'January 2027' },
    recruiting: { label: 'Banking & consulting', href: '/recruiting/',    cohort: 'October 2026' },
    org:        { label: "My team's AI skills",  href: '/organizations/', cohort: false }
  };
  var STAGES = { now: 'Applying this cycle', next: 'Next cycle', exploring: 'Still exploring' };
  var PLANS = {
    core:     { name: 'Core',        price: '$299',     per: '/month',  meta: '4 reviews a month · 72-hour turnaround · cancel monthly' },
    plus:     { name: 'Plus',        price: '$499',     per: '/month',  meta: '8 reviews a month · 48-hour turnaround · priority matching' },
    season:   { name: 'Season Pass', price: '$1,999',   per: '/season', meta: 'Aug 1–Jan 15 · 24 reviews any time · priority access in the November crunch' },
    alacarte: { name: 'One review',  price: 'From $49', per: '',        meta: 'A single essay, school list, full application, or check-in review · no subscription' }
  };
  /* The three shapes the funnel can take. */
  var MODES = {
    coach: { submit: 'Find your coach', h1: 'Where should we send your match?',
             hint: 'We reply in writing with your coach match — or, if we can’t match your list, we tell you before you pay anything. Nothing is charged until you choose a plan.',
             doneH1: 'Received. Your match is on its way.',
             doneP: 'Check {email} for a reply from ' + CFG.MAIL + '. We answer in writing — and if we can’t match your list, we tell you before you pay anything.',
             subject: 'Find my coach — {goal}', notes: 'Target schools, deadlines, what you’ve tried.' },
    hold:  { submit: 'Hold my place', h1: 'Where should we reach you when the cohort opens?',
             hint: 'Joining the list is free and holds your place. Published pricing from $299/month — nothing is charged until you choose a plan.',
             doneH1: 'Received. Your place is held.',
             doneP: 'We’ll email {email} the moment your coach match is ready. Nothing is charged until you choose a plan.',
             subject: 'Hold my place — {goal}', notes: 'Target programs, rounds, whether you’re reapplying.' },
    org:   { submit: 'Get a pilot proposal in writing', h1: 'Where should we send the pilot plan?',
             hint: 'A written pilot plan within 24 hours. No sales call unless you want one.',
             doneH1: 'Received. Your pilot proposal is on its way.',
             doneP: 'A written pilot plan will reach {email} within 24 hours, from ' + CFG.MAIL + '. No sales call unless you want one.',
             subject: 'Pilot proposal request', notes: 'Tools you have seats for, who’s in the pilot, what a good result looks like.' }
  };
  function modeFor(goal) { var g = GOALS[goal]; return goal === 'org' ? 'org' : (g && g.cohort) ? 'hold' : 'coach'; }

  /* Which plan to suggest, and what to say about it. */
  function estimate(goal, stage) {
    var g = GOALS[goal] || GOALS.college;
    if (goal === 'org') {
      return { plan: 'Pilot proposal', price: 'In writing', per: '', meta: 'Answer three questions about your team. We send back a pilot plan within 24 hours.', key: 'org' };
    }
    if (g.cohort) {
      return { plan: 'Founding cohort', price: 'From $299', per: '/month', meta: 'Opens ' + g.cohort + '. Joining the list is free and holds your place.', key: 'hold' };
    }
    var m = new Date().getMonth(); /* 0 = Jan */
    var inSeason = m >= 7 || m === 0; /* Aug–Jan */
    var p = PLANS.core, why;
    if (stage === 'now' && inSeason) why = 'Start here — or take the whole senior season on the Season Pass, $1,999.';
    else if (stage === 'now') why = 'Start here. Plus is $499 for 8 reviews at 48 hours.';
    else if (stage === 'next') why = 'Start here. A season plan built around next cycle’s deadlines.';
    else why = 'Start here. Or try one à la carte review from $49 first.';
    return { plan: p.name, price: p.price, per: p.per, meta: why + ' ' + p.meta, key: 'core' };
  }
  function setLabel(btn, text) { /* keep the arrow span */
    var t = btn.firstChild;
    if (t && t.nodeType === 3) t.textContent = text + ' '; else btn.insertBefore(document.createTextNode(text + ' '), btn.firstChild);
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
        if (el.closest('.hero, .hero-v, .hero-plain, .cta-band') && el.classList.contains('pen')) {
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
      var done = function () { plate.classList.add('drawn'); };
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

  /* ---------- 3. hero request widget ---------- */
  var widget = $('#request');
  if (widget) {
    var lbBtn = $('.lb-btn', widget), lbList = $('.lb-list', widget), lbVal = $('.lb-value', widget);
    var goalInput = document.createElement('input'); goalInput.type = 'hidden'; goalInput.name = 'goal'; goalInput.value = 'college';
    lbBtn.parentNode.appendChild(goalInput);
    var est = $('.estimate', widget), estPlan = $('.est-plan', est), estPrice = $('.est-price', est), estMeta = $('.est-meta', est);
    var seg = $('.seg', widget), submitBtn = $('button[type="submit"]', widget);
    var items = $$('li', lbList), active = -1;
    if (!lbList.id) lbList.id = 'goal-list';
    lbBtn.setAttribute('aria-controls', lbList.id);

    /* Paint the new estimate at once, then let it settle from a soft
       state — the text is never stale, rapid changes simply retarget. */
    var render = function (instant) {
      var goal = goalInput.value, stage = ($('input[name="stage"]:checked', widget) || {}).value || 'now';
      var r = estimate(goal, stage), mode = modeFor(goal);
      setLabel(submitBtn, MODES[mode].submit);
      if (seg) { seg.setAttribute('data-muted', goal === 'org' ? 'true' : 'false'); $$('input', seg).forEach(function (i) { i.disabled = goal === 'org'; }); }
      var changed = estPlan.textContent !== r.plan || estMeta.textContent !== r.meta;
      estPlan.textContent = r.plan;
      estPrice.innerHTML = r.price + (r.per ? '<small>' + r.per + '</small>' : '');
      estMeta.textContent = r.meta;
      if (instant === true || !changed) return;
      est.classList.add('swap'); void est.offsetWidth; /* start from the soft state… */
      est.classList.remove('swap');                   /* …and settle over --t-swap */
    };

    var setGoal = function (li) {
      items.forEach(function (x) { x.setAttribute('aria-selected', x === li ? 'true' : 'false'); });
      goalInput.value = li.getAttribute('data-value');
      lbVal.textContent = $('.lb-name', li).textContent;
      render();
    };
    var openList = function () {
      lbBtn.setAttribute('aria-expanded', 'true'); lbList.setAttribute('data-open', 'true');
      active = items.findIndex(function (x) { return x.getAttribute('aria-selected') === 'true'; });
      highlight(active); lbList.focus();
    };
    var closeList = function (refocus) {
      lbBtn.setAttribute('aria-expanded', 'false'); lbList.setAttribute('data-open', 'false');
      if (refocus) lbBtn.focus();
    };
    var highlight = function (i) {
      items.forEach(function (x, k) { x.setAttribute('data-active', k === i ? 'true' : 'false'); });
      if (i >= 0) { lbList.setAttribute('aria-activedescendant', items[i].id); if (items[i].scrollIntoView) items[i].scrollIntoView({ block: 'nearest' }); }
    };
    lbBtn.addEventListener('click', function () { lbBtn.getAttribute('aria-expanded') === 'true' ? closeList(true) : openList(); });
    lbBtn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList(); } });
    items.forEach(function (li, i) {
      li.addEventListener('click', function () { setGoal(li); closeList(true); });
      li.addEventListener('pointermove', function () { if (active !== i) { active = i; highlight(i); } });
    });
    lbList.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); highlight(active); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); highlight(active); }
      else if (e.key === 'Home') { e.preventDefault(); active = 0; highlight(active); }
      else if (e.key === 'End') { e.preventDefault(); active = items.length - 1; highlight(active); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) setGoal(items[active]); closeList(true); }
      else if (e.key === 'Escape') { e.preventDefault(); closeList(true); }
      else if (e.key === 'Tab') closeList(false);
    });
    document.addEventListener('click', function (e) { if (!widget.contains(e.target)) closeList(false); });
    $$('input[name="stage"]', widget).forEach(function (r) { r.addEventListener('change', render); });

    /* Deep links: /?goal=mba, or a stored choice */
    var pre = null;
    try { pre = JSON.parse(localStorage.getItem('cw.start') || 'null'); } catch (e) {}
    var qs = new URLSearchParams(location.search);
    var g0 = qs.get('goal') || (pre && pre.goal);
    if (g0 && GOALS[g0]) { var li0 = items.filter(function (x) { return x.getAttribute('data-value') === g0; })[0]; if (li0) setGoal(li0); }
    if (pre && pre.stage) { var s0 = $('input[name="stage"][value="' + pre.stage + '"]', widget); if (s0) s0.checked = true; }
    render(true);

    widget.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var goal = goalInput.value, stage = ($('input[name="stage"]:checked', widget) || {}).value || 'now';
      try { localStorage.setItem('cw.start', JSON.stringify({ goal: goal, stage: stage, step: 1 })); } catch (e) {}
      track('widget_submit', { goal: goal, stage: stage, mode: modeFor(goal) });
      location.href = '/start/?goal=' + encodeURIComponent(goal) + (goal === 'org' ? '' : '&stage=' + encodeURIComponent(stage));
    });
  }

  /* Vertical-page hero forms hand off into /start/ with what was typed. */
  $$('form[data-handoff]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    var em = $('input[type="email"]', form); if (em && !em.name) em.name = 'email';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = $('input[name="email"]', form), goal = form.getAttribute('data-handoff');
      var stage = ($('input[name="stage"]:checked', form) || {}).value || '';
      var bad = !EMAIL.test(email.value.trim());
      email.setAttribute('aria-invalid', bad ? 'true' : 'false');
      var err = document.getElementById(email.id + '-error'); if (err) err.textContent = bad ? 'Enter an email address we can reply to.' : '';
      if (bad) { email.focus(); return; }
      try { localStorage.setItem('cw.start', JSON.stringify({ goal: goal, stage: stage, email: email.value.trim(), step: 1 })); } catch (e) {}
      track('hero_handoff', { goal: goal, stage: stage });
      location.href = '/start/?goal=' + encodeURIComponent(goal) + (stage ? '&stage=' + encodeURIComponent(stage) : '');
    });
  });

  /* ---------- 4. FAQ ---------- */
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

  /* ---------- 5. pricing estimator ---------- */
  var estr = $('#estimator');
  if (estr) {
    var counts = { essays: 3, lists: 1, apps: 1 };
    var out = $('.est-out', estr), oPlan = $('.o-plan', out), oPrice = $('.o-price', out), oMeta = $('.o-meta', out), oBtn = $('.btn', out);
    var paintEst = function () {
      var total = counts.essays + counts.lists + counts.apps;
      var k = total === 0 ? 'alacarte' : total <= 4 ? 'core' : total <= 8 ? 'plus' : 'season';
      var p = PLANS[k];
      var why = k === 'alacarte' ? 'Nothing to review yet? Try one à la carte review when you have a draft.' :
                k === 'core' ? total + ' review' + (total === 1 ? '' : 's') + ' fit' + (total === 1 ? 's' : '') + ' in one month of Core.' :
                k === 'plus' ? total + ' reviews in a month needs Plus.' :
                total > 24 ? 'More than 24 reviews — email us and we’ll quote it in writing.' :
                total + ' reviews is more than Plus covers in a month — the Season Pass pools 24 across Aug 1–Jan 15.';
      oPlan.textContent = p.name; oPrice.innerHTML = p.price + (p.per ? '<small>' + p.per + '</small>' : ''); oMeta.textContent = why + ' ' + p.meta;
      oBtn.setAttribute('href', '/start/?plan=' + k); setLabel(oBtn, k === 'alacarte' ? 'Try one review' : 'Get started');
    };
    $$('.stepper', estr).forEach(function (s) {
      var key = s.getAttribute('data-key'), o = $('output', s);
      var set = function (v) { counts[key] = Math.max(0, Math.min(12, v)); o.textContent = counts[key]; paintEst(); };
      $('.dec', s).addEventListener('click', function () { set(counts[key] - 1); });
      $('.inc', s).addEventListener('click', function () { set(counts[key] + 1); });
    });
    oBtn.addEventListener('click', function () { track('estimator_click', { plan: oBtn.getAttribute('href').split('=')[1] }); });
    paintEst();
  }

  /* ---------- 6. /start/ intake ---------- */
  var start = $('#start');
  if (start) {
    var state = { goal: '', stage: '', who: '', name: '', email: '', notes: '', company: '', teamsize: '', tried: '', step: 1, plan: '', item: '' };
    try { Object.assign(state, JSON.parse(localStorage.getItem('cw.start') || '{}')); } catch (e) {}
    var q2 = new URLSearchParams(location.search);
    if (q2.get('goal') && GOALS[q2.get('goal')]) state.goal = q2.get('goal');
    if (q2.get('stage') && STAGES[q2.get('stage')]) state.stage = q2.get('stage');
    if (q2.get('plan') && PLANS[q2.get('plan')]) state.plan = q2.get('plan');
    if (q2.get('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q2.get('email'))) state.email = q2.get('email');
    var linkGoal = q2.get('goal') && GOALS[q2.get('goal')];
    if (linkGoal) state.step = (state.goal !== 'org' && q2.get('stage') && state.stage) ? 3 : 2;
    else if (q2.get('goal') || q2.get('plan')) state.step = 1;
    if (state.goal && modeFor(state.goal) !== 'coach') state.plan = '';
    state.step = Math.max(1, Math.min(3, state.step || 1));
    if (q2.toString()) history.replaceState(null, '', '/start/'); /* keep choices out of the URL */

    var stages = $$('.stage', start), bars = $$('.progress i', start), stepLabel = $('.progress span', start);
    var form = $('form', $('.stage[data-step="3"]', start)); form.setAttribute('novalidate', '');
    var submitB = $('button[type="submit"]', form);
    var sum = { goal: $('[data-sum="goal"]'), stage: $('[data-sum="stage"]'), who: $('[data-sum="who"]'), email: $('[data-sum="email"]'), plan: $('.sum-plan b'), price: $('.sum-plan span'), note: $('.sum-note') };
    var save = function () { try { localStorage.setItem('cw.start', JSON.stringify(state)); } catch (e) {} };
    var currentMode = function () { return state.goal ? modeFor(state.goal) : 'coach'; };
    var isAlacarte = function () { var r = currentPlan(); return !!(r && r.key === 'alacarte'); };
    var syncFromDom = function () {
      ['company', 'teamsize', 'tried', 'name', 'email', 'notes'].forEach(function (k) { var el = $('[name="' + k + '"]', start); if (el) state[k] = el.value.trim(); });
      var it = $('input[name="item"]:checked', start); state.item = it ? it.value : '';
    };
    var currentPlan = function () {
      var g = GOALS[state.goal];
      if (!state.goal) return null;
      if (state.plan && PLANS[state.plan] && state.goal !== 'org' && !(g && g.cohort)) { var p = PLANS[state.plan]; return { plan: p.name, price: p.price, per: p.per, meta: p.meta, key: state.plan }; }
      return estimate(state.goal, state.stage || 'now');
    };

    var paintSummary = function () {
      var g = GOALS[state.goal];
      var put = function (el, v) { if (!el) return; el.textContent = v || '—'; el.classList.toggle('empty', !v); };
      put(sum.goal, g && g.label);
      put(sum.stage, state.goal === 'org' ? (state.company || '') : STAGES[state.stage]);
      put(sum.who, state.goal === 'org' ? (state.teamsize ? state.teamsize + ' people' : '') : state.who);
      put(sum.email, state.email);
      var card = $('.summary-card'); if (card) card.setAttribute('data-has', (state.goal || state.plan) ? 'true' : 'false');
      var r = currentPlan();
      if (!r && state.plan && PLANS[state.plan]) { var pp = PLANS[state.plan]; r = { plan: pp.name, price: pp.price, per: pp.per, meta: 'Chosen on the pricing page. Pick a goal to continue.' }; }
      if (sum.plan) sum.plan.textContent = r ? r.plan : '—';
      if (sum.price) sum.price.innerHTML = r ? r.price + (r.per ? '<small>' + r.per + '</small>' : '') : '';
      if (sum.note) sum.note.textContent = r ? r.meta : 'Choose a goal to see the plan we’d suggest.';
      var l2 = $('[data-sum-label="stage"]'), l3 = $('[data-sum-label="who"]');
      if (l2) l2.textContent = state.goal === 'org' ? 'Company' : 'Where you are';
      if (l3) l3.textContent = state.goal === 'org' ? 'Team size' : 'Filled out by';
      /* step 3 and the done card speak in the funnel's current mode */
      var m = MODES[currentMode()];
      var h3 = $('.stage[data-step="3"] h1', start), hint3 = $('.stage[data-step="3"] .hint', start), notes = $('#s-notes', start);
      if (h3) h3.textContent = m.h1;
      if (hint3) hint3.textContent = m.hint;
      if (notes) notes.placeholder = m.notes;
      setLabel(submitB, m.submit);
      var ala = isAlacarte();
      $$('[data-variant]', start).forEach(function (v) {
        var k = v.getAttribute('data-variant');
        v.hidden = k === 'org' ? state.goal !== 'org' : k === 'student' ? state.goal === 'org' : k === 'alacarte' ? !ala : false;
      });
    };

    var show = function (n, byUser) {
      var prev = state.step;
      state.step = n; save();
      start.setAttribute('data-step', String(n));
      if (byUser) start.setAttribute('data-nav', n < prev ? 'back' : 'fwd'); else start.removeAttribute('data-nav');
      stages.forEach(function (s) { s.setAttribute('data-active', s.getAttribute('data-step') === String(n) ? 'true' : 'false'); });
      bars.forEach(function (b, i) { b.className = i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''; });
      if (stepLabel) stepLabel.textContent = 'Step ' + n + ' of 3';
      paintSummary();
      var h = $('.stage[data-active="true"] h1', start);
      if (h) { h.setAttribute('tabindex', '-1'); if (byUser) h.focus(); /* focus() scrolls only if the heading is off-screen; scroll-margin keeps it clear of the nav */ }
      track('start_step', { step: n, goal: state.goal || 'none' });
    };

    $$('input[name="goal"]', start).forEach(function (r) {
      r.checked = r.value === state.goal;
      r.addEventListener('change', function () { state.goal = r.value; if (modeFor(r.value) !== 'coach') state.plan = ''; paintSummary(); save(); });
    });
    $$('input[name="item"]', start).forEach(function (r) {
      r.checked = r.value === state.item;
      r.addEventListener('change', function () { state.item = r.value; save(); });
    });
    $$('input[name="stage"]', start).forEach(function (r) {
      r.checked = r.value === state.stage;
      r.addEventListener('change', function () { state.stage = r.value; paintSummary(); save(); });
    });
    $$('input[name="who"]', start).forEach(function (r) {
      r.checked = r.value === state.who;
      r.addEventListener('change', function () { state.who = r.value; paintSummary(); save(); });
    });
    ['company', 'teamsize', 'tried', 'name', 'email', 'notes'].forEach(function (k) {
      var el = $('[name="' + k + '"]', start); if (!el) return;
      el.value = state[k] || '';
      el.addEventListener('input', function () { state[k] = el.value.trim(); paintSummary(); save(); });
    });
    var reset = $('[data-reset]', start);
    if (reset) reset.addEventListener('click', function () {
      try { localStorage.removeItem('cw.start'); } catch (e) {}
      Object.keys(state).forEach(function (k) { state[k] = k === 'step' ? 1 : ''; });
      $$('input[type="radio"]', start).forEach(function (r) { r.checked = false; });
      $$('input[type="text"],input[type="email"],textarea', start).forEach(function (i) { i.value = ''; });
      show(1, true);
    });

    var invalid = function (input, msg) {
      var err = document.getElementById(input.id + '-error');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    var validateStep = function (n) {
      if (n === 1) {
        var e1 = $('#goal-error', start);
        if (!state.goal) { e1.textContent = 'Choose what you’re working toward.'; $('input[name="goal"]', start).focus(); return false; }
        e1.textContent = ''; return true;
      }
      if (n === 2) {
        if (state.goal === 'org') {
          var firstBad = null;
          ['company', 'teamsize', 'tried'].forEach(function (k) { var el = $('[name="' + k + '"]', start); if (!el.value.trim()) { invalid(el, 'Required.'); if (!firstBad) firstBad = el; } else invalid(el, ''); });
          if (firstBad) { firstBad.focus(); return false; }
          return true;
        }
        var e2 = $('#stage-error', start);
        if (!state.stage) { e2.textContent = 'Pick the one that’s closest.'; $('input[name="stage"]', start).focus(); return false; }
        e2.textContent = ''; return true;
      }
      return true;
    };

    $$('[data-next]', start).forEach(function (b) {
      b.addEventListener('click', function () { syncFromDom(); if (validateStep(state.step)) show(state.step + 1, true); });
    });
    $$('[data-back]', start).forEach(function (b) { b.addEventListener('click', function () { show(Math.max(1, state.step - 1), true); }); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      syncFromDom();
      var nameEl = $('[name="name"]', form), emailEl = $('[name="email"]', form), ok = true;
      if (!nameEl.value.trim()) { invalid(nameEl, 'Required.'); ok = false; } else invalid(nameEl, '');
      if (!EMAIL.test(emailEl.value.trim())) { invalid(emailEl, 'Enter an email address we can reply to.'); ok = false; } else invalid(emailEl, '');
      var itemErr = $('#item-error', start);
      if (isAlacarte() && !state.item) { if (itemErr) itemErr.textContent = 'Pick the piece you want reviewed first.'; ok = false; } else if (itemErr) itemErr.textContent = '';
      if (!ok) { (nameEl.getAttribute('aria-invalid') === 'true' ? nameEl : emailEl.getAttribute('aria-invalid') === 'true' ? emailEl : $('input[name="item"]', start) || nameEl).focus(); return; }
      var g = GOALS[state.goal] || {}, m = MODES[currentMode()], r = currentPlan();
      var data = {
        goal: g.label || state.goal, stage: state.goal === 'org' ? '' : STAGES[state.stage] || '', who: state.who,
        name: state.name, email: state.email, notes: state.notes,
        company: state.company, teamsize: state.teamsize, tried: state.tried,
        plan: r ? r.plan : '', item: isAlacarte() ? state.item : '', source: '/start/'
      };
      Object.keys(data).forEach(function (k) { if (!data[k]) delete data[k]; });
      var subject = m.subject.replace('{goal}', g.label || '');
      if (isAlacarte() && state.item) subject = 'One review — ' + state.item + ' — ' + (g.label || '');
      submitB.setAttribute('aria-busy', 'true');
      send(data, subject, function () {
        try { localStorage.removeItem('cw.start'); } catch (e) {}
        $('.start-flow', start).hidden = true;
        var done = $('.start-done', start); done.hidden = false;
        var h = $('h1', done), first = m.doneH1.split(' ')[0], rest = m.doneH1.slice(first.length);
        h.innerHTML = '';
        var mark = document.createElement('span'); mark.className = 'pen'; mark.textContent = first;
        mark.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M1 5.5 Q 25 3.4, 50 5 T 99 4.4" pathLength="1"/></svg>');
        h.appendChild(mark); h.appendChild(document.createTextNode(rest));
        $('[data-done-p]', done).textContent = m.doneP.replace('{email}', state.email);
        h.setAttribute('tabindex', '-1'); h.focus();
        requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('drawn'); }); }); /* the pen signs the one success moment */
        track('start_done', { goal: state.goal, mode: currentMode() });
      }, function () {
        submitB.setAttribute('aria-busy', 'false');
        fallback(form, subject, data);
        track('start_fallback', { goal: state.goal, mode: currentMode() });
      });
    });

    show(state.step);
  }

  /* ---------- 7. intake forms ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  $$('form[data-intake]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var first = null;
      $$('[data-required]', form).forEach(function (input) {
        var value = input.value.trim();
        var bad = !value || (input.type === 'email' && !EMAIL.test(value));
        if (input.type === 'radio') { bad = !form.querySelector('input[name="' + input.name + '"]:checked'); }
        var err = document.getElementById(input.id + '-error');
        input.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (err) err.textContent = bad ? (input.type === 'email' ? 'Enter an email address we can reply to.' : input.type === 'radio' ? 'Pick one.' : 'Required.') : '';
        if (bad && !first) first = input;
      });
      if (first) { first.focus(); return; }

      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        data[el.name] = el.value;
      });
      data.source = window.location.pathname;
      var subject = form.getAttribute('data-subject') || 'Craneweave';
      var btn = $('button[type="submit"]', form); if (btn) btn.setAttribute('aria-busy', 'true');
      send(data, subject, function () { done(form); track('form_done', { form: form.getAttribute('data-intake') }); },
                          function () { if (btn) btn.setAttribute('aria-busy', 'false'); fallback(form, subject, data); track('form_fallback', { form: form.getAttribute('data-intake') }); });
    });
  });

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
    box.innerHTML = '<p><strong>We couldn’t send this from the page.</strong> Your email app should open with the request pre-filled — press Send there. If nothing opened, copy this and email it to <a href="mailto:' + CFG.MAIL + '">' + CFG.MAIL + '</a>:</p>' +
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
    box.focus();
    setTimeout(function () { window.location.href = href; }, 150);
  }
  function done(form) {
    var p = document.createElement('p');
    p.className = 'form-done';
    if (form.id) p.id = form.id;
    p.innerHTML = '<span></span><small></small>';
    p.firstChild.textContent = form.getAttribute('data-done') || 'Received. We answer in writing.';
    p.lastChild.textContent = form.getAttribute('data-done-sub') || 'Check your inbox for a reply from ' + CFG.MAIL + '.';
    p.setAttribute('tabindex', '-1');
    form.parentNode.replaceChild(p, form);
    p.focus();
  }

  /* ---------- 8. mobile sticky CTA ---------- */
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
