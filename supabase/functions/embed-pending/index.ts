// Sweeps rows whose embedding is NULL and fills them with a Gemini embedding.
//
// Invoked on a schedule (and manually for testing). Uses the service-role key so
// it can read/write every user's rows. The Gemini key is a function secret:
//   supabase secrets set GEMINI_API_KEY=...
//
// Deploy: supabase functions deploy embed-pending
// Test:   curl -X POST "$SUPABASE_URL/functions/v1/embed-pending" \
//              -H "Authorization: Bearer $SUPABASE_ANON_KEY"

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_MODEL = "models/gemini-embedding-001";
const OUTPUT_DIM = 768;
const BATCH = 100; // rows per table per invocation (also Gemini's batch cap)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

type TableConfig = {
  table: "goals" | "tasks" | "habits";
  columns: string;
  text: (row: Record<string, unknown>) => string;
};

const TABLES: TableConfig[] = [
  {
    table: "goals",
    columns: "id, title, note",
    text: (row) => [row.title, row.note].filter(Boolean).join("\n"),
  },
  { table: "tasks", columns: "id, title", text: (row) => String(row.title ?? "") },
  { table: "habits", columns: "id, title", text: (row) => String(row.title ?? "") },
];

// L2-normalize so cosine distance is meaningful (required for gemini-embedding
// outputs below 3072 dimensions).
function normalize(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return values.map((v) => v / norm);
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`;
  const body = {
    requests: texts.map((text) => ({
      model: GEMINI_MODEL,
      content: { parts: [{ text }] },
      taskType: "SEMANTIC_SIMILARITY",
      outputDimensionality: OUTPUT_DIM,
    })),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (json.embeddings ?? []).map((e: { values: number[] }) => normalize(e.values));
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const summary: Record<string, number> = {};

  try {
    for (const config of TABLES) {
      const { data: rows, error } = await supabase
        .from(config.table)
        .select(config.columns)
        .is("embedding", null)
        .limit(BATCH);
      if (error) throw error;
      if (!rows || rows.length === 0) {
        summary[config.table] = 0;
        continue;
      }

      const texts = rows.map((row) => config.text(row as Record<string, unknown>).trim() || "(빈 항목)");
      const vectors = await embedBatch(texts);

      let embedded = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const vector = vectors[i];
        if (!vector) continue;
        const { error: updateError } = await supabase
          .from(config.table)
          .update({ embedding: `[${vector.join(",")}]` })
          .eq("id", (rows[i] as { id: string }).id);
        if (updateError) throw updateError;
        embedded += 1;
      }
      summary[config.table] = embedded;
    }

    return Response.json({ ok: true, embedded: summary });
  } catch (error) {
    console.error("embed-pending failed", error);
    return Response.json({ ok: false, error: String(error), embedded: summary }, { status: 500 });
  }
});
