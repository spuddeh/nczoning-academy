/* NC Zoning Academy — dashboard view (STUB).
 *
 * Placeholder landing that proves login -> course load -> route works and the
 * REAL course was fetched. Replaced with the full dashboard in a later slice.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA;
  var el = NCZA.util.el;
  NCZA.views = NCZA.views || {};

  NCZA.views.dashboard = function (app, state) {
    var course = state.course || {};
    var mods = course.modules || [];
    return el('section', { class: 'view-stub' },
      el('h1', {}, 'DASHBOARD'),
      el('p', {}, 'Operator: ' + (state.user || '—')),
      el('p', {}, 'Course: ' + (course.title || '(none loaded)') +
        (mods.length ? ' — ' + mods.length + ' modules' : '')),
      el('p', { class: 'muted' }, 'Rebuild in progress. The full dashboard is the next slice.'));
  };
})();
