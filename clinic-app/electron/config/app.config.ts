import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export interface AppConfig {
  application: {
    name: string;
    version: string;
    description: string;
  };

  window: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  };
}

export const loadAppConfig = (): AppConfig => {
  const configPath = app.isPackaged
    ? path.join(process.resourcesPath, "config", "app.json")
    : path.join(process.cwd(), "electron", "config", "app.json");

  const configFile = fs.readFileSync(configPath, "utf-8");

  return JSON.parse(configFile) as AppConfig;
};