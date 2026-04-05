(function () {
  function getMarkerColor(visits) {
    if (visits >= 10) return '#2f5f8f';
    if (visits >= 6) return '#4778a9';
    if (visits >= 3) return '#5f93c2';
    if (visits >= 1) return '#80aad3';
    return '#a8c2dd';
  }

  function normalizeVisitCount(properties) {
    var visits = properties && (properties.visits || properties.visit || properties.count || 1);
    var parsed = Number(visits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function buildPopup(properties) {
    var p = properties || {};
    var name = p.name || 'Unknown';
    var description = p.description || '暂无描述';
    var image = p.image ? '<img src="' + p.image + '" alt="' + name + '" class="fp-popup-image">' : '';
    var time = p.timestamp ? '<div class="fp-popup-time">时间：' + p.timestamp + '</div>' : '';
    var link = p.url ? '<div class="fp-popup-link"><a href="' + p.url + '" target="_blank" rel="noopener">查看详情</a></div>' : '';

    return (
      '<div class="fp-popup">' +
      '<div class="fp-popup-title">' + name + '</div>' +
      image +
      '<div class="fp-popup-desc">' + description + '</div>' +
      time +
      link +
      '</div>'
    );
  }

  function addFallbackMarkers(map) {
    var sampleCities = [
      { name: 'London', latlng: [51.505, -0.09], visits: 2 },
      { name: 'New York', latlng: [40.7128, -74.0060], visits: 3 },
      { name: 'Tokyo', latlng: [35.6762, 139.6503], visits: 1 },
      { name: 'Sydney', latlng: [-33.8688, 151.2093], visits: 4 }
    ];

    sampleCities.forEach(function (city) {
      L.circleMarker(city.latlng, {
        radius: 3 + Math.min(city.visits, 5) * 0.6,
        fillColor: getMarkerColor(city.visits),
        color: '#dce6f2',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup('<div class="fp-popup"><div class="fp-popup-title">' + city.name + '</div></div>');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var mapEl = document.getElementById('map');
    if (!mapEl || typeof L === 'undefined') {
      return;
    }

    var map = L.map('map', {
      zoomControl: true,
      worldCopyJump: true
    }).setView([25, 10], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    fetch('/json/cities.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load cities data');
        }
        return response.json();
      })
      .then(function (geojson) {
        L.geoJSON(geojson, {
          pointToLayer: function (feature, latlng) {
            var visits = normalizeVisitCount(feature && feature.properties);
            return L.circleMarker(latlng, {
              radius: 3 + Math.min(visits, 6) * 0.7,
              fillColor: getMarkerColor(visits),
              color: '#e8eef5',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.9
            });
          },
          onEachFeature: function (feature, layer) {
            layer.bindPopup(buildPopup(feature && feature.properties));

            var url = feature && feature.properties && feature.properties.url;
            if (url) {
              layer.on('click', function () {
                window.open(url, '_blank', 'noopener');
              });
            }
          }
        }).addTo(map);
      })
      .catch(function (error) {
        console.error('Error loading cities data:', error);
        addFallbackMarkers(map);
      });

    setTimeout(function () {
      map.invalidateSize();
    }, 120);

    window.addEventListener('resize', function () {
      map.invalidateSize();
    });
  });
})();
