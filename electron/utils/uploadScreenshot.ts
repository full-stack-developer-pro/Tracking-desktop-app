import fs from "fs";
import FormData from "form-data";
import { uploadImage } from "../../src/services/DataServices";

async function uploadScreenshot(
  filePath: string,
  loggedInUserId: string,
  activity?: string,
  inActiveDuration?: number
) {
  try {
    if (!fs.existsSync(filePath))
      return console.error("Screenshot file does not exist:", filePath);

    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));
    formData.append("userId", loggedInUserId);

    if (activity) formData.append("activity", activity);
    if (inActiveDuration)
      formData.append("inActiveDuration", inActiveDuration.toString());

    const res = await uploadImage(formData);

    if (res.status === 200 || res.status === 201) {
      console.log("Screenshot uploaded successfully");

      try {
        fs.unlinkSync(filePath);
        console.log("Temporary screenshot file deleted");
      } catch (cleanupError) {
        console.warn("Failed to delete temporary file:", cleanupError);
      }
    } else {
      console.log("Upload response:", res.status, res.data);
    }

    return res;
  } catch (err: any) {
    console.error("Screenshot upload failed:", err.message);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {}
  }
}

export default uploadScreenshot;
