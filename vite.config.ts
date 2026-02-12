import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import IconsResolver from 'unplugin-icons/resolver'
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [
        ElementPlusResolver(),
        IconsResolver({
          prefix: 'Icon',
        }),
      ],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      dts: 'src/components.d.ts',
      resolvers: [
        IconsResolver({
          enabledCollections: ['ep'],
        }),
        ElementPlusResolver(),
      ],
    }),
    Icons({
      autoInstall: true,
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/js/entry-[hash].js',
        chunkFileNames: 'assets/js/chunk-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ? assetInfo.name.toLowerCase() : '';
          if (/\.(css)$/.test(name)) return 'assets/css/chunk-[hash][extname]';
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(name)) return 'assets/img/[name]-[hash][extname]';
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(name)) return 'assets/media/[name]-[hash][extname]';
          if (/\.(woff2?|ttf|otf|eot)$/.test(name)) return 'assets/fonts/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/element-plus/')) return 'element-plus';
            if (id.includes('@element-plus/icons-vue')) return 'element-plus';
            if (id.includes('/vue-router/')) return 'vue-vendor';
            if (id.includes('/pinia/')) return 'vue-vendor';
            if (id.includes('/vue/')) return 'vue-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "^/api/": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
