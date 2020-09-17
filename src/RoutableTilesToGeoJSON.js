// Original source: https://github.com/openplannerteam/leaflet-routable-tiles/blob/master/lib/RoutableTilesToGeoJSON.js

import {
  bearing as turfBearing,
  lineString as turfLineString,
  booleanClockwise as turfBooleanClockwise,
} from "@turf/turf";

const offset = 0.2;

var extractWays = function (json, nodes, feats) {
  json["@graph"]
    .filter((item) => {
      return (
        item["@type"] === "osm:Way"
        /* FIXME: Implement proper support for multipolygon outlines
           and then re-enable the following filter:
             && item["osm:hasTag"]?.find((tag) => tag.startsWith("building="))
         */
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
      if (nodeIds.length < 4) {
        console.log("not an area", item["@id"]);
        return;
      }
      if (nodeIds[0] !== nodeIds[nodeIds.length - 1]) {
        console.log("unclosed", item["@id"]);
      }
      item["osm:hasNodes"].forEach((nodeId, index, nodeIds) => {
        const node = feats[nodeId];
        if (node) {
          // FIXME: This logic does not consider inner edges of multipolygons:
          const isWayClockwise = turfBooleanClockwise(
            turfLineString(nodeIds.map((id) => nodes[id]))
          );
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
            bearingPrev > bearingNext
              ? entranceAngle + 270
              : entranceAngle + 90;
          const angle = isWayClockwise ? adaptedAngle : adaptedAngle + 180;

          node.properties = {
            ...node.properties,
            "@offset": [
              Math.cos((angle / 180) * Math.PI) * offset,
              Math.sin((angle / 180) * Math.PI) * offset,
            ],
            "@rotate": (((angle - 90) % 360) + 360) % 360,
          };
        }
      });
    });
};

const entranceToLabel = function (node) {
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
  for (var i = 0; i < json["@graph"].length; i++) {
    let element = json["@graph"][i];
    if (element["geo:lat"] && element["geo:long"]) {
      // Store the coordinates of every node for later reference
      const lngLat = [element["geo:long"], element["geo:lat"]];
      nodes[element["@id"]] = lngLat;

      if (element["osm:hasTag"]?.find((tag) => tag.startsWith("entrance="))) {
        // Create a GeoJSON feature for each entrance
        const entranceLabel = entranceToLabel(element);
        const entrance = {
          id: element["@id"],
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: lngLat,
          },
          properties: {
            "@id": element["@id"],
            "@entrance-label": entranceLabel.entrance,
            "@house-label": entranceLabel.house,
          },
        };
        // Store each OSM tag as a feature property
        // XXX: Could be computed later on demand
        element["osm:hasTag"].forEach((tag) => {
          const splitIndex = tag.indexOf("=");
          entrance.properties[tag.substring(0, splitIndex)] = tag.substring(
            splitIndex + 1
          );
        });

        entrances[entrance.properties["@id"]] = entrance;
      }
    }
  }
  extractWays(json, nodes, entrances);
  return {
    type: "FeatureCollection",
    features: Object.values(entrances),
  };
}
