import customFs from "../customFileSystem";
import fs from 'fs';
const { token } = JSON.parse(fs.readFileSync('config.json'));

(async () => {
    // create the custom FS object
    const cfs = new customFs('https://api.github.com/repos/ION606/github-to-fs', token);

    // write the file to the repo
    await cfs.writeFileSync('example.txt', 'hello world!');

    // read the contents of the file
    console.log((await cfs.readFileSync('example.txt')).toString());

    // remove the file
    await cfs.rmSync('example.txt');

    // make sure the file is gone
    console.log((await cfs.readFileSync('example.txt')).toString());
});