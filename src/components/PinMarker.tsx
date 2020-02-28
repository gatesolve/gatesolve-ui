import React from "react";
import { Marker } from "react-map-gl";

import Pin, { PinProps } from "./Pin";

export interface PinMarkerProps extends PinProps {
  longitude: number;
  latitude: number;
}

const PinMarker: React.SFC<PinMarkerProps> = ({
  longitude,
  latitude,
  // FIXME: Avoid repetition with Pin
  height = "50",
  style = { fill: "#444", stroke: "none" }
}) => {
  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      offsetLeft={-height / 2}
      offsetTop={-height}
    >
      <Pin height={height} style={style} />
    </Marker>
  );
};

export default PinMarker;
