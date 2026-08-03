import { app, BrowserWindow, shell } from "electron";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  installMediaProtocolHandler,
  registerMediaScheme,
} from "./mediaProtocol";
import { registerDialogIpc, registerSessionIpc } from "./sessionIpc";

registerMediaScheme();

const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ?? "http://127.0.0.1:5173";

async function isDevServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(DEV_SERVER_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function loadAppUrl(window: BrowserWindow): Promise<void> {
  // npm run electron sets ELECTRON_DEV=1 after wait-on confirms Vite is ready.
  if (!app.isPackaged && process.env.ELECTRON_DEV === "1") {
    await window.loadURL(DEV_SERVER_URL);
    return;
  }

  if (!app.isPackaged && (await isDevServerAvailable())) {
    await window.loadURL(DEV_SERVER_URL);
    return;
  }

  await loadProductionApp(window);
}

let mainWindow: BrowserWindow | null = null;
let staticServer: http.Server | null = null;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".cues": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".show": "application/json",
  ".cuedirector": "application/json",
};

function startStaticServer(root: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestPath = decodeURIComponent(
        (request.url ?? "/").split("?")[0],
      );
      const relativePath =
        requestPath === "/" ? "/index.html" : requestPath;
      const filePath = path.normalize(path.join(root, relativePath));

      if (!filePath.startsWith(path.normalize(root))) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        const extension = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
          "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
        });
        response.end(data);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start static file server"));
        return;
      }

      staticServer = server;
      resolve(address.port);
    });
  });
}

async function loadProductionApp(window: BrowserWindow): Promise<void> {
  const distPath = path.join(__dirname, "../dist");
  const port = await startStaticServer(distPath);
  await window.loadURL(`http://127.0.0.1:${port}/`);
}

async function createWindow(): Promise<void> {
  registerSessionIpc();
  registerDialogIpc();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: "CueDirector",
    backgroundColor: "#16171d",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  await loadAppUrl(mainWindow);
}

function stopStaticServer(): void {
  staticServer?.close();
  staticServer = null;
}

app.whenReady().then(() => {
  installMediaProtocolHandler();
  void createWindow();
});

app.on("window-all-closed", () => {
  stopStaticServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("before-quit", () => {
  stopStaticServer();
});
