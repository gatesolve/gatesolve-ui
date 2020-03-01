import { FlexibleTransitPlanner } from "plannerjs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGeometry(path: any): Array<[number, number]> {
  const coordinates = [] as Array<[number, number]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path.legs[0].getSteps().forEach((step: any) => {
    coordinates.push([
      step.startLocation.longitude as number,
      step.startLocation.latitude as number
    ]);
    coordinates.push([
      step.stopLocation.longitude as number,
      step.stopLocation.latitude as number
    ]);
  });
  return coordinates;
}

export function geometryToGeoJSON(
  origin: [number, number],
  destination: [number, number],
  coordinates: Array<[number, number]>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates
        },
        properties: {
          color: "#000"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [origin[1], origin[0]]
        },
        properties: {
          color: "#00f"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [destination[1], destination[0]]
        },
        properties: {
          color: "#0f0"
        }
      }
    ]
  };
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

export default function calculatePlan(
  origin: [number, number],
  destination: [number, number],
  callback: (f: FeatureCollection) => void
): void {
  const url = new URL("https://overpass-api.de/api/interpreter");
  url.searchParams.append(
    "data",
    buildEntranceQuery(destination[0], destination[1])
  );
  fetch(url.toString()).then(response =>
    response.json().then(body => {
      let targets = body.elements.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (element: any) =>
          element.type === "node" && element.tags && element.tags.entrance
      );
      if (!targets.length) {
        targets = [{ lat: destination[0], lon: destination[1] }];
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      targets.forEach((target: any) => {
        const planner = new FlexibleTransitPlanner();
        planner
          .query({
            from: { latitude: origin[0], longitude: origin[1] },
            to: { latitude: target.lat, longitude: target.lon },
            roadNetworkOnly: true
          })
          .take(1)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on("data", async (path: any) => {
            const completePath = await planner.completePath(path);
            const geometry = extractGeometry(completePath);
            const geoJSON = geometryToGeoJSON(origin, destination, geometry);
            callback(geoJSON);
          });
      });
    })
  );
}
