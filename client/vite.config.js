import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Example Render URL: replace below with your actual domain, e.g. "https://nav-backend.onrender.com"
const RENDER_BACKEND_URL = "https://itdevprojectbackend.onrender.com/";

export default defineConfig({
  // Ensures your app’s assets work correctly when hosted at /ITDevProject/ on GitHub Pages
  base: "/ITDevProject/", 
  plugins: [react()],

  server: {
    host: "0.0.0.0", // Allow external connections
    port: 5173,
    strictPort: true, // Prevent automatic port switching

    // Update the proxy to point to your Render backend
    proxy: {
      "/api": {
        target: RENDER_BACKEND_URL,
        changeOrigin: true,
        // Typically you won't need secure: false if your Render domain uses https
        // secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },

  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
});
