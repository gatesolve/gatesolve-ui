import React, { useState } from "react";
import MapGL from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import logo from "./logo.svg";
import "./App.css";

const App: React.FC = () => {
  const [viewport, setViewport] = useState({
    latitude: 60.17,
    longitude: 24.94,
    zoom: 14,
    bearing: 0,
    pitch: 0
  });
  return (
    <div data-testid="app" className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <MapGL
        // This is according to the Get Started materials:
        // https://uber.github.io/react-map-gl/docs/get-started/get-started/
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...viewport}
        width="100vw"
        height="90vh"
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
        onViewportChange={setViewport}
      />
    </div>
  );
};

export default App;
