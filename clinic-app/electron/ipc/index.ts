import { registerAppHandlers } from "./handlers/app.handlers.js";

export const registerIpcHandlers = (): void => {
  registerAppHandlers();
};