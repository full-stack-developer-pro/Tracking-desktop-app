import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  protocol,
  dialog,
} from "electron";
import path from "node:path";
import axios from "axios";
import dotenv from "dotenv";
import {
  startScreenCapture,
  stopScreenCapture,
  setAuthToken as setScreenCaptureToken,
} from "./backgroundTask/screenCapture";
import {
  startUserActivityTracking,
  stopUserActivityTracking,
  updateActiveLeave,
} from "./backgroundTask/userActivity";

import { autoUpdater as _autoUpdater } from "electron-updater";
const autoUpdater = _autoUpdater as any;
import log from "electron-log";
import apiMain, {
  setAuthToken as setApiToken,
  setRefreshToken,
} from "./utils/apiMain";
dotenv.config();
const PROTOCOL_SCHEME = "tracking-time";
const CUSTOM_PROTOCOL = "tracking-app";
let win: BrowserWindow | null = null;
let isQuitting = false;
let currentUserId: string | null = null;
let activeLoginPromise: Promise<any> | null = null;
let locationPermissionAllowed = false;

process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const preload = path.join(__dirname, "preload.mjs");
const RENDERER_DIST = path.join(process.env.APP_ROOT as string, "dist");
const VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT as string, "public")
  : RENDERER_DIST;

function createWindow() {
  log.info("Creating window...");
  let iconPath = path.join(VITE_PUBLIC, "icon.png");
  if (process.platform === "win32") {
    iconPath = path.join(VITE_PUBLIC, "icon.ico");
  } else if (process.platform === "darwin") {
    iconPath = path.join(VITE_PUBLIC, "icon.icns");
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

  const sessionPartition = session.fromPartition("persist:tracking-session");

  sessionPartition.setPermissionRequestHandler(
    async (webContents, permission, callback) => {
      log.info(`[sessionPartition] request for permission: ${permission}`);
      if (permission === "geolocation") {
        if (locationPermissionAllowed) {
          log.info(
            "[sessionPartition] Permission already allowed globally. Granting directly.",
          );
          callback(true);
          return;
        }

        const activeWindow =
          BrowserWindow.fromWebContents(webContents) ||
          win ||
          BrowserWindow.getAllWindows()[0];
        if (activeWindow) {
          const { response } = await dialog.showMessageBox(activeWindow, {
            type: "question",
            title: "Location Permission Request",
            message:
              "Tracking Time requires access to your location to verify your check-in. Do you want to allow this application to access your location?",
            buttons: ["Deny", "Allow"],
            defaultId: 1,
            cancelId: 0,
          });
          if (response === 1) {
            log.info("[sessionPartition] User allowed geolocation permission.");
            locationPermissionAllowed = true;
            callback(true);
            return;
          }
        }
        log.info("[sessionPartition] User denied geolocation permission.");
        locationPermissionAllowed = false;
        callback(false);
      } else {
        callback(false);
      }
    },
  );

  sessionPartition.setPermissionCheckHandler(
    (_webContents, permission, origin) => {
      log.info(
        `[sessionPartition] check for permission: ${permission} from origin: ${origin}`,
      );
      if (permission === "geolocation") {
        return locationPermissionAllowed;
      }
      return false;
    },
  );

  session.defaultSession.setPermissionRequestHandler(
    async (webContents, permission, callback) => {
      log.info(`[defaultSession] request for permission: ${permission}`);
      if (permission === "geolocation") {
        if (locationPermissionAllowed) {
          log.info(
            "[defaultSession] Permission already allowed globally. Granting directly.",
          );
          callback(true);
          return;
        }

        const activeWindow =
          BrowserWindow.fromWebContents(webContents) ||
          win ||
          BrowserWindow.getAllWindows()[0];
        if (activeWindow) {
          const { response } = await dialog.showMessageBox(activeWindow, {
            type: "question",
            title: "Location Permission Request",
            message:
              "Tracking Time requires access to your location to verify your check-in. Do you want to allow this application to access your location?",
            buttons: ["Deny", "Allow"],
            defaultId: 1,
            cancelId: 0,
          });
          if (response === 1) {
            log.info("[defaultSession] User allowed geolocation permission.");
            locationPermissionAllowed = true;
            callback(true);
            return;
          }
        }
        log.info("[defaultSession] User denied geolocation permission.");
        locationPermissionAllowed = false;
        callback(false);
      } else {
        callback(false);
      }
    },
  );

  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, origin) => {
      log.info(
        `[defaultSession] check for permission: ${permission} from origin: ${origin}`,
      );
      if (permission === "geolocation") {
        return locationPermissionAllowed;
      }
      return false;
    },
  );

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
      log.info(`[main] Close detected. currentUserId: ${currentUserId}`);
      if (currentUserId) {
        e.preventDefault();
        log.info("Close prevented. Asking user for checkout...");
        win?.webContents.send("show-close-confirmation", {
          date: new Date().toLocaleDateString(),
        });
        return;
      } else {
        log.info("No user logged in. Closing app without checkout/prevention.");
        isQuitting = true;
      }
    }
    if (isQuitting) {
      log.info("App is quitting, cleaning up...");
      stopScreenCapture();
      stopUserActivityTracking();
    }
  });
  if (process.platform === "win32" || process.platform === "linux") {
    const deepLinkUrl = process.argv.find((arg) =>
      arg.startsWith(PROTOCOL_SCHEME + "://"),
    );
    if (deepLinkUrl) {
      log.info(`Found deep link at startup: ${deepLinkUrl}`);
      setTimeout(() => handleDeepLink(deepLinkUrl), 3000);
    }
  }
}

autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = "info";
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

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

autoUpdater.on("download-progress", (progressObj: any) => {
  let msg = `Download speed: ${progressObj.bytesPerSecond} B/s`;
  msg += ` - Downloaded ${progressObj.percent.toFixed(2)}%`;
  msg += ` (${progressObj.transferred}/${progressObj.total})`;
  log.info(msg);
  win?.webContents.send("download-progress", progressObj);
});

autoUpdater.on("update-downloaded", (info: any) => {
  log.info(
    `Update downloaded. Version: ${info.version}. Installing and restarting...`,
  );
  win?.webContents.send("update-downloaded", info);
  setTimeout(() => {
    autoUpdater.quitAndInstall(true, true);
  }, 1000);
});

export const MAIN_DIST = path.join(
  process.env.APP_ROOT as string,
  "dist-electron",
);

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
      arg.startsWith(PROTOCOL_SCHEME + "://"),
    );
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
  });
  app.whenReady().then(() => {
    if (app.isPackaged) {
      log.info("Configuring app to launch at login...");
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath("exe"),
      });
      log.info(
        "Registering custom protocol handler for PARTITION 'persist:tracking-session'...",
      );
      const ses = session.fromPartition("persist:tracking-session");
      ses.setPermissionRequestHandler((_webContents, permission, callback) => {
        if (permission === "geolocation") {
          callback(true);
        } else {
          callback(false);
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_webContents, permission, callback) => {
          if (permission === "geolocation") {
            callback(true);
          } else {
            callback(false);
          }
        },
      );
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
            relativePath,
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
    if (app.isPackaged) {
      log.info("Auto-checking for updates on startup...");
      autoUpdater.checkForUpdates().catch((err: Error) => {
        log.error("Auto-update check failed on startup:", err.message);
      });
    }
    ipcMain.handle("check-for-updates", async () => {
      if (!app.isPackaged) {
        log.info("Skipping update check in dev mode");
        return { updateAvailable: false, message: "Dev mode" };
      }
      try {
        (autoUpdater as any).autoDownload = false;
        const result = await (autoUpdater as any).checkForUpdates();
        const currentVersion = app.getVersion();
        const updateVersion = result?.updateInfo?.version;
        const isUpdateAvailable =
          updateVersion && updateVersion !== currentVersion;
        return {
          updateAvailable: isUpdateAvailable,
          version: updateVersion,
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
  });
}

function getFriendlyCheckInErrorMessage(message: string): {
  title: string;
  friendlyMessage: string;
} {
  const msgLower = message.toLowerCase();

  if (
    msgLower.includes("coordinates") ||
    msgLower.includes("latitude") ||
    msgLower.includes("longitude")
  ) {
    return {
      title: "Location Access Required",
      friendlyMessage:
        "We could not verify your location. Please ensure location services are enabled on your device, permission is granted to the application, and you are at your office location.",
    };
  }

  if (
    msgLower.includes("outside") ||
    msgLower.includes("range") ||
    msgLower.includes("limit")
  ) {
    return {
      title: "Outside Office Range",
      friendlyMessage:
        "You are not at your office location. Please ensure you check in from your assigned branch office.",
    };
  }

  if (msgLower.includes("not assigned to any office branch")) {
    return {
      title: "No Branch Assigned",
      friendlyMessage:
        "You are not assigned to any office branch. Please contact your administrator.",
    };
  }

  if (msgLower.includes("coordinates are not configured")) {
    return {
      title: "Location Not Configured",
      friendlyMessage:
        "Your assigned branch coordinates are not configured. Please contact your administrator.",
    };
  }

  if (msgLower.includes("leave")) {
    return {
      title: "Attendance Locked",
      friendlyMessage:
        message || "You have an active approved leave for today.",
    };
  }

  return {
    title: "Check-in Error",
    friendlyMessage: message,
  };
}

async function handleCheckIn(
  userId: string,
  confirmedExtraWork = false,
  latitude?: number,
  longitude?: number,
): Promise<boolean> {
  try {
    log.info(
      `[main] Attempting Check-in for user: ${userId}, confirmedExtraWork: ${confirmedExtraWork}, location: ${latitude}, ${longitude}`,
    );
    console.log(
      `[Check-in API Coordinates] Sending to backend -> Latitude: ${latitude}, Longitude: ${longitude}`,
    );
    const res = await apiMain.post("/attendances/check-in", {
      confirmedExtraWork,
      latitude,
      longitude,
    });
    log.info(`[main] Check-in Success: ${res.status}`);

    if (res.status === 201) {
      const activeWindow = win || BrowserWindow.getAllWindows()[0];
      if (res.data.warning && activeWindow) {
        await dialog.showMessageBox(activeWindow, {
          type: "warning",
          title: "Upcoming Leave Warning",
          message: res.data.warning,
          buttons: ["OK"],
        });
      } else if (confirmedExtraWork && activeWindow) {
        dialog.showMessageBox(activeWindow, {
          type: "info",
          title: "Success",
          message:
            res.data.message ||
            "Check-in successful. Today is recorded as an Extra Work Day.",
          buttons: ["OK"],
        });
      }
    }
    return true;
  } catch (error: any) {
    log.error(`[main] Check-in Failed: ${error.message}`);

    if (error.response) {
      const { status, data } = error.response;
      log.error(
        `[main] Check-in Error Response: ${status} - ${JSON.stringify(data)}`,
      );

      const activeWindow = win || BrowserWindow.getAllWindows()[0];
      if (!activeWindow) {
        log.error(
          "[main] Cannot show check-in dialog: No active window found.",
        );
        return false;
      }

      if (status === 409 && data.isOffDay) {
        log.info("[main] Triggering Off-day/Holiday/Leave confirmation dialog");
        const result = await dialog.showMessageBox(activeWindow, {
          type: "question",
          title: "Check-in Confirmation",
          message:
            data.message ||
            "Today is a non-working day. Are you sure you want to check in?",
          buttons: ["Cancel", "Confirm Check-in"],
          defaultId: 1,
          cancelId: 0,
        });

        if (result.response === 1) {
          log.info("[main] User confirmed extra work check-in.");
          return await handleCheckIn(userId, true, latitude, longitude);
        }
        log.info("[main] User cancelled extra work check-in.");
        await performLogout();
        return false;
      }

      if (status === 403) {
        const { title, friendlyMessage } = getFriendlyCheckInErrorMessage(
          data.message || "",
        );
        log.info(
          `[main] Showing 403 warning (${title}) and performing auto-logout`,
        );
        await dialog.showMessageBox(activeWindow, {
          type: "warning",
          title: title,
          message: friendlyMessage,
          buttons: ["OK"],
        });
        await performLogout();
        return false;
      }

      if (
        status === 400 &&
        data.message?.toLowerCase().includes("already checked in")
      ) {
        log.info("[main] User already checked in.");
        return true;
      }

      const { title, friendlyMessage } = getFriendlyCheckInErrorMessage(
        data.message || "",
      );
      dialog.showErrorBox(title, friendlyMessage);
      await performLogout();
      return false;
    } else {
      log.error("[main] Check-in Network/System Error: " + error.message);
      dialog.showErrorBox(
        "Network Error",
        "Failed to connect to the server. Please check your internet connection.",
      );
    }
    return false;
  }
}

async function handleCheckOut() {
  if (!currentUserId) {
    console.log("No user logged in, skipping checkout.");
    return true;
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
        JSON.stringify(error.response.data, null, 2),
      );
      const msg = error.response.data?.message || "";
      if (
        error.response.status === 400 &&
        msg.toLowerCase().includes("already checked out")
      ) {
        console.log(
          "User already checked out from website, treating as success.",
        );
        return true;
      }
    }
    return false;
  }
}

ipcMain.handle(
  "login",
  async (
    _event,
    userId,
    trackingSettings,
    token,
    refreshToken,
    socketToken,
    latitude,
    longitude,
  ) => {
    if (activeLoginPromise) {
      log.info(
        "[main] Login handler: A login request is already in progress. Returning active promise.",
      );
      return activeLoginPromise;
    }

    activeLoginPromise = (async () => {
      try {
        if (!trackingSettings) {
          log.error("No tracking settings provided");
          return { success: false, message: "Missing tracking settings" };
        }
        currentUserId = userId;
        log.info(
          `[Main] Login received. User: ${userId}, Token: ${!!token}, RefreshToken: ${!!refreshToken}`,
        );
        setApiToken(token);
        setScreenCaptureToken(token);
        if (refreshToken) setRefreshToken(refreshToken);

        if (!trackingSettings.isActive) {
          log.info("Tracking is inactive for this user/company");
          return { success: true, message: "Tracking is inactive" };
        }

        const checkInSuccess = await handleCheckIn(
          userId,
          false,
          latitude,
          longitude,
        );

        if (checkInSuccess) {
          startScreenCapture(userId, trackingSettings, token);
          startUserActivityTracking(
            userId,
            trackingSettings,
            token,
            socketToken,
          );
          log.info(
            "[main] Tracking services started successfully after check-in",
          );
          return { success: true };
        } else {
          log.warn(
            "[main] Tracking services not started due to check-in failure",
          );
          setApiToken("");
          setScreenCaptureToken("");
          currentUserId = null;
          return { success: false, message: "Check-in failed" };
        }
      } catch (error: any) {
        log.error("Login initialization failed:", error);
        return { success: false, error: error.message };
      }
    })();

    try {
      const result = await activeLoginPromise;
      return result;
    } finally {
      activeLoginPromise = null;
    }
  },
);

ipcMain.handle("request-location-permission-confirm", async () => {
  const activeWindow = win || BrowserWindow.getAllWindows()[0];
  if (!activeWindow) return false;

  const { response } = await dialog.showMessageBox(activeWindow, {
    type: "question",
    title: "Location Permission Request",
    message:
      "Tracking Time requires access to your location to verify your check-in. Do you want to allow this application to access your location?",
    buttons: ["Deny", "Allow"],
    defaultId: 1,
    cancelId: 0,
  });

  if (response === 1) {
    locationPermissionAllowed = true;
    return true;
  } else {
    locationPermissionAllowed = false;
    return false;
  }
});

ipcMain.handle("confirm-checkout", async () => {
  const success = await handleCheckOut();
  if (success) {
    stopScreenCapture();
    stopUserActivityTracking();
    try {
      const ses = session.fromPartition("persist:tracking-session");
      await ses.clearStorageData({
        storages: ["cookies", "localstorage"],
      });
    } catch (error) {
      log.error("Failed to clear session during checkout:", error);
    }
    currentUserId = null;
    isQuitting = true;
    setTimeout(() => {
      app.quit();
    }, 500);
    return { success: true };
  } else {
    return { success: false, message: "Checkout API failed. Check internet?" };
  }
});

ipcMain.on("cancel-close", () => {
  console.log("user cancelled checkout/close");
});

ipcMain.handle("set-location-permission-allowed", (_event, allowed) => {
  log.info(`[main] Setting locationPermissionAllowed to: ${allowed}`);
  locationPermissionAllowed = allowed;
  return true;
});

ipcMain.handle("get-ip-location", async () => {
  log.info("[main] Fetching IP Geolocation...");

  try {
    const response = await axios.get("https://ipapi.co/json/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 4000,
    });
    if (response.data && typeof response.data.latitude === "number") {
      log.info(
        `[main] IP Geolocation Success (ipapi.co): Lat: ${response.data.latitude}, Lon: ${response.data.longitude}`,
      );
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      };
    }
  } catch (err: any) {
    log.warn(`[main] ipapi.co failed: ${err.message}`);
  }

  try {
    const response = await axios.get("https://ip-api.com/json/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 4000,
    });
    if (response.data && typeof response.data.lat === "number") {
      log.info(
        `[main] IP Geolocation Success (ip-api.com): Lat: ${response.data.lat}, Lon: ${response.data.lon}`,
      );
      return { latitude: response.data.lat, longitude: response.data.lon };
    }
  } catch (err: any) {
    log.warn(`[main] ip-api.com failed: ${err.message}`);
  }

  try {
    const response = await axios.get("https://freeipapi.com/api/json", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 4000,
    });
    if (response.data && typeof response.data.latitude === "number") {
      log.info(
        `[main] IP Geolocation Success (freeipapi.com): Lat: ${response.data.latitude}, Lon: ${response.data.longitude}`,
      );
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude,
      };
    }
  } catch (err: any) {
    log.warn(`[main] freeipapi.com failed: ${err.message}`);
  }

  try {
    const response = await axios.get("https://ipinfo.io/json", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 4000,
    });
    if (response.data && typeof response.data.loc === "string") {
      const parts = response.data.loc.split(",");
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        log.info(
          `[main] IP Geolocation Success (ipinfo.io): Lat: ${lat}, Lon: ${lon}`,
        );
        return { latitude: lat, longitude: lon };
      }
    }
  } catch (err: any) {
    log.warn(`[main] ipinfo.io failed: ${err.message}`);
  }

  return {};
});

async function performLogout() {
  log.info(
    `[main] performing logout. Clearing session for user: ${currentUserId}`,
  );
  try {
    const ses = session.fromPartition("persist:tracking-session");
    await ses.clearStorageData({
      storages: ["cookies", "localstorage"],
    });
  } catch (error) {
    console.error("Failed to clear session:", error);
  }

  const activeWindow = win || BrowserWindow.getAllWindows()[0];
  if (activeWindow) {
    activeWindow.webContents.send("logout-success");
  }

  stopScreenCapture();
  stopUserActivityTracking();
  currentUserId = null;
  setApiToken("");
  setScreenCaptureToken("");
}

ipcMain.on("logout", async () => {
  await performLogout();
});

ipcMain.on("update-token", (_event, token) => {
  setApiToken(token);
  setScreenCaptureToken(token);
  import("./backgroundTask/userActivity").then((m) => m.setAuthToken(token));
});

ipcMain.on("update-active-leave", (_event, leave) => {
  updateActiveLeave(leave);
});

ipcMain.handle("test-api-connection", async () => {
  try {
    const API_URL = process.env.VITE_BACKEND_URL || "http://localhost:5000";
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
  } else {
    dialog.showErrorBox(
      "Invalid Launch URL",
      `The application tried to open an invalid URL: "${url}"\n\nPossible cause: VITE_FRONTEND_URL environment variable is missing.`,
    );
    log.error(`Failed to open external URL: ${url}`);
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
    const socketToken = params.get("socketToken");
    const refreshToken = params.get("refreshToken");
    if (token && userId) {
      if (win && win.webContents) {
        win.webContents.send("deep-link-login", {
          token,
          userId,
          companyId,
          role,
          socketToken,
          refreshToken,
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
