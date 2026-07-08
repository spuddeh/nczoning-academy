/* NC Zoning Academy — Preact + htm PROTOTYPE of the boot/login view.
 *
 * Same architecture as the vanilla version (reused NCZA constants/utils/services
 * + window.Progress + the measured boot.css), but the VIEW is a Preact component
 * written in htm template literals instead of the el() builder. No build step.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA;
  var h = window.preact.h, render = window.preact.render;
  var useState = window.preactHooks.useState;
  var html = window.htm.bind(h);

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

  // Shared app-state + Progress adapter (identical host callbacks to app.js).
  var appState = { user: '', course: null, progress: {} };
  var progress = window.Progress && window.Progress.create({
    persistEnabled: function () { return !!NCZA.cfg().persist; },
    buildSnapshot: function () {
      return { schema: NCZA.RECORD_SCHEMA, user: appState.user, course: appState.course && appState.course.id, progress: appState.progress };
    },
    normalize: function (r) { return r || {}; },
    sanitize: function (n) { return NCZA.util.sanitizeName(n); },
    currentName: function () { return appState.user; },
  });

  function Boot(props) {
    var s = useState(progress ? progress.lastUser() : '');
    var name = s[0], setName = s[1];

    function submit() { props.onLogin(name); }
    function onFile(e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { props.onSlot(reader.result); };
      reader.readAsText(f);
    }

    return html`
      <section class="boot-screen">
        <div class="boot-card">
          <header class="boot-titlebar">
            <span class="boot-tb-title">${id.division}</span>
            <span class="boot-tb-id">${id.terminalId}</span>
          </header>
          <div class="boot-body">
            <pre class="boot-log">${logText}<span class="cursor"></span></pre>
            <div class="boot-form">
              <div class="boot-divider"></div>
              <div class="boot-prompt">${'> OPERATOR IDENTIFICATION REQUIRED'}</div>
              <label class="boot-field-label" for="op-name">OPERATOR NAME / CALLSIGN</label>
              <input id="op-name" name="operator" class="boot-input" type="text"
                     placeholder=${'e.g. ' + id.defaultOperator} autocomplete="off" spellcheck="false"
                     value=${name}
                     onInput=${function (e) { setName(e.target.value); }}
                     onKeyDown=${function (e) { if (e.key === 'Enter') submit(); }} />
              <button class="boot-access" type="button" onClick=${submit}>[ ACCESS TERMINAL ]</button>
              <div class="boot-returning">
                <span class="boot-rule"></span>
                <span class="boot-returning-text">RETURNING OPERATOR?</span>
                <span class="boot-rule"></span>
              </div>
              <label class="boot-slot">
                <span class="boot-shard-icon"></span>
                ${'[ SLOT SERVICE RECORD SHARD ]'}
                <input class="boot-file" type="file" accept=".shard,.json,application/json" onChange=${onFile} />
              </label>
            </div>
          </div>
        </div>
      </section>`;
  }

  function Dashboard(props) {
    var c = props.course || {};
    var mods = c.modules || [];
    return html`
      <section class="view-stub">
        <h1>DASHBOARD</h1>
        <p>Operator: ${props.user || '—'}</p>
        <p>Course: ${(c.title || '(none loaded)') + (mods.length ? ' — ' + mods.length + ' modules' : '')}</p>
        <p class="muted">Preact + htm prototype — same measured CSS as the vanilla version.</p>
      </section>`;
  }

  function App() {
    var v = useState('boot'), view = v[0], setView = v[1];
    var u = useState(''), user = u[0], setUser = u[1];
    var c = useState(null), course = c[0], setCourse = c[1];

    function land(co) { appState.course = co || {}; setCourse(co || {}); setView('dashboard'); }

    function login(nm) {
      var clean = NCZA.util.sanitizeName(nm) || id.defaultOperator;
      appState.user = clean; setUser(clean);
      if (progress) { progress.setUser(clean); var rec = progress.load(clean); if (rec && rec.progress) appState.progress = rec.progress; }
      NCZA.services.loadCourse().then(land);
    }
    function slot(json) {
      if (!progress) return;
      var rec; try { rec = progress.import(json); } catch (e) { rec = null; }
      if (!rec) return;
      var nm = NCZA.util.sanitizeName(rec.user) || id.defaultOperator;
      appState.user = nm; setUser(nm); appState.progress = rec.progress || {}; progress.setUser(nm);
      NCZA.services.loadCourse().then(land);
    }

    return view === 'dashboard'
      ? html`<${Dashboard} user=${user} course=${course} />`
      : html`<${Boot} onLogin=${login} onSlot=${slot} />`;
  }

  render(html`<${App} />`, document.getElementById('app'));
})();
