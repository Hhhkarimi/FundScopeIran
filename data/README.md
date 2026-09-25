# Data outputs

This directory is the database-free data store:

- `funds-latest.json` and `funds-latest.csv`: latest accepted snapshot.
- `manifest.json`: schema version, source status, quality metrics and SHA-256 checksums.
- `history/market.json`: hourly aggregate series.
- `history/funds-YYYY.ndjson`: one daily NAV/market point per fund, partitioned by year.
- `history/fundbase-flows-YYYY.ndjson`: public Fundbase/Investats cash-flow history backfill.
- `raw/YYYY/MM/YYYY-MM-DD.json.gz`: compressed daily audit copy of the normalized source response.

The repository intentionally does not ship fabricated market rows. In a network-enabled environment run:

```bash
npm run scrape:csv
```

or run the scheduled GitHub Actions crawl. The quality gate rejects synthetic IDs, duplicates, impossible values, undersized responses and abrupt universe drops before any latest file is replaced.

Historical backfill is also file-backed:

```bash
npm run backfill
```

Git history supplies versioning and rollback. No database or Vercel writable filesystem is required.

The first row in `funds-latest.csv` is kept in Git so the expected CSV schema is visible before the first live refresh.
