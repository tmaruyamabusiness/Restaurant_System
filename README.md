# レストランOMS v1.0

飲食店向けの注文管理システム（OMS）です。
座席管理、注文処理、キッチンディスプレイ、テイクアウト対応、会計・売上レポートまでを一元管理できます。
リアルタイム通信により、フロアとキッチンの連携をスムーズに実現します。

## 技術スタック

- **バックエンド:** Python 3.11 / FastAPI / SQLAlchemy 2.0 / PostgreSQL 16
- **フロントエンド:** Next.js 14 / React 18 / TypeScript / Tailwind CSS
- **リアルタイム通信:** Socket.IO
- **キャッシュ:** Redis 7
- **インフラ:** Docker / Docker Compose

## セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd Restaurant_System

# 環境変数ファイルを作成
cp .env.example .env

# Docker Compose で起動
docker-compose up -d

# 初期データ投入
docker-compose exec backend python -m app.seed
```

## デフォルトログイン

| メールアドレス | パスワード | 権限 |
|---|---|---|
| admin@example.com | admin123 | オーナー |
| manager@example.com | manager123 | マネージャー |
| staff@example.com | staff123 | スタッフ |

## 画面一覧

1. ログイン画面
2. 座席管理画面（フロアマップ）
3. 注文入力画面
4. キッチンディスプレイ（KDS）
5. 会計画面
6. テイクアウト管理画面
7. メニュー管理画面
8. 売上レポート画面
9. ユーザー管理画面
10. 設定画面

## API ドキュメント

サーバー起動後、以下の URL で Swagger UI を確認できます。

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
