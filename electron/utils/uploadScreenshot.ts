import fs from "fs";
import FormData from "form-data";
import apiMain from "./apiMain";
import log from "electron-log";
async function uploadScreenshot(
  filePath: string,
  loggedInUserId: string,
  activity?: string,
  inActiveDuration?: number,
  _token?: string,
) {
  try {
    if (!fs.existsSync(filePath))
      return log.error("Screenshot file does not exist:", filePath);
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));
    formData.append("userId", loggedInUserId);
    if (activity) formData.append("activity", activity);
    if (inActiveDuration)
      formData.append("inActiveDuration", inActiveDuration.toString());
    log.info(
      `Uploading screenshot to ${apiMain.defaults.baseURL}/upload/image`,
    );
    const res = await apiMain.post("/upload/image", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    if (res.status === 200 || res.status === 201) {
      log.info("Screenshot uploaded successfully");
      try {
        fs.unlinkSync(filePath);
        log.info("Temporary screenshot file deleted");
      } catch (cleanupError) {
        log.warn("Failed to delete temporary file:", cleanupError);
      }
    } else {
      log.info("Upload response:", res.status, res.data);
    }
    return res;
  } catch (err: any) {
    log.error(
      "Screenshot upload failed:",
      err.message,
      err.response?.data || "",
    );
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {}
  }
}
export default uploadScreenshot;
