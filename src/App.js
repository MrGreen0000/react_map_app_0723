import * as React from "react";
import Map, { NavigationControl } from "react-map-gl";
import Navbar from "./components/navbar.js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Map
        mapLib={maplibregl}
        initialViewState={{
          longitude: 16.62662018,
          latitude: 49.2125578,
          zoom: 14,
        }}
        style={{ width: "100%", height: " calc(100vh - 77px)" }}
        mapStyle="https://api.maptiler.com/maps/satellite/style.json?key=bUNkGxzojTZOBuCGooQ2"
      >
        <NavigationControl position="top-left" />
      </Map>
    </div>
  );
}

export default App;
