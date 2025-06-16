import { useCallback, useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { SkinPixel } from '@/types/recognition';

export interface HandLandmarks {
  landmarks: Array<{ x: number; y: number; z: number }>;
  worldLandmarks: Array<{ x: number; y: number; z: number }>;
  handedness: string;
}

export interface MLPrediction {
  character: string;
  confidence: number;
  method: 'ml' | 'rule-based' | 'hybrid';
}

export const useMLHandDetection = () => {
  const [isMLReady, setIsMLReady] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null);
  const [mlModel, setMlModel] = useState<tf.LayersModel | null>(null);
  const [detectionMode, setDetectionMode] = useState<'rule-based' | 'ml' | 'hybrid'>('hybrid');
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);

  // 日本語指文字のマッピング
  const fingerSpellingMap = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん'
  ];

  // MediaPipe Hand Landmarkerの初期化
  const initializeMediaPipe = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      handLandmarkerRef.current = handLandmarker;
      setIsMLReady(true);
    } catch (error) {
      console.error('MediaPipe初期化エラー:', error);
      // フォールバック: ルールベースのみ
      setDetectionMode('rule-based');
    }
  }, []);

  // 簡単なCNNモデルの作成
  const createMLModel = useCallback(async () => {
    try {
      const model = tf.sequential({
        layers: [
          // 入力: 21個のランドマーク × 3次元座標 = 63次元
          tf.layers.dense({ 
            units: 128, 
            activation: 'relu', 
            inputShape: [63] 
          }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ 
            units: 64, 
            activation: 'relu' 
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ 
            units: 32, 
            activation: 'relu' 
          }),
          // 出力: 46クラス（あ〜ん）
          tf.layers.dense({ 
            units: 46, 
            activation: 'softmax' 
          })
        ]
      });

      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      setMlModel(model);
      console.log('MLモデル作成完了');
    } catch (error) {
      console.error('MLモデル作成エラー:', error);
    }
  }, []);

  // ランドマークから特徴ベクトルを抽出
  const extractFeatures = useCallback((landmarks: Array<{ x: number; y: number; z: number }>) => {
    // 手首を基準に正規化
    const wrist = landmarks[0];
    const normalizedLandmarks = landmarks.map(landmark => ({
      x: landmark.x - wrist.x,
      y: landmark.y - wrist.y,
      z: landmark.z - wrist.z
    }));

    // 特徴ベクトルに変換
    const features = normalizedLandmarks.flatMap(landmark => [
      landmark.x, landmark.y, landmark.z
    ]);

    return tf.tensor2d([features]);
  }, []);

  // MLによる予測
  const predictWithML = useCallback(async (landmarks: Array<{ x: number; y: number; z: number }>) => {
    if (!mlModel) return null;

    try {
      const features = extractFeatures(landmarks);
      const prediction = mlModel.predict(features) as tf.Tensor;
      const probabilities = await prediction.data();
      
      // 最も確率の高いクラスを取得
      const probabilitiesArray = Array.from(probabilities);
      const maxIndex = probabilitiesArray.indexOf(Math.max(...probabilitiesArray));
      const confidence = probabilities[maxIndex];
      
      features.dispose();
      prediction.dispose();

      if (confidence > 0.3) { // 最小信頼度閾値
        return {
          character: fingerSpellingMap[maxIndex],
          confidence: confidence,
          method: 'ml' as const
        };
      }
      
      return null;
    } catch (error) {
      console.error('ML予測エラー:', error);
      return null;
    }
  }, [mlModel, extractFeatures, fingerSpellingMap]);

  // ルールベースによる予測（簡略版）
  const predictWithRules = useCallback((landmarks: Array<{ x: number; y: number; z: number }>) => {
    // 簡単なルールベースの実装
    // 指先の位置関係から基本的な判定
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // 指が立っているかの判定（Y座標でwristより上にあるか）
    const thumbUp = thumbTip.y < wrist.y - 0.1;
    const indexUp = indexTip.y < wrist.y - 0.1;
    const middleUp = middleTip.y < wrist.y - 0.1;
    const ringUp = ringTip.y < wrist.y - 0.1;
    const pinkyUp = pinkyTip.y < wrist.y - 0.1;

    const fingersUp = [thumbUp, indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    // 簡単なパターンマッチング
    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
      return { character: 'あ', confidence: 0.7, method: 'rule-based' as const };
    } else if (!thumbUp && !indexUp && !middleUp && !ringUp && pinkyUp) {
      return { character: 'い', confidence: 0.7, method: 'rule-based' as const };
    } else if (!thumbUp && indexUp && middleUp && !ringUp && !pinkyUp) {
      return { character: 'う', confidence: 0.7, method: 'rule-based' as const };
    } else if (!thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
      return { character: 'え', confidence: 0.7, method: 'rule-based' as const };
    } else if (thumbUp && indexUp && middleUp && ringUp && pinkyUp) {
      return { character: 'お', confidence: 0.7, method: 'rule-based' as const };
    }

    return null;
  }, []);

  // ハイブリッド予測
  const predictHybrid = useCallback(async (landmarks: Array<{ x: number; y: number; z: number }>) => {
    const mlResult = await predictWithML(landmarks);
    const ruleResult = predictWithRules(landmarks);

    // MLの信頼度が高い場合はMLを優先
    if (mlResult && mlResult.confidence > 0.7) {
      return mlResult;
    }

    // MLの信頼度が低い場合はルールベースを使用
    if (ruleResult && ruleResult.confidence > 0.5) {
      return { ...ruleResult, method: 'hybrid' as const };
    }

    // どちらも信頼度が低い場合はMLの結果を返す（あれば）
    return mlResult;
  }, [predictWithML, predictWithRules]);

  // フレーム処理
  const processFrame = useCallback(async (
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>
  ) => {
    if (!handLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return;

    try {
      // MediaPipeで手の検出
      const results: HandLandmarkerResult = handLandmarkerRef.current.detectForVideo(
        video, 
        performance.now()
      );

      // Canvas クリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        setHandDetected(true);
        
        const handLandmarks = results.landmarks[0];
        setLandmarks({
          landmarks: handLandmarks,
          worldLandmarks: results.worldLandmarks?.[0] || [],
          handedness: results.handednesses?.[0]?.[0]?.categoryName || 'Unknown'
        });

        // ランドマークを描画
        drawLandmarks(ctx, handLandmarks, canvas.width, canvas.height);

        // 予測実行
        let prediction: MLPrediction | null = null;
        
        switch (detectionMode) {
          case 'ml':
            prediction = await predictWithML(handLandmarks);
            break;
          case 'rule-based':
            prediction = predictWithRules(handLandmarks);
            break;
          case 'hybrid':
            prediction = await predictHybrid(handLandmarks);
            break;
        }

        setPrediction(prediction);
      } else {
        setHandDetected(false);
        setLandmarks(null);
        setPrediction(null);
      }
    } catch (error) {
      console.error('フレーム処理エラー:', error);
    }
  }, [detectionMode, predictWithML, predictWithRules, predictHybrid]);

  // ランドマーク描画
  const drawLandmarks = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{ x: number; y: number; z: number }>,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // ランドマークの点を描画
    ctx.fillStyle = '#FF0000';
    landmarks.forEach(landmark => {
      const x = landmark.x * canvasWidth;
      const y = landmark.y * canvasHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 接続線を描画
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    
    // 手の骨格構造に基づく接続
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // 親指
      [0, 5], [5, 6], [6, 7], [7, 8], // 人差し指
      [5, 9], [9, 10], [10, 11], [11, 12], // 中指
      [9, 13], [13, 14], [14, 15], [15, 16], // 薬指
      [13, 17], [17, 18], [18, 19], [19, 20] // 小指
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvasWidth, startPoint.y * canvasHeight);
      ctx.lineTo(endPoint.x * canvasWidth, endPoint.y * canvasHeight);
      ctx.stroke();
    });
  }, []);

  // 処理開始
  const startProcessing = useCallback((
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>
  ) => {
    const process = () => {
      processFrame(videoRef, canvasRef);
      animationRef.current = requestAnimationFrame(process);
    };
    process();
  }, [processFrame]);

  // 処理停止
  const stopProcessing = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setHandDetected(false);
    setLandmarks(null);
    setPrediction(null);
  }, []);

  // 初期化
  useEffect(() => {
    initializeMediaPipe();
    createMLModel();
  }, [initializeMediaPipe, createMLModel]);

  return {
    isMLReady,
    handDetected,
    prediction,
    landmarks,
    detectionMode,
    setDetectionMode,
    fingerSpellingMap,
    startProcessing,
    stopProcessing
  };
};