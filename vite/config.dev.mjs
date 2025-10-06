import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            protocolImports: true,
        }),
    ],
    server: {
        port: 5173,
        open: true,
    },
});

