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
const CHECK_INTERVAL_SECONDS = 20;
const SYNC_INTERVAL_SECONDS = 60;
let INACTIVE_THRESHOLD_SECONDS = 300;
let lastScreenshotTime = 0;
let userInactive = false;
let mouseClicks = 0;
let keyboardPresses = 0;
const startUserActivityTracking = async (
  userId: string,
  trackingSettings: any,
) => {
  currentUserId = userId;
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
      if (currentSettings?.activityTracking?.enabled === false) return;
      if (!userInactive) mouseClicks++;
    });
    uIOhook.on("keydown", () => {
      if (currentSettings?.activityTracking?.enabled === false) return;
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
    if (mouseClicks === 0 && keyboardPresses === 0) return;
    const clicksToSend = mouseClicks;
    const keysToSend = keyboardPresses;
    mouseClicks = 0;
    keyboardPresses = 0;
    try {
      log.info(
        `Syncing Activity: ${clicksToSend} clicks, ${keysToSend} keys to ${apiMain.defaults.baseURL}`,
      );
      await apiMain.post("/activity/sync", {
        userId: currentUserId,
        mouseClicks: clicksToSend,
        keyboardPresses: keysToSend,
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
      const now = Date.now();
      if (idleSeconds >= INACTIVE_THRESHOLD_SECONDS) {
        if (!userInactive) {
          log.info(`User inactive for ${Math.floor(idleSeconds / 60)} minutes`);
          userInactive = true;
          handleInactiveScreenshot(idleSeconds, now);
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
const handleInactiveScreenshot = async (idleSeconds: number, now: number) => {
  try {
    lastScreenshotTime = now;
    const screenshotPath = await takeScreenshot(currentUserId);
    if (screenshotPath) {
      await uploadScreenshot(
        screenshotPath,
        currentUserId,
        "in-active",
        idleSeconds,
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
    await handleInactiveScreenshot(idleSeconds, now);
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
export { startUserActivityTracking, stopUserActivityTracking };
