"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { jobs as jobsApi } from "@/lib/api";
import { formatBytes, formatDuration, formatDateTime } from "@/lib/utils";
import type { Job, JobStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "recording", label: "Recording" },
  { value: "processing", label: "Processing" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
];

function LogModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [log, setLog] = useState<string | null>(null);
  useEffect(() => {
    jobsApi.getLog(jobId).then((r) => setLog(r.log ?? "(no log)"));
  }, [jobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#111] border border-[#2a2a2a] rounded w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
          <h3 className="text-[13px] font-medium text-[#e8e8e8]">Job Log</h3>
          <button onClick={onClose} className="text-[#555] hover:text-[#888]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-[#888] whitespace-pre-wrap leading-relaxed">
          {log ?? "Loading…"}
        </pre>
      </div>
    </div>
  );
}

function JobsTable() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");

  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [logJobId, setLogJobId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await jobsApi.list({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
      });
      setJobsList(data.jobs);
      setTotal(data.total);
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter, search, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async (job: Job) => {
    if (!confirm(`Delete job "${job.title}"?`)) return;
    await jobsApi.delete(job.id, false);
    fetchJobs();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {logJobId && <LogModal jobId={logJobId} onClose={() => setLogJobId(null)} />}

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#1a1a1a]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs…"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded pl-8 pr-3 py-1.5 text-[12px] text-[#e8e8e8] placeholder-[#444] focus:outline-none focus:border-[#F59E0B] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                  : "text-[#555] hover:text-[#888] hover:bg-[#1a1a1a]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-[11px] text-[#555] font-mono">
          {total} job{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ─── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0d0d0d]">
            <tr>
              {["Status", "Title", "Resolution", "Duration", "Size", "Created", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-[10px] font-medium text-[#555] uppercase tracking-wider border-b border-[#1a1a1a]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[12px] text-[#555] font-mono">
                  Loading…
                </td>
              </tr>
            ) : jobsList.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <p className="text-[13px] text-[#555]">No jobs found</p>
                  <Link href="/jobs/new" className="inline-flex items-center gap-1 mt-2 text-[12px] text-[#F59E0B]">
                    <Plus className="w-3 h-3" /> New job
                  </Link>
                </td>
              </tr>
            ) : (
              jobsList.map((job) => (
                <tr
                  key={job.id}
                  className={`border-b border-[#111] hover:bg-[#111] transition-colors ${
                    job.id === highlight ? "bg-[#F59E0B]/5" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="text-[13px] text-[#e8e8e8] truncate">{job.title}</p>
                    <p className="text-[10px] text-[#444] font-mono truncate mt-0.5">
                      {job.stream_url}
                    </p>
                    {job.error_message && (
                      <p className="text-[10px] text-red-400 truncate mt-0.5">
                        ⚠ {job.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-[#888]">
                      {job.resolution} / {job.fps}fps
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-[#888]">
                      {formatDuration(job.actual_duration_seconds) !== "—"
                        ? formatDuration(job.actual_duration_seconds)
                        : `${job.duration_minutes}m`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-mono text-[#888]">
                      {formatBytes(job.file_size_bytes)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono text-[#666]">
                      {formatDateTime(job.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setLogJobId(job.id)}
                        className="p-1.5 rounded text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
                        title="View log"
                      >
                        <ScrollText className="w-3.5 h-3.5" />
                      </button>
                      {job.output_path && (
                        <a
                          href={jobsApi.downloadUrl(job.id)}
                          className="p-1.5 rounded text-[#555] hover:text-[#F59E0B] hover:bg-[#1a1a1a] transition-colors"
                          title="Download"
                          download
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(job)}
                        className="p-1.5 rounded text-[#555] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#1a1a1a]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-[#555] hover:text-[#888] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px] font-mono text-[#555]">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-[#555] hover:text-[#888] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

export default function JobsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div>
          <h1 className="text-[15px] font-semibold text-[#e8e8e8]">Job History</h1>
          <p className="text-[12px] text-[#555]">All recording jobs with status and logs</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-black text-[13px] font-medium rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Job
        </Link>
      </div>
      <Suspense>
        <JobsTable />
      </Suspense>
    </div>
  );
}
