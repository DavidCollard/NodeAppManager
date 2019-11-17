import { ExtensionConfig, extensionFilter, ProcessedPath } from "../../types";
import path from "path";

const processPath: ((str: string, config: ExtensionConfig) => ProcessedPath) =
    (str, config) => {
        const eventPath: path.ParsedPath = path.parse(str);
        const dirPath = eventPath.dir.split(str);

        let extensionIncluded: boolean = config ? config.extensions.includes(eventPath.ext) : true;
        let filterType: extensionFilter = config ? config.filterType : extensionFilter.whiteList;

        return {
            isValid: (extensionIncluded && filterType == extensionFilter.whiteList)
                || (!extensionIncluded && filterType == extensionFilter.blackList),
            rootName: dirPath[0] === "" ? eventPath.name : dirPath[0]
        };
    };

export default processPath; 
