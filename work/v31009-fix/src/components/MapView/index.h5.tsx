/**
 * 地图组件 · H5 端实现（Leaflet + 国内高清道路底图）。
 * 与 index.tsx（小程序原生 Map）保持相同 props，业务页无需区分平台。
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapViewProps } from './index';

export default function MapView({ longitude, latitude, scale, markers, onMarkerTap, className }: MapViewProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const outlineRef = useRef<any>(null);
  const chinaBoundsRef = useRef<any>(null);

  // 初始化地图
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      attributionControl: false,
      zoomControl: true,
      zoomSnap: 1,
      zoomDelta: 1,
    }).setView([latitude, longitude], scale);

    // 国内访问优先使用高德中文道路底图；连续加载失败时自动回落至 OSM，
    // 避免旧版国外瓦片在国内手机上出现发虚、灰块或长时间空白。
    const fallback = () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
    }).addTo(map);
    const chinaTiles = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
      { subdomains: ['1', '2', '3', '4'], maxZoom: 19, detectRetina: true, crossOrigin: true }
    ).addTo(map);
    let tileErrors = 0;
    chinaTiles.on('tileerror', () => {
      tileErrors += 1;
      if (tileErrors === 4) {
        map.removeLayer(chinaTiles);
        fallback();
      }
    });
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    /*
     * 全国视角不能只靠道路瓦片：手机屏幕较窄时，国界线容易淹没在周边国家
     * 的道路与文字里。加载本地中国省级边界，统一铺浅红国土底色并加粗外轮廓，
     * 首次进入全国页时按完整边界自动取景。
     */
    fetch('/demo/assets/china-outline.json?v=v3.1102-china-outline')
      .then(res => {
        if (!res.ok) throw new Error('china outline unavailable');
        return res.json();
      })
      .then(geojson => {
        if (!mapRef.current) return;
        const outline = L.geoJSON(geojson, {
          interactive: false,
          style: {
            color: '#b91c1c',
            weight: 1.8,
            opacity: 0.95,
            fillColor: '#fee2e2',
            fillOpacity: 0.22,
          },
        }).addTo(mapRef.current);
        outline.bringToBack();
        outlineRef.current = outline;
        chinaBoundsRef.current = outline.getBounds();
        if (scale <= 4) {
          mapRef.current.fitBounds(chinaBoundsRef.current, {
            padding: [10, 10],
            animate: false,
          });
        }
      })
      .catch(() => {
        // 边界文件异常时仍保留道路底图和红旗，不让整张地图白屏。
      });

    // 容器在布局完成后可能变化，强制重算尺寸，避免灰块
    window.setTimeout(() => map.invalidateSize(true), 120);
    window.setTimeout(() => map.invalidateSize(true), 600);
  }, []);

  // 中心点 / 缩放联动
  useEffect(() => {
    if (!mapRef.current) return;
    if (scale <= 4 && chinaBoundsRef.current) {
      mapRef.current.fitBounds(chinaBoundsRef.current, {
        padding: [10, 10],
        animate: false,
      });
    } else {
      mapRef.current.setView([latitude, longitude], scale);
    }
  }, [latitude, longitude, scale]);

  // 标记点联动（红/黄/灰党旗 + 气泡）
  useEffect(() => {
    const lg = layerRef.current;
    if (!lg) return;
    lg.clearLayers();
    markers.forEach(m => {
      const icon = L.icon({
        iconUrl: m.iconPath,
        iconSize: [m.width, m.height],
        iconAnchor: [m.width / 2, m.height],
        popupAnchor: [0, -m.height],
      });
      const mk = L.marker([m.latitude, m.longitude], {
        icon,
        riseOnHover: true,
        keyboard: true,
        title: m.callout?.content || '',
      });
      if (m.callout?.content) {
        mk.bindTooltip(m.callout.content, {
          direction: 'top',
          offset: [0, -m.height],
          opacity: 0.96,
          className: 'gx-party-map-tip',
        });
      }
      mk.on('click', () => {
        mapRef.current?.panTo([m.latitude, m.longitude], { animate: true });
        onMarkerTap(m.id);
      });
      mk.addTo(lg);
    });
  }, [markers]);

  return <div ref={elRef} className={className} style={{ width: '100%', height: '100%' }} />;
}
