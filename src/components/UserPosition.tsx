import React from "react";

export interface UserPositionProps {
  dataTestId?: string;
  width?: string;
  height?: string;
  stroke?: string;
  strokeWidth?: string;
}

const UserPosition: React.FC<UserPositionProps> = ({
  dataTestId,
  width = "40",
  height = "40",
  stroke = "#00afff",
  strokeWidth = "16",
}) => (
  <svg
    data-testid={dataTestId}
    width={width}
    height={height}
    stroke={stroke}
    strokeWidth={strokeWidth}
    viewBox="-100 -100 200 200"
    fill="transparent"
    style={{ position: "absolute" }}
  >
    <circle cx="0" cy="0" r="24" />
    <circle cx="0" cy="0" r="46" />
    <circle cx="0" cy="0" r="68" />
  </svg>
);

export default UserPosition;
