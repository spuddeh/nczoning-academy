/* NC Zoning Academy — services (fetch + module wiring).
 *
 * The only layer that touches the network or constructs the reused modules
 * (window.Progress, window.NCRadio). Views and app.js call these; they never
 * fetch or new-up a module themselves.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA = window.NCZA || {};
  var S = NCZA.services = {};

  // Live half of the course data contract: when liveMode, fetch the real course
  // from the static file courses/<id>.json; otherwise (or on failure) fall back
  // to the inline SAMPLE_COURSE. Returns a course object (never throws).
  S.loadCourse = function () {
    var cfg = NCZA.cfg();
    var fallback = (typeof window !== 'undefined' && window.SAMPLE_COURSE) || {};
    if (!cfg.liveMode || typeof fetch !== 'function') {
      return Promise.resolve(fallback);
    }
    var id = cfg.course || 'sample';
    return fetch('courses/' + id + '.json', { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function () { return fallback; });
  };

  // Construct the storage adapter, injecting the five host callbacks.
  S.initProgress = function (host) {
    if (typeof window !== 'undefined' && window.Progress && typeof window.Progress.create === 'function') {
      return window.Progress.create(host);
    }
    return null;
  };
})();
