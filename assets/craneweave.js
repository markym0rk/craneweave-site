/* ============================================================
   Craneweave — platform runtime
   Analytics stamping · match widget · start/waitlist flow ·
   nav state · scroll instrumentation · motion.
   ============================================================ */

(function () {
  'use strict';

  /* The inline <head> script already set this before first paint; this is the
     belt-and-braces path for any page that ships without it. __cwReady tells
     that script's failsafe timer the bundle got here, so it leaves the flag
     alone — if we never arrive, it drops `js` and .reveal content falls back
     to visible instead of staying hidden forever. */
  document.documentElement.classList.add('js');
  window.__cwReady = true;

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ---------- Config: fill these in before pushing traffic ---------- */
  var CFG = {
    STRIPE_LINK: '',        // Stripe Payment Link — Core
    STRIPE_LINK_PLUS: '',   // Stripe Payment Link — Plus
    STRIPE_LINK_SEASON: '', // Stripe Payment Link — Season Pass
    FORM_ENDPOINT: '',      // e.g. Formspree endpoint for signups, waitlists, coach applications
    CONTACT_EMAIL: 'team@craneweave.com'
  };

  /* Which goals are purchasable today vs. sensing demand.
     `role` is who normally signs up for that goal — a parent for the
     under-18 goals, the applicant themselves for the adult ones. */
  var GOALS = {
    undergrad:  { label: 'College admissions',                live: true,  role: 'parent',  note: 'Enrolling now · from $299/month, published below.' },
    bsmd:       { label: 'BS/MD programs',                    live: true,  role: 'parent',  note: 'Enrolling now · BS/MD track from $399/month.' },
    mba:        { label: 'MBA admissions',                    live: false, role: 'student', note: 'Founding cohort for Round 2 · joining is free and holds your place.' },
    law:        { label: 'Law school admissions',             live: false, role: 'student', note: 'Founding cohort · joining is free and holds your place.' },
    med:        { label: 'Medical school admissions',         live: false, role: 'student', note: 'Founding cohort for the 2027 cycle · joining is free.' },
    recruiting: { label: 'Banking & consulting recruiting',   live: false, role: 'student', note: 'Founding cohort · joining is free and holds your place.' }
  };

  var PAGE = document.body.getAttribute('data-page') || 'unknown';

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

  /* ---------- Analytics: every event stamped with page + source ---------- */
  function track(name, props) {
    var payload = { page: PAGE, src: SRC };
    if (props) for (var k in props) payload[k] = props[k];
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, cw: payload });
    if (typeof window.plausible === 'function') window.plausible(name, { props: payload });
    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
  }
  window.cwTrack = track;
  track('page_view');

  /* ---------- Shared scroll ticker ----------
     Everything that reacts to scroll reads layout, so it all reads once per
     frame together rather than once per event each. A subscriber that returns
     false has finished and is dropped; when the last one goes, the listener
     comes off the scroll path entirely. */
  var scrollSubs = [];
  var scrollTicking = false;

  function runScrollSubs() {
    scrollTicking = false;
    for (var i = scrollSubs.length - 1; i >= 0; i--) {
      if (scrollSubs[i]() === false) scrollSubs.splice(i, 1);
    }
    if (!scrollSubs.length) window.removeEventListener('scroll', onScroll);
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(runScrollSubs);
    else runScrollSubs();
  }

  function onScrollAdd(fn) {
    if (!scrollSubs.length) window.addEventListener('scroll', onScroll, { passive: true });
    scrollSubs.push(fn);
  }

  /* ---------- Nav: scrolled state + mobile menu ---------- */
  var nav = document.querySelector('.nav');
  var burger = document.getElementById('nav-burger');

  if (nav) {
    var onScrollNav = function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScrollAdd(onScrollNav);
    onScrollNav();
  }
  if (burger && nav) {
    var menuOpen = function () { return nav.classList.contains('menu-open'); };

    function setMenu(open) {
      nav.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    burger.addEventListener('click', function () { setMenu(!menuOpen()); });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav-link, .btn-nav')) setMenu(false);
    });

    /* Three ways out, so the panel is never a trap: pick something, press
       Escape, or tap anywhere off the nav. Escape returns focus to the
       burger that opened it. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (!menuOpen()) return;
      /* One Escape dismisses one layer. With the dialog up it owns the key,
         and its own handler deals with it. */
      var dlg = document.getElementById('start-modal');
      if (dlg && dlg.hasAttribute('open')) return;
      setMenu(false);
      burger.focus();
    });
    document.addEventListener('pointerdown', function (e) {
      if (menuOpen() && !e.target.closest('.nav')) setMenu(false);
    });

    /* Crossing back to the desktop layout retires the panel: otherwise
       .menu-open lingers, suppressing the scroll-edge fade and leaving a
       stale aria-expanded="true" on a burger nobody can see. */
    if (window.matchMedia) {
      var wide = window.matchMedia('(min-width: 769px)');
      var onWide = function (e) { if (e.matches) setMenu(false); };
      if (wide.addEventListener) wide.addEventListener('change', onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }
  }

  /* ---------- Match widget (hero booking box) ---------- */
  var mGoal = document.getElementById('m-goal');
  var mWhen = document.getElementById('m-when');
  var mWho  = document.getElementById('m-who');
  var mCta  = document.getElementById('match-cta');
  var mNote = document.getElementById('match-note');

  function paintWidget() {
    if (!mGoal || !mCta || !mNote) return;
    var g = GOALS[mGoal.value] || GOALS.undergrad;
    /* Two strings only: "founding cohort" is the thing (modal title),
       "Hold my place" is the act (every button that joins it). */
    mCta.textContent = g.live ? 'Get started' : 'Hold my place';
    mNote.textContent = g.note;
  }
  if (mGoal) {
    mGoal.addEventListener('change', function () {
      paintWidget();
      track('widget_goal', { goal: mGoal.value });
    });
    paintWidget();
  }

  /* ---------- Start / waitlist modal ---------- */
  var modal = document.getElementById('start-modal');
  var sGoal = document.getElementById('s-goal');
  var sWhen = document.getElementById('s-when');
  var sWho  = document.getElementById('s-who');
  var sTitle = document.getElementById('start-title');
  var sSub = document.getElementById('start-sub');
  var sSubmit = document.getElementById('start-submit');
  var sFoot = document.getElementById('start-foot');
  /* Set once the reader picks a role themselves — after that we never
     re-default the field out from under them. */
  var roleTouched = false;

  function paintModal() {
    if (!sGoal) return;
    var g = GOALS[sGoal.value] || GOALS.undergrad;
    if (g.live) {
      if (sTitle) sTitle.textContent = 'Get started';
      if (sSub) sSub.textContent = g.label + ' is enrolling now. Tell us a little and we’ll take it from there.';
      if (sSubmit) sSubmit.textContent = 'Continue';
      if (sFoot) sFoot.textContent = 'Enrolling now. We’ll email you to complete signup — no sales call.';
    } else {
      if (sTitle) sTitle.textContent = 'Join the founding cohort';
      if (sSub) sSub.textContent = g.label + ' opens next. Joining the list is free and holds your place.';
      if (sSubmit) sSubmit.textContent = 'Hold my place';
      if (sFoot) sFoot.textContent = 'No charge, no commitment. We’ll email you the moment this goal opens.';
    }
    /* The applicant is the buyer on the adult goals — an MBA, law, med, or
       recruiting candidate signs up for themselves — so the role field
       follows the goal instead of always defaulting to a guardian. */
    if (sWho) {
      var selfOpt = sWho.querySelector('option[value="student"]');
      if (selfOpt) selfOpt.textContent = g.role === 'student' ? 'I’m the applicant' : 'Student';
      if (!roleTouched) sWho.value = g.role || 'parent';
    }
  }

  var startInner = modal ? modal.querySelector('.start-inner') : null;
  var closeTimer = null;

  /* Spatial consistency: the sheet scales out of whatever button summoned it,
     so the relationship between trigger and content stays visible. Falls back
     to the centre when there's no trigger (Escape, backdrop, deep link). */
  function anchorTo(trigger) {
    if (!startInner) return;
    startInner.style.transformOrigin = '';
    if (!trigger || typeof trigger.getBoundingClientRect !== 'function') return;
    var t = trigger.getBoundingClientRect();
    /* Measure the dialog, not .start-inner. By this point modal-in is applied
       at its from-keyframe, so the inner element's rect is already scaled and
       translated — but transform-origin resolves against the *untransformed*
       border box. The dialog is that same box and never carries a transform. */
    var m = modal.getBoundingClientRect();
    if (!m.width || !m.height) return;
    var ox = Math.max(0, Math.min(m.width,  (t.left + t.width  / 2) - m.left));
    var oy = Math.max(0, Math.min(m.height, (t.top  + t.height / 2) - m.top));
    startInner.style.transformOrigin = ox + 'px ' + oy + 'px';
  }

  function openStart(origin, goal, trigger) {
    if (!modal) return;
    if (goal && sGoal && GOALS[goal]) sGoal.value = goal;
    else if (mGoal && sGoal) sGoal.value = mGoal.value;
    if (mWhen && sWhen) sWhen.value = mWhen.value;
    if (mWho && sWho && roleTouched) sWho.value = mWho.value;
    paintModal();
    track('start_open', { origin: origin || 'unknown', goal: sGoal ? sGoal.value : '' });

    /* Re-opening mid-close must not inherit the exit state. Dropping .closing
       cancels modal-out and the sheet returns to rest from wherever it got to,
       rather than replaying the entrance — grabbing it back is interruptible. */
    clearExit();
    modal.classList.remove('closing');

    /* showModal() on an already-open dialog throws, and it is genuinely still
       open while the exit animation is mid-flight. */
    if (typeof modal.showModal === 'function') {
      if (!modal.open) modal.showModal();
    } else {
      modal.setAttribute('open', 'open');
    }

    /* Measured after the dialog enters the top layer but before paint, so
       frame 0 of modal-in already uses the right origin. */
    anchorTo(trigger);
  }

  var onExitEnd = null;

  function clearExit() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (onExitEnd && startInner) {
      startInner.removeEventListener('animationend', onExitEnd);
      onExitEnd = null;
    }
  }

  function finishClose() {
    if (!modal) return;
    clearExit();
    modal.classList.remove('closing');
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  /* Exits along the path it entered rather than vanishing. */
  function closeStart() {
    if (!modal || !modal.hasAttribute('open')) return;
    if (modal.classList.contains('closing')) return;
    if (reduceMotion.matches || !startInner) { finishClose(); return; }

    modal.classList.add('closing');
    onExitEnd = function (e) {
      /* Scoped to the exit specifically: if the reader re-opens mid-close, the
         entrance animation finishing must not tear the dialog back down. */
      if (e.target !== startInner || e.animationName !== 'modal-out') return;
      finishClose();
    };
    startInner.addEventListener('animationend', onExitEnd);
    /* Guarantees the dialog closes even if the animation is dropped. */
    closeTimer = setTimeout(finishClose, 500);
  }

  /* Escape fires `cancel`; intercept it so the exit animation gets to run. */
  if (modal) {
    modal.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeStart();
    });
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-start]');
    if (opener) {
      e.preventDefault();
      openStart(opener.getAttribute('data-open-start'), opener.getAttribute('data-goal-open'), opener);
      return;
    }
    /* Goal cards are plain links to their goal page — `data-goal` is a markup
       hook only, and they deliberately do not open the start modal. Use
       `data-open-start` + `data-goal-open` on anything that should. */
    var goalLink = e.target.closest('[data-goal-link]');
    if (goalLink) {
      e.preventDefault();
      openStart('footer-goal', goalLink.getAttribute('data-goal-link'), goalLink);
      return;
    }
    if (e.target.closest('[data-close-start]')) {
      e.preventDefault();
      closeStart();
    }
  });

  if (sGoal) sGoal.addEventListener('change', paintModal);
  function markRoleTouched() { roleTouched = true; }
  if (sWho) sWho.addEventListener('change', markRoleTouched);
  if (mWho) mWho.addEventListener('change', markRoleTouched);

  /* Click on backdrop closes */
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeStart();
    });
  }

  function mailtoFallback(subject, lines) {
    var body = lines.join('%0D%0A');
    window.location.href = 'mailto:' + CFG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) + '&body=' + body;
  }

  var startForm = document.getElementById('start-form');
  if (startForm) {
    startForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      new FormData(startForm).forEach(function (v, k) { d[k] = v; });
      var g = GOALS[d.goal] || GOALS.undergrad;
      track('start_submit', { goal: d.goal, timeline: d.timeline, role: d.role, live: g.live ? 'yes' : 'no' });

      var stripe = g.live ? CFG.STRIPE_LINK : '';
      if (stripe) {
        track('checkout_redirect', { goal: d.goal });
        window.location.href = stripe +
          (stripe.indexOf('?') === -1 ? '?' : '&') +
          'prefilled_email=' + encodeURIComponent(d.email) +
          '&client_reference_id=' + encodeURIComponent([d.goal, SRC].join('_').replace(/[^a-zA-Z0-9_-]/g, ''));
      } else if (CFG.FORM_ENDPOINT) {
        d.type = g.live ? 'signup' : 'waitlist'; d.src = SRC;
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(d)
        }).then(function () { showDone(); });
      } else {
        mailtoFallback((g.live ? 'Get started — ' : 'Founding cohort — ') + g.label, [
          'Name: ' + d.name,
          'Email: ' + d.email,
          'Goal: ' + g.label,
          'Timeline: ' + d.timeline,
          'Role: ' + d.role
        ]);
        showDone();
      }
    });
  }

  function showDone() {
    var done = document.getElementById('start-done');
    if (done) done.hidden = false;
    if (startForm) startForm.hidden = true;
  }

  /* ---------- Generic secondary forms (coach application, programs contact) ---------- */
  document.querySelectorAll('form[data-cw-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.getAttribute('data-cw-form');
      var d = {};
      new FormData(form).forEach(function (v, k) { d[k] = v; });
      track(kind + '_submit');
      if (CFG.FORM_ENDPOINT) {
        d.type = kind; d.src = SRC;
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(d)
        }).then(function () { noteFor(form); form.reset(); });
      } else {
        var lines = [];
        for (var k in d) lines.push(k + ': ' + d[k]);
        mailtoFallback('Craneweave — ' + kind.replace(/_/g, ' '), lines);
        noteFor(form);
      }
    });
  });

  function noteFor(form) {
    var n = form.querySelector('.form-note') ||
            (form.parentElement && form.parentElement.querySelector('.form-note'));
    if (n) n.classList.add('show');
  }

  /* ---------- Scroll instrumentation ---------- */
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { revealIO.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* Scroll depth 50 / 90, riding the shared ticker so the layout read happens
     once per frame alongside the nav's. Returning false once both marks are in
     drops it from the subscriber list for good. */
  var fired = {};

  onScrollAdd(function () {
    /* window.scrollY and scrollingElement both behave the same in standards
       and quirks mode; documentElement.scrollTop reads 0 in quirks. */
    var h = document.scrollingElement || document.documentElement;
    var depth = (window.scrollY + window.innerHeight) / h.scrollHeight;
    [0.5, 0.9].forEach(function (mark) {
      var key = 'd' + mark * 100;
      if (depth >= mark && !fired[key]) { fired[key] = true; track('scroll_' + mark * 100); }
    });
    if (fired.d50 && fired.d90) return false;
  });

  /* FAQ + requirements opens */
  document.querySelectorAll('.faq details, .req-list details').forEach(function (dt) {
    dt.addEventListener('toggle', function () {
      if (dt.open) {
        var q = dt.querySelector('summary');
        track('faq_open', { q: q ? q.textContent.trim().slice(0, 60) : '' });
      }
    });
  });
})();
