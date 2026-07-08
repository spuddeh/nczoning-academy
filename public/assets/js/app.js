/* NC Zoning Academy — app orchestration (boot, state, router, progress host).
 *
 * The DOM/wiring layer (loaded last). Owns the single app-state object, injects
 * the five callbacks into the Progress adapter, and renders views into #app.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA = window.NCZA || {};
  var U = NCZA.util, V = NCZA.VIEWS;

  // ---- single app-state object ----
  var state = NCZA.state = {
    view: V.BOOT,
    user: '',          // operator name
    course: null,      // loaded course (academy-course/v1)
    progress: {},      // per-operator progress (moduleDone, quiz, txns, eddies...)
  };

  // ---- Progress adapter: the five injected host callbacks ----
  var progressHost = {
    persistEnabled: function () { return !!NCZA.cfg().persist; },
    buildSnapshot: function () {
      return {
        schema: NCZA.RECORD_SCHEMA,
        user: state.user,
        course: state.course && state.course.id,
        progress: state.progress,
      };
    },
    normalize: function (rec) { return rec || {}; },
    sanitize: function (name) { return U.sanitizeName(name); },
    currentName: function () { return state.user; },
  };

  var progress = null;
  var app = NCZA.app = {};

  app.mount = function () {
    app.root = document.getElementById('app');
    progress = NCZA.progress = NCZA.services.initProgress(progressHost);
    app.route(V.BOOT);
  };

  // ---- router: render NCZA.views[view] into #app ----
  app.route = function (view, params) {
    state.view = view;
    U.clear(app.root);
    var render = NCZA.views && NCZA.views[view];
    if (typeof render === 'function') {
      app.root.appendChild(render(app, state, params));
    } else {
      app.root.appendChild(U.el('div', { class: 'view-stub' }, 'View not built yet: ' + view));
    }
  };

  // ---- flows the boot/login view calls ----

  // Sign in as an operator: set the name, restore any saved record, load the
  // course, then land on the dashboard.
  app.login = function (name) {
    var clean = U.sanitizeName(name) || NCZA.IDENTITY.defaultOperator;
    state.user = clean;
    if (progress) {
      progress.setUser(clean);
      var rec = progress.load(clean);
      if (rec && rec.progress) state.progress = rec.progress;
    }
    return NCZA.services.loadCourse().then(function (course) {
      state.course = course || {};
      app.route(V.DASHBOARD);
    });
  };

  // Slot a Service Record shard (JSON file): restore its progress, then land.
  app.slotShard = function (json) {
    if (!progress) return Promise.resolve();
    var rec;
    try { rec = progress.import(json); } catch (e) { rec = null; }
    if (!rec) return Promise.resolve();
    state.user = U.sanitizeName(rec.user) || NCZA.IDENTITY.defaultOperator;
    state.progress = rec.progress || {};
    progress.setUser(state.user);
    return NCZA.services.loadCourse().then(function (course) {
      state.course = course || {};
      app.route(V.DASHBOARD);
    });
  };

  // Returning-operator name for prefill (empty if none / no persistence).
  app.lastUser = function () { return progress ? progress.lastUser() : ''; };

  document.addEventListener('DOMContentLoaded', app.mount);
})();
