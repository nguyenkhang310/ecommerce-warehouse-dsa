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
    signal: AbortSignal.timeout(3000),
  });
  assert.equal(response.headers.get("X-DSA-Runtime"), "C++");
  return { status: response.status, data: await response.json() };
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
  for (const member of modules.data.modules) {
    assert.equal(member.entry, "backend/members/" + member.id + "/chay_thu.cpp");
    assert.ok(existsSync(join(root, member.entry)), "Thiếu file chạy thử: " + member.entry);
    const result = await request("/api/demo/" + member.id, "{}");
    // Cho phép 200 khi thành viên đã hoàn thiện demo; 501 là trạng thái khung.
    assert.ok([200, 501].includes(result.status));
    assert.equal(result.data.member, member.id);
    if (result.status === 501) {
      assert.equal(result.data.ok, false);
      assert.equal(result.data.error.code, "NOT_IMPLEMENTED");
      assert.equal(result.data.error.owner, member.id);
    } else {
      assert.equal(result.data.ok, true);
      assert.ok("result" in result.data);
    }
  }
  assert.equal((await request("/api/demo/nhat_minh", "{")).status, 400);
  assert.equal((await request("/api/demo/nhat_minh", "[]")).status, 400);
  assert.equal((await request("/api/demo/khong_co", "{}")).status, 404);
  assert.equal((await request("/api/unknown")).status, 404);
  console.log("PASS: C++ health, 5 module routes, JSON errors and unknown routes.");
} finally {
  if (server.pid && server.exitCode === null) {
    const closed = once(server, "close");
    server.kill();
    await closed;
  }
}
