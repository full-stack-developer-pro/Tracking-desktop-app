import fs from "fs";
import axios from "axios";
import FormData from "form-data";

interface UploadData {
  screenshotPath: string;
  userId: string;
  companyId: string;
  metaData?: {
    activity?: string;
    inActiveDuration?: number;
  };
}

const uploadScreenshot = async (data: UploadData) => {
  try {
    const { screenshotPath, userId, metaData, companyId } = data;

    if (!fs.existsSync(screenshotPath)) {
      console.error("❌ Screenshot file not found:", screenshotPath);
      return;
    }

    const formData = new FormData();

    const fileBuffer = fs.readFileSync(screenshotPath);
    formData.append("image", fileBuffer, `screenshot_${Date.now()}.png`);
    formData.append("userId", userId);
    formData.append("companyId", companyId);

    if (metaData?.activity) formData.append("activity", metaData.activity);
    if (metaData?.inActiveDuration !== undefined) {
      formData.append("inActiveDuration", String(metaData.inActiveDuration));
    }

    console.log("📤 Uploading screenshot...");

    // Manual headers instead of using getHeaders()
    const res = await axios.post(
      "http://localhost:3000/api/upload/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          // If you need specific boundary, you can set it manually
          // "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`
        },
      }
    );

    if (res.status === 200) {
      console.log("✅ Screenshot uploaded successfully");
    } else {
      console.error("❌ Upload failed with status:", res.status);
    }
  } catch (err: any) {
    console.error("❌ Screenshot upload failed:", err.message);
  }
};

export default uploadScreenshot;
