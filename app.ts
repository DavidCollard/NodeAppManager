import express from "express";
import init from "./src/index";
import { NAMImportConfig, extensionFilter } from "./src/types";

const port = 3000;
const app = express();

let importConfig: NAMImportConfig = {
    appsPath: "E:\\vscode\\nodeappmanager\\test\\testApps",
    exportFileName: "export.ts",
    reimportDelay: 300,
    extension: {
        filterType: extensionFilter.blackList,
        extensions: [".json"]
    }
};

/*
let importConfig: NAMImportConfig = { 
    appsPath: "E:\\vscode\\nodeappmanagerts\\test\\testAppsDist", 
    exportFileName: "export.js",
    reimportDelay: 300,
    extension: {
        filterType: extensionFilter.blackList,
        extensions: [".json"]
    }
};
*/
init(app, importConfig);

app.listen(port, (err) => {
    if (err) {
        console.log(err);
    }
    console.log("Listening on port " + port);
});
