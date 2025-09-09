import { app, desktopCapturer } from "electron";
import path from "path";
import fs from "fs";
import uploadScreenshot from "./uploadScreenshot";

const captureScreen = async (
  userId: string,
  metaData?: { activity?: string; inActiveDuration?: number }
) => {
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

    await uploadScreenshot({
      screenshotPath,
      userId,
      metaData,
    });

    fs.unlinkSync(screenshotPath);
  } catch (err) {
    console.error("Screen capture failed:", err);
  }
};

export default captureScreen;
