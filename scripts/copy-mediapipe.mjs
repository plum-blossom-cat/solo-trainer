// Copies the MediaPipe WASM runtime into public/ so pose detection is served
// from our own origin (works offline and never drifts from the npm version).
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const dest = join(root, 'public/mediapipe')
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('Copied MediaPipe WASM to public/mediapipe')
