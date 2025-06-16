export interface RecognitionResult {
  character: string;
  confidence: number;
  timestamp: string;
}

export interface HandContour {
  center: { x: number; y: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  width: number;
  height: number;
  regions: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    topTop: number;
    topMiddle: number;
    fingerTips: number;
    palm: number;
    thumbLeft: number;
    thumbRight: number;
  };
  totalPixels: number;
}

export interface SkinPixel {
  x: number;
  y: number;
}

export interface RecognitionStats {
  processingSpeed: number;
  handDetectionAccuracy: number;
  totalRecognitions: number;
  sessionTime: string;
}
