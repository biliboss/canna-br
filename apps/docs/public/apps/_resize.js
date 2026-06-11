// parent-side MCP-App size negotiation for embedded examples
(function () {
  window.addEventListener('message', function (ev) {
    var m = ev.data; if (!m || typeof m !== 'object') return;
    var meth = m.method || m.type || ''; if (meth.indexOf('size_changed') < 0 && meth.indexOf('size-changed') < 0) return;
    var h = m.params && m.params.height; if (!h) return;
    var frames = document.querySelectorAll('iframe[data-app]');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === ev.source) { frames[i].style.height = Math.min(Math.max(h, 140), 1200) + 'px'; break; }
    }
  });
})();