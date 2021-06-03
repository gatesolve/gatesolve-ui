import React from "react";
import {
  Avatar,
  Button,
  IconButton,
  DialogTitle,
  DialogContent,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Typography,
  Drawer,
} from "@material-ui/core";
import "@fontsource/noto-sans/400.css";

import {
  Close as CloseIcon,
  ExpandLess as ExpandIcon, // https://material.io/components/sheets-bottom
  ExpandMore as CollapseIcon,
} from "@material-ui/icons";

import { romanize } from "romans";

import {
  NetworkState,
  OlmapResponse,
  OlmapUnloadingPlace,
  venueDataToUnloadingPlaces,
} from "../olmap";

import OLMapImages from "./OLMapImages";

interface VenueDialogProps {
  open: boolean;
  collapsed: boolean;
  venueOlmapData?: NetworkState<OlmapResponse>;
  onClose: () => void;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onCollapsingToggled: () => void;
}

const VenueDialog: React.FC<VenueDialogProps> = ({
  open,
  collapsed,
  venueOlmapData,
  onClose,
  onEntranceSelected,
  onUnloadingPlaceSelected,
  onCollapsingToggled,
}) => {
  if (
    venueOlmapData?.state !== "success" ||
    !venueOlmapData.response.workplace
  ) {
    return null;
  }
  const imageNotes = venueOlmapData.response.image_notes;
  const { workplace } = venueOlmapData.response;
  const workplaceEntrances = workplace.workplace_entrances;

  const workplaceAdditionalImageNotes = imageNotes.filter(
    (note) => note.image && note.tags.find((x) => x === "Workplace")
  );
  const workplaceProfileImages = workplace.image_note.image
    ? [workplace.image_note]
    : workplaceAdditionalImageNotes;

  const unloadingPlaces = venueDataToUnloadingPlaces(venueOlmapData);

  return (
    <Drawer
      open={open}
      anchor="bottom"
      variant="persistent"
      elevation={8}
      PaperProps={{
        style: {
          maxHeight: "45%", // 50% of the height under the app bar
          width: "100%",
          maxWidth: "600px",
          left: "50%",
          transform: "translateX(-50%)",
        },
        elevation: 8, // Need to repeat Drawer's elevation here
      }}
    >
      <DialogTitle>
        <IconButton
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
          }}
          onClick={() => onCollapsingToggled()}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </IconButton>
        {workplace.as_osm_tags.name}
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
          display: collapsed ? "none" : "block",
          overflow: "auto",
        }}
      >
        <OLMapImages
          onImageClick={() => {}}
          olmapData={{
            state: "success",
            response: {
              ...venueOlmapData.response,
              image_notes: workplaceProfileImages,
            },
          }}
        />
        <Typography variant="body2" color="textSecondary" component="p">
          {workplace.delivery_instructions}
        </Typography>
        {workplaceEntrances.map((workplaceEntrance, index) => (
          <Card
            key={workplaceEntrance.id}
            style={{ marginTop: "1em" }}
            variant="outlined"
          >
            <CardMedia
              component="img"
              image={workplaceEntrance.image_note.image}
              style={{
                width: "50%",
                height: "auto",
                float: "right",
              }}
            />
            <CardHeader
              avatar={
                <Avatar
                  style={{
                    background: "#af8dbc",
                    color: "#af8dbc",
                    textShadow: `
0      -1px 0.5px white,
1px    -1px 0.5px white,
1px    0    0.5px white,
1px    1px  0.5px white,
0      1px  0.5px white,
-1px   1px  0.5px white,
-1px   0    0.5px white,
-1px   -1px 0.5px white,
2px    -0.5px 0.5px white,
2px    0.5px  0.5px white,
-2px   -0.5px 0.5px white,
-2px   0.5px  0.5px white,
-0.5px 2px 0.5px white,
0.5px  2px 0.5px white,
-0.5px -2px 0.5px white,
0.5px  -2px 0.5px white,
-1.5px    1.5px  0.5px white,
1.5px    -1.5px  0.5px white,
-1.5px -1.5px 0.5px white,
1.5px    1.5px  0.5px white,
2px    0px 0.5px white,
0px    2px  0.5px white,
-2px   0px 0.5px white,
0px    -2px  0.5px white`,
                    font: '30px "Noto Sans"',
                  }}
                >
                  <span>{romanize(index + 1)}</span>
                </Avatar>
              }
              title={`${[
                workplaceEntrance.description,
                workplaceEntrance.delivery_types.join("; "),
              ]
                .filter((x) => x)
                .join(": ")}`}
              subheader={
                workplaceEntrance.delivery_hours || workplace.delivery_hours
              }
              // The following backgrounds are in case a long word overlaps the floated photo
              titleTypographyProps={{
                style: { background: "rgba(255,255,255,0.5)" },
              }}
              subheaderTypographyProps={{
                style: { background: "rgba(255,255,255,0.5)" },
              }}
            />
            <CardContent>
              <Typography variant="body2" color="textSecondary" component="p">
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
        ))}
        {unloadingPlaces.map((unloadingPlace) => (
          <Card
            key={unloadingPlace.id}
            style={{ marginTop: "1em" }}
            variant="outlined"
          >
            <CardMedia
              component="img"
              image={unloadingPlace.image_note.image}
              style={{
                width: "50%",
                height: "auto",
                float: "right",
              }}
            />
            <CardHeader
              title={unloadingPlace.as_osm_tags["parking:condition"]}
              subheader={unloadingPlace.opening_hours}
            />
            <CardContent>
              <Typography variant="body2" color="textSecondary" component="p">
                {unloadingPlace.description}
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                size="small"
                style={{ backgroundColor: "#00afff", color: "#fff" }}
                type="button"
                aria-label="Set origin"
                onClick={(): void => onUnloadingPlaceSelected(unloadingPlace)}
              >
                Origin
              </Button>
            </CardActions>
          </Card>
        ))}
      </DialogContent>
    </Drawer>
  );
};
export default VenueDialog;
