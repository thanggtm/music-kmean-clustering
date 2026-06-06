# K-Means Clustering Tool

An interactive web app for clustering tabular data using the K-Means algorithm — built to analyze Spotify audio features but works with any numeric dataset.

**Live demo:** _deploy to Vercel and paste URL here_

---

## What it does

Upload an Excel or CSV file, choose how many clusters you want, and the app groups your data automatically. Results are shown as an interactive scatter plot and a sortable data table — no coding required.

### Workflow

1. **Upload** — drag & drop or browse for a `.xlsx`, `.xls`, or `.csv` file. The app auto-detects numeric feature columns and label/ID columns. A sample Spotify dataset (20 songs) is available to download if you want to try it immediately.

2. **Configure** — pick the number of clusters `k` (2–8) using the +/− buttons or the quick-select bubbles. Optionally expand **Feature selection** to include or exclude specific columns from the clustering calculation.

3. **Run** — click **Run K-Means Clustering**. The algorithm standardizes all features, runs K-Means++ initialization across 5 independent restarts, and keeps the result with the lowest within-cluster SSE.

4. **Explore results** — two views:
   - **Visualization tab** — scatter plot of all items colored by cluster. Switch between **PCA view** (all features projected to 2D via principal component analysis) and **Feature view** (pick any two axes manually). Below the plot, a centroid heatmap shows each cluster's characteristic profile per feature.
   - **Data Table tab** — sortable table showing every item with its cluster assignment and distance to its centroid. Click column headers to sort. Summary cards at the top show cluster sizes and within-cluster SSE.

5. **Export** — download the full result table as an `.xlsx` file.

---

## Algorithm details

| Step | Detail |
|---|---|
| Standardization | Z-score (mean 0, std 1) per feature |
| Initialization | K-Means++ (weighted random seeding) |
| Distance metric | Squared Euclidean in standardized space |
| Restarts | 5 independent runs; lowest total SSE kept |
| Convergence | Stops when zero assignment changes |
| Visualization | PCA via power iteration (no external ML library) |

All computation runs client-side in the browser — no data is sent to any server.

---

## Running locally

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
```

Requires Node.js 18+.

## Deploying to Vercel

1. Push this repo to GitHub
2. Import into [Vercel](https://vercel.com) — no environment variables needed
3. If this folder is inside a larger monorepo, set **Root Directory** to `kmeans-webapp/` in the Vercel project settings

---

## Sample data

`public/sample-spotify-data.xlsx` contains 20 top Spotify tracks from 2021 with 10 audio features: `danceability`, `energy`, `key`, `loudness`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `tempo`.
