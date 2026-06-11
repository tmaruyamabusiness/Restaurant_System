# レストランOMS v2.0

飲食店向けの注文管理システム(OMS)です。
座席管理、注文処理、キッチンディスプレイ、テイクアウト対応、会計・売上レポートまでを一元管理できます。
リアルタイム通信により、フロアとキッチンの連携をスムーズに実現します。

v2.0 でバックエンドを TypeScript(NestJS + Prisma)に全面移行し、フロントエンドと API スキーマ
(`shared/` の Zod スキーマ)を共有するモノレポ構成になりました。フィールド名のズレは
コンパイルエラーとして検出されます。

## 技術スタック

- **バックエンド:** Node.js 20 / NestJS 10 / Prisma 5 / PostgreSQL 16
- **フロントエンド:** Next.js 14 / React 18 / TypeScript / Tailwind CSS / Zustand
- **共有スキーマ:** Zod(`shared/` — リクエスト/レスポンス型と金額計算ロジックを共有)
- **リアルタイム通信:** Socket.IO
- **インフラ:** Docker / Docker Compose

## セットアップ(Docker)

```bash
git clone <repository-url>
cd Restaurant_System

cp .env.example .env

docker compose up -d --build
```

起動時にマイグレーションと初期データ投入(シード)が自動実行されます。

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000(ヘルスチェック: `/health`)

## ローカル開発(Docker なし)

```bash
npm install

# 共有スキーマをビルド
npm run build:shared

# バックエンド(PostgreSQL が必要。DATABASE_URL を環境変数で指定)
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npx prisma generate --schema backend/prisma/schema.prisma
npm run dev:backend

# フロントエンド(別ターミナル)
npm run dev:frontend
```

## デフォルトログイン

| メールアドレス | パスワード | 権限 |
|---|---|---|
| admin@example.com | admin123 | オーナー |
| manager@example.com | manager123 | マネージャー |
| staff@example.com | staff123 | スタッフ |

ログイン画面のデモアカウントボタンからワンタップでログインできます。

## 主な機能と権限

| 機能 | スタッフ | マネージャー | オーナー |
|---|---|---|---|
| フロアマップ・案内・注文・会計 | ✓ | ✓ | ✓ |
| KDS・テイクアウト | ✓ | ✓ | ✓ |
| メニュー編集・席追加・店舗設定 | - | ✓ | ✓ |
| 売上レポート | - | ✓ | ✓ |
| スタッフ管理 | - | - | ✓ |

すべての業務 API は JWT 認証必須です。

## 設計メモ

- **金額計算**: 整数円で計算。軽減税率対応(店内10% / テイクアウトは商品の税区分に従い、
  酒類は持ち帰りでも10%)。計算ロジックは `shared/src/index.ts` の `computeTotals` に集約され、
  フロントのプレビューとサーバーの確定金額が必ず一致します。
- **値引き**: 会計(Payment)に紐づき、税は値引き後の金額に対して再計算されます。
- **会計**: セッション単位の一括会計(`session_id`)とテイクアウトの注文単位会計(`order_id`)に対応。
  行ロックで二重会計を防止しています。
- **レポート**: 営業日は日本時間(Asia/Tokyo)の0時区切りで集計します。
- **状態遷移**: 席(案内済→注文中→会計中→清掃中→空席)、調理(調理待ち→調理中→提供済)、
  テイクアウト(受付済→調理中→準備完了→受渡済)はサーバー側で遷移を検証します。
  未会計のテイクアウトは受け渡しできません。

## ディレクトリ構成

```
shared/    フロント・バック共有の Zod スキーマ・型・金額計算
backend/   NestJS API(src/ 配下にモジュール、prisma/ にスキーマとマイグレーション)
frontend/  Next.js アプリ(App Router)
mockups/   UI モック(HTML)
```
