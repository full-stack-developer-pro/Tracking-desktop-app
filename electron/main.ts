console.log("🚀 MAIN PROCESS STARTING - File loaded successfully");
import { app, BrowserWindow, ipcMain, desktopCapturer } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import {
  startScreenCapture,
  stopScreenCapture,
} from "./backgroundTask/screenCapture";

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
// let loggedInUserId: string | null = null;

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
    console.log("🚀 Window loaded successfully");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.on("closed", () => {
    console.log("🪟 Window closed");
    win = null;
    stopScreenCapture();
  });
}
console.log("🔧 Preload path:", path.join(__dirname, "preload.mjs"));

// Add debug logging for all IPC events
ipcMain.on("login-success", (event, userId) => {
  console.log("🔑 [MAIN PROCESS] Received login-success event");
  console.log("🔑 Event details:", event);

  try {
    console.log("🎬 Starting screen capture...");
    startScreenCapture(userId);
    console.log("✅ Screen capture initialization completed");
  } catch (err: any) {
    console.error("❌ Error starting screen capture:", err);
    console.error("❌ Stack trace:", err.stack);
  }
});

ipcMain.on("logout", (event) => {
  console.log("🚪 [MAIN PROCESS] Received logout event");
  stopScreenCapture();
});

ipcMain.handle("get-env-variable", (event, key) => {
  console.log(`🔧 [MAIN PROCESS] Renderer requested env key: ${key}`);
  if (key === "MY_SECRET_KEY") {
    return process.env.MY_SECRET_KEY;
  }
  return null;
});

// Debug: Log all IPC events
ipcMain.on("*", (event, ...args) => {
  console.log("🔍 [DEBUG] IPC event received:", event, args);
});

app.whenReady().then(() => {
  console.log("🚀 [MAIN PROCESS] App ready, creating window...");
  createWindow();

  // Test if IPC handlers are registered
  console.log("📋 Registered IPC handlers:", ipcMain.eventNames());
});

app.on("activate", () => {
  console.log("🔄 [MAIN PROCESS] App activated");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  console.log("🔚 [MAIN PROCESS] All windows closed");
  stopScreenCapture();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Add process error handlers
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
});

// Add this as a test
console.log("🔧 Setting up test IPC handler...");
ipcMain.on("test-message", () => {
  console.log("✅ TEST: IPC is working!");
});
