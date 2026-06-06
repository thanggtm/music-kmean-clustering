"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { Music2, ChevronRight, BarChart3, Table2, Info, FlaskConical } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ClusterConfig from "@/components/ClusterConfig";
import ResultsTable from "@/components/ResultsTable";
import ClusterChart from "@/components/ClusterChart";
import AnalysisPanel from "@/components/AnalysisPanel";
import { parseExcelFile } from "@/lib/parseExcel";
import { runKMeans, runElbow } from "@/lib/kmeans";
import type { KMeansResult } from "@/lib/kmeans";
import type { ParseResult } from "@/lib/parseExcel";

type Tab = "chart" | "table" | "analysis";
type ElbowPoint = { k: number; sse: number };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);

  const [k, setK] = useState(4);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [runLoading, setRunLoading] = useState(false);

  const [result, setResult] = useState<KMeansResult | null>(null);
  const [elbowData, setElbowData] = useState<ElbowPoint[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("chart");

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setParseLoading(true);
    setResult(null);
    try {
      const p = await parseExcelFile(f);
      setParsed(p);
      setSelectedFeatures(p.numericHeaders);
      setK(Math.min(8, Math.max(2, Math.round(Math.sqrt(p.points.length / 2)))));
    } catch (e) {
      setParseError((e as Error).message);
      setParsed(null);
    } finally {
      setParseLoading(false);
    }
  }, []);

  const handleReset = () => {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setResult(null);
    setSelectedFeatures([]);
  };

  const handleRun = useCallback(() => {
    if (!parsed) return;
    setRunLoading(true);
    setResult(null);

    setTimeout(() => {
      try {
        const points = parsed.points.map((p) => ({
          ...p,
          features: selectedFeatures.map((f) => {
            const idx = p.featureNames.indexOf(f);
            return idx >= 0 ? p.features[idx] : 0;
          }),
          featureNames: selectedFeatures,
        }));
        const res = runKMeans(points, k);
        const elbow = runElbow(points, maxK);
        setResult(res);
        setElbowData(elbow);
        setActiveTab("chart");
      } finally {
        setRunLoading(false);
      }
    }, 50);
  }, [parsed, selectedFeatures, k]);

  const maxK = parsed ? Math.min(8, Math.floor(parsed.points.length / 2)) : 8;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* VGU Logo */}
          <div className="bg-white rounded-md px-2 py-1 shrink-0">
            <Image
              src="/vgu-logo.png"
              alt="VGU Logo"
              width={120}
              height={40}
              className="object-contain h-10 w-auto"
            />
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-zinc-700 shrink-0" />

          {/* Tool identity */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <Music2 className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">K-Means Clustering</h1>
              <p className="text-xs text-zinc-500 leading-none mt-0.5">Interactive Music Analysis</p>
            </div>
          </div>

          {/* Authors */}
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-xs font-medium text-zinc-300 leading-none">
              Dung Hai Dinh &amp; Thang Minh Tran
            </p>
            <p className="text-xs text-zinc-500 leading-none mt-0.5">
              Business Information Systems · VGU
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Powered by K-Means Algorithm
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Cluster your data with{" "}
            <span className="text-orange-400">K-Means</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm sm:text-base">
            Upload an Excel or CSV file, choose the number of clusters, and instantly visualize how your data groups together using the K-Means algorithm.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="lg:col-span-1 space-y-5">
            {/* Step 1 */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">1</span>
                <h3 className="text-sm font-semibold text-zinc-200">Upload Data</h3>
              </div>
              <FileUpload
                onFile={handleFile}
                loading={parseLoading}
                error={parseError}
                fileName={file?.name ?? null}
                onReset={handleReset}
              />
              {parsed && (
                <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-500" />
                  <span>
                    {parsed.points.length} rows · {parsed.numericHeaders.length} numeric features detected
                    {parsed.warnings.map((w, i) => (
                      <span key={i} className="block text-yellow-500 mt-0.5">{w}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className={`bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 transition-opacity ${!parsed ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400">2</span>
                <h3 className="text-sm font-semibold text-zinc-200">Configure & Run</h3>
              </div>
              {parsed ? (
                <ClusterConfig
                  k={k}
                  onKChange={setK}
                  maxK={maxK}
                  featureNames={parsed.numericHeaders}
                  selectedFeatures={selectedFeatures}
                  onFeaturesChange={setSelectedFeatures}
                  onRun={handleRun}
                  loading={runLoading}
                />
              ) : (
                <p className="text-sm text-zinc-600">Upload a file first to configure clustering.</p>
              )}
            </div>

            {/* About */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 text-xs text-zinc-500 space-y-2">
              <p className="font-medium text-zinc-400 text-sm">How it works</p>
              <div className="space-y-1.5">
                {[
                  "Features are z-score standardized",
                  "Centroids initialized with K-Means++",
                  "Best result of 5 independent runs kept",
                  "Convergence when no assignments change",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-orange-500 shrink-0" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2">
            {!result && !runLoading && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-center p-10">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center mb-4">
                  <BarChart3 className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm font-medium">Results will appear here</p>
                <p className="text-zinc-600 text-xs mt-1.5 max-w-xs">
                  Upload your data file and click{" "}
                  <span className="text-zinc-500">Run K-Means Clustering</span> to get started.
                </p>
              </div>
            )}

            {runLoading && (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl border border-zinc-800 gap-4">
                <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Running K-Means algorithm…</p>
              </div>
            )}

            {result && !runLoading && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-1 mb-5 border-b border-zinc-800 pb-4 flex-wrap">
                  <button
                    onClick={() => setActiveTab("chart")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "chart"
                        ? "bg-orange-500/20 text-orange-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Visualization
                  </button>
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "analysis"
                        ? "bg-orange-500/20 text-orange-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <FlaskConical className="w-4 h-4" />
                    Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "table"
                        ? "bg-orange-500/20 text-orange-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Table2 className="w-4 h-4" />
                    Data Table
                  </button>
                  <div className="ml-auto text-xs text-zinc-500">
                    k={k} · {result.assignments.length} items
                  </div>
                </div>

                {activeTab === "chart" && <ClusterChart result={result} />}
                {activeTab === "analysis" && (
                  <AnalysisPanel result={result} elbowData={elbowData} currentK={k} />
                )}
                {activeTab === "table" && <ResultsTable result={result} />}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800/50 mt-16 py-6 text-center text-xs text-zinc-600">
        K-Means Clustering Tool · Vietnamese-German University · Built with Next.js & Recharts
      </footer>
    </div>
  );
}
