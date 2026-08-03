const { spawn } = require("node:child_process");
const path = require("node:path");

const electronPath = require("electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.ELECTRON_DEV = "1";

const child = spawn(electronPath, ["."], {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
