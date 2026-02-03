import { desktopCapturer } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
async function captureScreen(userId: string): Promise<string | null> {
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
    const tempDir = os.tmpdir();
    const screenshotPath = path.join(
      tempDir,
      `screenshot_${Date.now()}_${userId}.png`
    );
    fs.writeFileSync(screenshotPath, buffer);
    console.log(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (err: any) {
    console.error("Screen capture failed:", err.message);
    return null;
  }
}
export default captureScreen;
