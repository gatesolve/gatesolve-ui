import React, { useState, useEffect } from "react";
import MapGL, { Source, Layer, ViewportProps, MapRequest } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

import {
  routePointLayer,
  routePointSymbolLayer,
  routeLineLayer,
} from "./map-style";
import PinMarker from "./components/PinMarker";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import "./App.css";

interface State {
  viewport: Partial<ViewportProps>;
  origin: [number, number];
  destination: [number, number];
  route: FeatureCollection;
}

const initialOrigin: [number, number] = [60.16295, 24.93071];
const initialDestination: [number, number] = [60.16259, 24.93155];
const initialState: State = {
  origin: initialOrigin,
  destination: initialDestination,
  route: geometryToGeoJSON(initialOrigin, initialDestination),
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

const App: React.FC = () => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(
      (prevState): State => ({
        ...prevState,
        route: geometryToGeoJSON(state.origin, state.destination),
      })
    );
    calculatePlan(state.origin, state.destination, (geojson) => {
      setState(
        (prevState): State => {
          // don't use the result if the parameters changed meanwhile
          if (
            state.origin !== prevState.origin ||
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
  }, [state.origin, state.destination]);

  return (
    <div data-testid="app" className="App">
      <header className="App-header">
        <h2>Gatesolve</h2>
      </header>
      <MapGL
        // This is according to the Get Started materials:
        // https://uber.github.io/react-map-gl/docs/get-started/get-started/
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...state.viewport}
        width="100%"
        height="90%"
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
        transformRequest={transformRequest}
        onViewportChange={(viewport): void =>
          setState((prevState): State => ({ ...prevState, viewport }))
        }
        onClick={(event): void => {
          // Filter out events not caused by left mouse button
          if (event.srcEvent.button !== 0) return;
          setState(
            (prevState): State => ({
              ...prevState,
              destination: [event.lngLat[1], event.lngLat[0]],
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
          pin={{ style: { fill: "#00afff", stroke: "#fff" } }}
        />
        <PinMarker
          marker={{
            draggable: true,
            onDragEnd: (event): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  destination: [event.lngLat[1], event.lngLat[0]],
                })
              );
            },
            longitude: state.destination[1],
            latitude: state.destination[0],
          }}
          pin={{ style: { fill: "#64be14", stroke: "#fff" } }}
        />
      </MapGL>
    </div>
  );
};

export default App;
