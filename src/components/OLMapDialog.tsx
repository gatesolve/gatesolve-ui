import React from "react";
import { IconButton, Dialog, DialogTitle } from "@material-ui/core";
import { Close as CloseIcon } from "@material-ui/icons";

import { olmapNoteURL } from "../olmap";

interface OLMapDialogProps {
  noteId?: number;
  onClose: () => void;
}

const OLMapDialog: React.FC<OLMapDialogProps> = ({ noteId, onClose }) => (
  <Dialog open={!!noteId} fullWidth PaperProps={{ style: { height: "100%" } }}>
    {noteId && (
      <>
        <DialogTitle>
          Note on OLMap
          <IconButton
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
            }}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <div
          style={{
            height: "100%",
            borderTop: "1px solid rgba(0, 0, 0, 0.12)",
          }}
        >
          <iframe
            title="OLMap note editor"
            src={olmapNoteURL(noteId)}
            style={{
              border: "none",
              padding: 0,
              margin: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </>
    )}
  </Dialog>
);
export default OLMapDialog;
