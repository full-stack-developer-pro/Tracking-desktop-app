import { powerMonitor } from "electron";
import captureScreen from "../utils/captueScreen";

let activityInterval: NodeJS.Timeout | null = null;
// const CHECK_INTERVAL_SECONDS = 60;
// const INACTIVE_THRESHOLD_MINUTES = 10;
// const REPEAT_CAPTURE_MINUTES = 10;

const CHECK_INTERVAL_SECONDS = 5;
const INACTIVE_THRESHOLD_SECONDS = 20;

let lastScreenshotTime = 0;
let userInactive = false;

// const data = {
//   activity: "in-active",
//   inActiveDuration: inactiveSeconds,
// };

const startUserActivityTracking = (userId: string) => {
  if (activityInterval) return;

  console.log("Starting user activity tracking...");

  activityInterval = setInterval(async () => {
    try {
      const inactiveSeconds = powerMonitor.getSystemIdleTime();
      const now = Date.now();

      console.log(`User inactive for ${inactiveSeconds}s`);
      // INACTIVE_THRESHOLD_MINUTES * 60
      if (inactiveSeconds >= INACTIVE_THRESHOLD_SECONDS) {
        if (!userInactive) {
          console.log(
            "User inactive for 10+ minutes, taking first screenshot..."
          );
          lastScreenshotTime = now;
          userInactive = true;

          await captureScreen(userId, {
            activity: "in-active",
            inActiveDuration: inactiveSeconds,
          });
        } else if (
          now - lastScreenshotTime >=
          // REPEAT_CAPTURE_MINUTES * 60 * 1000
          INACTIVE_THRESHOLD_SECONDS * 1000
        ) {
          console.log("User still inactive, taking another screenshot...");
          await captureScreen(userId, {
            activity: "in-active",
            inActiveDuration: inactiveSeconds,
          });
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
