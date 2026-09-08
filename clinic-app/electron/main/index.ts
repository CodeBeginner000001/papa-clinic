import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppConfig } from "../config/app.config.js";
import { registerIpcHandlers } from "../ipc/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = (): void => {
    const config = loadAppConfig();
  const window = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minHeight: config.window.minHeight,
    minWidth: config.window.minWidth,

    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(
      path.join(__dirname, "../../dist/index.html"),
    );
  }
};

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});