const SVG_VIEWBOX = "-5 -1 25 50";
const TRIANGLE_PATH = "M 8 16 L 0 8 L 16 8 Z";
const dotPath = (radius: number) => `
M ${8 - radius} ${32 + radius}
a ${radius} ${radius}, 0, 0, 0, ${2 * radius} 0
a ${radius} ${radius}, 0, 0, 0, ${-2 * radius} 0
`;

// eslint-disable-next-line import/prefer-default-export
export const triangleDotAsSVG = (
  size: number,
  style: string,
  dotSize = 3,
  dotStyle = "stroke-width: 1"
): string => `
<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}px"
  height="${size}px"
  style="${style}"
  viewBox="${SVG_VIEWBOX}"
>
  <path d="${TRIANGLE_PATH}" />
  <path style="${dotStyle}" d="${(dotSize && dotPath(dotSize)) || ""}" />
</svg>`;

export const triangleAsSVG = (size: number, style: string): string =>
  triangleDotAsSVG(size, style, 0);
