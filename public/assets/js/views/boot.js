/* NC Zoning Academy — boot / login view.
 *
 * Terminal boot log + operator login + "slot service record shard" import.
 * Registers itself as NCZA.views.boot; the router calls it with (app, state).
 */
(function () {
  'use strict';
  var NCZA = window.NCZA;
  var el = NCZA.util.el;
  NCZA.views = NCZA.views || {};

  NCZA.views.boot = function (app) {
    var id = NCZA.IDENTITY;

    var nameInput = el('input', {
      id: 'op-name', name: 'operator', type: 'text', class: 'boot-input',
      placeholder: 'e.g. ' + id.defaultOperator, autocomplete: 'off', spellcheck: 'false',
      value: app.lastUser() || '',
      onKeydown: function (e) { if (e.key === 'Enter') submit(); },
    });

    function submit() { app.login(nameInput.value); }

    function slotShard() {
      var file = el('input', {
        type: 'file', accept: '.shard,.json,application/json', style: { display: 'none' },
      });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (f) {
          var reader = new FileReader();
          reader.onload = function () { app.slotShard(reader.result); };
          reader.readAsText(f);
        }
        file.remove();
      });
      document.body.appendChild(file);
      file.click();
    }

    var log = el('div', { class: 'boot-log' });
    NCZA.bootLines().forEach(function (ln) {
      log.appendChild(el('div', { class: 'boot-line' }, ln));
    });
    log.appendChild(el('p', { class: 'boot-mission' },
      'Mission: master the systems of the NC Zoning Board. Complete modules to raise standing and earn eddies.',
      el('span', { class: 'cursor' })));

    return el('section', { class: 'boot-screen' },
      el('div', { class: 'boot-card' },
        el('header', { class: 'boot-titlebar' },
          el('span', { class: 'boot-division' }, id.division),
          el('span', { class: 'boot-termid' }, id.terminalId)),
        log,
        el('div', { class: 'boot-divider' }),
        el('div', { class: 'boot-prompt' }, '> OPERATOR IDENTIFICATION REQUIRED'),
        el('label', { class: 'boot-label', for: 'op-name' }, 'OPERATOR NAME / CALLSIGN'),
        nameInput,
        el('button', { class: 'boot-btn', type: 'button', onClick: submit }, '[ ACCESS TERMINAL ]'),
        el('div', { class: 'boot-returning' },
          el('span', { class: 'boot-returning-label' }, 'RETURNING OPERATOR?'),
          el('button', { class: 'boot-btn boot-btn-ghost', type: 'button', onClick: slotShard },
            '[ SLOT SERVICE RECORD SHARD ]'))));
  };
})();
