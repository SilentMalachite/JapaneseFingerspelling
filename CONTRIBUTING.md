# コントリビューションガイド

日本手話指文字リアルタイム認識アプリへのご貢献ありがとうございます！このガイドに従って、効果的なコントリビューションを行ってください。

## 🚀 始める前に

### 必要な知識
- JavaScript/TypeScript
- React 18以上
- Node.js開発経験
- Git の基本的な使用方法
- 日本手話の基礎知識（推奨）

### 開発環境のセットアップ
1. Node.js 20以上をインストール
2. リポジトリをフォーク
3. ローカルにクローン
4. `npm install` で依存関係をインストール
5. `npm run dev` で開発サーバーを起動

## 📝 コーディング規約

### TypeScript
- 厳密な型定義を使用
- `any` 型の使用は避ける
- インターフェースと型エイリアスを適切に使い分ける

```typescript
// 良い例
interface RecognitionResult {
  character: string;
  confidence: number;
  timestamp: string;
}

// 避けるべき例
const result: any = getRecognitionResult();
```

### React コンポーネント
- 関数コンポーネントを使用
- カスタムフックで状態管理を分離
- propsの型定義を明確に

```typescript
// 良い例
interface CameraControlsProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const CameraControls: React.FC<CameraControlsProps> = ({ 
  isActive, 
  onToggle, 
  disabled = false 
}) => {
  // コンポーネント実装
};
```

### CSS/スタイリング
- Tailwind CSSのユーティリティクラスを使用
- カスタムCSSは最小限に抑制
- レスポンシブデザインを考慮

## 🧪 テスト

### テスト必須項目
- 新機能には対応するテストを作成
- 既存テストが全て通ることを確認
- エッジケースを考慮

### テスト実行
```bash
# 全テスト実行
npm test

# 特定ファイルのテスト
npm test -- useCamera.test.ts

# テストカバレッジ確認
npm run test:coverage
```

### テスト作成ガイドライン
```typescript
describe('useCamera', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useCamera());
    
    expect(result.current.isActive).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });
});
```

## 🔄 開発ワークフロー

### ブランチ戦略
- `main`: 本番用安定版
- `develop`: 開発用統合ブランチ
- `feature/[機能名]`: 新機能開発
- `fix/[修正内容]`: バグ修正
- `docs/[文書名]`: ドキュメント更新

### コミットメッセージ
日本語で明確に記述：

```bash
# 良い例
git commit -m "feat: カメラオンオフスイッチを追加"
git commit -m "fix: 手の検出精度を改善"
git commit -m "docs: READMEの使用方法を更新"

# タイプ
feat: 新機能
fix: バグ修正
docs: ドキュメント
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

### Pull Request プロセス
1. **機能ブランチ作成**
   ```bash
   git checkout -b feature/new-gesture-recognition
   ```

2. **開発とテスト**
   - 機能実装
   - テスト作成
   - 既存テスト確認

3. **コミットとプッシュ**
   ```bash
   git add .
   git commit -m "feat: 新しい手の形認識を追加"
   git push origin feature/new-gesture-recognition
   ```

4. **Pull Request作成**
   - 明確なタイトルと説明
   - 変更内容の詳細
   - テスト結果の共有
   - スクリーンショット（UI変更の場合）

## 🎯 コントリビューション分野

### 優先度が高い改善項目
1. **認識精度の向上**
   - 手の検出アルゴリズムの改善
   - 新しい指文字の追加
   - 照明条件への対応

2. **ユーザビリティの向上**
   - アクセシビリティ機能
   - モバイル対応の改善
   - 多言語サポート

3. **パフォーマンス最適化**
   - 処理速度の向上
   - メモリ使用量の削減
   - バッテリー効率の改善

### 歓迎するコントリビューション
- バグ報告と修正
- 新機能の提案と実装
- ドキュメントの改善
- テストカバレッジの向上
- パフォーマンス最適化
- アクセシビリティ改善

## 📋 Issue 報告

### バグ報告
以下の情報を含めてください：

```markdown
## バグの概要
簡潔な説明

## 再現手順
1. カメラを起動
2. 手を画面に表示
3. エラーが発生

## 期待される動作
正常な認識が行われる

## 実際の動作
エラーメッセージが表示される

## 環境情報
- OS: Windows 11
- ブラウザ: Chrome 120
- Node.js: 20.10.0
- カメラ: 内蔵Webカメラ

## 追加情報
スクリーンショットやエラーログ
```

### 機能リクエスト
```markdown
## 機能の概要
新しい指文字（か行）の認識機能

## 動機
現在のあ行だけでは実用性が限定的

## 提案する解決策
機械学習モデルを使用した拡張認識

## 代替案
ルールベースアプローチでの実装

## 追加コンテキスト
参考資料や関連する議論
```

## 🔍 コードレビュー

### レビュアーへのお願い
- 建設的なフィードバック
- 具体的な改善提案
- コーディング規約の確認
- テストの妥当性確認

### 作成者へのお願い
- レビューコメントへの迅速な対応
- 変更理由の明確な説明
- 追加の文脈情報の提供

## 🏆 認識される貢献

以下の貢献は特に評価されます：

- **革新的な機能**: 新しい認識手法や技術の導入
- **品質向上**: テストカバレッジやコード品質の改善
- **ユーザビリティ**: アクセシビリティや使いやすさの向上
- **教育的価値**: 学習リソースやドキュメントの充実
- **コミュニティ**: 他の開発者の支援や議論への参加

## 📞 質問とサポート

- **GitHub Discussions**: 一般的な質問や議論
- **GitHub Issues**: バグ報告や機能リクエスト
- **コードレビュー**: Pull Requestでの技術的な議論

## 📚 参考資料

- [日本手話指文字一覧](https://example.com/jsl-reference)
- [React 18 ドキュメント](https://react.dev/)
- [TypeScript ハンドブック](https://www.typescriptlang.org/docs/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)

---

すべてのコントリビューターの努力に感謝します！一緒に素晴らしいアプリケーションを作り上げましょう。