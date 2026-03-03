import { powerMonitor } from "electron";
import takeScreenshot from "../utils/takeScreenshot";
import uploadScreenshot from "../utils/uploadScreenshot";
import { uIOhook } from "uiohook-napi";
import apiMain from "../utils/apiMain";
import log from "electron-log";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let activityInterval: NodeJS.Timeout | null = null;
let syncInterval: NodeJS.Timeout | null = null;
let currentUserId: string = "";
let currentSettings: any = null;
let authToken: string = "";
const CHECK_INTERVAL_SECONDS = 10;
const SYNC_INTERVAL_SECONDS = 60;
let INACTIVE_THRESHOLD_SECONDS = 300;
let lastScreenshotTime = 0;
let userInactive = false;
let userOnBreak = false;
let mouseClicks = 0;
let keyboardPresses = 0;
let isSuspended = false;

powerMonitor.on("suspend", () => {
  log.info("System suspended (sleep mode). Pausing tracking interval.");
  isSuspended = true;
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
});

powerMonitor.on("resume", () => {
  log.info("System resumed. Restarting tracking interval.");
  isSuspended = false;
  if (currentUserId && authToken) {
    startActivityMonitoring();
  }
});

const setupSocketIO = (socketToken: string) => {
  try {
    let baseURL = process.env.VITE_BACKEND_URL || "http://localhost:5000";
    if (apiMain.defaults.baseURL) {
      // apiMain is configured remotely. We strip "/api" to get the pure socket domain
      baseURL = apiMain.defaults.baseURL.replace("/api", "");
    }
    log.info(`Initializing Socket.IO to ${baseURL}`);
    socket = io(baseURL, {
      auth: { socketToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
    });

    socket.on("connect", async () => {
      log.info(`Socket connected for Desktop Tracking! ID: ${socket?.id}`);
      try {
        const breakRes = await apiMain.get("/breaks/status");
        if (breakRes.data?.success) {
          if (breakRes.data.isOnBreak) {
            log.info("Socket reconnected: User is ON break. Pausing.");
            userOnBreak = true;
            userInactive = false;
          } else {
            log.info("Socket reconnected: User is NOT on break.");
            userOnBreak = false;
          }
        }
      } catch (err) {
        log.error("Failed to sync break status on reconnect", err);
      }
    });

    socket.on("connect_error", (err) => {
      log.error("Socket tracking connection error:", err.message);
    });

    socket.on("BREAK_STARTED", () => {
      log.info("Socket event: BREAK_STARTED -> Immediately Pausing tracking.");
      userOnBreak = true;
      userInactive = false;
      lastScreenshotTime = 0;
    });

    socket.on("BREAK_ENDED", () => {
      log.info("Socket event: BREAK_ENDED -> Immediately Resuming tracking.");
      userOnBreak = false;
      userInactive = false;
      lastScreenshotTime = 0;
    });

    socket.on("CHECKED_OUT", () => {
      log.info(
        "Socket event: CHECKED_OUT -> User checked out from web. Stopping tracking.",
      );
      try {
        const { BrowserWindow } = require("electron");
        stopUserActivityTracking();
        const { stopScreenCapture } = require("./screenCapture");
        stopScreenCapture();
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send("session-expired");
        }
      } catch (err) {
        log.error("Failed to handle CHECKED_OUT event cleanly:", err);
      }
    });

    socket.on("TRACKING_SETTINGS_UPDATED", (newSettings: any) => {
      log.info(
        "Socket event: TRACKING_SETTINGS_UPDATED -> Applying live settings to memory!",
      );

      const wasActive = currentSettings?.isActive !== false;
      currentSettings = newSettings;

      if (newSettings?.idleDetection?.idleThreshold) {
        INACTIVE_THRESHOLD_SECONDS =
          newSettings.idleDetection.idleThreshold * 60;
        log.info(
          `Idle threshold synced to ${newSettings.idleDetection.idleThreshold} minutes.`,
        );
      }

      const { updateScreenCaptureSettings } = require("./screenCapture");
      updateScreenCaptureSettings(newSettings);

      if (wasActive && newSettings?.isActive === false) {
        log.info(
          "Admin disabled tracking globally. Stopping background processes.",
        );
        stopUserActivityTracking();
        const { stopScreenCapture } = require("./screenCapture");
        stopScreenCapture();
        try {
          const { BrowserWindow } = require("electron");
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send("tracking-stopped-by-admin");
          }
        } catch (e) {}
      }
    });
  } catch (err) {
    log.error("Failed to setup socket", err);
  }
};

const startUserActivityTracking = async (
  userId: string,
  trackingSettings: any,
  token?: string,
  socketToken?: string,
) => {
  currentUserId = userId;
  if (token) authToken = token;
  currentSettings = trackingSettings;
  if (activityInterval) {
    log.info("Restarting activity tracking...");
    stopUserActivityTracking();
  }
  if (!currentSettings?.isActive)
    return log.info("Tracking is inactive for this user/company");
  const idleThresholdMinutes =
    currentSettings.idleDetection?.idleThreshold || 10;
  INACTIVE_THRESHOLD_SECONDS = idleThresholdMinutes * 60;
  log.info(`Idle threshold set to ${idleThresholdMinutes} minutes`);
  mouseClicks = 0;
  keyboardPresses = 0;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  if (socketToken) {
    setupSocketIO(socketToken);
  } else {
    log.warn("No socketToken provided; real-time break events will not work.");
  }

  setupInputHook();
  startActivityMonitoring();
  startSyncingActivity();
};
const setupInputHook = () => {
  try {
    uIOhook.on("mousedown", () => {
      if (currentSettings?.trackMouseClicks === false || userOnBreak) return;
      if (!userInactive) mouseClicks++;
    });
    uIOhook.on("keydown", () => {
      if (currentSettings?.trackKeyboard === false || userOnBreak) return;
      if (!userInactive) keyboardPresses++;
    });
    uIOhook.start();
    log.info("Global input hook started.");
  } catch (error) {
    log.error("Failed to start uIOhook:", error);
  }
};
const stopInputHook = () => {
  try {
    uIOhook.stop();
    uIOhook.removeAllListeners();
    log.info("Global input hook stopped.");
  } catch (error) {
    log.error("Error stopping hook:", error);
  }
};
const startSyncingActivity = () => {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    if (
      currentSettings?.trackMouseClicks === false &&
      currentSettings?.trackKeyboard === false
    )
      return;
    if (mouseClicks === 0 && keyboardPresses === 0) return;
    const clicksToSend = mouseClicks;
    const keysToSend = keyboardPresses;
    mouseClicks = 0;
    keyboardPresses = 0;
    try {
      const today = new Date().toISOString().split("T")[0];
      log.info(
        `Syncing Activity: ${clicksToSend} clicks, ${keysToSend} keys for ${today} to ${apiMain.defaults.baseURL}`,
      );
      await apiMain.post("/activity/sync", {
        userId: currentUserId,
        mouseClicks: clicksToSend,
        keyboardPresses: keysToSend,
        date: today,
      });
    } catch (error) {
      log.error("Failed to sync activity counts:", error);
      mouseClicks += clicksToSend;
      keyboardPresses += keysToSend;
    }
  }, SYNC_INTERVAL_SECONDS * 1000);
};

const startActivityMonitoring = () => {
  activityInterval = setInterval(async () => {
    try {
      try {
        const breakRes = await apiMain.get("/breaks/status");
        if (breakRes.data?.success && breakRes.data?.isOnBreak) {
          log.info("User is on an active break -> Pausing tracking.");
          userOnBreak = true;
          userInactive = false;
          lastScreenshotTime = 0;
          return;
        } else {
          userOnBreak = false;
        }
      } catch (err) {
        log.error("Failed to fetch break status:", err);
        userOnBreak = false;
      }

      const idleSeconds = powerMonitor.getSystemIdleTime();
      const now = new Date();

      if (currentSettings?.breakTime?.enabled) {
        const { startTime, endTime } = currentSettings.breakTime;
        const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        if (currentTimeStr >= startTime && currentTimeStr <= endTime) {
          if (userInactive) {
            log.info("Break time started - marking user as active");
            userInactive = false;
            lastScreenshotTime = 0;
          }
          return;
        }
      }

      if (idleSeconds >= INACTIVE_THRESHOLD_SECONDS) {
        if (!userInactive) {
          log.info(`User inactive for ${Math.floor(idleSeconds / 60)} minutes`);
          userInactive = true;
          handleInactiveScreenshot(
            idleSeconds,
            now.getTime(),
            Math.floor(idleSeconds / 60),
          );
        } else {
          handlePeriodicInactiveScreenshot(idleSeconds, now.getTime());
        }
      } else {
        if (userInactive) {
          log.info("User became active again");
          userInactive = false;
          lastScreenshotTime = 0;
        }
      }
    } catch (err) {
      log.error("Error in activity tracking:", err);
    }
  }, CHECK_INTERVAL_SECONDS * 1000);
};
const handleInactiveScreenshot = async (
  idleSeconds: number,
  now: number,
  durationToSend: number = 0,
) => {
  try {
    lastScreenshotTime = now;
    const screenshotPath = await takeScreenshot(currentUserId);
    if (screenshotPath) {
      await uploadScreenshot(
        screenshotPath,
        currentUserId,
        "in-active",
        durationToSend || Math.floor(idleSeconds / 60),
        authToken,
      );
    }
  } catch (error) {
    log.error("Error taking inactive screenshot", error);
  }
};
const handlePeriodicInactiveScreenshot = async (
  idleSeconds: number,
  now: number,
) => {
  const timeSinceLastScreenshot = now - lastScreenshotTime;
  const screenshotInterval = INACTIVE_THRESHOLD_SECONDS * 1000;

  if (timeSinceLastScreenshot >= screenshotInterval) {
    log.info("User still inactive, taking periodic screenshot...");

    const incrementalMinutes = Math.floor(INACTIVE_THRESHOLD_SECONDS / 60);

    await handleInactiveScreenshot(idleSeconds, now, incrementalMinutes);

    lastScreenshotTime = now;
  }
};
function stopUserActivityTracking() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  stopInputHook();
  userInactive = false;
  userOnBreak = false;
  lastScreenshotTime = 0;
  currentSettings = null;
  mouseClicks = 0;
  keyboardPresses = 0;
  log.info("Stopped user activity tracking");
}

const setAuthToken = (token: string) => {
  authToken = token;
  log.info("Auth token updated for user activity tracking");
};

export { startUserActivityTracking, stopUserActivityTracking, setAuthToken };
