import fs, { PathLike } from "fs";
import decache from "decache";

const fileExistsLazy: (filepath: string) => Promise<boolean> = async (filepath) => {
    return new Promise((resolve) => {
        fs.exists(filepath, (exists) => resolve(exists));
    });
};

const importPromiseProvider: (firstRun: boolean) => ((filename: string) => Promise<NodeModule>) = (firstRun) => {
    return (filename: string) => {
        if (firstRun) {
            decache(filename);
        }
        return import(filename);
    };
};

const getDirReader: ((dir: PathLike) => () => Promise<string[]>) = (dir) => {
    return () => {
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, files: string[]) => {
                if (err) reject(err);
                resolve(files);
            });
        });
    };
};

const isFileDir: ((dir: PathLike) => Promise<boolean>) = (dir) => {
    return new Promise((resolve, reject) => {
        fs.lstat(dir, (err, stats) => {
            if (err) reject(err);
            resolve(stats.isDirectory());
        });
    });
};

export { importPromiseProvider, fileExistsLazy, getDirReader, isFileDir };
