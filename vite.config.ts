import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    define: {
      "import.meta.env.VITE_FRONTEND_URL": JSON.stringify(
        process.env.VITE_FRONTEND_URL || env.VITE_FRONTEND_URL
      ),
      "import.meta.env.VITE_BACKEND_URL": JSON.stringify(
        process.env.VITE_BACKEND_URL || env.VITE_BACKEND_URL
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            build: {
              rollupOptions: {
                external: ["googleapis", "google-auth-library"],
              },
            },
            define: {
              "process.env.VITE_FRONTEND_URL": JSON.stringify(
                process.env.VITE_FRONTEND_URL || env.VITE_FRONTEND_URL
              ),
              "process.env.VITE_BACKEND_URL": JSON.stringify(
                process.env.VITE_BACKEND_URL || env.VITE_BACKEND_URL
              ),
              "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
                process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID
              ),
              "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(
                process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET
              ),
            },
          },
        },
        preload: {
          input: path.join(__dirname, "electron/preload.ts"),
        },
        renderer: process.env.NODE_ENV === "test" ? undefined : {},
      }),
    ],
  };
});
