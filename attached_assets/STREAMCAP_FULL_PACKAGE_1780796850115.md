# 🎬 StreamCap Studio — Full Package
> Auto-recording pipeline untuk konten streaming milik sendiri: Record → Watermark → Notify → YouTube-ready

---

# BAGIAN 1 — MASTER PROMPT

```
You are an expert fullstack developer and automation engineer building StreamCap Studio — a self-hosted web dashboard for automated video recording, watermarking, and YouTube-ready export, designed to run on VPS/RDP (Ubuntu/Debian Linux).

Target users: Solo content creators and small media teams who own their own streaming website and need a fully automated pipeline: open Chrome to their stream URL → record → watermark → save → notify via Telegram → export YouTube-ready file. Zero manual intervention after scheduling.

Core purpose: Automate the full video production pipeline from scheduled recording to branded, export-ready MP4 output.

Tech stack:
- Backend: Python 3.11 + FastAPI (async REST API)
- Automation: Playwright (headless Chrome control) + Xvfb (virtual display on Linux VPS)
- Video: FFmpeg (screen capture, watermark overlay, H.264/AAC re-encode)
- Queue: Celery + Redis (background job processing, Celery Beat for scheduling)
- Database: PostgreSQL + SQLAlchemy + Alembic (job history, settings, watermark configs)
- Frontend: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- Notifications: python-telegram-bot v20 (async, sends text + thumbnail image)
- Auth: FastAPI JWT + NextAuth.js (credential-based, single user or small team)
- Storage: Local filesystem + optional MinIO (S3-compatible backup)
- Infrastructure: Docker Compose + Nginx reverse proxy

Build the following core features:
1. Dashboard — live job status cards, active recording timer, queue overview, system resource bar (CPU/RAM/Disk)
2. Job Scheduler — create job with: stream URL, start time (immediate or scheduled), duration, resolution (1080p/720p), FPS (30/60), watermark preset selection
3. Chrome Automation — Playwright opens URL in headless Chromium via Xvfb virtual display; FFmpeg captures display output with audio (PulseAudio virtual sink)
4. Watermark Engine — upload PNG (transparent), set position via 9-point grid UI, opacity slider, size (% of video width), margin (px); live preview on sample frame before saving preset
5. FFmpeg Processing Pipeline — apply watermark overlay → re-encode to H.264 (libx264) + AAC (libfdk_aac or aac) → output MP4 at YouTube spec: 8Mbps (1080p)/5Mbps (720p), keyframe every 2s, audio 320kbps 48kHz stereo
6. Telegram Notification — after job done or failed: send message with job name, status, duration, file size, output path, + attach first-frame thumbnail as image
7. Job History — searchable/filterable list of all jobs with status, metadata, log viewer, download link, delete option
8. Settings Panel — Telegram bot token + chat ID (with test button), default storage path, default watermark, default export preset, Chrome config (viewport, pre-record delay)

UI/UX direction: Dark utilitarian operator dashboard. Calm authority — like Vercel dashboard meets broadcast control room software. Font: Geist Mono for data/numbers + DM Sans for UI text. Single accent color: amber #F59E0B. No gradients, no illustrations, no decorations. Status is communicated through color and typography, not animation noise.

Start by scaffolding in this order:
1. `docker-compose.yml` — services: api, worker, beat, redis, db, frontend, nginx
2. `backend/main.py` — FastAPI app, routers, middleware
3. `backend/tasks/recorder.py` — Celery task: Playwright launch + Xvfb + FFmpeg capture
4. `backend/tasks/processor.py` — Celery task: FFmpeg watermark overlay + re-encode
5. `backend/services/telegram_service.py` — notification with thumbnail
6. `backend/models/` — SQLAlchemy models: Job, WatermarkPreset, Settings
7. `frontend/app/dashboard/page.tsx` — main dashboard with live status via SSE
8. `frontend/app/jobs/new/page.tsx` — new job form
9. `.env.example` — all required environment variables

Output clean, production-ready code with inline comments. All secrets via environment variables. No hardcoded credentials anywhere.
```

---

# BAGIAN 2 — FEATURE BREAKDOWN

## MVP Features (V1 — Core Pipeline)

- [ ] **Recording Engine** — Playwright buka URL di Chrome headless via Xvfb, FFmpeg capture display output ke file video 🔴
- [ ] **Job Scheduler (Immediate)** — Jalankan job rekaman sekarang dengan input URL + durasi 🟡
- [ ] **Job Scheduler (Terjadwal)** — Set waktu mulai spesifik, Celery Beat trigger otomatis 🔴
- [ ] **Watermark Overlay** — Upload PNG transparan, pilih posisi (9-point grid), opacity, ukuran, lalu FFmpeg overlay 🟡
- [ ] **FFmpeg Re-encode Pipeline** — Output H.264/AAC MP4 sesuai spesifikasi YouTube (bitrate, keyframe, audio 48kHz stereo) 🟡
- [ ] **Telegram Notification** — Kirim pesan + thumbnail ke Telegram saat job done atau failed 🟢
- [ ] **Job Status Dashboard** — Lihat semua job aktif, antrian, dan riwayat dengan status real-time via SSE 🟡
- [ ] **Job History & Log** — Detail lengkap per job: waktu, durasi, ukuran file, error log 🟢
- [ ] **Settings Panel** — Konfigurasi Telegram bot, storage path, default watermark, export preset 🟢
- [ ] **Auth (Single User)** — Login dengan username + password, JWT session di httpOnly cookie 🟢
- [ ] **Docker Compose Setup** — Satu perintah `docker-compose up` untuk jalankan seluruh sistem 🟡
- [ ] **Download File dari Dashboard** — Link download output MP4 langsung dari job history 🟢
- [ ] **System Resource Monitor** — Tampilkan CPU, RAM, disk usage di sidebar (via psutil) 🟢

## V2 Features

- [ ] **Upload Otomatis ke YouTube** — Integrasi YouTube Data API v3: upload file + judul, deskripsi, tag
- [ ] **Multi Watermark Preset** — Simpan beberapa watermark (intro, outro, corner logo), pilih per job
- [ ] **Auto Trim** — Deteksi dan potong silence/black screen di awal dan akhir video
- [ ] **Thumbnail Generator** — Generate thumbnail dari frame tertentu + overlay teks judul
- [ ] **Jadwal Berulang (Recurring)** — Job rekaman berulang: harian / mingguan / setiap N jam
- [ ] **Cloud Backup** — Sync output ke Google Drive / Backblaze B2 via rclone setelah selesai
- [ ] **Job Template** — Simpan kombinasi URL + settings sebagai template reusable
- [ ] **Disk Auto-Cleanup** — Hapus file lama otomatis jika disk >85%

## V3 / Nice to Have

- [ ] **Live Preview Recording** — Stream preview recording berjalan ke dashboard (HLS, resource heavy)
- [ ] **Multi-User dengan RBAC** — Admin tambah operator, permission per user
- [ ] **Chapter Marker Generator** — Tandai timestamp selama rekaman untuk YouTube chapters
- [ ] **Subtitle/Caption Overlay** — Tambahkan subtitle hardcoded dari file SRT ke video output
- [ ] **Mobile-Friendly Dashboard** — Optimasi untuk pantau dan trigger job dari HP
- [ ] **Webhook Outbound** — Trigger webhook ke Zapier/Make.com saat job selesai
- [ ] **Analytics Dashboard** — Statistik: total video/bulan, ukuran total, success rate

---

# BAGIAN 3 — PRD

## Product Requirements Document — StreamCap Studio

### 1. Overview
- **Product Name**: StreamCap Studio
- **Version**: 1.0
- **Type**: Self-hosted automation tool (VPS/RDP Linux)
- **Last Updated**: Juni 2026

### 2. Problem Statement
Content creator yang memiliki platform streaming sendiri menghadapi proses manual yang repetitif: membuka browser, menunggu stream berjalan, merekam layar, menambahkan watermark secara manual di video editor, lalu mengekspor ulang. Proses ini memakan 30–90 menit per video dan rentan human error.

StreamCap Studio menyelesaikan ini dengan pipeline otomatis penuh: jadwalkan → rekam → watermark → simpan → notifikasi, tanpa intervensi manual.

### 3. Goals & Success Metrics

| Goal | KPI | Target |
|------|-----|--------|
| Otomasi penuh pipeline recording | % job selesai tanpa intervensi | >95% |
| Output YouTube-ready | Video lolos upload YouTube tanpa re-encode ulang | 100% |
| Notifikasi real-time | Delay notifikasi Telegram setelah job selesai | <30 detik |
| Stabilitas di VPS | Uptime sistem | >99%/bulan |
| Kemudahan setup | Waktu dari clone repo ke job pertama | <30 menit |

### 4. User Personas

**Persona 1: Andi — Solo Content Creator**
- Role: Pemilik platform streaming drama/film indie, mengelola channel YouTube sendiri
- Pain Point: Harus standby menunggu stream, lalu proses manual watermark di video editor, membuang 2–3 jam/hari
- Goal: Set jadwal di malam hari, pagi dapat notifikasi Telegram bahwa video siap diupload

**Persona 2: Rini — Manager Konten Tim Kecil**
- Role: Mengelola 3–5 channel YouTube untuk studio konten kecil
- Pain Point: Koordinasi recording antar tim sering error, file hilang, watermark tidak konsisten
- Goal: Dashboard terpusat, watermark brand sudah tersimpan, output selalu konsisten

### 5. User Stories

- Sebagai creator, saya ingin menjadwalkan rekaman dari URL stream saya agar proses berjalan otomatis.
- Sebagai creator, saya ingin upload logo watermark dan atur posisi/opacity-nya agar setiap video punya branding konsisten.
- Sebagai creator, saya ingin notifikasi Telegram lengkap (thumbnail, ukuran file, durasi) agar tahu rekaman selesai.
- Sebagai creator, saya ingin melihat riwayat semua job beserta statusnya agar bisa mendeteksi error cepat.
- Sebagai creator, saya ingin output otomatis dalam format YouTube-ready agar tidak perlu re-encode ulang.

### 6. Functional Requirements

**F-01: Recording Engine**
- Playwright buka URL kustom di Chrome headless dengan Xvfb
- FFmpeg capture output virtual display
- Support resolusi 1080p dan 720p, FPS 30 dan 60
- Auto-stop setelah durasi ditentukan atau stream berakhir
- File sementara di `/tmp/streamcap/`, cleanup otomatis setelah diproses

**F-02: Watermark Engine**
- Upload PNG (max 5MB, transparan)
- 9-point position grid, opacity 0–100%, ukuran % dari lebar video, margin px
- Preview real-time sebelum simpan preset
- Simpan multiple watermark preset

**F-03: FFmpeg Processing Pipeline**
- Codec: H.264 (libx264) + AAC audio
- Bitrate: 8 Mbps (1080p) / 5 Mbps (720p)
- Keyframe interval: setiap 2 detik
- Audio: 320kbps, stereo, 48kHz
- Container: MP4
- Nama file otomatis: `[title]_[date]_[resolution].mp4`

**F-04: Job Scheduler**
- Input: URL, waktu mulai (immediate/terjadwal), durasi, resolusi, watermark preset
- Status flow: `queued` → `recording` → `processing` → `done` / `failed`
- Celery Beat trigger job terjadwal
- Retry otomatis jika gagal (max 2x)

**F-05: Telegram Notification**
- Konten: nama job, status, durasi, ukuran file, path output, thumbnail
- Notifikasi error: pesan readable (bukan raw traceback)
- Test notifikasi dari Settings panel

**F-06: Job History**
- Filter by: status, tanggal, keyword
- Detail: URL sumber, waktu mulai/selesai, file output, error log
- Download file output dari dashboard
- Hapus job + file terkait
- Retention: 90 hari

### 7. Non-Functional Requirements
- Performance: Job recording tidak pengaruhi responsivitas dashboard (isolated workers)
- Scalability: Support 1–5 concurrent jobs di VPS RAM 4GB+
- Reliability: Auto-restart Celery worker via Docker restart policy
- Storage: Warning dashboard jika disk >80%
- Compatibility: Ubuntu 20.04/22.04, Debian 11/12

### 8. Out of Scope (V1)
- Upload otomatis ke YouTube (masuk V2)
- Multi-user dengan permission berbeda
- Cloud recording
- Live preview rekaman berjalan

### 9. Timeline & Milestones

| Milestone | Deskripsi | Target | Status |
|-----------|-----------|--------|--------|
| M1 | Docker Compose, FastAPI, DB, Celery | Week 1 | 🔲 |
| M2 | Recording engine (Playwright + Xvfb + FFmpeg) | Week 2 | 🔲 |
| M3 | Watermark engine + FFmpeg re-encode | Week 3 | 🔲 |
| M4 | Telegram notification service | Week 3 | 🔲 |
| M5 | Frontend dashboard + job scheduler UI | Week 4–5 | 🔲 |
| M6 | Settings panel + history + download | Week 5 | 🔲 |
| M7 | End-to-end testing di VPS, bug fix | Week 6 | 🔲 |
| M8 | Dokumentasi + README + .env.example | Week 6 | 🔲 |

---

# BAGIAN 4 — TECH STACK

## Tech Stack Recommendation

> Tipe App: **Automation Tool + Dashboard** di VPS/RDP Linux. Real-time job monitoring, bukan web SaaS publik.

| Layer | Technology | Alasan |
|-------|-----------|--------|
| **Frontend** | Next.js 14 + TypeScript | App Router, SSR, type-safe, ideal untuk dashboard real-time |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first, komponen siap, mudah dikustomisasi |
| **State / Real-time** | Zustand + SWR + SSE | Polling job status ringan tanpa WebSocket overhead |
| **Backend API** | FastAPI (Python 3.11) | Async, cepat, integrasi FFmpeg & Celery mulus |
| **Task Queue** | Celery + Redis | Recording & processing di background worker terisolasi |
| **Scheduler** | Celery Beat | Trigger job terjadwal (cron-like) |
| **Video Capture** | Xvfb + Playwright + FFmpeg | Virtual display Linux, headless Chrome, capture via FFmpeg |
| **Video Processing** | FFmpeg | Watermark overlay, re-encode H.264/AAC, YouTube-spec output |
| **Database** | PostgreSQL + SQLAlchemy + Alembic | Job history, watermark configs, settings |
| **Auth** | FastAPI JWT + NextAuth.js | Single-user, credential login, httpOnly cookie |
| **Notifications** | python-telegram-bot v20 | Async Telegram Bot API, teks + gambar thumbnail |
| **Storage** | Local filesystem + optional MinIO | Output video lokal di VPS, MinIO untuk backup S3-compatible |
| **Containerization** | Docker Compose | Isolasi service: API + Worker + Redis + DB + Frontend |
| **Reverse Proxy** | Nginx | Serve frontend + proxy ke FastAPI, SSL termination |
| **Monitoring** | Flower (Celery) + psutil | Monitor Celery tasks + resource VPS |

### Alternatif Stack
- RAM VPS < 2GB → ganti PostgreSQL ke SQLite
- Tidak mau Docker → install manual + Supervisor untuk process management
- Butuh backup cloud → tambahkan rclone ke Google Drive / Backblaze B2
- Butuh multi-worker → scale Celery dengan `--concurrency=N`

### Python Dependencies Utama
```
fastapi, uvicorn, celery[redis], playwright, ffmpeg-python,
sqlalchemy, alembic, psycopg2-binary, python-telegram-bot,
python-dotenv, pillow, pydantic-settings, psutil, slowapi
```

### Node.js Dependencies Utama
```
next, react, typescript, tailwindcss, @shadcn/ui,
zustand, swr, lucide-react, date-fns, axios
```

---

# BAGIAN 5 — SECURITY SYSTEM

## Security Checklist

### Authentication & Authorization
- [ ] JWT token expiry 8 jam, refresh token di httpOnly cookie (bukan localStorage)
- [ ] Password hashing: bcrypt work factor 12
- [ ] Rate limiting login: max 5 attempt / 15 menit per IP (slowapi)
- [ ] IP allowlist opsional — whitelist IP yang boleh akses dashboard
- [ ] Single-user default; RBAC (admin/operator) di V2

### API Security
- [ ] Semua endpoint dilindungi JWT middleware
- [ ] Validasi input dengan Pydantic v2 (FastAPI native)
- [ ] CORS hanya izinkan origin frontend sendiri (bukan wildcard `*`)
- [ ] Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] Request size limit: max 10MB untuk upload watermark PNG

### Data Protection
- [ ] Semua secret di `.env` — tidak ada hardcode di kode
- [ ] `.env` di `.gitignore`, tidak pernah di-commit
- [ ] Telegram Bot Token dienkripsi di database (AES-256)
- [ ] Log tidak menyimpan URL stream yang sensitif (auto-masking)
- [ ] File output hanya bisa diakses via auth-protected download endpoint

### Infrastructure Security
- [ ] Docker network terisolasi — Redis & PostgreSQL tidak expose port ke publik
- [ ] Hanya port 80/443 (Nginx) yang expose ke internet
- [ ] UFW firewall: block semua kecuali SSH (22), HTTP (80), HTTPS (443)
- [ ] SSH hanya key-based auth (disable password login)
- [ ] Nginx rate limiting: 30 req/menit per IP untuk API endpoint
- [ ] Disk monitoring — alert jika >80% (cegah VPS penuh dan crash recording)
- [ ] Auto-cleanup file sementara di `/tmp/streamcap/` setelah job selesai

### Dependency & Container Security
- [ ] `pip audit` dan `npm audit` sebelum deploy
- [ ] Pin versi dependency di `requirements.txt` dan `package-lock.json`
- [ ] Gunakan official Docker images (python:3.11-slim, node:20-alpine)
- [ ] Celery worker berjalan dalam Docker container terisolasi
- [ ] Backup database otomatis harian via cron di dalam Docker

---

# BAGIAN 6 — UI/UX DIRECTION

## Design Philosophy
StreamCap Studio harus terasa seperti **control room yang tenang tapi powerful** — bukan consumer app yang colorful, bukan terminal yang intimidating. Operator yang membuka dashboard ini butuh confidence bahwa semua job berjalan, bukan distraksi visual.

Kata kuncinya: **calm authority**. Seperti Vercel dashboard bertemu software broadcast profesional.

---

## Visual Language

**Style**: Dark utilitarian editorial — solid panel, zero decoration, maximum clarity.

**Typography**:
- Data & Numbers: **Geist Mono** (status, counter, timer, file size, timestamp)
- UI Text & Label: **DM Sans** (navigasi, heading, form label)
- Body size: 14px, line-height 1.6
- Page title: 28px DM Sans Bold — kontras dramatis vs. metadata 12px Geist Mono

**Color Palette**:
```
Background:   #0D0D0D   (hampir hitam)
Surface:      #161616   (card, panel)
Surface-2:    #1E1E1E   (input, dropdown, hover)
Border:       #2A2A2A   (1px subtle separator)
Primary:      #F59E0B   (amber — satu-satunya accent warna)
Success:      #22C55E   (job done, status online)
Error:        #EF4444   (job failed, error)
Text:         #F0F0F0   (primary text)
Text-muted:   #6B7280   (metadata, timestamp, placeholder)
```

**Spacing**: 8px base grid. Panel padding: 24px. Card gap: 16px. Section gap: 40px.

**Border**: 1px solid #2A2A2A. Radius: 8px card, 6px button, 4px badge.

**Shadows**: Tidak ada drop shadow. Border saja yang memisahkan elemen. Shadow hanya untuk modal overlay.

---

## Layout Architecture

```
┌────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)          │  MAIN CONTENT              │
│  ─────────────────────    │  ─────────────────────     │
│  ⬡ StreamCap Studio       │  [Page Title]    [+ New]   │
│  ─────────────────────    │  ─────────────────────     │
│  Dashboard                │                            │
│  New Job                  │  Content Area              │
│  Job History              │  (Grid / List / Form)      │
│  Watermark Presets        │                            │
│  Settings                 │                            │
│                           │                            │
│  ─────────────────────    │                            │
│  SYSTEM STATUS            │                            │
│  CPU  [████░░░░] 42%      │                            │
│  RAM  [██████░░] 61%      │                            │
│  Disk [███░░░░░] 38%      │                            │
└────────────────────────────────────────────────────────┘
```

---

## Komponen Kritis

**Status Badge**:
```
queued     → border: #F59E0B  bg: #F59E0B1A  text: #F59E0B
recording  → border: #22C55E  bg: #22C55E1A  + dot blink green
processing → border: #3B82F6  bg: #3B82F61A  + progress bar
done       → border: #22C55E  bg: #22C55E1A  icon: ✓
failed     → border: #EF4444  bg: #EF44441A  icon: ✕
```

**Job Card**:
- Background: `#161616`, border: `1px solid #2A2A2A`
- Thumbnail 16:9 di kiri (80×45px, grayscale jika belum selesai)
- Title + URL sumber di kanan
- Status badge pojok kanan atas
- Metadata row bawah (Geist Mono, 12px, muted): `durasi | ukuran file | waktu selesai`

**Recording Progress** (saat aktif):
- Progress bar horizontal 2px, warna amber, pulse animation
- Di bawah: timer Geist Mono `Recording: 00:12:34`
- Tidak ada spinner

**Tombol**:
- Primary CTA (Start Job, Save): `bg-amber-500 text-black font-semibold` — satu-satunya filled button
- Secondary (Edit, Detail): ghost, `border border-[#2A2A2A] hover:border-amber-500/50`
- Destructive (Delete): ghost, `hover:border-red-500/50 hover:text-red-400`

**Form (New Job / Settings)**:
- Label selalu di atas input (bukan placeholder-only)
- Input style: `bg-[#1E1E1E] border border-[#2A2A2A] focus:border-amber-500`
- Grouping dengan section title + divider

**Watermark Preview Panel**:
- Canvas 16:9, background abu gelap dengan sample frame
- Watermark muncul real-time saat ubah posisi/opacity/ukuran
- 9-point grid sebagai dot selector visual (bukan dropdown)

---

## Motion & Interaction

- **Page transition**: fade 150ms — tidak ada slide atau bounce
- **Job card masuk baru**: `translate-y-4 opacity-0` → `translate-y-0 opacity-100`, stagger 50ms
- **Status update**: color transition 300ms saja
- **Recording timer**: update setiap detik, angka flip subtle via CSS
- **Hover card**: border `#2A2A2A` → `#3A3A3A`, sangat subtle
- **Loading state**: skeleton dengan shape persis konten asli, bukan spinner

---

## Referensi Desain
- **Linear.app** — navigasi sidebar, density informasi, accent tunggal di dark background
- **Vercel Dashboard** — kejernihan data status, typographic precision, zero decoration
- **Coolify** — self-hosted tool untuk developer/creator, dark utilitarian, closest context
