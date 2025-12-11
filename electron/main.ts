import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  protocol,
  net,
} from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import axios from "axios";
import { google } from "googleapis";
import {
  startScreenCapture,
  stopScreenCapture,
} from "./backgroundTask/screenCapture";
import {
  startUserActivityTracking,
  stopUserActivityTracking,
} from "./backgroundTask/userActivity";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

dotenv.config();
const PROTOCOL_SCHEME = "tracking-time";
const CUSTOM_PROTOCOL = "tracking-app";
let win: BrowserWindow | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.APP_ROOT = path.join(__dirname, "..");

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const preload = path.join(__dirname, "preload.mjs");

function createWindow() {
  log.info("Creating window...");
  let iconPath: string;

  if (process.platform === "win32") {
    iconPath = path.join(process.cwd(), "public", "icon.ico");
  } else if (process.platform === "darwin") {
    iconPath = path.join(process.cwd(), "public", "icon.icns");
  } else {
    iconPath = path.join(process.cwd(), "public", "icon.png");
  }

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    // icon: path.join(process.env.VITE_PUBLIC as string, "electron-vite.svg"),
    icon: iconPath,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:tracking-session",
      webSecurity: false,
    },
  });

  win.once("ready-to-show", () => {
    log.info("Window is ready to show");
    win?.show();
  });

  const devUrl = VITE_DEV_SERVER_URL || "http://localhost:5173";
  if (!app.isPackaged) {
    log.info(`Loading DEV URL: ${devUrl}`);
    win.loadURL(devUrl).catch((e) => log.error("Failed to load url:", e));
  } else {
    const loadUrl = `${CUSTOM_PROTOCOL}://app/index.html`;
    log.info(`Production: Loading ${loadUrl}`);

    win.loadURL(loadUrl).catch((e) => {
      log.error("Failed to load custom protocol URL:", e);
    });
  }

  win.on("closed", () => {
    log.info("Window closed");
    win = null;
    stopScreenCapture();
    stopUserActivityTracking();
  });

  if (process.platform === "win32" || process.platform === "linux") {
    const deepLinkUrl = process.argv.find((arg) =>
      arg.startsWith(PROTOCOL_SCHEME + "://")
    );
    if (deepLinkUrl) {
      log.info(`Found deep link at startup: ${deepLinkUrl}`);
      setTimeout(() => handleDeepLink(deepLinkUrl), 3000);
    }
  }
}

autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = "info";

autoUpdater.on("checking-for-update", () => {
  log.info("Checking for update...");
});

autoUpdater.on("update-available", (info: any) => {
  log.info(`Update available! Version: ${info.version}`);
});

autoUpdater.on("update-not-available", (info: any) => {
  log.info(`Update not available. Current version: ${info.version}`);
});

autoUpdater.on("error", (err: Error) => {
  log.error("Error in auto-updater:", err.message);
});

autoUpdater.on("download-progress", (progressObj) => {
  let msg = `Download speed: ${progressObj.bytesPerSecond} B/s`;
  msg += ` - Downloaded ${progressObj.percent.toFixed(2)}%`;
  msg += ` (${progressObj.transferred}/${progressObj.total})`;
  log.info(msg);
});

autoUpdater.on("update-downloaded", (info: any) => {
  log.info(`Update downloaded. Version: ${info.version}`);
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1000);
});

export const MAIN_DIST = path.join(
  process.env.APP_ROOT as string,
  "dist-electron"
);
export const RENDERER_DIST = path.join(process.env.APP_ROOT as string, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT as string, "public")
  : RENDERER_DIST;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: CUSTOM_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        bypassCSP: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
      },
    },
  ]);

  app.on("second-instance", (_event, commandLine, _workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const deepLinkUrl = commandLine.find((arg) =>
      arg.startsWith(PROTOCOL_SCHEME + "://")
    );
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
  });

  app.whenReady().then(() => {
    if (app.isPackaged) {
      log.info(
        "Registering custom protocol handler for PARTITION 'persist:tracking-session'..."
      );
      const ses = session.fromPartition("persist:tracking-session");

      ses.protocol.handle(CUSTOM_PROTOCOL, async (request) => {
        try {
          const url = new URL(request.url);
          let relativePath = url.pathname;

          if (relativePath === "/" || relativePath === "") {
            relativePath = "/index.html";
          }

          relativePath = decodeURIComponent(relativePath);

          const absolutePath = path.join(
            app.getAppPath(),
            "dist",
            relativePath
          );

          log.info(`[Protocol] Request: ${request.url} -> ${absolutePath}`);

          const fs = await import("fs/promises");
          const data = await fs.readFile(absolutePath);

          const ext = path.extname(absolutePath);
          let mimeType = "text/html";
          if (ext === ".js") mimeType = "text/javascript";
          else if (ext === ".css") mimeType = "text/css";
          else if (ext === ".svg") mimeType = "image/svg+xml";
          else if (ext === ".json") mimeType = "application/json";
          else if (ext === ".png") mimeType = "image/png";

          return new Response(data, {
            headers: { "content-type": mimeType },
          });
        } catch (error) {
          log.error("[Protocol] Failed:", error);
          return new Response("Not Found", { status: 404 });
        }
      });
    }

    createWindow();

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 500);
  });
}

ipcMain.on("login", async (_event, userId, trackingSettings) => {
  try {
    if (!trackingSettings)
      return console.error("No tracking settings provided");

    if (!trackingSettings.isActive)
      return console.log("Tracking is inactive for this user/company");

    startScreenCapture(userId, trackingSettings);
    startUserActivityTracking(userId, trackingSettings);

    console.log("Tracking services started successfully");
  } catch (error) {
    console.error("Login initialization failed:", error);
  }
});

ipcMain.on("logout", async () => {
  try {
    const ses = session.fromPartition("persist:tracking-session");
    await ses.clearStorageData({
      storages: ["cookies", "localstorage"],
    });
  } catch (error) {
    console.error("Failed to clear session:", error);
  }

  stopScreenCapture();
  stopUserActivityTracking();
});

ipcMain.handle("test-api-connection", async () => {
  try {
    const API_URL = process.env.VITE_BACKEND_URL;

    const response = await axios.get(`${API_URL}/api/auth/test`, {
      timeout: 5000,
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
});

ipcMain.handle("get-cookies", async () => {
  try {
    const ses = session.fromPartition("persist:tracking-session");
    const cookies = await ses.cookies.get({});
    return cookies.map((c) => ({
      name: c.name,
      value: c.value.substring(0, 20) + "...",
      domain: c.domain,
      path: c.path,
    }));
  } catch (error) {
    console.error("Failed to get cookies:", error);
    return [];
  }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth/callback"
);

ipcMain.handle("google-oauth", async () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["profile", "email"],
  });

  return new Promise((resolve, reject) => {
    const authWin = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: { nodeIntegration: false },
    });

    authWin.loadURL(authUrl);

    authWin.webContents.on("will-redirect", async (_event, url) => {
      if (url.startsWith("http://localhost:3000/oauth/callback")) {
        const urlParams = new URL(url).searchParams;
        const code = urlParams.get("code");

        try {
          const { tokens } = await oauth2Client.getToken(code as string);
          resolve(tokens.id_token);
          authWin.close();
        } catch (err) {
          reject(err);
          authWin.close();
        }
      }
    });

    authWin.on("closed", () => {
      reject(new Error("User closed the login window"));
    });
  });
});

ipcMain.on("open-browser-auth", (_event, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    shell.openExternal(url);
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(urlStr: string) {
  try {
    if (!urlStr.startsWith(PROTOCOL_SCHEME + "://")) return;

    const urlObj = new URL(urlStr);
    const params = urlObj.searchParams;

    const token = params.get("token");
    const userId = params.get("userId");
    const companyId = params.get("companyId");
    const role = params.get("role");

    if (token && userId) {
      if (win && win.webContents) {
        win.webContents.send("deep-link-login", {
          token,
          userId,
          companyId,
          role,
        });

        if (win.isMinimized()) win.restore();
        win.focus();
      }
    }
  } catch (error) {
    console.error("Error parsing deep link:", error);
  }
}

app.on("window-all-closed", () => {
  stopScreenCapture();
  stopUserActivityTracking();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
