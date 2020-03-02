import { FlexibleTransitPlanner } from "plannerjs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

import { queryEntrances } from "./overpass";

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
          color: "#00afff"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [destination[1], destination[0]]
        },
        properties: {
          color: "#64be14"
        }
      }
    ]
  };
}

export default function calculatePlan(
  origin: [number, number],
  destination: [number, number],
  callback: (f: FeatureCollection) => void
): void {
  queryEntrances(destination)
    .then(entrances => {
      if (!entrances.length) {
        return [
          { id: -1, type: "node", lat: destination[0], lon: destination[1] }
        ];
      }
      return entrances;
    })
    .then(targets => {
      targets.forEach(target => {
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
            const geoJSON = geometryToGeoJSON(
              origin,
              [target.lat, target.lon],
              geometry
            );
            callback(geoJSON);
          });
      });
    });
}
