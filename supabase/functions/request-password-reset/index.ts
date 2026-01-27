import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { google } from "npm:googleapis@140";
import { OAuth2Client } from "npm:google-auth-library@9";

/* ===============================
   CORS
================================ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    /* ===============================
       BODY
    ================================ */
    const { email } = await req.json();

    // Respuesta neutra por seguridad
    if (!email) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: corsHeaders,
      });
    }

    /* ===============================
       ORIGEN DINÁMICO
    ================================ */
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "http://localhost:5173";

    /* ===============================
       SUPABASE (SERVICE ROLE)
    ================================ */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ===============================
       BUSCAR USUARIO EN app_users
    ================================ */
    const { data: user } = await supabase
      .from("app_users")
      .select("id, email, name, username")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // No revelar si existe o no
    if (!user) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: corsHeaders,
      });
    }

    /* ===============================
       TOKEN RESET (HASH)
    ================================ */
    const token = crypto.randomUUID();

    const tokenHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      used: false,
    });

    const resetUrl = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;

    /* ===============================
       GMAIL API (WORKSPACE)
    ================================ */
    const oauth2Client = new OAuth2Client(
      Deno.env.get("GMAIL_CLIENT_ID"),          // 👈 tus nombres reales
      Deno.env.get("GMAIL_CLIENT_SECRET"),
      "https://developers.google.com/oauth2"
    );

    oauth2Client.setCredentials({
      refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN"),
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    /* ===============================
       SUBJECT UTF-8 (RFC 2047)
    ================================ */
    const subject = "Restablecer contraseña – Cafetería UNEMI";
    const encodedSubject =
      "=?UTF-8?B?" +
      btoa(unescape(encodeURIComponent(subject))) +
      "?=";

    const fromName = "Cafetería UNEMI";

    const encodedFromName =
    "=?UTF-8?B?" +
    btoa(unescape(encodeURIComponent(fromName))) +
    "?=";

    const logoUrl =
      "https://raw.githubusercontent.com/danidn93/mineduc/main/logo-admin-ordinario.png";

    /* ===============================
       LOGO BASE64 (CID)
       ⚠️ Reemplaza por el base64 REAL
    ================================ */
    const logoBase64 = `
iVBORw0KGgoAAAANSUhEUgAA...REEMPLAZA_ESTO...==
`.replace(/\s+/g, "");

    /* ===============================
       HTML
    ================================ */
    const html = `
<div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
  <div style="max-width:600px;margin:auto;background:#ffffff;padding:20px;border-radius:8px">
    <div style="text-align:center;margin-bottom:20px">
      <img src="${logoUrl}" style="max-width:260px" alt="Cafetería UNEMI" />
    </div>

    <p style="font-size:16px;color:#002334">
      Hola <strong>${user.name || user.username}</strong>,
    </p>

    <p style="font-size:15px;color:#333">
      Hemos recibido una solicitud para restablecer tu contraseña.
    </p>

    <p style="text-align:center;margin:30px 0">
      <a href="${resetUrl}" target="_blank"
        style="
          background:#ff6a00;
          color:white;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          font-weight:bold;
          font-size:16px;
        ">
        Restablecer contraseña
      </a>
    </p>

    <p style="font-size:14px;color:#555">
      Este enlace es válido por <strong>30 minutos</strong>.
    </p>

    <p style="font-size:15px;color:#333;margin-top:30px">
      Saludos,<br/>
      Cafetería UNEMI
    </p>
  </div>
</div>
`;

    /* ===============================
       MIME MULTIPART (HTML + CID)
    ================================ */
    const boundary = "unemi-boundary";

    const mime =
      `From: ${encodedFromName} <${Deno.env.get("GMAIL_USER")}>\r\n` +
      `To: ${user.email}\r\n` +
      `Subject: ${encodedSubject}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: multipart/related; boundary="${boundary}"\r\n\r\n` +

      `--${boundary}\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
      html + `\r\n\r\n` +

      `--${boundary}\r\n` +
      `Content-Type: image/png\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `Content-ID: <logo-unemi>\r\n\r\n` +
      logoBase64 + `\r\n\r\n` +

      `--${boundary}--`;

    const raw = btoa(unescape(encodeURIComponent(mime)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error("❌ request-password-reset:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
