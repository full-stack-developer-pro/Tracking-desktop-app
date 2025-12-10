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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxFbGVjdHJvbiBQcm9qZWN0c1xcXFxUcmFja2luZyBkZXNrdG9wIGFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcRWxlY3Ryb24gUHJvamVjdHNcXFxcVHJhY2tpbmcgZGVza3RvcCBhcHBcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0VsZWN0cm9uJTIwUHJvamVjdHMvVHJhY2tpbmclMjBkZXNrdG9wJTIwYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcIm5vZGU6cGF0aFwiO1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSBcInZpdGUtcGx1Z2luLWVsZWN0cm9uL3NpbXBsZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgYmFzZTogXCIuL1wiLFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICB0YWlsd2luZGNzcygpLFxyXG4gICAgZWxlY3Ryb24oe1xyXG4gICAgICBtYWluOiB7XHJcbiAgICAgICAgZW50cnk6IFwiZWxlY3Ryb24vbWFpbi50c1wiLFxyXG4gICAgICB9LFxyXG4gICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgaW5wdXQ6IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiZWxlY3Ryb24vcHJlbG9hZC50c1wiKSxcclxuICAgICAgfSxcclxuICAgICAgcmVuZGVyZXI6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInRlc3RcIiA/IHVuZGVmaW5lZCA6IHt9LFxyXG4gICAgfSksXHJcbiAgXSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVQsU0FBUyxvQkFBb0I7QUFDdFYsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sY0FBYztBQUNyQixPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFKeEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLFFBQ0osT0FBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLE9BQU8sS0FBSyxLQUFLLGtDQUFXLHFCQUFxQjtBQUFBLE1BQ25EO0FBQUEsTUFDQSxVQUFVLFFBQVEsSUFBSSxhQUFhLFNBQVMsU0FBWSxDQUFDO0FBQUEsSUFDM0QsQ0FBQztBQUFBLEVBQ0g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
