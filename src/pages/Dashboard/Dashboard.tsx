import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import DataService from "../../services/DataServices";
import { toast } from "react-toastify";

declare global {
  interface Window {
    electronAPI: {
      captureScreen: () => Promise<
        { id: string; name: string; thumbnail: string }[]
      >;
    };
  }
}

export default function Dashboard() {
  const [imgSrc, setImgSrc] = useState("");
  const userId = JSON.parse(localStorage.getItem("userId") || "null");
  console.log("userId", userId);

  const captureScreen = async () => {
    try {
      const sources = await window.electronAPI.captureScreen();
      const screenshot = sources[0]?.thumbnail;
      // console.log(screenshot);
      setImgSrc(screenshot || "");
      uploadCapturedImage(screenshot);
    } catch (err) {
      console.error("Error capturing screen:", err);
    }
  };

  const generateRandomNumber = () => {
    return Math.floor(Math.random() * 10 + 1);
  };

  const uploadCapturedImage = async (img: any) => {
    try {
      // console.log("received images", img);
      const res = await fetch(img);
      console.log(res);
      const blob = await res.blob();
      console.log(blob);
      const file = new File([blob], `screenshot_${Date.now()}.png`, {
        type: "image/png",
      });
      console.log(file);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("userId", userId);

      const apiRes = await DataService.uploadImage(formData);

      console.log(apiRes);
    } catch (error: any) {
      console.log(error);
      toast.error(error.response.data.message || "Failed to upload image");
    }
  };

  useEffect(() => {
    var timeOut: any;
    const scheduleCapture = () => {
      const randomTime = generateRandomNumber();

      console.log(`Capture in ${randomTime} min`);

      timeOut = setTimeout(() => {
        captureScreen();
        console.log("Screen captured, Scheduling next");
        scheduleCapture();
      }, randomTime * 1000);
    };

    scheduleCapture();

    return () => clearTimeout(timeOut);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-5">
      <div className="flex justify-between p-10 bg-blue-50 gap-10">
        <Button variant="contained">
          <Link to="/">Go to login page</Link>
        </Button>

        <Button variant="contained" onClick={captureScreen}>
          Capture the screen
        </Button>
      </div>

      <div className="bg-red-50 border border-red-500 p-1 w-full h-full rounded-xl object-cover object-center">
        {imgSrc && (
          <img className="h-full w-full" src={imgSrc} alt="Screenshot" />
        )}
      </div>
    </div>
  );
}
