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

// AWS Rekognition PPE API supports FACE_COVER, HEAD_COVER, HAND_COVER
// We remap FACE_COVER → SAFETY_GLASSES (kacamata/goggle detection)
const PPE_MAP: Record<string, string> = {
  FACE_COVER: "SAFETY_GLASSES",
  HEAD_COVER: "HEAD_COVER",
  HAND_COVER: "HAND_COVER",
};

const PPE_LABEL: Record<string, string> = {
  HEAD_COVER: "Helm",
  HAND_COVER: "Sarung Tangan",
  SAFETY_GLASSES: "Kacamata Safety",
  SAFETY_SHOES: "Sepatu Safety",
  REFLECTIVE_VEST: "Rompi Reflektif",
};

// Labels from DetectLabels API that map to our PPE items
const SHOE_LABELS = ["boot", "shoe", "footwear", "safety shoe", "work boot", "steel-toe", "steel toe", "protective footwear", "cowboy boot", "hiking boot", "sneaker", "rubber boot", "clothing", "apparel"];
const VEST_LABELS = ["vest", "high-vis", "high visibility", "reflective vest", "safety vest", "life jacket", "jacket", "workwear", "uniform", "overall", "coverall", "outerwear", "fluorescent"];

// Bounding box overlap helper — checks if two bounding boxes overlap significantly
function bboxOverlap(
  a: { Left: number; Top: number; Width: number; Height: number },
  b: { Left: number; Top: number; Width: number; Height: number }
): number {
  const x1 = Math.max(a.Left, b.Left);
  const y1 = Math.max(a.Top, b.Top);
  const x2 = Math.min(a.Left + a.Width, b.Left + b.Width);
  const y2 = Math.min(a.Top + a.Height, b.Top + b.Height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = a.Width * a.Height;
  const areaB = b.Width * b.Height;
  return intersection / Math.min(areaA, areaB);
}

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

    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 required" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const region = Deno.env.get("AWS_REGION") || "ap-southeast-1";
    const accessKey = Deno.env.get("AWS_ACCESS_KEY_ID")!;
    const secretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
    const collectionId = "sqe-eyes-workers";
    const endpoint = `https://rekognition.${region}.amazonaws.com`;

    // Get camera info if camera_id provided
    let cameraInfo: { zone_id: string; point_type: string; jenis_pelanggaran: string } | null = null;
    if (camera_id) {
      const { data: camData, error: camErr } = await supabase
        .from("cameras")
        .select("zone_id, point_type, jenis_pelanggaran")
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
    // 1. DetectFaces — get all face bounding boxes
    // ──────────────────────────────────────────────────────────────────────
    interface FaceInfo {
      boundingBox: { Left: number; Top: number; Width: number; Height: number };
      workerId: string | null;
      workerInfo: { nama: string; sid: string; jabatan: string } | null;
      confidenceScore: number | null;
    }

    const faces: FaceInfo[] = [];

    try {
      const detectFacesBody = JSON.stringify({
        Image: { Bytes: imageB64 },
        Attributes: ["DEFAULT"],
      });
      const detectFacesHeaders = await signRequest("POST", endpoint, detectFacesBody, region, accessKey, secretKey, "rekognition", "RekognitionService.DetectFaces");
      const detectFacesRes = await fetch(endpoint, { method: "POST", headers: detectFacesHeaders, body: detectFacesBody });
      const detectFacesData = await detectFacesRes.json();

      console.log(`DetectFaces found ${detectFacesData.FaceDetails?.length || 0} faces`);

      if (detectFacesData.FaceDetails?.length > 0) {
        for (const face of detectFacesData.FaceDetails) {
          faces.push({
            boundingBox: face.BoundingBox,
            workerId: null,
            workerInfo: null,
            confidenceScore: null,
          });
        }
      }
    } catch (err) {
      console.error("DetectFaces failed:", err);
    }

    // ──────────────────────────────────────────────────────────────────────
    // 2. SearchFacesByImage — identify the largest face (AWS limitation)
    //    Then match to detected faces via bounding box overlap
    // ──────────────────────────────────────────────────────────────────────
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
        const confidence = match.Similarity / 100;
        const faceId = match.Face.FaceId;
        const searchedBBox = searchData.SearchedFaceBoundingBox;

        // Look up worker from face_id
        const { data: embedding } = await supabase
          .from("worker_face_embeddings")
          .select("worker_id")
          .eq("face_id", faceId)
          .limit(1)
          .single();

        if (embedding) {
          const { data: w } = await supabase
            .from("workers")
            .select("nama, sid, jabatan")
            .eq("id", embedding.worker_id)
            .single();

          // Match to closest detected face by bounding box overlap
          if (searchedBBox && faces.length > 0) {
            let bestIdx = 0;
            let bestOverlap = 0;
            for (let i = 0; i < faces.length; i++) {
              const overlap = bboxOverlap(searchedBBox, faces[i].boundingBox);
              if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestIdx = i;
              }
            }
            faces[bestIdx].workerId = embedding.worker_id;
            faces[bestIdx].workerInfo = w || null;
            faces[bestIdx].confidenceScore = confidence;
          } else if (faces.length > 0) {
            // Fallback: assign to first face
            faces[0].workerId = embedding.worker_id;
            faces[0].workerInfo = w || null;
            faces[0].confidenceScore = confidence;
          }
        }
      }
    } catch (err) {
      console.error("Face search failed:", err);
    }

    // If no faces detected at all, create a single "unknown" entry
    if (faces.length === 0) {
      faces.push({
        boundingBox: { Left: 0, Top: 0, Width: 1, Height: 1 },
        workerId: null,
        workerInfo: null,
        confidenceScore: null,
      });
    }

    // ──────────────────────────────────────────────────────────────────────
    // 3. DetectProtectiveEquipment — get PPE per person
    // ──────────────────────────────────────────────────────────────────────
    interface PersonPPE {
      personIdx: number;
      boundingBox: { Left: number; Top: number; Width: number; Height: number } | null;
      ppeResults: Record<string, { detected: boolean; confidence: number }>;
    }

    const personsPPE: PersonPPE[] = [];

    try {
      const ppeBody = JSON.stringify({
        Image: { Bytes: imageB64 },
        SummarizationAttributes: {
          MinConfidence: 50,
          RequiredEquipmentTypes: ["FACE_COVER", "HEAD_COVER", "HAND_COVER"],
        },
      });
      const ppeHeaders = await signRequest("POST", endpoint, ppeBody, region, accessKey, secretKey, "rekognition", "RekognitionService.DetectProtectiveEquipment");
      const ppeRes = await fetch(endpoint, { method: "POST", headers: ppeHeaders, body: ppeBody });
      const ppeData = await ppeRes.json();

      console.log(`PPE detection found ${ppeData.Persons?.length || 0} persons`);
      console.log("PPE raw response:", JSON.stringify(ppeData).slice(0, 500));

      if (ppeData.Persons?.length > 0) {
        for (let pIdx = 0; pIdx < ppeData.Persons.length; pIdx++) {
          const person = ppeData.Persons[pIdx];
          const ppeResults: Record<string, { detected: boolean; confidence: number }> = {};

          for (const bp of person.BodyParts || []) {
            const eqSummary = bp.EquipmentDetections?.map((e: any) => ({ type: e.Type, conf: e.Confidence, covers: e.CoversBodyPart }));
            console.log(`  Person ${pIdx} body part: ${bp.Name}, confidence: ${bp.Confidence?.toFixed(1)}%, equipment: ${JSON.stringify(eqSummary)}`);
            
            // Log when body part is clearly visible but no equipment found
            if (bp.Confidence > 90 && (!bp.EquipmentDetections || bp.EquipmentDetections.length === 0)) {
              console.log(`  ⚠️ Person ${pIdx}: ${bp.Name} visible (${bp.Confidence?.toFixed(1)}%) but NO equipment detected — item likely NOT WORN`);
            }
            
            for (const eq of bp.EquipmentDetections || []) {
              const type = eq.Type;
              if (type && PPE_MAP[type]) {
                // Mark as detected if equipment confidence >= 50%, regardless of CoversBodyPart.Value
                const eqConfidence = eq.Confidence ?? 0;
                const coversValue = eq.CoversBodyPart?.Value ?? false;
                const detected = eqConfidence >= 50 || coversValue;
                ppeResults[PPE_MAP[type]] = {
                  detected,
                  confidence: eqConfidence,
                };
              }
            }
          }

          personsPPE.push({
            personIdx: pIdx,
            boundingBox: person.BoundingBox || null,
            ppeResults,
          });
        }
      }
    } catch (err) {
      console.error("PPE detection failed:", err);
    }

    // ──────────────────────────────────────────────────────────────────────
    // 3b. DetectLabels for SAFETY_SHOES and REFLECTIVE_VEST (global)
    // ──────────────────────────────────────────────────────────────────────
    let globalShoeDetected = false;
    let globalShoeConfidence = 0;
    let globalVestDetected = false;
    let globalVestConfidence = 0;

    try {
      const labelsBody = JSON.stringify({
        Image: { Bytes: imageB64 },
        MaxLabels: 50,
        MinConfidence: 30,
      });
      const labelsHeaders = await signRequest("POST", endpoint, labelsBody, region, accessKey, secretKey, "rekognition", "RekognitionService.DetectLabels");
      const labelsRes = await fetch(endpoint, { method: "POST", headers: labelsHeaders, body: labelsBody });
      const labelsData = await labelsRes.json();

      console.log("DetectLabels response:", JSON.stringify(labelsData).slice(0, 500));

      const detectedLabels = (labelsData.Labels || []).map((l: any) => ({
        name: l.Name?.toLowerCase() || "",
        confidence: l.Confidence || 0,
      }));

      const shoeLabel = detectedLabels.find((l: any) => SHOE_LABELS.some(s => l.name.includes(s)));
      if (shoeLabel) {
        globalShoeDetected = true;
        globalShoeConfidence = shoeLabel.confidence;
      }

      const vestLabel = detectedLabels.find((l: any) => VEST_LABELS.some(v => l.name.includes(v)));
      if (vestLabel) {
        globalVestDetected = true;
        globalVestConfidence = vestLabel.confidence;
      }
    } catch (err) {
      console.error("DetectLabels failed:", err);
    }

    // ──────────────────────────────────────────────────────────────────────
    // 4. Merge faces + PPE persons → build per-person results
    // ──────────────────────────────────────────────────────────────────────

    // Match PPE persons to detected faces by bounding box overlap
    // Each face gets the PPE results of its best-matching PPE person
    interface PersonResult {
      workerId: string | null;
      workerInfo: { nama: string; sid: string; jabatan: string } | null;
      confidenceScore: number | null;
      ppeResults: Record<string, { detected: boolean; confidence: number }>;
      personIndex: number;
      boundingBox: { Left: number; Top: number; Width: number; Height: number } | null;
    }

    const results: PersonResult[] = [];

    if (personsPPE.length > 0) {
      // Use PPE persons as the primary list (they represent detected people)
      const usedFaces = new Set<number>();

      for (const ppePerson of personsPPE) {
        let bestFaceIdx = -1;
        let bestOverlap = 0;

        // Match PPE person to a face
        if (ppePerson.boundingBox) {
          for (let fi = 0; fi < faces.length; fi++) {
            if (usedFaces.has(fi)) continue;
            const overlap = bboxOverlap(ppePerson.boundingBox, faces[fi].boundingBox);
            if (overlap > bestOverlap) {
              bestOverlap = overlap;
              bestFaceIdx = fi;
            }
          }
        }

        const matchedFace = bestFaceIdx >= 0 ? faces[bestFaceIdx] : null;
        if (bestFaceIdx >= 0) usedFaces.add(bestFaceIdx);

        // Add global shoe/vest detection to each person's PPE
        const mergedPPE = { ...ppePerson.ppeResults };
        if (globalShoeDetected && !mergedPPE["SAFETY_SHOES"]) {
          mergedPPE["SAFETY_SHOES"] = { detected: true, confidence: globalShoeConfidence };
        }
        if (globalVestDetected && !mergedPPE["REFLECTIVE_VEST"]) {
          mergedPPE["REFLECTIVE_VEST"] = { detected: true, confidence: globalVestConfidence };
        }

        results.push({
          workerId: matchedFace?.workerId || null,
          workerInfo: matchedFace?.workerInfo || null,
          confidenceScore: matchedFace?.confidenceScore || null,
          ppeResults: mergedPPE,
          personIndex: ppePerson.personIdx,
          boundingBox: ppePerson.boundingBox || null,
        });
      }
    } else {
      // No PPE persons detected — use faces only
      for (const face of faces) {
        const mergedPPE: Record<string, { detected: boolean; confidence: number }> = {};
        if (globalShoeDetected) mergedPPE["SAFETY_SHOES"] = { detected: true, confidence: globalShoeConfidence };
        if (globalVestDetected) mergedPPE["REFLECTIVE_VEST"] = { detected: true, confidence: globalVestConfidence };

        results.push({
          workerId: face.workerId,
          workerInfo: face.workerInfo,
          confidenceScore: face.confidenceScore,
          ppeResults: mergedPPE,
          personIndex: 0,
          boundingBox: face.boundingBox || null,
        });
      }
    }

    console.log(`Total persons to process: ${results.length}`);

    // ──────────────────────────────────────────────────────────────────────
    // 5. Get zone PPE rules (once, shared for all persons)
    // ──────────────────────────────────────────────────────────────────────
    let zoneRules: { ppe_item: string; is_required: boolean; jabatan: string | null }[] = [];
    let zoneRulesApplied = false;

    if (cameraInfo) {
      try {
        const { data, error } = await supabase
          .from("zone_ppe_rules")
          .select("ppe_item, is_required, jabatan")
          .eq("zone_id", cameraInfo.zone_id)
          .eq("is_required", true);

        if (!error && data && data.length > 0) {
          zoneRules = data;
          zoneRulesApplied = true;
        }
      } catch (err) {
        console.error("Zone PPE rules query failed:", err);
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // 6. For each person: apply zone rules, create event + alert
    // ──────────────────────────────────────────────────────────────────────
    const allResults: any[] = [];

    for (const person of results) {
      const violations: string[] = [];

      // Apply zone rules
      if (zoneRulesApplied) {
        const applicableRules = zoneRules.filter((rule) => {
          if (!rule.jabatan) return true;
          if (person.workerInfo && rule.jabatan === person.workerInfo.jabatan) return true;
          if (!person.workerInfo) return true;
          return false;
        });

        const requiredItems = [...new Set(applicableRules.map((r) => {
          // Normalize: if zone rule says FACE_COVER, check as SAFETY_GLASSES
          const item = r.ppe_item;
          return PPE_MAP[item] || item;
        }))];

        for (const item of requiredItems) {
          const result = person.ppeResults[item];
          if (!result) {
            person.ppeResults[item] = { detected: false, confidence: 0 };
            violations.push(PPE_LABEL[item] || item);
          } else if (!result.detected) {
            violations.push(PPE_LABEL[item] || item);
          }
        }
      }

      // Determine event type
      const detectedEventType = event_type || (person.workerId ? "MASUK" : "UNKNOWN");

      // Create event record
      const { data: eventRecord, error: eventError } = await supabase
        .from("events")
        .insert({
          camera_id: camera_id || null,
          worker_id: person.workerId,
          event_type: detectedEventType,
          confidence_score: person.confidenceScore,
          ppe_results: person.ppeResults,
          snapshot_url: snapshotUrl,
        })
        .select()
        .single();

      if (eventError) {
        console.error("Event insert error:", eventError);
        continue;
      }

      // Create alerts
      let alertId: string | null = null;
      let alertType: string | null = null;
      let alertCreated = false;
      const isUnknown = !person.workerId;

      if (isUnknown) {
        alertType = "UNKNOWN_PERSON";
        const { data: alert } = await supabase
          .from("alerts")
          .insert({
            event_id: eventRecord.id,
            alert_type: "UNKNOWN_PERSON",
            notes: `Orang tidak dikenal terdeteksi di area kerja (Person #${person.personIndex + 1}).`,
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

      // Check unauthorized exit
      if (person.workerId && cameraInfo && detectedEventType === "KELUAR" && cameraInfo.point_type === "exit") {
        const { data: permits } = await supabase
          .from("exit_permits")
          .select("id")
          .eq("worker_id", person.workerId)
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
              notes: `${person.workerInfo?.nama || "Pekerja"} mencoba keluar tanpa izin yang valid.`,
            })
            .select("id")
            .single();
          if (alert) alertId = alert.id;
          alertCreated = true;
        }
      }

      allResults.push({
        event_id: eventRecord.id,
        worker_id: person.workerId,
        worker: person.workerInfo,
        event_type: detectedEventType,
        confidence_score: person.confidenceScore,
        ppe_results: person.ppeResults,
        alert_created: alertCreated,
        alert_id: alertId,
        alert_type: alertType,
        violations,
        person_index: person.personIndex,
        bounding_box: person.boundingBox,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        persons_detected: results.length,
        results: allResults,
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
