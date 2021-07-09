import React from "react";

import { olmapNoteURL, NetworkState, OlmapResponse } from "../olmap";

interface OLMapImagesProps {
  onImageClick: (event: React.MouseEvent<HTMLElement>) => void;
  olmapData?: NetworkState<OlmapResponse>;
}

const OLMapImages: React.FC<OLMapImagesProps> = ({
  onImageClick,
  olmapData,
}) => {
  const content =
    olmapData?.state === "success" &&
    olmapData?.response?.image_notes
      ?.filter((note) => note.image)
      .slice(0, 1) // take 1
      .map((note) => (
        <a
          key={note.id}
          href={olmapNoteURL(note.id)}
          onClick={onImageClick}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex" }}
        >
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img
            style={{ maxWidth: "100%", maxHeight: "150px" }}
            src={note.image}
            alt="A photo of the entrance"
          />
        </a>
      ));
  return <div style={{ textAlign: "center" }}>{content}</div>;
};

export default OLMapImages;
