// Gera dist-mobile/ para o Capacitor (Android).
//
// O build web (`npm run build`) produz dist/ com duas páginas:
//   dist/index.html      -> landing pública
//   dist/app/index.html  -> o app React
// O Capacitor sempre carrega "index.html" na raiz do webDir (não dá pra
// configurar outro caminho). Então esse script roda depois do `vite build`
// e monta uma cópia de dist/ em dist-mobile/ onde o APP (não a landing)
// vira o index.html da raiz — landing.html não faz sentido dentro do app nativo.
//
// Uso: npm run build:mobile   (chama "vite build" e depois este script)

import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs"
import { join } from "node:path"

const DIST = "dist"
const OUT = "dist-mobile"

if (!existsSync(DIST)) {
  console.error(`[build-mobile-dist] "${DIST}/" não existe. Rode "npm run build" antes.`)
  process.exit(1)
}

const appIndex = join(DIST, "app", "index.html")
if (!existsSync(appIndex)) {
  console.error(`[build-mobile-dist] "${appIndex}" não existe. O build web não gerou a página do app?`)
  process.exit(1)
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// Copia tudo (landing, app/, assets/ compartilhados, arquivos públicos)...
cpSync(DIST, OUT, { recursive: true })

// ...e promove o app pra ser o index.html da raiz do pacote mobile.
rmSync(join(OUT, "index.html"))
cpSync(appIndex, join(OUT, "index.html"))
rmSync(join(OUT, "app"), { recursive: true, force: true })

console.log(`[build-mobile-dist] OK: ${OUT}/index.html agora é o app (não a landing).`)
