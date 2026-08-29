# AlgoStock Ops — HCM-UTE

Giao diện quản lý kho và xử lý đơn hàng thương mại điện tử cho đồ án Cấu trúc
Dữ liệu và Giải thuật tại Đại học Công nghệ Kỹ Thuật TP.HCM (HCM-UTE).

## Công nghệ

- React 19 + TypeScript + Vite
- TanStack Router + TanStack Query
- Tailwind CSS + shadcn/ui
- Recharts

## Chạy dự án

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Ứng dụng hiện sử dụng dữ liệu demo thông qua `src/services/mockApiAdapter.ts`.
Khi core DSA có REST API, thay adapter này và giữ nguyên service contract.
