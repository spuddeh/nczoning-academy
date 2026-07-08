/* NC Zoning Academy — Service Record storage adapter.
 *
 * The ONE module that touches localStorage. No DOM, no ACADEMY_CONFIG lookups of
 * its own — every environment-specific decision is injected by the host:
 *
 *   window.Progress.create({
 *     persistEnabled: () => boolean,   // gate ALL storage (host reads ACADEMY_CONFIG.persist)
 *     buildSnapshot:  () => object,    // the shard payload (host serializes live app state)
 *     normalize:      (rec) => object, // version-tolerant record migration/validation
 *     sanitize:       (name) => string,// operator-name sanitizer (control chars, 42 cap)
 *     currentName:    () => string,    // fallback operator name when setUser wasn't called
 *   })
 *
 * Returns an adapter with: setUser / load / save / snapshot / import / listUsers
 * (plus lastUser / remove). Persistence is gated on persistEnabled() and every
 * localStorage call is wrapped in try/catch, so it degrades to in-memory (never
 * throws) in a sandboxed preview or when persist is false.
 *
 * Repointing at a real backend (e.g. a Cloudflare Worker for accounts) is a change
 * to THIS file only — swap the store()/save/load/listUsers internals; the host API
 * and the injected callbacks stay the same.
 */
(function () {
  'use strict';

  var PFX = 'ncza:v1:progress:';   // per-operator record key prefix
  var LAST = 'ncza:v1:lastUser';   // last active operator name

  function noop() {}
  function asFn(f, fallback) { return (typeof f === 'function') ? f : fallback; }

  function create(host) {
    host = host || {};
    var persistEnabled = asFn(host.persistEnabled, function () { return false; });
    var buildSnapshot  = asFn(host.buildSnapshot,  function () { return {}; });
    var normalize      = asFn(host.normalize,      function (r) { return r; });
    var sanitize       = asFn(host.sanitize,       function (n) {
      return String(n == null ? '' : n).replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 42);
    });
    var currentName    = asFn(host.currentName,    function () { return ''; });

    // The only place localStorage is reached. Returns the store or null (→ in-memory).
    function store() {
      try {
        return (persistEnabled() && typeof localStorage !== 'undefined') ? localStorage : null;
      } catch (e) { return null; }
    }

    var api = {
      _user: '',

      setUser: function (name) { this._user = sanitize(name); return this._user; },

      // The shard payload — serialization of live app state, provided by the host.
      snapshot: function () { return buildSnapshot(); },

      save: function () {
        var ls = store(); if (!ls) return false;
        var name = sanitize(this._user || currentName()); if (!name) return false;
        try {
          ls.setItem(PFX + name, JSON.stringify(buildSnapshot()));
          ls.setItem(LAST, name);
          return true;
        } catch (e) { return false; }
      },

      load: function (name) {
        var ls = store(); if (!ls) return null;
        var key = sanitize(name || this.lastUser()); if (!key) return null;
        try {
          var raw = ls.getItem(PFX + key);
          if (!raw) return null;
          return normalize(JSON.parse(raw));
        } catch (e) { return null; }
      },

      lastUser: function () {
        var ls = store(); if (!ls) return '';
        try { return ls.getItem(LAST) || ''; } catch (e) { return ''; }
      },

      remove: function (name) {
        var ls = store(); if (!ls) return false;
        var key = sanitize(name || this._user); if (!key) return false;
        try {
          ls.removeItem(PFX + key);
          if (this.lastUser() === key) ls.removeItem(LAST);
          return true;
        } catch (e) { return false; }
      },

      // Version-tolerant restore of a portable shard (string JSON or parsed object).
      import: function (json) {
        var rec = (typeof json === 'string') ? JSON.parse(json) : json;
        return normalize(rec);
      },

      listUsers: function () {
        var ls = store(); if (!ls) return [];
        var out = [];
        try {
          for (var i = 0; i < ls.length; i++) {
            var k = ls.key(i);
            if (k && k.indexOf(PFX) === 0) out.push(k.slice(PFX.length));
          }
        } catch (e) {}
        return out;
      },
    };
    return api;
  }

  window.Progress = { create: create, PREFIX: PFX, LAST_KEY: LAST };
})();
