import React from "react";
import { Marker, MarkerProps } from "react-map-gl";

import Pin, { PinProps } from "./Pin";

export interface PinMarkerProps {
  marker: MarkerProps;
  pin: PinProps;
}

const PinMarker: React.FC<PinMarkerProps> = ({
  pin: { height = "50", ...otherPinProps },
  marker
}) => {
  return (
    <Marker
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...marker}
      offsetLeft={-height / 2}
      offsetTop={-height}
    >
      <Pin
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...{ height, ...otherPinProps }}
      />
    </Marker>
  );
};

export default PinMarker;
