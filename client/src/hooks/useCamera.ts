import { useRef, useCallback, useState } from 'react';

export const useCamera = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (videoRef: React.RefObject<HTMLVideoElement>) => {
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
        };
      }
    } catch (error) {
      console.error('カメラアクセスエラー:', error);
      setError('カメラにアクセスできません。カメラの使用を許可してください。');
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback((videoRef: React.RefObject<HTMLVideoElement>) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
  }, []);

  return {
    isActive,
    isLoading,
    error,
    startCamera,
    stopCamera
  };
};
