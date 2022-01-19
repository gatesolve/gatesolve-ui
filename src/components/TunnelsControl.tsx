import React from "react";
import type { MouseEventHandler } from "react";

import { ReactComponent as TunnelIcon } from "./Tunnel.svg";

export interface TunnelsControlProps {
  dataTestId?: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const TunnelsControl: React.FC<TunnelsControlProps> = ({
  dataTestId,
  enabled,
  setEnabled,
}) => {
  const onClick: MouseEventHandler = (event) => {
    event.preventDefault();
    setEnabled(!enabled);
  };

  const ariaLabel = enabled ? "Hide tunnels" : "Show tunnels";
  const buttonClassName = enabled ? "mapboxgl-ctrl-icon" : "mapboxgl-ctrl-icon";
  const buttonColor = enabled ? "#33b5e5" : "#333";
  return (
    <div
      className="mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-bottom-left"
      style={{ marginBottom: 53 }}
    >
      <button
        type="button"
        className={buttonClassName}
        data-testid={dataTestId}
        aria-label={ariaLabel}
        aria-pressed={enabled}
        onContextMenu={(event): void => event.preventDefault()}
        onClick={onClick}
      >
        <span className="mapboxgl-ctrl-icon" aria-hidden="true">
          <TunnelIcon fill={buttonColor} />
        </span>
      </button>
    </div>
  );
};

export default TunnelsControl;
