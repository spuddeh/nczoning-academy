/* NC Zoning Academy — constants + namespace.
 *
 * Layered vanilla JS on a single global, mirroring the map's
 * constants -> utils -> services -> app load order. No bundler, no framework,
 * no CDN. This file creates window.NCZA and holds shared constants only.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA = window.NCZA || {};

  // View ids (the router renders NCZA.views[<id>]).
  NCZA.VIEWS = {
    BOOT: 'boot',
    DASHBOARD: 'dashboard',
    MODULE: 'module',
    GLOSSARY: 'glossary',
    RECORD: 'record',
    CERT: 'cert',
  };

  // Runtime config (set by config.js in production, or the Design preview inline).
  NCZA.cfg = function () {
    return (typeof window !== 'undefined' && window.ACADEMY_CONFIG) ||
      { liveMode: false, persist: false, apiBase: '', course: 'sample' };
  };

  // Record schema tag written into shards (matches progress.js expectations).
  NCZA.RECORD_SCHEMA = 'ncza-record/v1';

  // Boot-terminal identity strings (Tier-0, rendered in the display face).
  NCZA.IDENTITY = {
    division: 'NIGHT CORP // URBAN PLANNING DIVISION',
    terminalId: 'NC-ACAD-01',
    defaultOperator: 'S. DORSETT',
  };

  // Boot log lines. api base is filled from cfg() at render time.
  NCZA.bootLines = function () {
    return [
      '> INITIALIZING NC ZONING ACADEMY...',
      '> LINKING TO DATA API [ ' + (NCZA.cfg().apiBase || 'api.nczoning.net') + ' ]',
      '> ACCESS GRANTED: OPERATOR CLEARANCE LEVEL 1',
    ];
  };
})();
