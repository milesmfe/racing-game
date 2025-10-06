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
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        assetsInlineLimit: 0,
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`,
            },
        },
    },
});

