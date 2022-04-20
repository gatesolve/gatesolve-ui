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
  const waysSeen = {} as { [id: string]: boolean };
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
    const wayId = step.through;

    // For each way seen, create an obstacle node if there's a height restriction
    if (!waysSeen[wayId]) {
      const wayContext = path.context[wayId];
      const tags = triplesToTags(
        wayId,
        wayContext.definedTags,
        wayContext.freeformTags
      );
      if (tags.height || tags.maxheight || tags["maxheight:physical"]) {
        obstacles.push({
          type: wayId,
          id: wayId,
          lon: step.startLocation.longitude as number,
          lat: step.startLocation.latitude as number,
          tags,
        });
      }
    }
    waysSeen[wayId] = true;

    if (
      path.context[wayId]?.definedTags[
        "https://w3id.org/openstreetmap/terms#highway"
      ] === "https://w3id.org/openstreetmap/terms#Steps" ||
      path.context[wayId]?.freeformTags.find((tag: string) =>
        tag.startsWith("tunnel=")
      )
    ) {
      if (!obstacleWays.has(wayId)) {
        const wayContext = path.context[wayId];
        const tags = triplesToTags(
          wayId,
          wayContext.definedTags,
          wayContext.freeformTags
        );
        obstacleWays.set(wayId, [tags, []]);
      }
      obstacleWays
        .get(wayId)?.[1]
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
  origin?: ElementWithCoordinates,
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
        coordinates: [origin.lon, origin.lat],
      },
      properties: {
        ...origin.tags,
        "@id": `${origin.type}/${origin.id}`, // XXX should be full url
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
          coordinates: [target.lon, target.lat], // XXX should be full url
        },
        properties: {
          ...target.tags,
          "@id": `${target.type}/${target.id}`,
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
    const properties = tags.tunnel
      ? {
          ...tags,
          "@color": "#000000",
          "@opacity": 1,
          "@tunnel": true,
        }
      : {
          ...tags,
          "@color": "#dc0451",
          "@opacity": 1,
          "@obstacle": true,
          "@interactive": true,
        };
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: geometry,
      },
      properties,
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
        "@obstacle": true,
      },
    });
  });
  return {
    type: "FeatureCollection",
    features,
  };
}

export default async function calculatePlan(
  queries: Array<[ElementWithCoordinates, ElementWithCoordinates, string?]>,
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
      .setProfileID(`${protocol}://${process.env.PUBLIC_URL}/${profile}.json`)
      .query({
        from: { latitude: origin.lat, longitude: origin.lon },
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
