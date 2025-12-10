declare module "electron-updater" {
  import { EventEmitter } from "events";
  export class AutoUpdater extends EventEmitter {
    logger: any;
    checkForUpdatesAndNotify(): Promise<any>;
    quitAndInstall(): void;
  }
  export const autoUpdater: AutoUpdater;
}
