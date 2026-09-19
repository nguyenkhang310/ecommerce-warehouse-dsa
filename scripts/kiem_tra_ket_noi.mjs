// Kiểm tra nhanh hạ tầng; không thay kiểm thử thuật toán của nhóm.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const binary = join(root, "backend/build/may_chu" + (process.platform === "win32" ? ".exe" : ""));
const server = spawn(binary, [String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
let failure;
server.on("error", (error) => { failure = error; });
let logs = "";
server.stdout.on("data", (chunk) => { logs += chunk; });
server.stderr.on("data", (chunk) => { logs += chunk; });
const base = "http://127.0.0.1:" + port;

async function request(path, body) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.headers.get("X-DSA-Runtime"), "C++");
  return { status: response.status, data: await response.json() };
}

async function app(action, data = {}) {
  const response = await request("/api/app", JSON.stringify({ action, data }));
  assert.equal(response.status, 200, action);
  assert.equal(response.data.ok, true, action);
  return response.data.data;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    if (server.exitCode !== null) throw new Error("Máy chủ đã dừng: " + logs);
    try {
      const health = await request("/api/health");
      assert.equal(health.status, 200);
      assert.equal(health.data.language, "C++");
      ready = true;
      break;
    } catch {
      await pause(100);
    }
  }
  assert.ok(ready, "Máy chủ không khởi động: " + logs);
  const modules = await request("/api/modules");
  assert.equal(modules.status, 200);
  assert.deepEqual(modules.data.modules.map((member) => member.id),
    ["nhat_minh", "kim_ngan", "kieu_trang", "ngoc_tram", "nguyen_khang"]);
  const demoInputs = {
    nhat_minh: {},
    kim_ngan: {
      entries: [
        { term: "samsung", sku: "A" },
        { term: "sandisk", sku: "B" },
        { term: "sony", sku: "C" },
      ],
      prefix: "sa",
      erase: { term: "samsung", sku: "A" },
    },
    kieu_trang: {
      data_dir: "backend/data/data_chinh",
      sku: "PRD-CMCX-R837344",
      order_id: "ORD-A9GBX",
    },
    ngoc_tram: {
      capacity: 3,
      updates: [
        { sku: "A", delta: 1, stock_after: 11 },
        { sku: "B", delta: 2, stock_after: 12 },
        { sku: "A", delta: -1, stock_after: 10 },
      ],
    },
    nguyen_khang: {
      data_dir: "backend/data/data_chinh",
      operation: "search_sku",
      sizes: [1000],
      iterations: 5,
      warmup: false,
    },
  };
  for (const member of modules.data.modules) {
    assert.equal(member.entry, "backend/members/" + member.id + "/chay_thu.cpp");
    assert.ok(existsSync(join(root, member.entry)), "Thiếu file chạy thử: " + member.entry);
    const result = await request("/api/demo/" + member.id,
      JSON.stringify(demoInputs[member.id]));
    assert.equal(result.status, 200);
    assert.equal(result.data.member, member.id);
    assert.equal(result.data.ok, true);
    assert.ok("result" in result.data);
    if (member.id === "kieu_trang") {
      assert.equal(result.data.result.product.sku, "PRD-CMCX-R837344");
      assert.equal(result.data.result.order.id, "ORD-A9GBX");
    }
    if (member.id === "nguyen_khang") {
      assert.equal(result.data.result.points.length, 1);
      assert.equal(result.data.result.points[0].dataset_size, 1000);
    }
  }
  const health = await app("health");
  assert.equal(health.mode, "live");
  assert.equal(health.productCount, 10000);
  assert.equal(health.orderCount, 10000);
  assert.equal((await app("dashboard")).totalProducts, 10000);

  const sku = "PRD-CMCX-R837344";
  const lookup = await app("product_lookup", { sku });
  assert.equal(lookup.product.sku, sku);
  assert.equal((await app("product_detail", { sku })).product.stock, 191);
  assert.ok((await app("product_search", { prefix: "prd-cmcx", field: "sku" })).entries.length > 0);
  assert.ok((await app("products", { category: "Home", status: "all" })).length > 0);

  await app("product_create", {
    sku: "PRD-TEST-API", name: "Sản phẩm kiểm tra", category: "Test",
    stock: 5, reorderLevel: 1,
  });
  assert.equal((await app("product_lookup", { sku: "PRD-TEST-API" })).product.stock, 5);
  await app("stock_update", { sku, delta: 1, reason: "inbound", note: "Kiểm tra API" });
  assert.equal((await app("recent", { limit: 6 }))[0].sku, sku);
  assert.equal((await app("recent_snapshot")).items[0].stockAfter, 192);

  const order = await app("order_lookup", { orderCode: "ORD-A9GBX" });
  assert.equal(order.order.id, "ORD-A9GBX");
  assert.equal((await app("next_orders", { limit: 3 })).length, 3);
  assert.equal((await app("heap")).size, 10000);
  const queueSummary = await app("queue_summary");
  assert.equal(queueSummary.urgent + queueSummary.high + queueSummary.normal, 10000);
  assert.equal((await app("queue", { priority: "urgent" }))[0].priority, "urgent");
  await app("order_enqueue", {
    orderCode: "ORD-TEST-API", priority: "urgent",
    items: [{ sku, quantity: 1 }], note: "Kiểm tra API",
  });
  assert.equal((await app("order_lookup", { orderCode: "ORD-TEST-API" })).order.status, "queued");
  assert.ok(await app("order_extract"));

  assert.ok((await app("hash", { limit: 5 })).length > 0);
  assert.ok((await app("trie", { prefix: "prd-cmcx", field: "sku" })).suggestions.length > 0);
  for (const operation of ["hash_lookup", "heap_extract", "trie_prefix", "initial_load"]) {
    const benchmark = await app("benchmark_run", {
      operation, sizes: [1000], iterations: 2, warmup: true,
    });
    assert.equal(benchmark[0].mode, "live");
  }
  assert.equal((await app("benchmark_history")).length, 4);
  const operationLogs = await app("logs");
  assert.ok(operationLogs.length > 0);
  assert.equal(typeof operationLogs[0].id, "string");
  assert.equal(typeof operationLogs[0].message, "string");
  assert.equal((await app("ping")).ok, true);

  assert.equal(await app("reset"), true);
  assert.equal((await app("health")).productCount, 10000);
  assert.equal((await app("product_lookup", { sku })).product.stock, 191);
  assert.equal((await request("/api/app", JSON.stringify({ action: "khong_co", data: {} }))).status, 400);
  assert.equal((await request("/api/demo/nhat_minh", "{")).status, 400);
  assert.equal((await request("/api/demo/nhat_minh", "[]")).status, 400);
  assert.equal((await request("/api/demo/khong_co", "{}")).status, 404);
  assert.equal((await request("/api/unknown")).status, 404);
  console.log("PASS: C++ service, 5 module routes, real data flow and error handling.");
} finally {
  if (server.pid && server.exitCode === null) {
    const closed = once(server, "close");
    server.kill();
    await closed;
  }
}
