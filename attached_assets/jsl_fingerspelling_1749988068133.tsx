import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, Square, Play, Pause, Brain, Hand } from 'lucide-react';

const JSLFingerSpelling = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [handDetected, setHandDetected] = useState(false);
  const [error, setError] = useState('');
  const [skinPixels, setSkinPixels] = useState([]);
  
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // 日本語指文字のマッピング
  const fingerSpellingMap = ['あ', 'い', 'う', 'え', 'お'];

  // 肌色検出のためのHSV範囲
  const skinColorRanges = {
    hue: { min: 0, max: 50 },
    saturation: { min: 30, max: 170 },
    value: { min: 60, max: 255 }
  };

  // RGB to HSV変換
  const rgbToHsv = useCallback((r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / diff) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / diff + 2);
      } else {
        h = 60 * ((r - g) / diff + 4);
      }
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : (diff / max) * 255;
    const v = max * 255;

    return { h, s, v };
  }, []);

  // 肌色ピクセルの検出
  const detectSkinPixels = useCallback((imageData) => {
    const pixels = [];
    const { data, width, height } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const { h, s, v } = rgbToHsv(r, g, b);
      
      // 肌色の判定
      if (
        h >= skinColorRanges.hue.min && h <= skinColorRanges.hue.max &&
        s >= skinColorRanges.saturation.min && s <= skinColorRanges.saturation.max &&
        v >= skinColorRanges.value.min && v <= skinColorRanges.value.max
      ) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        pixels.push({ x, y });
      }
    }

    return pixels;
  }, [rgbToHsv, skinColorRanges]);

  // 手の輪郭を見つける
  const findHandContour = useCallback((skinPixels, width, height) => {
    if (skinPixels.length < 100) return null;

    // 肌色ピクセルの境界を計算
    const minX = Math.min(...skinPixels.map(p => p.x));
    const maxX = Math.max(...skinPixels.map(p => p.x));
    const minY = Math.min(...skinPixels.map(p => p.y));
    const maxY = Math.max(...skinPixels.map(p => p.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const handWidth = maxX - minX;
    const handHeight = maxY - minY;

    // 手の形状の特徴を抽出
    const topPixels = skinPixels.filter(p => p.y < centerY - handHeight * 0.2);
    const bottomPixels = skinPixels.filter(p => p.y > centerY + handHeight * 0.2);
    const leftPixels = skinPixels.filter(p => p.x < centerX - handWidth * 0.2);
    const rightPixels = skinPixels.filter(p => p.x > centerX + handWidth * 0.2);

    return {
      center: { x: centerX, y: centerY },
      bounds: { minX, maxX, minY, maxY },
      width: handWidth,
      height: handHeight,
      regions: {
        top: topPixels.length,
        bottom: bottomPixels.length,
        left: leftPixels.length,
        right: rightPixels.length
      },
      totalPixels: skinPixels.length
    };
  }, []);

  // 手の形状から指文字を推定
  const recognizeFingerSpelling = useCallback((handContour) => {
    if (!handContour) return { letter: '', confidence: 0 };

    const { regions, width, height, totalPixels } = handContour;
    
    // アスペクト比
    const aspectRatio = width / height;
    
    // 各領域のピクセル密度
    const topDensity = regions.top / totalPixels;
    const bottomDensity = regions.bottom / totalPixels;
    const leftDensity = regions.left / totalPixels;
    const rightDensity = regions.right / totalPixels;

    // 手の形状特徴に基づく分類
    let bestMatch = '';
    let maxConfidence = 0;

    // あ: グー（丸い形状）
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && totalPixels > 3000) {
      const confidence = Math.min(0.9, totalPixels / 5000);
      if (confidence > maxConfidence) {
        bestMatch = 'あ';
        maxConfidence = confidence;
      }
    }

    // い: 人差し指が立っている
    if (topDensity > 0.3 && aspectRatio < 0.8) {
      const confidence = Math.min(0.8, topDensity * 2);
      if (confidence > maxConfidence) {
        bestMatch = 'い';
        maxConfidence = confidence;
      }
    }

    // う: 2本指
    if (topDensity > 0.25 && topDensity < 0.4 && aspectRatio < 0.9) {
      const confidence = Math.min(0.7, topDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'う';
        maxConfidence = confidence;
      }
    }

    // え: 3本指
    if (topDensity > 0.4 && aspectRatio < 1.0) {
      const confidence = Math.min(0.7, topDensity * 1.5);
      if (confidence > maxConfidence) {
        bestMatch = 'え';
        maxConfidence = confidence;
      }
    }

    // お: パー（横に広い）
    if (aspectRatio > 1.2 && topDensity > 0.3) {
      const confidence = Math.min(0.8, aspectRatio / 2);
      if (confidence > maxConfidence) {
        bestMatch = 'お';
        maxConfidence = confidence;
      }
    }

    return { letter: bestMatch, confidence: maxConfidence };
  }, []);

  // 手の輪郭を描画
  const drawHandContour = useCallback((ctx, skinPixels, handContour) => {
    // 肌色ピクセルを描画
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    skinPixels.forEach(pixel => {
      ctx.fillRect(pixel.x, pixel.y, 2, 2);
    });

    if (handContour) {
      const { bounds, center } = handContour;
      
      // 手の境界を描画
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );

      // 中心点を描画
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(center.x, center.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);

  // メイン処理ループ
  const processFrame = useCallback(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // ビデオフレームをキャンバスに描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 画像データを取得
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 肌色ピクセルを検出
    const skinPixels = detectSkinPixels(imageData);
    setSkinPixels(skinPixels);

    // 手の輪郭を検出
    const handContour = findHandContour(skinPixels, canvas.width, canvas.height);
    
    if (handContour) {
      setHandDetected(true);
      
      // 指文字を認識
      const result = recognizeFingerSpelling(handContour);
      
      if (result.confidence > 0.4) {
        setPrediction(result.letter);
        setConfidence(result.confidence);
      } else {
        setPrediction('');
        setConfidence(0);
      }
      
      // 手の輪郭を描画
      drawHandContour(ctx, skinPixels, handContour);
    } else {
      setHandDetected(false);
      setPrediction('');
      setConfidence(0);
    }

    // 次のフレームを処理
    animationRef.current = requestAnimationFrame(processFrame);
  }, [isActive, detectSkinPixels, findHandContour, recognizeFingerSpelling, drawHandContour]);

  // カメラを開始
  const startCamera = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setIsActive(true);
          setIsLoading(false);
          processFrame();
        };
      }
    } catch (error) {
      console.error('カメラアクセスエラー:', error);
      setError('カメラにアクセスできません。カメラの使用を許可してください。');
      setIsLoading(false);
    }
  }, [processFrame]);

  // カメラを停止
  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setHandDetected(false);
    setPrediction('');
    setConfidence(0);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <Hand className="text-green-600" size={40} />
            コンピュータビジョン指文字認識
          </h1>
          <p className="text-lg text-gray-600">
            画像処理による日本語指文字のリアルタイム認識
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* カメラビュー */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  width={640}
                  height={480}
                  className="w-full h-80 object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-white text-lg">
                      {isLoading ? 'カメラ起動中...' : 'カメラが停止中'}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={isActive ? stopCamera : startCamera}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isActive ? <Pause size={20} /> : <Play size={20} />}
                  {isActive ? 'カメラ停止' : 'カメラ開始'}
                </button>
              </div>
            </div>

            {/* 認識結果 */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">認識結果</h3>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-8 border-2 border-green-200">
                  {prediction ? (
                    <>
                      <div className="text-6xl font-bold text-green-600 mb-2">
                        {prediction}
                      </div>
                      <div className="text-sm text-gray-500">
                        信頼度: {Math.round(confidence * 100)}%
                      </div>
                      <div className="text-xs text-green-600 mt-2">
                        コンピュータビジョン分析
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl text-gray-400">
                      手をカメラに向けてください
                    </div>
                  )}
                </div>
              </div>

              {/* 認識可能な指文字 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-3">認識可能な指文字</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.map((char, index) => (
                    <div
                      key={index}
                      className={`text-center p-3 rounded-lg border-2 ${
                        prediction === char 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl font-bold">{char}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* システム状態 */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-700">検出状態</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${handDetected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>手の検出: {handDetected ? '検出中' : '未検出'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${skinPixels.length > 0 ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span>肌色領域: {skinPixels.length}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span>カメラ: {isActive ? '動作中' : '停止中'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 技術情報 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">コンピュータビジョン実装詳細</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">画像処理技術</h4>
              <ul className="space-y-1">
                <li>• HSV色空間での肌色検出</li>
                <li>• 輪郭検出・形状解析</li>
                <li>• リアルタイム画像処理</li>
                <li>• ルールベース分類</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">特徴量</h4>
              <ul className="space-y-1">
                <li>• アスペクト比</li>
                <li>• 領域別ピクセル密度</li>
                <li>• 手の境界情報</li>
                <li>• 形状の幾何学的特徴</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">使用方法のコツ</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 明るい場所でカメラを使用してください</li>
              <li>• 手を画面中央に位置させてください</li>
              <li>• 背景は手と異なる色にしてください</li>
              <li>• 指文字をはっきりと作ってください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSLFingerSpelling;