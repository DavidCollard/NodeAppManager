import express from "express";
import { NormalizedImport } from "../types";
import * as core from "express-serve-static-core";

//var app = express();
var routes = express.Router();
var modules: { [moduleName: string]: NormalizedImport } = {};


const registerApp = (app: core.Express) => {
    app.use((req, res, next) =>
        routes(req, res, next)
    );

    app.get("/NAM/moduleinfo", (req, res) => res.send(modules));
    app.get("/NAM/modulestack", (req, res) => res.send(routes.stack));
}


const rebuildRouter = () => {
    routes = express.Router();
    console.log("(RE)BUILDING START");

    for (let moduleName in modules) {
        let mod = modules[moduleName];
        console.log(`/${mod.folderName} (STATUS: ${mod.inError ? "IN ERROR" : "LOADED"})`);
        routes.use(`/${mod.folderName}`, mod.module);
    }

    console.log("(RE)BUILDING END");
};

const initRouter = (moduleImports: NormalizedImport[]) => {
    moduleImports.forEach(i => {
        modules[i.folderName] = i;
    });
    rebuildRouter();
};

// replaces it if it already exists
const addRoute = (moduleImport: NormalizedImport) => {
    modules[moduleImport.folderName] = moduleImport;
    rebuildRouter();
};

const deleteRoute = (moduleName: string) => {
    delete modules[moduleName];
    rebuildRouter();
};

const refreshTiming = (moduleName: string) => {
    let val = modules[moduleName].lastImported;
    modules[moduleName].lastImported = new Date();
    return val;
};

//export default app;
export { registerApp, initRouter, addRoute, deleteRoute, refreshTiming };
