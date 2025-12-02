import { desktopCapturer, app } from "electron";
import path from "path";
import fs from "fs";

async function takeScreenshot(userId: string): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources[0]) {
      console.error("No screen source found");
      return null;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const screenshotPath = path.join(
      app.getPath("temp"),
      `screenshot_${Date.now()}_${userId}.png`
    );

    fs.writeFileSync(screenshotPath, buffer);
    console.log(`Screenshot taken: ${screenshotPath}`);

    return screenshotPath;
  } catch (err: any) {
    console.error("Failed to take screenshot:", err.message);
    return null;
  }
}

export default takeScreenshot;
