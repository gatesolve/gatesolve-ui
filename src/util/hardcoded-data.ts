import type { Feature } from "geojson";

const BLACKLIST = [
  16, 17, 20, 22, 23, 24, 25, 27, 29, 39, 40, 41, 42, 45, 46, 47, 49, 50, 51,
  52, 53, 54, 55, 61, 67, 98, 103, 104, 105, 126, 142, 144, 145, 146, 147, 148,
  166, 189, 190, 191, 192, 193, 194, 195, 196, 207, 208, 280, 327, 328, 335,
  342, 346, 349, 351, 352, 353, 354, 355, 356, 357, 359, 361, 362, 1298, 2295,
  2842, 4437, 7167, 7168, 7216, 7354, 7419, 7459, 7460, 7461, 7462, 7463, 7464,
  7465, 7467, 7468, 7497, 7505, 7542, 7543, 7544, 7545, 7614, 7640, 7667, 7690,
  7691, 7692, 7693, 7694, 7795, 7834,
];

// eslint-disable-next-line import/prefer-default-export
export const filterBlacklistedParking = (features: Feature[]): Feature[] => {
  return features.filter(
    (feature) => !BLACKLIST.find((id) => id === feature.properties?.["hel:id"])
  );
};
