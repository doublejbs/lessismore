import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { babel } from '@rollup/plugin-babel';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
});
