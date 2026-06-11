/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log("seed: data already exists, skipping");
    return;
  }

  const users = [
    { username: "管理者", email: "admin@example.com", password: "admin123", role: "OWNER" as const },
    { username: "店長", email: "manager@example.com", password: "manager123", role: "MANAGER" as const },
    { username: "スタッフ", email: "staff@example.com", password: "staff123", role: "STAFF" as const },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        role: u.role,
        password_hash: await bcrypt.hash(u.password, 10),
      },
    });
  }

  const seats: { seat_number: string; seat_type: "TABLE" | "COUNTER" | "PRIVATE"; capacity: number }[] = [
    { seat_number: "1", seat_type: "TABLE", capacity: 4 },
    { seat_number: "2", seat_type: "TABLE", capacity: 4 },
    { seat_number: "3", seat_type: "TABLE", capacity: 2 },
    { seat_number: "4", seat_type: "TABLE", capacity: 4 },
    { seat_number: "5", seat_type: "TABLE", capacity: 6 },
    { seat_number: "C1", seat_type: "COUNTER", capacity: 1 },
    { seat_number: "C2", seat_type: "COUNTER", capacity: 1 },
    { seat_number: "C3", seat_type: "COUNTER", capacity: 1 },
    { seat_number: "R1", seat_type: "PRIVATE", capacity: 6 },
    { seat_number: "R2", seat_type: "PRIVATE", capacity: 8 },
  ];
  await prisma.seat.createMany({
    data: seats.map((s, i) => ({ ...s, sort_order: i })),
  });

  const categories: {
    name: string;
    items: { name: string; price: number; tax_type: "STANDARD_10" | "REDUCED_8" }[];
  }[] = [
    {
      name: "おすすめ",
      items: [
        { name: "本日の鮮魚カルパッチョ", price: 980, tax_type: "REDUCED_8" },
        { name: "和牛ステーキ", price: 2480, tax_type: "REDUCED_8" },
      ],
    },
    {
      name: "フード",
      items: [
        { name: "唐揚げ", price: 680, tax_type: "REDUCED_8" },
        { name: "マルゲリータピザ", price: 1280, tax_type: "REDUCED_8" },
        { name: "カルボナーラ", price: 1180, tax_type: "REDUCED_8" },
        { name: "シーザーサラダ", price: 780, tax_type: "REDUCED_8" },
        { name: "フライドポテト", price: 480, tax_type: "REDUCED_8" },
        { name: "唐揚げ弁当", price: 880, tax_type: "REDUCED_8" },
      ],
    },
    {
      name: "ドリンク",
      items: [
        // 酒類は軽減税率の対象外(テイクアウトでも10%)
        { name: "生ビール", price: 580, tax_type: "STANDARD_10" },
        { name: "ハイボール", price: 480, tax_type: "STANDARD_10" },
        { name: "グラスワイン", price: 600, tax_type: "STANDARD_10" },
        { name: "ウーロン茶", price: 300, tax_type: "REDUCED_8" },
        { name: "オレンジジュース", price: 350, tax_type: "REDUCED_8" },
        { name: "コーヒー", price: 400, tax_type: "REDUCED_8" },
      ],
    },
    {
      name: "デザート",
      items: [
        { name: "プリン", price: 480, tax_type: "REDUCED_8" },
        { name: "ガトーショコラ", price: 580, tax_type: "REDUCED_8" },
        { name: "本日のジェラート", price: 420, tax_type: "REDUCED_8" },
      ],
    },
  ];

  let catOrder = 0;
  for (const c of categories) {
    const category = await prisma.menuCategory.create({
      data: { name: c.name, sort_order: catOrder++ },
    });
    let itemOrder = 0;
    for (const item of c.items) {
      await prisma.menuItem.create({
        data: { ...item, category_id: category.id, sort_order: itemOrder++ },
      });
    }
  }

  await prisma.setting.createMany({
    data: [
      { key: "store_name", value: "レストランOMS" },
      { key: "alert_threshold_minutes", value: "60" },
    ],
  });

  console.log("seed: completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
