# システムアーキテクチャ

日本手話指文字認識アプリの技術アーキテクチャについて詳細に説明します。

## システム概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ブラウザ       │    │   Express.js    │    │  PostgreSQL     │
│   (React)       │◄──►│   サーバー       │◄──►│  データベース    │
│                 │    │                 │    │                 │
│ - カメラAPI     │    │ - RESTful API   │    │ - 認識履歴      │
│ - Canvas処理    │    │ - セッション管理 │    │ - ユーザー管理   │
│ - リアルタイム  │    │ - データ永続化   │    │ - セッション    │
│   認識処理      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## フロントエンド アーキテクチャ

### コンポーネント構造
```
App
├── JSLRecognition (メインコンポーネント)
│   ├── CameraSection
│   │   ├── VideoDisplay
│   │   └── CameraControls
│   ├── RecognitionResults
│   │   ├── CurrentResult
│   │   └── Statistics
│   └── Sidebar
│       ├── QuickReference
│       ├── RecognitionHistory
│       └── SettingsPanel
```

### データフロー
```
Camera Input → Canvas Processing → Hand Detection → Character Recognition → UI Update
     ↓              ↓                    ↓                   ↓              ↓
  getUserMedia   getImageData      detectSkinPixels   recognizeCharacter  setState
```

### 状態管理
- **ローカル状態**: React useState/useEffect
- **サーバー状態**: TanStack Query
- **カメラ状態**: useCamera カスタムフック
- **認識状態**: useHandDetection カスタムフック

## バックエンド アーキテクチャ

### レイヤー構造
```
┌─────────────────────────────────────┐
│           Express Router            │
├─────────────────────────────────────┤
│            Route Handlers           │
├─────────────────────────────────────┤
│         Business Logic              │
├─────────────────────────────────────┤
│          Storage Layer              │
├─────────────────────────────────────┤
│          Drizzle ORM                │
├─────────────────────────────────────┤
│          PostgreSQL                 │
└─────────────────────────────────────┘
```

### API設計
- RESTful エンドポイント
- JSON レスポンス形式
- エラーハンドリング
- 型安全性（TypeScript）

## データベース設計

### テーブル構造
```sql
users (ユーザー)
├── id (PRIMARY KEY)
├── username (UNIQUE)
└── password

recognition_sessions (認識セッション)
├── id (PRIMARY KEY)
├── user_id (FOREIGN KEY)
├── start_time
├── end_time
└── total_recognitions

recognition_results (認識結果)
├── id (PRIMARY KEY)
├── session_id (FOREIGN KEY)
├── character
├── confidence
└── timestamp
```

### 関係図
```
users (1) ──── (n) recognition_sessions (1) ──── (n) recognition_results
```

## コンピュータビジョン アーキテクチャ

### 処理パイプライン
```
Video Frame → Canvas → ImageData → Skin Detection → Hand Contour → Feature Extraction → Classification
```

### アルゴリズム詳細

#### 1. 肌色検出
```typescript
// HSV色空間での肌色判定
const isSkinColor = (h: number, s: number, v: number): boolean => {
  return h >= 0 && h <= 50 &&
         s >= 30 && s <= 170 &&
         v >= 60 && v <= 255;
};
```

#### 2. 輪郭抽出
```typescript
// 境界ボックス計算
const boundingBox = {
  minX: Math.min(...skinPixels.map(p => p.x)),
  maxX: Math.max(...skinPixels.map(p => p.x)),
  minY: Math.min(...skinPixels.map(p => p.y)),
  maxY: Math.max(...skinPixels.map(p => p.y))
};
```

#### 3. 特徴抽出
- アスペクト比: width / height
- ピクセル密度: 領域別ピクセル数 / 総ピクセル数
- 重心座標: (centerX, centerY)

#### 4. 分類ルール
```typescript
const classificationRules = {
  'あ': { aspectRatio: [0.7, 1.3], totalPixels: '>3000' },
  'い': { topDensity: '>0.3', aspectRatio: '<0.8' },
  'う': { topDensity: [0.25, 0.4], aspectRatio: '<0.9' },
  'え': { topDensity: '>0.4', aspectRatio: '<1.0' },
  'お': { aspectRatio: '>1.2', topDensity: '>0.3' }
};
```

## セキュリティアーキテクチャ

### データ保護
- パスワードハッシュ化
- セッション管理
- CSRF保護
- XSS防止

### プライバシー
- カメラデータの非永続化
- ローカル処理優先
- 最小限のデータ収集

## パフォーマンス アーキテクチャ

### フロントエンド最適化
```typescript
// フレーム処理最適化
const processFrame = useCallback(() => {
  if (!isActive) return;
  
  // 処理頻度制限
  if (Date.now() - lastProcessTime < 41) { // 24fps
    requestAnimationFrame(processFrame);
    return;
  }
  
  // 実際の処理
  performRecognition();
  lastProcessTime = Date.now();
  
  requestAnimationFrame(processFrame);
}, [isActive]);
```

### バックエンド最適化
- 接続プール
- クエリ最適化
- キャッシュ戦略
- レスポンス圧縮

## デプロイメント アーキテクチャ

### 開発環境
```
開発者PC → Vite Dev Server → Express Dev Server → 開発DB
```

### 本番環境
```
CDN → Load Balancer → App Servers → Database Cluster
```

### CI/CDパイプライン
```
Git Push → GitHub Actions → Tests → Build → Deploy → Health Check
```

## 監視とログ

### アプリケーション監視
- ヘルスチェックエンドポイント
- メトリクス収集
- エラー追跡
- パフォーマンス監視

### ログ戦略
```
Error Logs → 即座にアラート
Access Logs → 日次分析
Performance Logs → 週次レポート
```

## スケーラビリティ

### 水平スケーリング
- ステートレス設計
- データベース分離
- ロードバランシング
- CDN活用

### 垂直スケーリング
- メモリ最適化
- CPU使用率改善
- I/O効率化

## 将来のアーキテクチャ拡張

### v2.0 予定
- マイクロサービス化
- WebSocket リアルタイム通信
- 機械学習API統合
- キューイングシステム

### v3.0 構想
- エッジコンピューティング
- オフライン対応
- PWA化
- リアルタイム協調機能