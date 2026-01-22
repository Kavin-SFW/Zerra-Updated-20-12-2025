import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqChat(question: string, context: any) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    console.warn("GROQ_API_KEY not set; returning simple fallback answer");
    return "AI is not fully configured yet. Please set GROQ_API_KEY in your Supabase project.";
  }

  const messages = [
    {
      role: "system",
      content: "You are an analytics copilot. Answer questions using the provided tabular data context. Explain insights clearly and be specific. If predicting or recommending actions, call that out explicitly."
    },
    {
      role: "user",
      content: JSON.stringify({
        question,
        context
      })
    }
  ];

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_completion_tokens: 800,
      top_p: 1,
      stream: false,
      messages
    })
  });

  if (!res.ok) {
    console.error("Groq chat error", res.status, await res.text());
    return "I had trouble reaching the analytics engine. Please try again.";
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: anonKey
        }
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const body = await req.json();
    const { question, dataSourceId } = body;

    if (!question) {
      return new Response(JSON.stringify({
        error: "Question is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    let context = null;
    if (dataSourceId) {
      const { data: dataSource } = await supabase
        .from("data_sources")
        .select("id, name, schema_info")
        .eq("id", dataSourceId)
        .eq("created_by", user.id)
        .single();

      if (dataSource) {
        const { data: records } = await supabase
          .from("data_records")
          .select("row_data")
          .eq("file_id", dataSourceId)
          .limit(200);

        context = {
          file_name: dataSource.name,
          schema: dataSource.schema_info,
          sample_data: (records ?? []).map((r) => r.row_data)
        };
      }
    }

    const answer = await callGroqChat(question, context);

    return new Response(JSON.stringify({
      answer,
      context
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err: any) {
    console.error("Error in chat function:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: err?.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
