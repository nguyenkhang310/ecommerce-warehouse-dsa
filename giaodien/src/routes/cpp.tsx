import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cppApi } from "@/services/giao_tiep_cpp";

export const Route = createFileRoute("/cpp")({
  component: CppDemoPage,
});

function CppDemoPage() {
  const modules = useQuery({ queryKey: ["cpp-modules"], queryFn: cppApi.modules, retry: false });
  const [memberId, setMemberId] = useState("");
  const [input, setInput] = useState("{}");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const selected = modules.data?.find((module) => module.id === memberId) ?? modules.data?.[0];

  async function run() {
    if (!selected) return;
    setRunning(true);
    setOutput("");
    try {
      const parsed: unknown = JSON.parse(input);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Đầu vào phải là một JSON object, ví dụ {}.");
      }
      const result = await cppApi.run(selected.id, parsed as Record<string, unknown>);
      setOutput("HTTP " + result.status + "\n" + JSON.stringify(result.body, null, 2));
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Không chạy được demo.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cấu trúc dữ liệu và giải thuật"
        title="Demo C++"
        description="Chọn thành viên, gửi dữ liệu và xem kết quả trực tiếp từ chương trình C++."
        actions={
          <Button variant="outline" onClick={() => modules.refetch()} disabled={modules.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Kiểm tra kết nối
          </Button>
        }
      />
      <div className="surface-card space-y-2 p-5 text-sm">
        <p>Luồng chạy: giao diện → HTTP → C++ → kết quả JSON.</p>
        <p className="text-muted-foreground">
          Mỗi lần chạy là một kịch bản độc lập. Sau khi sửa C++, dừng server bằng Ctrl+C,
          build lại rồi khởi động lại.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {"npm run backend:build\nnpm run backend:start"}
        </pre>
      </div>
      {modules.isPending ? (
        <LoadingBlock rows={3} />
      ) : modules.isError ? (
        <ErrorState message={modules.error.message} onRetry={() => modules.refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="surface-card space-y-4 p-5">
            <div className="space-y-2">
              <Label htmlFor="cpp-member">Thành viên / module</Label>
              <select
                id="cpp-member"
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                value={selected?.id ?? ""}
                disabled={running}
                onChange={(event) => {
                  setMemberId(event.target.value);
                  setOutput("");
                  setInput("{}");
                }}
              >
                {modules.data.map((module) => (
                  <option key={module.id} value={module.id}>{module.name} — {module.task}</option>
                ))}
              </select>
              <p className="break-all font-mono text-xs text-muted-foreground">{selected?.entry}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpp-input">Đầu vào JSON</Label>
              <Textarea
                id="cpp-input"
                className="min-h-52 font-mono text-sm"
                value={input}
                disabled={running}
                onChange={(event) => setInput(event.target.value)}
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Mẫu đầu vào nằm trong huong_dan.md của từng thành viên.
              </p>
            </div>
            <Button onClick={run} disabled={running || !selected}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              {running ? "Đang chạy C++…" : "Chạy C++"}
            </Button>
          </section>
          <section className="surface-card space-y-3 p-5">
            <h2 className="text-base font-semibold">Phản hồi từ C++</h2>
            <pre
              className="min-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-4 text-xs"
              aria-live="polite"
              aria-busy={running}
            >
              {output || "Chưa chạy. Kết quả sẽ xuất hiện ở đây."}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
