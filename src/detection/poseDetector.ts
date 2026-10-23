import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Pt } from './geometry'

/** Served from public/mediapipe, copied from node_modules by scripts/copy-mediapipe.mjs. */
const wasmUrl = () => new URL('mediapipe', document.baseURI).href.replace(/\/$/, '')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let landmarkerPromise: Promise<PoseLandmarker> | null = null

/** Loads the pose model once and shares it across sessions. */
export function loadPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(wasmUrl())
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO' as const,
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      try {
        return await PoseLandmarker.createFromOptions(fileset, options('GPU'))
      } catch {
        return await PoseLandmarker.createFromOptions(fileset, options('CPU'))
      }
    })()
    landmarkerPromise.catch(() => {
      landmarkerPromise = null
    })
  }
  return landmarkerPromise
}

/**
 * Runs the landmarker on the current video frame and returns landmarks in
 * pixel space (so angles are not distorted by the frame's aspect ratio).
 */
export function detectPose(landmarker: PoseLandmarker, video: HTMLVideoElement, timeMs: number): Pt[] | null {
  const result = landmarker.detectForVideo(video, timeMs)
  const pose = result.landmarks[0]
  if (!pose) return null
  const w = video.videoWidth || 1
  const h = video.videoHeight || 1
  return pose.map((p) => ({ x: p.x * w, y: p.y * h, v: p.visibility ?? 1 }))
}
