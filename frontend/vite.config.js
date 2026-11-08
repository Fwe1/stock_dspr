import { defineConfig } from "vite";

export default defineConfig({
  base: "/inventory/",
  server: {
    proxy: {
      "^/(facilities|items)(/|$)": process.env.STOCK_API_ORIGIN || "http://localhost:8080"
    }
  }
});
