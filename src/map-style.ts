import type { LayerProps } from "react-map-gl";
import type { Expression } from "mapbox-gl";

const anglesToAnchors = (): Array<string | number> => {
  const offset = 0;
  const angles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.7, 292.5, 337.5];

  const anchors = [
    "top",
    "top-right",
    "right",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left",
    "top-left",
  ];

  const initialStep: Array<string | number> = [anchors[offset]];
  const ret = initialStep.concat(
    angles.flatMap((angle, index) => {
      return [angle, anchors[(offset + index + 1) % anchors.length]] as Array<
        string | number
      >;
    })
  );

  return ret;
};

export const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "opacity"], 0.8],
    "line-width": 2,
    "line-color": ["get", "color"],
  },
  filter: ["!", ["coalesce", ["get", "imaginary"], false]],
};

export const routeImaginaryLineLayer: LayerProps = {
  id: "route-imaginary-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "opacity"], 0.5],
    "line-width": 5,
    "line-color": ["get", "color"],
    "line-dasharray": [0, 2],
  },
  filter: ["coalesce", ["get", "imaginary"], false],
};

export const routePointLayer: LayerProps = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-opacity": ["coalesce", ["get", "opacity"], 1],
    "circle-radius": 5,
    "circle-color": ["get", "color"],
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const buildingHighlightLayer: LayerProps = {
  id: "building-highlight",
  type: "fill",
  paint: {
    "fill-opacity": 0.3,
    "fill-color": "#99ff99",
  },
};

export const allEntrancesLayers: Array<LayerProps> = [
  {
    id: "entrance-point",
    type: "circle",
    minzoom: 12,
    maxzoom: 15.999,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        12, // At zoom 12 or less,
        1, // circle radius is 1.
        14, // At zoom 14,
        2, // circle radius is 2.
        15, // At zoom 15 or more,
        3, // circle radius is 3.
      ],
      "circle-color": "#64be14",
    },
  },
  {
    id: "entrance-symbol",
    type: "symbol",
    minzoom: 16,
    paint: {
      "text-halo-color": "#fff",
      "text-color": "#64be14",
      "text-halo-width": 1,
    },
    layout: {
      "text-field": ["get", "label"],
      "text-font": ["Klokantech Noto Sans Regular"],
      "text-size": 16,
      "text-offset": ["get", "offset"],
      "text-anchor": ["step", ["%", ["get", "rotate"], 360]].concat(
        anglesToAnchors()
      ) as Expression,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "icon-image": "icon-svg-triangle-14-#64be14-#fff",
      "icon-anchor": "bottom",
      "icon-rotate": ["get", "rotate"],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  },
];

export const routePointSymbolLayer: LayerProps = {
  id: "route-point-symbol",
  type: "symbol",
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": ["get", "ref"],
    "text-anchor": "center",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -0.05],
  },
  filter: ["==", "Point", ["geometry-type"]],
};
