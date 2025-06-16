# API仕様書

日本手話指文字認識アプリのAPI仕様について説明します。

## 概要

RESTful APIを使用してフロントエンドとバックエンド間でデータを交換します。全てのAPIエンドポイントは `/api` プレフィックスを使用します。

## 認証

現在の実装では認証は実装されていませんが、将来的にセッションベース認証を追加予定です。

## エンドポイント

### ユーザー管理

#### ユーザー作成
```http
POST /api/users
Content-Type: application/json

{
  "username": "testuser",
  "password": "securepassword"
}
```

**レスポンス:**
```json
{
  "id": 1,
  "username": "testuser"
}
```

#### ユーザー取得
```http
GET /api/users/:id
```

**レスポンス:**
```json
{
  "id": 1,
  "username": "testuser"
}
```

### 認識セッション

#### セッション開始
```http
POST /api/sessions
Content-Type: application/json

{
  "userId": 1
}
```

**レスポンス:**
```json
{
  "id": 1,
  "userId": 1,
  "startTime": "2025-06-15T12:00:00.000Z",
  "totalRecognitions": 0
}
```

#### セッション終了
```http
PUT /api/sessions/:id
Content-Type: application/json

{
  "endTime": "2025-06-15T12:30:00.000Z",
  "totalRecognitions": 25
}
```

### 認識結果

#### 認識結果保存
```http
POST /api/recognition-results
Content-Type: application/json

{
  "sessionId": 1,
  "character": "あ",
  "confidence": 85
}
```

**レスポンス:**
```json
{
  "id": 1,
  "sessionId": 1,
  "character": "あ",
  "confidence": 85,
  "timestamp": "2025-06-15T12:15:30.000Z"
}
```

#### セッション別認識結果取得
```http
GET /api/sessions/:sessionId/results
```

**レスポンス:**
```json
[
  {
    "id": 1,
    "character": "あ",
    "confidence": 85,
    "timestamp": "2025-06-15T12:15:30.000Z"
  },
  {
    "id": 2,
    "character": "い",
    "confidence": 92,
    "timestamp": "2025-06-15T12:16:45.000Z"
  }
]
```

## データ型

### User
```typescript
interface User {
  id: number;
  username: string;
}
```

### RecognitionSession
```typescript
interface RecognitionSession {
  id: number;
  userId: number | null;
  startTime: string;
  endTime: string | null;
  totalRecognitions: number;
}
```

### RecognitionResult
```typescript
interface RecognitionResult {
  id: number;
  sessionId: number | null;
  character: string;
  confidence: number;
  timestamp: string;
}
```

## エラーハンドリング

APIは標準的なHTTPステータスコードを使用します：

- `200` - 成功
- `201` - 作成成功
- `400` - 不正なリクエスト
- `404` - リソースが見つからない
- `500` - サーバーエラー

**エラーレスポンス例:**
```json
{
  "error": "ユーザーが見つかりません",
  "code": "USER_NOT_FOUND",
  "details": {
    "userId": 999
  }
}
```

## 認識アルゴリズム仕様

### 手の検出

1. **肌色検出**: HSV色空間を使用
   - Hue: 0-50
   - Saturation: 30-170
   - Value: 60-255

2. **輪郭抽出**: 検出された肌色ピクセルから手の境界を計算

3. **特徴抽出**: 
   - アスペクト比
   - 領域別ピクセル密度
   - 重心座標

### 指文字分類

各指文字の認識ルール（代表例）:

- **あ (親指立)**: アスペクト比 0.7-1.3、高ピクセル密度
- **い (小指立)**: 上部密度 > 0.3、アスペクト比 < 0.8
- **う (2本立)**: 上部密度 0.25-0.4、アスペクト比 < 0.9
- **え (4本立)**: 上部密度 > 0.4、アスペクト比 < 1.0
- **お (5本立)**: アスペクト比 > 1.2、上部密度 > 0.3

※ 全46文字（あ〜ん）に対応。各文字の詳細な認識パターンは `useHandDetection.ts` を参照。

### 信頼度計算

信頼度は以下の要因で計算:
- 特徴値の一致度
- ピクセル密度の安定性
- 手の検出継続性

最小信頼度閾値: 40%

## リアルタイム処理

### 処理フロー

1. カメラからフレーム取得 (60fps)
2. Canvas APIで画像データ抽出
3. 肌色ピクセル検出
4. 手の輪郭検出
5. 指文字認識
6. 結果表示とデータ保存

### パフォーマンス指標

- **処理速度**: 24fps (目標)
- **検出精度**: 90%以上 (目標)
- **レスポンス時間**: 50ms以下
- **メモリ使用量**: 100MB以下

## 将来の拡張

### v1.1.0
- WebSocket接続によるリアルタイム同期
- 機械学習APIエンドポイント

### v2.0.0
- GraphQL APIサポート
- 高度な統計・分析エンドポイント
- ユーザー認証とロール管理