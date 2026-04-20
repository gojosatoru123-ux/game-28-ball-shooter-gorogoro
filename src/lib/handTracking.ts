import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private lastVideoTime = -1;

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
  }

  setVideo(video: HTMLVideoElement) {
    this.video = video;
  }

  detect() {
    if (!this.handLandmarker || !this.video || this.video.readyState < 2) {
      return null;
    }

    const startTimeMs = performance.now();
    if (this.lastVideoTime === this.video.currentTime) {
      return null;
    }
    this.lastVideoTime = this.video.currentTime;

    const results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
    return results;
  }

  // Simple gesture detection: check if index finger and thumb are close (pinch)
  // or if index finger is extended and others are curled (gun-ish)
  // Let's use index finger tip position and a simple "pinch" for shooting
  // Landmarks: 4 (thumb tip), 8 (index tip)
  static checkPinch(landmarks: any) {
    if (!landmarks || landmarks.length < 21) return false;
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    return distance < 0.05; // Tight threshold for pinch
  }
}
