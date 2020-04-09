import { FlexibleRoadPlanner } from "plannerjs";
// eslint-disable-next-line import/no-extraneous-dependencies
import { FeatureCollection } from "geojson";

import { queryEntrances } from "./overpass";

function extractGeometry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any
): [
  Array<[number, number]>,
  Array<[number, number]>,
  Array<Array<[number, number]>>
] {
  const coordinates = [] as Array<[number, number]>;
  const obstacles = [] as Array<[number, number]>;
  const obstacleWays = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path.legs[0].getSteps().forEach((step: any) => {
    const node = step.stopLocation;
    if (
      path.context[step.through]?.definedTags[
        "https://w3id.org/openstreetmap/terms#highway"
      ] === "https://w3id.org/openstreetmap/terms#Steps"
    ) {
      if (!obstacleWays.has(step.through)) {
        obstacleWays.set(step.through, []);
      }
      obstacleWays
        .get(step.through)
        .push(
          [
            step.startLocation.longitude as number,
            step.startLocation.latitude as number,
          ],
          [
            step.stopLocation.longitude as number,
            step.stopLocation.latitude as number,
          ]
        );
    }
    if (node.definedTags?.["https://w3id.org/openstreetmap/terms#barrier"]) {
      // eslint-disable-next-line no-console
      console.log(
        step.through,
        node.definedTags[
          "https://w3id.org/openstreetmap/terms#barrier"
        ].replace(/^.*#/, ""),
        node.id,
        node.definedTags,
        node.freeformTags
      );
      obstacles.push([node.longitude as number, node.latitude as number]);
    }
    coordinates.push([
      step.startLocation.longitude as number,
      step.startLocation.latitude as number,
    ]);
    coordinates.push([
      step.stopLocation.longitude as number,
      step.stopLocation.latitude as number,
    ]);
  });
  return [coordinates, obstacles, Array.from(obstacleWays.values())];
}

export function geometryToGeoJSON(
  origin: [number, number],
  destination: [number, number],
  destinationRef?: string,
  coordinates?: Array<[number, number]>,
  obstacles?: Array<[number, number]>,
  obstacleWays?: Array<Array<[number, number]>>
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coordinates || [],
        },
        properties: {
          color: "#000",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "MultiLineString",
          coordinates: obstacleWays || [],
        },
        properties: {
          color: "#dc0451",
          opacity: 1,
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "MultiPoint",
          coordinates: obstacles || [],
        },
        properties: {
          color: "#dc0451",
          ref: "!",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [origin[1], origin[0]],
        },
        properties: {
          color: "#00afff",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [destination[1], destination[0]],
        },
        properties: {
          color: "#64be14",
          ref: destinationRef,
        },
      },
    ],
  };
}

export default function calculatePlan(
  origin: [number, number],
  destination: [number, number],
  callback: (f: FeatureCollection) => void
): void {
  queryEntrances(destination)
    .then((entrances) => {
      if (!entrances.length) {
        return [
          { id: -1, type: "node", lat: destination[0], lon: destination[1] },
        ];
      }
      return entrances;
    })
    .then((targets) => {
      targets.forEach((target) => {
        const planner = new FlexibleRoadPlanner();
        planner
          .query({
            from: { latitude: origin[0], longitude: origin[1] },
            to: { latitude: target.lat, longitude: target.lon },
            roadNetworkOnly: true,
          })
          .take(1)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on("data", async (path: any) => {
            const completePath = await planner.completePath(path);
            // eslint-disable-next-line no-console
            console.log("Plan", completePath, "from", origin, "to", target);
            const [geometry, obstacles, obstacleWays] = extractGeometry(
              completePath
            );
            const geoJSON = geometryToGeoJSON(
              origin,
              [target.lat, target.lon],
              target.tags?.["ref"] || target.tags?.["addr:unit"],
              geometry,
              obstacles,
              obstacleWays
            );
            callback(geoJSON);
          });
      });
    });
}
