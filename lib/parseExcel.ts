import * as XLSX from "xlsx";
import type { DataPoint } from "./kmeans";

export interface ParseResult {
  points: DataPoint[];
  rawHeaders: string[];
  numericHeaders: string[];
  labelHeader: string;
  idHeader: string;
  warnings: string[];
}

const KNOWN_NUMERIC_FEATURES = [
  "danceability", "energy", "key", "loudness", "speechiness",
  "acousticness", "instrumentalness", "liveness", "valence", "tempo",
];

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

        if (rows.length === 0) {
          reject(new Error("The spreadsheet appears to be empty."));
          return;
        }

        const warnings: string[] = [];
        const headers = Object.keys(rows[0]);

        // Detect numeric columns
        const numericHeaders: string[] = [];
        for (const h of headers) {
          const vals = rows.map((r) => r[h]).filter((v) => v !== null && v !== "");
          const numericCount = vals.filter((v) => typeof v === "number" || !isNaN(Number(v))).length;
          if (numericCount / vals.length > 0.8) {
            numericHeaders.push(h);
          }
        }

        // Prefer known Spotify features
        const spotifyFeatures = numericHeaders.filter((h) =>
          KNOWN_NUMERIC_FEATURES.includes(h.toLowerCase().trim())
        );
        const selectedFeatures = spotifyFeatures.length >= 2 ? spotifyFeatures : numericHeaders;

        // Detect label column (track name / song name)
        const labelCandidates = ["track_name", "track", "song", "name", "title", "song_name"];
        let labelHeader =
          headers.find((h) => labelCandidates.includes(h.toLowerCase().trim())) ||
          headers.find((h) => !numericHeaders.includes(h)) ||
          headers[0];

        // Detect id column
        const idCandidates = ["id", "track_id", "song_id", "index", "no", "number"];
        let idHeader =
          headers.find((h) => idCandidates.includes(h.toLowerCase().trim())) ||
          "";

        const points: DataPoint[] = rows
          .filter((row) => {
            const features = selectedFeatures.map((f) => Number(row[f]));
            return features.every((v) => !isNaN(v));
          })
          .map((row, idx) => ({
            id: idHeader ? String(row[idHeader] ?? idx + 1) : String(idx + 1),
            label: String(row[labelHeader] ?? `Item ${idx + 1}`),
            features: selectedFeatures.map((f) => Number(row[f])),
            featureNames: selectedFeatures,
          }));

        if (points.length < rows.length) {
          warnings.push(
            `${rows.length - points.length} row(s) were skipped due to missing or invalid values.`
          );
        }

        if (points.length < 2) {
          reject(new Error("Need at least 2 valid data rows to run clustering."));
          return;
        }

        if (selectedFeatures.length < 2) {
          reject(new Error("Need at least 2 numeric feature columns for clustering."));
          return;
        }

        resolve({ points, rawHeaders: headers, numericHeaders: selectedFeatures, labelHeader, idHeader, warnings });
      } catch (err) {
        reject(new Error("Failed to parse the file. Please upload a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsArrayBuffer(file);
  });
}

export function exportResultsToExcel(
  points: DataPoint[],
  clusters: number[],
  featureNames: string[]
): void {
  const data = points.map((p, i) => {
    const row: Record<string, unknown> = {
      id: p.id,
      name: p.label,
      cluster: clusters[i],
    };
    featureNames.forEach((f, j) => { row[f] = p.features[j]; });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clustering Results");
  XLSX.writeFile(wb, "kmeans_results.xlsx");
}
