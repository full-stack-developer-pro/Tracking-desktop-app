import captureScreen from "../utils/captueScreen";
import uploadScreenshot from "../utils/uploadScreenshot";
import getRandomMinutes from "../utils/getRandomMinutes";
import log from "electron-log";
let captureInterval: NodeJS.Timeout | null = null;
let loggedInUserId: string = "";
let authToken: string = "";
let currentSettings: any = null;

const startScreenCapture = async (
  userId: string,
  trackingSettings: any,
  token: string,
) => {
  log.info("Starting screen capture with settings:", trackingSettings);
  loggedInUserId = userId;
  authToken = token;
  currentSettings = trackingSettings;
  if (!currentSettings?.randomScreenshot?.enabled)
    return log.info("Screenshot capture is disabled in settings");
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
  }
  scheduleNextCapture(userId);
};

const stopScreenCapture = () => {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
  }
  currentSettings = null;
  loggedInUserId = "";
  authToken = "";
  log.info("Screen capture stopped");
};

const scheduleNextCapture = async (userId: string) => {
  const maxInterval = currentSettings?.randomScreenshot?.interval || 20;
  const randomInterval = getRandomMinutes(maxInterval, 1);
  const intervalMs = randomInterval * 60 * 1000;
  log.info(
    `Next random screenshot in ${randomInterval} minutes (max: ${maxInterval})`,
  );
  captureInterval = setTimeout(async () => {
    try {
      if (currentSettings?.randomScreenshot?.enabled && loggedInUserId) {
        log.info("Taking scheduled random screenshot...");
        const screenshotPath = await captureScreen(userId);
        if (screenshotPath)
          await uploadScreenshot(
            screenshotPath,
            userId,
            "active",
            0,
            authToken,
          );
      }
      if (currentSettings && loggedInUserId)
        scheduleNextCapture(userId);
    } catch (error) {
      log.error("Error in scheduled capture:", error);
      if (currentSettings && loggedInUserId) {
        scheduleNextCapture(userId);
      }
    }
  }, intervalMs);
};

export const setAuthToken = (token: string) => {
  authToken = token;
  log.info("Auth token updated for screen capture");
};

const updateScreenCaptureSettings = (newSettings: any) => {
  currentSettings = newSettings;
  log.info("Screen capture settings dynamically updated from Socket.io!");

  if (loggedInUserId && authToken) {
    startScreenCapture(loggedInUserId, currentSettings, authToken);
  }
};

export {
  startScreenCapture,
  stopScreenCapture,
  currentSettings,
  updateScreenCaptureSettings,
};
