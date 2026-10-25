(function () {
  if (window.thornFootprintLoader) { window.thornFootprintLoader(); return; }
  var scripts = new Map();
  var observer;
  var resizeObserver;
  var generation = 0;
  var urls = document.currentScript.dataset;
  function load(url) {
    if (!scripts.has(url)) scripts.set(url, new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = function () { scripts.delete(url); script.remove(); reject(new Error('地图组件加载失败')); };
      document.head.appendChild(script);
    }));
    return scripts.get(url);
  }
  function start(element) {
    if (element.dataset.scheduled) return;
    element.dataset.scheduled = 'true';
    var run = generation;
    var name = element.id === 'map' ? 'world' : 'china';
    element.classList.add('is-loading');
    load('/vendor/echarts/echarts.min.js').then(function () {
      if (run !== generation || !element.isConnected) return;
      return load(name === 'world' ? urls.worldSrc : urls.chinaSrc);
    }).then(function () {
      if (run !== generation || !element.isConnected) return;
      window.ThornMaps[name].init();
    }).catch(function () {
      if (run !== generation || !element.isConnected) return;
      element.classList.remove('is-loading');
      element.textContent = '地图组件加载失败。';
      var retry = document.createElement('button');
      retry.textContent = '重新加载';
      retry.onclick = function () { delete element.dataset.scheduled; element.textContent = ''; start(element); };
      element.appendChild(retry);
    });
  }
  function destroy() {
    generation += 1;
    if (observer) observer.disconnect();
    if (resizeObserver) resizeObserver.disconnect();
    Object.values(window.ThornMaps || {}).forEach(function (map) { map.destroy(); });
  }
  function init() {
    var maps = document.querySelectorAll('#my-echarts, #map.fp-map-world');
    if (!maps.length) return;
    if (observer) observer.disconnect();
    if ('IntersectionObserver' in window) observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { observer.unobserve(entry.target); start(entry.target); } });
    }, { rootMargin: '0px' });
    maps.forEach(function (element) {
      if (element.dataset.scheduled) return;
      if (observer) observer.observe(element);
      else {
        var button = document.createElement('button');
        button.textContent = '加载交互地图';
        button.onclick = function () { button.remove(); start(element); };
        element.appendChild(button);
      }
    });
    if ('ResizeObserver' in window) {
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = new ResizeObserver(function () { Object.values(window.ThornMaps || {}).forEach(function (map) { map.resize(); }); });
      maps.forEach(function (element) { resizeObserver.observe(element); });
    }
  }
  window.thornFootprintLoader = init;
  document.addEventListener('pjax:send', destroy);
  document.addEventListener('pjax:complete', init);
  new MutationObserver(function () { Object.values(window.ThornMaps || {}).forEach(function (map) { map.theme(); }); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  init();
})();
