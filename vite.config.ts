import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
// https://chaika.hatenablog.com/entry/2022/05/14/083000
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: { 
    outDir: './dist',
  },
  resolve: {
    alias: {
      '@': 'src'  
    }
  },
})
