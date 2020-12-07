export const NAMESPACE_URI = "https://w3id.org/openstreetmap/terms#";
const NAMESPACE_REGEX = /^(https:\/\/w3id.org\/openstreetmap\/terms#|osm:)/;

export const triplesToTags = (
  subject: string,
  defined?: Record<string, string>,
  freeform?: Array<string>
): Record<string, string> => {
  const tags = { "@id": subject } as Record<string, string>;

  // Undo the mapping by openplannerteam/routable-tiles-ontology
  Object.entries(defined || {}).forEach(([property, object]) => {
    if (!property.startsWith(NAMESPACE_URI) && !property.startsWith("osm:"))
      return;
    if (
      property === "https://w3id.org/openstreetmap/terms#hasTag" ||
      property === "osm:hasTag"
    )
      return;
    const key = property.replace(NAMESPACE_REGEX, "");
    const value = object.replace(NAMESPACE_REGEX, "");
    // Special-case mappings: (XXX: should handle smoothness, oneway, osm:Dirt, some highway values ...)
    if (value === "NoAccess") {
      tags[key] = "no";
    } else if (value === "FreeAccess") {
      tags[key] = "yes";
    } else if (value === "OfficialAccess") {
      tags[key] = "official";
    } else if (key === "highway" && value === "UnderConstruction") {
      tags[key] = "construction";
    } else if (key === "construction" && value === "UnderConstruction") {
      tags[key] = "yes";
    } else {
      // Convert from Routable Tiles's CamelCase to OSM's lower_case
      tags[key] = value.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
    }
  });

  // Split osm:hasTag "key=value" into key => value
  freeform?.forEach((tag) => {
    const splitIndex = tag.indexOf("=");
    const key = tag.substring(0, splitIndex);
    const value = tag.substring(splitIndex + 1);
    tags[key] = value;
  });
  return tags;
};
