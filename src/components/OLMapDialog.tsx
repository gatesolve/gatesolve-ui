import React from "react";
import IconButton from "@material-ui/core/IconButton";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import CloseIcon from "@material-ui/icons/Close";

import { olmapNoteURL } from "../olmap";

interface OLMapDialogProps {
  noteId?: number;
  onClose: () => void;
}

const OLMapDialog: React.FC<OLMapDialogProps> = ({ noteId, onClose }) => (
  <Dialog
    open={!!noteId}
    fullWidth
    PaperProps={{ style: { height: "100%", overflow: "hidden" } }}
  >
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
