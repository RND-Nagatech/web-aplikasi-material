# Phase 5 - Reliability & Observability

Tanggal eksekusi: 2026-04-22 (Asia/Jakarta)  
Scope: `be/`

## Objective
- Tingkatkan ketahanan service saat terjadi crash/error runtime.
- Sediakan endpoint observability dasar untuk monitoring operasional.
- Standarkan logging request/error agar mudah ditrace di production.

## Perubahan yang Diterapkan

### 1) Structured Logger Foundation
File baru:
- `be/src/utils/logger.ts`

Isi:
- Logger JSON terstruktur dengan level: `debug`, `info`, `warn`, `error`.
- Format log seragam (`ts`, `level`, `message`, `meta`) untuk ingest ke tool monitoring.
- `LOG_LEVEL=debug` didukung untuk debug observability saat investigasi.

### 2) Request Observability Middleware
File baru:
- `be/src/middlewares/observability.middleware.ts`

Isi:
- Hitung latency request menggunakan `process.hrtime()`.
- Catat metric per route + status code.
- Emit structured log per request (`request_id`, `method`, `path`, `status_code`, `duration_ms`).

### 3) Metrics Engine (In-memory)
File baru:
- `be/src/observability/metrics.ts`

Isi:
- Counter request per route (`count`).
- Counter error (`errors`, status >= 500).
- `avgMs` dan `p95Ms` dari sampel latency rolling.
- Snapshot metrics untuk endpoint `/metrics`.

### 4) Health & Readiness Endpoints
File update:
- `be/src/server.ts`

Endpoint baru:
- `GET /health` -> status service + uptime.
- `GET /health/live` -> liveness probe.
- `GET /health/ready` -> readiness probe (cek status koneksi MongoDB).
- `GET /metrics` -> metrics snapshot route-level.

### 5) Graceful Shutdown + Process Safety
File update:
- `be/src/server.ts`

Perbaikan:
- Handler `SIGINT` dan `SIGTERM` untuk shutdown bertahap.
- Tutup HTTP server dulu, lalu close koneksi MongoDB.
- Timeout shutdown via env `GRACEFUL_SHUTDOWN_TIMEOUT_MS`.
- Handler global:
  - `unhandledRejection`
  - `uncaughtException`
- Keduanya dicatat ke log terstruktur dan men-trigger shutdown aman.

### 6) DB Connection Reliability Cleanup
File update:
- `be/src/config/database.ts`

Perubahan:
- `connectDB()` tidak lagi `process.exit()` internal.
- Error dilempar ke bootstrap server agar alur startup failure lebih konsisten.

### 7) Typing Hardening untuk `res.locals`
File baru:
- `be/src/types/express.d.ts`

Perubahan:
- Tambah type declaration `Locals.requestId` agar akses request-id lebih aman dan konsisten.

### 8) Environment Variable Tambahan
File update:
- `be/.env.example`

Variable baru:
- `LOG_LEVEL=info`
- `GRACEFUL_SHUTDOWN_TIMEOUT_MS=10000`

## Validasi
Backend build sukses:

```bash
cd be
npm run build
```

## Cara Pakai Monitoring Dasar
- Cek readiness untuk reverse proxy/health checker:
  - `/health/ready`
- Cek traffic metrics cepat:
  - `/metrics`
- Correlate error dan request via `x-request-id` di log.

## Catatan Next (Phase 5.1)
- Tambahkan persistent metrics exporter (Prometheus/OpenTelemetry).
- Tambahkan error-rate alert dan latency SLO (p95/p99) per endpoint kritikal.
- Tambahkan audit log domain event untuk transaksi (create/update/payment).
