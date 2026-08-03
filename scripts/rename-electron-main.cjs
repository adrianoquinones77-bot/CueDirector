const fs = require("node:fs");
const path = require("node:path");

const source = path.join(__dirname, "../dist-electron/main.js");
const target = path.join(__dirname, "../dist-electron/main.cjs");

fs.renameSync(source, target);
