# Project Checks

- Build: `npm ci`, `npm run build:shared`, `npm run prisma:generate`, `npm run build:backend`, `npm run build:frontend`.
- Backend integration: seed a disposable PostgreSQL database, then `npm run test:smoke` and `node backend/test/regressions.mjs`. Set `SMOKE_BASE_URL` for its API. These tests mutate data; never run them against the retained local execution database.
- Mutations must lock the session/takeout parent before orders and items. Paid orders keep kitchen transitions, but their amounts and quantities are immutable.
- Verify floor, billing, takeout and KDS in the browser at desktop and mobile widths. Check text contrast, including captions and hover colors.
- Keep Next.js build workers bounded (`experimental.cpus: 2`) on the shared Docker host; do not disable type checking to complete a build.
- Windows: read/write Japanese text explicitly as UTF-8 and quote absolute paths. Deliver through a Japanese PR, CI, requested merge, and the actual execution checkout/Docker.
