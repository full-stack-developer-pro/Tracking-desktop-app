// electron/backgroundTask/screenCapture.ts
import { desktopCapturer, app } from "electron";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

let captureInterval: NodeJS.Timeout | null = null;

export const startScreenCapture = (userId: string) => {
  if (captureInterval) {
    console.log("Screen capture already running");
    return;
  }

  scheduleCapture(userId);
};

export const stopScreenCapture = () => {
  if (captureInterval) {
    clearTimeout(captureInterval);
    captureInterval = null;
    console.log("Screen capture stopped");
  }
};

function scheduleCapture(userId: string) {
  const nextInterval = getRandomMinutes(10, 20);
  console.log(`Next screenshot scheduled in ${nextInterval} minutes`);

  captureInterval = setTimeout(async () => {
    console.log("🎬 Starting scheduled capture...");
    await captureScreen(userId);
    scheduleCapture(userId);
  }, nextInterval * 1000);
}

function getRandomMinutes(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function captureScreen(userId: string) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources[0]) {
      console.error("❌ No screen source found");
      return;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const screenshotPath = path.join(
      app.getPath("temp"),
      `screenshot_${Date.now()}.png`
    );

    fs.writeFileSync(screenshotPath, buffer);
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

    await uploadScreenshot(screenshotPath, userId);
    fs.unlinkSync(screenshotPath);
  } catch (err) {
    console.error("❌ Screen capture failed:", err);
  }
}

async function uploadScreenshot(filePath: string, userId: string) {
  try {
    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));
    form.append("userId", userId);

    await axios.post("http://localhost:3000/api/upload/image", form, {
      headers: form.getHeaders(),
    });

    console.log("✅ Screenshot uploaded successfully");
  } catch (err) {
    console.error("❌ Screenshot upload failed:", err);
  }
}
