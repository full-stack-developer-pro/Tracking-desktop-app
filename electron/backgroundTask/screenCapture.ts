import { desktopCapturer, app } from "electron";
import fs from "fs";
import path from "path";
// import axios from "axios";
import FormData from "form-data";
import DataService from "../../src/services/DataServices";

let captureInterval: NodeJS.Timeout | null = null;
let loggedInUserId: string;

export const startScreenCapture = (userId: string) => {
  if (captureInterval) {
    console.log("Screen capture already running");
    return;
  }

  loggedInUserId = userId;

  scheduleCapture(loggedInUserId);
};

export const stopScreenCapture = () => {
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

function getRandomMinutes(max: number, min: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function captureScreen(loggedInUserId: string) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources[0]) {
      console.error("No screen source found");
      return;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const screenshotPath = path.join(
      app.getPath("temp"),
      `screenshot_${Date.now()}.png`
    );

    fs.writeFileSync(screenshotPath, buffer);
    // console.log(`Screenshot saved to ${screenshotPath}`);

    await uploadScreenshot(screenshotPath, loggedInUserId);
    fs.unlinkSync(screenshotPath);
  } catch (err) {
    console.error("Screen capture failed:", err);
  }
}

async function uploadScreenshot(filePath: string, loggedInUserId: string) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));
    formData.append("userId", loggedInUserId);

    const res = await DataService.uploadImage(formData);

    if (res.status === 200) console.log("Screenshot uploaded successfully");
  } catch (err) {
    console.error("Screenshot upload failed:", err);
  }
}
