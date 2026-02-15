import { nestedToFlat, type Spec } from "@json-render/core";

/**
 * Solar system 3D spec (nested format).
 * Used as the canonical diagram when the app needs to show the solar system
 * (e.g. from main chat when the user asks for a solar system diagram).
 */
export const SOLAR_SYSTEM_NESTED = {
  type: "Stack",
  props: { direction: "vertical", className: "relative min-h-0 flex-1" },
  state: { planetInfo: null },
  children: [
    { type: "PlanetInfoOverlay", props: {} },
    {
      type: "Scene3D",
      props: {
        height: "600px",
        background: "#000010",
        cameraPosition: [0, 30, 60],
      },
      children: [
        { type: "Stars", props: { count: 5000, fade: true } },
        { type: "AmbientLight", props: { intensity: 0.2 } },
        {
          type: "PointLight",
          props: { position: [0, 0, 0], intensity: 2 },
        },
        {
          type: "HoverableGroup3D",
          props: {
            label: "Sun",
            labelPosition: [0, 3.2, 0],
            labelFontSize: 0.6,
            labelColor: "#ffffff",
          },
          on: { hover: { action: "fetchPlanetInfo", params: { planet: "Sun" } } },
          children: [
            {
              type: "Sphere",
              props: {
                args: [2.5, 32, 32],
                color: "#FDB813",
                emissive: "#FDB813",
                emissiveIntensity: 1,
              },
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.003, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Mercury", labelPosition: [5, 0.6, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Mercury" } } },
              children: [
                { type: "Sphere", props: { position: [5, 0, 0], args: [0.3, 16, 16], color: "#8C7853" } },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.002, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Venus", labelPosition: [8, 1, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Venus" } } },
              children: [
                {
                  type: "Sphere",
                  props: {
                    position: [8, 0, 0],
                    args: [0.7, 16, 16],
                    color: "#FFB347",
                    emissive: "#FFB347",
                    emissiveIntensity: 0.35,
                  },
                },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.0015, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Earth", labelPosition: [12, 1, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Earth" } } },
              children: [
                { type: "Sphere", props: { position: [12, 0, 0], args: [0.8, 16, 16], color: "#4B7BE5" } },
              ],
            },
            {
              type: "Group3D",
              props: { position: [12, 0, 0], animation: { rotate: [0, 0.008, 0] } },
              children: [
                {
                  type: "HoverableGroup3D",
                  props: { label: "Moon", labelPosition: [1.5, 0.5, 0], labelFontSize: 0.3, labelColor: "#ffffff" },
                  on: { hover: { action: "fetchPlanetInfo", params: { planet: "Moon" } } },
                  children: [
                    { type: "Sphere", props: { position: [1.5, 0, 0], args: [0.2, 12, 12], color: "#CCC" } },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.001, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Mars", labelPosition: [16, 0.7, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Mars" } } },
              children: [
                { type: "Sphere", props: { position: [16, 0, 0], args: [0.5, 16, 16], color: "#E27B58" } },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.0005, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Jupiter", labelPosition: [22, 2.5, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Jupiter" } } },
              children: [
                {
                  type: "Sphere",
                  props: {
                    position: [22, 0, 0],
                    args: [2, 20, 20],
                    color: "#E8A317",
                    emissive: "#E8A317",
                    emissiveIntensity: 0.3,
                  },
                },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.0003, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Saturn", labelPosition: [28, 2.2, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Saturn" } } },
              children: [
                { type: "Sphere", props: { position: [28, 0, 0], args: [1.7, 20, 20], color: "#FAD5A5" } },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.0002, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Uranus", labelPosition: [34, 1.5, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Uranus" } } },
              children: [
                { type: "Sphere", props: { position: [34, 0, 0], args: [1.2, 16, 16], color: "#ACE5EE" } },
              ],
            },
          ],
        },
        {
          type: "Group3D",
          props: { animation: { rotate: [0, 0.00015, 0] } },
          children: [
            {
              type: "HoverableGroup3D",
              props: { label: "Neptune", labelPosition: [40, 1.5, 0], labelFontSize: 0.4, labelColor: "#ffffff" },
              on: { hover: { action: "fetchPlanetInfo", params: { planet: "Neptune" } } },
              children: [
                { type: "Sphere", props: { position: [40, 0, 0], args: [1.1, 16, 16], color: "#5B5EA6" } },
              ],
            },
          ],
        },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [4.5, 5.5, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [7, 9, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [11, 13, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [15, 17, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [21, 23, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [27, 29, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [33, 35, 64], color: "#e8eeff", opacity: 0.28 } },
        { type: "Ring", props: { rotation: [-1.5708, 0, 0], args: [39, 41, 64], color: "#e8eeff", opacity: 0.28 } },
      ],
    },
  ],
} as const;

/** Returns the solar system spec in flat format for ExplorerRenderer. */
export function getSolarSystemSpec(): Spec {
  return nestedToFlat(SOLAR_SYSTEM_NESTED as unknown as Record<string, unknown>) as Spec;
}
