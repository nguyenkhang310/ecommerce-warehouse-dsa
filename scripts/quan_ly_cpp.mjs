import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "backend");
const deps = join(backend, "thu_vien");
const build = join(backend, "build");
const members = ["nhat_minh", "kim_ngan", "kieu_trang", "ngoc_tram", "nguyen_khang"];
const suffix = process.platform === "win32" ? ".exe" : "";
const [action, ...args] = process.argv.slice(2);
const release = args.includes("--release");
const positional = args.filter((arg) => arg !== "--release");

// Thư viện HTTP/JSON cố định phiên bản và SHA256.
const dependencies = [
  ["httplib.h", "https://raw.githubusercontent.com/yhirose/cpp-httplib/v0.18.7/httplib.h",
    "4770f8ea3d3fcd27b0b713c783d9b53bce3baddbd5adad13714011df96142526"],
  ["json.hpp", "https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp",
    "aaf127c04cb31c406e5b04a63f1ae89369fccde6d8fa7cdda1ed4f32dfc5de63"],
];

async function setup() {
  for (const [file, url, sha256] of dependencies) {
    const destination = join(deps, file);
    if (existsSync(destination)) {
      if (createHash("sha256").update(readFileSync(destination)).digest("hex") !== sha256) {
        throw new Error("Sai SHA256: " + destination + ". Xóa riêng file này rồi setup lại.");
      }
      continue;
    }
    console.log("Tải " + file);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Tải thất bại: HTTP " + response.status + " " + url);
    const contents = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(contents).digest("hex") !== sha256) {
      throw new Error("SHA256 không khớp: " + file);
    }
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }
}

function execute(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Biên dịch một điểm vào; các file chức năng được nạp bằng #include.
async function compile(member, optimized = release) {
  await setup();
  mkdirSync(build, { recursive: true });
  const output = join(build, member ? "chay_thu_" + member + suffix : "may_chu" + suffix);
  const compileArgs = [
    "-std=c++17", optimized ? "-O2" : "-O0", "-g", "-Wall", "-Wextra", "-Wpedantic",
    "-finput-charset=UTF-8", "-fexec-charset=UTF-8", "-pthread",
    "-I", backend, "-isystem", deps,
  ];
  if (member) {
    compileArgs.push("-I", join(backend, "members", member), "-DDSA_MEMBER=" + member,
      join(backend, "app/chay_dong_lenh.cpp"));
  } else {
    compileArgs.push(join(backend, "app/may_chu.cpp"));
  }
  if (process.platform === "win32") compileArgs.push("-lws2_32");
  compileArgs.push("-o", output);
  console.log("Biên dịch C++ " + (member ?? "máy chủ") + (optimized ? " (-O2)" : " (-O0, gỡ lỗi)"));
  execute(process.env.CXX || "g++", compileArgs);
  return output;
}

async function backendReady() {
  try {
    const response = await fetch("http://127.0.0.1:8080/api/health", {
      signal: AbortSignal.timeout(500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopProcess(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function runProject() {
  const executable = join(build, "may_chu" + suffix);
  if (!existsSync(executable)) await compile(undefined, true);

  let backendProcess;
  if (!(await backendReady())) {
    backendProcess = spawn(executable, ["8080"], { cwd: root, stdio: "inherit" });
    for (let attempt = 0; attempt < 50 && !(await backendReady()); attempt++) {
      if (backendProcess.exitCode !== null) throw new Error("Backend C++ không khởi động được.");
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    if (!(await backendReady())) throw new Error("Backend C++ chưa sẵn sàng ở cổng 8080.");
  } else {
    console.log("Backend C++ đang chạy ở http://127.0.0.1:8080");
  }

  const frontendProcess = process.platform === "win32"
    ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm --prefix giaodien run dev"], {
      cwd: root,
      stdio: "inherit",
    })
    : spawn("npm", ["--prefix", "giaodien", "run", "dev"], { cwd: root, stdio: "inherit" });

  await new Promise((resolveRun) => {
    let stopping = false;
    const finish = (code = 0) => {
      if (stopping) return;
      stopping = true;
      stopProcess(frontendProcess);
      stopProcess(backendProcess);
      process.exitCode = code;
      resolveRun();
    };
    process.once("SIGINT", () => finish());
    process.once("SIGTERM", () => finish());
    frontendProcess.once("exit", (code) => finish(code ?? 1));
    backendProcess?.once("exit", (code) => finish(code ?? 1));
  });
}

// Node chỉ tải nguồn và gọi g++; toàn bộ quy tắc làm sạch nằm trong lam_sach.cpp.
async function prepareData() {
  const source = join(backend, "data/goc/nguon.csv");
  const temporary = source + ".tmp";
  const cached = existsSync(source);
  if (!cached) {
    mkdirSync(dirname(source), { recursive: true });
    console.log("Đang tải CSV Kaggle phiên bản 1 (khoảng 410 MB)...");
    const url = "https://www.kaggle.com/api/v1/datasets/download/akrambelha/global-e-commerce-dataset-1m-records-20242026/ecommerce_dataset_%2B1m.csv?datasetVersionNumber=1";
    const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error("Không tải được Kaggle: HTTP " + response.status);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(cached ? source : temporary)) hash.update(chunk);
  if (hash.digest("hex") !== "423cd27477c44a34eaa2acd62747371b790334f57f74a3e97a4a72c40055e041") {
    throw new Error("CSV không khớp nguồn phiên bản 1. Kiểm tra file tải; chưa chạy làm sạch.");
  }
  if (!cached) renameSync(temporary, source);
  mkdirSync(build, { recursive: true });
  const binary = join(build, "lam_sach" + suffix);
  execute(process.env.CXX || "g++", ["-std=c++17", "-O2", "-Wall", "-Wextra", "-Wpedantic",
    "-finput-charset=UTF-8", "-fexec-charset=UTF-8", join(root, "scripts/lam_sach.cpp"), "-o", binary]);
  console.log("Đang làm sạch bằng C++...");
  execute(binary, []);
}

try {
  switch (action) {
    case "data":
      await prepareData();
      break;
    case "setup":
      await setup();
      console.log("Đã sẵn sàng thư viện HTTP/JSON.");
      break;
    case "build":
      await compile();
      break;
    case "dev":
      await runProject();
      break;
    case "start": {
      const executable = join(build, "may_chu" + suffix);
      if (!existsSync(executable)) throw new Error("Chạy npm run backend:build trước.");
      execute(executable, positional);
      break;
    }
    case "demo": {
      const [member, input] = positional;
      if (!members.includes(member) || positional.length > 2) {
        throw new Error("Cách dùng: npm run demo -- <" + members.join("|") + "> [input.json] [--release]");
      }
      const executable = await compile(member);
      execute(executable, input ? [resolve(process.cwd(), input)] : []);
      break;
    }
    default:
      throw new Error("Lệnh: dev | setup | data | build [--release] | start [port] | demo <member> [input.json]");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
