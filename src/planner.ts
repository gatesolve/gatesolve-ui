import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson"; // eslint-disable-line import/no-extraneous-dependencies

import { triplesToTags } from "./routable-tiles";

// "./planner-config" (and PlannerJS) is imported dynamically by calculatePlan

import { ElementWithCoordinates, Tags } from "./overpass";

interface RouteGeometries {
  coordinates: Array<[number, number]>;
  obstacles: Array<ElementWithCoordinates>;
  obstacleWays: Array<[Tags, Array<[number, number]>]>;
  imaginaryWays: Array<Array<[number, number]>>;
}

function extractGeometry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: any
): RouteGeometries {
  const coordinates = [] as Array<[number, number]>;
  const obstacles = [] as Array<ElementWithCoordinates>;
  const obstacleWays = new Map<string, [Tags, Array<[number, number]>]>();
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
        const wayContext = path.context[step.through];
        const tags = triplesToTags(
          step.through,
          wayContext.definedTags,
          wayContext.freeformTags
        );
        obstacleWays.set(step.through, [tags, []]);
      }
      obstacleWays
        .get(step.through)?.[1]
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
      const tags = triplesToTags(node.id, node.definedTags, node.freeformTags);
      obstacles.push({
        type: node.id,
        id: node.id,
        lon: node.longitude as number,
        lat: node.latitude as number,
        tags,
      });
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
  routeGeometries?: RouteGeometries,
  originColor?: string,
  targetColor?: string
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
        "@color": originColor,
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
          "@color": targetColor,
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
          "@color": "#00ffff",
          "@label": entrance.tags?.["ref"] || entrance.tags?.["addr:unit"],
          "@opacity": 0,
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
        "@color": "#000",
      },
    });
  }
  routeGeometries?.obstacleWays.forEach(([tags, geometry]) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: geometry,
      },
      properties: {
        ...tags,
        "@color": "#dc0451",
        "@opacity": 1,
        "@interactive": true,
      },
    });
  });
  if (routeGeometries?.imaginaryWays) {
    features.push({
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: routeGeometries.imaginaryWays,
      },
      properties: {
        "@color": "#000",
        "@imaginary": true,
      },
    });
  }
  routeGeometries?.obstacles.forEach((obstacle) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [obstacle.lon, obstacle.lat],
      },
      properties: {
        ...obstacle.tags,
        "@color": "#dc0451",
        "@label": "!",
      },
    });
  });
  return {
    type: "FeatureCollection",
    features,
  };
}

export default async function calculatePlan(
  queries: Array<[[number, number], ElementWithCoordinates, string?]>,
  callback: (f: FeatureCollection) => void
): Promise<void> {
  const { Planner } = await import(
    /* webpackChunkName: "planner-config" */
    /* webpackPrefetch: true */
    "./planner-config"
  );
  queries.forEach(([origin, target, profile = "delivery-walking"]) => {
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
        const originColor = profile === "delivery-car" ? "#000000" : "#00afff";
        const targetColor = profile === "delivery-car" ? "#00afff" : "#64be14";
        const geoJSON = geometryToGeoJSON(
          origin,
          [target],
          undefined,
          routeGeometries,
          originColor,
          targetColor
        );
        callback(geoJSON);
      });
  });
}
