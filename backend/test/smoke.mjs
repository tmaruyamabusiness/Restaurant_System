/**
 * E2Eスモークテスト。起動済みのバックエンド(http://localhost:8000)に対し、
 * 認証・案内・注文・KDS・会計・テイクアウト・レポート・権限の主要フローを検証する。
 * seed.js 投入直後のクリーンなDBを前提とする。失敗が1件でもあれば exit 1。
 */
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:8000";
let token = "";
let failures = 0;

async function call(method, path, body, expectStatus = 200, useAuth = true) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(useAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status !== expectStatus && !(expectStatus === 200 && res.status === 201)) {
    failures++;
    console.log(
      `✗ ${method} ${path} → ${res.status} (expected ${expectStatus})`,
      JSON.stringify(data)?.slice(0, 200)
    );
  } else {
    console.log(`✓ ${method} ${path} → ${res.status}`);
  }
  return data;
}

function assert(cond, label) {
  if (cond) {
    console.log(`✓ ${label}`);
  } else {
    failures++;
    console.log(`✗ ${label}`);
  }
}

// 1. 未認証アクセスは401
await call("GET", "/api/seats", null, 401, false);

// 2. ログイン
const login = await call(
  "POST",
  "/api/auth/login",
  { email: "admin@example.com", password: "admin123" },
  200,
  false
);
token = login.access_token;
assert(login.user.username === "管理者", "login returns user");

// 3. 席一覧
const seats = await call("GET", "/api/seats");
assert(seats.length === 10 && seats[0].status === "VACANT", "10 seats, all vacant");
const seat = seats[0];

// 4. 定員超過の案内は400 / 正常案内 / 二重案内は409
await call("POST", `/api/seats/${seat.id}/guide`, { party_size: 99 }, 400);
const guided = await call("POST", `/api/seats/${seat.id}/guide`, { party_size: 3 });
assert(
  guided.status === "GUIDED" && guided.current_session.party_size === 3,
  "guided with party_size 3"
);
await call("POST", `/api/seats/${seat.id}/guide`, { party_size: 2 }, 409);
const sessionId = guided.current_session.id;

// 5. メニュー取得
const menu = await call("GET", "/api/menu/categories");
const allItems = menu.flatMap((c) => c.items);
const karaage = allItems.find((i) => i.name === "唐揚げ"); // 680 REDUCED_8
const beer = allItems.find((i) => i.name === "生ビール"); // 580 STANDARD_10
assert(karaage && beer, "menu has expected items");

// 6. 負数量は400
await call(
  "POST",
  "/api/orders",
  { order_type: "DINE_IN", session_id: sessionId, items: [{ menu_item_id: karaage.id, quantity: -5 }] },
  400
);

// 7. 注文作成: 唐揚げ×2 + 生ビール×4 (店内 = 全部10%)
const order = await call("POST", "/api/orders", {
  order_type: "DINE_IN",
  session_id: sessionId,
  items: [
    { menu_item_id: karaage.id, quantity: 2, notes: "レモン別添え" },
    { menu_item_id: beer.id, quantity: 4 },
  ],
});
// subtotal = 680*2+580*4 = 3680, tax(10%) = 368, total = 4048
assert(
  order.subtotal === 3680 && order.tax_amount === 368 && order.total_amount === 4048,
  `dine-in totals correct (${order.subtotal}/${order.tax_amount}/${order.total_amount})`
);
assert(order.seat_number === seat.seat_number, "order carries seat_number");

// 席はORDERINGに自動遷移
const seatAfter = await call("GET", `/api/seats/${seat.id}`);
assert(seatAfter.status === "ORDERING", "seat auto-transitioned to ORDERING");

// 8. KDS: 一覧 → 調理開始 → 逆行禁止 → キャンセルで再計算
const kds = await call("GET", "/api/kds/orders");
assert(kds.some((o) => o.id === order.id), "order visible on KDS");
const beerItem = order.items.find((i) => i.item_name === "生ビール");
const karaageItem = order.items.find((i) => i.item_name === "唐揚げ");
await call("PUT", `/api/kds/items/${beerItem.id}/status`, { status: "COOKING" });
await call("PUT", `/api/kds/items/${karaageItem.id}/status`, { status: "SERVED" });
await call("PUT", `/api/kds/items/${karaageItem.id}/status`, { status: "PENDING" }, 400);
// ビールをキャンセル → 合計再計算 (唐揚げのみ: 1360 + 136 = 1496)
const afterCancel = await call("PUT", `/api/kds/items/${beerItem.id}/status`, {
  status: "CANCELLED",
});
assert(
  afterCancel.subtotal === 1360 && afterCancel.total_amount === 1496,
  `KDS cancel recalculates totals (${afterCancel.total_amount})`
);

// 9. 会計: 金額不一致は400 / 10%値引き / 二重会計は400
await call(
  "POST",
  "/api/payments",
  { session_id: sessionId, lines: [{ method: "CASH", amount: 9999 }], receipt_issued: true },
  400
);
// 10%値引き: 1360→1224 + tax 122 = 1346, 現金2000預かり → おつり654
const payment = await call("POST", "/api/payments", {
  session_id: sessionId,
  lines: [{ method: "CASH", amount: 1346, received_amount: 2000 }],
  discount: { type: "PERCENTAGE", value: 10 },
  receipt_issued: true,
});
assert(
  payment.total_amount === 1346 && payment.change_amount === 654 && payment.discount_applied === 136,
  `payment with 10% discount (total=${payment.total_amount}, change=${payment.change_amount})`
);
await call(
  "POST",
  "/api/payments",
  { session_id: sessionId, lines: [{ method: "CASH", amount: 1346 }], receipt_issued: true },
  400
);

// 席は自動でCLEANINGへ → 空席に戻す
const seatPaid = await call("GET", `/api/seats/${seat.id}`);
assert(seatPaid.status === "CLEANING", "seat auto-transitioned to CLEANING after payment");
const seatVacant = await call("POST", `/api/seats/${seat.id}/status`, { status: "VACANT" });
assert(seatVacant.status === "VACANT", "cleaning done -> vacant");

// 10. テイクアウト: 軽減税率混在(酒類は持ち帰りでも10%)
const pickup = new Date(Date.now() + 30 * 60000).toISOString();
const takeout = await call("POST", "/api/takeout", {
  customer_name: "佐藤",
  phone_number: "090-1234-5678",
  pickup_at: pickup,
  items: [
    { menu_item_id: karaage.id, quantity: 2 }, // 1360 @8% = 108
    { menu_item_id: beer.id, quantity: 1 }, // 580  @10% = 58
  ],
});
const tOrder = takeout.orders[0];
assert(
  tOrder.tax_amount === 166 && tOrder.total_amount === 2106,
  `takeout mixed tax rates (tax=${tOrder.tax_amount}, total=${tOrder.total_amount})`
);
assert(takeout.paid === false, "takeout starts unpaid");

// 未払いのまま PICKED_UP は不可
await call("PUT", `/api/takeout/${takeout.id}/status`, { status: "PREPARING" });
await call("PUT", `/api/takeout/${takeout.id}/status`, { status: "READY" });
await call("PUT", `/api/takeout/${takeout.id}/status`, { status: "PICKED_UP" }, 400);

// 注文単位の会計(カード) → 受け渡し
await call("POST", "/api/payments", {
  order_id: tOrder.id,
  lines: [{ method: "CREDIT_CARD", amount: 2106 }],
  receipt_issued: true,
});
const picked = await call("PUT", `/api/takeout/${takeout.id}/status`, { status: "PICKED_UP" });
assert(picked.status === "PICKED_UP" && picked.paid === true, "takeout paid and picked up");

// 11. レポート(JST今日): net = 1346 + 2106 = 3452, 値引き 136, 来店3名
const jstToday = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
const report = await call("GET", `/api/reports/daily?date=${jstToday}`);
assert(
  report.net_sales === 3452 && report.discount_total === 136 && report.guest_count === 3,
  `daily report (net=${report.net_sales}, discount=${report.discount_total}, guests=${report.guest_count})`
);
const cash = report.by_payment_method.find((m) => m.method === "CASH");
const card = report.by_payment_method.find((m) => m.method === "CREDIT_CARD");
assert(cash?.amount === 1346 && card?.amount === 2106, "payment method breakdown");

// 12. 権限: スタッフはレポート閲覧不可・ユーザー作成不可・メニュー編集不可
const staffLogin = await call(
  "POST",
  "/api/auth/login",
  { email: "staff@example.com", password: "staff123" },
  200,
  false
);
token = staffLogin.access_token;
await call("GET", `/api/reports/daily`, null, 403);
await call(
  "POST",
  "/api/users",
  { username: "x", email: "x@example.com", password: "password123", role: "STAFF" },
  403
);
await call("POST", "/api/menu/items", { category_id: menu[0].id, name: "x", price: 100 }, 403);

console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
