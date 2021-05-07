import type { MultiLineString } from "geojson";

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
  const url = new URL("https://overpass.fvh.io/api/interpreter");
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
  const url = new URL("https://overpass.fvh.io/api/interpreter");
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
