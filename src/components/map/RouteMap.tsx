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
    "line-width": 3,
    "line-opacity": 0.85,
  },
};

interface Position {
  latitude: number;
  longitude: number;
}

interface SplitMarker {
  splitNumber: number;
  latitude: number;
  longitude: number;
}

interface RouteMapProps {
  positions: Position[];
  splits?: SplitMarker[];
  className?: string;
}

export default function RouteMap({ positions, splits, className }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);

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

  const start = positions.length > 0 ? positions[0] : null;
  const finish = positions.length > 1 ? positions[positions.length - 1] : null;

  const initialViewState = useMemo(() => {
    if (positions.length === 0) return { longitude: 0, latitude: 0, zoom: 2 };
    const lngs = positions.map((p) => p.longitude);
    const lats = positions.map((p) => p.latitude);
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    return { longitude: centerLng, latitude: centerLat, zoom: 13 };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit bounds to the route on mount
  useEffect(() => {
    if (positions.length < 2) return;

    const tryFit = () => {
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

      if (map.isStyleLoaded()) {
        map.fitBounds(bounds, { padding: 48, duration: 400, maxZoom: 16 });
      } else {
        map.once("load", () => {
          map.fitBounds(bounds, { padding: 48, duration: 400, maxZoom: 16 });
        });
      }
    };

    tryFit();
  }, [positions]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
      >
        {/* Route polyline */}
        {geojson.features.length > 0 && (
          <Source id="route" type="geojson" data={geojson}>
            <Layer {...routeLineLayer} />
          </Source>
        )}

        {/* Start marker — white */}
        {start && (
          <Marker longitude={start.longitude} latitude={start.latitude} anchor="center">
            <div className="flex items-center justify-center size-5 rounded-full bg-white border-2 border-black shadow" title="Start" />
          </Marker>
        )}

        {/* Finish marker — red */}
        {finish && (
          <Marker longitude={finish.longitude} latitude={finish.latitude} anchor="center">
            <div className="flex items-center justify-center size-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: "#FF3B30" }} title="Finish" />
          </Marker>
        )}

        {/* Split markers */}
        {splits?.map((split) => (
          <Marker
            key={split.splitNumber}
            longitude={split.longitude}
            latitude={split.latitude}
            anchor="center"
          >
            <div
              className="flex items-center justify-center size-5 rounded-full bg-white border-2 border-black shadow text-black"
              style={{ fontSize: 9, fontWeight: 700 }}
              title={`Split ${split.splitNumber}`}
            >
              {split.splitNumber}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
