/* NC Zoning Academy — pure utilities.
 *
 * No DOM mutation of app state, no fetch. A tiny `el()` DOM builder replaces the
 * prototype's React h() so views stay declarative without a framework.
 */
(function () {
  'use strict';
  var NCZA = window.NCZA = window.NCZA || {};
  var U = NCZA.util = {};

  U.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Operator-name sanitizer — mirrors progress.js: drop control chars (code < 32
  // or DEL 127), collapse whitespace, trim, 42-char cap. Uses a codepoint filter
  // so no control-char literals appear in this source.
  U.sanitizeName = function (name) {
    var s = String(name == null ? '' : name);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code >= 32 && code !== 127) out += s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, 42);
  };

  // el(tag, props?, ...children) — minimal declarative DOM builder.
  //   props: class, html (innerHTML), style (object), on<Event> handlers,
  //          any other key becomes an attribute. null/false children are skipped.
  U.el = function (tag, props) {
    var node = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v == null) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (v === true) node.setAttribute(k, '');
        else node.setAttribute(k, v);
      }
    }
    var kids = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < kids.length; i++) append(node, kids[i]);
    return node;
  };

  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }

  U.clear = function (node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  };
})();
