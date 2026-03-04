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

// ─── Helpers ────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

// AWS Rekognition only supports these 3 equipment types natively
const PPE_MAP: Record<string, string> = {
  FACE_COVER: "FACE_COVER",
  HEAD_COVER: "HEAD_COVER",
  HAND_COVER: "HAND_COVER",
};

const PPE_LABEL: Record<string, string> = {
  HEAD_COVER: "Helm",
  HAND_COVER: "Sarung Tangan",
  FACE_COVER: "Masker",
  SAFETY_SHOES: "Sepatu Safety",
  REFLECTIVE_VEST: "Rompi Reflektif",
};

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { camera_id, image_url, image_base64, event_type } = await req.json();

    // camera_id is now optional — simulation mode when absent
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const isSimulation = !camera_id;

    const region = Deno.env.get("AWS_REGION") || "ap-southeast-1";
    const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID")!;
    const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
    const collectionId = "sqe-eyes-workers";
    const endpoint = `https://rekognition.${region}.amazonaws.com`;

    // Get camera info if camera_id provided
    let cameraInfo: { zone_id: string; point_type: string } | null = null;
    if (camera_id) {
      const { data: camData, error: camErr } = await supabase
        .from("cameras")
        .select("zone_id, point_type")
        .eq("id", camera_id)
        .single();

      if (camErr || !camData) {
        return new Response(JSON.stringify({ error: "Camera not found" }), {
          status: 404, headers: corsHeaders,
        });
      }
      cameraInfo = camData;
    }

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

    // Upload image to storage for evidence
    let snapshotUrl: string | null = image_url || null;
    if (image_base64) {
      try {
        const fileName = `${crypto.randomUUID()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("event-snapshots")
          .upload(fileName, imageBytes, { contentType: "image/jpeg", upsert: false });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("event-snapshots")
            .getPublicUrl(fileName);
          snapshotUrl = urlData.publicUrl;
        } else {
          console.error("Snapshot upload failed:", uploadErr);
        }
      } catch (err) {
        console.error("Snapshot upload error:", err);
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // 1. SearchFacesByImage to identify worker
    // ──────────────────────────────────────────────────────────────────────
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

        const { data: embedding } = await supabase
          .from("worker_face_embeddings")
          .select("worker_id")
          .eq("face_id", faceId)
          .limit(1)
          .single();

        if (embedding) workerId = embedding.worker_id;
      }
    } catch (err) {
      console.error("Face search failed:", err);
    }

    // Fetch worker details if identified
    let workerInfo: { nama: string; sid: string; jabatan: string } | null = null;
    if (workerId) {
      const { data: w } = await supabase
        .from("workers")
        .select("nama, sid, jabatan")
        .eq("id", workerId)
        .single();
      if (w) workerInfo = w;
    }

    // ──────────────────────────────────────────────────────────────────────
    // 2. DetectProtectiveEquipment for PPE check
    // ──────────────────────────────────────────────────────────────────────
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

      console.log("PPE raw response:", JSON.stringify(ppeData).slice(0, 500));

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
    } catch (err) {
      console.error("PPE detection failed:", err);
    }

    // ──────────────────────────────────────────────────────────────────────
    // 3. Query zone PPE rules and validate (skip in simulation mode)
    // ──────────────────────────────────────────────────────────────────────
    const violations: string[] = [];
    let zoneRulesApplied = false;

    if (cameraInfo) {
      try {
        const { data: zoneRules, error: rulesErr } = await supabase
          .from("zone_ppe_rules")
          .select("ppe_item, is_required, jabatan")
          .eq("zone_id", cameraInfo.zone_id)
          .eq("is_required", true);

        if (!rulesErr && zoneRules && zoneRules.length > 0) {
          zoneRulesApplied = true;

          const applicableRules = zoneRules.filter((rule) => {
            if (!rule.jabatan) return true;
            if (workerInfo && rule.jabatan === workerInfo.jabatan) return true;
            if (!workerInfo) return true;
            return false;
          });

          const requiredItems = [...new Set(applicableRules.map((r) => r.ppe_item))];

          for (const item of requiredItems) {
            const result = ppeResults[item];
            if (!result) {
              ppeResults[item] = { detected: false, confidence: 0 };
              violations.push(PPE_LABEL[item] || item);
            } else if (!result.detected) {
              violations.push(PPE_LABEL[item] || item);
            }
          }
        }
      } catch (err) {
        console.error("Zone PPE rules query failed:", err);
      }
    }

    // Determine event type
    const detectedEventType = event_type || (workerId ? "MASUK" : "UNKNOWN");

    // ──────────────────────────────────────────────────────────────────────
    // 4. Create event record
    // ──────────────────────────────────────────────────────────────────────
    const { data: eventRecord, error: eventError } = await supabase
      .from("events")
      .insert({
        camera_id: camera_id || null,
        worker_id: workerId,
        event_type: detectedEventType,
        confidence_score: confidenceScore,
        ppe_results: ppeResults,
        snapshot_url: snapshotUrl,
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // ──────────────────────────────────────────────────────────────────────
    // 5. Create alerts based on violations
    // ──────────────────────────────────────────────────────────────────────
    let alertId: string | null = null;
    let alertType: string | null = null;
    let alertCreated = false;

    const isUnknown = !workerId;

    if (isUnknown) {
      alertType = "UNKNOWN_PERSON";
      const { data: alert } = await supabase
        .from("alerts")
        .insert({
          event_id: eventRecord.id,
          alert_type: "UNKNOWN_PERSON",
          notes: "Orang tidak dikenal terdeteksi di area kerja.",
        })
        .select("id")
        .single();
      if (alert) alertId = alert.id;
      alertCreated = true;
    } else if (violations.length > 0) {
      alertType = "APD_VIOLATION";
      const violationNotes = `Pelanggaran APD: ${violations.join(", ")} tidak terdeteksi/tidak sesuai.`;
      const { data: alert } = await supabase
        .from("alerts")
        .insert({
          event_id: eventRecord.id,
          alert_type: "APD_VIOLATION",
          notes: violationNotes,
        })
        .select("id")
        .single();
      if (alert) alertId = alert.id;
      alertCreated = true;
    }

    // Check unauthorized exit (only when camera info available)
    if (workerId && cameraInfo && detectedEventType === "KELUAR" && cameraInfo.point_type === "exit") {
      const { data: permits } = await supabase
        .from("exit_permits")
        .select("id")
        .eq("worker_id", workerId)
        .eq("status", "APPROVED")
        .gte("valid_until", new Date().toISOString())
        .lte("valid_from", new Date().toISOString())
        .limit(1);

      if (!permits || permits.length === 0) {
        alertType = "UNAUTHORIZED_EXIT";
        const { data: alert } = await supabase
          .from("alerts")
          .insert({
            event_id: eventRecord.id,
            alert_type: "UNAUTHORIZED_EXIT",
            notes: `${workerInfo?.nama || "Pekerja"} mencoba keluar tanpa izin yang valid.`,
          })
          .select("id")
          .single();
        if (alert) alertId = alert.id;
        alertCreated = true;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventRecord.id,
        worker_id: workerId,
        worker: workerInfo ? { nama: workerInfo.nama, sid: workerInfo.sid } : null,
        event_type: detectedEventType,
        confidence_score: confidenceScore,
        ppe_results: ppeResults,
        alert_created: alertCreated,
        alert_id: alertId,
        alert_type: alertType,
        violations,
        zone_rules_applied: zoneRulesApplied,
        snapshot_url: snapshotUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detect-event error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
