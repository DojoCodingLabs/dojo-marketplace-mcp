# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dojo Marketplace MCP server (`@dojocoding/marketplace-mcp`). Exposes marketplace tools to AI coding assistants via the Model Context Protocol. Dual transport: stdio (default, for `npx` / Claude Desktop) and Streamable HTTP (for hosted deployment).

## Commands

```bash
npm run build        # tsc + chmod +x dist/index.js
npm run dev          # tsc --watch
npm run typecheck    # type check without emit
npm run start        # run in stdio mode
npm run start:http   # run in HTTP mode (TRANSPORT_MODE=http)
```

## Architecture

```
index.ts → registers all tools → disables non-enabled toolsets → connects transport
             ↓
         tools/*.tools.ts → each exports register*Tools(server, service)
             ↓
         services/marketplace.service.ts → API calls to Dojo backend (currently stubs)
```

**Toolset filtering:** All 4 toolsets (browse, install, publish, account) are registered before `server.connect()` (SDK requirement), then non-enabled ones are disabled via `.disable()` on the returned tool handles. Enabled set is parsed from `DOJO_TOOLSETS` env var (default: `browse,install`).

**Transports:** `TRANSPORT_MODE` env var selects stdio (default) or http. Stdio validates API key once at startup from `DOJO_API_KEY`. HTTP validates per-request via `Authorization: Bearer` header in Express middleware.

## Constraints

- **Never use `console.log()`** — corrupts the stdio JSON-RPC stream. Use `logger.*()` from `src/utils/logger.ts` which writes structured JSON to stderr.
- **All imports must use `.js` extensions** — required by NodeNext module resolution (e.g., `import { logger } from '../utils/logger.js'`).
- **Never throw from tool handlers** — return `{ content: [{ type: "text", text: "..." }], isError: true }` instead.
- **Entry point shebang** — `src/index.ts` must start with `#!/usr/bin/env node` on line 1 for `npx` execution.
- **Register tools before `server.connect()`** — SDK limitation, all tools must be registered first.

## Adding a New Tool

1. Add the service method to `src/services/marketplace.service.ts`
2. Add the tool registration in the appropriate `src/tools/*.tools.ts` file using the existing pattern:
   - Define Zod schema for params
   - Wrap handler in try/catch returning `{ isError: true }` on failure
   - Push the `server.tool()` return value to the tools array
3. If adding a new toolset, update `ToolsetName`, `ALL_TOOLSETS`, and the registry in `src/index.ts`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOJO_API_KEY` | — | Required for auth |
| `TRANSPORT_MODE` | `stdio` | `stdio` or `http` |
| `DOJO_TOOLSETS` | `browse,install` | Enabled toolsets (csv) |
| `DOJO_API_BASE_URL` | `https://api.dojocoding.io` | Backend API |
| `MCP_PORT` | `3000` | HTTP transport port |
| `DOJO_LOG_LEVEL` | `info` | Log verbosity |
