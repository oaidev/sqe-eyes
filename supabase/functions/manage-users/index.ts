import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    // Use service role client for admin operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST users
    if (req.method === "GET" && action === "list") {
      const { data: authUsers, error: listErr } =
        await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, avatar_url");

      const roleMap = new Map(
        (roles || []).map((r: any) => [r.user_id, r.role])
      );
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      const users = authUsers.users.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: profileMap.get(u.id)?.full_name || null,
        avatar_url: profileMap.get(u.id)?.avatar_url || null,
        role: roleMap.get(u.id) || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST actions
    if (req.method === "POST") {
      const body = await req.json();

      if (action === "invite") {
        const { email, role, full_name } = body;
        if (!email || !role) {
          return new Response(
            JSON.stringify({ error: "email and role required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const { data: inviteData, error: inviteErr } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name || email },
          });
        if (inviteErr) throw inviteErr;

        // Assign role
        const { error: roleErr } = await adminClient
          .from("user_roles")
          .upsert(
            { user_id: inviteData.user.id, role },
            { onConflict: "user_id" }
          );
        if (roleErr) throw roleErr;

        return new Response(
          JSON.stringify({ success: true, user_id: inviteData.user.id }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (action === "update-role") {
        const { user_id, role } = body;
        if (!user_id || !role) {
          return new Response(
            JSON.stringify({ error: "user_id and role required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const { error: roleErr } = await adminClient
          .from("user_roles")
          .upsert({ user_id, role }, { onConflict: "user_id" });
        if (roleErr) throw roleErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "delete-user") {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (user_id === callerId) {
          return new Response(
            JSON.stringify({ error: "Cannot delete yourself" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Delete role first, then profile, then auth user
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", user_id);
        await adminClient
          .from("profiles")
          .delete()
          .eq("id", user_id);
        const { error: delErr } =
          await adminClient.auth.admin.deleteUser(user_id);
        if (delErr) throw delErr;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-users error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
