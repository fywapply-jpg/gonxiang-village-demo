/**
 * 地图组件 · 默认/小程序端实现（原生 <Map>，底层腾讯地图）。
 * H5 端由同目录 index.h5.tsx 覆盖（Leaflet + 开源底图）。
 * 统一接口，业务页（party-map）只依赖这套 props，两端一致。
 */
import { Map } from '@tarojs/components';

export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  iconPath: string;
  width: number;
  height: number;
  callout?: { content: string; color?: string };
}
export interface MapViewProps {
  longitude: number;
  latitude: number;
  scale: number;
  markers: MapMarker[];
  onMarkerTap: (id: number) => void;
  className?: string;
}

export default function MapView({ longitude, latitude, scale, markers, onMarkerTap, className }: MapViewProps) {
  return (
    <Map
      className={className}
      longitude={longitude}
      latitude={latitude}
      scale={scale}
      markers={markers as any}
      onMarkerTap={(e: any) => onMarkerTap(e.detail.markerId)}
      enableZoom
      enableScroll
      showScale
      onError={() => {}}
    />
  );
}
