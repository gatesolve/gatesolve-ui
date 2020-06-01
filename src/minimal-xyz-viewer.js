// Source: https://gist.github.com/jsanz/e8549c7bffd442235a942695ffdaf77d

const TILE_SIZE = 256;
const WEBMERCATOR_R = 6378137.0;
const DIAMETER = WEBMERCATOR_R * 2 * Math.PI;

function mercatorProject(lonlat) {
  var x = (DIAMETER * lonlat[0]) / 360.0;
  var sinlat = Math.sin((lonlat[1] * Math.PI) / 180.0);
  var y = (DIAMETER * Math.log((1 + sinlat) / (1 - sinlat))) / (4 * Math.PI);
  return [DIAMETER / 2 + x, DIAMETER - (DIAMETER / 2 + y)];
}
// console.log(Mercator.project([-3,41]))

export function getVisibleTiles(clientWidth, clientHeight, center, zoom) {
  var centerm = mercatorProject(center);
  // zoom + centerm -> centerpx
  var centerpx = [
    (centerm[0] * TILE_SIZE * Math.pow(2, zoom)) / DIAMETER,
    (centerm[1] * TILE_SIZE * Math.pow(2, zoom)) / DIAMETER,
  ];

  // xmin, ymin, xmax, ymax
  var bbox = [
    Math.floor((centerpx[0] - clientWidth / 2) / TILE_SIZE),
    Math.floor((centerpx[1] - clientHeight / 2) / TILE_SIZE),
    Math.ceil((centerpx[0] + clientWidth / 2) / TILE_SIZE),
    Math.ceil((centerpx[1] + clientHeight / 2) / TILE_SIZE),
  ];
  var tiles = [];
  //xmin, ymin, xmax, ymax
  for (let x = bbox[0]; x < bbox[2]; ++x) {
    for (let y = bbox[1]; y < bbox[3]; ++y) {
      var [px, py] = [
        x * TILE_SIZE - centerpx[0] + clientWidth / 2,
        y * TILE_SIZE - centerpx[1] + clientHeight / 2,
      ];
      tiles.push({ x, y, zoom, px, py });
    }
  }
  return tiles;
}
