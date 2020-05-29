// Original source: https://github.com/openplannerteam/leaflet-routable-tiles/blob/master/lib/RoutableTilesToGeoJSON.js

import { mercatorProject } from "./minimal-xyz-viewer";

import { bearing as turfBearing } from "@turf/turf";

const offset = 0.5;

var extractWays = function (json, nodes, feats) {
  json["@graph"]
    .filter((item) => {
      return (
        item["@type"] === "osm:Way" &&
        item["osm:hasTag"]?.find((tag) => tag.startsWith("building="))
      );
    })
    .forEach((item) => {
      //Transform osm:hasNodes to a linestring style thing
      if (!item["osm:hasNodes"]) {
        item["osm:hasNodes"] = [];
      } else if (typeof item["osm:hasNodes"] === "string") {
        item["osm:hasNodes"] = [item["osm:hasNodes"]];
      }
      const nodeIds = item["osm:hasNodes"];
      if (nodeIds.length < 3) {
        console.log("not an area", item["@id"]);
        return;
      }
      if (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
        console.log("unclosed", item["@id"]);
      }
      const linestring = item["osm:hasNodes"].map((nodeId, index, nodeIds) => {
        const node = feats.get(nodeId);
        if (node["osm:hasTag"]?.find((tag) => tag.startsWith("entrance="))) {
          if (index === 0 || index === nodeIds.length - 1) {
            console.log("entrance at an end", node);
            return nodes[nodeId];
          }
          const xy = nodes[nodeId];
          const xy_prev = nodes[nodeIds[index - 1]];
          const xy_next = nodes[nodeIds[index + 1]];

          const buildingAngle =
            180 + (turfBearing(xy_prev, xy) - turfBearing(xy, xy_next));
          const entranceAngle = turfBearing(xy_prev, xy) + buildingAngle / 2;
          const angle = entranceAngle + 270;
          node.properties = {
            entrance: node["osm:hasTag"]
              ?.find((tag) => tag.startsWith("entrance="))
              ?.substring(9),
            offset: [
              Math.cos((angle / 180) * Math.PI) * offset,
              Math.sin((angle / 180) * Math.PI) * offset,
            ],
            rotate: angle - 90,
            ref: node["osm:hasTag"]
              ?.find((tag) => tag.startsWith("ref="))
              ?.substring(4),
            "addr:unit": node["osm:hasTag"]
              ?.find((tag) => tag.startsWith("addr:unit="))
              ?.substring(10),
          };
        }
        return nodes[nodeId];
      });
    });
};

export default function (json) {
  // Normalize feature getters into actual instanced features
  var feats = new Map();
  var nodes = {};
  for (var i = 0; i < json["@graph"].length; i++) {
    let o = json["@graph"][i];
    if (o["geo:lat"] && o["geo:long"]) {
      nodes[o["@id"]] = [o["geo:long"], o["geo:lat"]];
      let feature = {
        id: o["@id"],
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [o["geo:long"], o["geo:lat"]],
        },
      };
      feature["osm:hasTag"] = o["osm:hasTag"];
      feats.set(feature.id, feature);
    }
  }
  var ways = extractWays(json, nodes, feats);
  return {
    type: "FeatureCollection",
    features: Array.from(feats.values()),
    //    features: ways,
  };
}
