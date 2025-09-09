import fs from "fs";
import DataService from "../../src/services/DataServices";
import FormData from "form-data";

interface UploadData {
  screenshotPath: string;
  userId: string;
  metaData?: {
    activity?: string;
    inActiveDuration?: number;
  };
}

const uploadScreenshot = async (data: UploadData) => {
  try {
    const { screenshotPath, userId, metaData } = data;

    const formData = new FormData();
    formData.append("image", fs.createReadStream(screenshotPath));
    formData.append("userId", userId);

    if (metaData?.activity) formData.append("activity", metaData.activity);
    if (metaData?.inActiveDuration !== undefined)
      formData.append("inActiveDuration", String(metaData.inActiveDuration));

    console.log("activity", metaData?.activity);
    console.log("inActiveDuration", metaData?.inActiveDuration);
    const res = await DataService.uploadImage(formData);

    if (res.status === 200) console.log("Screenshot uploaded successfully");
  } catch (err) {
    console.error("Screenshot upload failed:", err);
  }
};

export default uploadScreenshot;
