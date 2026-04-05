(function () {
  var chartDom = document.getElementById('my-echarts') || document.getElementById('footprint');
  if (!chartDom || typeof echarts === 'undefined') {
    return;
  }

  var footprintChart = echarts.init(chartDom);

  function normalizeProvinceName(item) {
    return item.province || item.region || item.name || '';
  }

  function getProvinceCounts(data) {
    var counts = {};
    data.forEach(function (item) {
      var province = normalizeProvinceName(item);
      if (!province) {
        return;
      }
      counts[province] = (counts[province] || 0) + 1;
    });
    return counts;
  }

  function getProvinceData(counts) {
    var provinceList = [
      '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
      '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
      '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
      '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
      '香港', '澳门', '台湾', '南海诸岛'
    ];

    return provinceList.map(function (province) {
      return {
        name: province,
        value: counts[province] || 0
      };
    });
  }

  function normalizeScatterData(pointData) {
    function outOfChina(lon, lat) {
      return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
    }

    function transformLat(lon, lat) {
      var ret = -100 + 2 * lon + 3 * lat + 0.2 * lat * lat + 0.1 * lon * lat + 0.2 * Math.sqrt(Math.abs(lon));
      ret += (20 * Math.sin(6 * lon * Math.PI) + 20 * Math.sin(2 * lon * Math.PI)) * 2 / 3;
      ret += (20 * Math.sin(lat * Math.PI) + 40 * Math.sin(lat / 3 * Math.PI)) * 2 / 3;
      ret += (160 * Math.sin(lat / 12 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30)) * 2 / 3;
      return ret;
    }

    function transformLon(lon, lat) {
      var ret = 300 + lon + 2 * lat + 0.1 * lon * lon + 0.1 * lon * lat + 0.1 * Math.sqrt(Math.abs(lon));
      ret += (20 * Math.sin(6 * lon * Math.PI) + 20 * Math.sin(2 * lon * Math.PI)) * 2 / 3;
      ret += (20 * Math.sin(lon * Math.PI) + 40 * Math.sin(lon / 3 * Math.PI)) * 2 / 3;
      ret += (150 * Math.sin(lon / 12 * Math.PI) + 300 * Math.sin(lon / 30 * Math.PI)) * 2 / 3;
      return ret;
    }

    function wgs84ToGcj02(lon, lat) {
      var a = 6378245.0;
      var ee = 0.00669342162296594323;
      if (outOfChina(lon, lat)) {
        return [lon, lat];
      }

      var dLat = transformLat(lon - 105.0, lat - 35.0);
      var dLon = transformLon(lon - 105.0, lat - 35.0);
      var radLat = lat / 180.0 * Math.PI;
      var magic = Math.sin(radLat);
      magic = 1 - ee * magic * magic;
      var sqrtMagic = Math.sqrt(magic);
      dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
      dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
      return [lon + dLon, lat + dLat];
    }

    return pointData
      .map(function (item) {
        if (!Array.isArray(item.value) || item.value.length < 2) {
          return null;
        }

        var lon = Number(item.value[0]);
        var lat = Number(item.value[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
          return null;
        }

        // Default assumes source coords are WGS84; convert for China map.
        // Set `coordSystem: "gcj02"` in a point to skip conversion.
        var coordSystem = (item.coordSystem || 'wgs84').toLowerCase();
        var converted = coordSystem === 'gcj02' ? [lon, lat] : wgs84ToGcj02(lon, lat);

        return {
          name: item.name || '未命名地点',
          province: item.province || '',
          value: [converted[0], converted[1], Number(item.value[2] || 1)],
          description: item.description || '暂无描述',
          timestamp: item.timestamp || '',
          url: item.url || '',
          symbolSize: Number(item.symbolSize) > 0 ? Number(item.symbolSize) : 7,
          itemStyle: item.itemStyle || null
        };
      })
      .filter(Boolean);
  }

  function buildOption(scatterData, provinceCounts) {
    var provinceData = getProvinceData(provinceCounts);
    var maxCount = Math.max.apply(null, Object.values(provinceCounts).concat([1]));

    return {
      animationDuration: 600,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(244, 248, 252, 0.96)',
        borderColor: '#c9d6e4',
        borderWidth: 1,
        textStyle: {
          color: '#2f3d52',
          fontSize: 13
        },
        position: function (point, params, dom, rect, size) {
          var x = point[0] + 14;
          var y = point[1] - 14;
          var viewWidth = size.viewSize[0];
          var viewHeight = size.viewSize[1];
          var boxWidth = size.contentSize[0];
          var boxHeight = size.contentSize[1];

          if (x + boxWidth > viewWidth - 12) {
            x = point[0] - boxWidth - 14;
          }
          if (y + boxHeight > viewHeight - 12) {
            y = viewHeight - boxHeight - 12;
          }
          if (y < 12) {
            y = point[1] + 14;
          }
          if (x < 12) {
            x = 12;
          }
          return [x, y];
        },
        formatter: function (params) {
          if (params.seriesType === 'effectScatter') {
            var detail = '<div style="font-size:14px;font-weight:600;">' + params.name + '</div>';
            if (params.data && params.data.description) {
              detail += '<div style="margin-top:4px;line-height:1.5;">' + params.data.description + '</div>';
            }
            if (params.data && params.data.timestamp) {
              detail += '<div style="margin-top:4px;color:#61758f;">' + params.data.timestamp + '</div>';
            }
            return detail;
          }

          var count = provinceCounts[params.name] || 0;
          if (count <= 0) {
            return params.name;
          }
          return '<div style="font-size:14px;font-weight:600;">' + params.name + '</div><div style="margin-top:4px;">到访城市：' + count + '</div>';
        }
      },
      visualMap: {
        show: true,
        seriesIndex: 1,
        min: 0,
        max: maxCount,
        calculable: true,
        orient: 'vertical',
        right: '5%',
        bottom: '8%',
        itemWidth: 12,
        itemHeight: 88,
        text: ['高', '低'],
        textStyle: {
          color: '#6e809a'
        },
        inRange: {
          color: ['#edf3f9', '#cddff0', '#9ec0de', '#719fca', '#4f84b4']
        },
        outOfRange: {
          color: '#eef2f6'
        }
      },
      geo: {
        map: 'china',
        zoom: 1.2,
        roam: true,
        scaleLimit: {
          min: 1,
          max: 8
        },
        emphasis: {
          label: {
            show: false
          }
        },
        itemStyle: {
          areaColor: '#eef3f8',
          borderColor: '#8ea2ba',
          borderWidth: 0.8
        }
      },
      series: [
        {
          name: '足迹',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          geoIndex: 0,
          showEffectOn: 'render',
          rippleEffect: {
            scale: 2.2,
            brushType: 'stroke'
          },
          hoverAnimation: true,
          itemStyle: {
            color: '#335f87',
            shadowBlur: 0
          },
          symbolSize: function (val, params) {
            return (params.data && params.data.symbolSize) || 7;
          },
          data: scatterData
        },
        {
          name: '省份访问次数',
          type: 'map',
          map: 'china',
          geoIndex: 0,
          showLegendSymbol: false,
          data: provinceData
        }
      ]
    };
  }

  fetch('/json/footprint.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load footprint data');
      }
      return response.json();
    })
    .then(function (pointData) {
      var safeData = Array.isArray(pointData) ? pointData : [];
      var scatterData = normalizeScatterData(safeData);
      var provinceCounts = getProvinceCounts(safeData);
      var option = buildOption(scatterData, provinceCounts);

      footprintChart.setOption(option);
    })
    .catch(function (error) {
      console.error('Error loading footprint data:', error);
      footprintChart.setOption(buildOption([], {}));
    });

  window.addEventListener('resize', function () {
    footprintChart.resize();
  });

  footprintChart.on('click', function (params) {
    if (params.seriesType === 'effectScatter' && params.data && params.data.url) {
      window.open(params.data.url, '_blank', 'noopener');
    }
  });

  footprintChart.getZr().on('dblclick', function () {
    footprintChart.setOption({
      geo: {
        zoom: 1.2,
        center: null
      },
      visualMap: {
        range: null
      }
    });
  });
})();
