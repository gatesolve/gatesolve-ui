import React, { useState } from "react";
import MapGL, { Source, Layer, ViewportProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { Expression } from "mapbox-gl";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";
import logo from "./logo.svg";
import "./App.css";

export const routeLineLayer = {
  id: "route-line",
  type: "line",
  paint: {
    "line-opacity": 0.5,
    "line-width": 5
  }
};
export const routePointLayer = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-radius": 5,
    "circle-color": ["get", "color"] as Expression
  },
  filter: ["==", "Point", ["geometry-type"]]
};

type State = {
  viewport: Partial<ViewportProps>;
  origin: [number, number];
  destination: [number, number];
  route: FeatureCollection;
};

const initialState: State = {
  origin: [60.17, 24.94],
  destination: [60.18, 24.95],
  route: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [24.94, 60.17],
            [24.95, 60.175],
            [24.95, 60.18]
          ]
        },
        properties: {
          color: "#000"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [24.94, 60.17]
        },
        properties: {
          color: "#00f"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [24.95, 60.18]
        },
        properties: {
          color: "#0f0"
        }
      }
    ]
  },
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
      </MapGL>
    </div>
  );
};

export default App;
