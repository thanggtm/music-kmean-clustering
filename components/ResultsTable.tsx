"use client";
import { useState } from "react";
import { Download, ChevronUp, ChevronDown } from "lucide-react";
import type { KMeansResult } from "@/lib/kmeans";
import { exportResultsToExcel } from "@/lib/parseExcel";

interface Props {
  result: KMeansResult;
}

const CLUSTER_COLORS = [
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-violet-500/20 text-violetald-300 border-violet-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "bg-red-500/20 text-red-300 border-red-500/30",
];

export default function ResultsTable({ result }: Props) {
  const [sortBy, setSortBy] = useState<"cluster" | "name" | "id">("cluster");
  const [asc, setAsc] = useState(true);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setAsc(!asc);
    else { setSortBy(col); setAsc(true); }
  };

  const sorted = [...result.assignments].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "cluster") cmp = a.cluster - b.cluster;
    else if (sortBy === "name") cmp = a.point.label.localeCompare(b.point.label);
    else cmp = String(a.point.id).localeCompare(String(b.point.id), undefined, { numeric: true });
    return asc ? cmp : -cmp;
  });

  const handleExport = () => {
    exportResultsToExcel(
      result.assignments.map((a) => a.point),
      result.assignments.map((a) => a.cluster),
      result.featureNames
    );
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <span className="w-3 h-3 opacity-0"><ChevronUp className="w-3 h-3" /></span>;

  // Cluster summary
  const k = result.clusterSizes.length;

  return (
    <div className="space-y-6">
      {/* Cluster summary cards */}
      <div className={`grid gap-3 grid-cols-2 ${k > 4 ? "sm:grid-cols-4" : `sm:grid-cols-${k}`}`}>
        {result.clusterSizes.map((size, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}`}
          >
            <p className="text-xs font-medium opacity-70 uppercase tracking-wide">Cluster {i + 1}</p>
            <p className="text-2xl font-bold mt-1">{size}</p>
            <p className="text-xs opacity-60 mt-0.5">
              {((size / result.assignments.length) * 100).toFixed(0)}% of items
            </p>
            <p className="text-xs opacity-60">
              SSE: {result.withinClusterSSE[i].toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Iterations info */}
      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span>
          Converged in{" "}
          <span className="text-white font-medium">{result.iterations.length}</span> iterations
        </span>
        <span className="text-zinc-600">·</span>
        <span>
          Total SSE:{" "}
          <span className="text-white font-medium">
            {result.withinClusterSSE.reduce((a, b) => a + b, 0).toFixed(3)}
          </span>
        </span>
        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export .xlsx
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/80">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-200 select-none"
                onClick={() => toggleSort("id")}
              >
                <span className="flex items-center gap-1"># <SortIcon col="id" /></span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-200 select-none"
                onClick={() => toggleSort("name")}
              >
                <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-zinc-200 select-none"
                onClick={() => toggleSort("cluster")}
              >
                <span className="flex items-center gap-1">Cluster <SortIcon col="cluster" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Dist. to Centroid
              </th>
              {result.featureNames.slice(0, 4).map((f) => (
                <th key={f} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const colorClass = CLUSTER_COLORS[(row.cluster - 1) % CLUSTER_COLORS.length];
              return (
                <tr
                  key={String(row.point.id)}
                  className={`border-t border-zinc-800/60 ${idx % 2 === 0 ? "bg-zinc-900/40" : "bg-zinc-900/20"} hover:bg-zinc-800/40 transition-colors`}
                >
                  <td className="px-4 py-3 text-zinc-500 tabular-nums">{row.point.id}</td>
                  <td className="px-4 py-3 text-zinc-200 font-medium max-w-[200px] truncate">
                    {row.point.label}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
                      C{row.cluster}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums text-xs">
                    {row.distanceTocentroid.toFixed(3)}
                  </td>
                  {row.point.features.slice(0, 4).map((val, j) => (
                    <td key={j} className="px-4 py-3 text-zinc-400 tabular-nums text-xs">
                      {typeof val === "number" ? val.toFixed(3) : val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
