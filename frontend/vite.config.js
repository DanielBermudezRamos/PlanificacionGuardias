import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El manual de usuario vive en docs/ (fuera de frontend/) y se importa
// como texto con ?raw, por lo que el servidor de desarrollo debe poder leerlo.
const raizProyecto = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [raizProyecto],
    },
  },
})
