import React, { useRef, useEffect, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useHandDetection } from '@/hooks/useHandDetection';
import { useMLHandDetection } from '@/hooks/useMLHandDetection';
import type { RecognitionResult } from '@/types/recognition';

const JSLRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionResult[]>([]);
  const [sessionStartTime] = useState<Date>(new Date());
  const [totalRecognitions, setTotalRecognitions] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [audioFeedback, setAudioFeedback] = useState(false);
  const [sensitivity, setSensitivity] = useState(75);
  const [useMLMode, setUseMLMode] = useState(true);

  const { isActive, isLoading, error, startCamera, stopCamera } = useCamera();
  
  // 従来のルールベース手法
  const ruleBasedDetection = useHandDetection();
  
  // 新しいML手法
  const mlDetection = useMLHandDetection();

  // 検出結果の統合
  const handDetected = useMLMode && mlDetection.isMLReady ? mlDetection.handDetected : ruleBasedDetection.handDetected;
  const fingerSpellingMap = useMLMode && mlDetection.isMLReady ? mlDetection.fingerSpellingMap : ruleBasedDetection.fingerSpellingMap;
  
  // 予測結果の統合（形式を揃える）
  const prediction = useMLMode && mlDetection.isMLReady 
    ? mlDetection.prediction?.character || ''
    : ruleBasedDetection.prediction;
    
  const confidence = useMLMode && mlDetection.isMLReady 
    ? (mlDetection.prediction?.confidence || 0) * 100
    : ruleBasedDetection.confidence * 100;

  const detectionMethod = useMLMode && mlDetection.isMLReady 
    ? mlDetection.prediction?.method || 'ml'
    : 'rule-based';

  // 処理関数の統合
  const startProcessing = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>, isActive: boolean) => {
    if (useMLMode && mlDetection.isMLReady) {
      mlDetection.startProcessing(videoRef, canvasRef);
    } else {
      ruleBasedDetection.startProcessing(videoRef, canvasRef, isActive);
    }
  };

  const stopProcessing = () => {
    mlDetection.stopProcessing();
    ruleBasedDetection.stopProcessing();
  };

  // セッション時間の計算
  const getSessionTime = () => {
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [sessionTime, setSessionTime] = useState('00:00');

  // セッション時間の更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(getSessionTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // 認識処理の開始/停止
  useEffect(() => {
    if (isActive) {
      startProcessing(videoRef, canvasRef, isActive);
    } else {
      stopProcessing();
    }
  }, [isActive, startProcessing, stopProcessing]);

  // 認識結果を履歴に追加
  useEffect(() => {
    if (prediction && confidence > 0.6 && autoSave) {
      const newResult: RecognitionResult = {
        character: prediction,
        confidence: Math.round(confidence * 100),
        timestamp: new Date().toLocaleTimeString('ja-JP')
      };

      setRecognitionHistory(prev => {
        // 重複を避けるため、直前の結果と同じ場合は追加しない
        if (prev.length > 0 && prev[0].character === newResult.character && 
            new Date().getTime() - new Date(`2000/01/01 ${prev[0].timestamp}`).getTime() < 2000) {
          return prev;
        }
        
        const updated = [newResult, ...prev.slice(0, 9)]; // 最新10件を保持
        setTotalRecognitions(current => current + 1);
        return updated;
      });
    }
  }, [prediction, confidence, autoSave]);

  const handleCameraToggle = async () => {
    if (isActive) {
      stopCamera(videoRef);
    } else {
      await startCamera(videoRef);
    }
  };

  const handleCameraStop = () => {
    stopCamera(videoRef);
  };

  const clearHistory = () => {
    setRecognitionHistory([]);
    setTotalRecognitions(0);
  };

  const fingerSpellingDescriptions = {
    'あ': '親指立',
    'い': '小指立',
    'う': '2本立',
    'え': '4本立',
    'お': '5本立',
    'か': '人差指',
    'き': '2本立',
    'く': '3本立',
    'け': '4本立',
    'こ': '5本立',
    'さ': 'グー',
    'し': '親指立',
    'す': '小指立',
    'せ': '人差指',
    'そ': '2本立',
    'た': '3本立',
    'ち': '4本立',
    'つ': '5本立',
    'て': 'グー',
    'と': '親指立',
    'な': '小指立',
    'に': '人差指',
    'ぬ': '2本立',
    'ね': '3本立',
    'の': '4本立',
    'は': '5本立',
    'ひ': 'グー',
    'ふ': '親指立',
    'へ': '小指立',
    'ほ': '人差指',
    'ま': '2本立',
    'み': '3本立',
    'む': '4本立',
    'め': '5本立',
    'も': 'グー',
    'や': '親指立',
    'ゆ': '小指立',
    'よ': '人差指',
    'ら': '2本立',
    'り': '3本立',
    'る': '4本立',
    'れ': '5本立',
    'ろ': 'グー',
    'わ': '親指立',
    'を': '小指立',
    'ん': '人差指'
  };

  return (
    <div className="bg-bg-light font-noto min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-google-blue rounded-lg">
                <span className="material-icons text-white text-2xl">sign_language</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-dark">日本手話指文字認識</h1>
                <p className="text-sm text-text-medium">リアルタイム手話認識システム</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-text-medium">
                <span className="material-icons text-lg">computer</span>
                <span>コンピュータビジョン</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Camera Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camera Viewport */}
            <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
              <div className="p-4 border-b border-border-light">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-dark flex items-center">
                    <span className="material-icons mr-2 text-google-blue">videocam</span>
                    カメラ映像
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-google-green bg-opacity-10 rounded-full">
                      <div className={`w-2 h-2 bg-google-green rounded-full ${isActive ? 'animate-pulse-slow' : ''}`}></div>
                      <span className="text-sm font-medium text-success-green">
                        {isActive ? '認識中' : '停止中'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400">
                  <div className="text-red-700">{error}</div>
                </div>
              )}

              <div className="relative bg-black">
                <div className="aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                    style={{ display: isActive ? 'block' : 'none' }}
                  />
                  
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="absolute inset-0 w-full h-full"
                  />
                  
                  {!isActive && (
                    <div className="text-center text-white">
                      <span className="material-icons text-6xl mb-4 opacity-50">videocam</span>
                      <p className="text-lg font-medium">
                        {isLoading ? 'カメラを起動中...' : 'カメラを起動してください'}
                      </p>
                      <p className="text-sm opacity-75 mt-2">手話指文字を認識します</p>
                    </div>
                  )}
                  
                  {isActive && (
                    <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2 text-white text-sm">
                        <span className="material-icons text-lg">pan_tool</span>
                        <span>{handDetected ? '手を検出中' : '手を検出中...'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Controls */}
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Camera On/Off Switch */}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-text-dark">カメラ</span>
                      <div className="relative">
                        <button
                          onClick={handleCameraToggle}
                          disabled={isLoading}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-google-blue focus:ring-offset-2 ${
                            isActive ? 'bg-google-blue' : 'bg-gray-300'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="sr-only">カメラオンオフ</span>
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-google-blue' : 'text-text-medium'}`}>
                        {isLoading ? '起動中...' : isActive ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    
                    {/* Additional Controls */}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCameraStop}
                        disabled={!isActive}
                        className="flex items-center space-x-1 px-3 py-1 text-sm bg-google-red text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-icons text-base">stop</span>
                        <span>停止</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-text-medium">
                      解像度: 640x480
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-google-green animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-text-medium">
                        {isActive ? '録画中' : '待機中'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Recognition Results */}
            <div className="bg-white rounded-xl shadow-sm border border-border-light p-6">
              <h2 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
                <span className="material-icons mr-2 text-google-green">psychology</span>
                リアルタイム認識結果
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Recognition */}
                <div className="text-center">
                  <div className="bg-gradient-to-br from-google-blue to-blue-600 rounded-2xl p-8 text-white mb-4">
                    <div className="text-8xl font-bold mb-2 animate-fade-in">
                      {prediction || ''}
                    </div>
                    <div className="text-lg opacity-90">認識された文字</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-sm text-text-medium">
                      <span className="material-icons text-lg">trending_up</span>
                      <span>信頼度: <span className="font-semibold text-success-green">{Math.round(confidence)}%</span></span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-xs text-text-medium">
                      <span className="material-icons text-sm">
                        {detectionMethod === 'ml' || detectionMethod === 'hybrid' ? 'psychology' : 'rule'}
                      </span>
                      <span>
                        {detectionMethod === 'ml' ? 'AI認識' : 
                         detectionMethod === 'hybrid' ? 'ハイブリッド' : 
                         'ルールベース'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recognition Stats */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-dark">処理速度</span>
                      <span className="text-sm text-text-medium">24 FPS</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-google-green h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-dark">手の検出精度</span>
                      <span className="text-sm text-text-medium">{handDetected ? '92%' : '0%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-google-blue h-2 rounded-full" style={{ width: handDetected ? '92%' : '0%' }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-google-blue">{totalRecognitions}</div>
                      <div className="text-xs text-text-medium">総認識回数</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-google-green">{sessionTime}</div>
                      <div className="text-xs text-text-medium">セッション時間</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History and Controls Section */}
          <div className="space-y-6">
            {/* Quick Reference */}
            <div className="bg-white rounded-xl shadow-sm border border-border-light p-6">
              <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
                <span className="material-icons mr-2 text-google-yellow">school</span>
                指文字一覧
              </h3>
              
              {/* あ行 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-dark mb-2 border-b border-gray-200 pb-1">あ行</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.slice(0, 5).map(letter => (
                    <div key={letter} className="text-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                      <div className="text-lg font-bold text-google-blue mb-1">{letter}</div>
                      <div className="text-xs text-text-medium">{fingerSpellingDescriptions[letter as keyof typeof fingerSpellingDescriptions]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* か行 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-dark mb-2 border-b border-gray-200 pb-1">か行</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.slice(5, 10).map(letter => (
                    <div key={letter} className="text-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                      <div className="text-lg font-bold text-google-green mb-1">{letter}</div>
                      <div className="text-xs text-text-medium">{fingerSpellingDescriptions[letter as keyof typeof fingerSpellingDescriptions]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* さ行 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-dark mb-2 border-b border-gray-200 pb-1">さ行</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.slice(10, 15).map(letter => (
                    <div key={letter} className="text-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                      <div className="text-lg font-bold text-purple-600 mb-1">{letter}</div>
                      <div className="text-xs text-text-medium">{fingerSpellingDescriptions[letter as keyof typeof fingerSpellingDescriptions]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* た行 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-text-dark mb-2 border-b border-gray-200 pb-1">た行</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.slice(15, 20).map(letter => (
                    <div key={letter} className="text-center p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                      <div className="text-lg font-bold text-orange-600 mb-1">{letter}</div>
                      <div className="text-xs text-text-medium">{fingerSpellingDescriptions[letter as keyof typeof fingerSpellingDescriptions]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* な行 */}
              <div className="mb-2">
                <h4 className="text-sm font-medium text-text-dark mb-2 border-b border-gray-200 pb-1">な行</h4>
                <div className="grid grid-cols-5 gap-2">
                  {fingerSpellingMap.slice(20, 25).map(letter => (
                    <div key={letter} className="text-center p-2 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors cursor-pointer">
                      <div className="text-lg font-bold text-pink-600 mb-1">{letter}</div>
                      <div className="text-xs text-text-medium">{fingerSpellingDescriptions[letter as keyof typeof fingerSpellingDescriptions]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recognition History */}
            <div className="bg-white rounded-xl shadow-sm border border-border-light">
              <div className="p-4 border-b border-border-light">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-dark flex items-center">
                    <span className="material-icons mr-2 text-google-green">history</span>
                    認識履歴
                  </h3>
                  <button
                    onClick={clearHistory}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-google-red hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="material-icons text-lg">clear_all</span>
                    <span>クリア</span>
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {recognitionHistory.length > 0 ? (
                    recognitionHistory.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl font-bold text-google-blue">{entry.character}</div>
                          <div>
                            <div className="text-sm font-medium text-text-dark">{entry.timestamp}</div>
                            <div className="text-xs text-text-medium">信頼度: {entry.confidence}%</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-google-green rounded-full"></div>
                          <span className="text-xs text-success-green">認識済み</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-text-medium py-8">
                      <span className="material-icons text-4xl mb-2 opacity-50">history</span>
                      <p>認識履歴がありません</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-border-light">
                  <div className="text-center text-sm text-text-medium">
                    本セッション: <span className="font-semibold text-text-dark">{recognitionHistory.length}</span> 件の認識
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-border-light p-6">
              <h3 className="text-lg font-semibold text-text-dark mb-4 flex items-center">
                <span className="material-icons mr-2 text-text-medium">settings</span>
                設定
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-dark">自動保存</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={autoSave}
                        onChange={(e) => setAutoSave(e.target.checked)}
                      />
                      <div className={`w-10 h-6 ${autoSave ? 'bg-google-blue' : 'bg-gray-300'} rounded-full shadow-inner transition-colors cursor-pointer`}
                           onClick={() => setAutoSave(!autoSave)}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${autoSave ? 'translate-x-4' : 'translate-x-0'} mt-1 ml-1`}></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-text-medium mt-1">認識結果を自動的に履歴に保存します</p>
                </div>
                
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-dark">音声フィードバック</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={audioFeedback}
                        onChange={(e) => setAudioFeedback(e.target.checked)}
                      />
                      <div className={`w-10 h-6 ${audioFeedback ? 'bg-google-blue' : 'bg-gray-300'} rounded-full shadow-inner transition-colors cursor-pointer`}
                           onClick={() => setAudioFeedback(!audioFeedback)}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${audioFeedback ? 'translate-x-4' : 'translate-x-0'} mt-1 ml-1`}></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-text-medium mt-1">認識時に音声でフィードバックします</p>
                </div>

                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-dark">機械学習モード</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={useMLMode}
                        onChange={(e) => setUseMLMode(e.target.checked)}
                      />
                      <div className={`w-10 h-6 ${useMLMode ? 'bg-google-blue' : 'bg-gray-300'} rounded-full shadow-inner transition-colors cursor-pointer`}
                           onClick={() => setUseMLMode(!useMLMode)}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${useMLMode ? 'translate-x-4' : 'translate-x-0'} mt-1 ml-1`}></div>
                      </div>
                    </div>
                  </label>
                  <p className="text-xs text-text-medium mt-1">
                    {mlDetection.isMLReady 
                      ? (useMLMode ? 'AI搭載の高精度認識を使用中' : 'ルールベース認識を使用中')
                      : 'MLモデル読み込み中...'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">認識感度</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-text-medium mt-1">
                    <span>低</span>
                    <span>高</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-google-green rounded-full animate-pulse-slow"></div>
              <span className="text-sm font-medium text-success-green">システム正常</span>
            </div>
            <div className="text-sm text-text-medium">
              CPU: 23% | GPU: 45%
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-text-medium">
            <span className="material-icons text-lg">computer</span>
            <span>コンピュータビジョン v2.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSLRecognition;
