import { addRoute, deleteRoute, initRouter, refreshTiming, registerApp } from "./corelib/routeManager";
import { startup } from "./corelib/import/import";
import { NAMImportConfig } from "./types";
import * as core from "express-serve-static-core";

const init = (app: core.Express, importConfig: NAMImportConfig) => {
    registerApp(app);
    startup(importConfig, initRouter, addRoute, deleteRoute, refreshTiming);
};

export default init;