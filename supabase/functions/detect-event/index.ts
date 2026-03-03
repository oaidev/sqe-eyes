import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── AWS Signature V4 helpers (same as enroll-worker) ───────────────────────

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

// ─── PPE item mapping ───────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

const PPE_MAP: Record<string, string> = {
  FACE_COVER: "FACE_COVER",
  HEAD_COVER: "HEAD_COVER",
  HAND_COVER: "HAND_COVER",
};

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint can be called by camera pipeline (service-to-service) or authenticated user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { camera_id, image_url, image_base64, event_type } = await req.json();
    if (!camera_id || (!image_url && !image_base64)) {
      return new Response(JSON.stringify({ error: "camera_id and image_url or image_base64 required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const region = Deno.env.get("AWS_REGION") || "ap-southeast-1";
    const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID")!;
    const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
    const collectionId = "sqe-eyes-workers";
    const endpoint = `https://rekognition.${region}.amazonaws.com`;

    // Get image bytes
    let imageBytes: Uint8Array;
    if (image_base64) {
      const binary = atob(image_base64);
      imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
    } else {
      const imgRes = await fetch(image_url);
      imageBytes = new Uint8Array(await imgRes.arrayBuffer());
    }

    const imageB64 = uint8ToBase64(imageBytes);

    // 1. SearchFacesByImage to identify worker
    let workerId: string | null = null;
    let confidenceScore: number | null = null;

    try {
      const searchBody = JSON.stringify({
        CollectionId: collectionId,
        Image: { Bytes: imageB64 },
        MaxFaces: 1,
        FaceMatchThreshold: 80,
      });
      const searchHeaders = await signRequest("POST", endpoint, searchBody, region, accessKey, secretKey, "rekognition", "RekognitionService.SearchFacesByImage");
      const searchRes = await fetch(endpoint, { method: "POST", headers: searchHeaders, body: searchBody });
      const searchData = await searchRes.json();

      if (searchData.FaceMatches?.length > 0) {
        const match = searchData.FaceMatches[0];
        confidenceScore = match.Similarity / 100;
        const faceId = match.Face.FaceId;

        // Look up worker by face_id
        const { data: embedding } = await supabase
          .from("worker_face_embeddings")
          .select("worker_id")
          .eq("face_id", faceId)
          .limit(1)
          .single();

        if (embedding) workerId = embedding.worker_id;
      }
    } catch (_) { /* face search failed, continue with unknown */ }

    // Fetch worker details if identified
    let workerInfo: { nama: string; sid: string } | null = null;
    if (workerId) {
      const { data: w } = await supabase
        .from("workers")
        .select("nama, sid")
        .eq("id", workerId)
        .single();
      if (w) workerInfo = w;
    }

    // 2. DetectProtectiveEquipment for PPE check
    const ppeResults: Record<string, { detected: boolean; confidence: number }> = {};

    try {
      const ppeBody = JSON.stringify({
        Image: { Bytes: imageB64 },
        SummarizationAttributes: {
          MinConfidence: 70,
          RequiredEquipmentTypes: ["FACE_COVER", "HEAD_COVER", "HAND_COVER"],
        },
      });
      const ppeHeaders = await signRequest("POST", endpoint, ppeBody, region, accessKey, secretKey, "rekognition", "RekognitionService.DetectProtectiveEquipment");
      const ppeRes = await fetch(endpoint, { method: "POST", headers: ppeHeaders, body: ppeBody });
      const ppeData = await ppeRes.json();

      if (ppeData.Persons?.length > 0) {
        const person = ppeData.Persons[0];
        for (const bp of person.BodyParts || []) {
          for (const eq of bp.EquipmentDetections || []) {
            const type = eq.Type;
            if (type && PPE_MAP[type]) {
              ppeResults[PPE_MAP[type]] = {
                detected: eq.CoversBodyPart?.Value ?? false,
                confidence: eq.Confidence ?? 0,
              };
            }
          }
        }
      }
    } catch (_) { /* PPE detection failed */ }

    // Determine event type
    const detectedEventType = event_type || (workerId ? "MASUK" : "UNKNOWN");

    // 3. Create event record
    const { data: eventRecord, error: eventError } = await supabase
      .from("events")
      .insert({
        camera_id,
        worker_id: workerId,
        event_type: detectedEventType,
        confidence_score: confidenceScore,
        ppe_results: ppeResults,
        snapshot_url: image_url || null,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // 4. Check for violations and create alert if needed
    let alertCreated = false;
    const ppeViolation = Object.values(ppeResults).some((r) => !r.detected);
    const isUnknown = !workerId;

    if (ppeViolation || isUnknown) {
      const alertType = isUnknown ? "UNKNOWN_PERSON" : "APD_VIOLATION";
      await supabase.from("alerts").insert({
        event_id: eventRecord.id,
        alert_type: alertType,
      });
      alertCreated = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventRecord.id,
        worker_id: workerId,
        worker: workerInfo,
        event_type: detectedEventType,
        confidence_score: confidenceScore,
        ppe_results: ppeResults,
        alert_created: alertCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
