import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import {
  startScreenCapture,
  stopScreenCapture,
} from "./backgroundTask/screenCapture";
import {
  startUserActivityTracking,
  stopUserActivityTracking,
} from "./backgroundTask/userActivity";

dotenv.config();

const PROTOCOL_SCHEME = "tracking-time";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
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
    createWindow();
  });
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:tracking-session",
      webSecurity: true,
    },
  });

  const ses = session.fromPartition("persist:tracking-session");

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.on("closed", () => {
    win = null;
    stopScreenCapture();
    stopUserActivityTracking();
  });

  if (process.platform === "win32" || process.platform === "linux") {
    const deepLinkUrl = process.argv.find((arg) =>
      arg.startsWith(PROTOCOL_SCHEME + "://")
    );
    if (deepLinkUrl) {
      setTimeout(() => handleDeepLink(deepLinkUrl), 3000);
    }
  }
}

ipcMain.on("login", async (event, userId, trackingSettings) => {
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
    const axios = require("axios");
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

ipcMain.on("open-browser-auth", (event, url) => {
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

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  stopScreenCapture();
  stopUserActivityTracking();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
