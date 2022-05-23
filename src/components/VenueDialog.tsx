import React from "react";
import IconButton from "@material-ui/core/IconButton";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import "@fontsource/noto-sans/400.css";

import AddCommentIcon from "@material-ui/icons/AddComment";
import CloseIcon from "@material-ui/icons/Close";
import ExpandIcon from "@material-ui/icons/ExpandLess"; // https://material.io/components/sheets-bottom
import CollapseIcon from "@material-ui/icons/ExpandMore";

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

import type { ElementWithCoordinates } from "../overpass";

import EntranceCard from "./EntranceCard";
import LocaleSelect from "./LocaleSelect";

import { ReactComponent as HeightLimitSign } from "./HeightLimitSign.svg";

interface VenueDialogProps {
  open: boolean;
  collapsed: boolean;
  venue?: ElementWithCoordinates;
  venueOlmapData?: NetworkState<OlmapResponse>;
  restrictions?: FeatureCollection;
  locale: string;
  onClose: () => void;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onCollapsingToggled: () => void;
  onViewDetails: (note: OlmapNote) => void;
  onRestrictionSelected: (element: Feature<Point>) => void;
  onLocaleSelected: (locale: string) => void;
}

const getHeightRestriction = (
  tags: GeoJsonProperties
): number | string | undefined => {
  const restriction =
    tags && (tags["maxheight"] || tags["maxheight:physical"] || tags["height"]);
  return restriction as number | string | undefined;
};

const translatedText = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any,
  fieldName: string,
  onLocaleSelected: (locale: string) => void
) => {
  return (
    <>
      {record[`${fieldName}_translated`] || record[fieldName]}
      {record[`${fieldName}_translated`] &&
        record[`${fieldName}_translated`] !== record[fieldName] && (
          <span>
            {" "}
            {
              // eslint-disable-next-line jsx-a11y/anchor-is-valid
              <a
                href="#"
                style={{
                  display: "inline",
                  color: "#aaa",
                  background: "none",
                  border: "none",
                  textDecoration: "none",
                }}
                onClick={(event): void => {
                  event.preventDefault();
                  onLocaleSelected("");
                }}
              >
                Translated by Google. View original.
              </a>
            }
          </span>
        )}
    </>
  );
};

const VenueDialog: React.FC<VenueDialogProps> = ({
  open,
  collapsed,
  venue,
  venueOlmapData,
  restrictions,
  locale,
  onClose,
  onEntranceSelected,
  onUnloadingPlaceSelected,
  onCollapsingToggled,
  onViewDetails,
  onRestrictionSelected,
  onLocaleSelected,
}) => {
  if (!venue || !open) {
    return null;
  }

  const workplace =
    (venueOlmapData?.state === "success" &&
      venueOlmapData.response.workplace) ||
    undefined;
  const workplaceEntrances = workplace?.workplace_entrances;

  const restrictionFeatureMap = new Map<string, Feature>();
  restrictions?.features
    .filter((feature) => getHeightRestriction(feature.properties))
    .forEach((restriction) => {
      restrictionFeatureMap.set(restriction.properties?.["@id"], restriction);
    });
  const restrictionFeatures = Array.from(restrictionFeatureMap.values());

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
        {workplace && (
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
        )}
        {venue && (
          <IconButton
            aria-label="Comment"
            href={`https://app.olmap.org/#/ww/osm/${venue.type}/${venue.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              top: "8px",
              left: "48px",
            }}
          >
            <AddCommentIcon
              style={{
                color: "#ff5000",
              }}
            />
          </IconButton>
        )}
        {workplace?.max_vehicle_height && (
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
        {workplace?.as_osm_tags.name || venue.tags?.name || ""}
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
      {workplace && (
        <DialogContent
          style={{
            display: collapsed ? "none" : "block",
            overflow: "auto",
            textAlign: "left",
            paddingTop: 0,
          }}
        >
          <div style={{ float: "right" }}>
            <LocaleSelect locale={locale} onLocaleSelected={onLocaleSelected} />
          </div>
          {restrictionFeatures.map((feature) => (
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
          <Typography
            variant="body2"
            color="textSecondary"
            component="p"
            style={{ paddingBottom: "4px" }}
          >
            {translatedText(
              workplace,
              "delivery_instructions",
              onLocaleSelected
            )}
          </Typography>
          <div style={{ clear: "both" }} />
          {workplaceEntrances?.map((workplaceEntrance, index) => (
            <EntranceCard
              key={workplaceEntrance.id}
              workplaceEntrance={workplaceEntrance}
              workplace={workplace}
              onEntranceSelected={onEntranceSelected}
              onUnloadingPlaceSelected={onUnloadingPlaceSelected}
              onViewDetails={onViewDetails}
              label={romanize(index + 1)}
              locale={locale}
            />
          ))}
        </DialogContent>
      )}
    </Drawer>
  );
};
export default VenueDialog;
