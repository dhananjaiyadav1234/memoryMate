import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

let modelsLoaded = false;

/**
 * Load the three face-api.js models required for face recognition:
 * - SSD MobileNet v1 (face detection)
 * - 68-point face landmarks
 * - Face recognition (128-d descriptor)
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

/**
 * Detect all faces in the given input, returning full descriptions
 * (bounding box + landmarks + 128-d descriptor).
 */
export async function detectFaces(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>[]> {
  return faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
}

/**
 * Build a FaceMatcher from an array of labeled descriptors.
 * @param threshold – Euclidean distance threshold. Lower = stricter.
 */
export function buildMatcher(
  labeledDescriptors: faceapi.LabeledFaceDescriptors[],
  threshold = 0.5
): faceapi.FaceMatcher {
  if (labeledDescriptors.length === 0) {
    // Return a dummy matcher that always returns "unknown"
    return new faceapi.FaceMatcher(
      new faceapi.LabeledFaceDescriptors("unknown", [new Float32Array(128)]),
      threshold
    );
  }
  return new faceapi.FaceMatcher(labeledDescriptors, threshold);
}

export { faceapi };
