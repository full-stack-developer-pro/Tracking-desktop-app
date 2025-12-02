import captureScreen from "../utils/captueScreen";
import uploadScreenshot from "../utils/uploadScreenshot";

let captureInterval: NodeJS.Timeout | null = null;
let loggedInUserId: string = "";
let currentSettings: any = null;

const startScreenCapture = async (userId: string, trackingSettings: any) => {
  console.log("Starting screen capture with settings:", trackingSettings);

  loggedInUserId = userId;
  currentSettings = trackingSettings;

  if (!currentSettings?.randomScreenshot?.enabled)
    return console.log("Screenshot capture is disabled in settings");

  const intervalMinutes = currentSettings.randomScreenshot?.interval || 20;
  console.log(`Screenshot interval: ${intervalMinutes} minutes`);

  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
  }

  scheduleNextCapture(intervalMinutes, userId);
};

const stopScreenCapture = () => {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
  }
  currentSettings = null;
  loggedInUserId = "";
  console.log("Screen capture stopped");
};

const scheduleNextCapture = async (intervalMinutes: number, userId: string) => {
  const intervalMs = intervalMinutes * 60 * 1000;

  captureInterval = setTimeout(async () => {
    try {
      if (currentSettings?.randomScreenshot?.enabled && loggedInUserId) {
        console.log("Taking scheduled screenshot...");

        const screenshotPath = await captureScreen(userId);

        if (screenshotPath)
          await uploadScreenshot(screenshotPath, userId, "active");
      }

      if (currentSettings && loggedInUserId)
        scheduleNextCapture(intervalMinutes, userId);
    } catch (error) {
      console.error("Error in scheduled capture:", error);

      if (currentSettings && loggedInUserId) {
        scheduleNextCapture(intervalMinutes, userId);
      }
    }
  }, intervalMs);
};

export { startScreenCapture, stopScreenCapture, currentSettings };
