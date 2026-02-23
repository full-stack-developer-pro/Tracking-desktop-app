import { powerMonitor } from "electron";
import takeScreenshot from "../utils/takeScreenshot";
import uploadScreenshot from "../utils/uploadScreenshot";
import { uIOhook } from "uiohook-napi";
import apiMain from "../utils/apiMain";
import log from "electron-log";
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
let mouseClicks = 0;
let keyboardPresses = 0;
const startUserActivityTracking = async (
  userId: string,
  trackingSettings: any,
  token?: string,
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
  setupInputHook();
  startActivityMonitoring();
  startSyncingActivity();
};
const setupInputHook = () => {
  try {
    uIOhook.on("mousedown", () => {
      if (currentSettings?.trackMouseClicks === false) return;
      if (!userInactive) mouseClicks++;
    });
    uIOhook.on("keydown", () => {
      if (currentSettings?.trackKeyboard === false) return;
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
            now,
            Math.floor(idleSeconds / 60),
          );
        } else {
          handlePeriodicInactiveScreenshot(idleSeconds, now);
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
const stopUserActivityTracking = () => {
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
  lastScreenshotTime = 0;
  currentSettings = null;
  mouseClicks = 0;
  keyboardPresses = 0;
  log.info("Stopped user activity tracking");
};
const setAuthToken = (token: string) => {
  authToken = token;
  log.info("Auth token updated for user activity tracking");
};
export { startUserActivityTracking, stopUserActivityTracking, setAuthToken };
