"use client";
import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, ScatterChart,
  Scatter, Legend,
} from "recharts";
import type { KMeansResult } from "@/lib/kmeans";

const CLUSTER_FILL = ["#ea580c", "#3b82f6", "#8b5cf6", "#ea580c", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];

interface Props {
  result: KMeansResult;
  elbowData: { k: number; sse: number }[];
  currentK: number;
}

function silhouetteLabel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: "Strong", color: "#ea580c" };
  if (score >= 0.5) return { label: "Good", color: "#3b82f6" };
  if (score >= 0.25) return { label: "Weak", color: "#f97316" };
  return { label: "Poor", color: "#ef4444" };
}

interface ElbowTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}
function ElbowTooltip({ active, payload, label }: ElbowTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-zinc-300 font-medium">k = {label}</p>
      <p className="text-orange-400">SSE: {payload[0].value.toFixed(3)}</p>
    </div>
  );
}

interface ConvTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}
function ConvTooltip({ active, payload, label }: ConvTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-zinc-300 font-medium">Iteration {label}</p>
      <p className="text-blue-400">SSE: {payload[0].value.toFixed(3)}</p>
    </div>
  );
}

interface DistTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; dist: number; cluster: number } }>;
}
function DistTooltip({ active, payload }: DistTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs shadow-xl max-w-[180px]">
      <p className="text-white font-medium truncate">{d.name}</p>
      <p style={{ color: CLUSTER_FILL[(d.cluster - 1) % CLUSTER_FILL.length] }}>Cluster {d.cluster}</p>
      <p className="text-zinc-400">Distance: {d.dist.toFixed(3)}</p>
    </div>
  );
}

export default function AnalysisPanel({ result, elbowData, currentK }: Props) {
  const k = result.clusterSizes.length;
  const sil = silhouetteLabel(result.silhouetteScore);

  // SSE convergence data from best run's iterations
  const convData = result.iterations.map((it) => ({
    iteration: it.iteration,
    sse: it.sse,
  }));

  // Items sorted by cluster for distance chart
  const distData = useMemo(() => {
    return [...result.assignments]
      .sort((a, b) => a.cluster - b.cluster || a.point.label.localeCompare(b.point.label))
      .map((a) => ({
        name: a.point.label,
        dist: a.distanceTocentroid,
        cluster: a.cluster,
      }));
  }, [result]);

  // Cluster members grouped
  const clusterGroups = useMemo(() => {
    const groups: Record<number, string[]> = {};
    for (let c = 1; c <= k; c++) groups[c] = [];
    for (const a of result.assignments) {
      groups[a.cluster].push(a.point.label);
    }
    return groups;
  }, [result, k]);

  // Per-cluster distance stats
  const clusterDistStats = useMemo(() => {
    const stats: Record<number, { avg: number; min: number; max: number }> = {};
    for (let c = 1; c <= k; c++) {
      const dists = result.assignments.filter((a) => a.cluster === c).map((a) => a.distanceTocentroid);
      stats[c] = {
        avg: dists.reduce((s, v) => s + v, 0) / dists.length,
        min: Math.min(...dists),
        max: Math.max(...dists),
      };
    }
    return stats;
  }, [result, k]);

  // Scatter data for distances (by cluster grouping on x-axis with jitter)
  const distScatterData = useMemo(() => {
    const byCluster: Record<number, Array<{ x: number; y: number; name: string; cluster: number }>> = {};
    for (let c = 1; c <= k; c++) byCluster[c] = [];
    result.assignments.forEach((a) => {
      byCluster[a.cluster].push({
        x: a.cluster,
        y: a.distanceTocentroid,
        name: a.point.label,
        cluster: a.cluster,
      });
    });
    // Add small jitter on x to avoid perfect overlap
    for (let c = 1; c <= k; c++) {
      const n = byCluster[c].length;
      byCluster[c].forEach((pt, i) => {
        pt.x = c + (n > 1 ? ((i / (n - 1)) - 0.5) * 0.35 : 0);
      });
    }
    return byCluster;
  }, [result, k]);

  const totalSSE = result.withinClusterSSE.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-800/60 rounded-xl p-4 text-center border border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Silhouette Score</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: sil.color }}>
            {result.silhouetteScore.toFixed(3)}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: sil.color }}>{sil.label}</p>
          <p className="text-xs text-zinc-600 mt-0.5">–1 (bad) → 1 (perfect)</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-4 text-center border border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total SSE</p>
          <p className="text-2xl font-bold tabular-nums text-white">
            {totalSSE.toFixed(3)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Sum of squared errors</p>
          <p className="text-xs text-zinc-600 mt-0.5">Lower is better</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-4 text-center border border-zinc-700/50">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Convergence</p>
          <p className="text-2xl font-bold tabular-nums text-white">
            {result.iterations.length}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Iterations to converge</p>
          <p className="text-xs text-zinc-600 mt-0.5">k = {currentK} clusters</p>
        </div>
      </div>

      {/* Elbow Method + SSE Convergence side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Elbow Method */}
        {elbowData.length > 0 && (
          <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-200">Elbow Method</h3>
              <span className="text-xs text-zinc-500">pick k at the "elbow"</span>
            </div>
            <p className="text-xs text-zinc-600 mb-3">SSE vs number of clusters (k)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={elbowData} margin={{ top: 5, right: 15, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="k"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  label={{ value: "k (clusters)", position: "insideBottom", offset: -12, fill: "#52525b", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  label={{ value: "SSE", angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 11 }}
                  width={50}
                />
                <Tooltip content={<ElbowTooltip />} />
                <ReferenceLine
                  x={currentK}
                  stroke="#ea580c"
                  strokeDasharray="4 4"
                  label={{ value: `k=${currentK}`, fill: "#ea580c", fontSize: 11, position: "top" }}
                />
                <Line
                  type="monotone"
                  dataKey="sse"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { k: number } };
                    const isActive = payload.k === currentK;
                    return (
                      <circle
                        key={`dot-${payload.k}`}
                        cx={cx}
                        cy={cy}
                        r={isActive ? 6 : 4}
                        fill={isActive ? "#ea580c" : "#3b82f6"}
                        stroke={isActive ? "#ea580c" : "#1d4ed8"}
                        strokeWidth={isActive ? 2 : 1}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SSE Convergence */}
        <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-zinc-200">SSE Convergence</h3>
            <span className="text-xs text-zinc-500">best run</span>
          </div>
          <p className="text-xs text-zinc-600 mb-3">SSE decreases at each iteration until convergence</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={convData} margin={{ top: 5, right: 15, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="iteration"
                tick={{ fill: "#71717a", fontSize: 11 }}
                label={{ value: "Iteration", position: "insideBottom", offset: -12, fill: "#52525b", fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                label={{ value: "SSE", angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<ConvTooltip />} />
              <Line
                type="monotone"
                dataKey="sse"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6, fill: "#a78bfa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distance to Centroid visualization */}
      <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Distances to Centroids by Cluster</h3>
        <p className="text-xs text-zinc-600 mb-4">Each dot = one item. Lower = closer to cluster center.</p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0.5, k + 0.5]}
              ticks={Array.from({ length: k }, (_, i) => i + 1)}
              tickFormatter={(v) => `C${v}`}
              tick={{ fill: "#71717a", fontSize: 11 }}
              label={{ value: "Cluster", position: "insideBottom", offset: -12, fill: "#52525b", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fill: "#71717a", fontSize: 11 }}
              label={{ value: "Distance", angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 11 }}
              width={50}
            />
            <Tooltip content={<DistTooltip />} cursor={{ stroke: "#3f3f46" }} />
            <Legend
              formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
            />
            {Array.from({ length: k }, (_, i) => i + 1).map((c) => (
              <Scatter
                key={c}
                name={`Cluster ${c}`}
                data={distScatterData[c]}
                fill={CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]}
              >
                {distScatterData[c].map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Avg distance per cluster summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {Array.from({ length: k }, (_, i) => i + 1).map((c) => {
            const stats = clusterDistStats[c];
            return (
              <div key={c} className="rounded-lg bg-zinc-900/60 p-2.5 text-xs border border-zinc-800/60">
                <p className="font-medium mb-1" style={{ color: CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length] }}>
                  Cluster {c}
                </p>
                <p className="text-zinc-400">Avg: <span className="text-zinc-200 tabular-nums">{stats.avg.toFixed(3)}</span></p>
                <p className="text-zinc-400">Min: <span className="text-zinc-200 tabular-nums">{stats.min.toFixed(3)}</span></p>
                <p className="text-zinc-400">Max: <span className="text-zinc-200 tabular-nums">{stats.max.toFixed(3)}</span></p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items by cluster groups */}
      <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Items by Cluster Group</h3>
        <p className="text-xs text-zinc-600 mb-4">Final assignment of all items to their clusters</p>

        {/* Bar chart: count per cluster */}
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart
              data={Array.from({ length: k }, (_, i) => ({
                cluster: `C${i + 1}`,
                count: result.clusterSizes[i],
                fill: CLUSTER_FILL[i % CLUSTER_FILL.length],
              }))}
              margin={{ top: 5, right: 15, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="cluster" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip
                formatter={(value) => [value, "Items"]}
                contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#d4d4d8" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {Array.from({ length: k }, (_, i) => (
                  <Cell key={i} fill={CLUSTER_FILL[i % CLUSTER_FILL.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Item tags per cluster */}
        <div className="space-y-3">
          {Array.from({ length: k }, (_, i) => i + 1).map((c) => (
            <div key={c}>
              <p
                className="text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ color: CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length] }}
              >
                Cluster {c} — {clusterGroups[c].length} items
              </p>
              <div className="flex flex-wrap gap-1.5">
                {clusterGroups[c].map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: `${CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]}1a`,
                      borderColor: `${CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]}40`,
                      color: CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length],
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-point silhouette scores */}
      <div className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">Per-Item Silhouette Scores</h3>
        <p className="text-xs text-zinc-600 mb-4">
          How well each item fits its cluster (1 = perfect, –1 = wrong cluster)
        </p>
        <ResponsiveContainer width="100%" height={Math.max(150, result.assignments.length * 22)}>
          <BarChart
            layout="vertical"
            data={[...result.assignments]
              .sort((a, b) => a.cluster - b.cluster)
              .map((a, i) => ({
                name: a.point.label.length > 22 ? a.point.label.slice(0, 22) + "…" : a.point.label,
                score: result.silhouetteScores[result.assignments.indexOf(a)],
                cluster: a.cluster,
              }))}
            margin={{ top: 5, right: 20, bottom: 5, left: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              domain={[-1, 1]}
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#71717a", fontSize: 10 }}
              width={115}
            />
            <Tooltip
              formatter={(value) => [typeof value === "number" ? value.toFixed(3) : value, "Silhouette"]}
              contentStyle={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
            />
            <ReferenceLine x={0} stroke="#52525b" />
            <Bar dataKey="score" radius={[0, 3, 3, 0]}>
              {[...result.assignments]
                .sort((a, b) => a.cluster - b.cluster)
                .map((a, i) => (
                  <Cell
                    key={i}
                    fill={CLUSTER_FILL[(a.cluster - 1) % CLUSTER_FILL.length]}
                    fillOpacity={0.8}
                  />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
