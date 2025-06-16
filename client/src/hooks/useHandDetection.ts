import { useCallback, useRef, useState } from 'react';
import type { HandContour, SkinPixel } from '@/types/recognition';

export const useHandDetection = () => {
  const [handDetected, setHandDetected] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [skinPixels, setSkinPixels] = useState<SkinPixel[]>([]);
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

  // 肌色検出のためのHSV範囲
  const skinColorRanges = {
    hue: { min: 0, max: 50 },
    saturation: { min: 30, max: 170 },
    value: { min: 60, max: 255 }
  };

  // RGB to HSV変換
  const rgbToHsv = useCallback((r: number, g: number, b: number) => {
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
  const detectSkinPixels = useCallback((imageData: ImageData): SkinPixel[] => {
    const pixels: SkinPixel[] = [];
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
  }, [rgbToHsv]);

  // 手の輪郭を見つける
  const findHandContour = useCallback((skinPixels: SkinPixel[], width: number, height: number): HandContour | null => {
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

    // より詳細な領域分割（9分割）
    const thirdWidth = handWidth / 3;
    const thirdHeight = handHeight / 3;

    // 上部をさらに細分化（指の検出のため）
    const topTop = skinPixels.filter(p => p.y < minY + thirdHeight * 0.5);
    const topMiddle = skinPixels.filter(p => p.y >= minY + thirdHeight * 0.5 && p.y < minY + thirdHeight);
    const top = skinPixels.filter(p => p.y < centerY - handHeight * 0.2);
    const bottom = skinPixels.filter(p => p.y > centerY + handHeight * 0.2);
    const left = skinPixels.filter(p => p.x < centerX - handWidth * 0.2);
    const right = skinPixels.filter(p => p.x > centerX + handWidth * 0.2);

    // 指の先端部分の検出（上部1/4の領域）
    const fingerTips = skinPixels.filter(p => p.y < minY + handHeight * 0.25);
    
    // 手のひら部分の検出（中央領域）
    const palm = skinPixels.filter(p => 
      p.x >= centerX - handWidth * 0.15 && 
      p.x <= centerX + handWidth * 0.15 &&
      p.y >= centerY - handHeight * 0.1 && 
      p.y <= centerY + handHeight * 0.2
    );

    // 親指領域の検出（左側または右側）
    const thumbLeft = skinPixels.filter(p => 
      p.x < centerX - handWidth * 0.25 && 
      p.y >= centerY - handHeight * 0.3 && 
      p.y <= centerY + handHeight * 0.1
    );
    const thumbRight = skinPixels.filter(p => 
      p.x > centerX + handWidth * 0.25 && 
      p.y >= centerY - handHeight * 0.3 && 
      p.y <= centerY + handHeight * 0.1
    );

    return {
      center: { x: centerX, y: centerY },
      bounds: { minX, maxX, minY, maxY },
      width: handWidth,
      height: handHeight,
      regions: {
        top: top.length,
        bottom: bottom.length,
        left: left.length,
        right: right.length,
        topTop: topTop.length,
        topMiddle: topMiddle.length,
        fingerTips: fingerTips.length,
        palm: palm.length,
        thumbLeft: thumbLeft.length,
        thumbRight: thumbRight.length
      },
      totalPixels: skinPixels.length
    };
  }, []);

  // 手の形状から指文字を推定
  const recognizeFingerSpelling = useCallback((handContour: HandContour): { letter: string; confidence: number } => {
    const { regions, width, height, totalPixels } = handContour;
    
    // アスペクト比
    const aspectRatio = width / height;
    
    // 各領域のピクセル密度
    const topDensity = regions.top / totalPixels;
    const bottomDensity = regions.bottom / totalPixels;
    const leftDensity = regions.left / totalPixels;
    const rightDensity = regions.right / totalPixels;

    // 拡張領域の密度
    const topTopDensity = regions.topTop / totalPixels;
    const topMiddleDensity = regions.topMiddle / totalPixels;
    const fingerTipsDensity = regions.fingerTips / totalPixels;
    const palmDensity = regions.palm / totalPixels;
    const thumbLeftDensity = regions.thumbLeft / totalPixels;
    const thumbRightDensity = regions.thumbRight / totalPixels;

    // 親指の位置判定（左右どちらにあるか）
    const thumbDensity = Math.max(thumbLeftDensity, thumbRightDensity);
    const isThumbLeft = thumbLeftDensity > thumbRightDensity;

    // 中央領域の計算
    const centerDensity = (totalPixels - regions.top - regions.bottom - regions.left - regions.right) / totalPixels;
    
    // 手の形状特徴に基づく分類
    let bestMatch = '';
    let maxConfidence = 0;

    // あ行の認識（正しい日本手話指文字）
    // あ: 手を握って親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'あ';
        maxConfidence = confidence;
      }
    }

    // い: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'い';
        maxConfidence = confidence;
      }
    }

    // う: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.2 && fingerTipsDensity < 0.35 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.8);
      if (confidence > maxConfidence) {
        bestMatch = 'う';
        maxConfidence = confidence;
      }
    }

    // え: 人差し指、中指、薬指、小指を立てる（親指は曲げる）
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.2 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.8, fingerTipsDensity * 2.0);
      if (confidence > maxConfidence) {
        bestMatch = 'え';
        maxConfidence = confidence;
      }
    }

    // お: 全ての指を立てる（パー）
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.85, (fingerTipsDensity + thumbDensity) * 1.8);
      if (confidence > maxConfidence) {
        bestMatch = 'お';
        maxConfidence = confidence;
      }
    }

    // か行の認識（正しい日本手話指文字）
    // か: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'か';
        maxConfidence = confidence;
      }
    }

    // き: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.18 && fingerTipsDensity < 0.3 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 3.2);
      if (confidence > maxConfidence) {
        bestMatch = 'き';
        maxConfidence = confidence;
      }
    }

    // く: 人差し指、中指、薬指を立てる
    if (fingerTipsDensity > 0.28 && fingerTipsDensity < 0.4 && aspectRatio < 1.1 && palmDensity > 0.06) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'く';
        maxConfidence = confidence;
      }
    }

    // け: 人差し指、中指、薬指、小指を立てる
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.1 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.77, fingerTipsDensity * 2.1);
      if (confidence > maxConfidence) {
        bestMatch = 'け';
        maxConfidence = confidence;
      }
    }

    // こ: 全ての指を立てる
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.8, (fingerTipsDensity + thumbDensity) * 1.9);
      if (confidence > maxConfidence) {
        bestMatch = 'こ';
        maxConfidence = confidence;
      }
    }

    // さ行の認識（正しい日本手話指文字）
    // さ: 握りこぶし
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && palmDensity > 0.2 && fingerTipsDensity < 0.1 && thumbDensity < 0.05) {
      const confidence = Math.min(0.8, palmDensity * 3.5);
      if (confidence > maxConfidence) {
        bestMatch = 'さ';
        maxConfidence = confidence;
      }
    }

    // し: 親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'し';
        maxConfidence = confidence;
      }
    }

    // す: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'す';
        maxConfidence = confidence;
      }
    }

    // せ: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'せ';
        maxConfidence = confidence;
      }
    }

    // そ: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.18 && fingerTipsDensity < 0.3 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 3.2);
      if (confidence > maxConfidence) {
        bestMatch = 'そ';
        maxConfidence = confidence;
      }
    }

    // た行の認識（正しい日本手話指文字）
    // た: 人差し指、中指、薬指を立てる
    if (fingerTipsDensity > 0.28 && fingerTipsDensity < 0.4 && aspectRatio < 1.1 && palmDensity > 0.06) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'た';
        maxConfidence = confidence;
      }
    }

    // ち: 人差し指、中指、薬指、小指を立てる
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.1 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.77, fingerTipsDensity * 2.1);
      if (confidence > maxConfidence) {
        bestMatch = 'ち';
        maxConfidence = confidence;
      }
    }

    // つ: 全ての指を立てる
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.8, (fingerTipsDensity + thumbDensity) * 1.9);
      if (confidence > maxConfidence) {
        bestMatch = 'つ';
        maxConfidence = confidence;
      }
    }

    // て: 握りこぶし
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && palmDensity > 0.2 && fingerTipsDensity < 0.1 && thumbDensity < 0.05) {
      const confidence = Math.min(0.8, palmDensity * 3.5);
      if (confidence > maxConfidence) {
        bestMatch = 'て';
        maxConfidence = confidence;
      }
    }

    // と: 親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'と';
        maxConfidence = confidence;
      }
    }

    // な行の認識（正しい日本手話指文字）
    // な: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'な';
        maxConfidence = confidence;
      }
    }

    // に: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'に';
        maxConfidence = confidence;
      }
    }

    // ぬ: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.18 && fingerTipsDensity < 0.3 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 3.2);
      if (confidence > maxConfidence) {
        bestMatch = 'ぬ';
        maxConfidence = confidence;
      }
    }

    // ね: 人差し指、中指、薬指を立てる
    if (fingerTipsDensity > 0.28 && fingerTipsDensity < 0.4 && aspectRatio < 1.1 && palmDensity > 0.06) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ね';
        maxConfidence = confidence;
      }
    }

    // の: 人差し指、中指、薬指、小指を立てる
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.1 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.77, fingerTipsDensity * 2.1);
      if (confidence > maxConfidence) {
        bestMatch = 'の';
        maxConfidence = confidence;
      }
    }

    // は行の認識（正しい日本手話指文字）
    // は: 全ての指を立てる
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.8, (fingerTipsDensity + thumbDensity) * 1.9);
      if (confidence > maxConfidence) {
        bestMatch = 'は';
        maxConfidence = confidence;
      }
    }

    // ひ: 握りこぶし
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && palmDensity > 0.2 && fingerTipsDensity < 0.1 && thumbDensity < 0.05) {
      const confidence = Math.min(0.8, palmDensity * 3.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ひ';
        maxConfidence = confidence;
      }
    }

    // ふ: 親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ふ';
        maxConfidence = confidence;
      }
    }

    // へ: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'へ';
        maxConfidence = confidence;
      }
    }

    // ほ: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ほ';
        maxConfidence = confidence;
      }
    }

    // ま行の認識（正しい日本手話指文字）
    // ま: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.18 && fingerTipsDensity < 0.3 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 3.2);
      if (confidence > maxConfidence) {
        bestMatch = 'ま';
        maxConfidence = confidence;
      }
    }

    // み: 人差し指、中指、薬指を立てる
    if (fingerTipsDensity > 0.28 && fingerTipsDensity < 0.4 && aspectRatio < 1.1 && palmDensity > 0.06) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'み';
        maxConfidence = confidence;
      }
    }

    // む: 人差し指、中指、薬指、小指を立てる
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.1 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.77, fingerTipsDensity * 2.1);
      if (confidence > maxConfidence) {
        bestMatch = 'む';
        maxConfidence = confidence;
      }
    }

    // め: 全ての指を立てる
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.8, (fingerTipsDensity + thumbDensity) * 1.9);
      if (confidence > maxConfidence) {
        bestMatch = 'め';
        maxConfidence = confidence;
      }
    }

    // も: 握りこぶし
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && palmDensity > 0.2 && fingerTipsDensity < 0.1 && thumbDensity < 0.05) {
      const confidence = Math.min(0.8, palmDensity * 3.5);
      if (confidence > maxConfidence) {
        bestMatch = 'も';
        maxConfidence = confidence;
      }
    }

    // や行の認識（正しい日本手話指文字）
    // や: 親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'や';
        maxConfidence = confidence;
      }
    }

    // ゆ: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'ゆ';
        maxConfidence = confidence;
      }
    }

    // よ: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'よ';
        maxConfidence = confidence;
      }
    }

    // ら行の認識（正しい日本手話指文字）
    // ら: 人差し指と中指を立てる
    if (fingerTipsDensity > 0.18 && fingerTipsDensity < 0.3 && aspectRatio < 1.0 && palmDensity > 0.08) {
      const confidence = Math.min(0.75, fingerTipsDensity * 3.2);
      if (confidence > maxConfidence) {
        bestMatch = 'ら';
        maxConfidence = confidence;
      }
    }

    // り: 人差し指、中指、薬指を立てる
    if (fingerTipsDensity > 0.28 && fingerTipsDensity < 0.4 && aspectRatio < 1.1 && palmDensity > 0.06) {
      const confidence = Math.min(0.75, fingerTipsDensity * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'り';
        maxConfidence = confidence;
      }
    }

    // る: 人差し指、中指、薬指、小指を立てる
    if (fingerTipsDensity > 0.35 && aspectRatio < 1.1 && palmDensity > 0.05 && thumbDensity < 0.08) {
      const confidence = Math.min(0.77, fingerTipsDensity * 2.1);
      if (confidence > maxConfidence) {
        bestMatch = 'る';
        maxConfidence = confidence;
      }
    }

    // れ: 全ての指を立てる
    if (aspectRatio > 1.0 && fingerTipsDensity > 0.25 && thumbDensity > 0.08 && palmDensity > 0.05) {
      const confidence = Math.min(0.8, (fingerTipsDensity + thumbDensity) * 1.9);
      if (confidence > maxConfidence) {
        bestMatch = 'れ';
        maxConfidence = confidence;
      }
    }

    // ろ: 握りこぶし
    if (aspectRatio > 0.7 && aspectRatio < 1.3 && palmDensity > 0.2 && fingerTipsDensity < 0.1 && thumbDensity < 0.05) {
      const confidence = Math.min(0.8, palmDensity * 3.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ろ';
        maxConfidence = confidence;
      }
    }

    // わ行・ん の認識（正しい日本手話指文字）
    // わ: 親指を立てる
    if (aspectRatio > 0.8 && aspectRatio < 1.4 && thumbDensity > 0.1 && palmDensity > 0.15 && fingerTipsDensity < 0.15) {
      const confidence = Math.min(0.85, (thumbDensity + palmDensity) * 2.5);
      if (confidence > maxConfidence) {
        bestMatch = 'わ';
        maxConfidence = confidence;
      }
    }

    // を: 小指を立てる
    if (fingerTipsDensity > 0.1 && fingerTipsDensity < 0.2 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.0);
      if (confidence > maxConfidence) {
        bestMatch = 'を';
        maxConfidence = confidence;
      }
    }

    // ん: 人差し指を立てる
    if (fingerTipsDensity > 0.08 && fingerTipsDensity < 0.18 && aspectRatio < 1.0 && palmDensity > 0.1) {
      const confidence = Math.min(0.8, fingerTipsDensity * 4.5);
      if (confidence > maxConfidence) {
        bestMatch = 'ん';
        maxConfidence = confidence;
      }
    }

    return { letter: bestMatch, confidence: maxConfidence };
  }, []);

  // 手の輪郭を描画
  const drawHandContour = useCallback((ctx: CanvasRenderingContext2D, skinPixels: SkinPixel[], handContour: HandContour | null) => {
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
  const processFrame = useCallback((
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    isActive: boolean
  ) => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // ビデオフレームをキャンバスに描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 画像データを取得
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 肌色ピクセルを検出
    const detectedSkinPixels = detectSkinPixels(imageData);
    setSkinPixels(detectedSkinPixels);

    // 手の輪郭を検出
    const handContour = findHandContour(detectedSkinPixels, canvas.width, canvas.height);
    
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
      drawHandContour(ctx, detectedSkinPixels, handContour);
    } else {
      setHandDetected(false);
      setPrediction('');
      setConfidence(0);
    }

    // 次のフレームを処理
    animationRef.current = requestAnimationFrame(() => 
      processFrame(videoRef, canvasRef, isActive)
    );
  }, [detectSkinPixels, findHandContour, recognizeFingerSpelling, drawHandContour]);

  const startProcessing = useCallback((
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>,
    isActive: boolean
  ) => {
    processFrame(videoRef, canvasRef, isActive);
  }, [processFrame]);

  const stopProcessing = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setHandDetected(false);
    setPrediction('');
    setConfidence(0);
    setSkinPixels([]);
  }, []);

  return {
    handDetected,
    prediction,
    confidence,
    skinPixels,
    fingerSpellingMap,
    startProcessing,
    stopProcessing
  };
};
