import React, { useState, useEffect } from "react";
import MapGL, { Source, Layer, ViewportProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";
import { FlexibleTransitPlanner } from "plannerjs";
import { routePointLayer, routeLineLayer } from "./map-style";
import logo from "./logo.svg";
import "./App.css";

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

  useEffect(() => {
    const planner = new FlexibleTransitPlanner();
    planner
      .query({
        from: { latitude: state.origin[0], longitude: state.origin[1] },
        to: { latitude: state.destination[0], longitude: state.destination[1] },
        roadNetworkOnly: true
      })
      .take(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("data", async (path: any) => {
        const completePath = await planner.completePath(path);
        const coordinates = [] as Array<[number, number]>;
        completePath.legs[0].getSteps().forEach(step => {
          coordinates.push([
            step.startLocation.longitude as number,
            step.startLocation.latitude as number
          ]);
          coordinates.push([
            step.stopLocation.longitude as number,
            step.stopLocation.latitude as number
          ]);
        });
        setState(
          (prevState): State => ({
            ...prevState,
            route: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates
                  },
                  properties: {
                    color: "#000"
                  }
                },
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [state.origin[1], state.origin[0]]
                  },
                  properties: {
                    color: "#00f"
                  }
                },
                {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [state.destination[1], state.destination[0]]
                  },
                  properties: {
                    color: "#0f0"
                  }
                }
              ]
            }
          })
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
      </MapGL>
    </div>
  );
};

export default App;
