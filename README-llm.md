LLM parsing and schema validation

This project includes an optional LLM-based extraction step for resume parsing. The LLM step is gated both by the process-level flag and a per-profile opt-in flag.

Environment variables (server/worker):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- USE_LLM=1 to enable LLM calls in the worker
- OPENAI_API_KEY (required if USE_LLM=1)
- LLM_MODEL (optional, default: gpt-5)

Files:
- `scripts/llm-schema.json` — JSON Schema for expected structured output from the LLM.
- `scripts/test-llm-validate.js` — simple local harness to validate example LLM outputs using AJV.
- `scripts/parsing-worker.js` — worker now validates LLM JSON output and records `llm_valid` and `llm_validation_errors` in `parsed_documents.parsed_json`.

Quick test locally:

```powershell
# install dependencies
pnpm install
# run the schema test
pnpm run test:llm-schema
```
