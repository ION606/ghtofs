declare module 'github-to-fs';

type AuthHeaders = {
    'Authorization': string;
};

type UpdateData = {
    message: string;
    content: string;
    sha?: string;
};

type FileType = {
    type: "dir" | "file";
    name: string;
};

declare class ghelper {
    private ghurl: string;
    private authHeaders: AuthHeaders;
    private errhelper(err: any): null;
    constructor(repoURL: string, token: string);

    appendToFile(fpath: string, toAdd: string): Promise<any>;
    addToRepo(fpath: string, contentRaw: string | Buffer, sha?: string): Promise<any>;
    remFromRepo(fpath: string): Promise<any>;
    readTree(branchName: string): Promise<any>;
    getStructure(dPath?: string, getSha?: boolean): Promise<Buffer | FileType[] | string | false>;
}

declare class mockFileObj {
    private fpath: string;
    private encoding?: string;
    private fptrs: Promise<any>[];
    private cfs: customFs;
    constructor(cfs: customFs, fpath: string, encoding?: string);

    write(toAdd: string): void;
    close(): Promise<true | null>;
}

declare class customFs {
    private ghs: ghelper;
    constructor(repoUrl: string, token: string);

    private getFilesInDir(dirPath: string): Promise<string[]>;
    rmSync(dirPath: string, opts?: { recursive?: boolean }): Promise<any>;
    appendToFile(fPath: string, toWrite: string): Promise<any>;
    writeFileSync(fPath: string, toWriteRaw: any, opts?: { encoding?: string }): Promise<any>;
    writeFile(fName: string, toWrite: any, cb: (err?: any) => void): void;
    readFileSync(fName: string): Promise<any>;
    readdirSync(dirName: string): Promise<FileType[]>;
    existsSync(p: string): Promise<string | undefined>;
    createWriteStream(fpath: string): mockFileObj;
    mkdirSync(dirName: string): void;
}
