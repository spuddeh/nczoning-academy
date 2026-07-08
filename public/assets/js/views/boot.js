/* NC Zoning Academy — boot / login view.
 *
 * Structure reproduced from the 0.1.0 monolith: cyan titlebar, one cyan <pre>
 * boot log (header + boot lines + mission), then the operator login + a
 * "slot service record shard" label wrapping a hidden file input.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA;
  var el = NCZA.util.el;
  NCZA.views = NCZA.views || {};

  NCZA.views.boot = function (app) {
    var id = NCZA.IDENTITY;
    var apiHost = (NCZA.cfg().apiBase || 'https://api.nczoning.net').replace(/^https?:\/\//, '');

    var logText =
      id.division + '\n' +
      'Terminal ID: ' + id.terminalId + '\n\n' +
      '> INITIALIZING NC ZONING ACADEMY...\n' +
      '> LINKING TO DATA API [ ' + apiHost + ' ]\n' +
      '> ACCESS GRANTED: OPERATOR CLEARANCE LEVEL 1\n\n' +
      'Mission: master the systems of the NC Zoning Board.\n' +
      'Complete modules to raise standing and earn eddies.';

    var nameInput = el('input', {
      id: 'op-name', name: 'operator', type: 'text', class: 'boot-input',
      placeholder: 'e.g. ' + id.defaultOperator, autocomplete: 'off', spellcheck: 'false',
      value: app.lastUser() || '',
      onKeydown: function (e) { if (e.key === 'Enter') submit(); },
    });

    function submit() { app.login(nameInput.value); }

    var fileInput = el('input', {
      type: 'file', accept: '.shard,.json,application/json', class: 'boot-file',
      onChange: function () {
        var f = fileInput.files && fileInput.files[0];
        if (f) {
          var reader = new FileReader();
          reader.onload = function () { app.slotShard(reader.result); };
          reader.readAsText(f);
        }
      },
    });

    return el('section', { class: 'boot-screen' },
      el('div', { class: 'boot-card' },
        el('header', { class: 'boot-titlebar' },
          el('span', { class: 'boot-tb-title' }, id.division),
          el('span', { class: 'boot-tb-id' }, id.terminalId)),
        el('div', { class: 'boot-body' },
          el('pre', { class: 'boot-log' }, logText, el('span', { class: 'cursor' })),
          el('div', { class: 'boot-form' },
            el('div', { class: 'boot-divider' }),
            el('div', { class: 'boot-prompt' }, '> OPERATOR IDENTIFICATION REQUIRED'),
            el('label', { class: 'boot-field-label', for: 'op-name' }, 'OPERATOR NAME / CALLSIGN'),
            nameInput,
            el('button', { class: 'boot-access', type: 'button', onClick: submit }, '[ ACCESS TERMINAL ]'),
            el('div', { class: 'boot-returning' },
              el('span', { class: 'boot-rule' }),
              el('span', { class: 'boot-returning-text' }, 'RETURNING OPERATOR?'),
              el('span', { class: 'boot-rule' })),
            el('label', { class: 'boot-slot' },
              el('span', { class: 'boot-shard-icon' }),
              '[ SLOT SERVICE RECORD SHARD ]',
              fileInput)))));
  };
})();
