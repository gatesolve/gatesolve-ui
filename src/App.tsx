import React, { useState, useEffect, useRef } from "react";
import { useRouteMatch, useHistory } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { match } from "react-router-dom";
import MapGL, { Popup, Source, Layer, Marker } from "@urbica/react-map-gl";
import { WebMercatorViewport } from "viewport-mercator-project";
import type { WebMercatorViewportOptions } from "viewport-mercator-project";
import { distance as turfDistance } from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";
import { ReactAutosuggestGeocoder } from "react-autosuggest-geocoder";

import {
  routePointLayer,
  routePointSymbolLayer,
  routeLineLayer,
  routeImaginaryLineLayer,
  allEntrancesLayer,
  allEntrancesSymbolLayer,
} from "./map-style";
import Pin, { pinAsSVG } from "./components/Pin";
import UserPosition from "./components/UserPosition";
import GeolocateControl from "./components/GeolocateControl";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import { queryEntrances, ElementWithCoordinates } from "./overpass";
import { addImageSVG, getMapSize } from "./mapbox-utils";
import "./App.css";
import "./components/PinMarker.css";

type LatLng = [number, number];

interface State {
  viewport: WebMercatorViewportOptions;
  isOriginExplicit: boolean;
  origin?: LatLng;
  destination?: ElementWithCoordinates;
  entrances?: Array<ElementWithCoordinates>;
  route: FeatureCollection;
  isGeolocating: boolean;
  geolocationPosition: LatLng | null;
  popupCoordinates: LatLng | null;
}

const latLngToDestination = (latLng: LatLng): ElementWithCoordinates => ({
  id: -1,
  type: "node",
  lat: latLng[0],
  lon: latLng[1],
});

const initialState: State = {
  entrances: [],
  route: geometryToGeoJSON(),
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
      maxZoom: 19,
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    // XXX above: @types/viewport-mercator-project is missing maxZoom
  );
};

const App: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null);

  // Install a callback to dynamically create pin icons that our map styles use
  useEffect(() => {
    if (!map.current) {
      return; // No map yet, so nothing to do
    }
    const mapboxgl = map.current.getMap();
    // FIXME: Unclear why this passed type checking before.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapboxgl?.on("styleimagemissing", ({ id: iconId }: any) => {
      if (!iconId?.startsWith("icon-pin-")) {
        return; // We only know how to generate pin icons
      }
      const [, , size, fill, stroke] = iconId.split("-"); // e.g. icon-pin-48-green-#fff
      const svgData = pinAsSVG(size, `fill: ${fill}; stroke: ${stroke}`);
      addImageSVG(mapboxgl, iconId, svgData, size);
    });
  }, [map]);

  const urlMatch = useRouteMatch({
    path: "/route/:from?/:to?",
  }) as match<{ from: string; to: string }>;

  const [state, setState] = useState(initialState);

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
    queryEntrances(state.destination).then((result) => {
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
    });
  }, [state.destination]);

  // Set off routing calculation when inputs change; collect results in state.route
  useEffect(() => {
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
          // If an entrance was clicked, set it as the destination
          return {
            ...prevState,
            destination: {
              id: feature.properties["@id"],
              type: feature.properties["@type"],
              lat: feature.geometry.coordinates[1],
              lon: feature.geometry.coordinates[0],
            },
          };
        }
        // As a fallback, open a popup.
        return {
          ...prevState,
          popupCoordinates: [event.lngLat.lat, event.lngLat.lng],
        };
      }
    );
  };

  /**
   * Two tasks:
   * - update geolocation position into state
   * - change origin if deemed appropriate
   */
  const onGeolocate = (position: Position): void =>
    setState(
      (prevState): State => {
        if (prevState.isGeolocating) {
          const geolocationPosition: LatLng = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          const updateBase = { ...prevState, geolocationPosition };
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
      <ReactAutosuggestGeocoder
        url="https://api.digitransit.fi/geocoding/v1/"
        sources="oa,osm,nlsfi"
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
          const destination: LatLng = [
            suggestion.geometry.coordinates[1],
            suggestion.geometry.coordinates[0],
          ];
          const [type, id] = suggestion.properties.source_id.split(":");
          setState(
            (prevState): State => {
              const viewport = fitBounds(
                { ...prevState.viewport, ...getMapSize(map.current?.getMap()) },
                [prevState.origin, destination]
              );
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
          onEnable={(): void => {
            setState((prevState) => ({
              ...prevState,
              isOriginExplicit: false,
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
        <Source
          id="osm-qa-tiles"
          type="vector"
          tiles={["https://tile.olmap.org/osm-qa-tiles/{z}/{x}/{y}.pbf"]}
          minzoom={12}
          maxzoom={12}
        >
          <Layer
            source-layer="osm"
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...allEntrancesLayer}
            source="osm-qa-tiles"
          />
          <Layer
            source-layer="osm"
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...allEntrancesSymbolLayer}
            source="osm-qa-tiles"
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
              style={{ fill: "#64be14", stroke: "#fff" }}
            />
          </Marker>
        )}
        {state.popupCoordinates != null && (
          <Popup
            latitude={state.popupCoordinates[0]}
            longitude={state.popupCoordinates[1]}
            closeButton={false}
            closeOnClick
            onClose={(): void =>
              setState(
                (prevState): State => ({ ...prevState, popupCoordinates: null })
              )
            }
          >
            <button
              data-testid="origin-button"
              type="button"
              aria-label="Set origin"
              onClick={(): void =>
                setState(
                  (prevState): State => {
                    // Check this to appease the compiler.
                    if (prevState.popupCoordinates != null) {
                      return {
                        ...prevState,
                        origin: prevState.popupCoordinates,
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
            </button>
            <button
              data-testid="destination-button"
              type="button"
              aria-label="Set destination"
              onClick={(): void =>
                setState(
                  (prevState): State => {
                    // Check this to appease the compiler.
                    if (prevState.popupCoordinates != null) {
                      return {
                        ...prevState,
                        destination: latLngToDestination(
                          prevState.popupCoordinates
                        ),
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
            </button>
          </Popup>
        )}
      </MapGL>
    </div>
  );
};

export default App;
