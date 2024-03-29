import type {
  Feature,
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson";

import { romanize } from "romans";

import type { ElementWithCoordinates } from "./overpass";

export type NetworkLoadingState = {
  state: "loading";
};

export type NetworkFailedState = {
  state: "failed";
  code: number;
  detail: string;
};

export type NetworkSuccessState<T> = {
  state: "success";
  response: T;
};

export type NetworkState<T> =
  | NetworkLoadingState
  | NetworkFailedState
  | NetworkSuccessState<T>;

export interface OlmapResponse {
  id: number;
  image_notes: Array<OlmapNote>;
  workplace: OlmapWorkplace | null;
}

export interface OlmapNote {
  id: number;
  image: string;
  tags: Array<string>;
  lat: string;
  lon: string;
}

export interface OlmapWorkplace {
  id: number;
  as_osm_tags: Record<string, string>;
  osm_feature: number | null;
  type?: number;
  delivery_hours?: string;
  delivery_instructions?: string;
  delivery_instructions_language?: string;
  delivery_instructions_translated?: string;
  workplace_entrances: Array<OlmapWorkplaceEntrance>;
  image_note: OlmapNote;
  max_vehicle_height?: string;
}

export interface OlmapWorkplaceEntrance {
  id: number;
  description: string;
  description_language?: string;
  description_translated?: string;
  deliveries: "main" | "yes" | "no" | "" | null;
  delivery_types: Array<string>;
  image_note: OlmapNote;
  entrance_data: OlmapEntranceData;
  delivery_hours?: string;
  delivery_instructions?: string;
  delivery_instructions_language?: string;
  delivery_instructions_translated?: string;
  workplace: number;
  entrance: number;
  unloading_places: Array<OlmapUnloadingPlace>;
}

export interface OlmapEntranceData {
  osm_feature: number | null;
  as_osm_tags: Record<string, string>;
}

export interface OlmapUnloadingPlace {
  id: number;
  as_osm_tags: Record<string, string>;
  osm_feature: number | null;
  image_note: OlmapNote;
  description?: string;
  description_language?: string;
  description_translated?: string;
  opening_hours?: string;
  entrances: Array<number>;
  access_points: Array<{ lat: number; lon: number }>;
}

// Raw serialisations as returned by /rest/workplaces/

export interface OlmapWorkplaceRaw {
  id: number;
  name: string;
  street: string;
  housenumber: string;
  unit: string;
  lat: number;
  lon: number;
  osm_feature: number | null;
  delivery_instructions: string;
  workplace_entrances: Array<OlmapWorkplaceEntranceRaw>;
  image_note_id: number;
  image: string;
  max_vehicle_height: string;
}

export interface OlmapWorkplaceEntranceRaw {
  id: number;
  description: string;
  deliveries: "main" | "yes" | "no" | "" | null;
  image_note_id: number;
  image: string;
  lat: number;
  lon: number;
  osm_feature: number;
  entrance_id: number;
  unloading_places: Array<OlmapUnloadingPlaceRaw>;
}

export interface OlmapUnloadingPlaceRaw {
  id: number;
  lat: number;
  lon: number;
  osm_feature: number | null;
  image_note_id: number;
  image: string;
  description: string;
  opening_hours: string;
  entrances: Array<number>;
  access_points: Array<{ lat: number; lon: number }>;
}

export const olmapNoteURL = (noteId: number): string =>
  `https://app.olmap.org/#/note/${noteId}`;

export const olmapNewNoteURL = (target: ElementWithCoordinates): string => {
  if (target.id === -1) {
    return `https://app.olmap.org/#/Notes/new/photo/@${target.lat},${target.lon}`;
  }
  return `https://app.olmap.org/#/Notes/new/${target.id}/photo/@${target.lat},${target.lon}`;
};

export const olmapNoteToElement = (
  note: OlmapNote
): ElementWithCoordinates => ({
  lat: Number(note.lat),
  lon: Number(note.lon),
  id: note.id,
  type: "olmap",
});

const deliveryTypePriorities = {
  main: 2,
  yes: 1,
  null: 0,
  "": 0,
  no: -1,
};

const processOlmapData = (data: OlmapResponse): OlmapResponse => {
  if (data.workplace) {
    data.workplace.workplace_entrances.sort(
      (a, b) =>
        deliveryTypePriorities[b.deliveries || "null"] -
        deliveryTypePriorities[a.deliveries || "null"]
    );
  }
  return data;
};

export const fetchOlmapUrl = async (
  url: string
): Promise<NetworkState<unknown> | undefined> => {
  try {
    const response = await fetch(url);
    try {
      const data = await response.json();
      if (!response.ok) {
        return {
          state: "failed",
          code: response.status,
          detail: data.detail,
        };
      }
      return {
        state: "success",
        response: data,
      };
    } catch (error) {
      return {
        state: "failed",
        code: response.status,
        detail: error,
      };
    }
  } catch (error) {
    return {
      state: "failed",
      code: 0,
      detail: error,
    };
  }
};

export const fetchOlmapWorkplace = async (
  olmapId: number,
  locale: string
): Promise<NetworkState<OlmapWorkplaceRaw> | undefined> => {
  if (olmapId === -1) {
    return undefined;
  }
  const response = await fetchOlmapUrl(
    `https://api.olmap.org/rest/workplaces/${olmapId}/?language=${locale}`
  );
  return response as NetworkState<OlmapWorkplaceRaw>;
};

export const fetchOlmapData = async (
  type: string,
  id: number,
  locale: string
): Promise<NetworkState<OlmapResponse> | undefined> => {
  if (id === -1) {
    return undefined;
  }
  const response = (await fetchOlmapUrl(
    type === "workplace"
      ? `https://api.olmap.org/rest/workplaces_with_note/${id}/?language=${locale}`
      : `https://api.olmap.org/rest/osm_features/${id}/?language=${locale}`
  )) as NetworkState<OlmapResponse>;
  if (response.state === "success") {
    if (type === "workplace") {
      const workplace = response.response as unknown as OlmapWorkplace;
      response.response = {
        id: workplace.id,
        workplace,
        image_notes: [workplace.image_note],
      };
    }
    response.response = processOlmapData(response.response);
  }
  return response;
};

export const venueDataToGeoJSON = (
  venueData: NetworkState<OlmapResponse>,
  osmData: Array<ElementWithCoordinates>
): FeatureCollection => {
  if (venueData?.state !== "success" || !venueData.response.workplace) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }
  const features = [] as Array<Feature<Geometry, GeoJsonProperties>>;
  osmData.forEach((entrance, index) => {
    const id =
      entrance.type === "olmap"
        ? `olmap/${entrance.id}`
        : `http://www.openstreetmap.org/${entrance.type}/${entrance.id}`;
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [entrance.lon, entrance.lat],
      },
      properties: {
        "@id": id,
        ...entrance.tags,
        "@venue-label": romanize(index + 1),
      },
    });
  });
  return {
    type: "FeatureCollection",
    features,
  };
};

const venueDataToUnloadingPlaceData = (
  venueData?: NetworkState<OlmapResponse>
): [Array<OlmapUnloadingPlace>, Record<number, Array<number>>] => {
  if (venueData?.state !== "success" || !venueData.response.workplace) {
    return [[], {}];
  }
  const workplaceEntrances = venueData.response.workplace.workplace_entrances;
  const unloadingPlaceEntrances = {} as Record<number, Array<number>>;
  const unloadingPlaces = workplaceEntrances.flatMap((workplaceEntrance) =>
    workplaceEntrance.unloading_places.flatMap((unloadingPlace) => {
      const foundEntrances = unloadingPlaceEntrances[unloadingPlace.id];
      const newEntrance =
        workplaceEntrance.entrance_data.osm_feature ||
        workplaceEntrance.image_note.id;
      if (foundEntrances) {
        if (newEntrance) foundEntrances.push(newEntrance);
        return [];
      }
      if (newEntrance) {
        unloadingPlaceEntrances[unloadingPlace.id] = [newEntrance];
      } else {
        unloadingPlaceEntrances[unloadingPlace.id] = [];
      }
      return [unloadingPlace];
    })
  );
  return [unloadingPlaces, unloadingPlaceEntrances];
};

export const venueDataToUnloadingPlaces = (
  venueData?: NetworkState<OlmapResponse>
): Array<OlmapUnloadingPlace> => venueDataToUnloadingPlaceData(venueData)[0];

export const venueDataToUnloadingPlaceEntrances = (
  venueData?: NetworkState<OlmapResponse>
): Record<number, Array<number>> => venueDataToUnloadingPlaceData(venueData)[1];
