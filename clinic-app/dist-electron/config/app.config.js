import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
export const loadAppConfig = () => {
    const configPath = app.isPackaged
        ? path.join(process.resourcesPath, "config", "app.json")
        : path.join(process.cwd(), "electron", "config", "app.json");
    const configFile = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(configFile);
};
//# sourceMappingURL=app.config.js.map