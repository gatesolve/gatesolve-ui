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
  | (ElementCore & Partial<Coordinates>);

type ElementWithCoordinates = ElementCore & Coordinates;

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
}

const buildEntranceQuery = (lat: number, lon: number): string => `
  [out:json][timeout:25];
  (
    relation(around:10, ${lat}, ${lon})[building];
    way(r);
    way(around:10, ${lat}, ${lon})[building];
  )->.b;
  // gather results
  (
    node(w.b)[entrance];
  );
  // print results
  out body;
  >;
  out skel qt;
`;

export const queryEntrances = (
  latLng: [number, number]
): Promise<ElementWithCoordinates[]> => {
  const url = new URL("https://overpass-api.de/api/interpreter");
  url.searchParams.append("data", buildEntranceQuery(latLng[0], latLng[1]));
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
