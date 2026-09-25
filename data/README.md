# Data outputs

`funds-latest.csv` is the generated latest snapshot file.

The repository intentionally does not ship fabricated market rows. In a network-enabled environment run:

```bash
npm run scrape:csv
```

or run the hourly GitHub Actions workflow. The refresh workflow also writes snapshots to PostgreSQL/Supabase when `DATABASE_URL` is configured.

The first row in `funds-latest.csv` is kept in Git so the expected CSV schema is visible before the first live refresh.
