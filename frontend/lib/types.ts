// StreamCap Studio — Shared TypeScript Types

export type JobStatus = "queued" | "recording" | "processing" | "done" | "failed" | "cancelled";

export interface Job {
  id: string;
  title: string;
  stream_url: string;
  scheduled_at: string | null;
  duration_minutes: number;
  resolution: "1080p" | "720p";
  fps: number;
  is_immediate: boolean;
  watermark_preset_id: string | null;
  status: JobStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  output_path: string | null;
  file_size_bytes: number | null;
  actual_duration_seconds: number | null;
  error_message: string | null;
  celery_task_id: string | null;
  retry_count: number;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
}

export interface WatermarkPreset {
  id: string;
  name: string;
  file_name: string;
  file_path: string;
  position: WatermarkPosition;
  opacity: number;
  size_percent: number;
  margin_px: number;
  is_default: boolean;
  created_at: string;
}

export type WatermarkPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface AppSettings {
  telegram_bot_token: string;
  telegram_chat_id: string;
  output_dir: string;
  default_watermark_preset_id: string | null;
  default_resolution: string;
  default_fps: number;
  default_video_bitrate_1080p: string;
  default_video_bitrate_720p: string;
  default_audio_bitrate: string;
  default_audio_sample_rate: number;
  chrome_viewport_width: number;
  chrome_viewport_height: number;
  chrome_pre_record_delay: number;
  chrome_user_agent: string;
}

export interface SystemResources {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_warning: boolean;
  active_jobs: number;
  queued_jobs: number;
}

export interface CreateJobPayload {
  title: string;
  stream_url: string;
  scheduled_at?: string | null;
  duration_minutes: number;
  resolution: "1080p" | "720p";
  fps: number;
  is_immediate: boolean;
  watermark_preset_id?: string | null;
}
