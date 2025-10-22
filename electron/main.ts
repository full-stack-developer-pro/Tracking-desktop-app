import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import {
  startScreenCapture,
  stopScreenCapture,
} from "./backgroundTask/screenCapture";
import {
  startUserActivityTracking,
  stopUserActivityTracking,
} from "./backgroundTask/userActivity";
import { google } from "googleapis";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.on("closed", () => {
    win = null;
    stopScreenCapture();
    stopUserActivityTracking();
  });
}

ipcMain.on("login", (event, userId, companyId) => {
  startScreenCapture(userId, companyId);
  startUserActivityTracking(userId);
});

ipcMain.on("logout", () => {
  stopScreenCapture();
  stopUserActivityTracking();
});

ipcMain.handle("get-env-variable", (event, key) => {
  if (key === "MY_SECRET_KEY") {
    return process.env.MY_SECRET_KEY;
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  stopScreenCapture();
  stopUserActivityTracking();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Google OAuth function
ipcMain.handle("google-oauth", async () => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 500,
      height: 600,
      modal: true,
      show: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const clientId = "YOUR_GOOGLE_CLIENT_ID";
    const redirectUri = "urn:ietf:wg:oauth:2.0:oob"; // Google allows this in Electron
    const scope = encodeURIComponent("email profile openid");

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&prompt=select_account`;

    authWindow.loadURL(authUrl);

    authWindow.webContents.on("will-redirect", async (event, url) => {
      if (url.startsWith(redirectUri)) {
        const codeMatch = /code=([\w\/\-]+)/.exec(url);
        const code = codeMatch && codeMatch[1];

        if (!code) {
          reject("No code found");
          authWindow.close();
          return;
        }

        // Exchange code for token at backend
        const response = await fetch("http://localhost:5000/api/auth/googleOAuth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await response.json();

        resolve(data); // Send user + token back to React
        authWindow.close();
      }
    });

    authWindow.on("closed", () => reject("User closed window"));
  });
});