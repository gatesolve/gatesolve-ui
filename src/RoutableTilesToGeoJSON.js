// Original source: https://github.com/openplannerteam/leaflet-routable-tiles/blob/master/lib/RoutableTilesToGeoJSON.js

import { mercatorProject } from "./minimal-xyz-viewer";

var extractWays = function (json, nodes, feats) {
  return json["@graph"]
    .filter((item) => {
      return item["@type"] === "osm:Way";
    })
    .map((item) => {
      //Transform osm:hasNodes to a linestring style thing
      if (!item["osm:hasNodes"]) {
        item["osm:hasNodes"] = [];
      } else if (typeof item["osm:hasNodes"] === "string") {
        item["osm:hasNodes"] = [item["osm:hasNodes"]];
      }
      item["osm:hasNodes"] = item["osm:hasNodes"].map(
        (nodeId, index, nodeIds) => {
          const node = feats.get(nodeId);
          if (
            (index === 0 || index === nodeIds.length - 1) &&
            node["osm:hasTag"]?.find((tag) => tag.startsWith("entrance="))
          ) {
            let angle;
            let xy, xy2;
            if (index === 0) {
              xy = mercatorProject(nodes[nodeId]);
              xy2 = mercatorProject(nodes[nodeIds[index + 1]]);
            } else {
              xy = mercatorProject(nodes[nodeId]);
              xy2 = mercatorProject(nodes[nodeIds[index - 1]]);
            }
            angle = Math.atan2(xy[0] - xy2[0], -(xy[1] - xy2[1])); // atan2(lat', -lon')
            angle = (angle / Math.PI) * 180 - 90; // rotate 0 from right to top
            if (
              item["osm:hasTag"]?.find((tag) => tag.startsWith("indoor=")) ||
              item["osm:hasTag"]?.find((tag) => tag === "highway=corridor")
            ) {
              angle = angle + 180; // flip indoor angle to get ordinary outdoor angle
            }
            const offset = 0.5;
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
            //           console.log(node);
          }
          return nodes[nodeId];
        }
      );
      let geometry = {
        type: "LineString",
        coordinates: item["osm:hasNodes"],
      };
      return {
        id: item["@id"],
        //layer: item['osm:highway'],
        type: "Feature",
        properties: {
          highway: item["osm:highway"],
          name: item["rdfs:label"] ? item["rdfs:label"] : "",
        },
        geometry: geometry,
      };
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
  extractWays(json, nodes, feats);
  return {
    type: "FeatureCollection",
    features: Array.from(feats.values()),
  };
}
