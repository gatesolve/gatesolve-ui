import React from "react";

import { olmapNoteURL, NetworkState, OlmapResponse } from "../olmap";

import "./OLMapImages.css";

interface OLMapImagesProps {
  olmapData?: NetworkState<OlmapResponse>;
}

const OLMapImages: React.FC<OLMapImagesProps> = ({ olmapData }) => {
  let content;
  if (!olmapData) {
    content = "";
  } else if (olmapData.state === "loading") {
    content = <div className="loading" />;
  } else if (
    olmapData.state === "success" &&
    olmapData.response.image_notes?.filter((note) => note.image).length
  ) {
    content = olmapData.response.image_notes
      .filter((note) => note.image)
      .map((note) => (
        <a
          key={note.id}
          href={olmapNoteURL(note.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img src={note.image} alt="A photo of the entrance" />
        </a>
      ));
  } else {
    content = <div className="empty" />;
  }
  return <div className="olmapImages">{content}</div>;
};

export default OLMapImages;
