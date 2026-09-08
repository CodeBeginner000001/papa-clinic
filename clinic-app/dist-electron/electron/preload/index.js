import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("clinic", {
    app: {
        name: "Clinic App",
    },
});
//# sourceMappingURL=index.js.map