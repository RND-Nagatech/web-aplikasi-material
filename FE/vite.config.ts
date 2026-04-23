import { defineConfig } from "vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = env.VITE_BACKEND_ORIGIN || "http://localhost:3000";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("exceljs")) {
              return "excel-vendor";
            }
            if (id.includes("jspdf") || id.includes("jspdf-autotable") || id.includes("html2canvas")) {
              return "pdf-vendor";
            }
            if (id.includes("recharts")) {
              return "charts";
            }
            if (id.includes("@tanstack")) {
              return "react-query";
            }
            if (id.includes("react-router-dom")) {
              return "router";
            }
            if (id.includes("react") || id.includes("scheduler")) {
              return "react-vendor";
            }
            return "vendor";
          },
        },
      },
    },
  };
});
