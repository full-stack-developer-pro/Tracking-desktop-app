import captureScreen from "../utils/captueScreen";
import getRandomMinutes from "../utils/getRandomMinutes";

let captureInterval: NodeJS.Timeout | null = null;
let loggedInUserId: string;
let loggedInCompanyId: string;

const startScreenCapture = (userId: string, companyId: string) => {
  if (captureInterval) {
    console.log("Screen capture already running");
    return;
  }

  loggedInUserId = userId;
  loggedInCompanyId = companyId;

  scheduleCapture();
};

const scheduleCapture = async () => {
  const nextInterval = getRandomMinutes(20, 10);
  console.log(`Next screenshot scheduled in ${nextInterval} minutes`);

  captureInterval = setTimeout(async () => {
    console.log("Starting scheduled capture...");
    await captureScreen(loggedInUserId, loggedInCompanyId);
    scheduleCapture();
  }, nextInterval * 1000);
};

const stopScreenCapture = () => {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
    loggedInUserId = "";
    loggedInCompanyId = "";
    console.log("Screen capture stopped");
  }
};

export { startScreenCapture, stopScreenCapture };
