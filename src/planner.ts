// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson";

// "./planner-config" (and PlannerJS) is imported dynamically by calculatePlan

import { ElementWithCoordinates } from "./overpass";

interface RouteGeometries {
  coordinates: Array<[number, number]>;
  obstacles: Array<[number, number]>;
  obstacleWays: Array<Array<[number, number]>>;
  imaginaryWays: Array<Array<[number, number]>>;
}

function extractGeometry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any
): RouteGeometries {
  const coordinates = [] as Array<[number, number]>;
  const obstacles = [] as Array<[number, number]>;
  const obstacleWays = new Map();
  const imaginaryWays = [] as Array<Array<[number, number]>>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path.legs[0].getSteps().forEach((step: any, index: number) => {
    /* XXX: Would be nice to get a null step.through from PlannerJS here.
       Heuristic below: PlannerJS connects the origin and destination to
       the nearest OSM ways through a node which does not have an id,
       so the steps whose geometry is not based on an OSM way have
       nodes without ids at both ends. Additionally, the second step is a
       false positive if origin and destination connect to same OSM edge.
     */
    if (!step.startLocation.id && !step.stopLocation.id && index !== 1) {
      imaginaryWays.push([
        [
          step.startLocation.longitude as number,
          step.startLocation.latitude as number,
        ],
        [
          step.stopLocation.longitude as number,
          step.stopLocation.latitude as number,
        ],
      ]);
      return; // guessed segment
    }
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
  return {
    coordinates,
    obstacles,
    obstacleWays: Array.from(obstacleWays.values()),
    imaginaryWays,
  };
}

export function geometryToGeoJSON(
  origin?: [number, number],
  targets?: Array<ElementWithCoordinates>,
  entrances?: Array<ElementWithCoordinates>,
  routeGeometries?: RouteGeometries
): FeatureCollection {
  const features = [] as Array<Feature<Geometry, GeoJsonProperties>>;
  if (origin) {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [origin[1], origin[0]],
      },
      properties: {
        color: "#00afff",
      },
    });
  }
  if (targets) {
    targets.forEach((target) => {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [target.lon, target.lat],
        },
        properties: {
          color: "#64be14",
        },
      });
    });
  }
  if (entrances) {
    entrances.forEach((entrance) => {
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [entrance.lon, entrance.lat],
        },
        properties: {
          color: "#00ffff",
          ref: entrance.tags?.["ref"] || entrance.tags?.["addr:unit"],
          opacity: 0,
        },
      });
    });
  }
  if (routeGeometries?.coordinates) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeGeometries.coordinates,
      },
      properties: {
        color: "#000",
      },
    });
  }
  if (routeGeometries?.obstacleWays) {
    features.push({
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: routeGeometries.obstacleWays,
      },
      properties: {
        color: "#dc0451",
        opacity: 1,
      },
    });
  }
  if (routeGeometries?.imaginaryWays) {
    features.push({
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: routeGeometries.imaginaryWays,
      },
      properties: {
        color: "#000",
        imaginary: true,
      },
    });
  }
  if (routeGeometries?.obstacles) {
    features.push({
      type: "Feature",
      geometry: {
        type: "MultiPoint",
        coordinates: routeGeometries.obstacles,
      },
      properties: {
        color: "#dc0451",
        ref: "!",
      },
    });
  }
  return {
    type: "FeatureCollection",
    features,
  };
}

export default async function calculatePlan(
  origin: [number, number],
  targets: Array<ElementWithCoordinates>,
  callback: (f: FeatureCollection) => void
): Promise<void> {
  const { Planner } = await import(
    /* webpackChunkName: "planner-config" */
    "./planner-config"
  );
  targets.forEach((target) => {
    const planner = new Planner();
    // XXX setProfileID requires URL to start with scheme, so guess
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    planner
      .setProfileID(`${protocol}://${process.env.PUBLIC_URL}/delivery.json`)
      .query({
        from: { latitude: origin[0], longitude: origin[1] },
        to: { latitude: target.lat, longitude: target.lon },
      })
      .take(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("data", async (path: any) => {
        const completePath = await planner.completePath(path);
        // eslint-disable-next-line no-console
        console.log("Plan", completePath, "from", origin, "to", target);
        const routeGeometries = extractGeometry(completePath);
        const geoJSON = geometryToGeoJSON(
          origin,
          [target],
          undefined,
          routeGeometries
        );
        callback(geoJSON);
      });
  });
}
