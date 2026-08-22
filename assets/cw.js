/* Craneweave — the only script on the site. Nothing here is required
   for content to render.
   1. The homepage hero mark draws once on load.
   2. An artifact sheet's underline draws once when it scrolls into view.
   3. The goal picker routes to the chosen page.
   4. Intake forms validate, then post to FORM_ENDPOINT — or, until one
      is configured, open a pre-filled email to the team. */
(function () {
  'use strict';

  var CFG = {
    FORM_ENDPOINT: '',               /* e.g. a Formspree URL; empty = email fallback */
    MAIL: 'team@craneweave.com'
  };

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1 — hero mark */
  var mk = document.getElementById('mk');
  if (mk) {
    if (reduce) mk.classList.add('drawn');
    else window.addEventListener('load', function () { mk.classList.add('drawn'); });
  }

  /* 2 — artifact underline */
  var sheets = Array.prototype.slice.call(document.querySelectorAll('.sheet[data-artifact]'));
  if (sheets.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      sheets.forEach(function (s) { s.classList.add('drawn'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('drawn'); io.unobserve(e.target); }
        });
      }, { threshold: 0.3 });
      sheets.forEach(function (s) { io.observe(s); });
    }
  }

  /* 3 — goal picker */
  var picker = document.getElementById('goal');
  if (picker) {
    var routes = {
      college: '/college/', bsmd: '/bsmd/', mba: '/mba/', law: '/law/',
      med: '/med/', recruiting: '/recruiting/', org: '/organizations/'
    };
    picker.addEventListener('submit', function (ev) {
      var sel = picker.querySelector('input[name="goal"]:checked');
      if (!sel || !routes[sel.value]) return;
      ev.preventDefault();
      window.location.href = routes[sel.value];
    });
  }

  /* 4 — intake forms */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  Array.prototype.forEach.call(document.querySelectorAll('form[data-intake]'), function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var first = null;
      Array.prototype.forEach.call(form.querySelectorAll('[data-required]'), function (input) {
        var value = input.value.trim();
        var bad = !value || (input.type === 'email' && !EMAIL.test(value));
        var err = document.getElementById(input.id + '-error');
        input.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (err) err.textContent = bad ? (input.type === 'email' ? 'Enter an email address we can reply to.' : 'Required.') : '';
        if (bad && !first) first = input;
      });
      if (first) { first.focus(); return; }

      var data = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        data[el.name] = el.value;
      });
      data.page = window.location.pathname;

      if (CFG.FORM_ENDPOINT && window.fetch) {
        fetch(CFG.FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) { if (!r.ok) throw new Error(r.status); done(form); })
          .catch(function () { mailto(form, data); });
      } else {
        mailto(form, data);
      }
    });
  });

  function mailto(form, data) {
    var subject = form.getAttribute('data-subject') || 'Craneweave';
    var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
    window.location.href = 'mailto:' + CFG.MAIL +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function done(form) {
    var p = document.createElement('p');
    p.className = 'form-done';
    p.textContent = form.getAttribute('data-done') || 'Received. We answer in writing.';
    p.setAttribute('tabindex', '-1');
    form.parentNode.replaceChild(p, form);
    p.focus();
  }
})();
