// vite.config.ts
import { defineConfig } from "file:///D:/Electron%20Projects/Tracking%20desktop%20app/node_modules/vite/dist/node/index.js";
import path from "node:path";
import electron from "file:///D:/Electron%20Projects/Tracking%20desktop%20app/node_modules/vite-plugin-electron/dist/simple.mjs";
import react from "file:///D:/Electron%20Projects/Tracking%20desktop%20app/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///D:/Electron%20Projects/Tracking%20desktop%20app/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "D:\\Electron Projects\\Tracking desktop app";
var vite_config_default = defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main.ts"
      },
      preload: {
        input: path.join(__vite_injected_original_dirname, "electron/preload.ts")
      },
      renderer: process.env.NODE_ENV === "test" ? void 0 : {}
    })
  ]
});
export {
  vite_config_default as default
};
