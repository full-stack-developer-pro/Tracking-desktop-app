import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

if (window.ipcRenderer) {
  window.ipcRenderer.on("main-process-message", (_event, message) => {
    console.log("Main process message:", message);
  });
} else {
  console.error("Main.tsx: ipcRenderer NOT found on window");
}
