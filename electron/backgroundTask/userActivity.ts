import { powerMonitor, BrowserWindow } from "electron";
import {
  startScreenCapture,
  stopScreenCapture,
  updateScreenCaptureSettings,
} from "./screenCapture";
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
let currentSocketToken: string = "";
const CHECK_INTERVAL_SECONDS = 10;
const SYNC_INTERVAL_SECONDS = 60;
let INACTIVE_THRESHOLD_SECONDS = 300;
let lastScreenshotTime = 0;
let userInactive = false;
let userOnBreak = false;
let userOnLeave = false;
let currentLeaves: any[] = [];
let mouseClicks = 0;

let keyboardPresses = 0;

powerMonitor.on("suspend", () => {
  log.info("System suspended (sleep mode). Pausing tracking interval.");
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
});

powerMonitor.on("resume", () => {
  log.info("System resumed. Restarting tracking interval.");
  if (currentUserId && authToken) {
    startActivityMonitoring();
  }
});

const setupSocketIO = (socketToken: string) => {
  currentSocketToken = socketToken;
  try {
    let baseURL = process.env.VITE_BACKEND_URL;
    if (apiMain.defaults.baseURL) {
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
            try {
              const windows = BrowserWindow.getAllWindows();
              if (windows.length > 0) {
                windows[0].webContents.send("user-break-started");
              }
            } catch (e) {}
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
      userOnBreak = true;
      userInactive = false;
      lastScreenshotTime = 0;
      stopScreenCapture();
      try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send("user-break-started");
        }
      } catch (e) {}
      log.info("Manual break started — All tracking paused.");
    });

    socket.on("BREAK_ENDED", () => {
      userOnBreak = false;
      userInactive = false;
      lastScreenshotTime = 0;
      if (currentSettings?.isActive !== false && currentUserId && authToken) {
        startScreenCapture(currentUserId, currentSettings, authToken);
      }
      try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send("user-break-ended");
        }
      } catch (e) {}
      log.info("Manual break ended — Tracking resumed.");
    });

    socket.on("CHECKED_OUT", () => {
      try {
        stopUserActivityTracking();
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
      const wasActive = currentSettings?.isActive !== false;
      currentSettings = newSettings;

      if (newSettings?.idleDetection?.idleThreshold) {
        INACTIVE_THRESHOLD_SECONDS =
          newSettings.idleDetection.idleThreshold * 60;
      }

      updateScreenCaptureSettings(newSettings);

      try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send("settings-synced-live", newSettings);
        }
      } catch (e) {}

      if (wasActive && newSettings?.isActive === false) {
        log.info("Tracking disabled by admin — Stopping all services.");
        stopUserActivityTracking();
        stopScreenCapture();
        try {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send("tracking-stopped-by-admin");
          }
        } catch (e) {}
      } else if (!wasActive && newSettings?.isActive !== false) {
        log.info("Tracking enabled by admin — Restarting services.");
        if (currentUserId && authToken) {
          startUserActivityTracking(
            currentUserId,
            newSettings,
            authToken,
            currentSocketToken,
          );
          startScreenCapture(currentUserId, newSettings, authToken);
        }
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
      checkLeaveStatus();

      if (userOnBreak) {
        return;
      }

      if (userOnLeave) {
        return;
      }

      const idleSeconds = powerMonitor.getSystemIdleTime();

      const now = new Date();

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

function updateActiveLeave(leaves: any[]) {
  currentLeaves = Array.isArray(leaves) ? leaves : leaves ? [leaves] : [];
  if (currentLeaves.length > 0) {
    log.info(
      `[Activity] Active leaves updated: ${currentLeaves.length} records.`,
    );
  } else {
    log.info("[Activity] Active leaves cleared.");
    userOnLeave = false;
  }
}

function checkLeaveStatus() {
  if (!currentLeaves || currentLeaves.length === 0) return;

  const now = new Date();

  const activeLeave = currentLeaves.find((l) => {
    if (!l.startTime || !l.endTime) return true;

    try {
      const [startH, startM] = l.startTime.split(":").map(Number);
      const [endH, endM] = l.endTime.split(":").map(Number);

      const start = new Date(now);
      start.setHours(startH, startM, 0, 0);

      const end = new Date(now);
      end.setHours(endH, endM, 59, 999);

      return now >= start && now <= end;
    } catch (err) {
      log.error("[Activity] Error parsing leave times:", err);
      return false;
    }
  });

  const isInside = !!activeLeave;

  if (isInside && !userOnLeave) {
    userOnLeave = true;
    log.info("[Activity] Leave period started — Auto-pausing tracking.");
    stopScreenCapture();
    try {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("user-leave-status", {
          active: true,
          leave: activeLeave,
        });
      }
    } catch (e) {}
  } else if (!isInside && userOnLeave) {
    userOnLeave = false;
    log.info("[Activity] Leave period ended — Auto-resuming tracking.");
    if (currentSettings?.isActive !== false && currentUserId && authToken) {
      startScreenCapture(currentUserId, currentSettings, authToken);
    }
    try {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        windows[0].webContents.send("user-leave-status", { active: false });
      }
    } catch (e) {}
  }
}

const setAuthToken = (token: string) => {
  authToken = token;
  log.info("Auth token updated for user activity tracking");
};

export {
  startUserActivityTracking,
  stopUserActivityTracking,
  setAuthToken,
  updateActiveLeave,
};
