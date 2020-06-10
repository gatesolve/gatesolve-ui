const SVG_VIEWBOX = "-5 -1 25 25";
const SVG_PATH = "M 8 16 L 0 8 L 16 8 Z";

// eslint-disable-next-line import/prefer-default-export
export const triangleAsSVG = (size: number, style: string): string => `
<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}px"
  height="${size}px"
  style="${style}"
  viewBox="${SVG_VIEWBOX}"
>
  <path d="${SVG_PATH}" />
</svg>`;
