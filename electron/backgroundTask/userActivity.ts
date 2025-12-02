import { powerMonitor } from "electron";
import takeScreenshot from "../utils/takeScreenshot";
import uploadScreenshot from "../utils/uploadScreenshot";

let activityInterval: NodeJS.Timeout | null = null;
let currentUserId: string = "";
let currentSettings: any = null;

const CHECK_INTERVAL_SECONDS = 20;
let INACTIVE_THRESHOLD_SECONDS = 300;

let lastScreenshotTime = 0;
let userInactive = false;

const startUserActivityTracking = async (
  userId: string,
  trackingSettings: any
) => {
  currentUserId = userId;
  currentSettings = trackingSettings;

  if (activityInterval) {
    console.log("Restarting activity tracking...");
    stopUserActivityTracking();
  }

  if (!currentSettings?.isActive)
    return console.log("Tracking is inactive for this user/company");

  if (!currentSettings?.idleDetection?.enabled)
    return console.log("Idle detection is disabled");

  const idleThresholdMinutes =
    currentSettings.idleDetection?.idleThreshold || 10;
  INACTIVE_THRESHOLD_SECONDS = idleThresholdMinutes * 60;

  console.log(`Idle threshold set to ${idleThresholdMinutes} minutes`);

  startActivityMonitoring();
};

const startActivityMonitoring = () => {
  activityInterval = setInterval(async () => {
    try {
      const idleSeconds = powerMonitor.getSystemIdleTime();
      const now = Date.now();

      if (idleSeconds >= INACTIVE_THRESHOLD_SECONDS) {
        if (!userInactive) {
          console.log(
            `User inactive for ${Math.floor(idleSeconds / 60)} minutes`
          );

          lastScreenshotTime = now;
          userInactive = true;

          try {
            const screenshotPath = await takeScreenshot(currentUserId);
            if (screenshotPath) {
              await uploadScreenshot(
                screenshotPath,
                currentUserId,
                "in-active",
                idleSeconds
              );
            }
          } catch (error) {
            console.error("Failed to upload idle screenshot:", error);
          }
        } else {
          const timeSinceLastScreenshot = now - lastScreenshotTime;
          const screenshotInterval = INACTIVE_THRESHOLD_SECONDS * 1000;

          if (timeSinceLastScreenshot >= screenshotInterval) {
            console.log("User still inactive, taking periodic screenshot...");

            try {
              const screenshotPath = await takeScreenshot(currentUserId);

              if (screenshotPath) {
                const res = await uploadScreenshot(
                  screenshotPath,
                  currentUserId,
                  "in-active",
                  idleSeconds
                );

                console.log("response for in-active", res);
              }
            } catch (error) {
              console.error("Failed to upload idle screenshot:", error);
            }
          }
        }
      } else {
        if (userInactive) {
          console.log("User became active again");
          userInactive = false;
          lastScreenshotTime = 0;
        }
      }
    } catch (err) {
      console.error("Error in activity tracking:", err);
    }
  }, CHECK_INTERVAL_SECONDS * 1000);
};

const stopUserActivityTracking = () => {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }

  userInactive = false;
  lastScreenshotTime = 0;
  currentSettings = null;

  console.log("Stopped user activity tracking");
};

export { startUserActivityTracking, stopUserActivityTracking };
