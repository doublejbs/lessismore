import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { babel } from '@rollup/plugin-babel';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      tsDecorators: true,
    }),
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react'; // React 관련 라이브러리는 별도 청크
            if (id.includes('lodash')) return 'lodash'; // Lodash는 따로 분리
            if (id.includes('firebase')) return 'firebase';
          }
        },
      },
    },
  },
});
