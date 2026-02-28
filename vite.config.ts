import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __CHAT_MONITOR_DEBUG__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
