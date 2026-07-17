import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    proxy: {
      "/api": process.env.LARAVEL_API_URL ?? "http://127.0.0.1:8000",
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
