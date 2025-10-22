import getRandomMinutes from "../utils/getRandomMinutes";
import captureScreen from "../utils/captueScreen";

let captureInterval: NodeJS.Timeout | null = null;
let loggedInUserId: string;

const startScreenCapture = (userId: string) => {
  if (captureInterval) {
    console.log("Screen capture already running");
    return;
  }

  loggedInUserId = userId;

  scheduleCapture(loggedInUserId);
};

const stopScreenCapture = () => {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
    console.log("Screen capture stopped");
  }
};

function scheduleCapture(loggedInUserId: string) {
  const nextInterval = getRandomMinutes(20, 10);
  console.log(`Next screenshot scheduled in ${nextInterval} minutes`);

  captureInterval = setTimeout(async () => {
    // console.log("Starting scheduled capture...");
    await captureScreen(loggedInUserId);
    scheduleCapture(loggedInUserId);
  }, nextInterval * 60 * 1000);
}

export { startScreenCapture, stopScreenCapture };
