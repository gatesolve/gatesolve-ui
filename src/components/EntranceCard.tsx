import React, { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
} from "@material-ui/core";
import "@fontsource/noto-sans/400.css";

import {
  OlmapNote,
  OlmapUnloadingPlace,
  OlmapWorkplaceEntrance,
  OlmapWorkplace,
} from "../olmap";

interface EntranceCardProps {
  workplaceEntrance: OlmapWorkplaceEntrance;
  workplace: OlmapWorkplace;
  label: string;
  onEntranceSelected: (entranceId: number) => void;
  onUnloadingPlaceSelected: (unloadingPlace: OlmapUnloadingPlace) => void;
  onViewDetails: (note: OlmapNote) => void;
}

const EntranceCard: React.FC<EntranceCardProps> = ({
  workplaceEntrance,
  workplace,
  label,
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
          workplaceEntrance.description_translated,
          workplaceEntrance.delivery_types.join("; "),
        ]
          .filter((x) => x)
          .join(": ")}`}
        subheader={workplaceEntrance.delivery_hours || workplace.delivery_hours}
        // The following backgrounds are in case a long word overlaps the floated photo
        titleTypographyProps={{
          style: { background: "rgba(255,255,255,0.5)" },
        }}
        subheaderTypographyProps={{
          style: { background: "rgba(255,255,255,0.5)" },
        }}
      />
      <CardContent style={{ padding: 0 }}>
        <Typography variant="body2" color="textSecondary" component="p">
          {workplaceEntrance.delivery_instructions_translated}
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
            const osmId = workplaceEntrance.entrance_data.osm_feature;
            if (osmId) onEntranceSelected(osmId);
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
                {unloadingPlace.description_translated}
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
