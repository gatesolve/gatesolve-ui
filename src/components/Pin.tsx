import React from "react";

export interface PinProps {
  height?: string;
  style?: React.CSSProperties;
  dataTestId?: string;
}

const SVG_VIEWBOX = "-1 -1 17 17";
const SVG_PATH =
  "M7.5 0C5.068 0 2.23 1.486 2.23 5.27c0 2.568 4.054 8.244 5.27 9.73c1.081-1.486 5.27-7.027 5.27-9.73C12.77 1.487 9.932 0 7.5 0z";

export const pinAsSVG = (size: number, style: string): string => `
<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}px"
  height="${size}px"
  style="${style}"
  viewBox="${SVG_VIEWBOX}"
>
  <path d="${SVG_PATH}" />
</svg>`;

const Pin: React.FC<PinProps> = ({
  height = "50",
  style = { fill: "#444", stroke: "none" },
  dataTestId,
}) => {
  return (
    <svg
      data-testid={dataTestId}
      height={height}
      style={style}
      viewBox={SVG_VIEWBOX}
    >
      <path d={SVG_PATH} />
    </svg>
  );
};

export default Pin;
