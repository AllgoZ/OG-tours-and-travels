#!/usr/bin/env bash
# Rebuild and serve on :3100 for QA. The real WhatsApp/phone numbers come from the config
# defaults; only the production domain is injected here so indexing/canonical/sitemap work.
# Windows (Git Bash) friendly: stops any running node server first.
taskkill //F //IM node.exe >/dev/null 2>&1 || true
export NEXT_PUBLIC_SITE_URL=https://qa.example.test
npm run build >/dev/null 2>&1 || { echo "build failed"; exit 1; }
(npx next start -p 3100 >/dev/null 2>&1 &)
sleep 4
curl -s -o /dev/null -w "server: %{http_code}\n" http://localhost:3100/
