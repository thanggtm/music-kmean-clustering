"use client";
import { useState } from "react";
import { Minus, Plus, Settings2, ToggleLeft, ToggleRight } from "lucide-react";

interface Props {
  k: number;
  onKChange: (k: number) => void;
  maxK: number;
  featureNames: string[];
  selectedFeatures: string[];
  onFeaturesChange: (features: string[]) => void;
  onRun: () => void;
  loading: boolean;
}

export default function ClusterConfig({
  k, onKChange, maxK, featureNames, selectedFeatures, onFeaturesChange, onRun, loading,
}: Props) {
  const [showFeatures, setShowFeatures] = useState(false);

  const toggleFeature = (f: string) => {
    if (selectedFeatures.includes(f)) {
      if (selectedFeatures.length <= 2) return;
      onFeaturesChange(selectedFeatures.filter((x) => x !== f));
    } else {
      onFeaturesChange([...selectedFeatures, f]);
    }
  };

  return (
    <div className="space-y-6">
      {/* K selector */}
      <div>
        <label className="text-sm font-medium text-zinc-300 mb-3 block">
          Number of Clusters (k)
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onKChange(Math.max(2, k - 1))}
            className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            disabled={k <= 2}
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-4xl font-bold text-white tabular-nums">{k}</span>
          </div>
          <button
            onClick={() => onKChange(Math.min(maxK, k + 1))}
            className="w-10 h-10 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
            disabled={k >= maxK}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-500 text-center mt-2">Min 2 · Max {maxK}</p>
      </div>

      {/* Visual k bubbles */}
      <div className="flex gap-2 justify-center flex-wrap">
        {Array.from({ length: maxK - 1 }, (_, i) => i + 2).map((n) => (
          <button
            key={n}
            onClick={() => onKChange(n)}
            className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
              n === k
                ? "bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/30"
                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Feature selection toggle */}
      <div>
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full"
        >
          <Settings2 className="w-4 h-4" />
          <span>Feature selection</span>
          <span className="ml-auto text-xs text-zinc-600">
            {selectedFeatures.length}/{featureNames.length} selected
          </span>
          {showFeatures ? (
            <ToggleRight className="w-5 h-5 text-orange-400" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
        </button>

        {showFeatures && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {featureNames.map((f) => {
              const active = selectedFeatures.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggleFeature(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                    active
                      ? "bg-orange-500/20 border border-orange-500/50 text-orange-300"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-500 hover:border-zinc-500"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={loading || selectedFeatures.length < 2}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200
          bg-orange-500 hover:bg-orange-400 text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Running K-Means…
          </span>
        ) : (
          "Run K-Means Clustering"
        )}
      </button>
    </div>
  );
}
