import React, { useState, useEffect } from "react";
import MapGL, { Source, Layer, ViewportProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

import { routePointLayer, routeLineLayer } from "./map-style";
import PinMarker from "./components/PinMarker";
import calculatePlan, { geometryToGeoJSON } from "./planner";
import logo from "./logo.svg";
import "./App.css";

type State = {
  viewport: Partial<ViewportProps>;
  origin: [number, number];
  destination: [number, number];
  route: FeatureCollection;
};

const initialOrigin = [60.17, 24.94] as [number, number];
const initialDestination = [60.18, 24.95] as [number, number];
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
        <img src={logo} className="App-logo" alt="logo" />
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
          longitude={state.origin[1]}
          latitude={state.origin[0]}
          style={{ fill: "#00f" }}
        />
        <PinMarker
          longitude={state.destination[1]}
          latitude={state.destination[0]}
          style={{ fill: "#0f0" }}
        />
      </MapGL>
    </div>
  );
};

export default App;
