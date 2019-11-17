import assert from "assert";
import loadAppFromFolder, { importAllFromRoot } from "../../src/corelib/import/import";
import { NAMImportConfig, ModuleImport } from "../../src/corelib/types";
import { fileExistsLazy, importPromiseProvider } from "../../src/corelib/import/fsWrapper";

describe("import.ts/fileExistsLazy()", () => {
    it("Should return true if the file exists", async () => {
        const result = fileExistsLazy(__dirname + "/testImport.ts");
        const result2 = fileExistsLazy(__dirname + "_");
        Promise.all([result, result2]).then((vals) => {
            assert(vals[0]);
            assert(!vals[1]);
        });
    });
    it("should return false if the file doesn't exist", async () => {
        const result = await fileExistsLazy(__dirname + "_");
        assert(!result);
    });
});

describe("import.ts/importPromiseProvider()", () => {
    let importProvider = importPromiseProvider(true);

    it("Should return a promise", () => {
        const t = importProvider(__dirname + "\\..\\testApps\\CorrectApp\\export.ts");
        assert(t instanceof Promise);
        t.then().catch();
    });
    it("Should reject if an invalid file is given as an argument", async () => {
        const t = importProvider(__dirname);
        await assert.rejects(t);
    });
    it("Should resolve if a valid file is given as an argument", async () => {
        const t = importProvider(__dirname + "\\..\\testApps\\CorrectApp\\export.ts");
        await assert.doesNotReject(t);
    });
});

describe("import.ts/loadAppFromFolder()", () => {
    var importConfig: NAMImportConfig;
    let importProvider = importPromiseProvider(true);

    before(() => {
        importConfig = {
            appsPath: __dirname + "\\..\\testApps",
            exportFileName: "export.ts",
            reimportDelay: 300
        };
    });
    it("Should load a generally correct test app", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("CorrectApp", importProvider);
        await assert.doesNotReject(t);

        let hasModule = await t.then(i => i.module);
        assert(hasModule);
    });
    it("Should load a correct ESM export app", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("CorrectESMApp", importProvider);
        await assert.doesNotReject(t);

        let hasModule = await t.then(i => i.module);
        assert(hasModule);
    });
    it("Should load a correct modules.exports app", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("CorrectModuleExportsApp", importProvider);
        await assert.doesNotReject(t);

        let hasModule = await t.then(i => i.module);
        assert(hasModule);
    });
    it("Should reject and return an error out on an export that doesn't compile", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("CompileErrorApp", importProvider);
        await assert.doesNotReject(t);

        let hasErr = await t.then(i => i.err);
        assert(hasErr);
    });
    it("Should reject and return an error on a test app folder that doesn't exist", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("DoesntExistApp", importProvider);
        await assert.doesNotReject(t);

        let hasErr = await t.then(i => i.err);
        assert(hasErr);
    });
    it("Should resolve and return an error on an export file that doesn't exist", async () => {
        let loader = loadAppFromFolder(importConfig);
        let t = loader("MissingExportApp", importProvider);
        await assert.doesNotReject(t);

        let hasErr = await t.then(i => i.err);
        assert(hasErr);
    });
});

describe("import.ts/importAllFromRoot()", () => {
    let validImportConfig: NAMImportConfig;
    let doesNotExistImportConfig: NAMImportConfig;
    let pointedAtFileImportConfig: NAMImportConfig;
    before(() => {
        validImportConfig = {
            appsPath: __dirname + "\\..\\testApps",
            exportFileName: "export.ts",
            reimportDelay: 300
        };
        doesNotExistImportConfig = {
            appsPath: __dirname + "\\..\\testAppsssss",
            exportFileName: "export.ts",
            reimportDelay: 300
        };
        pointedAtFileImportConfig = {
            appsPath: __dirname + "\\..\\testApps\\CorrectApp\\export.ts",
            exportFileName: "export.ts",
            reimportDelay: 300
        };
    });
    it("Should import all the tests that pass the loadAppFromFolder suite", async () => {
        let moduleImports = await importAllFromRoot(validImportConfig);
        assert(moduleImports.every(i => (i.err || i.module) && i.folderName));
    });
    it("Should fail if given an invalid import dir", async () => {
        let moduleImports = importAllFromRoot(doesNotExistImportConfig);
        await assert.rejects(moduleImports);
    });
    it("Should fail if it can't read the directory (ie; not pointed at a directory)", async () => {
        let moduleImports = importAllFromRoot(pointedAtFileImportConfig);
        await assert.rejects(moduleImports);
    });
});
