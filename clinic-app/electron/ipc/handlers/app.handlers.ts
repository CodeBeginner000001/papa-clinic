import { ipcMain } from "electron";

import { IPC_CHANNELS } from "../channels.js";
import { loadAppConfig } from "../../config/app.config.js";

export const registerAppHandlers = (): void => {
  ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, () => {
    const config = loadAppConfig();

    return {
      name: config.application.name,
      version: config.application.version,
      description: config.application.description,
    };
  });
};