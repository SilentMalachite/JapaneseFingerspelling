import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  const mockVideoRef = {
    current: {
      srcObject: null,
      onloadedmetadata: null,
    } as HTMLVideoElement
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useCamera());
    
    expect(result.current.isActive).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  test('カメラが正常に起動する', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    } as unknown as MediaStream;

    const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera(mockVideoRef);
      
      // onloadedmetadataイベントをシミュレート
      if (mockVideoRef.current && mockVideoRef.current.onloadedmetadata) {
        mockVideoRef.current.onloadedmetadata(new Event('loadedmetadata'));
      }
    });

    expect(getUserMediaMock).toHaveBeenCalledWith({
      video: { 
        width: 640, 
        height: 480,
        facingMode: 'user'
      }
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isActive).toBe(true);
  });

  test('カメラアクセスエラーが適切に処理される', async () => {
    const getUserMediaMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      writable: true,
    });

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera(mockVideoRef);
    });

    expect(result.current.error).toBe('カメラにアクセスできません。カメラの使用を許可してください。');
    expect(result.current.isLoading).toBe(false);
  });

  test('カメラが正常に停止する', () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn(() => [mockTrack])
    } as unknown as MediaStream;

    const { result } = renderHook(() => useCamera());

    // カメラを起動した状態をシミュレート
    act(() => {
      result.current.stopCamera(mockVideoRef);
    });

    expect(result.current.isActive).toBe(false);
  });
});