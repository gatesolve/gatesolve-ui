import React, { useState, useEffect, useRef, ReactText } from "react";
import { useRouteMatch, useHistory } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { match } from "react-router-dom";
import { Button, IconButton } from "@material-ui/core";
import { Close as CloseIcon } from "@material-ui/icons";
import { useSnackbar } from "notistack";
import MapGL, { Popup, Source, Layer, Marker } from "@urbica/react-map-gl";
import { WebMercatorViewport } from "viewport-mercator-project";
import type { WebMercatorViewportOptions } from "viewport-mercator-project";
import { distance as turfDistance } from "@turf/turf";
import { MapboxGeoJSONFeature } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";
import { ReactAutosuggestGeocoder } from "react-autosuggest-geocoder";

import {
  routePointLayer,
  routePointSymbolLayer,
  routeLineLayer,
  routeImaginaryLineLayer,
  buildingHighlightLayer,
  allEntrancesLayers,
} from "./map-style";
import Pin, { pinAsSVG } from "./components/Pin";
import { triangleAsSVG, triangleDotAsSVG } from "./components/Triangle";
import UserPosition from "./components/UserPosition";
import GeolocateControl from "./components/GeolocateControl";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import { queryEntrances, ElementWithCoordinates } from "./overpass";
import { addImageSVG, getMapSize } from "./mapbox-utils";
import routableTilesToGeoJSON from "./RoutableTilesToGeoJSON";
import { getVisibleTiles } from "./minimal-xyz-viewer";

import "./App.css";
import "./components/PinMarker.css";

const maxRoutingDistance = 200; // in meters

type LatLng = [number, number];

interface State {
  viewport: WebMercatorViewportOptions;
  isOriginExplicit: boolean;
  origin?: LatLng;
  destination?: ElementWithCoordinates;
  entrances?: Array<ElementWithCoordinates>;
  route: FeatureCollection;
  highlights?: MapboxGeoJSONFeature | FeatureCollection;
  isGeolocating: boolean;
  geolocationPosition: LatLng | null;
  popupCoordinates: ElementWithCoordinates | null;
  snackbar?: ReactText;
  routableTiles: Map<string, FeatureCollection | null>;
}

const latLngToDestination = (latLng: LatLng): ElementWithCoordinates => ({
  id: -1,
  type: "node",
  lat: latLng[0],
  lon: latLng[1],
});

const destinationToLatLng = (destination: ElementWithCoordinates): LatLng => [
  destination.lat,
  destination.lon,
];

const initialState: State = {
  entrances: [],
  route: geometryToGeoJSON(),
  highlights: {
    type: "FeatureCollection",
    features: [],
  },
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
  turfDistance([from[1], from[0]], [to[1], to[0]], { units: "metres" });

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
  viewportOptions: WebMercatorViewportOptions,
  latLngs: Array<LatLng | undefined>
): WebMercatorViewportOptions => {
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
  const circleRadius = 5;
  return viewport.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: {
        top: padding + occludedTop + markerSize,
        bottom: padding + circleRadius,
        left: padding + markerSize / 2,
        right: padding + markerSize / 2,
      },
      maxZoom: 17,
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    // XXX above: @types/viewport-mercator-project is missing maxZoom
  );
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

  const [state, setState] = useState(initialState);

  const fitMap = (
    viewportOptions: WebMercatorViewportOptions,
    latLngs: Array<LatLng | undefined>
  ): WebMercatorViewportOptions => {
    return fitBounds(
      { ...viewportOptions, ...getMapSize(map.current?.getMap()) },
      latLngs
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

    setState(
      (prevState: State): State => {
        return {
          ...prevState,
          routableTiles,
        };
      }
    );

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
      setState(
        (prevState: State): State => {
          if (prevState.routableTiles.get(key) !== null) {
            return prevState; // This tile is not needed anymore
          }
          const newRoutableTiles = new Map(prevState.routableTiles);
          newRoutableTiles.set(key, geoJSON);
          return {
            ...prevState,
            routableTiles: newRoutableTiles,
          };
        }
      );
    });
  }, [map.current, state.viewport]); // eslint-disable-line react-hooks/exhaustive-deps
  // XXX: state.routableTiles is missing above as we only use it as a cache here

  useEffect(() => {
    /**
     * FIXME: urbica/react-map-gl does not expose fitBounds and its viewport
     * does not include width and height which are required by fitBounds from
     * viewport-mercator-project. This is dirty but seems to work.
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
      const extendedViewport = { ...state.viewport, width, height };
      const viewport = fitBounds(extendedViewport, [origin, destination]);
      setState(
        (prevState): State => ({
          ...prevState,
          origin,
          isOriginExplicit: origin != null,
          destination: destination && latLngToDestination(destination),
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
      history.replace(path);
    }
  }, [history, state.origin, state.destination]);

  useEffect(() => {
    if (!state.destination) return; // Nothing to do yet
    queryEntrances(state.destination)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Error while fetching building entrances:", error);
        return []; // Proceed as if there was no entrance data
      })
      .then((result) => {
        setState(
          (prevState): State => {
            if (!state.destination) return prevState; // XXX Typescript needs this
            if (prevState.destination !== state.destination) {
              return prevState;
            }
            const entrances = result.length ? result : [state.destination];

            return {
              ...prevState,
              entrances,
            };
          }
        );
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Error while handling entrances:", error);
      });
  }, [state.destination]);

  // Set off routing calculation when inputs change; collect results in state.route
  useEffect(() => {
    if (state.snackbar) closeSnackbar(state.snackbar);

    if (!state.origin || !state.destination || !state.entrances) {
      return; // Nothing to do yet
    }
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

    // Don't calculate routes between points more than 200 meters apart
    if (
      distance(state.origin, destinationToLatLng(state.destination)) >
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
                          destinationToLatLng(prevState.destination),
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
      return;
    }

    calculatePlan(state.origin, targets, (geojson) => {
      setState(
        (prevState): State => {
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
        }
      );
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error while starting route planning:", error);
    });
  }, [state.origin, state.entrances]); // eslint-disable-line react-hooks/exhaustive-deps
  // XXX: state.destination is missing above as we need to wait for state.entrances to change as well

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (event: any): void => {
    // Inspect the topmost feature under click
    const feature = map.current?.getMap().queryRenderedFeatures(event.point)[0];
    setState(
      (prevState): State => {
        if (feature?.properties.entrance) {
          // If an entrance was clicked
          const element = {
            id: feature.properties["@id"],
            type: feature.properties["@type"],
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            tags: feature.properties,
          };
          if (
            prevState.origin &&
            distance(prevState.origin, [
              feature.geometry.coordinates[1],
              feature.geometry.coordinates[0],
            ]) < maxRoutingDistance
          ) {
            // If the entrance is close enough for routing, set it as destination
            return {
              ...prevState,
              destination: element,
              popupCoordinates: element,
              highlights: {
                type: "FeatureCollection",
                features: [],
              },
            };
          }
          // Otherwise, just open the popup
          return {
            ...prevState,
            popupCoordinates: element,
          };
        }
        if (feature?.sourceLayer === "building") {
          // If a building was clicked, highlight it and set as destination
          return {
            ...prevState,
            highlights: feature.toJSON(),
            destination: latLngToDestination([
              event.lngLat.lat,
              event.lngLat.lng,
            ]),
          };
        }
        // As a fallback, toggle popup.
        if (prevState.popupCoordinates) {
          return {
            ...prevState,
            popupCoordinates: null,
          };
        }
        return {
          ...prevState,
          popupCoordinates: latLngToDestination([
            event.lngLat.lat,
            event.lngLat.lng,
          ]),
          highlights: {
            type: "FeatureCollection",
            features: [],
          },
        };
      }
    );
  };

  /**
   * Two tasks:
   * - update geolocation position into state
   * - change origin if deemed appropriate
   */
  const onGeolocate = (position: GeolocationPosition): void =>
    setState(
      (prevState): State => {
        if (prevState.isGeolocating) {
          const isFirstPosition = prevState.geolocationPosition == null;
          const geolocationPosition: LatLng = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          const viewport =
            isFirstPosition && !prevState.isOriginExplicit
              ? fitMap(prevState.viewport, [
                  geolocationPosition,
                  prevState.destination &&
                    destinationToLatLng(prevState.destination),
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
      }
    );

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
          // react-autosuggest will focus, we need to blur afterwards
          setTimeout(() => {
            geocoder.current.blur();
          });
          const destination: LatLng = [
            suggestion.geometry.coordinates[1],
            suggestion.geometry.coordinates[0],
          ];
          const [type, id] = suggestion.properties.source_id.split(":");
          setState(
            (prevState): State => {
              const pointsToFit =
                prevState.origin &&
                distance(prevState.origin, destination) < maxRoutingDistance
                  ? [prevState.origin, destination]
                  : [destination];
              const viewport = fitMap(prevState.viewport, pointsToFit);
              return {
                ...prevState,
                origin: prevState.origin,
                destination: {
                  lat: destination[0],
                  lon: destination[1],
                  type,
                  id: Number(id),
                },
                entrances: [],
                viewport: { ...prevState.viewport, ...viewport },
              };
            }
          );
        }}
      />
      <MapGL
        ref={map}
        // This is according to the Get Started materials:
        // https://uber.github.io/react-map-gl/docs/get-started/get-started/
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...state.viewport}
        style={{ width: "100%", height: "90%" }}
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
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
        <Source id="highlights" type="geojson" data={state.highlights}>
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...buildingHighlightLayer}
            source="highlights"
          />
        </Source>

        <Source id="route" type="geojson" data={state.route}>
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routeLineLayer}
            source="route"
          />
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
                  destination: latLngToDestination([lngLat.lat, lngLat.lng]),
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
        <Popup
          open={state.popupCoordinates != null}
          latitude={state.popupCoordinates?.lat || null}
          longitude={state.popupCoordinates?.lon || null}
          closeButton={false}
          closeOnClick={false}
        >
          {state.popupCoordinates && (
            <>
              <div>
                <h3>
                  {state.popupCoordinates.tags?.["addr:street"]}{" "}
                  {state.popupCoordinates.tags?.["addr:housenumber"]}{" "}
                  {state.popupCoordinates.tags?.["ref"] ||
                    state.popupCoordinates.tags?.["addr:unit"]}
                </h3>
                <p>
                  {state.popupCoordinates.tags && (
                    <table
                      style={{
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
                </p>
              </div>
              <Button
                data-testid="origin-button"
                variant="contained"
                size="small"
                style={{ backgroundColor: "#00afff", color: "#fff" }}
                type="button"
                aria-label="Set origin"
                onClick={(): void =>
                  setState(
                    (prevState): State => {
                      // Check this to appease the compiler.
                      if (prevState.popupCoordinates != null) {
                        return {
                          ...prevState,
                          origin: destinationToLatLng(
                            prevState.popupCoordinates
                          ),
                          isOriginExplicit: true,
                          popupCoordinates: null,
                        };
                      }
                      return {
                        ...prevState,
                        isOriginExplicit: true,
                        popupCoordinates: null,
                      };
                    }
                  )
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
                  setState(
                    (prevState): State => {
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
                    }
                  )
                }
              >
                Destination
              </Button>
            </>
          )}
        </Popup>
      </MapGL>
    </div>
  );
};

export default App;
