"use client";

import { useEffect, useRef, useMemo } from "react";
import Map, { Source, Layer, Marker, type MapRef } from "react-map-gl/maplibre";
import type { LayerSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const routeLineLayer: LayerSpecification = {
  id: "route-line",
  type: "line",
  source: "route",
  layout: {
    "line-join": "round",
    "line-cap": "round",
  },
  paint: {
    "line-color": "#CFFF04",
    "line-width": 4,
    "line-opacity": 0.9,
  },
};

interface Position {
  latitude: number;
  longitude: number;
}

interface RunMapProps {
  positions: Position[];
  isLive?: boolean;
  className?: string;
}

export default function RunMap({ positions, isLive = false, className }: RunMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Build GeoJSON from positions
  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: "FeatureCollection",
    features: positions.length >= 2
      ? [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: positions.map((p) => [p.longitude, p.latitude]),
            },
          },
        ]
      : [],
  }), [positions]);

  const latest = positions.length > 0 ? positions[positions.length - 1] : null;

  // Fit bounds to full route when not live
  useEffect(() => {
    if (isLive || positions.length < 2) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const lngs = positions.map((p) => p.longitude);
    const lats = positions.map((p) => p.latitude);
    const bounds: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];

    map.fitBounds(bounds, { padding: 48, duration: 500, maxZoom: 16 });
  }, [isLive, positions]);

  // For live mode: follow latest position
  useEffect(() => {
    if (!isLive || !latest) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.easeTo({ center: [latest.longitude, latest.latitude], duration: 300 });
  }, [isLive, latest]);

  // Default center: latest position or a fallback
  const initialViewState = useMemo(() => {
    if (latest) {
      return { longitude: latest.longitude, latitude: latest.latitude, zoom: 15 };
    }
    return { longitude: 0, latitude: 0, zoom: 2 };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        {/* Route polyline */}
        {geojson.features.length > 0 && (
          <Source id="route" type="geojson" data={geojson}>
            <Layer {...routeLineLayer} />
          </Source>
        )}

        {/* Live position marker with pulsing dot */}
        {isLive && latest && (
          <Marker longitude={latest.longitude} latitude={latest.latitude} anchor="center">
            <div className="relative flex items-center justify-center">
              {/* Pulse ring */}
              <span className="absolute inline-flex size-8 rounded-full opacity-40 animate-ping" style={{ backgroundColor: "#CFFF04" }} />
              {/* Inner dot */}
              <span className="relative inline-flex size-4 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: "#CFFF04" }} />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
