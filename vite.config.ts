import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  console.log("Loaded ENV keys:", Object.keys(env));

  return {
    base: "./",
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
                env.VITE_FRONTEND_URL
              ),
              "process.env.VITE_BACKEND_URL": JSON.stringify(
                env.VITE_BACKEND_URL
              ),
              "process.env.GOOGLE_CLIENT_ID": JSON.stringify(
                env.GOOGLE_CLIENT_ID
              ),
              "process.env.GOOGLE_CLIENT_SECRET": JSON.stringify(
                env.GOOGLE_CLIENT_SECRET
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
