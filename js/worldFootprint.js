(function () {
  var chart = null;
  var cachedWorld = null;
  var cachedPlaces = null;

  function isDark() {
    return document.documentElement.dataset.theme === 'dark';
  }

  function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function normalizePlaces(payload) {
    if (!payload || !Array.isArray(payload.features)) return [];
    return payload.features.map(function (feature) {
      var properties = feature.properties || {};
      var coordinates = feature.geometry && feature.geometry.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
      var longitude = Number(coordinates[0]);
      var latitude = Number(coordinates[1]);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
      return {
        name: String(properties.name || 'Unknown'),
        description: String(properties.description || ''),
        visits: Math.max(1, Number(properties.visits) || 1),
        value: [longitude, latitude, Math.max(1, Number(properties.visits) || 1)]
      };
    }).filter(Boolean);
  }

  function renderAccessibleList(element, places) {
    var card = element.closest('.fp-card');
    if (!card) return;
    var previous = card.querySelector('.fp-accessible-list');
    if (previous) previous.remove();
    var summary = document.createElement('div');
    summary.className = 'fp-accessible-list visually-hidden';
    var heading = document.createElement('h3');
    heading.textContent = '世界足迹地点列表';
    var list = document.createElement('ul');
    places.forEach(function (place) {
      var item = document.createElement('li');
      item.textContent = place.name + (place.description ? '：' + place.description : '');
      list.appendChild(item);
    });
    summary.appendChild(heading);
    summary.appendChild(list);
    card.appendChild(summary);
  }

  function renderMap(world, places) {
    var element = document.getElementById('map');
    if (!element || typeof echarts === 'undefined') return;
    var dark = isDark();
    cachedWorld = world;
    cachedPlaces = places;

    world.features.forEach(function (feature) {
      if (!feature.properties) feature.properties = {};
      feature.properties.name = feature.properties.name || feature.properties.NAME || feature.properties.ADMIN || '';
    });

    if (chart) chart.dispose();
    echarts.registerMap('world-footprint', world);
    chart = echarts.init(element, null, { renderer: 'canvas' });
    chart.setOption({
      backgroundColor: dark ? '#111113' : '#f7f7f8',
      aria: {
        enabled: true,
        description: '世界足迹地图。圆点表示到访地点，将鼠标移到圆点上可查看经历。'
      },
      animationDuration: isReducedMotion() ? 0 : 900,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: dark ? 'rgba(28,28,30,.97)' : 'rgba(255,255,255,.97)',
        borderColor: dark ? '#4a4a4e' : '#d2d2d7',
        borderWidth: 1,
        padding: [12, 14],
        extraCssText: 'border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.16);',
        textStyle: { color: dark ? '#f5f5f7' : '#111', fontSize: 12, lineHeight: 19 },
        formatter: function (params) {
          if (params.seriesType !== 'scatter' || !params.data) return '';
          var description = params.data.description ? '<br>' + escapeHTML(params.data.description) : '';
          return '<strong style="font-size:14px">' + escapeHTML(params.data.name) + '</strong>' + description;
        }
      },
      geo: {
        map: 'world-footprint',
        roam: window.matchMedia('(pointer: fine)').matches,
        zoom: 1.08,
        scaleLimit: { min: 0.9, max: 8 },
        top: 34,
        right: 30,
        bottom: 34,
        left: 30,
        itemStyle: {
          areaColor: dark ? '#252527' : '#e4e4e6',
          borderColor: dark ? '#6b6b70' : '#8b8d92',
          borderWidth: 0.75
        },
        emphasis: {
          disabled: false,
          label: { show: false },
          itemStyle: { areaColor: dark ? '#38383b' : '#d0d0d3', borderColor: dark ? '#a1a1a6' : '#5f6166' }
        },
        select: { disabled: true }
      },
      series: [{
        name: '到访地点',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        symbolSize: function (value) { return 8 + Math.min(Number(value[2]) || 1, 10) * 0.8; },
        itemStyle: {
          color: dark ? '#ffffff' : '#111111',
          borderColor: dark ? '#111113' : '#ffffff',
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: 'rgba(0,0,0,.25)'
        },
        emphasis: { scale: 1.45 },
        label: { show: false },
        data: places
      }]
    });

    renderAccessibleList(element, places);
    element.dataset.ready = 'true';
    element.classList.remove('is-loading', 'fp-map-error');
    chart.getZr().on('dblclick', function () {
      chart.setOption({ geo: { zoom: 1.08, center: null } });
    });
  }

  function initWorldMap() {
    var element = document.getElementById('map');
    if (!element || typeof echarts === 'undefined' || element.dataset.loading === 'true') return;
    element.dataset.loading = 'true';
    element.classList.add('is-loading');

    var embedded = document.getElementById('thorn-world-footprints');
    var embeddedPlaces = null;
    try { embeddedPlaces = embedded ? JSON.parse(embedded.textContent || '{}') : null; } catch (error) { embeddedPlaces = null; }

    Promise.all([
      fetch('/json/world.json').then(function (response) {
        if (!response.ok) throw new Error('世界地图数据加载失败');
        return response.json();
      }),
      embeddedPlaces ? Promise.resolve(embeddedPlaces) : fetch('/json/cities.json').then(function (response) {
        if (!response.ok) throw new Error('世界足迹数据加载失败');
        return response.json();
      })
    ]).then(function (result) {
      renderMap(result[0], normalizePlaces(result[1]));
    }).catch(function (error) {
      element.classList.add('fp-map-error');
      element.innerHTML = '<div><p>地图暂时无法加载。</p><button type="button">重新加载</button></div>';
      var retry = element.querySelector('button');
      if (retry) retry.addEventListener('click', function () {
        element.innerHTML = '';
        element.dataset.loading = 'false';
        initWorldMap();
      });
      console.error(error);
    }).finally(function () {
      element.dataset.loading = 'false';
      element.classList.remove('is-loading');
    });
  }

  function resizeChart() { if (chart) chart.resize(); }
  window.addEventListener('resize', resizeChart, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initWorldMap);
  else initWorldMap();
  document.addEventListener('pjax:complete', initWorldMap);
  new MutationObserver(function (mutations) {
    if (cachedWorld && cachedPlaces && mutations.some(function (item) { return item.attributeName === 'data-theme'; })) {
      renderMap(cachedWorld, cachedPlaces);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
