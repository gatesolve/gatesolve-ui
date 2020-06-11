import { Map } from "mapbox-gl";

import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";

import type { Feature, FeatureCollection } from "geojson";

// eslint-disable-next-line import/prefer-default-export
export const addImageSVG = (
  mapboxgl: Map,
  imageId: string,
  svgData: string,
  size: number
): void => {
  const ratio = window.devicePixelRatio;

  const canvas = document.createElement("canvas");
  canvas.width = ratio * size;
  canvas.height = ratio * size;

  const ctx = canvas.getContext("2d");
  const img = new Image(size, size);

  const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgData)}`;

  img.onload = (): void => {
    if (!ctx) {
      throw Error("canvas.getContext failed");
    }

    ctx.drawImage(img, 0, 0, ratio * size, ratio * size);
    mapboxgl.addImage(
      imageId,
      ctx.getImageData(0, 0, ratio * size, ratio * size),
      { pixelRatio: ratio }
    );
  };

  img.src = svgDataUrl;
};

export const getMapSize = (
  mapboxgl: Map
): { width: number; height: number } => ({
  width: mapboxgl?.getContainer()?.clientWidth,
  height: mapboxgl?.getContainer()?.clientHeight,
});

export const queryFeatures = async ([lat, lng]: [number, number]): Promise<
  FeatureCollection
> => {
  const TILE_SIZE = 512;
  const WEBMERCATOR_R = 6378137.0;
  const DIAMETER = WEBMERCATOR_R * 2 * Math.PI;

  function mercatorProject(lonlat: [number, number]): [number, number] {
    const x = (DIAMETER * lonlat[0]) / 360.0;
    const sinlat = Math.sin((lonlat[1] * Math.PI) / 180.0);
    const y =
      (DIAMETER * Math.log((1 + sinlat) / (1 - sinlat))) / (4 * Math.PI);
    return [DIAMETER / 2 + x, DIAMETER - (DIAMETER / 2 + y)];
  }

  function getTile(
    lonlat: [number, number],
    zoom: number
  ): [number, number, number, number] {
    const centerm = mercatorProject(lonlat);
    const centerpx = [
      (centerm[0] * TILE_SIZE * 2 ** zoom) / DIAMETER,
      (centerm[1] * TILE_SIZE * 2 ** zoom) / DIAMETER,
    ];
    const x = Math.floor(centerpx[0] / TILE_SIZE);
    const y = Math.floor(centerpx[1] / TILE_SIZE);
    return [
      x,
      y,
      (centerpx[0] - x * TILE_SIZE) / TILE_SIZE,
      (centerpx[1] - y * TILE_SIZE) / TILE_SIZE,
    ];
  }

  function pointInBox(
    point: [number, number],
    box: [number, number, number, number]
  ): boolean {
    return (
      box[0] < point[0] &&
      point[0] < box[2] &&
      box[1] < point[1] &&
      point[1] < box[3]
    );
  }

  const coords = getTile([lng, lat], 14);
  const tileCoords = [coords[2] * 4096, coords[3] * 4096] as [number, number];

  const data = await fetch(
    `https://api.digitransit.fi/map/v1/hsl-vector-map/14/${coords[0]}/${coords[1]}.pbf`
  );
  const tile = new VectorTile(new Protobuf(await data.arrayBuffer()));
  const results = [];
  for (let i = 0; i < tile.layers.building.length; i += 1) {
    const feature = tile.layers.building.feature(i);
    if (pointInBox(tileCoords, feature.bbox())) {
      // eslint-disable-next-line no-console
      console.log("selected building", feature);
      results.push(feature.toGeoJSON(coords[0], coords[1], 14));
    }
  }
  return {
    type: "FeatureCollection" as "FeatureCollection",
    features: results as Array<Feature>,
  };
};
