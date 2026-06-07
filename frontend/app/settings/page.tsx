"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { settings as settingsApi } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4">
      <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-5 gap-4 items-start">
      <div className="col-span-2">
        <p className="text-[13px] text-[#e8e8e8]">{label}</p>
        {hint && <p className="text-[11px] text-[#555] mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-3">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setData).catch(() => {});
  }, []);

  const update = (field: keyof AppSettings, value: string | number | boolean) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await settingsApi.update(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await settingsApi.testTelegram();
      setTestResult({ ok: res.success, msg: res.message });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[12px] text-[#555] font-mono">Loading settings…</p>
      </div>
    );
  }

  const inputCls =
    "w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-[13px] text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors font-mono";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div>
          <h1 className="text-[15px] font-semibold text-[#e8e8e8]">Settings</h1>
          <p className="text-[12px] text-[#555]">Global pipeline configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-black text-[13px] font-medium rounded transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : null}
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl space-y-5">
        {/* ─── Telegram ───────────────────────────────────────────────────── */}
        <Section title="Telegram Notifications">
          <Field label="Bot Token" hint="From @BotFather">
            <input
              type="password"
              value={data.telegram_bot_token}
              onChange={(e) => update("telegram_bot_token", e.target.value)}
              placeholder="1234567890:ABCdef..."
              className={inputCls}
            />
          </Field>
          <Field label="Chat ID" hint="From @userinfobot">
            <input
              value={data.telegram_chat_id}
              onChange={(e) => update("telegram_chat_id", e.target.value)}
              placeholder="-1001234567890"
              className={inputCls}
            />
          </Field>
          <Field label="Test Connection">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestTelegram}
                disabled={testing || !data.telegram_bot_token || !data.telegram_chat_id}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#F59E0B]/50 disabled:opacity-40 text-[12px] text-[#888] rounded transition-colors"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send Test Message
              </button>
              {testResult && (
                <div
                  className={`flex items-center gap-1.5 text-[12px] ${
                    testResult.ok ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  {testResult.msg}
                </div>
              )}
            </div>
          </Field>
        </Section>

        {/* ─── Storage ────────────────────────────────────────────────────── */}
        <Section title="Storage">
          <Field label="Output Directory" hint="Absolute path where MP4 files are saved">
            <input
              value={data.output_dir}
              onChange={(e) => update("output_dir", e.target.value)}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* ─── Default Export Preset ──────────────────────────────────────── */}
        <Section title="Default Export Preset">
          <Field label="Resolution">
            <select
              value={data.default_resolution}
              onChange={(e) => update("default_resolution", e.target.value)}
              className={inputCls}
            >
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
            </select>
          </Field>
          <Field label="FPS">
            <select
              value={data.default_fps}
              onChange={(e) => update("default_fps", Number(e.target.value))}
              className={inputCls}
            >
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </Field>
          <Field label="Video Bitrate (1080p)" hint="YouTube recommends 8 Mbps">
            <input
              value={data.default_video_bitrate_1080p}
              onChange={(e) => update("default_video_bitrate_1080p", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Video Bitrate (720p)" hint="YouTube recommends 5 Mbps">
            <input
              value={data.default_video_bitrate_720p}
              onChange={(e) => update("default_video_bitrate_720p", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Audio Bitrate" hint="320k recommended for YouTube">
            <input
              value={data.default_audio_bitrate}
              onChange={(e) => update("default_audio_bitrate", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Audio Sample Rate" hint="48000 Hz (YouTube standard)">
            <input
              type="number"
              value={data.default_audio_sample_rate}
              onChange={(e) => update("default_audio_sample_rate", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* ─── Chrome / Playwright ────────────────────────────────────────── */}
        <Section title="Chrome / Playwright">
          <Field label="Viewport Width" hint="Virtual display width (px)">
            <input
              type="number"
              value={data.chrome_viewport_width}
              onChange={(e) => update("chrome_viewport_width", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Viewport Height" hint="Virtual display height (px)">
            <input
              type="number"
              value={data.chrome_viewport_height}
              onChange={(e) => update("chrome_viewport_height", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Pre-Record Delay (s)" hint="Seconds to wait after page load before starting capture">
            <input
              type="number"
              min={0}
              max={60}
              value={data.chrome_pre_record_delay}
              onChange={(e) => update("chrome_pre_record_delay", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="User Agent" hint="Browser user agent string">
            <textarea
              value={data.chrome_user_agent}
              onChange={(e) => update("chrome_user_agent", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}
