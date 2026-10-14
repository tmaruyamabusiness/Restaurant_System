import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { computeTotals } from "@oms/shared";
import { PrismaClient } from "@prisma/client";

// Run only on the disposable test database, after seed (smoke may already have run).
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:8000";
let token;
let assertions = 0;
async function call(method, path, body, expected = 200) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.ok(response.status === expected || (expected === 200 && response.status === 201),
    `${method} ${path}: ${response.status}, expected ${expected}: ${JSON.stringify(data)}`);
  assertions++;
  return data;
}
function check(condition, label) {
  assert.ok(condition, label);
  assertions++;
  console.log(`PASS ${label}`);
}
const login = await call("POST", "/api/auth/login", { email: "admin@example.com", password: "admin123" });
token = login.access_token;
const menu = await call("GET", "/api/menu/categories");
const products = menu.flatMap(category => category.items);
const food = products.find(item => item.tax_type === "REDUCED_8");
const drink = products.find(item => item.tax_type === "STANDARD_10");
const items = [{ menu_item_id: food.id, quantity: 1 }];
async function newSeat() {
  const seat = await call("POST", "/api/seats", {
    seat_number: `R-${randomUUID().slice(0, 8)}`, seat_type: "TABLE", capacity: 4, sort_order: 100,
  });
  return call("POST", `/api/seats/${seat.id}/guide`, { party_size: 2 });
}
async function newTakeout() {
  return call("POST", "/api/takeout", {
    customer_name: `Regression-${randomUUID().slice(0, 8)}`,
    phone_number: "000-0000-0000", pickup_at: new Date(Date.now() + 3600_000).toISOString(), items,
  });
}
const amountOf = orders => computeTotals(orders.flatMap(order => order.items)).total_amount;
const lines = amount => [{ method: "CREDIT_CARD", amount }];

// Paid money is immutable while kitchen work remains actionable.
const kitchenSeat = await newSeat();
const kitchenOrder = await call("POST", "/api/orders", {
  order_type: "DINE_IN", session_id: kitchenSeat.current_session.id, items,
});
await call("POST", "/api/payments", { session_id: kitchenSeat.current_session.id, lines: lines(kitchenOrder.total_amount) });
let kds = await call("GET", "/api/kds/orders");
check(kds.some(order => order.id === kitchenOrder.id && order.status === "CLOSED"), "paid pending order remains on KDS");
const itemId = kitchenOrder.items[0].id;
await call("POST", `/api/seats/${kitchenSeat.id}/status`, { status: "VACANT" }, 400);
await call("PUT", `/api/orders/${kitchenOrder.id}/items/${itemId}`, { quantity: 2 }, 400);
await call("PUT", `/api/orders/${kitchenOrder.id}/items/${itemId}`, { notes: "changed" }, 400);
await call("PUT", `/api/kds/items/${itemId}/status`, { status: "CANCELLED" }, 400);
await call("PUT", `/api/kds/items/${itemId}/status`, { status: "COOKING" });
await call("PUT", `/api/kds/items/${itemId}/status`, { status: "COOKING" });
const served = await call("PUT", `/api/kds/items/${itemId}/status`, { status: "SERVED" });
check(served.total_amount === kitchenOrder.total_amount, "serving a paid item does not change its amount");
await call("PUT", `/api/kds/items/${itemId}/status`, { status: "PENDING" }, 400);
kds = await call("GET", "/api/kds/orders");
check(!kds.some(order => order.id === kitchenOrder.id), "served order leaves KDS");
await call("POST", `/api/seats/${kitchenSeat.id}/status`, { status: "VACANT" });

// Returning from billing restores the correct state, including empty sessions.
const billingSeat = await newSeat();
await call("POST", `/api/seats/${billingSeat.id}/status`, { status: "BILLING" });
const emptyResume = await call("POST", `/api/seats/${billingSeat.id}/resume-ordering`);
check(emptyResume.status === "GUIDED", "empty billing session resumes GUIDED");
const first = await call("POST", "/api/orders", { order_type: "DINE_IN", session_id: billingSeat.current_session.id, items });
await call("POST", `/api/seats/${billingSeat.id}/status`, { status: "BILLING" });
await call("POST", "/api/orders", { order_type: "DINE_IN", session_id: billingSeat.current_session.id, items }, 400);
await call("POST", `/api/seats/${billingSeat.id}/status`, { status: "CLEANING" }, 400);
const resumed = await call("POST", `/api/seats/${billingSeat.id}/resume-ordering`);
check(resumed.status === "ORDERING", "billing session with orders resumes ORDERING");
await call("POST", `/api/seats/${billingSeat.id}/resume-ordering`);
const second = await call("POST", "/api/orders", { order_type: "DINE_IN", session_id: billingSeat.current_session.id, items });
const billingPayment = { session_id: billingSeat.current_session.id, lines: lines(amountOf([first, second])) };
await call("POST", "/api/payments", billingPayment);
await call("POST", "/api/payments", billingPayment, 400);
await call("POST", `/api/seats/${billingSeat.id}/resume-ordering`, undefined, 400);

// Cancellation cascades to all unpaid orders, including multiple orders and retries.
const cancelled = await newTakeout();
const extraCancelled = await call("POST", "/api/orders", { order_type: "TAKEOUT", takeout_id: cancelled.id, items });
const cancelledResult = await call("PUT", `/api/takeout/${cancelled.id}/status`, { status: "CANCELLED" });
check(cancelledResult.orders.length === 2 && cancelledResult.orders.every(order => order.status === "CANCELLED" && order.items.every(item => item.status === "CANCELLED")), "cancellation closes all child orders and items");
check(cancelledResult.total_amount === 0, "cancelled takeout has no payable amount");
kds = await call("GET", "/api/kds/orders");
check(!kds.some(order => order.takeout_id === cancelled.id), "cancelled takeout disappears from KDS");
await call("PUT", `/api/takeout/${cancelled.id}/status`, { status: "CANCELLED" });
await call("POST", "/api/payments", { order_id: cancelled.orders[0].id, lines: lines(cancelled.total_amount) }, 400);
await call("POST", "/api/payments", { takeout_id: cancelled.id, lines: lines(cancelled.total_amount) }, 400);
await call("POST", "/api/orders", { order_type: "TAKEOUT", takeout_id: cancelled.id, items }, 400);
await call("PUT", `/api/kds/items/${extraCancelled.items[0].id}/status`, { status: "COOKING" }, 400);

// Old cancellation code left OPEN children; reject charges before any repair call.
const legacy = await newTakeout();
const fixtureDb = new PrismaClient();
try {
  await fixtureDb.takeoutOrder.update({ where: { id: legacy.id }, data: { status: "CANCELLED" } });
} finally {
  await fixtureDb.$disconnect();
}
kds = await call("GET", "/api/kds/orders");
check(!kds.some(order => order.takeout_id === legacy.id), "legacy cancelled parent is excluded from KDS");
await call("POST", "/api/payments", { order_id: legacy.orders[0].id, lines: lines(legacy.total_amount) }, 400);
const repaired = await call("PUT", `/api/takeout/${legacy.id}/status`, { status: "CANCELLED" });
check(repaired.orders.every(order => order.status === "CANCELLED"), "repeated cancellation repairs legacy unpaid children");

// Aggregate settlement uses the same tax calculation as the frontend preview.
const multi = await newTakeout();
const extra = await call("POST", "/api/orders", {
  order_type: "TAKEOUT", takeout_id: multi.id, items: [{ menu_item_id: drink.id, quantity: 2 }],
});
const aggregate = amountOf([...multi.orders, extra]);
const paidTogether = await call("POST", "/api/payments", { takeout_id: multi.id, lines: lines(aggregate) });
check(paidTogether.order_ids.length === 2 && paidTogether.total_amount === aggregate, "multiple takeout orders settle together with mixed tax rates");
await call("POST", "/api/payments", { takeout_id: multi.id, lines: lines(aggregate) }, 400);
await call("PUT", `/api/takeout/${multi.id}/status`, { status: "CANCELLED" }, 400);
kds = await call("GET", "/api/kds/orders");
check(kds.filter(order => order.takeout_id === multi.id).length === 2, "prepaid takeout orders remain on KDS");
await call("POST", "/api/payments", { session_id: billingSeat.current_session.id, takeout_id: multi.id, lines: lines(0) }, 400);
await call("POST", "/api/payments", { lines: lines(0) }, 400);

// Older single-order clients can settle one order, then aggregate only the remainder.
const partial = await newTakeout();
const partialExtra = await call("POST", "/api/orders", { order_type: "TAKEOUT", takeout_id: partial.id, items });
await call("POST", "/api/payments", { order_id: partial.orders[0].id, lines: lines(partial.orders[0].total_amount) });
const remaining = await call("POST", "/api/payments", { takeout_id: partial.id, lines: lines(partialExtra.total_amount) });
check(remaining.order_ids.length === 1 && remaining.order_ids[0] === partialExtra.id, "aggregate payment excludes already paid orders");
await call("POST", "/api/payments", { order_id: first.id, lines: lines(first.total_amount) }, 400);

// Two operations racing on the same parent must never produce paid cancellations.
const race = await newTakeout();
async function raceCall(method, path, body) {
  const response = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const raceResults = await Promise.all([
  raceCall("POST", "/api/payments", { takeout_id: race.id, lines: lines(race.total_amount) }),
  raceCall("PUT", `/api/takeout/${race.id}/status`, { status: "CANCELLED" }),
]);
check(raceResults.filter(result => result.status < 400).length === 1 && raceResults.some(result => result.status === 400), "concurrent cancellation and payment have exactly one winner");
const afterRace = await call("GET", "/api/takeout?all=true");
const raced = afterRace.find(takeout => takeout.id === race.id);
check(raced.status === "CANCELLED" ? raced.orders.every(order => order.status === "CANCELLED") : raced.paid, "concurrent operations preserve consistent child states");

console.log(`ALL REGRESSION TESTS PASSED (${assertions} assertions)`);
