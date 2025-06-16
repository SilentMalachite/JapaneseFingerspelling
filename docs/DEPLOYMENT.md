# デプロイメントガイド

日本手話指文字認識アプリのデプロイ方法を説明します。

## 🚀 Replitでのデプロイ（推奨）

### 自動デプロイ
1. Replitでプロジェクトを開く
2. "Deploy" ボタンをクリック
3. デプロイ設定を確認
4. 自動的にビルドとデプロイが実行される

### 手動設定
```bash
# 本番ビルド
npm run build

# サーバー起動
npm start
```

### 環境変数設定
Replitの環境変数タブで以下を設定：
```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
```

## 🐳 Dockerでのデプロイ

### Dockerファイル作成
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .

# ビルド実行
RUN npm run build

# ポート公開
EXPOSE 5000

# 起動コマンド
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/jsl_recognition
    depends_on:
      - db
      
  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=jsl_recognition
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
volumes:
  postgres_data:
```

### デプロイ実行
```bash
# イメージビルド
docker build -t jsl-recognition .

# コンテナ起動
docker-compose up -d
```

## ☁️ クラウドサービスでのデプロイ

### Vercel
```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクトにログイン
vercel login

# デプロイ実行
vercel --prod
```

**vercel.json 設定:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Netlify
```bash
# Netlify CLIインストール
npm i -g netlify-cli

# ログイン
netlify login

# サイト作成
netlify init

# デプロイ
netlify deploy --prod
```

**netlify.toml 設定:**
```toml
[build]
  publish = "dist/public"
  command = "npm run build"

[build.environment]
  NODE_ENV = "production"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Heroku
```bash
# Heroku CLIインストール後
heroku create jsl-recognition-app

# 環境変数設定
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your_secret

# PostgreSQLアドオン追加
heroku addons:create heroku-postgresql:hobby-dev

# デプロイ
git push heroku main
```

**Procfile:**
```
web: npm start
```

## 🗄️ データベース設定

### PostgreSQL設定
```sql
-- データベース作成
CREATE DATABASE jsl_recognition;

-- ユーザー作成
CREATE USER jsl_user WITH PASSWORD 'secure_password';

-- 権限付与
GRANT ALL PRIVILEGES ON DATABASE jsl_recognition TO jsl_user;
```

### スキーマ適用
```bash
# マイグレーション実行
npm run db:push

# データベース接続確認
npm run db:check
```

## 🔒 セキュリティ設定

### HTTPS設定
本番環境では必ずHTTPSを使用：

```javascript
// server/index.ts
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 環境変数
本番環境で必須の環境変数：

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=cryptographically_strong_secret
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=100
```

### セキュリティヘッダー
```javascript
// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"]
    }
  }
}));
```

## 📊 監視とログ

### アプリケーション監視
```javascript
// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

### ログ設定
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🔧 パフォーマンス最適化

### ビルド最適化
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-button']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### CDN設定
```javascript
// 静的アセットのCDN配信
app.use('/static', express.static('dist/public', {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
```

## 🚨 トラブルシューティング

### よくある問題

**カメラアクセスエラー**
- HTTPSが必要（本番環境）
- ブラウザ権限の確認
- デバイス互換性の確認

**データベース接続エラー**
```bash
# 接続テスト
npx drizzle-kit check
```

**メモリ不足**
```bash
# Node.jsメモリ上限設定
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

### ログ確認
```bash
# アプリケーションログ
tail -f logs/combined.log

# エラーログ
tail -f logs/error.log

# システムログ（Linux）
journalctl -u jsl-recognition -f
```

## 📈 スケーリング

### 水平スケーリング
```yaml
# Kubernetes設定例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jsl-recognition
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jsl-recognition
  template:
    metadata:
      labels:
        app: jsl-recognition
    spec:
      containers:
      - name: app
        image: jsl-recognition:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
```

### ロードバランサー
```nginx
# Nginx設定
upstream jsl_backend {
    server app1:5000;
    server app2:5000;
    server app3:5000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://jsl_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ✅ デプロイチェックリスト

- [ ] 環境変数の設定
- [ ] データベースの設定とマイグレーション
- [ ] HTTPS証明書の設定
- [ ] セキュリティヘッダーの設定
- [ ] 監視とログの設定
- [ ] バックアップの設定
- [ ] パフォーマンステストの実行
- [ ] セキュリティテストの実行
- [ ] ドメインとDNSの設定
- [ ] CDN設定（必要に応じて）

---

デプロイが完了したら、必ずヘルスチェックとカメラ機能のテストを実行してください。