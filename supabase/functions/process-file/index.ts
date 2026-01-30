import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { EdgeLogger } from "../shared-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  let logger: EdgeLogger | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract user id directly from the JWT without calling supabase.auth
    const token = authHeader.replace(/Bearer\s+/i, "").trim();
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(
        JSON.stringify({ error: "Invalid access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let userId: string | null = null;
    try {
      const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson);
      userId = payload.sub || payload.user_id || null;
    } catch (e) {
      console.error("Failed to decode JWT:", e);
      return new Response(
        JSON.stringify({ error: "Failed to decode access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Could not determine user id from token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
        },
      },
    });

    // Initialize Logger
    logger = new EdgeLogger(supabase, userId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      await logger.warn("ProcessFile", "MISSING_FILE", "No file provided in request");
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await logger.action("ProcessFile", "PROCESS_START", `Processing file: ${file.name}`, { 
        fileSize: file.size, 
        fileType: file.type 
    });

    const fileBuffer = await file.arrayBuffer();

    let rows: any[] = [];
    let schemaInfo: any = null;
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".csv")) {
      const text = new TextDecoder().decode(fileBuffer);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        await logger.warn("ProcessFile", "EMPTY_FILE", "CSV file is empty", { fileName: file.name });
        return new Response(
          JSON.stringify({ error: "Empty file" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, ""));
      schemaInfo = { columns: headers };

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/^"|"$/g, ""));
        if (parts.length === 1 && parts[0] === "") continue;
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] ?? "";
        });
        rows.push(row);
      }
    } else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
      try {
        const sheetjsUrl = "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";
        const sheetMod = await import(sheetjsUrl);
        const XLSX = sheetMod.default || sheetMod;

        const workbook = XLSX.read(fileBuffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!json || json.length === 0) {
          await logger.warn("ProcessFile", "EMPTY_EXCEL", "Excel file has no rows", { fileName: file.name });
          return new Response(
            JSON.stringify({ error: "Excel file has no rows" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const headers = Object.keys(json[0] as any);
        schemaInfo = { columns: headers };
        rows = json.map((r: any) => {
          const out: any = {};
          headers.forEach((h) => {
            out[h] = r[h] ?? "";
          });
          return out;
        });
      } catch (err) {
        await logger.error("ProcessFile", "PARSE_ERROR", "Failed to parse Excel file", err, { fileName: file.name });
        return new Response(
          JSON.stringify({ error: "Failed to parse Excel file", details: (err as Error).message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      await logger.warn("ProcessFile", "INVALID_TYPE", "Unsupported file type", { fileName: file.name, type: file.type });
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Upload CSV/XLS/XLSX." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: dataSource, error: dsError } = await supabase
      .from("data_sources")
      .insert({
        name: file.name,
        type: "file",
        status: "active",
        row_count: rows.length,
        created_by: userId,
        schema_info: schemaInfo,
        metadata: {
          file_size: file.size,
          file_type: file.type,
          source: "upload",
        },
      })
      .select()
      .single();

    if (dsError || !dataSource) {
      await logger.error("ProcessFile", "DB_INSERT_ERROR", "Failed to create data_source", dsError);
      return new Response(
        JSON.stringify({ error: "Failed to create data source" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase
      .from("uploaded_files")
      .insert({
        id: dataSource.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        row_count: rows.length,
        schema_info: schemaInfo,
        user_id: userId,
      });

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const records = batch.map((row) => ({
        file_id: dataSource.id,
        row_data: row,
      }));

      const { error: recError } = await supabase
        .from("data_records")
        .insert(records);
      if (recError) {
           await logger.warn("ProcessFile", "BATCH_INSERT_ERROR", "Batch insert warning", recError);
      }
    }

    await logger.info("ProcessFile", "PROCESS_SUCCESS", `Successfully processed file: ${file.name}`, { 
        rowsCount: rows.length, 
        dataSourceId: dataSource.id 
    });

    return new Response(
      JSON.stringify({
        success: true,
        data_source_id: dataSource.id,
        rows_count: rows.length,
        file_id: dataSource.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (logger) await logger.error("ProcessFile", "CRITICAL_ERROR", "Unhandled error in process-file", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
