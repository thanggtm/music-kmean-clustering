"use client";
import { useMemo, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import type { KMeansResult } from "@/lib/kmeans";
import { pca2D } from "@/lib/kmeans";

interface Props {
  result: KMeansResult;
}

const CLUSTER_FILL = ["#ea580c", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#06b6d4", "#eab308", "#ef4444"];
const CLUSTER_NAMES = CLUSTER_FILL.map((_, i) => `Cluster ${i + 1}`);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; cluster: number; x: number; y: number } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm shadow-xl max-w-[200px]">
      <p className="font-medium text-white truncate">{d.name}</p>
      <p className="text-xs mt-1" style={{ color: CLUSTER_FILL[(d.cluster - 1) % CLUSTER_FILL.length] }}>
        Cluster {d.cluster}
      </p>
      <p className="text-xs text-zinc-500 mt-1">
        PC1: {d.x.toFixed(3)} · PC2: {d.y.toFixed(3)}
      </p>
    </div>
  );
}

export default function ClusterChart({ result }: Props) {
  const [view, setView] = useState<"pca" | "feature">("pca");
  const [fx, setFx] = useState(0);
  const [fy, setFy] = useState(1);

  const pcaPoints = useMemo(() => {
    const coords = pca2D(result.assignments.map((a) => a.point), result.means, result.stds);
    return result.assignments.map((a, i) => ({
      x: coords[i][0],
      y: coords[i][1],
      name: a.point.label,
      cluster: a.cluster,
    }));
  }, [result]);

  const featurePoints = useMemo(() => {
    return result.assignments.map((a) => ({
      x: a.point.features[fx],
      y: a.point.features[fy],
      name: a.point.label,
      cluster: a.cluster,
    }));
  }, [result, fx, fy]);

  const chartData = view === "pca" ? pcaPoints : featurePoints;
  const k = result.clusterSizes.length;

  const byCluster: Record<number, typeof chartData> = {};
  for (let c = 1; c <= k; c++) byCluster[c] = chartData.filter((d) => d.cluster === c);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-sm">
          <button
            onClick={() => setView("pca")}
            className={`px-4 py-2 font-medium transition-colors ${view === "pca" ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
          >
            PCA View
          </button>
          <button
            onClick={() => setView("feature")}
            className={`px-4 py-2 font-medium transition-colors ${view === "feature" ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
          >
            Feature View
          </button>
        </div>

        {view === "feature" && (
          <div className="flex items-center gap-2 text-sm">
            <select
              value={fx}
              onChange={(e) => setFx(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-orange-500"
            >
              {result.featureNames.map((f, i) => (
                <option key={f} value={i}>{f}</option>
              ))}
            </select>
            <span className="text-zinc-500">vs</span>
            <select
              value={fy}
              onChange={(e) => setFy(Number(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-orange-500"
            >
              {result.featureNames.map((f, i) => (
                <option key={f} value={i}>{f}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500">
        {view === "pca"
          ? "Points projected onto 2 principal components (PCA) for visualization."
          : `Plotting ${result.featureNames[fx]} (x) vs ${result.featureNames[fy]} (y).`}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="x"
            type="number"
            name={view === "pca" ? "PC1" : result.featureNames[fx]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            label={{ value: view === "pca" ? "PC1" : result.featureNames[fx], position: "insideBottom", offset: -10, fill: "#52525b", fontSize: 11 }}
          />
          <YAxis
            dataKey="y"
            type="number"
            name={view === "pca" ? "PC2" : result.featureNames[fy]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            label={{ value: view === "pca" ? "PC2" : result.featureNames[fy], angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3f3f46" }} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-zinc-400">{value}</span>
            )}
          />
          {Array.from({ length: k }, (_, i) => i + 1).map((c) => (
            <Scatter
              key={c}
              name={CLUSTER_NAMES[c - 1]}
              data={byCluster[c]}
              fill={CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]}
            >
              {byCluster[c]?.map((_, idx) => (
                <Cell key={idx} fill={CLUSTER_FILL[(c - 1) % CLUSTER_FILL.length]} fillOpacity={0.85} />
              ))}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Centroid feature heatmap */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Cluster Centroids (standardized)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-zinc-500">Feature</th>
                {Array.from({ length: k }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-center font-medium" style={{ color: CLUSTER_FILL[i % CLUSTER_FILL.length] }}>
                    C{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.featureNames.map((f, j) => (
                <tr key={f} className="border-t border-zinc-800/60">
                  <td className="px-3 py-2 text-zinc-400">{f}</td>
                  {result.centroids.map((centroid, c) => {
                    const val = centroid[j];
                    const maxAbs = Math.max(...result.centroids.map((cn) => Math.abs(cn[j])));
                    const intensity = maxAbs > 0 ? Math.abs(val) / maxAbs : 0;
                    const isPos = val >= 0;
                    return (
                      <td key={c} className="px-3 py-2 text-center tabular-nums">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: isPos
                              ? `rgba(16,185,129,${intensity * 0.4})`
                              : `rgba(239,68,68,${intensity * 0.4})`,
                            color: isPos ? "#6ee7b7" : "#fca5a5",
                          }}
                        >
                          {val.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
