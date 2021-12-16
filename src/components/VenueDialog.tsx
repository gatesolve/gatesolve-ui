import React from "react";
import {
  Button,
  IconButton,
  DialogTitle,
  DialogContent,
  Card,
  CardActions,
  CardContent,
  CardHeader,
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
  OlmapWorkplaceEntrance,
  venueDataToUnloadingPlaces,
} from "../olmap";

import EntranceCard from "./EntranceCard";

import { ReactComponent as HeightLimitSign } from "./HeightLimitSign.svg";

interface VenueDialogProps {
  open: boolean;
  collapsed: boolean;
  venueOlmapData?: NetworkState<OlmapResponse>;
  onClose: () => void;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onCollapsingToggled: () => void;
  onViewDetails: (workplaceEntrance: OlmapWorkplaceEntrance) => void;
}

const VenueDialog: React.FC<VenueDialogProps> = ({
  open,
  collapsed,
  venueOlmapData,
  onClose,
  onEntranceSelected,
  onUnloadingPlaceSelected,
  onCollapsingToggled,
  onViewDetails,
}) => {
  if (
    venueOlmapData?.state !== "success" ||
    !venueOlmapData.response.workplace
  ) {
    return null;
  }
  const { workplace } = venueOlmapData.response;
  const workplaceEntrances = workplace.workplace_entrances;

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
          textAlign: "left",
          paddingTop: 0,
        }}
      >
        {workplace.max_vehicle_height && (
          <div
            style={{
              float: "left",
              position: "relative",
              width: "2em",
              height: "2em",
            }}
          >
            <HeightLimitSign style={{ width: "100%", height: "100%" }} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                fontSize: "0.7em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {workplace.max_vehicle_height}
            </div>
          </div>
        )}
        <Typography variant="body2" color="textSecondary" component="p">
          {workplace.delivery_instructions}
        </Typography>
        {workplaceEntrances.map((workplaceEntrance, index) => (
          <EntranceCard
            key={workplaceEntrance.id}
            workplaceEntrance={workplaceEntrance}
            workplace={workplace}
            onEntranceSelected={onEntranceSelected}
            onViewDetails={onViewDetails}
            label={romanize(index + 1)}
          />
        ))}
        {unloadingPlaces.map((unloadingPlace) => (
          <Card key={unloadingPlace.id} variant="outlined">
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
