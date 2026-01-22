import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // 👈 NECESARIO
);

webpush.setVapidDetails(
  "mailto:admin@unemi.edu.ec",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { user_id, title, body } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id requerido" }),
        { status: 400 }
      );
    }

    // 🔹 Obtener subscripciones del usuario
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Sin subscripciones" }),
        { status: 200 }
      );
    }

    const payload = JSON.stringify({
      title: title ?? "☕ Pedido listo",
      body: body ?? "Tu pedido ya puede ser retirado",
      icon: "/icon-192.png",
    });

    // 🔔 Enviar push a cada dispositivo
    await Promise.all(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        ).catch((err) => {
          console.error("Push error:", err);
        })
      )
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Error enviando push" }),
      { status: 500 }
    );
  }
});
