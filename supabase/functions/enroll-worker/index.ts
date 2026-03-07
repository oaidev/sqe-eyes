import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Cosmos API helpers ─────────────────────────────────────────────────────

async function cosmosLogin(apiUrl: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cosmos login failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token;
}

async function getCosmosConfig(supabase: any) {
  const keys = ["cosmos_api_url", "cosmos_api_username", "cosmos_api_password"];
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", keys);
  if (error) throw new Error(`Failed to read system_config: ${error.message}`);
  const config: Record<string, string> = {};
  for (const row of data || []) {
    config[row.key] = typeof row.value === "string" ? row.value : JSON.parse(JSON.stringify(row.value)).replace(/^"|"$/g, "");
  }
  if (!config.cosmos_api_url) throw new Error("cosmos_api_url not configured");
  return {
    apiUrl: config.cosmos_api_url.replace(/\/+$/, ""),
    username: config.cosmos_api_username || "admin",
    password: config.cosmos_api_password || "admin",
  };
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Service role client for DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action = "enroll", worker_id, photo_urls, cosmos_face_id } = body;

    // Get Cosmos config
    const cosmosConfig = await getCosmosConfig(supabase);
    const cosmosToken = await cosmosLogin(cosmosConfig.apiUrl, cosmosConfig.username, cosmosConfig.password);

    // ─── ACTION: list ───────────────────────────────────────────────────
    if (action === "list") {
      const res = await fetch(`${cosmosConfig.apiUrl}/api/v1/faces`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${cosmosToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to list faces");
      return new Response(JSON.stringify({ success: true, faces: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: delete ─────────────────────────────────────────────────
    if (action === "delete") {
      if (!cosmos_face_id) {
        return new Response(JSON.stringify({ error: "cosmos_face_id required" }), { status: 400, headers: corsHeaders });
      }
      const res = await fetch(`${cosmosConfig.apiUrl}/api/v1/faces/${cosmos_face_id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${cosmosToken}`,
        },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Delete failed: ${text}`);

      // Remove from DB
      if (worker_id) {
        await supabase
          .from("worker_face_embeddings")
          .delete()
          .eq("worker_id", worker_id)
          .eq("face_id", String(cosmos_face_id));

        // Check remaining embeddings
        const { data: remaining } = await supabase
          .from("worker_face_embeddings")
          .select("id")
          .eq("worker_id", worker_id);
        if (!remaining || remaining.length === 0) {
          await supabase.from("workers").update({ enrollment_status: "NOT_ENROLLED" }).eq("id", worker_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: enroll (default) ───────────────────────────────────────
    if (!worker_id || !photo_urls?.length) {
      return new Response(JSON.stringify({ error: "worker_id and photo_urls required" }), { status: 400, headers: corsHeaders });
    }

    // Get worker info
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("nama, sid")
      .eq("id", worker_id)
      .single();
    if (workerErr || !worker) {
      return new Response(JSON.stringify({ error: "Worker not found" }), { status: 404, headers: corsHeaders });
    }

    // Update status to ENROLLING
    await supabase.from("workers").update({ enrollment_status: "ENROLLING" }).eq("id", worker_id);

    const results: Array<{ photo_url: string; face_id: string | null; quality_score: number | null; error?: string }> = [];

    for (const photoUrl of photo_urls) {
      try {
        // Fetch the image bytes
        const imgRes = await fetch(photoUrl);
        const imgBlob = await imgRes.blob();

        // Build multipart form data for Cosmos
        const formData = new FormData();
        formData.append("name", worker.nama);
        formData.append("employee_id", worker.sid);
        formData.append("photo", imgBlob, "photo.jpg");

        const faceRes = await fetch(`${cosmosConfig.apiUrl}/api/v1/faces`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${cosmosToken}`,
          },
          body: formData,
        });

        const faceData = await faceRes.json();

        if (!faceRes.ok) {
          throw new Error(faceData.detail || faceData.message || JSON.stringify(faceData));
        }

        const faceId = String(faceData.id || faceData.face_id || "");
        const qualityScore = faceData.confidence || faceData.quality_score || null;

        // Store in DB
        await supabase.from("worker_face_embeddings").insert({
          worker_id,
          photo_url: photoUrl,
          face_id: faceId,
          quality_score: qualityScore,
        });

        results.push({ photo_url: photoUrl, face_id: faceId, quality_score: qualityScore });
      } catch (e) {
        results.push({ photo_url: photoUrl, face_id: null, quality_score: null, error: e.message });
      }
    }

    // Update enrollment status
    const hasSuccess = results.some((r) => r.face_id);
    await supabase.from("workers").update({
      enrollment_status: hasSuccess ? "ENROLLED" : "FAILED",
    }).eq("id", worker_id);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
