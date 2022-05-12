import React, { useState } from "react";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import Typography from "@material-ui/core/Typography";
import "@fontsource/noto-sans/400.css";

import {
  OlmapNote,
  OlmapUnloadingPlace,
  OlmapWorkplaceEntrance,
  OlmapWorkplace,
} from "../olmap";

import { translate } from "../translations";

interface EntranceCardProps {
  workplaceEntrance: OlmapWorkplaceEntrance;
  workplace: OlmapWorkplace;
  label: string;
  locale: string;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onViewDetails: (note: OlmapNote) => void;
}

const deliveryLabel = (
  deliveriesType: OlmapWorkplaceEntrance["deliveries"],
  locale: string
) => {
  if (deliveriesType === "main" || deliveriesType === "yes") {
    return translate("Delivery entrance", locale);
  }
  if (deliveriesType === "no") {
    return translate("Not for deliveries", locale);
  }
  return deliveriesType;
};

const EntranceCard: React.FC<EntranceCardProps> = ({
  workplaceEntrance,
  workplace,
  label,
  locale,
  onEntranceSelected,
  onUnloadingPlaceSelected,
  onViewDetails,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <Card
      variant="outlined"
      square
      style={{
        padding: "8px",
        borderLeft: "none",
        borderRight: "none",
        borderBottom: "none",
      }}
    >
      <CardHeader
        style={{ padding: 0 }}
        avatar={
          <Avatar
            style={{
              marginRight: 0,
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
            <span>{label}</span>
          </Avatar>
        }
        title={`${[
          deliveryLabel(workplaceEntrance.deliveries, locale),
          workplaceEntrance.description_translated ||
            workplaceEntrance.description,
          workplaceEntrance.delivery_types.join("; "),
        ]
          .filter((x) => x)
          .join(": ")}`}
        subheader={workplaceEntrance.delivery_hours || workplace.delivery_hours}
        // The following backgrounds are in case a long word overlaps the floated photo
        titleTypographyProps={{
          style: {
            background: "rgba(255,255,255,0.5)",
            fontWeight:
              workplaceEntrance.deliveries === "main" ? "bold" : undefined,
          },
        }}
        subheaderTypographyProps={{
          style: { background: "rgba(255,255,255,0.5)" },
        }}
      />
      <CardContent style={{ padding: 0, minHeight: "4px" }}>
        <Typography variant="body2" color="textSecondary" component="p">
          {workplaceEntrance.delivery_instructions_translated ||
            workplaceEntrance.delivery_instructions}
        </Typography>
      </CardContent>
      <CardActions style={{ padding: 0 }}>
        <Button
          variant="contained"
          size="small"
          style={{ backgroundColor: "#64be14", color: "#fff" }}
          type="button"
          aria-label="Set destination"
          onClick={(): void => {
            const id =
              workplaceEntrance.entrance_data.osm_feature ||
              workplaceEntrance.image_note.id;
            if (id) onEntranceSelected(id);
          }}
        >
          Destination
        </Button>
        <Button
          variant="contained"
          size="small"
          style={{ backgroundColor: "#ff5000", color: "#fff" }}
          type="button"
          aria-label="View details"
          onClick={(): void => onViewDetails(workplaceEntrance.image_note)}
        >
          View details
        </Button>
        <Button
          variant="text"
          size="small"
          style={{ color: "#00afff" }}
          type="button"
          aria-label={
            collapsed ? "Show unloading places" : "Hide unloading places"
          }
          onClick={(): void => setCollapsed(!collapsed)}
        >
          {collapsed ? "Show parking" : "Hide parking"}
        </Button>
      </CardActions>
      {!collapsed &&
        workplaceEntrance.unloading_places.map((unloadingPlace) => (
          <Card
            key={unloadingPlace.id}
            variant="outlined"
            style={{ margin: "8px", padding: "4px" }}
          >
            <CardContent style={{ padding: 0 }}>
              <Typography variant="body2" color="textSecondary" component="p">
                {unloadingPlace.description_translated ||
                  unloadingPlace.description}
              </Typography>
            </CardContent>
            <CardActions style={{ padding: 0 }}>
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
              <Button
                variant="contained"
                size="small"
                style={{ backgroundColor: "#ff5000", color: "#fff" }}
                type="button"
                aria-label="View details"
                onClick={(): void => onViewDetails(unloadingPlace.image_note)}
              >
                View details
              </Button>
            </CardActions>
          </Card>
        ))}
    </Card>
  );
};
export default EntranceCard;
