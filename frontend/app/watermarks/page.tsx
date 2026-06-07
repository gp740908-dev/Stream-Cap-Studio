"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Star, Eye, Loader2 } from "lucide-react";
import { watermarks as watermarksApi } from "@/lib/api";
import type { WatermarkPreset, WatermarkPosition } from "@/lib/types";

const POSITION_GRID: WatermarkPosition[] = [
  "top-left",    "top-center",    "top-right",
  "middle-left", "center",        "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

function PositionGrid({
  value,
  onChange,
}: {
  value: WatermarkPosition;
  onChange: (pos: WatermarkPosition) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 w-24">
      {POSITION_GRID.map((pos) => (
        <button
          key={pos}
          type="button"
          onClick={() => onChange(pos)}
          className={`w-7 h-7 rounded transition-colors ${
            value === pos
              ? "bg-[#F59E0B]"
              : "bg-[#2a2a2a] hover:bg-[#3a3a3a]"
          }`}
          title={pos}
        />
      ))}
    </div>
  );
}

export default function WatermarksPage() {
  const [presets, setPresets] = useState<WatermarkPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // New preset form state
  const [form, setForm] = useState({
    name: "",
    position: "bottom-right" as WatermarkPosition,
    opacity: 0.8,
    size_percent: 15,
    margin_px: 20,
    is_default: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPresets = async () => {
    setLoading(true);
    try {
      setPresets(await watermarksApi.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPresets(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setFormError("Please select a PNG file");
    if (!form.name.trim()) return setFormError("Name is required");
    setFormError(null);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", form.name);
    fd.append("position", form.position);
    fd.append("opacity", String(form.opacity));
    fd.append("size_percent", String(form.size_percent));
    fd.append("margin_px", String(form.margin_px));
    fd.append("is_default", String(form.is_default));

    try {
      await watermarksApi.create(fd);
      setForm({ name: "", position: "bottom-right", opacity: 0.8, size_percent: 15, margin_px: 20, is_default: false });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchPresets();
    } catch (err: any) {
      setFormError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete preset "${name}"?`)) return;
    await watermarksApi.delete(id);
    fetchPresets();
  };

  const handleSetDefault = async (id: string) => {
    await watermarksApi.update(id, { is_default: true });
    fetchPresets();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-4 border-b border-[#1f1f1f]">
        <h1 className="text-[15px] font-semibold text-[#e8e8e8]">Watermark Presets</h1>
        <p className="text-[12px] text-[#555]">Upload PNG logos and configure overlay positioning</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-5 gap-6">
          {/* ─── Upload Form ──────────────────────────────────────────────── */}
          <div className="col-span-2">
            <form
              onSubmit={handleUpload}
              className="bg-[#111] border border-[#1f1f1f] rounded p-5 space-y-4 sticky top-0"
            >
              <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
                New Preset
              </h2>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-[11px] text-red-400">
                  {formError}
                </div>
              )}

              {/* File drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#2a2a2a] hover:border-[#F59E0B]/50 rounded p-4 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-[#444] mx-auto mb-2" />
                {file ? (
                  <p className="text-[12px] text-[#F59E0B] font-mono">{file.name}</p>
                ) : (
                  <>
                    <p className="text-[12px] text-[#555]">Click to upload PNG</p>
                    <p className="text-[10px] text-[#444] mt-0.5">Transparent PNG, max 5MB</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[11px] text-[#888]">Preset Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Corner Logo"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-[12px] text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
              </div>

              {/* Position grid */}
              <div className="space-y-2">
                <label className="block text-[11px] text-[#888]">
                  Position — <span className="text-[#F59E0B] font-mono">{form.position}</span>
                </label>
                <PositionGrid
                  value={form.position}
                  onChange={(pos) => setForm({ ...form, position: pos })}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] text-[#888]">Opacity</label>
                  <span className="text-[11px] font-mono text-[#F59E0B]">
                    {Math.round(form.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.opacity}
                  onChange={(e) => setForm({ ...form, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-[#F59E0B]"
                />
              </div>

              {/* Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[11px] text-[#888]">Size (% of video width)</label>
                  <span className="text-[11px] font-mono text-[#F59E0B]">{form.size_percent}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={form.size_percent}
                  onChange={(e) => setForm({ ...form, size_percent: Number(e.target.value) })}
                  className="w-full accent-[#F59E0B]"
                />
              </div>

              {/* Margin */}
              <div className="space-y-1">
                <label className="block text-[11px] text-[#888]">Margin (px from edge)</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={form.margin_px}
                  onChange={(e) => setForm({ ...form, margin_px: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-1.5 text-[12px] font-mono text-[#e8e8e8] focus:outline-none focus:border-[#F59E0B] transition-colors"
                />
              </div>

              {/* Default */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="accent-[#F59E0B]"
                />
                <span className="text-[12px] text-[#888]">Set as default preset</span>
              </label>

              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-black text-[13px] font-medium rounded transition-colors"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Preset
              </button>
            </form>
          </div>

          {/* ─── Preset List ──────────────────────────────────────────────── */}
          <div className="col-span-3 space-y-3">
            {loading ? (
              <div className="text-[12px] text-[#555] font-mono">Loading…</div>
            ) : presets.length === 0 ? (
              <div className="bg-[#111] border border-[#1f1f1f] rounded p-8 text-center">
                <p className="text-[13px] text-[#555]">No watermark presets yet</p>
                <p className="text-[11px] text-[#444] mt-1">Upload a transparent PNG to get started</p>
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-[#111] border border-[#1f1f1f] rounded p-4 flex items-center gap-4 hover:border-[#2a2a2a] transition-colors"
                >
                  {/* Preview thumbnail */}
                  <button
                    onClick={() => {
                      setPreviewId(preset.id);
                      setPreviewLoading(true);
                    }}
                    className="w-20 h-12 bg-[#1a1a1a] rounded border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden hover:border-[#F59E0B]/50 transition-colors group"
                    title="Preview"
                  >
                    {previewId === preset.id ? (
                      <img
                        src={watermarksApi.previewUrl(preset.id)}
                        alt="preview"
                        className="w-full h-full object-cover"
                        onLoad={() => setPreviewLoading(false)}
                      />
                    ) : (
                      <Eye className="w-4 h-4 text-[#444] group-hover:text-[#888]" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-[#e8e8e8]">{preset.name}</p>
                      {preset.is_default && (
                        <span className="text-[10px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono text-[#555]">{preset.position}</span>
                      <span className="text-[10px] font-mono text-[#555]">
                        {Math.round(preset.opacity * 100)}% opacity
                      </span>
                      <span className="text-[10px] font-mono text-[#555]">
                        {preset.size_percent}% size
                      </span>
                      <span className="text-[10px] font-mono text-[#555]">
                        {preset.margin_px}px margin
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!preset.is_default && (
                      <button
                        onClick={() => handleSetDefault(preset.id)}
                        className="p-1.5 rounded text-[#555] hover:text-[#F59E0B] hover:bg-[#1a1a1a] transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(preset.id, preset.name)}
                      className="p-1.5 rounded text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Preview Modal ────────────────────────────────────────────── */}
        {previewId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setPreviewId(null)}
          >
            <div className="max-w-3xl w-full mx-4">
              <img
                src={watermarksApi.previewUrl(previewId)}
                alt="Watermark preview"
                className="w-full rounded border border-[#2a2a2a]"
                onClick={(e) => e.stopPropagation()}
              />
              <p className="text-center text-[11px] text-[#555] mt-2 font-mono">
                Click anywhere to close
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
