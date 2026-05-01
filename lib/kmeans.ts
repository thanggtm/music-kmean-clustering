export interface DataPoint {
  id: string | number;
  label: string;
  features: number[];
  featureNames: string[];
}

export interface ClusterResult {
  point: DataPoint;
  cluster: number;
  distanceTocentroid: number;
}

export interface IterationRecord {
  iteration: number;
  centroids: number[][];
  assignments: number[];
  changed: number;
}

export interface KMeansResult {
  assignments: ClusterResult[];
  centroids: number[][];
  iterations: IterationRecord[];
  clusterSizes: number[];
  withinClusterSSE: number[];
  featureNames: string[];
  standardized: boolean;
  means: number[];
  stds: number[];
}

function euclideanDistanceSq(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0);
}

function standardize(data: number[][]): { data: number[][]; means: number[]; stds: number[] } {
  const n = data.length;
  const d = data[0].length;
  const means = Array(d).fill(0);
  const stds = Array(d).fill(0);

  for (const row of data) {
    for (let j = 0; j < d; j++) means[j] += row[j];
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  for (const row of data) {
    for (let j = 0; j < d; j++) stds[j] += (row[j] - means[j]) ** 2;
  }
  for (let j = 0; j < d; j++) stds[j] = Math.sqrt(stds[j] / n) || 1;

  const normalized = data.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j])
  );
  return { data: normalized, means, stds };
}

// K-means++ initialization
function initCentroidsKMeansPP(data: number[][], k: number): number[][] {
  const n = data.length;
  const centroids: number[][] = [];

  // Pick first centroid randomly
  const first = Math.floor(Math.random() * n);
  centroids.push([...data[first]]);

  for (let c = 1; c < k; c++) {
    const distances = data.map((point) => {
      const minDist = Math.min(...centroids.map((cent) => euclideanDistanceSq(point, cent)));
      return minDist;
    });
    const total = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < n; i++) {
      rand -= distances[i];
      if (rand <= 0) { idx = i; break; }
    }
    centroids.push([...data[idx]]);
  }
  return centroids;
}

function computeCentroids(data: number[][], assignments: number[], k: number): number[][] {
  const d = data[0].length;
  const sums = Array.from({ length: k }, () => Array(d).fill(0));
  const counts = Array(k).fill(0);

  for (let i = 0; i < data.length; i++) {
    const c = assignments[i];
    counts[c]++;
    for (let j = 0; j < d; j++) sums[c][j] += data[i][j];
  }

  return sums.map((sum, c) =>
    counts[c] > 0 ? sum.map((s) => s / counts[c]) : sum
  );
}

export function runKMeans(
  points: DataPoint[],
  k: number,
  maxIter = 100,
  runs = 5
): KMeansResult {
  const rawData = points.map((p) => p.features);
  const { data, means, stds } = standardize(rawData);
  const featureNames = points[0].featureNames;

  let bestResult: { assignments: number[]; centroids: number[][]; sse: number; iterations: IterationRecord[] } | null = null;

  for (let run = 0; run < runs; run++) {
    let centroids = initCentroidsKMeansPP(data, k);
    let assignments = Array(data.length).fill(0);
    const iterationRecords: IterationRecord[] = [];

    for (let iter = 0; iter < maxIter; iter++) {
      const newAssignments = data.map((point) => {
        let minDist = Infinity;
        let cluster = 0;
        for (let c = 0; c < k; c++) {
          const dist = euclideanDistanceSq(point, centroids[c]);
          if (dist < minDist) { minDist = dist; cluster = c; }
        }
        return cluster;
      });

      const changed = newAssignments.filter((a, i) => a !== assignments[i]).length;
      assignments = newAssignments;

      iterationRecords.push({
        iteration: iter + 1,
        centroids: centroids.map((c) => [...c]),
        assignments: [...assignments],
        changed,
      });

      if (changed === 0) break;
      centroids = computeCentroids(data, assignments, k);
    }

    const sse = data.reduce((sum, point, i) => {
      return sum + euclideanDistanceSq(point, centroids[assignments[i]]);
    }, 0);

    if (!bestResult || sse < bestResult.sse) {
      bestResult = { assignments, centroids, sse, iterations: iterationRecords };
    }
  }

  const { assignments, centroids, iterations } = bestResult!;

  const clusterSizes = Array(k).fill(0);
  assignments.forEach((c) => clusterSizes[c]++);

  const withinClusterSSE = Array(k).fill(0);
  data.forEach((point, i) => {
    withinClusterSSE[assignments[i]] += euclideanDistanceSq(point, centroids[assignments[i]]);
  });

  const clusterResults: ClusterResult[] = points.map((point, i) => ({
    point,
    cluster: assignments[i] + 1,
    distanceTocentroid: Math.sqrt(euclideanDistanceSq(data[i], centroids[assignments[i]])),
  }));

  return {
    assignments: clusterResults,
    centroids,
    iterations,
    clusterSizes,
    withinClusterSSE,
    featureNames,
    standardized: true,
    means,
    stds,
  };
}

// Simple PCA to 2D for visualization
export function pca2D(points: DataPoint[], means: number[], stds: number[]): [number, number][] {
  const data = points.map((p) =>
    p.features.map((val, j) => (val - means[j]) / (stds[j] || 1))
  );
  const n = data.length;
  const d = data[0].length;

  // Covariance matrix
  const cov = Array.from({ length: d }, () => Array(d).fill(0));
  for (const row of data) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += row[i] * row[j];
      }
    }
  }
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= n;

  // Power iteration for first two principal components
  function powerIterate(matrix: number[][], deflate?: number[]): number[] {
    let v = Array(d).fill(0).map(() => Math.random() - 0.5);
    for (let iter = 0; iter < 100; iter++) {
      let newV = Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) newV[i] += matrix[i][j] * v[j];
      }
      if (deflate) {
        const dot = deflate.reduce((s, dj, j) => s + dj * newV[j], 0);
        newV = newV.map((val, j) => val - dot * deflate[j]);
      }
      const norm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0)) || 1;
      v = newV.map((x) => x / norm);
    }
    return v;
  }

  const pc1 = powerIterate(cov);
  const pc2 = powerIterate(cov, pc1);

  return data.map((row) => [
    row.reduce((s, x, j) => s + x * pc1[j], 0),
    row.reduce((s, x, j) => s + x * pc2[j], 0),
  ]);
}
