import fs from "fs";
import FormData from "form-data";
import DataService from "../../src/services/DataServices";

async function uploadScreenshot(
  filePath: string,
  loggedInUserId: string,
  activity?: string,
  inActiveDuration?: number
) {
  try {
    const formData = new FormData();
    formData.append("image", fs.createReadStream(filePath));
    formData.append("userId", loggedInUserId);
    formData.append("activity", activity);
    formData.append("inActiveDuration", inActiveDuration);

    const res = await DataService.uploadImage(formData);

    if (res.status === 200) console.log("Screenshot uploaded successfully");
  } catch (err) {
    console.error("Screenshot upload failed:", err);
  }
}

export default uploadScreenshot;
