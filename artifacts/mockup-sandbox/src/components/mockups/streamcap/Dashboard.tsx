import { useState, useEffect } from "react";

const jobs = [
  { id: "JOB-001", title: "NBA Finals Stream", url: "https://twitch.tv/nba", status: "recording", duration: "01:23:45", size: "2.1 GB", started: "14:00" },
  { id: "JOB-002", title: "Valorant Championship", url: "https://youtube.com/live/xyz", status: "processing", duration: "00:45:10", size: "890 MB", started: "13:15" },
  { id: "JOB-003", title: "TechTalk Podcast", url: "https://twitch.tv/techtalk", status: "queued", duration: "—", size: "—", started: "15:00" },
];

const history = [
  { id: "JOB-000", title: "F1 Monaco Race", status: "done", duration: "02:15:00", size: "4.2 GB", date: "Jun 6" },
  { id: "JOB-099", title: "CS2 Major Finals", status: "done", duration: "03:10:22", size: "6.1 GB", date: "Jun 5" },
  { id: "JOB-098", title: "Stream Test", status: "failed", duration: "00:00:12", size: "—", date: "Jun 5" },
];

const statusColor: Record<string, string> = {
  recording: "text-red-400 bg-red-400/10",
  processing: "text-amber-400 bg-amber-400/10",
  queued: "text-blue-400 bg-blue-400/10",
  done: "text-emerald-400 bg-emerald-400/10",
  failed: "text-red-500 bg-red-500/10",
};

const statusDot: Record<string, string> = {
  recording: "bg-red-400 animate-pulse",
  processing: "bg-amber-400 animate-pulse",
  queued: "bg-blue-400",
  done: "bg-emerald-400",
  failed: "bg-red-500",
};

function Sidebar({ active }: { active: string }) {
  const nav = [
    { label: "Dashboard", icon: "⬡" },
    { label: "Jobs", icon: "▷" },
    { label: "Watermarks", icon: "◈" },
    { label: "Settings", icon: "⚙" },
  ];
  return (
    <div className="w-56 min-h-screen bg-[#111111] border-r border-white/[0.06] flex flex-col">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-500 flex items-center justify-center text-black text-xs font-bold">SC</div>
          <span className="text-white font-semibold text-sm tracking-tight">StreamCap</span>
          <span className="ml-auto text-[10px] text-white/30 font-mono">v1.0</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
              item.label === active
                ? "bg-amber-500/10 text-amber-400"
                : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
            }`}
          >
            <span className="text-base w-4 text-center">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/50">A</div>
          <span className="text-xs text-white/40 font-mono">admin</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[11px] text-white/30 uppercase tracking-widest">{label}</span>
      <span className={`text-2xl font-bold font-mono ${accent ? "text-amber-400" : "text-white"}`}>{value}</span>
      <span className="text-[11px] text-white/30">{sub}</span>
    </div>
  );
}

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-white/30 w-8">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-mono text-white/50 w-8 text-right">{value}%</span>
    </div>
  );
}

export function Dashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const cpu = 42 + Math.sin(tick * 0.3) * 8;
  const ram = 61 + Math.sin(tick * 0.2) * 4;
  const disk = 38;

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar active="Dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
          <div>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-white/30 mt-0.5">Live system overview</p>
          </div>
          <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <span>+</span> New Job
          </button>
        </div>

        <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Active" value="2" sub="recording / processing" accent />
            <StatCard label="Queued" value="1" sub="scheduled today" />
            <StatCard label="Completed" value="47" sub="last 30 days" />
            <StatCard label="Storage Used" value="128 GB" sub="of 500 GB allocated" />
          </div>

          {/* Active jobs + Resources */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-[#111111] border border-white/[0.06] rounded-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <span className="text-sm font-medium text-white/70">Active Jobs</span>
                <span className="text-xs text-white/20 font-mono">LIVE</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[job.status]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">{job.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${statusColor[job.status]}`}>{job.status}</span>
                      </div>
                      <span className="text-xs text-white/20 font-mono truncate block">{job.url}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-mono text-white/60">{job.duration}</div>
                      <div className="text-xs text-white/20">{job.size}</div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {job.status === "recording" && (
                        <button className="text-[11px] px-2 py-1 rounded bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">Stop</button>
                      )}
                      <button className="text-[11px] px-2 py-1 rounded bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">Logs</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <span className="text-sm font-medium text-white/70">System Resources</span>
              </div>
              <div className="px-5 py-4 space-y-5">
                <ResourceBar label="CPU" value={Math.round(cpu)} color="bg-amber-500" />
                <ResourceBar label="RAM" value={Math.round(ram)} color="bg-blue-400" />
                <ResourceBar label="Disk" value={disk} color="bg-emerald-400" />
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30">Network In</span>
                    <span className="font-mono text-white/50">12.4 MB/s</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30">Network Out</span>
                    <span className="font-mono text-white/50">0.8 MB/s</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30">Uptime</span>
                    <span className="font-mono text-white/50">3d 14h 22m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <span className="text-sm font-medium text-white/70">Recent Jobs</span>
              <button className="text-xs text-amber-500 hover:text-amber-400 transition-colors">View all →</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["ID", "Title", "Status", "Duration", "Size", "Date", ""].map((h) => (
                    <th key={h} className="text-[10px] text-white/20 font-normal uppercase tracking-widest text-left px-5 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-white/30">{job.id}</td>
                    <td className="px-5 py-3 text-sm text-white/70">{job.title}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${statusColor[job.status]}`}>{job.status}</span>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-white/40">{job.duration}</td>
                    <td className="px-5 py-3 text-xs font-mono text-white/40">{job.size}</td>
                    <td className="px-5 py-3 text-xs text-white/30">{job.date}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-[11px] text-amber-500/60 hover:text-amber-400 transition-colors">↓ Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
