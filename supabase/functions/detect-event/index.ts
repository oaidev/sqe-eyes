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
    throw new Error(`Cosmos login failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.token;
}

async function cosmosInfer(apiUrl: string, token: string, imageBytes: Uint8Array, filename = "image.jpg"): Promise<any> {
  const formData = new FormData();
  const blob = new Blob([imageBytes], { type: "image/jpeg" });
  formData.append("image", blob, filename);

  const res = await fetch(`${apiUrl}/api/v1/infer`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cosmos infer failed (${res.status}): ${text}`);
  }
  return await res.json();
}

// ─── Image dimension parsing ────────────────────────────────────────────────

function getImageDimensions(bytes: Uint8Array): { w: number; h: number } {
  // Try JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    let i = 2;
    while (i < bytes.length - 1) {
      if (bytes[i] !== 0xFF) break;
      const marker = bytes[i + 1];
      // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
      if (
        (marker >= 0xC0 && marker <= 0xC3) ||
        (marker >= 0xC5 && marker <= 0xC7) ||
        (marker >= 0xC9 && marker <= 0xCB) ||
        (marker >= 0xCD && marker <= 0xCF)
      ) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6];
        const w = (bytes[i + 7] << 8) | bytes[i + 8];
        if (w > 0 && h > 0) return { w, h };
      }
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      i += 2 + len;
    }
  }

  // Try PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
    const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
    if (w > 0 && h > 0) return { w, h };
  }

  // Fallback
  console.warn("Could not parse image dimensions, using 1280x720 fallback");
  return { w: 1280, h: 720 };
}

// ─── PPE mapping ────────────────────────────────────────────────────────────

const PPE_MISSING_MAP: Record<string, string> = {
  "gloves": "HAND_COVER",
  "safety glasses": "SAFETY_GLASSES",
  "shoes": "SAFETY_SHOES",
  "vest": "REFLECTIVE_VEST",
  "helmet": "HEAD_COVER",
};

const ALL_PPE_KEYS = ["HEAD_COVER", "HAND_COVER", "SAFETY_GLASSES", "SAFETY_SHOES", "REFLECTIVE_VEST"];

const PPE_LABEL: Record<string, string> = {
  HEAD_COVER: "Helm",
  HAND_COVER: "Sarung Tangan",
  SAFETY_GLASSES: "Kacamata Safety",
  SAFETY_SHOES: "Sepatu Safety",
  REFLECTIVE_VEST: "Rompi Reflektif",
};

function buildPpeResults(ppeMissing: string[] | undefined): Record<string, { detected: boolean; confidence: number }> {
  const missing = (ppeMissing || []).map(m => PPE_MISSING_MAP[m.toLowerCase()] || m);
  const results: Record<string, { detected: boolean; confidence: number }> = {};
  for (const key of ALL_PPE_KEYS) {
    results[key] = {
      detected: !missing.includes(key),
      confidence: missing.includes(key) ? 0 : 90,
    };
  }
  return results;
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
    // 1. Get Cosmos API config from system_config
    // ──────────────────────────────────────────────────────────────────────
    const { data: configRows } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["cosmos_api_url", "cosmos_api_username", "cosmos_api_password"]);

    const configMap: Record<string, string> = {};
    for (const row of configRows || []) {
      configMap[row.key] = typeof row.value === "string" ? row.value : JSON.stringify(row.value).replace(/^"|"$/g, "");
    }

    const cosmosUrl = configMap["cosmos_api_url"] || "https://cosmos.squantumengine.com";
    const cosmosUser = configMap["cosmos_api_username"] || "admin";
    const cosmosPass = configMap["cosmos_api_password"] || "admin";

    console.log(`Using Cosmos API: ${cosmosUrl}`);

    // ──────────────────────────────────────────────────────────────────────
    // 2. Login to Cosmos API
    // ──────────────────────────────────────────────────────────────────────
    const cosmosToken = await cosmosLogin(cosmosUrl, cosmosUser, cosmosPass);
    console.log("Cosmos login successful");

    // ──────────────────────────────────────────────────────────────────────
    // 3. Call Cosmos Infer
    // ──────────────────────────────────────────────────────────────────────
    const inferResult = await cosmosInfer(cosmosUrl, cosmosToken, imageBytes);
    const detections = inferResult.detections || [];
    console.log(`Cosmos infer returned ${detections.length} detections`);

    // Get image dimensions for bbox normalization
    const { w: imgW, h: imgH } = getImageDimensions(imageBytes);
    console.log(`Image dimensions: ${imgW}x${imgH}`);

    // ──────────────────────────────────────────────────────────────────────
    // 4. Process person detections
    // ──────────────────────────────────────────────────────────────────────
    interface PersonResult {
      workerId: string | null;
      workerInfo: { nama: string; sid: string; jabatan: string } | null;
      confidenceScore: number | null;
      ppeResults: Record<string, { detected: boolean; confidence: number }>;
      personIndex: number;
      boundingBox: { Left: number; Top: number; Width: number; Height: number } | null;
    }

    const personDetections = detections.filter((d: any) => d.class === "person");
    const results: PersonResult[] = [];

    // Preload all workers for face_name matching
    const { data: allWorkers } = await supabase
      .from("workers")
      .select("id, nama, sid, jabatan")
      .eq("is_active", true);

    const workersByName = new Map<string, { id: string; nama: string; sid: string; jabatan: string }>();
    for (const w of allWorkers || []) {
      workersByName.set(w.nama.toLowerCase(), w);
    }

    for (let pIdx = 0; pIdx < personDetections.length; pIdx++) {
      const det = personDetections[pIdx];
      const bbox = det.bbox; // [x1, y1, x2, y2] in pixels

      // Normalize bbox to 0-1 range
      const x1 = Math.max(0, bbox[0]) / imgW;
      const y1 = Math.max(0, bbox[1]) / imgH;
      const x2 = Math.min(imgW, bbox[2]) / imgW;
      const y2 = Math.min(imgH, bbox[3]) / imgH;
      const normBox = {
        Left: x1,
        Top: y1,
        Width: x2 - x1,
        Height: y2 - y1,
      };

      // Match face_name to worker
      let workerId: string | null = null;
      let workerInfo: { nama: string; sid: string; jabatan: string } | null = null;
      let confidenceScore: number | null = null;

      if (det.face_name) {
        const matched = workersByName.get(det.face_name.toLowerCase());
        if (matched) {
          workerId = matched.id;
          workerInfo = { nama: matched.nama, sid: matched.sid, jabatan: matched.jabatan };
          confidenceScore = det.similarity || null;
        } else {
          console.log(`face_name "${det.face_name}" not found in workers table`);
        }
      }

      // Build PPE results from ppe_missing
      const ppeResults = buildPpeResults(det.ppe_missing);

      results.push({
        workerId,
        workerInfo,
        confidenceScore,
        ppeResults,
        personIndex: pIdx,
        boundingBox: normBox,
      });
    }

    // If no person detections, create a single unknown entry
    if (results.length === 0) {
      results.push({
        workerId: null,
        workerInfo: null,
        confidenceScore: null,
        ppeResults: buildPpeResults(undefined),
        personIndex: 0,
        boundingBox: { Left: 0, Top: 0, Width: 1, Height: 1 },
      });
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

        const requiredItems = [...new Set(applicableRules.map((r) => r.ppe_item))];

        // Remove non-required PPE items so frontend only evaluates zone-relevant items
        if (requiredItems.length > 0) {
          for (const key of ALL_PPE_KEYS) {
            if (!requiredItems.includes(key)) {
              delete person.ppeResults[key];
            }
          }
        }

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
          ppe_results: person.ppeResults,
          snapshot_url: snapshotUrl,
          bounding_box: person.boundingBox,
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
