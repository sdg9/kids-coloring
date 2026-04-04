import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080,
        host: true
    },
    plugins: [qrcode()]
});
