// Chỉ gửi/nhận HTTP. Thuật toán nằm trong backend/members/.
export interface CppModule {
  id: string;
  name: string;
  studentId: string;
  task: string;
  entry: string;
}

export interface DemoReply {
  ok: boolean;
  member: string;
  result?: unknown;
  error?: { code: string; message: string; owner?: string; task?: string };
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...init,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("Không kết nối được C++ hoặc yêu cầu quá 60 giây. Kiểm tra terminal backend.");
  }
  if (response.headers.get("X-DSA-Runtime") !== "C++") {
    throw new Error("Chưa nhận được phản hồi C++. Chạy npm run dev tại thư mục gốc.");
  }
  return response;
}

export const cppApi = {
  async modules(): Promise<CppModule[]> {
    const response = await request("/modules");
    if (!response.ok) throw new Error("Không tải được danh sách module C++.");
    const body: { modules: CppModule[] } = await response.json();
    return body.modules;
  },
  async run(member: string, input: Record<string, unknown>): Promise<{ status: number; body: DemoReply }> {
    const response = await request("/demo/" + encodeURIComponent(member), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() };
  },
};
