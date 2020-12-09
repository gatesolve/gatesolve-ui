import React from "react";

import { olmapNoteURL, NetworkState, OlmapResponse } from "../olmap";

interface OLMapImagesProps {
  olmapData?: NetworkState<OlmapResponse>;
}

const OLMapImages: React.FC<OLMapImagesProps> = ({ olmapData }) => {
  const content =
    olmapData?.state === "success" &&
    olmapData?.response?.image_notes
      ?.filter((note) => note.image)
      .slice(0, 1) // take 1
      .map((note) => (
        <a
          key={note.id}
          href={olmapNoteURL(note.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img
            style={{ maxWidth: "250px", maxHeight: "150px" }}
            src={note.image}
            alt="A photo of the entrance"
          />
        </a>
      ));
  return <div className="olmapImages">{content}</div>;
};

export default OLMapImages;
