import { Router } from "express";

type ModuleImport = {
    folderName: string,
    module?: { default?: any },
    err?: Error
};

type NAMImportConfig = {
    appsPath: string,
    exportFileName: string,
    reimportDelay?: number,
    extension?: ExtensionConfig
};

enum extensionFilter {
    whiteList,
    blackList
};

type ExtensionConfig = {
    filterType: extensionFilter,
    extensions: string[]
}

type ProcessedPath = {
    isValid: boolean,
    rootName: string
}

type NormalizedImport = {
    module: Router,
    folderName: string,
    lastImported: Date,
    inError: boolean,
    _storage?: any
};

export { ModuleImport, NAMImportConfig, NormalizedImport, ExtensionConfig, extensionFilter, ProcessedPath };