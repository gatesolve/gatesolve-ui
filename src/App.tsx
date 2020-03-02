import React, { useState, useEffect } from "react";
import MapGL, { Source, Layer, ViewportProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

import { routePointLayer, routeLineLayer } from "./map-style";
import PinMarker from "./components/PinMarker";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import "./App.css";

interface State {
  viewport: Partial<ViewportProps>;
  origin: [number, number];
  destination: [number, number];
  route: FeatureCollection;
}

const initialOrigin: [number, number] = [60.17, 24.94];
const initialDestination: [number, number] = [60.18, 24.95];
const initialState: State = {
  origin: initialOrigin,
  destination: initialDestination,
  route: geometryToGeoJSON(initialOrigin, initialDestination, []),
  viewport: {
    latitude: 60.17,
    longitude: 24.94,
    zoom: 14,
    bearing: 0,
    pitch: 0
  }
};

const App: React.FC = () => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(
      (prevState): State => ({
        ...prevState,
        route: geometryToGeoJSON(state.origin, state.destination, [])
      })
    );
    calculatePlan(state.origin, state.destination, geojson => {
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
            route: geojson
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
        width="100vw"
        height="90vh"
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
        onViewportChange={(viewport): void =>
          setState((prevState): State => ({ ...prevState, viewport }))
        }
        onClick={(event): void => {
          // Filter out events not caused by left mouse button
          if (event.srcEvent.button !== 0) return;
          setState(
            (prevState): State => ({
              ...prevState,
              destination: [event.lngLat[1], event.lngLat[0]]
            })
          );
        }}
        onContextMenu={(event): void => {
          setState(
            (prevState): State => ({
              ...prevState,
              origin: [event.lngLat[1], event.lngLat[0]]
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
        </Source>
        <PinMarker
          marker={{
            draggable: true,
            onDragEnd: (event): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  origin: [event.lngLat[1], event.lngLat[0]]
                })
              );
            },
            longitude: state.origin[1],
            latitude: state.origin[0]
          }}
          pin={{ style: { fill: "#00f" } }}
        />
        <PinMarker
          marker={{
            draggable: true,
            onDragEnd: (event): void => {
              setState(
                (prevState): State => ({
                  ...prevState,
                  destination: [event.lngLat[1], event.lngLat[0]]
                })
              );
            },
            longitude: state.destination[1],
            latitude: state.destination[0]
          }}
          pin={{ style: { fill: "#0f0" } }}
        />
      </MapGL>
    </div>
  );
};

export default App;
