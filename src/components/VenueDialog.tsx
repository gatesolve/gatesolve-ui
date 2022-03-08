import React from "react";
import IconButton from "@material-ui/core/IconButton";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Typography from "@material-ui/core/Typography";
import Drawer from "@material-ui/core/Drawer";
import NativeSelect from "@material-ui/core/NativeSelect";
import "@fontsource/noto-sans/400.css";

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

import EntranceCard from "./EntranceCard";

import { ReactComponent as HeightLimitSign } from "./HeightLimitSign.svg";

interface VenueDialogProps {
  open: boolean;
  collapsed: boolean;
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

const localesAvailable =
  "English|en,Finnish|fi,Swedish|sv,Afrikaans|af,Albanian|sq,Amharic|am,Arabic|ar,Armenian|hy,Azerbaijani|az,Basque|eu,Belarusian|be,Bengali|bn,Bosnian|bs,Bulgarian|bg,Catalan|ca,Cebuano|ceb,Chinese (Simplified)|zh-CN,Chinese (Traditional)|zh-TW,Corsican|co,Croatian|hr,Czech|cs,Danish|da,Dutch|nl,Esperanto|eo,Estonian|et,French|fr,Frisian|fy,Galician|gl,Georgian|ka,German|de,Greek|el,Gujarati|gu,Haitian Creole|ht,Hausa|ha,Hawaiian|haw,Hebrew|he,Hindi|hi,Hmong|hmn,Hungarian|hu,Icelandic|is,Igbo|ig,Indonesian|id,Irish|ga,Italian|it,Japanese|ja,Javanese|jv,Kannada|kn,Kazakh|kk,Khmer|km,Kinyarwanda|rw,Korean|ko,Kurdish|ku,Kyrgyz|ky,Lao|lo,Latvian|lv,Lithuanian|lt,Luxembourgish|lb,Macedonian|mk,Malagasy|mg,Malay|ms,Malayalam|ml,Maltese|mt,Maori|mi,Marathi|mr,Mongolian|mn,Myanmar (Burmese)|my,Nepali|ne,Norwegian|no,Nyanja (Chichewa)|ny,Odia (Oriya)|or,Pashto|ps,Persian|fa,Polish|pl,Portuguese (Portugal, Brazil)|pt,Punjabi|pa,Romanian|ro,Russian|ru,Samoan|sm,Scots Gaelic|gd,Serbian|sr,Sesotho|st,Shona|sn,Sindhi|sd,Sinhala (Sinhalese)|si,Slovak|sk,Slovenian|sl,Somali|so,Spanish|es,Sundanese|su,Swahili|sw,Tagalog (Filipino)|tl,Tajik|tg,Tamil|ta,Tatar|tt,Telugu|te,Thai|th,Turkish|tr,Turkmen|tk,Ukrainian|uk,Urdu|ur,Uyghur|ug,Uzbek|uz,Vietnamese|vi,Welsh|cy,Xhosa|xh,Yiddish|yi,Yoruba|yo,Zulu|zu"
    .split(",")
    .map((entry) => entry.split("|"));

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
        <div style={{ float: "right" }}>
          <NativeSelect
            inputProps={{
              id: "locale",
              name: "locale",
            }}
            onChange={(event) => {
              const selectedLocale = event.target.value;
              if (selectedLocale !== locale) {
                onLocaleSelected(selectedLocale);
              }
            }}
            style={{ paddingTop: 0, maxWidth: 90 }}
          >
            <option key="" value="" selected={locale === ""}>
              {locale === "" ? "Translate" : "Original"}
            </option>
            {localesAvailable.map(([name, code]) => (
              <option key={code} value={code} selected={locale === code}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
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
          {translatedText(workplace, "delivery_instructions", onLocaleSelected)}
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
