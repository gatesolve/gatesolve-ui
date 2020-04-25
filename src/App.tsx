import React, { useState, useEffect, useRef } from "react";
import { useRouteMatch, useHistory } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { match } from "react-router-dom";
import MapGL, { Source, Layer, Marker } from "@urbica/react-map-gl";
import { WebMercatorViewport } from "viewport-mercator-project";
import type { WebMercatorViewportOptions } from "viewport-mercator-project";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";
import { ReactAutosuggestGeocoder } from "react-autosuggest-geocoder";

import {
  routePointLayer,
  routePointSymbolLayer,
  routeLineLayer,
  allEntrancesLayer,
  allEntrancesSymbolLayer,
} from "./map-style";
import Pin, { pinAsSVG } from "./components/Pin";
import UserPosition from "./components/UserPosition";
import GeolocateControl from "./components/GeolocateControl";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import { queryEntrances, ElementWithCoordinates } from "./overpass";
import { addImageSVG } from "./mapbox-utils";
import "./App.css";
import "./components/PinMarker.css";

interface State {
  viewport: WebMercatorViewportOptions;
  origin: [number, number];
  destination: ElementWithCoordinates;
  entrances: Array<ElementWithCoordinates>;
  route: FeatureCollection;
  isGeolocating: boolean;
  geolocationTimestamp: number | null;
  geolocationPosition: [number, number] | null;
}

const latLngToDestination = (
  latLng: [number, number]
): ElementWithCoordinates => ({
  id: -1,
  type: "node",
  lat: latLng[0],
  lon: latLng[1],
});

const initialOrigin: [number, number] = [60.16295, 24.93071];
const initialDestination: ElementWithCoordinates = latLngToDestination([
  60.16259,
  24.93155,
]);
const initialState: State = {
  origin: initialOrigin,
  destination: initialDestination,
  entrances: [],
  route: geometryToGeoJSON(),
  viewport: {
    latitude: 60.163,
    longitude: 24.931,
    zoom: 16,
    bearing: 0,
    pitch: 0,
  },
  isGeolocating: false,
  geolocationTimestamp: null,
  geolocationPosition: null,
};

const metropolitanAreaCenter = [60.17066815612902, 24.941510260105133];

const transformRequest = (originalURL: string): { url: string } => {
  const url = originalURL.replace(
    "https://static.hsldev.com/mapfonts/Klokantech Noto Sans",
    "https://fonts.openmaptiles.org/Klokantech Noto Sans"
  );
  return { url };
};

const parseLatLng = (text: string): [number, number] =>
  text.split(",").map(Number) as [number, number];

const fitBounds = (
  viewportOptions: WebMercatorViewportOptions,
  latLngs: Array<[number, number]>
): WebMercatorViewport => {
  const viewport = new WebMercatorViewport(viewportOptions);
  const minLng = Math.min(...latLngs.map((x) => x[1]));
  const maxLng = Math.max(...latLngs.map((x) => x[1]));
  const minLat = Math.min(...latLngs.map((x) => x[0]));
  const maxLat = Math.max(...latLngs.map((x) => x[0]));
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
    }
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
    path: "/route/:from/:to",
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
    const width = map.current.getMap()?.getContainer()?.clientWidth;
    const height = map.current.getMap()?.getContainer()?.clientHeight;
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
          destination: latLngToDestination(destination),
          viewport: { ...prevState.viewport, ...viewport },
        })
      );
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useHistory();

  useEffect(() => {
    const destination = [state.destination.lat, state.destination.lon];
    const path = `/route/${state.origin}/${destination}/`;
    if (history.location.pathname !== path) {
      history.replace(path);
    }
  }, [history, state.origin, state.destination]);

  useEffect(() => {
    queryEntrances(state.destination).then((result) => {
      setState(
        (prevState): State => {
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
    let targets = [] as Array<ElementWithCoordinates>;

    // Try to find the destination among the entrances
    state.entrances.forEach((entrance) => {
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
          const destination = [
            suggestion.geometry.coordinates[1],
            suggestion.geometry.coordinates[0],
          ] as [number, number];
          const [type, id] = suggestion.properties.source_id.split(":");
          setState(
            (prevState): State => {
              const viewport = fitBounds(prevState.viewport, [
                prevState.origin,
                destination,
              ]);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={(event: any): void => {
          // Inspect the topmost feature under click
          const feature = map.current
            ?.getMap()
            .queryRenderedFeatures(event.point)[0];
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
              // As a fallback, set the clicked coordinates as the destination
              return {
                ...prevState,
                destination: latLngToDestination([
                  event.lngLat.lat,
                  event.lngLat.lng,
                ]),
              };
            }
          );
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onContextmenu={(event: any): void => {
          setState(
            (prevState): State => ({
              ...prevState,
              origin: [event.lngLat.lat, event.lngLat.lng],
            })
          );
        }}
      >
        <GeolocateControl
          dataTestId="geolocate-control"
          enableOnMount
          onEnable={(): void => {
            setState((prevState) => ({ ...prevState, isGeolocating: true }));
          }}
          onDisable={(): void => {
            setState((prevState) => ({
              ...prevState,
              isGeolocating: false,
              geolocationPosition: null,
            }));
          }}
          onGeolocate={(geolocationPosition: Position): void => {
            setState(
              (prevState): State => {
                if (prevState.isGeolocating) {
                  const update = {
                    ...prevState,
                    geolocationPosition: [
                      geolocationPosition.coords.latitude,
                      geolocationPosition.coords.longitude,
                    ] as [number, number],
                  };
                  // Update the origin if time difference is large enough
                  if (
                    prevState.geolocationTimestamp == null ||
                    geolocationPosition.timestamp -
                      prevState.geolocationTimestamp >
                      10000
                  ) {
                    return {
                      ...update,
                      origin: [
                        geolocationPosition.coords.latitude,
                        geolocationPosition.coords.longitude,
                      ],
                      geolocationTimestamp: geolocationPosition.timestamp,
                    };
                  }
                  return update;
                }
                return prevState;
              }
            );
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
            {...routePointLayer}
            source="route"
          />
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routePointSymbolLayer}
            source="route"
          />
        </Source>
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
      </MapGL>
    </div>
  );
};

export default App;
