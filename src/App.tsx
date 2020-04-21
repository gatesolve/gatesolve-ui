import React, { useState, useEffect, useRef } from "react";
import { useRouteMatch, useHistory } from "react-router-dom";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { match } from "react-router-dom";
import MapGL, {
  Source,
  Layer,
  WebMercatorViewport,
  GeolocateControl,
  ViewportProps,
  MapRequest,
} from "react-map-gl";
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
import PinMarker from "./components/PinMarker";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import { queryEntrances, ElementWithCoordinates } from "./overpass";
import "./App.css";

interface State {
  viewport: Partial<ViewportProps>;
  origin: [number, number];
  destination: ElementWithCoordinates;
  entrances: Array<ElementWithCoordinates>;
  route: FeatureCollection;
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
};

const transformRequest = (originalURL?: string): MapRequest => {
  if (!originalURL) {
    throw Error("This cannot happen as URL isn't actually optional.");
  }
  const url = originalURL.replace(
    "https://static.hsldev.com/mapfonts/Klokantech Noto Sans",
    "https://fonts.openmaptiles.org/Klokantech Noto Sans"
  );
  return { url };
};

const parseLatLng = (text: string): [number, number] =>
  text.split(",").map(Number) as [number, number];

const fitBounds = (
  viewportProps: Partial<ViewportProps>,
  latLngs: Array<[number, number]>
): Partial<ViewportProps> => {
  const viewport = new WebMercatorViewport(viewportProps);
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
  const map = useRef<MapGL>(null);
  const mapViewport = useRef<Partial<ViewportProps>>({});
  const geolocationTimestamp = useRef<number | null>(null);

  const urlMatch = useRouteMatch({
    path: "/route/:from/:to",
  }) as match<{ from: string; to: string }>;

  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (urlMatch) {
      const origin = parseLatLng(urlMatch.params.from);
      const destination = parseLatLng(urlMatch.params.to);
      const viewport = fitBounds(mapViewport.current, [origin, destination]);
      setState(
        (prevState): State => ({
          ...prevState,
          origin,
          destination: latLngToDestination(destination),
          viewport: { ...mapViewport.current, ...viewport },
        })
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const history = useHistory();

  useEffect(() => {
    const destination = [state.destination.lat, state.destination.lon];
    if (
      history.location.pathname !== `/route/${state.origin}/${destination}/`
    ) {
      history.replace(`/route/${state.origin}/${destination}/`);
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

    setState(
      (prevState): State => ({
        ...prevState,
        route: geometryToGeoJSON(undefined, undefined, state.entrances),
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
          geojson.features.push(...prevState.route.features);
          return {
            ...prevState,
            route: geojson,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuggestionSelected={(event: any, { suggestion }: any): any => {
          const { origin } = state;
          const destination = [
            suggestion.geometry.coordinates[1],
            suggestion.geometry.coordinates[0],
          ] as [number, number];
          const viewport = fitBounds(mapViewport.current, [
            origin,
            destination,
          ]);
          const [type, id] = suggestion.properties.source_id.split(":");
          setState(
            (prevState): State => ({
              ...prevState,
              origin,
              destination: {
                lat: destination[0],
                lon: destination[1],
                type,
                id: Number(id),
              },
              entrances: [],
              viewport: { ...mapViewport.current, ...viewport },
            })
          );
        }}
      />
      <MapGL
        ref={map}
        // This is according to the Get Started materials:
        // https://uber.github.io/react-map-gl/docs/get-started/get-started/
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...state.viewport}
        width="100%"
        height="90%"
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
        transformRequest={transformRequest}
        onViewportChange={(viewport): void => {
          mapViewport.current = viewport;
          setState((prevState): State => ({ ...prevState, viewport }));
        }}
        onClick={(event): void => {
          if (
            // Filter out events not caused by left mouse button
            event.srcEvent.button !== 0 ||
            // FIXME GeolocateControl lets clicks through
            event.target.className === "mapboxgl-ctrl-icon" ||
            // FIXME Attribution lets clicks through
            event.target.className ===
              "mapboxgl-ctrl mapboxgl-ctrl-attrib mapboxgl-compact"
          ) {
            return;
          }
          setState(
            (prevState): State => ({
              ...prevState,
              destination: latLngToDestination([
                event.lngLat[1],
                event.lngLat[0],
              ]),
            })
          );
        }}
        onContextMenu={(event): void => {
          setState(
            (prevState): State => ({
              ...prevState,
              origin: [event.lngLat[1], event.lngLat[0]],
            })
          );
          event.srcEvent.preventDefault();
        }}
      >
        <GeolocateControl
          className="mapboxgl-ctrl-bottom-left"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          // FIXME: The type is wrong in @types/react-map-gl
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onGeolocate={(geolocationPosition: any): void => {
            if (
              geolocationTimestamp.current === null ||
              geolocationPosition.timestamp - geolocationTimestamp.current >
                10000
            ) {
              geolocationTimestamp.current = geolocationPosition.timestamp;
              setState(
                (prevState): State => ({
                  ...prevState,
                  origin: [
                    geolocationPosition.coords.latitude,
                    geolocationPosition.coords.longitude,
                  ],
                })
              );
            }
          }}
        />
        <Source
          id="osm-qa-tiles"
          type="vector"
          tiles={["https://tile.olmap.org/osm-qa-tiles/{z}/{x}/{y}.pbf"]}
          minzoom={12}
          maxzoom={12}
        >
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...allEntrancesLayer}
          />
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...allEntrancesSymbolLayer}
          />
        </Source>
        <Source type="geojson" data={state.route}>
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routeLineLayer}
          />
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routePointLayer}
          />
          <Layer
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...routePointSymbolLayer}
          />
        </Source>
        <PinMarker
          marker={{
            draggable: true,
            onDragEnd: (event): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  origin: [event.lngLat[1], event.lngLat[0]],
                })
              );
            },
            longitude: state.origin[1],
            latitude: state.origin[0],
          }}
          pin={{
            dataTestId: "origin",
            style: { fill: "#00afff", stroke: "#fff" },
          }}
        />
        <PinMarker
          marker={{
            draggable: true,
            onDragEnd: (event): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  destination: latLngToDestination([
                    event.lngLat[1],
                    event.lngLat[0],
                  ]),
                })
              );
            },
            longitude: state.destination.lon,
            latitude: state.destination.lat,
          }}
          pin={{
            dataTestId: "destination",
            style: { fill: "#64be14", stroke: "#fff" },
          }}
        />
      </MapGL>
    </div>
  );
};

export default App;
