import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── AWS Signature V4 helpers ───────────────────────────────────────────────

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: string | Uint8Array): Promise<string> {
  const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", encoded));
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
}

async function getSignatureKey(secret: string, date: string, region: string, service: string) {
  let k: ArrayBuffer = await hmacSha256(new TextEncoder().encode("AWS4" + secret), date);
  k = await hmacSha256(k, region);
  k = await hmacSha256(k, service);
  k = await hmacSha256(k, "aws4_request");
  return k;
}

async function signRequest(
  method: string,
  url: string,
  body: string,
  region: string,
  accessKey: string,
  secretKey: string,
  service: string,
  target: string
) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const u = new URL(url);

  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.1",
    host: u.host,
    "x-amz-date": amzDate,
    "x-amz-target": target,
  };

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const payloadHash = await sha256(body);

  const canonicalRequest = [method, u.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256(canonicalRequest)].join("\n");

  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  headers["Authorization"] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return headers;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
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

    const { worker_id, photo_urls } = await req.json();
    if (!worker_id || !photo_urls?.length) {
      return new Response(JSON.stringify({ error: "worker_id and photo_urls required" }), { status: 400, headers: corsHeaders });
    }

    const region = Deno.env.get("AWS_REGION") || "ap-southeast-1";
    const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID")!;
    const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
    const collectionId = "sqe-eyes-workers";
    const endpoint = `https://rekognition.${region}.amazonaws.com`;

    // Update status to ENROLLING
    await supabase.from("workers").update({ enrollment_status: "ENROLLING" }).eq("id", worker_id);

    // Ensure collection exists (ignore AlreadyExists error)
    try {
      const createBody = JSON.stringify({ CollectionId: collectionId });
      const createHeaders = await signRequest("POST", endpoint, createBody, region, accessKey, secretKey, "rekognition", "RekognitionService.CreateCollection");
      const createRes = await fetch(endpoint, { method: "POST", headers: createHeaders, body: createBody });
      await createRes.text(); // consume
    } catch (_) { /* collection may already exist */ }

    const results: Array<{ photo_url: string; face_id: string | null; quality_score: number | null; error?: string }> = [];

    for (const photoUrl of photo_urls) {
      try {
        // Fetch the image bytes
        const imgRes = await fetch(photoUrl);
        const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

        // Call IndexFaces
        const indexBody = JSON.stringify({
          CollectionId: collectionId,
          Image: { Bytes: uint8ToBase64(imgBytes) },
          ExternalImageId: worker_id,
          MaxFaces: 1,
          QualityFilter: "AUTO",
        });
        const indexHeaders = await signRequest("POST", endpoint, indexBody, region, accessKey, secretKey, "rekognition", "RekognitionService.IndexFaces");
        const indexRes = await fetch(endpoint, { method: "POST", headers: indexHeaders, body: indexBody });
        const indexData = await indexRes.json();

        if (indexData.FaceRecords?.length > 0) {
          const face = indexData.FaceRecords[0];
          const faceId = face.Face.FaceId;
          const qualityScore = face.FaceDetail?.Confidence || null;

          // Store embedding
          await supabase.from("worker_face_embeddings").insert({
            worker_id,
            photo_url: photoUrl,
            face_id: faceId,
            quality_score: qualityScore,
          });

          results.push({ photo_url: photoUrl, face_id: faceId, quality_score: qualityScore });
        } else {
          results.push({ photo_url: photoUrl, face_id: null, quality_score: null, error: "No face detected" });
        }
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
