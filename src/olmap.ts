import type { ElementWithCoordinates } from "./overpass";

export type NetworkLoadingState = {
  state: "loading";
};

export type NetworkFailedState = {
  state: "failed";
  code: number;
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
  associated_entrances: Array<number>;
  image_notes: Array<OlmapNote>;
  workplace?: OlmapWorkplace;
  detail?: string;
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
  osm_feature: number;
  type: number;
  delivery_hours: string;
  delivery_instructions: string;
  workplace_entrances: Array<OlmapWorkplaceEntrance>;
}

export interface OlmapWorkplaceEntrance {
  id: number;
  delivery_types: Array<string>;
  image_note: OlmapNote;
  entrance_data: OlmapEntranceData;
  delivery_hours: string;
  delivery_instructions: string;
  workplace: number;
  entrance: number;
  unloading_places: Array<OlmapUnloadingPlace>;
}

export interface OlmapEntranceData {
  osm_feature: number;
}

export interface OlmapUnloadingPlace {
  id: number;
  as_osm_tags: Record<string, string>;
  osm_feature: number;
  image_note: OlmapNote;
  description: string;
  opening_hours: string;
  entrances: Array<number>;
}

export const olmapNoteURL = (noteId: number): string =>
  `https://app.olmap.org/#/note/${noteId}`;

export const olmapNewNoteURL = (target: ElementWithCoordinates): string => {
  if (target.id === -1) {
    return `https://app.olmap.org/#/Notes/new/photo/@${target.lat},${target.lon}`;
  }
  return `https://app.olmap.org/#/Notes/new/${target.id}/photo/@${target.lat},${target.lon}`;
};

export const fetchOlmapData = async (
  osmId: number
): Promise<NetworkState<OlmapResponse> | undefined> => {
  if (osmId === -1) {
    return undefined;
  }
  try {
    const response = await fetch(
      `https://api.olmap.org/rest/osm_features/${osmId}/`
    );
    try {
      const data = await response.json();
      return {
        state: "success",
        response: data as OlmapResponse,
      };
    } catch {
      return {
        state: "failed",
        code: response.status,
      };
    }
  } catch {
    return {
      state: "failed",
      code: 0,
    };
  }
};
