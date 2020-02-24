import React, {useState} from 'react';
import logo from './logo.svg';
import MapGL from 'react-map-gl';
import './App.css';

const App = () => {
  const [viewport, setViewport] = useState({
    latitude: 60.17,
    longitude: 24.94,
    zoom: 14,
    bearing: 0,
    pitch: 0
  });
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <MapGL
        {...viewport}
        width="100vw"
        height="90vh"
        mapStyle="https://raw.githubusercontent.com/HSLdevcom/hsl-map-style/master/simple-style.json"
        onViewportChange={setViewport}
      />
    </div>
  );
}

export default App;
