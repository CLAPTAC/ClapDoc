import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { 'doc-editor': 'src/index.ts' },
    format: ['esm', 'cjs', 'iife'],
    globalName: 'DocEditor',
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
  },
  {
    entry: { react: 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
    minify: false,
    external: ['react', 'react/jsx-runtime'],
  },
])
