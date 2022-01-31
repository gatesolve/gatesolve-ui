import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactText,
} from "react";
import { useRouteMatch, useHistory } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { match } from "react-router-dom";
import { Button, IconButton } from "@material-ui/core";
import {
  Close as CloseIcon,
  AddComment as AddCommentIcon,
} from "@material-ui/icons";
import { useSnackbar } from "notistack";
import MapGL, { Popup, Source, Layer, Marker } from "@urbica/react-map-gl";
import { WebMercatorViewport } from "@math.gl/web-mercator";
import {
  distance as turfDistance,
  nearestPointOnLine as turfNearestPointOnLine,
} from "@turf/turf";
import { MapboxGeoJSONFeature } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { Feature, FeatureCollection, Point, Position } from "geojson";
import { ReactAutosuggestGeocoder } from "react-autosuggest-geocoder";

import {
  routePointLayer,
  routePointSymbolLayer,
  routeLineLayers,
  routeImaginaryLineLayer,
  buildingHighlightLayer,
  allEntrancesLayers,
  venueLayers,
  parkingLayers,
  tunnelLayers,
} from "./map-style";
import Pin, { pinAsSVG } from "./components/Pin";
import { triangleAsSVG, triangleDotAsSVG } from "./components/Triangle";
import OLMapDialog from "./components/OLMapDialog";
import OLMapImages from "./components/OLMapImages";
import UserPosition from "./components/UserPosition";
import GeolocateControl from "./components/GeolocateControl";
import TunnelsControl from "./components/TunnelsControl";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import {
  queryNodesById,
  queryEntrances,
  queryMatchingStreet,
  queryTunnels,
  ElementWithCoordinates,
  Tags,
} from "./overpass";
import { addImageSVG, getMapSize } from "./mapbox-utils";
import routableTilesToGeoJSON from "./RoutableTilesToGeoJSON";
import { getVisibleTiles } from "./minimal-xyz-viewer";
import {
  fetchOlmapData,
  olmapNewNoteURL,
  olmapNoteURL,
  OlmapResponse,
  NetworkState,
  venueDataToGeoJSON,
  OlmapWorkplaceEntrance,
  OlmapUnloadingPlace,
  venueDataToUnloadingPlaces,
  venueDataToUnloadingPlaceEntrances,
  olmapNoteToElement,
} from "./olmap";
import { fromEpsg3879, toEpsg3879 } from "./projections";

import "./App.css";
import "./components/PinMarker.css";
import VenueDialog from "./components/VenueDialog";

const maxRoutingDistance = 500; // in meters

// XXX: WebMercatorViewportOptions only indirectly exported by @math.gl/web-mercator
// XXX: TypeScript 4.3.5 confused if re-using an out-of-scope type name
type WebMercatorViewportOptions2 = NonNullable<
  ConstructorParameters<typeof WebMercatorViewport>[0]
>;

type LatLng = [number, number];

type ViewportState = Omit<WebMercatorViewportOptions2, "width" | "height">;

interface State {
  viewport: ViewportState;
  isOriginExplicit: boolean;
  origin?: LatLng;
  destination?: ElementWithCoordinates;
  venue?: ElementWithCoordinates;
  entrances?: Array<ElementWithCoordinates>;
  route: FeatureCollection;
  highlights?: MapboxGeoJSONFeature | FeatureCollection;
  isGeolocating: boolean;
  geolocationPosition: LatLng | null;
  popupCoordinates: ElementWithCoordinates | null;
  snackbar?: ReactText;
  routableTiles: Map<string, FeatureCollection | null>;
  olmapData?: NetworkState<OlmapResponse>;
  editingNote?: number;
  venueOlmapData?: NetworkState<OlmapResponse>;
  venueDialogOpen: boolean;
  venueDialogCollapsed: boolean;
  venueFeatures: FeatureCollection;
  unloadingPlace?: OlmapUnloadingPlace;
  parkingData?: FeatureCollection;
  tunnelData?: FeatureCollection;
  showTunnels: boolean;
  restrictions?: Array<ElementWithCoordinates>;
  locale: string;
}

const latLngToElement = (latLng: LatLng): ElementWithCoordinates => ({
  id: -1,
  type: "node",
  lat: latLng[0],
  lon: latLng[1],
});

const elementToLatLng = (element: ElementWithCoordinates): LatLng => [
  element.lat,
  element.lon,
];

const geoJsonToElement = (feature: Feature<Point>): ElementWithCoordinates => {
  const [id, type] = feature.properties?.["@id"].split("/").reverse();
  const element = {
    id: parseInt(id, 10),
    type,
    lat: feature.geometry.coordinates[1],
    lon: feature.geometry.coordinates[0],
    tags: feature.properties || undefined,
  };
  return element;
};

const emptyFeatureCollection: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const initialState: State = {
  entrances: [],
  route: geometryToGeoJSON(),
  highlights: emptyFeatureCollection,
  viewport: {
    latitude: 60.17,
    longitude: 24.941,
    zoom: 15,
    bearing: 0,
    pitch: 0,
  },
  isOriginExplicit: false,
  isGeolocating: false,
  geolocationPosition: null,
  popupCoordinates: null,
  routableTiles: new Map(),
  venueDialogOpen: false,
  venueDialogCollapsed: false,
  venueFeatures: emptyFeatureCollection,
  showTunnels: false,
  locale: "en",
};

const metropolitanAreaCenter = [60.17066815612902, 24.941510260105133];

const transformRequest = (originalURL: string): { url: string } => {
  const url = originalURL.replace(
    "https://static.hsldev.com/mapfonts/Klokantech Noto Sans",
    "https://fonts.openmaptiles.org/Klokantech Noto Sans"
  );
  return { url };
};

const distance = (from: LatLng, to: LatLng): number =>
  turfDistance([from[1], from[0]], [to[1], to[0]], { units: "meters" });

const parseLatLng = (text: string | undefined): LatLng | undefined => {
  if (text) {
    const parts = text.split(",");
    if (parts.length === 2 && parts[0].length && parts[1].length) {
      const [lat, lon] = parts.map(Number);
      if (!Number.isNaN(lat) && lon > -90 && lon < 90) {
        return [lat, lon];
      }
    }
  }
  return undefined;
};

const fitBounds = (
  viewportOptions: WebMercatorViewportOptions2,
  latLngs: Array<LatLng | undefined>,
  occludedBottomProportion = 0
): WebMercatorViewportOptions2 => {
  const viewport = new WebMercatorViewport(viewportOptions);
  const inputs = latLngs.filter((x) => x) as Array<LatLng>;
  if (!inputs.length) return viewportOptions; // Nothing to do
  const minLng = Math.min(...inputs.map((x) => x[1]));
  const maxLng = Math.max(...inputs.map((x) => x[1]));
  const minLat = Math.min(...inputs.map((x) => x[0]));
  const maxLat = Math.max(...inputs.map((x) => x[0]));
  const padding = 20;
  const markerSize = 50;
  const occludedTop = 40;
  const occludedBottom = occludedBottomProportion * viewportOptions.height;
  const circleRadius = 5;
  const result = viewport.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: {
        top: padding + occludedTop + markerSize,
        bottom: padding + occludedBottom + circleRadius,
        left: padding + markerSize / 2,
        right: padding + markerSize / 2,
      },
      // Math in viewport.fitBounds breaks if both padding and maxZoom are set
      maxZoom: occludedBottomProportion ? undefined : 17,
    }
  );
  return result;
};

const App: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoder = useRef<any>(null);

  // Install a callback to dynamically create pin icons that our map styles use
  useEffect(() => {
    if (!map.current) {
      return; // No map yet, so nothing to do
    }
    const mapboxgl = map.current.getMap();
    // FIXME: Unclear why this passed type checking before.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapboxgl?.on("styleimagemissing", ({ id: iconId }: any) => {
      if (!iconId?.startsWith("icon-svg-")) {
        return; // We only know how to generate certain svg icons
      }
      const [, , shape, size, fill, stroke] = iconId.split("-"); // e.g. icon-pin-48-green-#fff
      let renderSVG;
      if (shape === "pin") {
        renderSVG = pinAsSVG;
      } else if (shape === "triangle") {
        renderSVG = triangleAsSVG;
      } else if (shape === "triangleDot") {
        renderSVG = triangleDotAsSVG;
      } else {
        return; // Unknown shape
      }
      const svgData = renderSVG(size, `fill: ${fill}; stroke: ${stroke}`);
      addImageSVG(mapboxgl, iconId, svgData, size);
    });
  }, [map]);

  const urlMatch = useRouteMatch({
    path: "/route/:from?/:to?",
  }) as match<{ from: string; to: string }>;

  const urlMatchSearch = useRouteMatch({
    path: "/search/:query?",
  }) as match<{ query: string }>;

  const urlMatchOsm = useRouteMatch({
    path: "/osm/node/:id?",
  }) as match<{ id: string }>;

  const [state, setState] = useState(initialState);

  const fitMap = (
    viewportOptions: ViewportState,
    latLngs: Array<LatLng | undefined>,
    occludedBottomProportion?: number
  ): WebMercatorViewportOptions2 => {
    return fitBounds(
      { ...viewportOptions, ...getMapSize(map.current?.getMap()) },
      latLngs,
      occludedBottomProportion
    );
  };

  useEffect(() => {
    if (!map.current || !state.viewport.zoom) {
      return; // Nothing to do yet
    }
    if (state.viewport.zoom < 12) return; // minzoom

    const { width: mapWidth, height: mapHeight } = getMapSize(
      map.current.getMap()
    );

    // Calculate multiplier for under- or over-zoom
    const tilesetZoomLevel = 14;
    const zoomOffset = 1; // tiles are 512px (double the standard size)
    const zoomMultiplier =
      2 ** (tilesetZoomLevel - zoomOffset - state.viewport.zoom);

    const visibleTiles = getVisibleTiles(
      zoomMultiplier * mapWidth,
      zoomMultiplier * mapHeight,
      [state.viewport.longitude, state.viewport.latitude],
      tilesetZoomLevel
    );

    // Initialise the new Map with nulls and available tiles from previous
    const routableTiles = new Map();
    visibleTiles.forEach(({ zoom, x, y }) => {
      const key = `${zoom}/${x}/${y}`;
      routableTiles.set(key, state.routableTiles.get(key) || null);
    });

    setState((prevState: State): State => {
      return {
        ...prevState,
        routableTiles,
      };
    });

    visibleTiles.map(async ({ zoom, x, y }) => {
      const key = `${zoom}/${x}/${y}`;
      if (routableTiles.get(key) !== null) return; // We already have the tile
      // Fetch the tile
      const response = await fetch(
        `https://tile.olmap.org/building-tiles/${zoom}/${x}/${y}`
      );
      const body = await response.json();
      // Convert the tile to GeoJSON
      const geoJSON = routableTilesToGeoJSON(body) as FeatureCollection;
      // Add the tile if still needed based on latest state
      setState((prevState: State): State => {
        if (prevState.routableTiles.get(key) !== null) {
          return prevState; // This tile is not needed anymore
        }
        const newRoutableTiles = new Map(prevState.routableTiles);
        newRoutableTiles.set(key, geoJSON);
        return {
          ...prevState,
          routableTiles: newRoutableTiles,
        };
      });
    });
  }, [map.current, state.viewport]); // eslint-disable-line react-hooks/exhaustive-deps
  // XXX: state.routableTiles is missing above as we only use it as a cache here

  // Fetch new data for the parking layer when viewport changes
  useEffect(() => {
    (async () => {
      if (!map.current || !state.viewport.zoom) {
        return; // Nothing to do yet
      }
      if (state.viewport.zoom < 12) return; // minzoom

      const fetchGeoJSON = async (
        layername: string,
        bbox: string,
        ibbox: string
      ): Promise<FeatureCollection> => {
        const response = await fetch(
          "https://api.olmap.org/kartta.hel.fi/maps/featureloader.ashx",
          {
            method: "POST",
            body: new URLSearchParams({
              request: "select",
              id: layername,
              resolution: "1",
              params: "{}",
              where: `BBOX 'ENVELOPE(${ibbox})'`,
              sort: "",
              gproj: "",
              aproj: "",
              maxfeatures: "50000",
              skipfeatures: "",
              ibbox,
              capfeatures: "1",
              outputType: "geojson",
              srs: "EPSG:3879",
            }),
          }
        );
        const data = (await response.json()) as FeatureCollection;
        return data;
      };

      const bounds = map.current.getMap().getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      const southWest = toEpsg3879([bounds.getWest(), bounds.getSouth()]);
      const northEast = toEpsg3879([bounds.getEast(), bounds.getNorth()]);
      const ibbox = `${Math.floor(southWest[0])},${Math.floor(
        southWest[1]
      )},${Math.floor(northEast[0])},${Math.floor(northEast[1])}`;
      const layernames = [
        "pysakointipaikat_kuormauspaikat",
        "pysakointipaikat_pysakointikielto",
        "pysakointipaikat_sallitut_kiellon_ulkopuolella",
      ];
      const layers = await Promise.all(
        layernames.map((layername) => fetchGeoJSON(layername, bbox, ibbox))
      );
      const features = emptyFeatureCollection.features.concat(
        ...layers.map((layer) => layer.features)
      );
      const projectedFeatures = features.map((feature) => {
        if (feature.geometry.type === "Point") {
          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: fromEpsg3879(feature.geometry.coordinates),
            },
          };
        }
        if (feature.geometry.type === "Polygon") {
          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: feature.geometry.coordinates.map(
                (ring: Position[]): Position[] =>
                  ring.map(
                    (position: Position): Position => fromEpsg3879(position)
                  )
              ),
            },
          };
        }
        return feature; // XXX other geometry types not projected
      });
      const parkingData = {
        type: "FeatureCollection",
        features: projectedFeatures,
      } as FeatureCollection;

      setState((prevState) => ({
        ...prevState,
        parkingData,
      }));
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while fetching parking data:", error);
    });
  }, [map.current, state.viewport]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch new data for the tunnel layer when viewport changes
  useEffect(() => {
    (async () => {
      if (!map.current || !state.viewport.zoom) {
        return; // Nothing to do yet
      }
      if (state.viewport.zoom < 12) return; // minzoom
      if (!state.showTunnels) return;

      const bounds = map.current.getMap().getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      const tunnelData = await queryTunnels(bbox);
      setState((prevState) => ({
        ...prevState,
        tunnelData,
      }));
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while fetching tunnel data:", error);
    });
  }, [map.current, state.viewport, state.showTunnels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    /**
     * FIXME: urbica/react-map-gl does not expose fitBounds and state does not
     * include viewport width and height which are required by fitBounds from
     * @math.gl/web-mercator. This is dirty but seems to work.
     */
    if (!map.current) {
      return; // No map yet, so nothing to do
    }
    const { width, height } = getMapSize(map.current.getMap());
    if (
      urlMatch &&
      width != null &&
      width > 0 &&
      height != null &&
      height > 0
    ) {
      const origin = parseLatLng(urlMatch.params.from);
      const destination = parseLatLng(urlMatch.params.to);
      const viewportOptions = { ...state.viewport, width, height };
      const viewport = fitBounds(viewportOptions, [origin, destination]);
      setState(
        (prevState): State => ({
          ...prevState,
          origin,
          isOriginExplicit: origin != null,
          destination: destination && latLngToElement(destination),
          viewport: { ...prevState.viewport, ...viewport },
        })
      );
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useHistory();

  const snackbarFunctions = useSnackbar();
  // XXX: useSnackbar does not return functions during unit tests
  const enqueueSnackbar = snackbarFunctions?.enqueueSnackbar;
  const closeSnackbar = snackbarFunctions?.closeSnackbar;

  useEffect(() => {
    const destination = state.destination && [
      state.destination.lat,
      state.destination.lon,
    ];
    const path = `/route/${state.origin}/${destination}/`;
    if (history.location.pathname !== path) {
      let newLocation = path;
      // Keep utm_source if any in the query parameters
      if (/utm_source=/.exec(history.location.search)) {
        const params = new URLSearchParams(history.location.search);
        const utmSource = params.get("utm_source");
        if (utmSource !== null) {
          const newSearch = new URLSearchParams({ utm_source: utmSource });
          newLocation = `${path}?${newSearch}`;
        }
      }
      history.replace(newLocation);
    }
  }, [history, state.origin, state.destination]);

  // Fetch entrance information whenever destination changes
  useEffect(() => {
    (async () => {
      if (!state.destination) return; // Nothing to do yet

      let result = [] as ElementWithCoordinates[];
      let { venueOlmapData, venueFeatures } = state; // By default, keep the previous data

      // If state.entrances already has our destination, copy instead of fetching
      if (
        state.entrances?.find(
          (entrance) => entrance.id === state.destination?.id
        )
      ) {
        result = state.entrances.slice();
      }

      try {
        if (
          state.destination.id === state.venue?.id &&
          venueOlmapData?.state === "success" &&
          venueOlmapData.response.workplace?.osm_feature ===
            state.destination.id
        ) {
          result = venueFeatures.features.map((feature) =>
            geoJsonToElement(feature as Feature<Point>)
          );
          // FIXME: If state already had the same entrances, no need to re-set
        } else if (state.destination.id === state.venue?.id) {
          venueOlmapData = await fetchOlmapData(state.venue.id, state.locale);
          venueFeatures = emptyFeatureCollection;
          if (venueOlmapData?.state === "success") {
            const workplaceEntrances =
              venueOlmapData.response.workplace?.workplace_entrances;
            const entranceIds = workplaceEntrances?.map(
              (workplaceEntrance) => workplaceEntrance.entrance_data.osm_feature
            );
            result = await queryNodesById(entranceIds || []);
            if (venueOlmapData.response.workplace?.workplace_entrances) {
              const workplaceEntrancesInBoth =
                [] as Array<OlmapWorkplaceEntrance>;
              const osmEntrancesInOrder = [] as Array<ElementWithCoordinates>;
              workplaceEntrances?.forEach((workplaceEntrance) => {
                const osmEntrance = result.find(
                  (node) =>
                    node.id === workplaceEntrance.entrance_data.osm_feature
                );
                if (osmEntrance) {
                  workplaceEntrancesInBoth.push(workplaceEntrance);
                  osmEntrancesInOrder.push(osmEntrance);
                }
              });
              venueOlmapData.response.workplace.workplace_entrances =
                workplaceEntrancesInBoth;
              venueFeatures = venueDataToGeoJSON(
                venueOlmapData,
                osmEntrancesInOrder
              );
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error while fetching venue entrances:", error);
        // Proceed as if there was no entrance data
      }

      try {
        if (!result.length) {
          result = await queryEntrances(state.destination);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error while fetching building entrances:", error);
        // Proceed as if there was no entrance data
      }

      setState((prevState): State => {
        if (!state.destination) return prevState; // XXX Typescript needs this
        if (prevState.destination !== state.destination) {
          return prevState;
        }
        const entrances = result.length ? result : [state.destination];

        return {
          ...prevState,
          entrances,
          venueOlmapData,
          venueFeatures,
        };
      });
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while handling entrances:", error);
    });
  }, [state.destination, state.venue]); // eslint-disable-line react-hooks/exhaustive-deps -- state.venueOlmapData does not affect effect

  // Set off routing calculation when inputs change; collect results in state.route
  useEffect(() => {
    (async () => {
      if (state.snackbar) closeSnackbar(state.snackbar);

      if (!state.destination || !state.entrances) {
        return; // Nothing to do yet
      }
      let { origin } = state;
      let targets = [] as Array<ElementWithCoordinates>;

      // Try to find the destination among the entrances
      state.entrances.forEach((entrance) => {
        if (!state.destination) return; // XXX: Typescript needs this
        if (
          state.destination.type === entrance.type &&
          state.destination.id === entrance.id
        ) {
          targets = [entrance];
        }
      });

      // If the destination entrance wasn't found, route to all entrances
      if (!targets.length) {
        targets = state.entrances;
      }

      // Clear previous routing results by setting an empty result set
      setState(
        (prevState): State => ({
          ...prevState,
          route: geometryToGeoJSON(),
        })
      );

      let venueUnloadingPlaces = [] as Array<OlmapUnloadingPlace>;
      if (state.destination.id === state.venue?.id) {
        venueUnloadingPlaces = venueDataToUnloadingPlaces(state.venueOlmapData);
      }
      // The explicitly chosen destination entrance of a venue, if any
      const workplaceEntrance =
        (state.venueOlmapData?.state === "success" &&
          state.venueOlmapData.response.workplace?.workplace_entrances.find(
            (aWorkplaceEntrance) =>
              aWorkplaceEntrance.entrance_data.osm_feature ===
              state.destination?.id
          )) ||
        undefined;

      // Try to find an intermediary point (or multiple ones) on the street near the destination
      if (workplaceEntrance && workplaceEntrance.unloading_places.length) {
        // Routing to a venue feature with known unloading places
        venueUnloadingPlaces = workplaceEntrance.unloading_places;
      } else if (venueUnloadingPlaces.length) {
        if (state.unloadingPlace) {
          const preferredUnloadingPlace = venueUnloadingPlaces.find(
            (venueUnloadingPlace) =>
              venueUnloadingPlace.id === state.unloadingPlace?.id
          );
          if (preferredUnloadingPlace) {
            venueUnloadingPlaces = [preferredUnloadingPlace];
          }
        }
      } else if (
        !state.origin ||
        distance(state.origin, elementToLatLng(state.destination)) >=
          maxRoutingDistance
      ) {
        let target;
        let streetName;
        if (state.destination.tags?.["addr:street"]) {
          target = state.destination;
          streetName = state.destination.tags?.["addr:street"];
        } else {
          [target] = targets; // Pick a random entrance
          streetName = target.tags?.["addr:street"];
        }
        if (streetName) {
          const streetGeometry = await queryMatchingStreet(target, streetName);
          const point = turfNearestPointOnLine(streetGeometry, [
            target.lon,
            target.lat,
          ]).geometry.coordinates;
          origin = [point[1], point[0]];
        }
      }

      // Don't calculate routes if there was no origin and none was found either
      if (!origin && !venueUnloadingPlaces.length) {
        return;
      }

      // If the distance is still more than 200 meters apart
      // Show an error and proposed actions
      if (
        !venueUnloadingPlaces.length &&
        origin &&
        origin === state.origin &&
        distance(origin, elementToLatLng(state.destination)) >=
          maxRoutingDistance
      ) {
        const message = state.isOriginExplicit
          ? "Origin is too far for showing routes."
          : "Routes show when distance is shorter.";
        const snackbar = enqueueSnackbar(message, {
          variant: "info",
          persist: true,
          anchorOrigin: {
            vertical: "bottom",
            horizontal: "center",
          },
          action: (
            <>
              {state.isOriginExplicit && (
                <Button
                  color="inherit"
                  onClick={(): void => {
                    setState(
                      (prevState): State => ({
                        ...prevState,
                        origin: prevState.geolocationPosition || undefined,
                        isOriginExplicit: false,
                        viewport: fitMap(prevState.viewport, [
                          prevState.destination &&
                            elementToLatLng(prevState.destination),
                        ]),
                      })
                    );
                  }}
                >
                  Undo origin
                </Button>
              )}
              <Button
                color="inherit"
                onClick={(): void => {
                  setState(
                    (prevState): State => ({
                      ...prevState,
                      destination: undefined,
                      entrances: [],
                      viewport: fitMap(prevState.viewport, [prevState.origin]),
                    })
                  );
                }}
              >
                Undo destination
              </Button>
              <Button
                color="inherit"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&origin=${state.origin[0]},${state.origin[1]}&destination=${state.destination.lat},${state.destination.lon}&travelmode=driving`}
              >
                Google Maps
              </Button>

              <IconButton
                aria-label="close"
                onClick={(): void => closeSnackbar(snackbar)}
              >
                <CloseIcon />
              </IconButton>
            </>
          ),
        });
        setState((prevState): State => ({ ...prevState, snackbar }));
        return; // Don't calculate routes until the inputs change
      }

      const queries = [] as Array<
        [ElementWithCoordinates, ElementWithCoordinates, string?]
      >;
      if (venueUnloadingPlaces.length) {
        // If the destination is the whole venue, route to all entrances of venueUnloadingPlaces
        if (state.destination.id === state.venue?.id) {
          const unloadingPlaceEntrances = venueDataToUnloadingPlaceEntrances(
            state.venueOlmapData
          );
          venueUnloadingPlaces.forEach((venueOrigin) => {
            unloadingPlaceEntrances[venueOrigin.id].forEach((target) => {
              const targetEntrance = state.entrances?.find(
                (entrance) => entrance.id === target
              );
              // XXX: Always true, needed by Typescript:
              if (targetEntrance) {
                queries.push([
                  olmapNoteToElement(venueOrigin.image_note),
                  targetEntrance,
                  "delivery-walking",
                ]);
              }
              venueOrigin.access_points?.forEach((access_point) => {
                queries.push([
                  latLngToElement([
                    Number(access_point.lat),
                    Number(access_point.lon),
                  ]),
                  {
                    ...olmapNoteToElement(venueOrigin.image_note),
                    lat: Number(venueOrigin.image_note.lat) + 0.000001,
                    lon: Number(venueOrigin.image_note.lon) + 0.000001,
                  },
                  "delivery-car",
                ]);
              });
            });
          });
        } else {
          // The destination is a specific entrance of the venue
          workplaceEntrance?.unloading_places?.forEach((venueOrigin) => {
            if (state.destination) {
              queries.push([
                olmapNoteToElement(venueOrigin.image_note),
                state.destination,
                "delivery-walking",
              ]);
            }
            venueOrigin.access_points?.forEach((access_point) => {
              queries.push([
                latLngToElement([
                  Number(access_point.lat),
                  Number(access_point.lon),
                ]),
                {
                  ...olmapNoteToElement(venueOrigin.image_note),
                  lat: Number(venueOrigin.image_note.lat) + 0.000001,
                  lon: Number(venueOrigin.image_note.lon) + 0.000001,
                },
                "delivery-car",
              ]);
            });
          });
        }
      } else {
        targets.forEach((target) => {
          if (!origin) return; // Needed to convince Typescript
          queries.push([latLngToElement(origin), target]);
        });
      }

      await calculatePlan(queries, (geojson) => {
        setState((prevState): State => {
          // don't use the result if the parameters changed meanwhile
          if (
            state.origin !== prevState.origin ||
            state.entrances !== prevState.entrances ||
            state.destination !== prevState.destination
          ) {
            return prevState;
          }
          const extendedGeojson = {
            ...geojson,
            features: geojson.features.concat(prevState.route.features),
          };
          return {
            ...prevState,
            route: extendedGeojson,
          };
        });
      });
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while starting route planning:", error);
    });
  }, [state.origin, state.entrances, state.unloadingPlace]); // eslint-disable-line react-hooks/exhaustive-deps
  // XXX: state.destination is missing above as we need to wait for state.entrances to change as well

  // When popup opens, try to fetch data for it from OLMap's API
  useEffect(() => {
    (async () => {
      if (!state.popupCoordinates) return;
      // Clear previous data
      setState((prevState: State): State => {
        if (prevState.popupCoordinates !== state.popupCoordinates) {
          return prevState;
        }
        return {
          ...prevState,
          olmapData: { state: "loading" },
        };
      });
      // Fetch new data
      const olmapData = await fetchOlmapData(
        state.popupCoordinates.id,
        state.locale
      );
      setState((prevState: State): State => {
        if (prevState.popupCoordinates !== state.popupCoordinates) {
          return prevState;
        }
        return {
          ...prevState,
          olmapData,
        };
      });
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while fetching OLMap notes:", error);
    });
  }, [state.popupCoordinates, state.locale]);

  // When we receive OLMap data for a venue and the dialog opens, zoom the map to fit
  useEffect(() => {
    if (
      state.venueOlmapData?.state === "success" &&
      state.venueOlmapData.response.workplace
    ) {
      setState((prevState): State => {
        const destinationLatLng =
          state.destination && elementToLatLng(state.destination);
        const routingMarkers =
          prevState.origin &&
          destinationLatLng &&
          distance(prevState.origin, destinationLatLng) < maxRoutingDistance
            ? [prevState.origin, destinationLatLng]
            : [destinationLatLng];
        const entranceMarkers = state.entrances?.map(elementToLatLng) || [];
        const venueMarker =
          (state.venue && [elementToLatLng(state.venue)]) || [];
        const unloadingPlaces = venueDataToUnloadingPlaces(
          state.venueOlmapData
        );
        const unloadingPlaceMarkers = unloadingPlaces.map(
          (unloadingPlace) =>
            [
              Number(unloadingPlace.image_note.lat),
              Number(unloadingPlace.image_note.lon),
            ] as LatLng
        );
        const accessPointMarkers = [] as Array<LatLng>;
        unloadingPlaces.forEach((unloadingPlace) =>
          unloadingPlace.access_points?.forEach((access_point) => {
            accessPointMarkers.push([
              Number(access_point.lat),
              Number(access_point.lon),
            ]);
          })
        );
        const viewport = fitMap(
          prevState.viewport,
          [
            ...routingMarkers,
            ...entranceMarkers,
            ...venueMarker,
            ...unloadingPlaceMarkers,
            ...accessPointMarkers,
          ],
          0.5
        );
        return {
          ...prevState,
          viewport,
        };
      });
    }
  }, [state.venueOlmapData]); // eslint-disable-line react-hooks/exhaustive-deps -- trigger only on new venue data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (event: any): void => {
    // Inspect the topmost feature under click
    const feature = map.current?.getMap().queryRenderedFeatures(event.point)[0];
    setState((prevState): State => {
      // Typing needed as the compiler is not smart enough.
      const noHighlights: FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      const clickCoordinates = latLngToElement([
        event.lngLat.lat,
        event.lngLat.lng,
      ]);

      // If parking restriction was clicked, show details in the popup.
      if (feature?.source === "parking") {
        const tags = {} as Record<string, string>;

        if (
          feature.properties["hel:luokka_nimi"] ===
          "Pysäköinti sallittu pysäköintikieltoajan ulkopuolella"
        ) {
          tags["Pysäköintikielto"] =
            feature.properties["hel:voimassaolo"] || "";
        } else {
          tags[feature.properties["hel:tyyppi"]] = "";
        }

        if (feature.properties["hel:paikat_ala"]) {
          tags["Henkilöautoja"] = feature.properties["hel:paikat_ala"];
        }

        tags["ID"] = feature.properties["hel:id"];

        return {
          ...prevState,
          popupCoordinates: {
            type: "node",
            id: -1,
            lat: event.lngLat.lat,
            lon: event.lngLat.lng,
            tags: tags as Tags,
          },
          highlights: noHighlights,
        };
      }
      // If an OLMap element was clicked, show details in the popup.
      if (feature?.properties["@id"]?.startsWith("olmap")) {
        return {
          ...prevState,
          editingNote: feature.properties["@id"].split("/").reverse()[0],
        };
      }
      // If an entrance or a loading place was clicked, show details in the popup.
      if (
        feature?.properties.entrance ||
        feature?.properties["parking:condition"] === "loading"
      ) {
        const element = geoJsonToElement(feature);
        return {
          ...prevState,
          popupCoordinates: element,
          highlights: noHighlights,
        };
      }
      // If a barrier or steps were clicked, show details in the popup.
      if (
        feature?.properties.barrier ||
        feature?.properties.highway === "steps"
      ) {
        const id = feature.properties["@id"].split("/").reverse()[0];
        const [lon, lat] =
          feature.geometry.type === "Point"
            ? feature.geometry.coordinates
            : turfNearestPointOnLine(feature, event.lngLat.toArray()).geometry
                .coordinates;
        return {
          ...prevState,
          popupCoordinates: {
            id,
            type: feature.properties["@type"],
            lat,
            lon,
            tags: feature.properties,
          },
          highlights: noHighlights,
        };
      }
      // If the popup is open, close it.
      if (prevState.popupCoordinates != null) {
        return {
          ...prevState,
          popupCoordinates: null,
          highlights: noHighlights,
        };
      }
      // If a building was clicked, highlight it.
      if (feature?.sourceLayer === "building") {
        return {
          ...prevState,
          popupCoordinates: clickCoordinates,
          highlights: feature.toJSON(),
        };
      }
      // Otherwise open a plain popup.
      return {
        ...prevState,
        popupCoordinates: clickCoordinates,
        highlights: noHighlights,
      };
    });
  };

  const getOlmapId = (
    olmapData?: NetworkState<OlmapResponse>
  ): number | false =>
    olmapData?.state === "success" && olmapData.response.image_notes?.[0]?.id;

  const setEditingNote = (event: React.MouseEvent<HTMLElement>): void => {
    const noteId = getOlmapId(state.olmapData);
    if (noteId) {
      setState(
        (prevState): State => ({
          ...prevState,
          editingNote: noteId,
        })
      );
      event.preventDefault();
    }
  };

  const getOlmapUrl = (
    popupCoordinates: ElementWithCoordinates,
    olmapData?: NetworkState<OlmapResponse>
  ): string | null => {
    if (olmapData?.state === "loading") {
      return null;
    }
    const noteId = getOlmapId(olmapData);
    if (!noteId) {
      return olmapNewNoteURL(popupCoordinates);
    }
    return olmapNoteURL(noteId);
  };

  /**
   * Two tasks:
   * - update geolocation position into state
   * - change origin if deemed appropriate
   */
  const onGeolocate = (position: GeolocationPosition): void =>
    setState((prevState): State => {
      if (prevState.isGeolocating) {
        const isFirstPosition = prevState.geolocationPosition == null;
        const geolocationPosition: LatLng = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        const viewport =
          isFirstPosition &&
          !prevState.isOriginExplicit &&
          !(
            prevState.venue &&
            prevState.destination &&
            distance(
              geolocationPosition,
              elementToLatLng(prevState.destination)
            ) > maxRoutingDistance
          )
            ? fitMap(prevState.viewport, [
                geolocationPosition,
                prevState.destination && elementToLatLng(prevState.destination),
              ])
            : prevState.viewport;
        const updateBase = { ...prevState, geolocationPosition, viewport };
        if (
          !prevState.isOriginExplicit &&
          (prevState.origin == null ||
            distance(prevState.origin, geolocationPosition) > 20)
        ) {
          return { ...updateBase, origin: geolocationPosition };
        }
        return updateBase;
      }
      return prevState;
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectSuggestion = useCallback((suggestion: any) => {
    // react-autosuggest will focus, we need to blur afterwards
    setTimeout(() => {
      geocoder.current.blur();
    });
    const coordinates: LatLng = [
      suggestion.geometry.coordinates[1],
      suggestion.geometry.coordinates[0],
    ];
    const [type, id] = suggestion.properties.source_id.split(":");
    setState((prevState): State => {
      const pointsToFit =
        prevState.origin &&
        distance(prevState.origin, coordinates) < maxRoutingDistance
          ? [prevState.origin, coordinates]
          : [coordinates];
      const viewport = fitMap(prevState.viewport, pointsToFit);
      const destination = {
        lat: coordinates[0],
        lon: coordinates[1],
        type,
        id: Number(id),
        tags: {
          "addr:street": suggestion.properties.street,
        },
      };
      return {
        ...prevState,
        origin: prevState.origin,
        destination,
        entrances: [],
        venue: destination,
        venueDialogOpen: true, // Let the dialog open
        venueDialogCollapsed: false,
        venueOlmapData: undefined, // Clear old data
        viewport: { ...prevState.viewport, ...viewport },
        venueFeatures: emptyFeatureCollection,
        unloadingPlace: undefined,
      };
    });
  }, []);

  // Handle /search/ deeplinks as if such a geocoding result was selected
  useEffect(() => {
    (async () => {
      const query = urlMatchSearch?.params.query;
      if (!query) return;

      geocoder.current.update(query);

      const features = (await geocoder.current.autocomplete(query))?.features;
      if (!features?.length) {
        // eslint-disable-next-line no-alert
        alert("Search did not produce any results");
      } else if (features?.length === 1) {
        geocoder.current.update(features[0].properties.label);
        selectSuggestion(features[0]);
      } else {
        geocoder.current.focus();
      }
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while geocoding the query from a link:", error);
    });
  }, [urlMatchSearch, selectSuggestion]);

  // Handle /osm/node/ deeplinks as if such a geocoding result was selected
  useEffect(() => {
    (async () => {
      const id = urlMatchOsm?.params.id;
      if (!id) return;

      const elements = await queryNodesById([Number(id)]);
      if (!elements.length) {
        // eslint-disable-next-line no-alert
        alert("Linked map feature not found");
      } else {
        const element = elements[0];
        const tags = element.tags || {};
        // What if the address tags are not there?
        const address = `${tags["addr:street"] || ""} ${
          tags["addr:housenumber"] || ""
        } ${tags["ref"] || tags["addr:unit"] || ""}`;
        geocoder.current.update(
          tags.name && address.replace(/ /g, "")
            ? `${tags.name}, ${address}`
            : tags.name || address
        );
        selectSuggestion({
          geometry: {
            coordinates: [element.lon, element.lat],
          },
          properties: {
            source_id: `node:${element.id}`,
            street: tags["addr:street"],
          },
        });
      }
    })().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while resolving the OSM id from a link:", error);
    });
  }, [urlMatchOsm, selectSuggestion]);

  return (
    <div data-testid="app" className="App">
      <header className="App-header">
        <h2>Gatesolve</h2>
      </header>
      <div className="App-shadow" />
      <ReactAutosuggestGeocoder
        ref={geocoder}
        url="https://api.digitransit.fi/geocoding/v1"
        sources="oa,osm,nlsfi"
        highlightFirstSuggestion
        inputProps={{ placeholder: "Destination name or address" }}
        center={{
          latitude:
            state.geolocationPosition?.[0] ||
            state.origin?.[0] ||
            state.destination?.lat ||
            metropolitanAreaCenter[0],
          longitude:
            state.geolocationPosition?.[1] ||
            state.origin?.[1] ||
            state.destination?.lon ||
            metropolitanAreaCenter[1],
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuggestionSelected={(event: any, { suggestion }: any): any => {
          selectSuggestion(suggestion);
        }}
      />
      <MapGL
        ref={map}
        // This is according to the Get Started materials:
        // https://uber.github.io/react-map-gl/docs/get-started/get-started/
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...state.viewport}
        style={{ width: "100%", height: "90%" }}
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master-old/simple-style.json"
        dragRotate={false}
        transformRequest={transformRequest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onViewportChange={(viewport: any): void => {
          setState((prevState): State => ({ ...prevState, viewport }));
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onHover={(event: any): void => {
          // Inspect the topmost feature under click
          const feature = event.features?.[0];
          // Set cursor shape depending whether we would click an entrance
          const cursor = feature?.properties.entrance ? "pointer" : "grab";
          // FIXME: Better way to set the pointer shape or at least find the element
          const mapboxOverlaysElement = document.querySelector(
            ".overlays"
          ) as HTMLElement;
          if (mapboxOverlaysElement) {
            mapboxOverlaysElement.style.cursor = cursor;
          }
        }}
        onClick={handleMapClick}
        onContextmenu={handleMapClick}
      >
        <GeolocateControl
          dataTestId="geolocate-control"
          enableOnMount
          onEnable={(isInitiatedByUser): void => {
            setState((prevState) => ({
              ...prevState,
              isOriginExplicit:
                !isInitiatedByUser && prevState.isOriginExplicit,
              isGeolocating: true,
            }));
          }}
          onDisable={(): void => {
            setState((prevState) => ({
              ...prevState,
              isGeolocating: false,
              geolocationPosition: null,
            }));
          }}
          onGeolocate={onGeolocate}
        />
        <TunnelsControl
          dataTestId="tunnels-control"
          enabled={state.showTunnels}
          setEnabled={(enabled: boolean): void => {
            setState((prevState) => ({
              ...prevState,
              showTunnels: enabled,
            }));
          }}
        />
        {state.geolocationPosition != null && (
          <Marker
            offset={[-20, -20]}
            longitude={state.geolocationPosition[1]}
            latitude={state.geolocationPosition[0]}
          >
            <UserPosition dataTestId="user-marker" />
          </Marker>
        )}
        {Array.from(
          state.routableTiles.entries(),
          ([coords, tile]) =>
            tile && (
              <Source
                key={coords}
                id={`source-${coords}`}
                type="geojson"
                data={tile}
              >
                {allEntrancesLayers.map((layer) => (
                  <Layer
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...layer}
                    key={`${layer.id}-${coords}`}
                    id={`${layer.id}-${coords}`}
                    source={`source-${coords}`}
                  />
                ))}
              </Source>
            )
        )}
        <Source
          id="parking"
          type="geojson"
          data={state.parkingData || emptyFeatureCollection}
        >
          {parkingLayers.map((layer) => (
            <Layer
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...layer}
              key={layer.id}
              source="parking"
            />
          ))}
        </Source>
        <Source
          id="tunnels"
          type="geojson"
          data={state.tunnelData || emptyFeatureCollection}
        >
          {state.showTunnels &&
            tunnelLayers.map((layer) => (
              <Layer
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...layer}
                key={layer.id}
                source="tunnels"
              />
            ))}
        </Source>
        <Source id="highlights" type="geojson" data={state.highlights}>
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...buildingHighlightLayer}
            source="highlights"
          />
        </Source>

        <Source id="venue" type="geojson" data={state.venueFeatures}>
          {venueLayers.map((layer) => (
            <Layer
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...layer}
              key={layer.id}
              source="venue"
            />
          ))}
        </Source>

        <Source id="route" type="geojson" data={state.route}>
          {routeLineLayers.map((layer) => (
            <Layer
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...layer}
              key={layer.id}
              source="route"
              before="building-highlight"
            />
          ))}
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routeImaginaryLineLayer}
            source="route"
          />

          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routePointLayer}
            source="route"
          />
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routePointSymbolLayer}
            source="route"
          />
        </Source>
        {state.origin && (
          <Marker
            className="PinMarker"
            draggable
            offset={[0, -22.5]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onDragEnd={(lngLat: any): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  origin: [lngLat.lat, lngLat.lng],
                  isOriginExplicit: true,
                })
              );
            }}
            longitude={state.origin[1]}
            latitude={state.origin[0]}
          >
            <Pin
              dataTestId="origin"
              style={{ fill: "#00afff", stroke: "#fff" }}
            />
          </Marker>
        )}
        {state.destination && (
          <Marker
            className="PinMarker"
            draggable
            offset={[0, -22.5]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onDragEnd={(lngLat: any): void => {
              geocoder.current.clear();
              setState(
                (prevState): State => ({
                  ...prevState,
                  destination: latLngToElement([lngLat.lat, lngLat.lng]),
                })
              );
            }}
            longitude={state.destination.lon}
            latitude={state.destination.lat}
          >
            <Pin
              dataTestId="destination"
              style={{
                fill: "#64be14",
                stroke: "#fff",
              }}
            />
          </Marker>
        )}
        {state.popupCoordinates && (
          <Popup
            open={state.popupCoordinates != null}
            latitude={state.popupCoordinates?.lat || null}
            longitude={state.popupCoordinates?.lon || null}
            maxWidth="260px"
            closeButton={false}
            closeOnClick={false}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "30px 1fr 30px",
              }}
            >
              <div />
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {state.popupCoordinates.tags?.["addr:street"]}{" "}
                {state.popupCoordinates.tags?.["addr:housenumber"]}{" "}
                {state.popupCoordinates.tags?.["ref"] ||
                  state.popupCoordinates.tags?.["addr:unit"]}
              </div>
              <div
                style={{
                  textAlign: "right",
                }}
              >
                <a
                  aria-label="Comment"
                  href={
                    getOlmapUrl(state.popupCoordinates, state.olmapData) || "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex" }}
                  onClick={setEditingNote}
                >
                  <AddCommentIcon
                    style={{
                      color: "#ff5000",
                      backgroundColor: "#fff",
                    }}
                  />
                </a>
              </div>
            </div>
            <OLMapImages
              onImageClick={setEditingNote}
              olmapData={state.olmapData}
            />
            {state.popupCoordinates.tags && (
              <table
                style={{
                  marginTop: "10px",
                  marginBottom: "10px",
                  textAlign: "left",
                }}
              >
                <tbody>
                  {Object.entries(state.popupCoordinates.tags)
                    .filter(
                      ([k]) =>
                        !k.startsWith("@") &&
                        ![
                          "addr:street",
                          "addr:housenumber",
                          "addr:unit",
                          "ref",
                        ].includes(k)
                    )
                    .map(([k, v]) => (
                      <tr key={`${k}-${v}`}>
                        <td
                          style={{
                            padding: "0 5px 0 0",
                            textAlign: "right",
                          }}
                        >
                          {k}
                        </td>
                        <td>{v}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Button
                data-testid="origin-button"
                variant="contained"
                size="small"
                style={{ backgroundColor: "#00afff", color: "#fff" }}
                type="button"
                aria-label="Set origin"
                onClick={(): void =>
                  setState((prevState): State => {
                    // Check this to appease the compiler.
                    if (prevState.popupCoordinates != null) {
                      return {
                        ...prevState,
                        origin: elementToLatLng(prevState.popupCoordinates),
                        isOriginExplicit: true,
                        popupCoordinates: null,
                      };
                    }
                    return {
                      ...prevState,
                      isOriginExplicit: true,
                      popupCoordinates: null,
                    };
                  })
                }
              >
                Origin
              </Button>
              <span style={{ padding: "5px" }} />
              <Button
                data-testid="destination-button"
                variant="contained"
                size="small"
                style={{ backgroundColor: "#64be14", color: "#fff" }}
                type="button"
                aria-label="Set destination"
                onClick={(): void =>
                  setState((prevState): State => {
                    // Check this to appease the compiler.
                    if (prevState.popupCoordinates != null) {
                      return {
                        ...prevState,
                        destination: prevState.popupCoordinates,
                        popupCoordinates: null,
                      };
                    }
                    return {
                      ...prevState,
                      popupCoordinates: null,
                    };
                  })
                }
              >
                Destination
              </Button>
              <span style={{ padding: "5px" }} />
              <Button
                data-testid="google-maps-button"
                variant="contained"
                size="small"
                style={{ backgroundColor: "#db4437", color: "#fff" }}
                type="button"
                aria-label="Open Google Maps"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${state?.popupCoordinates.lat},${state?.popupCoordinates.lon}&travelmode=driving`}
                onClick={(): void =>
                  setState((prevState): State => {
                    return {
                      ...prevState,
                      popupCoordinates: null,
                    };
                  })
                }
              >
                Google
              </Button>
            </div>
          </Popup>
        )}
      </MapGL>
      <OLMapDialog
        noteId={state.editingNote}
        onClose={() =>
          setState((prevState) => ({
            ...prevState,
            editingNote: undefined,
          }))
        }
      />
      <VenueDialog
        open={state.venueDialogOpen}
        collapsed={state.venueDialogCollapsed}
        venueOlmapData={state.venueOlmapData}
        restrictions={state.route}
        locale={state.locale}
        onViewDetails={(olmapNote) => {
          setState((prevState): State => {
            return {
              ...prevState,
              editingNote: olmapNote.id,
            };
          });
        }}
        onEntranceSelected={(entranceId): void => {
          setState((prevState): State => {
            const entranceFeatures = prevState.venueFeatures.features.filter(
              (feature) =>
                feature.geometry.type === "Point" &&
                feature.properties?.entrance
            );

            const entrance = prevState.venueFeatures.features.find(
              (feature) =>
                feature.properties?.["@id"] ===
                `http://www.openstreetmap.org/node/${entranceId}`
            );
            return {
              ...prevState,
              unloadingPlace: undefined,
              destination:
                (entrance &&
                  entrance.geometry.type === "Point" &&
                  geoJsonToElement(entrance as Feature<Point>)) ||
                undefined,
              entrances: entranceFeatures.map((feature) =>
                geoJsonToElement(feature as Feature<Point>)
              ),
            };
          });
        }}
        onUnloadingPlaceSelected={(unloadingPlace): void => {
          setState((prevState): State => {
            const entranceFeatures = prevState.venueFeatures.features.filter(
              (feature) =>
                feature.geometry.type === "Point" &&
                feature.properties?.entrance
            );
            return {
              ...prevState,
              unloadingPlace,
              destination: prevState.venue,
              entrances: entranceFeatures.map((feature) =>
                geoJsonToElement(feature as Feature<Point>)
              ),
            };
          });
        }}
        onClose={(): void => {
          geocoder.current.clear();
          setState((prevState) => ({
            ...prevState,
            // Reset venue
            venueDialogOpen: false,
            venueDialogCollapsed: false,
            venueOlmapData: undefined,
            venueFeatures: emptyFeatureCollection,
            venue: undefined,
            // Reset routing
            origin: prevState.geolocationPosition || undefined,
            originIsExplicit: false,
            destination: undefined,
            entrances: [],
            unloadingPlace: undefined,
            route: geometryToGeoJSON(),
          }));
        }}
        onCollapsingToggled={(): void =>
          setState((prevState) => ({
            ...prevState,
            venueDialogCollapsed: !state.venueDialogCollapsed,
          }))
        }
        onRestrictionSelected={(feature) => {
          setState((prevState) => ({
            ...prevState,
            popupCoordinates: geoJsonToElement(feature),
          }));
        }}
        onLocaleSelected={async (locale) => {
          const venueOlmapData = state.venue?.id
            ? await fetchOlmapData(state.venue.id, locale)
            : undefined;
          setState((prevState) => ({
            ...prevState,
            locale,
            venueOlmapData,
          }));
        }}
      />
    </div>
  );
};

export default App;
