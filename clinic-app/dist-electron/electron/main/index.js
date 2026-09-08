import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const createWindow = () => {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, "../preload/index.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        window.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        window.loadFile(path.join(__dirname, "../../dist/index.html"));
    }
};
app.whenReady().then(() => {
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
//# sourceMappingURL=index.js.map