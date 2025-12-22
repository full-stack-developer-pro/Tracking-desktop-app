import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  protocol,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import axios from "axios";
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
let isQuitting = false;

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
    width: 500,
    height: 700,
    show: false,
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

  app.on("before-quit", () => {
    isQuitting = true;
  });

  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      log.info("Close prevented. Asking user for checkout...");
      win?.webContents.send("show-close-confirmation", {
        date: new Date().toLocaleDateString(),
      });
    } else {
      log.info("App is quitting, cleaning up...");
      stopScreenCapture();
      stopUserActivityTracking();
      win = null;
    }
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

    ipcMain.handle("check-for-updates", async () => {
      if (!app.isPackaged) {
        log.info("Skipping update check in dev mode");
        return { updateAvailable: false, message: "Dev mode" };
      }
      try {
        (autoUpdater as any).autoDownload = false;
        const result = await (autoUpdater as any).checkForUpdates();
        return {
          updateAvailable: !!(result && result.updateInfo),
          version: result?.updateInfo.version,
        };
      } catch (error: any) {
        log.error("Failed to check for updates:", error);
        return { error: error.message };
      }
    });

    ipcMain.handle("start-download-update", async () => {
      try {
        await (autoUpdater as any).downloadUpdate();
        return { success: true };
      } catch (error: any) {
        log.error("Failed to start download:", error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle("quit-and-install-update", () => {
      autoUpdater.quitAndInstall();
    });

    autoUpdater.on("download-progress", (progressObj) => {
      win?.webContents.send("download-progress", progressObj);
    });

    autoUpdater.on("update-downloaded", (info) => {
      win?.webContents.send("update-downloaded", info);
    });
  });
}

import apiMain, { setAuthToken, setRefreshToken } from "./utils/apiMain";

let currentUserId: string | null = null;
// (app as any).isQuiting = false; // logic replaced by local isQuitting

async function handleCheckIn(userId: string) {
  try {
    console.log("Attempting Check-in for user:", userId);
    const res = await apiMain.post("/attendances/check-in");
    console.log("Check-in Full Response:", JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error("Check-in Failed:", error.message);
    if (error.response) {
      console.error(
        "Error Response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

async function handleCheckOut() {
  if (!currentUserId) {
    console.log("No user logged in, skipping checkout.");
    return true; // Allow close if no user
  }
  try {
    console.log("Attempting Check-out for user:", currentUserId);
    const res = await apiMain.post("/attendances/check-out");
    console.log("Checkout Full Response:", JSON.stringify(res.data, null, 2));
    return true;
  } catch (error: any) {
    console.error("Checkout Failed:", error.message);
    if (error.response) {
      console.error(
        "Error Response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return false;
  }
}

ipcMain.on(
  "login",
  async (_event, userId, trackingSettings, token, refreshToken) => {
    try {
      if (!trackingSettings)
        return console.error("No tracking settings provided");

      currentUserId = userId;

      console.log(
        `[Main] Login received. User: ${userId}, Token: ${!!token}, RefreshToken: ${!!refreshToken}`
      );

      setAuthToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      else console.warn("[Main] WARNING: No refresh token received!");

      if (!trackingSettings.isActive)
        return console.log("Tracking is inactive for this user/company");

      startScreenCapture(userId, trackingSettings);
      startUserActivityTracking(userId, trackingSettings);

      await handleCheckIn(userId);

      console.log("Tracking services started successfully");
    } catch (error) {
      console.error("Login initialization failed:", error);
    }
  }
);

ipcMain.handle("confirm-checkout", async () => {
  const success = await handleCheckOut();
  if (success) {
    isQuitting = true;
    app.quit();
    return { success: true };
  } else {
    return { success: false, message: "Checkout API failed. Check internet?" };
  }
});

ipcMain.on("cancel-close", () => {
  // Just do nothing, checking "close" was already prevented.
  console.log("User cancelled checkout/close");
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
  currentUserId = null;
  setAuthToken("");
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
