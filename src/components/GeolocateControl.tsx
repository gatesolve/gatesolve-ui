import React, { useState, useEffect } from "react";
import type { MouseEventHandler } from "react";

export interface GeolocateControlProps {
  dataTestId?: string;
  onGeolocate: PositionCallback;
  onGeolocateError?: PositionErrorCallback;
  positionOptions?: PositionOptions;
  onEnable?: () => void;
  onDisable?: () => void;
  enableOnMount?: boolean;
}

const GeolocateControl: React.FC<GeolocateControlProps> = ({
  dataTestId,
  onGeolocate,
  onGeolocateError,
  positionOptions = { enableHighAccuracy: true, timeout: 6000 },
  onEnable,
  onDisable,
  enableOnMount = true,
}) => {
  const [isGeolocationSupported] = useState(
    window.navigator.geolocation != null
  );
  const [isPermissionsSupported] = useState(
    window.navigator.permissions != null
  );
  const [permissionState, setPermissionState] = useState(
    null as PermissionState | null
  );
  const [watchID, setWatchId] = useState(null as number | null);
  const [hasBeenUsed, setHasBeenUsed] = useState(false);

  const checkGeolocationPermission = (): void => {
    if (isPermissionsSupported) {
      window.navigator.permissions
        .query({ name: "geolocation" })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state);
          function setPermissionStateOnChange(this: PermissionStatus): void {
            setPermissionState(this.state);
          }
          // eslint-disable-next-line no-param-reassign
          permissionStatus.onchange = setPermissionStateOnChange;
        })
        .catch((error) => {
          // FIXME: Warn properly
          // eslint-disable-next-line no-console
          console.error("Permissions API exists but querying it fails:", error);
        });
    }
  };

  const startWatching = (): void => {
    if (isGeolocationSupported && watchID == null) {
      setWatchId(
        window.navigator.geolocation.watchPosition(
          onGeolocate,
          onGeolocateError,
          positionOptions
        )
      );
      setHasBeenUsed(true);
      if (onEnable != null) {
        onEnable();
      }
    }
  };

  const stopWatching = (): void => {
    if (isGeolocationSupported && watchID != null) {
      /**
       * Based on reading the Geolocation API spec (
       * https://www.w3.org/TR/2016/REC-geolocation-API-20161108/#geolocation_interface
       * ) and trying out in practice on Chromium, one can call clearWatch
       * regardless of permissions.
       */
      window.navigator.geolocation.clearWatch(watchID);
      setWatchId(null);
      if (onDisable != null) {
        onDisable();
      }
    }
  };

  const showWarningOfDeniedGeolocation = (): void => {
    // FIXME: Inform the user that geolocation is denied.
    // eslint-disable-next-line no-console
    console.log("Geolocation is denied. Inform the user.");
  };

  // Inform the user once if geolocation is not supported.
  useEffect(() => {
    if (!isGeolocationSupported) {
      // FIXME: Warn the user
      // eslint-disable-next-line no-console
      console.log("Geolocation is not supported. Inform the user.");
    }
  }, [isGeolocationSupported]);

  // Figure out the permissionState.
  useEffect(() => {
    if (
      isGeolocationSupported &&
      isPermissionsSupported &&
      permissionState == null
    ) {
      checkGeolocationPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn the user about denied permission.
  useEffect(() => {
    if (permissionState === "denied") {
      showWarningOfDeniedGeolocation();
      stopWatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionState]);

  /**
   * If Permissions API is supported, only allow clicking once the
   * PermissionState is known.
   */
  const isClickingAllowed = !isPermissionsSupported || permissionState != null;
  const isGeolocationOn = watchID != null;

  // Start watching on mount if asked.
  useEffect(() => {
    if (
      enableOnMount &&
      !hasBeenUsed &&
      isGeolocationSupported &&
      !isGeolocationOn &&
      (!isPermissionsSupported ||
        (permissionState != null && permissionState !== "denied"))
    ) {
      startWatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enableOnMount,
    hasBeenUsed,
    isGeolocationSupported,
    isGeolocationOn,
    isPermissionsSupported,
    permissionState,
  ]);

  const onClick: MouseEventHandler = (event) => {
    /**
     * Assume that Geolocation API exists.
     *
     * Assume either permissionState is known or the Permissios API is not
     * supported.
     */
    // FIXME: Maybe find a way so this does not need to be remembered.
    // eslint-disable-next-line no-console
    console.assert(isGeolocationSupported);
    // FIXME: Maybe find a way so this does not need to be remembered.
    // FIXME: Remove these debug asserts
    // eslint-disable-next-line no-console
    console.assert(isClickingAllowed);
    event.preventDefault();

    if (!isGeolocationOn) {
      if (isPermissionsSupported && permissionState === "denied") {
        // Warn the user again if they press the button.
        showWarningOfDeniedGeolocation();
      } else {
        startWatching();
      }
    } else {
      stopWatching();
    }
  };

  let element = null;
  if (isGeolocationSupported) {
    const ariaLabel = isGeolocationOn
      ? "Stop using my location"
      : "Find my location";
    const buttonClassName = isGeolocationOn
      ? "mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate mapboxgl-ctrl-geolocate-active"
      : "mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate";
    element = (
      <div className="mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-bottom-left">
        <button
          type="button"
          className={buttonClassName}
          data-testid={dataTestId}
          aria-label={ariaLabel}
          aria-pressed={isGeolocationOn}
          onContextMenu={(event): void => event.preventDefault()}
          onClick={isClickingAllowed ? onClick : undefined}
        >
          <span className="mapboxgl-ctrl-icon" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return element;
};

export default GeolocateControl;
