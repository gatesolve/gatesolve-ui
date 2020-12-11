// Original source: https://github.com/openplannerteam/leaflet-routable-tiles/blob/master/lib/RoutableTilesToGeoJSON.js

import {
  bearing as turfBearing,
  lineString as turfLineString,
  booleanClockwise as turfBooleanClockwise,
} from "@turf/turf";

import { triplesToTags } from "./routable-tiles";

const offset = 0.2;

var processRelations = function (relations, ways, nodes, entrances) {
  Object.values(relations)
    .filter((relation) => {
      return relation["osm:hasTag"]?.find(
        (tag) => tag.startsWith("building=") || tag.startsWith("building:part=")
      );
    })
    .forEach((relation) => {
      const relationEntrances = relation["osm:hasMembers"].flatMap((member) => {
        // Process the member way if it's included in the tile
        const way = ways[member["@id"]];
        if (way) {
          return processWay(
            way,
            nodes,
            entrances,
            member.role === "inner",
            relation
          );
        }
        return [];
      });
      processBuildingEntrances(relationEntrances);
    });
};

var processWays = function (ways, nodes, entrances) {
  Object.values(ways)
    .filter((way) => {
      return way["osm:hasTag"]?.find(
        (tag) => tag.startsWith("building=") || tag.startsWith("building:part=")
      );
    })
    .forEach((way) => {
      processBuildingEntrances(processWay(way, nodes, entrances));
    });
};

var processBuildingEntrances = function (buildingEntrances) {
  // If the building has a staircase or a main entrance,
  // mark other entrances as secondary
  if (
    buildingEntrances.some((entrance) =>
      ["staircase", "main"].includes(entrance.properties["entrance"])
    )
  ) {
    buildingEntrances.forEach((entrance) => {
      if (!["staircase", "main"].includes(entrance.properties["entrance"])) {
        entrance.properties["@secondary"] = true;
      }
    });
  }
};

var processWay = function (way, nodes, entrances, isInnerRole, relation) {
  if (!way["osm:hasNodes"]) {
    return []; // no nodes to process
  } else if (typeof way["osm:hasNodes"] === "string") {
    return []; // a single node cannot be processed as a way
  }

  const nodeIds = way["osm:hasNodes"];
  if (nodeIds.length < 4) {
    console.log("not an area", way["@id"]);
    return [];
  }
  if (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
    console.log("unclosed", way["@id"]);
  }
  let isWayClockwise = null;
  let wayEntrances = [];
  nodeIds.forEach((nodeId, index, nodeIds) => {
    const entrance = entrances[nodeId];
    if (entrance) {
      // Calculate clockwiseness only when first entrance is hit
      if (isWayClockwise === null) {
        isWayClockwise = turfBooleanClockwise(
          turfLineString(nodeIds.map((id) => nodes[id]))
        );
      }
      const xy = nodes[nodeId];
      const xyPrev =
        index === 0
          ? nodes[nodeIds[nodeIds.length - 2]]
          : nodes[nodeIds[index - 1]];
      const xyNext =
        index === nodeIds.length - 1
          ? nodes[nodeIds[1]]
          : nodes[nodeIds[index + 1]];

      const bearingPrev = turfBearing(xy, xyPrev);
      const bearingNext = turfBearing(xy, xyNext);
      const entranceAngle =
        Math.abs(bearingPrev - bearingNext) / 2 +
        Math.min(bearingPrev, bearingNext);
      const adaptedAngle =
        bearingPrev > bearingNext ? entranceAngle + 270 : entranceAngle + 90;
      const angle =
        isWayClockwise !== !!isInnerRole ? adaptedAngle : adaptedAngle + 180;

      let entranceLabel = entrance.properties["@entrance-label"];
      let houseLabel = entrance.properties["@house-label"];
      // Inherit information from the building, but only
      // if there is no building information at the entrance
      // XXX: Inherit from building as well if this way is a building part
      if (!entrance.properties["addr:housenumber"]) {
        if (!entrance.properties["ref"] && !entrance.properties["addr:unit"]) {
          const label = entranceNodeToLabel(relation || way); // XXX: merge?
          entranceLabel = entranceLabel || label.entrance;
          // XXX: Inherit street and housenumber only if they are not ambiguous
          // houseLabel = label.house;
        }
      }

      entrance.properties = {
        ...entrance.properties,
        "@offset": [
          Math.cos((angle / 180) * Math.PI) * offset,
          Math.sin((angle / 180) * Math.PI) * offset,
        ],
        "@rotate": (((angle - 90) % 360) + 360) % 360,
        "@entrance-label": entranceLabel,
        "@house-label": houseLabel,
      };
      wayEntrances.push(entrance);
    }
  });
  return wayEntrances;
};

const entranceNodeToLabel = function (node) {
  const house =
    node["osm:hasTag"]
      ?.find((tag) => tag.startsWith("addr:housenumber="))
      ?.substring(17) || "";
  const ref = node["osm:hasTag"]
    ?.find((tag) => tag.startsWith("ref="))
    ?.substring(4);
  const unit = node["osm:hasTag"]
    ?.find((tag) => tag.startsWith("addr:unit="))
    ?.substring(10);
  const entrance = ref || unit || "";
  return {
    house: house.replace(/ /g, "\u2009"),
    entrance: entrance.replace(/ /g, "\u2009"),
  };
};

export default function (json) {
  var entrances = {};
  var nodes = {};
  var ways = {};
  var relations = {};
  for (var i = 0; i < json["@graph"].length; i++) {
    let element = json["@graph"][i];
    if (element["@type"] === "osm:Relation") {
      relations[element["@id"]] = element;
    } else if (element["@type"] === "osm:Way") {
      ways[element["@id"]] = element;
    } else if (element["geo:lat"] && element["geo:long"]) {
      // Store the coordinates of every node for later reference
      const lngLat = [element["geo:long"], element["geo:lat"]];
      nodes[element["@id"]] = lngLat;

      if (element["osm:hasTag"]?.find((tag) => tag.startsWith("entrance="))) {
        // Create a GeoJSON feature for each entrance

        const id = element["@id"];
        // XXX: Could be computed later on demand
        const tags = triplesToTags(id, element, element["osm:hasTag"]);

        const entranceLabel = entranceNodeToLabel(element);
        const entrance = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: lngLat,
          },
          properties: {
            ...tags,
            "@entrance-label": entranceLabel.entrance,
            "@house-label": entranceLabel.house,
          },
        };

        entrances[id] = entrance;
      }
    }
  }
  processRelations(relations, ways, nodes, entrances);
  processWays(ways, nodes, entrances);
  return {
    type: "FeatureCollection",
    features: Object.values(entrances),
  };
}
