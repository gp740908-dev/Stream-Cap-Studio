"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  HardDrive,
  Cpu,
  MemoryStick,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { jobs as jobsApi, system as systemApi } from "@/lib/api";
import { formatBytes, formatDuration, formatRelative, getElapsed } from "@/lib/utils";
import type { Job, SystemResources, JobStatus } from "@/lib/types";

// ─── Resource Bar ─────────────────────────────────────────────────────────────
function ResourceBar({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  const color = warning
    ? "bg-red-500"
    : value > 70
    ? "bg-amber-500"
    : "bg-[#F59E0B]";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-[#888] uppercase tracking-wider">{label}</span>
        <span className="text-[11px] font-mono text-[#e8e8e8]">{detail}</span>
      </div>
      <div className="h-[3px] rounded-full bg-[#1f1f1f] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <div className="text-[10px] font-mono text-[#444]">{value.toFixed(1)}%</div>
    </div>
  );
}

// ─── Job Card (active jobs) ───────────────────────────────────────────────────
function ActiveJobCard({ job }: { job: Job }) {
  const [elapsed, setElapsed] = useState(getElapsed(job.started_at));

  useEffect(() => {
    if (job.status !== "recording" && job.status !== "processing") return;
    const id = setInterval(() => setElapsed(getElapsed(job.started_at)), 1000);
    return () => clearInterval(id);
  }, [job.started_at, job.status]);

  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded p-4 space-y-3 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#e8e8e8] truncate">{job.title}</p>
          <p className="text-[11px] text-[#555] font-mono truncate mt-0.5">{job.stream_url}</p>
        </div>
        <StatusBadge status={job.status} className="flex-shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Elapsed</p>
          <p className="text-[13px] font-mono text-[#F59E0B]">{elapsed}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Resolution</p>
          <p className="text-[13px] font-mono text-[#e8e8e8]">{job.resolution}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">FPS</p>
          <p className="text-[13px] font-mono text-[#e8e8e8]">{job.fps}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-[#555] uppercase tracking-wider">{label}</p>
        <Icon
          className={`w-4 h-4 ${accent ? "text-[#F59E0B]" : "text-[#333]"}`}
          strokeWidth={1.5}
        />
      </div>
      <p className={`text-2xl font-mono font-semibold ${accent ? "text-[#F59E0B]" : "text-[#e8e8e8]"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Recent Job Row ───────────────────────────────────────────────────────────
function RecentJobRow({ job }: { job: Job }) {
  return (
    <Link href={`/jobs?id=${job.id}`} className="block hover:bg-[#1a1a1a] transition-colors">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#1a1a1a] last:border-0">
        <StatusBadge status={job.status} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[#e8e8e8] truncate">{job.title}</p>
          <p className="text-[11px] text-[#555] font-mono">{formatRelative(job.created_at)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[12px] font-mono text-[#888]">{job.resolution}</p>
          {job.file_size_bytes && (
            <p className="text-[11px] text-[#555] font-mono">{formatBytes(job.file_size_bytes)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ total: 0, done: 0, failed: 0, queued: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [resourceData, allJobsData, activeData] = await Promise.all([
        systemApi.resources(),
        jobsApi.list({ page: 1 }),
        jobsApi.list({ status: "recording" }),
      ]);

      setResources(resourceData);
      setRecentJobs(allJobsData.jobs.slice(0, 10));

      const processingData = await jobsApi.list({ status: "processing" });
      const queuedData = await jobsApi.list({ status: "queued" });

      setActiveJobs([...activeData.jobs, ...processingData.jobs]);

      // Count stats from all jobs
      const doneData = await jobsApi.list({ status: "done" });
      const failedData = await jobsApi.list({ status: "failed" });
      setStats({
        total: allJobsData.total,
        done: doneData.total,
        failed: failedData.total,
        queued: queuedData.total,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for live updates
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  // SSE for real-time active job updates
  useEffect(() => {
    const token = localStorage.getItem("streamcap_token");
    if (!token) return;

    const url = `${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/jobs/stream/status`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          // Merge with existing active jobs
          setActiveJobs((prev) => {
            const map = new Map(prev.map((j) => [j.id, j]));
            data.forEach((j: Partial<Job>) => {
              if (j.id) map.set(j.id, { ...map.get(j.id)!, ...j } as Job);
            });
            return Array.from(map.values());
          });
        }
      } catch {}
    };

    return () => es.close();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ─── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
        <div>
          <h1 className="text-[15px] font-semibold text-[#e8e8e8]">Dashboard</h1>
          <p className="text-[12px] text-[#555]">Pipeline overview and system status</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 rounded text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/jobs/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-black text-[13px] font-medium rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Job
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-[12px] text-[#555] font-mono">Loading...</div>
          </div>
        ) : (
          <>
            {/* ─── Stats row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total Jobs" value={stats.total} icon={Activity} />
              <StatCard label="Active" value={activeJobs.length} icon={Activity} accent />
              <StatCard label="Completed" value={stats.done} icon={CheckCircle2} />
              <StatCard label="Failed" value={stats.failed} icon={XCircle} />
            </div>

            {/* ─── Active Jobs ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider">
                  Active Jobs
                </h2>
                {activeJobs.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              {activeJobs.length === 0 ? (
                <div className="bg-[#111] border border-[#1f1f1f] rounded p-8 text-center">
                  <p className="text-[13px] text-[#555]">No active recordings</p>
                  <Link
                    href="/jobs/new"
                    className="inline-flex items-center gap-1 mt-2 text-[12px] text-[#F59E0B] hover:text-[#D97706] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Schedule a recording
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeJobs.map((job) => (
                    <ActiveJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </div>

            {/* ─── Bottom: System Resources + Recent Jobs ──────────────────── */}
            <div className="grid grid-cols-3 gap-6">
              {/* System Resources */}
              <div className="bg-[#111] border border-[#1f1f1f] rounded p-4 space-y-4">
                <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider">
                  System
                </h2>
                {resources ? (
                  <>
                    <ResourceBar
                      label="CPU"
                      value={resources.cpu_percent}
                      detail={`${resources.cpu_percent.toFixed(1)}%`}
                    />
                    <ResourceBar
                      label="RAM"
                      value={resources.ram_percent}
                      detail={`${resources.ram_used_gb} / ${resources.ram_total_gb} GB`}
                    />
                    <ResourceBar
                      label="Disk"
                      value={resources.disk_percent}
                      detail={`${resources.disk_used_gb} / ${resources.disk_total_gb} GB`}
                      warning={resources.disk_warning}
                    />
                    {resources.disk_warning && (
                      <div className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1.5">
                        ⚠ Disk usage above 80%
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12px] text-[#555] font-mono">Unavailable</div>
                )}
              </div>

              {/* Recent Jobs */}
              <div className="col-span-2 bg-[#111] border border-[#1f1f1f] rounded overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
                  <h2 className="text-[12px] font-medium text-[#888] uppercase tracking-wider">
                    Recent Jobs
                  </h2>
                  <Link
                    href="/jobs"
                    className="text-[11px] text-[#555] hover:text-[#F59E0B] transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                {recentJobs.length === 0 ? (
                  <div className="p-8 text-center text-[13px] text-[#555]">No jobs yet</div>
                ) : (
                  recentJobs.map((job) => <RecentJobRow key={job.id} job={job} />)
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
