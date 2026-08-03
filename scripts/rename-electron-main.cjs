const fs = require("node:fs");
const path = require("node:path");

const distDir = path.join(__dirname, "../dist-electron");
const electronSubDir = path.join(distDir, "electron");

if (!fs.existsSync(electronSubDir)) {
  console.error(`Electron build error: missing ${electronSubDir}`);
  process.exit(1);
}

/** Move electron/*.js to dist-electron/*.cjs (CommonJS; package.json type is module). */
for (const entry of fs.readdirSync(electronSubDir)) {
  if (!entry.endsWith(".js")) continue;

  const from = path.join(electronSubDir, entry);
  const baseName = entry.slice(0, -3);
  const to = path.join(distDir, `${baseName}.cjs`);

  if (fs.existsSync(to)) {
    fs.unlinkSync(to);
  }

  fs.renameSync(from, to);
}

fs.rmSync(electronSubDir, { recursive: true, force: true });

/** Remove type-only src emits (not needed at Electron runtime). */
const srcSubDir = path.join(distDir, "src");
if (fs.existsSync(srcSubDir)) {
  fs.rmSync(srcSubDir, { recursive: true, force: true });
}

/** Node does not resolve extensionless relative requires to .cjs files. */
function patchRelativeRequires(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const patched = content.replace(
    /require\("\.\/([^"]+)"\)/g,
    (_match, moduleName) => {
      if (moduleName.endsWith(".cjs")) {
        return `require("./${moduleName}")`;
      }

      return `require("./${moduleName}.cjs")`;
    },
  );

  if (patched !== content) {
    fs.writeFileSync(filePath, patched);
  }
}

for (const entry of fs.readdirSync(distDir)) {
  if (!entry.endsWith(".cjs")) continue;
  patchRelativeRequires(path.join(distDir, entry));
}

const requiredModules = [
  "main.cjs",
  "preload.cjs",
  "sessionIpc.cjs",
  "mediaScanner.cjs",
  "mediaProtocol.cjs",
];

for (const moduleName of requiredModules) {
  const modulePath = path.join(distDir, moduleName);

  if (!fs.existsSync(modulePath)) {
    console.error(`Electron build error: missing ${modulePath}`);
    process.exit(1);
  }
}

console.log("Electron build OK:", requiredModules.join(", "));
