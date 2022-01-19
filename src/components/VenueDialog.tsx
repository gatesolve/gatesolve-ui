import React from "react";
import {
  IconButton,
  DialogTitle,
  DialogContent,
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

import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Point,
} from "geojson";

import {
  NetworkState,
  OlmapNote,
  OlmapResponse,
  OlmapUnloadingPlace,
} from "../olmap";

import EntranceCard from "./EntranceCard";

import { ReactComponent as HeightLimitSign } from "./HeightLimitSign.svg";

interface VenueDialogProps {
  open: boolean;
  collapsed: boolean;
  venueOlmapData?: NetworkState<OlmapResponse>;
  restrictions?: FeatureCollection;
  onClose: () => void;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onCollapsingToggled: () => void;
  onViewDetails: (note: OlmapNote) => void;
  onRestrictionSelected: (element: Feature<Point>) => void;
}

const getHeightRestriction = (
  tags: GeoJsonProperties
): number | string | undefined => {
  const restriction =
    tags && (tags["maxheight"] || tags["maxheight:physical"] || tags["height"]);
  return restriction as number | string | undefined;
};

const VenueDialog: React.FC<VenueDialogProps> = ({
  open,
  collapsed,
  venueOlmapData,
  restrictions,
  onClose,
  onEntranceSelected,
  onUnloadingPlaceSelected,
  onCollapsingToggled,
  onViewDetails,
  onRestrictionSelected,
}) => {
  if (
    venueOlmapData?.state !== "success" ||
    !venueOlmapData.response.workplace
  ) {
    return null;
  }
  const { workplace } = venueOlmapData.response;
  const workplaceEntrances = workplace.workplace_entrances;

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
        {workplace.max_vehicle_height && (
          <div
            style={{
              display: "inline-block",
              position: "relative",
              width: "2em",
              height: "2em",
              verticalAlign: "middle",
              marginRight: "0.5em",
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
        {restrictions &&
          restrictions.features
            .filter((feature) => getHeightRestriction(feature.properties))
            .map((feature) => (
              <button
                key={feature.properties?.["@id"]}
                type="button"
                style={{
                  float: "left",
                  position: "relative",
                  width: "2em",
                  height: "2em",
                  border: "none",
                  background: "none",
                  padding: 0,
                }}
                onClick={() =>
                  feature.geometry.type === "Point" &&
                  onRestrictionSelected(feature as Feature<Point>)
                }
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
                  {getHeightRestriction(feature.properties)}
                </div>
              </button>
            ))}
        <Typography variant="body2" color="textSecondary" component="p">
          {workplace.delivery_instructions}
        </Typography>
        <div style={{ clear: "both" }} />
        {workplaceEntrances.map((workplaceEntrance, index) => (
          <EntranceCard
            key={workplaceEntrance.id}
            workplaceEntrance={workplaceEntrance}
            workplace={workplace}
            onEntranceSelected={onEntranceSelected}
            onUnloadingPlaceSelected={onUnloadingPlaceSelected}
            onViewDetails={onViewDetails}
            label={romanize(index + 1)}
          />
        ))}
      </DialogContent>
    </Drawer>
  );
};
export default VenueDialog;
