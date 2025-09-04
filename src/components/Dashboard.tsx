import { useState } from "react";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { desktopCapturer } from "electron";

const Dashboard = () => {
//   const [imgSrc, setImgSrc] = useState<string>("");

//   const captureScreen = async () => {
//     try {
//       // Get all screen sources (monitors)
//       const sources = await desktopCapturer.getSources({
//         types: ["screen"],
//         thumbnailSize: { width: 1920, height: 1080 }, // Adjust to your screen
//       });

//       // Pick primary screen
//       const screenSource = sources[0];

//       // Convert thumbnail to Base64
//       const screenshot = screenSource.thumbnail.toDataURL();

//       // Set image to state
//       setImgSrc(screenshot);

//       console.log("Screenshot captured!");
//     } catch (err) {
//       console.error("Error capturing screen:", err);
//     }
//   };

  return (
    <div>
      <div className="flex justify-between p-10 bg-blue-50">
        <Button variant="contained">
          <Link to={"/"}>got to login page</Link>
        </Button>

        {/* <Button onClick={captureScreen}>Capture the screen</Button> */}
      </div>

      {/* {imgSrc && (
        <img
          src={imgSrc}
          alt="Screenshot"
          style={{ width: "100%", border: "1px solid #ccc" }}
        />
      )} */}
    </div>
  );
};

export default Dashboard;
