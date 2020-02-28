import React from "react";

export interface PinProps {
  height?: string;
  style?: React.CSSProperties;
}

const Pin: React.SFC<PinProps> = ({
  height = "50",
  style = { fill: "#444", stroke: "none" }
}) => {
  const SVG_MARKUP =
    "M7.5 0C5.068 0 2.23 1.486 2.23 5.27c0 2.568 4.054 8.244 5.27 9.73c1.081-1.486 5.27-7.027 5.27-9.73C12.77 1.487 9.932 0 7.5 0z";

  return (
    <svg height={height} style={style} viewBox="0 0 15 15">
      <path d={SVG_MARKUP} />
    </svg>
  );
};

export default Pin;
