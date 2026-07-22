(function () {
  var chart;
  var cachedGeoJSON;
  var cachedPoints;

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

  function provinceName(name) {
    return String(name || '').replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g, '');
  }

  function daysOf(point) {
    return Math.max(0.25, Number(point.stayDays) || 1);
  }

  function intensityLabel(score) {
    if (score >= 3) return '长期生活';
    if (score >= 2) return '深度停留';
    if (score >= 1) return '阶段停留';
    return '短暂停留';
  }

  function cityDatum(point, dark) {
    var days = daysOf(point);
    var weight = Math.log10(days + 1);
    return {
      name: point.name,
      value: [Number(point.value[0]), Number(point.value[1]), weight],
      description: point.description,
      stayLabel: point.stayLabel || intensityLabel(weight),
      stayWeight: weight,
      stayDays: days,
      symbolSize: 6 + weight * 3.8,
      itemStyle: {
        color: 'rgba(255,255,255,.97)',
        borderColor: dark ? '#050505' : (weight >= 2.5 ? '#202226' : (weight >= 1 ? '#666970' : '#92949a')),
        borderWidth: weight >= 2.5 ? 2.4 : 1.7,
        shadowBlur: 8,
        shadowColor: dark ? 'rgba(0,0,0,.5)' : 'rgba(0,0,0,.16)'
      }
    };
  }

  function renderAccessibleList(element, points) {
    var card = element.closest('.fp-card');
    if (!card) return;
    var old = card.querySelector('.fp-accessible-list');
    if (old) old.remove();
    var summary = document.createElement('div');
    summary.className = 'fp-accessible-list visually-hidden';
    var heading = document.createElement('h3');
    heading.textContent = '中国足迹城市列表';
    var list = document.createElement('ul');
    points.forEach(function (point) {
      var item = document.createElement('li');
      item.textContent = point.name + '：' + (point.description || '到访城市');
      list.appendChild(item);
    });
    summary.appendChild(heading);
    summary.appendChild(list);
    card.appendChild(summary);
  }

  function renderMap(geoJSON, points) {
    var element = document.getElementById('my-echarts');
    if (!element || typeof echarts === 'undefined') return;
    var dark = isDark();
    cachedGeoJSON = geoJSON;
    cachedPoints = points;

    if (chart) chart.dispose();
    echarts.registerMap('china-footprint', geoJSON);
    chart = echarts.init(element, null, { renderer: 'canvas' });

    var scores = {};
    points.forEach(function (point) {
      var key = provinceName(point.province);
      scores[key] = (scores[key] || 0) + daysOf(point);
    });

    var maxScore = Math.max.apply(null, Object.keys(scores).map(function (key) {
      return Math.log10(scores[key] + 1);
    }).concat([1]));
    var regions = geoJSON.features.map(function (feature) {
      var original = feature.properties.name;
      var totalDays = scores[provinceName(original)] || 0;
      return { name: original, value: totalDays ? Math.log10(totalDays + 1) : 0, totalDays: totalDays };
    });
    var cities = points.map(function (point) { return cityDatum(point, dark); });

    chart.setOption({
      backgroundColor: dark ? '#111113' : '#f7f7f8',
      aria: {
        enabled: true,
        description: '中国足迹地图。省份灰度越深表示累计停留时间越长，圆点表示到访城市。'
      },
      animationDuration: isReducedMotion() ? 0 : 850,
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
        position: function (point, params, dom, rect, size) {
          var gap = 20;
          var x = point[0] + gap;
          var y = point[1] - size.contentSize[1] - gap;
          if (x + size.contentSize[0] > size.viewSize[0] - 18) x = point[0] - size.contentSize[0] - gap;
          if (y < 18) y = point[1] + gap;
          if (y + size.contentSize[1] > size.viewSize[1] - 18) y = size.viewSize[1] - size.contentSize[1] - 18;
          return [Math.max(18, x), Math.max(18, y)];
        },
        formatter: function (params) {
          if (params.seriesType === 'scatter') {
            return '<strong style="font-size:14px">' + escapeHTML(params.data.name) + '</strong><br>' +
              escapeHTML(params.data.description || '到访城市');
          }
          return '<strong style="font-size:14px">' + escapeHTML(params.name) + '</strong>';
        }
      },
      visualMap: {
        type: 'continuous',
        show: false,
        seriesIndex: 0,
        min: 0,
        max: maxScore,
        inRange: { color: dark ? ['#252527', '#555559', '#8a8a8f', '#c2c2c7', '#ffffff'] : ['#ececee', '#aeb0b5', '#696c72', '#292b2f', '#000000'] },
        outOfRange: { color: dark ? '#1d1d1f' : '#f4f4f5' }
      },
      geo: {
        map: 'china-footprint',
        roam: window.matchMedia('(pointer: fine)').matches,
        zoom: 1.14,
        scaleLimit: { min: 0.85, max: 8 },
        itemStyle: { areaColor: dark ? '#202022' : '#e9e9eb', borderColor: dark ? '#7f7f84' : '#76787d', borderWidth: 1.15 },
        emphasis: {
          label: { show: true, color: dark ? '#fff' : '#111', fontSize: 11, fontWeight: 600 },
          itemStyle: { areaColor: dark ? '#444448' : '#d8d8da', borderColor: dark ? '#b0b0b5' : '#65676c', borderWidth: 1.2 }
        },
        select: { disabled: true }
      },
      series: [
        { name: '省份停留强度', type: 'map', map: 'china-footprint', geoIndex: 0, data: regions },
        {
          name: '城市足迹',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          emphasis: {
            scale: 1.38,
            itemStyle: { color: dark ? '#fff' : '#202226', borderColor: dark ? '#111' : '#fff', borderWidth: 2, shadowBlur: 14, shadowColor: 'rgba(0,0,0,.28)' }
          },
          label: { show: false },
          data: cities
        }
      ]
    });

    renderAccessibleList(element, points);
    element.dataset.ready = 'true';
    element.classList.remove('is-loading', 'fp-map-error');
    chart.getZr().on('dblclick', function () {
      chart.setOption({ geo: { zoom: 1.14, center: null } });
    });
  }

  function initChinaMap() {
    var element = document.getElementById('my-echarts');
    if (!element || typeof echarts === 'undefined' || element.dataset.loading === 'true') return;
    element.dataset.loading = 'true';
    element.classList.add('is-loading');
    element.classList.remove('fp-map-error');

    var embedded = document.getElementById('thorn-china-footprints');
    var embeddedPoints;
    try {
      embeddedPoints = embedded ? JSON.parse(embedded.textContent || '[]') : null;
    } catch (error) {
      embeddedPoints = null;
    }

    Promise.all([
      fetch('/json/china.json').then(function (response) {
        if (!response.ok) throw new Error('中国地图数据加载失败');
        return response.json();
      }),
      embeddedPoints ? Promise.resolve(embeddedPoints) : fetch('/json/footprint.json').then(function (response) {
        if (!response.ok) throw new Error('足迹数据加载失败');
        return response.json();
      })
    ]).then(function (result) {
      renderMap(result[0], Array.isArray(result[1]) ? result[1] : []);
    }).catch(function (error) {
      element.classList.add('fp-map-error');
      element.innerHTML = '<div><p>地图暂时无法加载。</p><button type="button">重新加载</button></div>';
      var retry = element.querySelector('button');
      if (retry) retry.addEventListener('click', function () {
        element.innerHTML = '';
        element.dataset.loading = 'false';
        initChinaMap();
      });
      console.error(error);
    }).finally(function () {
      element.dataset.loading = 'false';
      element.classList.remove('is-loading');
    });
  }

  function resizeChart() {
    if (chart) chart.resize();
  }

  window.addEventListener('resize', resizeChart, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(resizeChart).observe(document.getElementById('my-echarts') || document.body);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initChinaMap);
  else initChinaMap();
  document.addEventListener('pjax:complete', initChinaMap);
  new MutationObserver(function (mutations) {
    if (cachedGeoJSON && cachedPoints && mutations.some(function (item) { return item.attributeName === 'data-theme'; })) {
      renderMap(cachedGeoJSON, cachedPoints);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
