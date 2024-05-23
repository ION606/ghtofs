# Github to File System (gh-to-fs)
This package allows a user to interact with the github api as if using the `fs` module.


# Differences
- ANY synchronous function (i.e. `writeFileSync`, `readFileSync`, etc) **MUST** be awaited
- The module must be initialized (see below)

# A Simple Example
```Javascript
// import the project
import customFs from 'github-to-fs';

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
```

# Common Errors
## 409
This is a github error that happens seemingly at random. I can not control this and
it is currently a known problem with the GitHub API

- Created by ION606