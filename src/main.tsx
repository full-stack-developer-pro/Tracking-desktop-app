import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />
);

window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});

const { BrowserWindow, ipcMain } = require("electron");
const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/oauth/callback"
);

ipcMain.handle("google-oauth", async () => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["profile", "email"],
  });

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 500,
      height: 600,
      webPreferences: { nodeIntegration: false },
    });

    win.loadURL(authUrl);

    win.webContents.on("will-redirect", async (event, url) => {
      if (url.startsWith("http://localhost:3000/oauth/callback")) {
        const urlParams = new URL(url).searchParams;
        const code = urlParams.get("code");

        try {
          const { tokens } = await oauth2Client.getToken(code);
          resolve(tokens.id_token); 
          win.close();
        } catch (err) {
          reject(err);
          win.close();
        }
      }
    });
  });
});
