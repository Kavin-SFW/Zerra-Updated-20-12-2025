import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { EdgeLogger } from "../shared-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroqChat(question: string, context: any, logger?: EdgeLogger) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    if (logger) await logger.warn("Chat", "GROQ_KEY_MISSING", "GROQ_API_KEY not set");
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
    const errorText = await res.text();
    if (logger) await logger.error("Chat", "GROQ_API_ERROR", `Groq chat error ${res.status}`, errorText);
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

  let logger: EdgeLogger | null = null;

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

    // Initialize logger
    logger = new EdgeLogger(supabase);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      await logger.warn("Chat", "AUTH_FAILED", "User unauthorized or not found", userError);
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

    logger.setUserId(user.id);

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

    await logger.action("Chat", "CHAT_REQUEST", "Processing chat request", { hasDataSource: !!dataSourceId, questionLength: question.length });

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
      } else {
          await logger.warn("Chat", "DATA_SOURCE_MISSING", "Data source not found for context", { dataSourceId });
      }
    }

    const answer = await callGroqChat(question, context, logger);

    await logger.info("Chat", "CHAT_SUCCESS", "Chat response generated");

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
    if (logger) await logger.error("Chat", "CRITICAL_ERROR", "Internal server error in chat function", err);
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
