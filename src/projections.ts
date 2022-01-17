import type { Position } from "geojson";

import proj4 from "proj4";

const epsg3879 = proj4(
  "+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);

export const toEpsg3879 = (position: Position): Position => {
  return epsg3879.forward(position);
};

export const fromEpsg3879 = (position: Position): Position => {
  return epsg3879.inverse(position);
};
