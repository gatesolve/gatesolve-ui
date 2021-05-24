import React from "react";
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
} from "@material-ui/core";
import { Close as CloseIcon } from "@material-ui/icons";

import { NetworkState, OlmapResponse } from "../olmap";

import OLMapImages from "./OLMapImages";

interface VenueDialogProps {
  open: boolean;
  venueOlmapData?: NetworkState<OlmapResponse>;
  onClose: () => void;
  onEntranceSelected: (entranceId: number) => void;
}

const VenueDialog: React.FC<VenueDialogProps> = ({
  open,
  venueOlmapData,
  onClose,
  onEntranceSelected,
}) => (
  <Dialog
    open={
      open &&
      venueOlmapData?.state === "success" &&
      !!venueOlmapData?.response.workplace
    }
    fullWidth
    PaperProps={{ style: { height: "100%", overflow: "hidden" } }}
  >
    {venueOlmapData?.state === "success" && (
      <>
        <DialogTitle>
          {venueOlmapData.response.workplace?.as_osm_tags.name}
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
        <DialogContent
          style={{
            overflow: "auto",
          }}
        >
          <OLMapImages
            onImageClick={() => {}}
            olmapData={{
              state: "success",
              response: {
                ...venueOlmapData.response,
                image_notes: venueOlmapData.response.image_notes?.filter(
                  (note) =>
                    note.image && note.tags.find((x) => x === "Workplace")
                ),
              },
            }}
          />
          <Typography variant="body2" color="textSecondary" component="p">
            {venueOlmapData.response.workplace?.delivery_instructions}
          </Typography>
          {(venueOlmapData.response.workplace?.workplace_entrances || []).map(
            (workplaceEntrance) => (
              <Card
                key={workplaceEntrance.id}
                style={{ marginTop: "1em" }}
                variant="outlined"
              >
                <CardHeader
                  title={workplaceEntrance.delivery_types.join("; ")}
                  subheader={
                    workplaceEntrance.delivery_hours ||
                    venueOlmapData.response.workplace?.delivery_hours
                  }
                />
                <CardContent>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    component="p"
                  >
                    {workplaceEntrance.delivery_instructions}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    size="small"
                    style={{ backgroundColor: "#64be14", color: "#fff" }}
                    type="button"
                    aria-label="Set destination"
                    onClick={(): void =>
                      onEntranceSelected(
                        workplaceEntrance.entrance_data.osm_feature
                      )
                    }
                  >
                    Destination
                  </Button>
                </CardActions>
              </Card>
            )
          )}
        </DialogContent>
      </>
    )}
  </Dialog>
);
export default VenueDialog;
