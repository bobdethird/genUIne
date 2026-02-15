"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import ReactMapGL, {
  Marker as MapboxMarker,
  NavigationControl,
} from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MapPin,
  Star,
  StarHalf,
} from "lucide-react";

// =============================================================================
// Mapbox Helpers
// =============================================================================

const MAPBOX_STYLES: Record<string, string> = {
  streets: "mapbox://styles/mapbox/streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
  satellite: "mapbox://styles/mapbox/satellite-v9",
  "satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
};

function renderStars(rating: number): ReactNode[] {
  const stars: ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star
        key={`full-${i}`}
        className="h-3 w-3 text-yellow-500 fill-yellow-500"
      />,
    );
  }
  if (hasHalf) {
    stars.push(
      <StarHalf
        key="half"
        className="h-3 w-3 text-yellow-500 fill-yellow-500"
      />,
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star
        key={`empty-${i}`}
        className="h-3 w-3 text-muted-foreground/30"
      />,
    );
  }
  return stars;
}

// =============================================================================
// MapInner Component
// =============================================================================

export interface MapInnerProps {
  latitude: number;
  longitude: number;
  zoom?: number | null;
  height?: string | null;
  mapStyle?: string | null;
  markers?: Array<Record<string, unknown>> | null;
}

export default function MapInner(props: MapInnerProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const mapStyle =
    MAPBOX_STYLES[props.mapStyle ?? "streets"] ?? MAPBOX_STYLES.streets;

  const markers = (
    Array.isArray(props.markers) ? props.markers : []
  ) as Array<Record<string, unknown>>;

  const handleSelectMarker = useCallback(
    (idx: number) => {
      setSelectedIdx((prev) => (prev === idx ? null : idx));
      const m = markers[idx];
      if (!m) return;
      const lat = (m.latitude ?? m.lat) as number;
      const lng = (m.longitude ?? m.lng ?? m.lon) as number;
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: Math.max(mapRef.current.getZoom(), 14),
          duration: 800,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markers.length],
  );

  const selectedMarker =
    selectedIdx != null ? markers[selectedIdx] : null;

  return (
    <div
      className="relative w-full"
      style={{
        height: props.height ?? "550px",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* ---- Full-bleed Map Background ---- */}
      <ReactMapGL
        initialViewState={{
          latitude: props.latitude,
          longitude: props.longitude,
          zoom: props.zoom ?? 12,
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        ref={(r) => {
          if (r) mapRef.current = r.getMap();
        }}
        onClick={() => setSelectedIdx(null)}
      >
        <NavigationControl position="top-right" />

        {markers.map((marker, i) => {
          const m = marker as Record<string, unknown>;
          const lat = (m.latitude ?? m.lat) as number;
          const lng = (m.longitude ?? m.lng ?? m.lon) as number;
          const color = (m.color as string) ?? "#EF4444";
          const isSelected = selectedIdx === i;

          return (
            <MapboxMarker
              key={i}
              latitude={lat}
              longitude={lng}
              anchor="bottom"
              onClick={(e: { originalEvent: MouseEvent }) => {
                e.originalEvent.stopPropagation();
                handleSelectMarker(i);
              }}
            >
              <div
                className="transition-transform duration-200"
                style={{
                  transform: isSelected ? "scale(1.3)" : "scale(1)",
                  filter: isSelected
                    ? "drop-shadow(0 0 6px rgba(0,0,0,0.4))"
                    : "none",
                }}
              >
                <svg
                  width="28"
                  height="40"
                  viewBox="0 0 24 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 0C5.372 0 0 5.372 0 12c0 9 12 24 12 24s12-15 12-24c0-6.628-5.372-12-12-12z"
                    fill={isSelected ? "#1d4ed8" : color}
                  />
                  <circle cx="12" cy="12" r="5" fill="white" />
                </svg>
              </div>
            </MapboxMarker>
          );
        })}
      </ReactMapGL>

      {/* ---- Left Overlay Panel ---- */}
      {markers.length > 0 && (
        <div
          className="absolute top-3 left-3 bottom-3 flex flex-col z-10"
          style={{ width: 340, maxWidth: "45%" }}
        >
          <div className="flex flex-col h-full bg-background/95 backdrop-blur-md rounded-xl shadow-xl border border-border/50 overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-border/50 shrink-0">
              <p className="text-sm font-semibold text-foreground">
                {markers.length} location{markers.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {markers.map((marker, i) => {
                const m = marker as Record<string, unknown>;
                const label =
                  (m.label ?? m.name ?? m.title) as string | null;
                const description = m.description as string | null;
                const address = m.address as string | null;
                const rating = m.rating as number | null;
                const image = m.image as string | null;
                const category = m.category as string | null;
                const isSelected = selectedIdx === i;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectMarker(i)}
                    className={`w-full text-left px-4 py-3 border-b border-border/30 transition-colors cursor-pointer hover:bg-accent/50 ${
                      isSelected ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      {image && (
                        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image}
                            alt={label ?? ""}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <p className="text-sm font-semibold text-foreground truncate">
                          {label ?? `Location ${i + 1}`}
                        </p>

                        {/* Rating + Category row */}
                        {(rating != null || category) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {rating != null && (
                              <div className="flex items-center gap-0.5">
                                <span className="text-xs font-medium text-foreground">
                                  {rating.toFixed(1)}
                                </span>
                                <div className="flex">
                                  {renderStars(rating)}
                                </div>
                              </div>
                            )}
                            {category && (
                              <span className="text-xs text-muted-foreground">
                                · {category}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Address */}
                        {address && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {address}
                          </p>
                        )}

                        {/* Description (only when selected) */}
                        {isSelected && description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
                            {description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expanded detail card for selected marker */}
            {selectedMarker && (
              <div className="shrink-0 border-t border-border/50 bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {(selectedMarker.label ??
                        selectedMarker.name ??
                        selectedMarker.title) as string}
                    </h3>
                    {(selectedMarker.category as string) && (
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] px-1.5 py-0"
                      >
                        {selectedMarker.category as string}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIdx(null)}
                    className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>

                {(selectedMarker.rating as number) != null && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-sm font-semibold">
                      {(selectedMarker.rating as number).toFixed(1)}
                    </span>
                    <div className="flex">
                      {renderStars(selectedMarker.rating as number)}
                    </div>
                  </div>
                )}

                {(selectedMarker.address as string) && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      {selectedMarker.address as string}
                    </p>
                  </div>
                )}

                {(selectedMarker.description as string) && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {selectedMarker.description as string}
                  </p>
                )}

                {(selectedMarker.image as string) && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMarker.image as string}
                      alt={
                        (selectedMarker.label as string) ?? "Location"
                      }
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
