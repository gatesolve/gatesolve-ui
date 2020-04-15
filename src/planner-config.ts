import "reflect-metadata";

import { FlexibleRoadPlanner } from "plannerjs";

import { RoutableTileCoordinate } from "plannerjs/lib/entities/tiles/coordinate";
import TYPES from "plannerjs/lib/types";
import RoutableTileProviderDefault from "plannerjs/lib/fetcher/tiles/RoutableTileProviderDefault";
import IRoutableTileProvider from "plannerjs/lib/fetcher/tiles/IRoutableTileProvider";
import RoutingPhase from "plannerjs/lib/enums/RoutingPhase";

import container from "plannerjs/lib/configs/road_planner";

const rootUri =
  process.env.REACT_APP_ROUTABLE_TILES?.replace(/\/$/, "") ||
  "https://tile.olmap.org/routable-tiles";

class RoutableTileProviderLocalhost extends RoutableTileProviderDefault {
  // eslint-disable-next-line class-methods-use-this
  public getIdForTileCoords(coordinate: RoutableTileCoordinate): string {
    return `${rootUri}/${coordinate.zoom}/${coordinate.x}/${coordinate.y}`;
  }
}

container.unbind(TYPES.RoutableTileProvider);
container
  .bind<IRoutableTileProvider>(TYPES.RoutableTileProvider)
  .to(RoutableTileProviderLocalhost)
  .inSingletonScope()
  .whenTargetTagged("phase", RoutingPhase.Base);
container
  .bind<IRoutableTileProvider>(TYPES.RoutableTileProvider)
  .to(RoutableTileProviderLocalhost)
  .inSingletonScope()
  .whenTargetTagged("phase", RoutingPhase.Transit);

// eslint-disable-next-line import/prefer-default-export
export const Planner = FlexibleRoadPlanner;
