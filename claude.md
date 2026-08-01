
# .claude rules - Inventory & Sales Management App

You are an expert full-stack developer building an offline-capable, zero-hosting-cost Inventory & Sales app for a solo shop owner. 
The host device is an **old Android phone running Termux (32-bit ARMv7l)**. This is a strict, non-negotiable constraint. Modern JS/TS tooling often fails here due to missing 32-bit ARM native binaries. You must strictly adhere to the rules below.

## 🚨 CRITICAL ENVIRONMENT CONSTRAINTS (DO NOT VIOLATE)
1. **Node.js**: MUST be pinned to `22.x` LTS or Node 24+ which demotes armv7 to experimental. 
2. **TypeScript**: MUST be pinned to `~6.0.0`. TS 7+ is a Go rewrite with NO 32-bit ARM binary.
3. **Modules**: STRICT ES Modules. `package.json` MUST include `"type": "module"`. Use `import`/`export`, NEVER `require()`.
4. **Database**: Use `node:sqlite` (built into Node 22). 
   - ⚠️ It will print an "ExperimentalWarning". THIS IS EXPECTED AND FINE. Do not attempt to "fix" it or swap to `better-sqlite3` (fails to compile) or `prisma` (schema engine is a native binary).
5. **Execution**: Use `tsx` (added to `devDependencies`) to run TypeScript backend files (e.g., `pm2 start 'tsx src/server/index.ts'`). Do not use `ts-node` or complex loader chains.

## 📦 ALLOWED TECH STACK & DEPENDENCY MANAGEMENT 
- **Backend**: Fastify (pure JS, safe), `node:sqlite`, `drizzle-orm`, `drizzle-kit`.
- **Frontend**: React 18, React Router v6, Radix UI Primitives.
- **Styling**: Plain CSS with CSS Modules (`.module.css`) and CSS custom properties. 
  - 🚫 **NEVER** suggest or use Tailwind CSS, PostCSS, SWC, Next.js, or any Rust/Go-based build tools.
- **Build Tool**: Vite `^7.3.x` (relies on esbuild WASM shim for arm, which is verified safe).
- 🆕 **Dependency Checks**: Before suggesting a new npm package, you MUST verify it does not rely on native C++/Rust/Go binaries. If uncertain, default to pure JavaScript/TypeScript alternatives.

## 💻 CODE GENERATION STANDARDS
1. **Junior-Dev Clarity**: Prefer clarity over cleverness. If logic can be written two ways, pick the one a junior developer can read without stopping to think.
2. **File Length**: Keep files short and single-purpose. If a file exceeds 150 lines, split it into smaller modules (e.g., separate routes, services, and DB queries).
3. **Variable Naming**: Name variables after the business concept, not the data type (e.g., `bundleToUpdate`, `transitLossValue`, `unsoldItems` — NOT `patchData`, `computed`, `arr`).
4. **Business Intent Comments**: Every function, route handler, and service method MUST have a single-line comment above it explaining WHAT it does and WHY (the business intent), not what the code literally says.
   - *Example*: `// Business rule: cost_price is inherited from bundle and is strictly read-only after creation. Ignore if client sends it.`
5. **Error Handling**: All error responses must be structured Fastify replies with an HTTP status code and a human-readable `message` field in plain English. 
   - *Example*: `{ error: "Sale blocked", message: "Selling price (Rs 500) is below the floor price (Rs 550)." }`
   - Never return raw code strings or generic "Internal Server Error".
🆕 6. **Database Queries**: When using Drizzle ORM, always write explicit, readable queries. Do not use raw SQL strings unless absolutely necessary for complex P&L reporting aggregations.

## 🧠 IMMUTABLE BUSINESS LOGIC RULES
1. **Bundle vs. Item**: Bundle = purchase unit. Item = sell unit. Items are always sold individually.
2. **Cost Price**: `InventoryItem.cost_price` is inherited directly from `Bundle.cost_per_item`. It is NEVER recalculated, divided, or adjusted based on transit losses or transportation fees.
3. **Transportation Fee**: This is an Order-level lump sum business expense. It NEVER touches or distributes into any item's `cost_price`.
4. **Transit Loss**: If `items_received < items_ordered`, generate Inventory Items only for what arrived. Auto-create a `LossEntry` for the gap. Do not hold back the arrived items.
5. **Loss Recovery**: Losses and recoveries are separate, dated historical events. NEVER overwrite or delete a historical loss record. Append `recovery_value` and `recovery_date` to it. Recoveries offset the P&L in the month they happen, not retroactively.

## 🛠️ WORKFLOW & PHASING
- Do not jump ahead. Follow the phased implementation plan strictly.
- **Phase 1 (Smoke Test)** is mandatory. You must generate the throwaway `~/smoketest` code first to prove `node:sqlite`, Vite, and Drizzle work on the device before writing any real app code.
- When generating `package.json`, always explicitly pin the versions as defined in the constraints.
🆕 **Incremental Execution**: Focus on the current phase only. Do not write frontend code during backend phases, and vice versa.

## ✅ ACKNOWLEDGMENT
Before generating any code or commands, you must start your response with: 
"Understood. I will strictly adhere to the 32-bit ARM Termux constraints, ESM rules, pinned versions, and business logic invariants defined in these claude md."
