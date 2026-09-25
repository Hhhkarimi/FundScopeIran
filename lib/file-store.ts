import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fundsToCsv } from "@/lib/csv";
import { assertSnapshotQuality, type SnapshotQuality } from "@/lib/data-quality";
import { summarize } from "@/lib/metrics";
import type { DashboardData, FundHistoryPoint, FundRow, HistoryPoint, RefreshResult } from "@/lib/types";

export const SNAPSHOT_SCHEMA_VERSION = 2;

export type StaticSnapshot = {
  schemaVersion?: number;
  generatedAt: string;
  sourceStatus: DashboardData["sourceStatus"];
  rows: FundRow[];
};

type HistoricalFundPoint = FundHistoryPoint & {
  regNo: string;
  netAsset: number | null;
  dailyReturn: number | null;
};

type Manifest = {
  schemaVersion: number;
  generatedAt: string;
  rowCount: number;
  sourceStatus: DashboardData["sourceStatus"];
  quality: SnapshotQuality;
  files: Record<string, string>;
};

const dataPath = (...parts: string[]) => path.join(process.cwd(), "data", ...parts);

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(filePath, "utf8")) as T; } catch { return fallback; }
}

async function atomicWrite(filePath: string, content: string | Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, content);
  await rename(tempPath, filePath);
}

function checksum(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function tehranDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(iso));
}

function tehranHour(iso: string) {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", hour: "2-digit", hour12: false
  }).format(new Date(iso)));
}

export async function readFileSnapshot(): Promise<StaticSnapshot | null> {
  const snapshot = await readJson<Partial<StaticSnapshot> | null>(dataPath("funds-latest.json"), null);
  if (!snapshot || !Array.isArray(snapshot.rows)) return null;
  return {
    schemaVersion: snapshot.schemaVersion,
    generatedAt: snapshot.generatedAt || snapshot.rows[0]?.capturedAt || new Date(0).toISOString(),
    sourceStatus: snapshot.sourceStatus || { fipiran: "unknown", tsetmc: "unknown" },
    rows: snapshot.rows
  };
}

export async function readMarketHistoryFile(limit = 72): Promise<HistoryPoint[]> {
  const points = await readJson<HistoryPoint[]>(dataPath("history", "market.json"), []);
  return points.slice(-limit);
}

export async function readFundHistoryFile(regNo: string, limit = 365): Promise<FundHistoryPoint[]> {
  const historyDir = dataPath("history");
  let files: string[] = [];
  try { files = (await readdir(historyDir)).filter((name) => /^funds-\d{4}\.ndjson$/.test(name)).sort().slice(-2); } catch { return []; }
  const points: HistoricalFundPoint[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(historyDir, file), "utf8");
    for (const line of raw.split("\n")) {
      if (!line) continue;
      const point = JSON.parse(line) as HistoricalFundPoint;
      if (point.regNo === regNo) points.push(point);
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date)).slice(-limit).map((point) => ({
    date: point.date,
    closePrice: point.closePrice,
    lastPrice: point.lastPrice,
    navCancel: point.navCancel,
    navIssue: point.navIssue,
    navStatistical: point.navStatistical,
    volume: point.volume,
    tradeValue: point.tradeValue
  }));
}

async function updateMarketHistory(rows: FundRow[], capturedAt: string) {
  const filePath = dataPath("history", "market.json");
  const existing = await readJson<HistoryPoint[]>(filePath, []);
  const summary = summarize(rows);
  const point: HistoryPoint = {
    capturedAt,
    totalNetAsset: summary.totalNetAsset,
    etfTradeValue: summary.etfTradeValue,
    totalRealMoneyFlow: summary.totalRealMoneyFlow,
    positiveSharePct: summary.positiveSharePct
  };
  const hourKey = capturedAt.slice(0, 13);
  const next = [...existing.filter((item) => item.capturedAt.slice(0, 13) !== hourKey), point]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).slice(-2160);
  await atomicWrite(filePath, JSON.stringify(next));
}

async function updateDailyFundHistory(rows: FundRow[], capturedAt: string) {
  const date = tehranDate(capturedAt);
  const year = date.slice(0, 4);
  const filePath = dataPath("history", `funds-${year}.ndjson`);
  let existing: HistoricalFundPoint[] = [];
  try {
    existing = (await readFile(filePath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as HistoricalFundPoint);
  } catch { /* first daily archive */ }
  const points: HistoricalFundPoint[] = rows.map((row) => ({
    regNo: row.regNo,
    date,
    closePrice: row.closingPrice,
    lastPrice: row.lastPrice,
    navCancel: row.navCancel,
    navIssue: row.navIssue,
    navStatistical: row.navStatistical,
    volume: row.volume,
    tradeValue: row.tradeValue,
    netAsset: row.netAsset,
    dailyReturn: row.dailyReturn
  }));
  const next = [...existing.filter((point) => point.date !== date), ...points]
    .sort((a, b) => a.date.localeCompare(b.date) || a.regNo.localeCompare(b.regNo));
  await atomicWrite(filePath, `${next.map((point) => JSON.stringify(point)).join("\n")}\n`);

  const rawPath = dataPath("raw", year, date.slice(5, 7), `${date}.json.gz`);
  await atomicWrite(rawPath, gzipSync(JSON.stringify({ schemaVersion: SNAPSHOT_SCHEMA_VERSION, capturedAt, rows })));
}

export async function writeSnapshotFiles(rows: FundRow[], result: RefreshResult) {
  const previous = await readFileSnapshot();
  const sortedRows = [...rows].sort((a, b) => a.regNo.localeCompare(b.regNo));
  const quality = assertSnapshotQuality(sortedRows, previous?.rows || []);
  const json = JSON.stringify({
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: result.capturedAt,
    sourceStatus: result.sourceStatus,
    rows: sortedRows
  });
  const csv = fundsToCsv(sortedRows);

  await Promise.all([
    atomicWrite(dataPath("funds-latest.json"), json),
    atomicWrite(dataPath("funds-latest.csv"), csv),
    updateMarketHistory(sortedRows, result.capturedAt)
  ]);

  const shouldArchiveDaily = process.env.FORCE_HISTORY_ARCHIVE === "true" || tehranHour(result.capturedAt) >= 13;
  if (shouldArchiveDaily) await updateDailyFundHistory(sortedRows, result.capturedAt);

  const manifest: Manifest = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: result.capturedAt,
    rowCount: sortedRows.length,
    sourceStatus: result.sourceStatus,
    quality,
    files: {
      "funds-latest.json": checksum(json),
      "funds-latest.csv": checksum(csv)
    }
  };
  await atomicWrite(dataPath("manifest.json"), JSON.stringify(manifest, null, 2));
  return { quality, archivedDaily: shouldArchiveDaily };
}

export async function mergeHistoricalPoints(points: HistoricalFundPoint[]) {
  const byYear = new Map<string, HistoricalFundPoint[]>();
  for (const point of points) byYear.set(point.date.slice(0, 4), [...(byYear.get(point.date.slice(0, 4)) || []), point]);
  for (const [year, additions] of byYear) {
    const filePath = dataPath("history", `funds-${year}.ndjson`);
    let existing: HistoricalFundPoint[] = [];
    try { existing = (await readFile(filePath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line)); } catch { /* new partition */ }
    const merged = new Map(existing.map((point) => [`${point.date}:${point.regNo}`, point]));
    for (const point of additions) merged.set(`${point.date}:${point.regNo}`, point);
    const ordered = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.regNo.localeCompare(b.regNo));
    await atomicWrite(filePath, `${ordered.map((point) => JSON.stringify(point)).join("\n")}\n`);
  }
}
