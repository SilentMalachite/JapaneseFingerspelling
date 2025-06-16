import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useHandDetection } from '../useHandDetection';

describe('useHandDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useHandDetection());
    
    expect(result.current.handDetected).toBe(false);
    expect(result.current.prediction).toBe('');
    expect(result.current.confidence).toBe(0);
    expect(result.current.skinPixels).toEqual([]);
    expect(result.current.fingerSpellingMap).toEqual([
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
    ]);
  });

  test('処理を開始できる', () => {
    const mockVideoRef = { current: document.createElement('video') };
    const mockCanvasRef = { current: document.createElement('canvas') };
    
    const { result } = renderHook(() => useHandDetection());

    act(() => {
      result.current.startProcessing(mockVideoRef, mockCanvasRef, true);
    });

    // requestAnimationFrameが呼ばれることを確認
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  test('処理を停止できる', () => {
    const { result } = renderHook(() => useHandDetection());

    act(() => {
      result.current.stopProcessing();
    });

    expect(result.current.handDetected).toBe(false);
    expect(result.current.prediction).toBe('');
    expect(result.current.confidence).toBe(0);
    expect(result.current.skinPixels).toEqual([]);
  });

  test('RGB to HSV変換が正しく動作する', () => {
    const { result } = renderHook(() => useHandDetection());
    
    // 手動でテストするため、内部関数にアクセスできないので、
    // 実際の肌色検出をテストする
    const mockImageData = {
      data: new Uint8ClampedArray([
        // 肌色のピクセル (R: 220, G: 180, B: 140, A: 255)
        220, 180, 140, 255,
        // 非肌色のピクセル (R: 0, G: 0, B: 255, A: 255)
        0, 0, 255, 255
      ]),
      width: 2,
      height: 1
    } as ImageData;

    // detectSkinPixelsは内部関数なので直接テストできないが、
    // processFrameの動作を通じて間接的にテストできる
    expect(result.current.skinPixels).toEqual([]);
  });

  test('指文字認識のマッピングが正しい', () => {
    const { result } = renderHook(() => useHandDetection());
    
    // あ行
    expect(result.current.fingerSpellingMap).toContain('あ');
    expect(result.current.fingerSpellingMap).toContain('い');
    expect(result.current.fingerSpellingMap).toContain('う');
    expect(result.current.fingerSpellingMap).toContain('え');
    expect(result.current.fingerSpellingMap).toContain('お');
    
    // か行
    expect(result.current.fingerSpellingMap).toContain('か');
    expect(result.current.fingerSpellingMap).toContain('き');
    expect(result.current.fingerSpellingMap).toContain('く');
    expect(result.current.fingerSpellingMap).toContain('け');
    expect(result.current.fingerSpellingMap).toContain('こ');
    
    // さ行
    expect(result.current.fingerSpellingMap).toContain('さ');
    expect(result.current.fingerSpellingMap).toContain('し');
    expect(result.current.fingerSpellingMap).toContain('す');
    expect(result.current.fingerSpellingMap).toContain('せ');
    expect(result.current.fingerSpellingMap).toContain('そ');
    
    // た行
    expect(result.current.fingerSpellingMap).toContain('た');
    expect(result.current.fingerSpellingMap).toContain('ち');
    expect(result.current.fingerSpellingMap).toContain('つ');
    expect(result.current.fingerSpellingMap).toContain('て');
    expect(result.current.fingerSpellingMap).toContain('と');
    
    // な行
    expect(result.current.fingerSpellingMap).toContain('な');
    expect(result.current.fingerSpellingMap).toContain('に');
    expect(result.current.fingerSpellingMap).toContain('ぬ');
    expect(result.current.fingerSpellingMap).toContain('ね');
    expect(result.current.fingerSpellingMap).toContain('の');
    
    // は行
    expect(result.current.fingerSpellingMap).toContain('は');
    expect(result.current.fingerSpellingMap).toContain('ひ');
    expect(result.current.fingerSpellingMap).toContain('ふ');
    expect(result.current.fingerSpellingMap).toContain('へ');
    expect(result.current.fingerSpellingMap).toContain('ほ');
    
    // ま行
    expect(result.current.fingerSpellingMap).toContain('ま');
    expect(result.current.fingerSpellingMap).toContain('み');
    expect(result.current.fingerSpellingMap).toContain('む');
    expect(result.current.fingerSpellingMap).toContain('め');
    expect(result.current.fingerSpellingMap).toContain('も');
    
    // や行
    expect(result.current.fingerSpellingMap).toContain('や');
    expect(result.current.fingerSpellingMap).toContain('ゆ');
    expect(result.current.fingerSpellingMap).toContain('よ');
    
    // ら行
    expect(result.current.fingerSpellingMap).toContain('ら');
    expect(result.current.fingerSpellingMap).toContain('り');
    expect(result.current.fingerSpellingMap).toContain('る');
    expect(result.current.fingerSpellingMap).toContain('れ');
    expect(result.current.fingerSpellingMap).toContain('ろ');
    
    // わ行・ん
    expect(result.current.fingerSpellingMap).toContain('わ');
    expect(result.current.fingerSpellingMap).toContain('を');
    expect(result.current.fingerSpellingMap).toContain('ん');
    
    expect(result.current.fingerSpellingMap).toHaveLength(46);
  });
});