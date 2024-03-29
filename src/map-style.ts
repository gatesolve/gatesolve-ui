import type { LayerProps } from "react-map-gl"; // eslint-disable-line import/no-extraneous-dependencies
import type { Expression } from "mapbox-gl";
import {
  literal,
  has,
  get,
  getVar,
  toBoolean,
  not,
  length,
  gt,
  any,
  all,
  concat,
  coalesce,
  format,
  cond,
} from "./mapbox-style-typescript";

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

const venueSymbolLayer: LayerProps = {
  id: "venue-symbol",
  type: "symbol",
  paint: {
    "text-halo-color": "#fff",
    "text-color": "#af8dbc",
    "text-halo-width": 2,
  },
  layout: {
    "text-field": ["get", "@venue-label"],
    "text-anchor": "center",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 20,
    "text-offset": [0, -1.55],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
    "icon-image": "icon-svg-pin-48-#af8dbc-#fff",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

export const venueLayers = [venueSymbolLayer];

const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "@opacity"], 0.8],
    "line-width": 2,
    "line-color": ["get", "@color"],
  },
  filter: ["!", ["coalesce", ["get", "@imaginary"], ["get", "@tunnel"], false]],
};

const routeTunnelLineLayer: LayerProps = {
  id: "route-tunnel-line",
  beforeId: "tunnel-line",
  type: "line",
  layout: {
    "line-cap": "butt",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "@opacity"], 0.8],
    "line-width": 1,
    "line-gap-width": 6,
    "line-dasharray": [10, 3],
    "line-color": ["get", "@color"],
  },
  filter: ["coalesce", ["get", "@tunnel"]],
};

const routeLineInteractiveLayer: LayerProps = {
  id: "route-line-interactive",
  type: "line",
  paint: {
    "line-width": 16,
    "line-opacity": 0,
  },
  filter: ["coalesce", ["get", "@interactive"]],
};

export const routeImaginaryLineLayer: LayerProps = {
  id: "route-imaginary-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "@opacity"], 0.5],
    "line-width": 5,
    "line-color": ["get", "@color"],
    "line-dasharray": [0, 2],
  },
  filter: ["coalesce", ["get", "@imaginary"], false],
};

export const routePointLayer: LayerProps = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-opacity": ["coalesce", ["get", "@opacity"], 1],
    "circle-radius": 5,
    "circle-color": ["get", "@color"],
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const routePointInteractiveLayer: LayerProps = {
  id: "route-point-interactive",
  type: "circle",
  paint: {
    "circle-opacity": 0,
    "circle-radius": 15,
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const routePointSymbolLayer: LayerProps = {
  id: "route-point-symbol",
  type: "symbol",
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": ["get", "@label"],
    "text-anchor": "center",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -0.05],
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const routeLayers: Array<LayerProps> = [
  routeLineLayer,
  routeLineInteractiveLayer,
  routeTunnelLineLayer,
  routeImaginaryLineLayer,
  routePointLayer,
  routePointSymbolLayer,
  routePointInteractiveLayer,
];

export const buildingHighlightLayer: LayerProps = {
  id: "building-highlight",
  type: "fill",
  paint: {
    "fill-opacity": 0.3,
    "fill-color": "#99ff99",
  },
};

const parkingAreas: LayerProps = {
  id: "parking-area",
  type: "fill",
  minzoom: 12,
  paint: {
    "fill-opacity": 0.5,
    "fill-color": "#00afff",
  },
};

export const parkingPoints: LayerProps = {
  id: "parking-point",
  type: "circle",
  minzoom: 12,
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
      5, // circle radius is 5.
    ],
    "circle-opacity": 0.8,
    "circle-color": "#00afff",
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const parkingLayers: Array<LayerProps> = [parkingAreas, parkingPoints];

const tunnelLines: LayerProps = {
  id: "tunnel-line",
  type: "line",
  minzoom: 12,
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": 0.8,
    "line-width": 3,
    "line-color": [
      "step",
      ["to-number", ["get", "layer"]],
      "#000000",
      -4,
      "#770000",
      -3,
      "#ff0000",
      -2,
      "#ff7700",
      -1,
      "#ffff00",
    ],
  },
};

const tunnelPoints: LayerProps = {
  id: "tunnel-point",
  type: "circle",
  minzoom: 12,
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
      5, // circle radius is 5.
    ],
    "circle-opacity": 0.8,
    "circle-color": "#000000",
  },
  filter: ["==", "Point", ["geometry-type"]],
};

const tunnelPointSymbols: LayerProps = {
  id: "tunnel-point-symbol",
  type: "symbol",
  minzoom: 12,
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 1,
  },
  layout: {
    "text-field": coalesce(get("name"), get("ref"), get("description"), ""),
    "text-anchor": "right",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 12,
    "text-offset": [-0.5, 0],
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const tunnelLayers: Array<LayerProps> = [
  tunnelPoints,
  tunnelLines,
  tunnelPointSymbols,
];

export const tunnelMaskLayers: Array<LayerProps> = [
  {
    id: "tunnel-mask",
    type: "fill",
    paint: {
      "fill-opacity": 0.4,
      "fill-color": "#ffffff",
    },
  },
];

const entrancePoints: LayerProps = {
  id: "entrance-point",
  type: "circle",
  minzoom: 12,
  maxzoom: 16,
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
};

const lowZoomLabel = (maybeSpace: Expression): Expression =>
  format(
    [
      cond(
        [not(toBoolean(get("@house-label"))), ""], // No housenumber
        [
          any(
            coalesce(get("@secondary"), false),
            gt(length(get("@house-label")), 3)
          ),
          "·",
        ], // Hide housenumber.
        [get("@house-label")] // Full housenumber
      ),
      {},
    ],
    [maybeSpace, {}],
    // Last, the entrance letter, in bold font
    [
      cond(
        [not(toBoolean(get("@entrance-label"))), ""], // No housenumber
        [all(coalesce(get("@secondary"), false)), "·"], // Hide letter.
        [get("@entrance-label")] // Full entrance letter
      ),
      {
        "text-font": ["literal", ["Klokantech Noto Sans Bold"]],
      },
    ]
  );

const hasNoLabel = (labelName: string): Expression =>
  not(toBoolean(get(labelName)));

const midZoomLabel = (maybeSpace: Expression): Expression =>
  format(
    [
      cond(
        [hasNoLabel("@house-label"), ""], // No housenumber
        [
          any(
            coalesce(get("@secondary"), false),
            gt(length(get("@house-label")), 3)
          ),
          "·",
        ], // Hide housenumber.
        [get("@house-label")] // Full housenumber
      ),
      {},
    ],
    [maybeSpace, {}],
    // Last, the entrance letter, in bold font
    [
      cond(
        [not(toBoolean(get("@entrance-label"))), ""], // No housenumber
        [
          all(
            coalesce(get("@secondary"), false),
            gt(length(get("@entrance-label")), 1)
          ),
          "·",
        ], // Hide letter.
        [get("@entrance-label")] // Full entrance letter
      ),
      {
        "text-font": ["literal", ["Klokantech Noto Sans Bold"]],
      },
    ]
  );

// always show the housenumber followed by the bolded entrance letter
const highZoomLabel = (houseLabelMaybeSpace: Expression): Expression =>
  format(
    // First, the housenumber, without special formatting
    [houseLabelMaybeSpace, {}],
    // Last, the entrance letter, in bold font
    [
      get("@entrance-label"),
      {
        "text-font": ["literal", ["Klokantech Noto Sans Bold"]],
      },
    ]
  );

const zoomDependentEntranceLabel: Expression = [
  "let",
  "maybe_space",
  cond(
    // If we have both labels, then separate by a thin space.
    [all(has("@house-label"), has("@entrance-label")), "\u2009"],
    [""] // Otherwise, no separator.
  ),
  "house_label_maybe_space",
  concat(
    get("@house-label"),
    cond(
      // If we have both labels, then separate by a thin space.
      [all(has("@house-label"), has("@entrance-label")), "\u2009"],
      [""] // Otherwise, no separator.
    )
  ),
  [
    "step",
    ["zoom"],
    lowZoomLabel(getVar("maybe_space")),
    17, // At zoom 17 or more,
    midZoomLabel(getVar("maybe_space")),
    18, // At zoom 18 or more,
    highZoomLabel(getVar("house_label_maybe_space")),
  ],
];

const caseEntranceLabel = ({
  missing,
  visible,
  hidden,
}: {
  missing: Expression;
  visible: Expression;
  hidden: Expression;
}): Expression => [
  "step",
  ["zoom"],
  // lowZoomLabel
  cond(
    [
      not(
        any(toBoolean(get("@house-label")), toBoolean(get("@entrance-label")))
      ),
      missing,
    ],
    [
      all(
        not(
          // housenumber visible
          all(
            toBoolean(get("@house-label")),
            not(toBoolean(get("@secondary"))),
            not(gt(length(get("@house-label")), 3))
          )
        ),
        not(
          // entrance label visible
          all(
            toBoolean(get("@entrance-label")),
            not(toBoolean(get("@secondary")))
          )
        )
      ),
      hidden,
    ],
    [visible]
  ),
  17, // At zoom 17 or more,
  // midZoomLabel
  cond(
    [
      not(
        any(toBoolean(get("@house-label")), toBoolean(get("@entrance-label")))
      ),
      missing,
    ],
    [
      all(
        not(
          // housenumber visible
          all(
            toBoolean(get("@house-label")),
            not(toBoolean(get("@secondary"))),
            not(gt(length(get("@house-label")), 3))
          )
        ),
        not(
          // entrance label visible
          all(
            toBoolean(get("@entrance-label")),
            any(
              not(toBoolean(get("@secondary"))),
              not(gt(length(get("@entrance-label")), 1))
            )
          )
        )
      ),
      hidden,
    ],
    [visible]
  ),
  18, // At zoom 18 or more,
  // highZoomLabel
  cond(
    [
      not(
        any(toBoolean(get("@house-label")), toBoolean(get("@entrance-label")))
      ),
      missing,
    ],
    [visible]
  ),
];

const ifEntranceLabelHiddenElse = (
  hidden: Expression,
  notHidden: Expression
): Expression =>
  caseEntranceLabel({
    missing: notHidden,
    visible: notHidden,
    hidden,
  });

const ifEntranceLabelVisibleElse = (
  visible: Expression,
  invisible: Expression
): Expression =>
  caseEntranceLabel({
    missing: invisible,
    visible,
    hidden: invisible,
  });

const entranceSymbols: LayerProps = {
  id: "entrance-symbol",
  type: "symbol",
  minzoom: 16,
  paint: {
    "text-halo-color": "#fff",
    "text-color": "#64be14",
    "text-halo-width": 1,
    "icon-opacity": ifEntranceLabelVisibleElse(literal(1), literal(0.5)),
    "text-opacity": ifEntranceLabelVisibleElse(literal(1), literal(0)),
  },
  layout: {
    "text-field": zoomDependentEntranceLabel,
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 16,
    "text-offset": ["get", "@offset"],
    "text-anchor": ["step", ["%", ["get", "@rotate"], 360]].concat(
      anglesToAnchors()
    ) as Expression,
    "text-rotation-alignment": "map",
    "text-allow-overlap": true,
    "text-ignore-placement": true,
    "icon-image": ifEntranceLabelHiddenElse(
      literal("icon-svg-triangleDot-28-#64be14-#fff"),
      literal("icon-svg-triangle-28-#64be14-#fff")
    ),
    "icon-anchor": "center",
    "icon-rotate": ["get", "@rotate"],
    "icon-rotation-alignment": "map",
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
};

export const allEntrancesLayers: Array<LayerProps> = [
  entrancePoints, // smaller zoom levels
  entranceSymbols, // larger zoom levels
];
