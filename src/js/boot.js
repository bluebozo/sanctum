(function () {
  function showFatal(msg) {
    var el = document.getElementById('boot-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'boot-error';
      document.body.appendChild(el);
    }
    el.style.display = 'block';
    el.textContent = msg;
    var t = document.getElementById('title-screen');
    if (t) t.classList.add('hidden');
  }

  window.addEventListener('error', function (e) {
    if (e.error && e.error.stack) console.error('ERRSTACK: ' + e.error.stack);
    showFatal('Error: ' + (e.message || e.error || 'unknown') + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    showFatal('Error: ' + (r && (r.stack || r.message) ? (r.stack || r.message) : String(r)));
  });

  function decode(id) {
    var b64 = document.getElementById(id).textContent.trim();
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function blobUrl(text) {
    return URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  }

  function dataUrl(bytes) {
    var s = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return 'data:text/javascript;base64,' + btoa(s);
  }

  window.__threeReady = (async function () {
    var coreBytes = decode('three-core-b64');
    var modText = new TextDecoder().decode(decode('three-mod-b64'));
    var pieces = modText.split('./three.core.min.js');
    try {
      var coreBlob = blobUrl(new TextDecoder().decode(coreBytes));
      return await import(blobUrl(pieces.join(coreBlob)));
    } catch (e1) {
      try {
        var coreData = dataUrl(coreBytes);
        return await import(dataUrl(new TextEncoder().encode(pieces.join(coreData))));
      } catch (e2) {
        showFatal(
          'Could not load Three.js inline (' + (e2 && e2.message ? e2.message : e2) + '). ' +
          'If you opened this file directly, try serving it locally: python3 -m http.server 8081'
        );
        throw e2;
      }
    }
  })();
})();
