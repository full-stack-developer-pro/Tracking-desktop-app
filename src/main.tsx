import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Main.tsx: Starting execution");
// ALERT FOR DEBUGGING PRODUCTION - REMOVE LATER
window.alert("Main.tsx: Starting execution. If you see this, JS is running!");
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
console.log("Main.tsx: React root rendered");

if (window.ipcRenderer) {
  console.log("Main.tsx: ipcRenderer found");
  window.ipcRenderer.on("main-process-message", (_event, message) => {
    console.log("Main process message:", message);
  });
} else {
  console.error("Main.tsx: ipcRenderer NOT found on window");
}
