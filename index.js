import axios from "axios";
import base64 from 'base-64'
// import stream from 'stream';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ghelper {
    #errhelper(err) {
        if (err.response) {
            console.error(err.response);

            // switch(err.response.code) {

            // }
            //     console.log(err.response.status);
            //     console.log(err.response.headers);
        }
        else console.error(err);

        return null
    }

    async appendToFile(fpath, toAdd) {
        try {
            const url = `${this.ghurl}/contents/${fpath}`;

            const response = await axios.get(url, {
                headers: this.authHeaders,
            }).catch((err) => {
                if (err.res.statusCode != 404) console.error(err);
                return null;
            });

            let content = (response?.data) ? base64.decode(response.data.content) : "";
            content += toAdd;

            return this.addToRepo(fpath, content, response?.data?.sha);
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }

    async addToRepo(fpath, contentRaw, sha = undefined, commit_message = undefined) {
        try {
            const url = `${this.ghurl}/contents/${fpath}`;

            const content = (!(contentRaw instanceof Buffer)) ? Buffer.from(contentRaw) : contentRaw;
            const toAdd = content.toString('base64');
            // Prepare the commit
            const updateData = {
                message: (commit_message) ? commit_message : `added content for ${fpath}`,
                content: toAdd,
            };

            if (sha) updateData['sha'] = sha;

            // Commit the update
            const updateResponse = await axios.put(url, updateData, {
                headers: this.authHeaders
            }).catch((err) => this.#errhelper(err));

            return updateResponse?.data;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }


    async remFromRepo(fpath) {
        const url = `${this.ghurl}/contents/${fpath}`;

        const resget = await axios.get(url, {
            headers: this.authHeaders
        })
            .catch(this.#errhelper);

        const sha = resget?.data?.sha;
        if (!sha) return;

        const resdel = await axios.delete(url, {
            headers: this.authHeaders,
            data: {
                message: `added content for ${fpath}`,
                sha
            }
        }).catch(this.#errhelper);

        return resdel;
    }


    async readTree(branchName) {
        try {
            let url = `${this.ghurl}/branches/${branchName}`;

            // Commit the update
            let res = await axios.get(url, {
                headers: this.authHeaders
            })
                .catch(this.#errhelper);

            if (!res) return;
            const treesha = res.data.commit.commit.tree.sha;

            url = `${this.ghurl}/git/trees/${treesha}`;

            // Commit the update
            res = await axios.get(url, {
                headers: this.authHeaders
            })
                .catch(this.#errhelper);

            return res?.data;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }


    /**
     * if dPath is a file, then the contents of the file will be returned, otherwise the directory structure will be returned
     * @returns {Promise<Buffer | Array<{type: String, name: String>}}
     */
    async getStructure(dPath, getSha = false) {
        try {
            let url = `${this.ghurl}/contents`;
            if (dPath) url += `/${dPath}`;

            // Commit the update
            const res = await axios.get(url, {
                headers: this.authHeaders
            });

            const { data } = res;
            if (getSha) return res?.data?.sha;

            if (Array.isArray(data)) return data.map(o => ({ type: o.type, name: o.name }));
            return Buffer.from(data.content, data.encoding);
        }
        catch (err) {
            if (err.response.status != 404) console.error(err);
            return false;
        }
    }

    constructor(repoURL, token) {
        this.ghurl = repoURL;
        this.authHeaders = {
            'Authorization': `token ${token}`
        };
    }
}


export class mockFileObj {
    /** @type {String} */
    #fpath;

    /** @type {String} */
    #encoding;

    /** @type {Promise[]} */
    #fptrs

    /** @type {customFs} */
    #cfs;

    write(toAdd) {
        const r = this.#cfs.appendToFile(this.#fpath, toAdd);
        this.#fptrs.push(r);
    }

    async close() {
        try {
            await Promise.all(this.#fptrs);
            return true;
        }
        catch (err) {
            console.error(err);
            return null;
        }
    }

    constructor(cfs, fpath, encoding = undefined) {
        this.#fpath = fpath;
        this.#encoding = encoding;
        this.#fptrs = [];
    }
}


/**
 * To replace `fs` by writing to a remote source (github)
 */
export default class customFs {
    /** @type {ghelper} */
    ghs;

    async #getFilesInDir(dirPath) {
        const all = await this.readdirSync(dirPath);
        const files = all.filter(o => o.type === 'file').map(f => `${dirPath}/${f.name}`);
        const folders = all.filter(o => o.type === 'dir');
        const subFiles = await Promise.all(folders.map(f => this.#getFilesInDir(`${dirPath}/${f.name}`)));
        return files.concat(...subFiles);
    }

    async rmSync(dirPath, opts) {
        const files = await this.readdirSync(dirPath);

        if (Array.isArray(files) && opts?.recursive) {
            // get tree
            const subFiles = await this.#getFilesInDir(dirPath);
            for (const fname of subFiles) {
                await this.ghs.remFromRepo(fname);
            }
            return subFiles;
        }
        else return await this.ghs.remFromRepo(dirPath);
    }

    appendToFile = (fPath, toWrite) => this.ghs.appendToFile(fPath, toWrite);

    /**
     * 
     * @param {string} fPath 
     * @param {any} toWriteRaw 
     * @param {{encoding:string}} opts?
     * @returns 
     */
    async writeFileSync(fPath, toWriteRaw, opts = undefined, commit_message = undefined) {
        // { encoding: 'base64' }
        const encoding = opts?.encoding;
        const toWrite = (encoding) ? Buffer.from(toWriteRaw).toString(encoding) : toWriteRaw;

        const r = await this.existsSync(fPath);
        await wait(1000);
        return this.ghs.addToRepo(fPath, toWrite, r, commit_message);
    }

    writeFile = (fName, toWrite, cb, opts, commit_message = undefined) => this.writeFileSync(fName, toWrite, opts, commit_message).then(() => cb()).catch(cb);


    readFileSync = async (fName) => this.ghs.getStructure(fName);

    /**
     * @returns {Promise<[{type: "dir" | "file", name: String}]>}
     */
    async readdirSync(dirName) {
        const r = await this.ghs.getStructure(dirName);
        return (r) ? r : [];
    }

    /**
     * returns the file sha if found
     * @returns {Promise<String | undefined>}
     */
    async existsSync(p) {
        const res = await this.ghs.getStructure(p, true);
        return (res) ? res : undefined;
    }

    /**
     * reads into buffer, then when it end writes it to dest
     */
    createWriteStream = (fpath) => new mockFileObj(this, fpath);

    /**
     * No need, as github does this for you
     */
    async mkdirSync(dirName) {

    }

    constructor(repoUrl, token) {
        this.ghs = new ghelper(repoUrl, token);
    }
}
