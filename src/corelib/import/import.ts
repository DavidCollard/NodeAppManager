import fs from "fs";
import path from "path";
import { NAMImportConfig, ModuleImport, NormalizedImport, ProcessedPath } from "../../types";
import { fileExistsLazy, importPromiseProvider, getDirReader, isFileDir } from "./fsWrapper";
import express, { Router } from "express";
import processPath from "./processPath";

const loadAppFromFolder = (importConfig: NAMImportConfig) => {
    return async (folderName: string, importPromiseProvider: (path: String) => Promise<NodeModule>) => {

        const appPath = importConfig.appsPath + path.sep + folderName;
        const importPath = appPath + path.sep + importConfig.exportFileName;

        const folderExists = await fileExistsLazy(appPath);
        if (!folderExists) {
            let val: ModuleImport = {
                folderName: folderName,
                err: new Error(`Could not load app '${folderName}' as it's folder doesn't exist`)
            };
            return Promise.resolve(val);
        }

        const isDir = await isFileDir(appPath);
        if (!isDir) {
            let val: ModuleImport = {
                folderName: folderName,
                err: new Error(`Could not load app '${folderName}' as it isn't a directory`)
            };
            return Promise.resolve(val);
        }

        const exists = await fileExistsLazy(importPath);
        if (!exists) {
            let val: ModuleImport = {
                folderName: folderName,
                err: new Error(`Could not load app '${folderName}' as it didn't have an '${importConfig.exportFileName}' file`)
            };
            return Promise.resolve(val);
        }

        let retVal: Promise<ModuleImport> = importPromiseProvider(importPath)
            .then((mod: NodeModule) => {
                let exp: { default?: any } = {};

                // hacky case because of dynamic export properties in ESM
                let esmMod: any = mod;
                if ("default" in esmMod) {
                    exp.default = esmMod.default;
                }
                if (mod.exports && "default" in mod.exports) {
                    exp.default = mod.exports.default;
                }
                return Promise.resolve({ folderName: folderName, module: exp });
            })
            .catch((i: any) => {
                let val: ModuleImport = {
                    folderName: folderName,
                    err: new Error(`Failed during the import of '${importConfig.exportFileName}' for '${appPath}': ${i}`)
                };
                return Promise.resolve(val);

            });

        return retVal;
    };
};

const importAllFromRoot: (importConfig: NAMImportConfig) => Promise<ModuleImport[]> = async (importConfig) => {
    let exists = await fileExistsLazy(importConfig.appsPath);
    if (!exists) {
        throw new Error(`'${importConfig.appsPath}' could not be found.`);
    }

    let importDirs: string[];
    try {
        importDirs = await getDirReader(importConfig.appsPath)();
    }
    catch (err) {
        throw new Error(`Directory '${importConfig.appsPath}' could not be read: ${err}`);
    }
    let importer = importPromiseProvider(false);
    let loader = loadAppFromFolder(importConfig);
    let pImportDirs = importDirs.map(i => processPath(i, importConfig.extension));

    let promises: Promise<ModuleImport>[] = pImportDirs.filter(i => i.isValid).map(i => loader(i.rootName, importer));

    try {
        return await Promise.all(promises);
    }
    catch (err) {
        throw err;
    }
};

const normalizeModule = (moduleImport: ModuleImport) => {
    let sanitizedModule: NormalizedImport;

    if (moduleImport.err) {
        console.log(moduleImport);
        let router = express.Router();
        sanitizedModule = { folderName: moduleImport.folderName, module: router, lastImported: new Date(), inError: true, _storage: moduleImport.err };
        router.get("/", (req, res) => {
            res.status(500);
            res.send(sanitizedModule._storage.toString());
        });
    }
    else if (moduleImport.module.default instanceof Function && moduleImport.module.default.name === "router") {
        console.log(`importing ${moduleImport.folderName} as an express router`);
        sanitizedModule = { folderName: moduleImport.folderName, module: moduleImport.module.default as Router, lastImported: new Date(), inError: false };
    }
    else if (moduleImport.module.default instanceof Function) {
        console.log(`importing ${moduleImport.folderName} as a function and wrapping in an express router`);
        let router = express.Router();
        sanitizedModule = { folderName: moduleImport.folderName, module: router, lastImported: new Date(), inError: false, _storage: moduleImport.module.default };
        router.post("/", (req, res) => {
            res.send(sanitizedModule._storage(req).toString());
        });
    }
    else {
        console.log(`importing ${moduleImport.folderName} as a static value and wrapping in an express router`);
        let router = express.Router();
        sanitizedModule = { folderName: moduleImport.folderName, module: router, lastImported: new Date(), inError: false, _storage: moduleImport.module.default };
        router.get("/", (req, res) => {
            res.send(sanitizedModule._storage.toString());
        });
    }
    return sanitizedModule;
};

const createFsEventHandler: (
    onAdd: (moduleImport: NormalizedImport) => void,
    onRemove: (name: string) => void,
    refreshTiming: (name: string) => Date,
    importConfig: NAMImportConfig) =>
    ((_event: any, filename: string) => void) =
    (onAdd, onRemove, refreshTiming, importConfig) => {
        const importProvider = importPromiseProvider(true);
        const loadApp = loadAppFromFolder(importConfig);

        return async (_event, filename) => {
            const watchPath = importConfig.appsPath;

            let ppath: ProcessedPath = processPath(filename, importConfig.extension);

            if (!ppath.isValid)
            {
                console.log(`skipping ${filename} since it didn't meet the extension triggers`);
                return;
            }

            let lastImported = refreshTiming(ppath.rootName);
            let currTime = new Date();
            if (currTime.getTime() - lastImported.getTime() <= importConfig.reimportDelay) {
                return;
            }

            const exists = await fileExistsLazy(watchPath + path.sep + ppath.rootName);
            if (exists) {
                let reimportedModule = await loadApp(ppath.rootName, importProvider);
                onAdd(normalizeModule(reimportedModule));
            }
            else {
                console.log("dropping module " + ppath.rootName);
                onRemove(ppath.rootName);
            }
        };
    };


const startup: (importConfig: NAMImportConfig,
    onInit: (moduleImports: NormalizedImport[]) => void,
    onAdd: (moduleImport: NormalizedImport) => void,
    onRemove: (name: string) => void,
    refreshTiming: (name: string) => Date) => Promise<void>
    = async (importConfig, onInit, onAdd, onRemove, refreshTiming) => {

        let modules = await importAllFromRoot(importConfig);

        onInit(modules.map(normalizeModule));

        const watchPath = importConfig.appsPath;
        console.log("watching " + watchPath);

        const fsEventHandler = createFsEventHandler(onAdd, onRemove, refreshTiming, importConfig);
        fs.watch(watchPath, { recursive: true }, fsEventHandler);
    };

export default loadAppFromFolder;
export { importAllFromRoot, startup };
