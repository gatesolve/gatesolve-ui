import type { FeatureCollection, MultiLineString } from "geojson";

import osmtogeojson from "osmtogeojson";

const OVERPASS_INTERPRETER =
  process.env.REACT_APP_OVERPASS_INTERPRETER?.replace(/\?$/, "") ||
  "https://overpass.fvh.io/api/interpreter";

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: Osm3S;
  elements: Element[];
}

export interface Osm3S {
  timestamp_osm_base: Date;
  copyright: string;
}

export type Element =
  | ElementWithCoordinates
  | ElementWithGeometry
  | (ElementCore & Partial<Coordinates>);

export type ElementWithCoordinates = ElementCore & Coordinates;

export type ElementWithGeometry = ElementCore & {
  geometry: Array<Coordinates>;
};

interface ElementCore {
  type: string;
  id: number;
  tags?: Tags;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Tags {
  entrance?: string;
  operator?: string;
  ref?: string;
  "addr:unit"?: string;
  "addr:housenumber"?: string;
  "addr:street"?: string;
  name?: string;
}

const buildEntranceQuery = (lat: number, lon: number): string => `
  [out:json][timeout:25];
  (
    relation(around:10, ${lat}, ${lon})[building];
    way(r);
    way(around:10, ${lat}, ${lon})[building];
  )->.b;
  (
    relation(around.b:10)["building:part"];
    way(r);
    way(around.b:10)["building:part"];
  )->.p;
  // gather results
  (
    node(w.b)[entrance];
    node(w.p)[entrance];
  );
  // print results
  out body;
  >;
  out skel qt;
`;

export const queryEntrances = (
  target: ElementWithCoordinates
): Promise<ElementWithCoordinates[]> => {
  const url = new URL(OVERPASS_INTERPRETER);
  url.searchParams.append("data", buildEntranceQuery(target.lat, target.lon));
  return fetch(url.toString()).then((response) =>
    response.json().then((body: OverpassResponse) => {
      const targets = body.elements.filter(
        (element) =>
          element.type === "node" &&
          "lat" in element &&
          element.lat != null &&
          "lon" in element &&
          element.lon != null &&
          element.tags &&
          element.tags.entrance
      );
      // FIXME: How to make the compiler deduce this by itself from above?
      // For example, see https://github.com/Microsoft/TypeScript/issues/16069
      return targets as ElementWithCoordinates[];
    })
  );
};

const buildMatchingStreetQuery = (
  lat: number,
  lon: number,
  street: string
): string => {
  const streetEscaped = street
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  return `
  [out:json][timeout:25];
  (
    way(around:100, ${lat}, ${lon})["highway"][name="${streetEscaped}"];
  );
  // print results as id and geometry for each way in qt (non-sorted) order
  out ids geom qt;`;
};

export const queryMatchingStreet = async (
  target: ElementWithCoordinates,
  street: string
): Promise<MultiLineString> => {
  const url = new URL(OVERPASS_INTERPRETER);
  url.searchParams.append(
    "data",
    buildMatchingStreetQuery(target.lat, target.lon, street)
  );
  const response = await fetch(url.toString());
  const body = await response.json();
  const coordinates = body.elements.map((way: ElementWithGeometry) =>
    way.geometry.map(({ lat, lon }) => [lon, lat])
  );
  return {
    type: "MultiLineString",
    coordinates,
  };
};

const buildQueryNodesById = (ids: Array<number>): string => `
  [out:json][timeout:25];
  node(id:${ids.join(",")});
  out;
`;

export const queryNodesById = async (
  ids: Array<number>
): Promise<Array<ElementWithCoordinates>> => {
  const url = new URL(OVERPASS_INTERPRETER);
  if (!ids.length) return [];
  url.searchParams.append("data", buildQueryNodesById(ids));
  const response = await fetch(url.toString());
  const body = (await response.json()) as OverpassResponse;
  return body.elements as Array<ElementWithCoordinates>;
};

const buildTunnelsQuery = () => `
[out:json][timeout:25][bbox];
(
  way[layer~"^-[123456789]"][highway!~"^(footway|steps|corridor|cycleway)"][highway][tunnel];
  node[layer~"^-[123456789]"][barrier=gate];
  node[layer~"^-[123456789]"][entrance];
  node[layer~"^-[123456789]"]["parking:condition"=loading];
);
out body;
>;
out skel qt;
`;

export const queryTunnels = async (
  bbox: string
): Promise<FeatureCollection> => {
  const url = new URL(OVERPASS_INTERPRETER);
  url.searchParams.append("data", buildTunnelsQuery());
  url.searchParams.append("bbox", bbox);
  const response = await fetch(url.toString());
  const body = (await response.json()) as OverpassResponse;
  const geojson = osmtogeojson(body) as FeatureCollection;
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const properties = { ...feature.properties };
      properties["@id"] = properties.id;
      delete properties.id;
      return {
        ...feature,
        properties,
      };
    }),
  };
};
