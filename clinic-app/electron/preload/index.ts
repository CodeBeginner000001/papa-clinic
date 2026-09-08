import { contextBridge, ipcRenderer } from "electron";

import { IPC_CHANNELS } from "../ipc/channels.js";

contextBridge.exposeInMainWorld("clinic", {
  app: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),
  },
});