import { powerMonitor } from "electron";
import captureScreen from "../utils/captueScreen";

let activityInterval: NodeJS.Timeout | null = null;

const CHECK_INTERVAL_SECONDS = 20;
const INACTIVE_THRESHOLD_SECONDS = 300;

let lastScreenshotTime = 0;
let userInactive = false;

const startUserActivityTracking = (userId: string) => {
  if (activityInterval) return;

  console.log("Starting user activity tracking...");

  activityInterval = setInterval(async () => {
    try {
      const inactiveSeconds = powerMonitor.getSystemIdleTime();
      const now = Date.now();

      console.log(`User inactive for ${inactiveSeconds}s`);
      if (inactiveSeconds >= INACTIVE_THRESHOLD_SECONDS) {
        if (!userInactive) {
          console.log(
            "User inactive for 10+ minutes, taking first screenshot..."
          );

          lastScreenshotTime = now;
          userInactive = true;

          await captureScreen(userId, "in-active", inactiveSeconds);
        } else if (
          now - lastScreenshotTime >=
          INACTIVE_THRESHOLD_SECONDS * 1000
        ) {
          console.log("User still inactive, taking another screenshot...");
          await captureScreen(userId, "in-active", inactiveSeconds);
          lastScreenshotTime = now;
        }
      } else {
        if (userInactive) {
          console.log("User became active again, reset tracking.");
        }
        userInactive = false;
        lastScreenshotTime = 0;
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
    console.log("Stopped user activity tracking");
  }
};

export { startUserActivityTracking, stopUserActivityTracking };
