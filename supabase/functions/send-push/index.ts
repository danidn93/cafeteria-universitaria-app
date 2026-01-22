const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 🔴 PRE-FLIGHT CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: corsHeaders,
      }
    );
  }

  try {
    const { user_id, title, body } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id requerido" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "Sin subscripciones" }),
        { status: 200, headers: corsHeaders }
      );
    }

    const payload = JSON.stringify({
      title: title ?? "☕ Pedido listo",
      body: body ?? "Tu pedido ya puede ser retirado",
      icon: "/icon-192.png",
    });

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
        ).catch(console.error)
      )
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Error enviando push" }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
