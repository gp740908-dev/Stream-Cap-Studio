"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Calendar, Zap } from "lucide-react";
import Link from "next/link";
import { jobs as jobsApi, watermarks as watermarksApi } from "@/lib/api";
import type { WatermarkPreset } from "@/lib/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  stream_url: z.string().url("Must be a valid URL"),
  duration_minutes: z.coerce.number().min(1).max(720),
  resolution: z.enum(["1080p", "720p"]),
  fps: z.coerce.number().min(1).max(60),
  is_immediate: z.boolean(),
  scheduled_at: z.string().optional().nullable(),
  watermark_preset_id: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function NewJobPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      resolution: "1080p",
      fps: 30,
      duration_minutes: 60,
      is_immediate: true,
      watermark_preset_id: null,
    },
  });

  const isImmediate = watch("is_immediate");

  useEffect(() => {
    watermarksApi.list().then(setPresets).catch(() => {});
  }, []);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      const job = await jobsApi.create({
        title: values.title,
        stream_url: values.stream_url,
        duration_minutes: values.duration_minutes,
        resolution: values.resolution,
        fps: values.fps,
        is_immediate: values.is_immediate,
        scheduled_at: values.is_immediate ? null : values.scheduled_at ?? null,
        watermark_preset_id: values.watermark_preset_id ?? null,
      });
      router.push(`/jobs?highlight=${job.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
        <Link
          href="/jobs"
          className="p-1.5 rounded text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[15px] font-semibold text-[#e8e8e8]">New Recording Job</h1>
          <p className="text-[12px] text-[#555]">Configure and schedule a recording pipeline</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

          {/* ─── Job Details ────────────────────────────────────────────────── */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4">
            <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
              Job Details
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#888]">Job Title</label>
              <input
                {...register("title")}
                placeholder="e.g. Drama Stream — Episode 42"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#F59E0B] transition-colors"
              />
              {errors.title && (
                <p className="text-[11px] text-red-400">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#888]">Stream URL</label>
              <input
                {...register("stream_url")}
                placeholder="https://yoursite.com/live/stream"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] font-mono placeholder-[#444] focus:outline-none focus:border-[#F59E0B] transition-colors"
              />
              {errors.stream_url && (
                <p className="text-[11px] text-red-400">{errors.stream_url.message}</p>
              )}
            </div>
          </section>

          {/* ─── Recording Settings ──────────────────────────────────────────── */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4">
            <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
              Recording Settings
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[12px] text-[#888]">Duration (min)</label>
                <input
                  {...register("duration_minutes")}
                  type="number"
                  min={1}
                  max={720}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] font-mono text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
                {errors.duration_minutes && (
                  <p className="text-[11px] text-red-400">{errors.duration_minutes.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] text-[#888]">Resolution</label>
                <select
                  {...register("resolution")}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                >
                  <option value="1080p">1080p (8 Mbps)</option>
                  <option value="720p">720p (5 Mbps)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] text-[#888]">FPS</label>
                <select
                  {...register("fps")}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                >
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>
            </div>
          </section>

          {/* ─── Schedule ───────────────────────────────────────────────────── */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4">
            <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
              Schedule
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("is_immediate", true)}
                className={`flex items-center gap-2 p-3 rounded border transition-colors ${
                  isImmediate
                    ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#3a3a3a] hover:text-[#888]"
                }`}
              >
                <Zap className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-[12px] font-medium">Start Immediately</p>
                  <p className="text-[10px] opacity-70">Dispatch to worker now</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue("is_immediate", false)}
                className={`flex items-center gap-2 p-3 rounded border transition-colors ${
                  !isImmediate
                    ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#3a3a3a] hover:text-[#888]"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <div className="text-left">
                  <p className="text-[12px] font-medium">Schedule</p>
                  <p className="text-[10px] opacity-70">Set a future date/time</p>
                </div>
              </button>
            </div>

            {!isImmediate && (
              <div className="space-y-1.5">
                <label className="block text-[12px] text-[#888]">Start Date & Time (UTC)</label>
                <input
                  {...register("scheduled_at")}
                  type="datetime-local"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] font-mono text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
              </div>
            )}
          </section>

          {/* ─── Watermark ──────────────────────────────────────────────────── */}
          <section className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
              <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider">
                Watermark Preset
              </h2>
              <Link
                href="/watermarks"
                className="text-[11px] text-[#F59E0B] hover:text-[#D97706] transition-colors"
              >
                Manage presets →
              </Link>
            </div>

            {presets.length === 0 ? (
              <p className="text-[12px] text-[#555]">
                No watermark presets configured.{" "}
                <Link href="/watermarks" className="text-[#F59E0B] hover:underline">
                  Upload one →
                </Link>
              </p>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-[12px] text-[#888]">Select Preset</label>
                <select
                  {...register("watermark_preset_id")}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-[13px] text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                >
                  <option value="">None — no watermark</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_default ? "(default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* ─── Submit ─────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-black text-[13px] font-medium rounded transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isImmediate ? "Start Recording" : "Schedule Job"}
            </button>
            <Link
              href="/jobs"
              className="px-5 py-2.5 text-[13px] text-[#555] hover:text-[#888] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
