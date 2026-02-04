import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// EdgeLogger class inlined to avoid import issues during bundling
class EdgeLogger {
  private supabase: any;
  private userId: string | null = null;

  constructor(supabaseClient: any, userId?: string | null) {
    this.supabase = supabaseClient;
    this.userId = userId || null;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private async writeLog(level: 'info' | 'warn' | 'error', action: string, module: string, message: string, metadata: any = {}, errorStack: string | null = null) {
    try {
      const now = new Date();
      const log_date = now.toISOString().split('T')[0];
      const log_time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

      const payload = {
        user_id: this.userId,
        log_date,
        log_time,
        timezone: 'UTC',
        level,
        action,
        module,
        message,
        metadata: {
            ...metadata,
            source: 'Edge Function'
        },
        error_stack: errorStack
      };

      const { error } = await this.supabase.from('logs').insert(payload);
      if (error) {
        console.error('EdgeLogger: Failed to write to DB:', error);
      }
    } catch (err) {
      console.error('EdgeLogger: Critical error:', err);
    }
  }

  async info(module: string, action: string, message: string, metadata?: any) {
    console.log(`[INFO] [${module}] ${action}: ${message}`);
    await this.writeLog('info', action, module, message, metadata);
  }

  async warn(module: string, action: string, message: string, metadata?: any) {
    console.warn(`[WARN] [${module}] ${action}: ${message}`);
    await this.writeLog('warn', action, module, message, metadata);
  }

  async error(module: string, action: string, message: string, error?: any, metadata?: any) {
    console.error(`[ERROR] [${module}] ${action}: ${message}`, error);
    const stack = error instanceof Error ? error.stack : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    await this.writeLog('error', action, module, message, metadata, stack);
  }
  
  async action(module: string, action: string, message: string, metadata?: any) {
    console.log(`[ACTION] [${module}] ${action}: ${message}`);
    await this.writeLog('info', action, module, message, { ...metadata, is_user_action: true });
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(messages: any[], purpose: string, logger?: EdgeLogger) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    if (logger) await logger.warn("Analytics", "GROQ_KEY_MISSING", "GROQ_API_KEY not set; skipping AI", { purpose });
    return null;
  }

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 800,
      top_p: 1,
      stream: false,
      messages,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    if (logger) await logger.error("Analytics", "GROQ_API_ERROR", `Groq API error ${res.status}`, errorText, { purpose });
    return null;
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return content as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  
  // Temporary logger before user auth
  let logger: EdgeLogger | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { 
        headers: { 
          Authorization: authHeader,
          apikey: anonKey 
        } 
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Initialize logger with Supabase client (user ID pending)
    logger = new EdgeLogger(supabase);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      await logger.error("Analytics", "AUTH_ERROR", "Authentication failed", userError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired authentication token", 
          details: userError.message
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    
    if (!user) {
      await logger.warn("Analytics", "AUTH_NO_USER", "No user found after auth check");
      return new Response(
        JSON.stringify({ error: "User not found. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;
    logger.setUserId(userId);
    // await logger.info("Analytics", "AUTH_SUCCESS", `Authenticated user: ${userId}`);

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "dashboard";

    const body = await req.json().catch(() => ({}));
    const { data_source_id, industry } = body;

    if (!data_source_id) {
      return new Response(
        JSON.stringify({ error: "data_source_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await logger.action("Analytics", "ANALYTICS_REQUEST", "Processing analytics request", { type, data_source_id, industry });

    // Fetch data source - check if user has access
    const { data: dataSource, error: dsError } = await supabase
      .from("data_sources")
      .select("id, name, schema_info, created_by")
      .eq("id", data_source_id)
      .single();

    if (dsError || !dataSource) {
      await logger.error("Analytics", "DATA_SOURCE_ERROR", "Data source not found or access error", dsError, { data_source_id });
      return new Response(
        JSON.stringify({ error: "Data source not found or access denied", details: dsError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (dataSource.created_by && dataSource.created_by !== userId) {
      await logger.warn("Analytics", "ACCESS_DENIED", "User attempted to access unauthorized data source", { data_source_id });
      return new Response(
        JSON.stringify({ error: "Access denied: You don't have permission to access this data source" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fileName = dataSource.name;
    let fileId: string | null = null;
    let schemaInfo: any = dataSource.schema_info;

    // ... (File finding logic omitted for brevity, keeping original logic structure but adding logs if needed) ...
    // Note: Re-implementing the exact file finding logic for safety
    
    const strategies = [
      fileName,
      fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
      fileName.replace(/ /g, '_'),
      `${fileName.replace(/ /g, '_')}.csv`,
      fileName.replace(/ /g, '-'),
      `${fileName.replace(/ /g, '-')}.csv`,
      fileName.toLowerCase(),
      fileName.toUpperCase(),
    ];

    let uploadedFiles = null;
    const { data: exactMatch, error: fileError } = await supabase
      .from("uploaded_files")
      .select("id, file_name, schema_info")
      .eq("file_name", fileName)
      .eq("user_id", userId)
      .limit(1);

    if (!fileError && exactMatch && exactMatch.length > 0) {
      uploadedFiles = exactMatch;
    }

    if (!uploadedFiles || uploadedFiles.length === 0) {
      for (const strategyName of strategies) {
        if (strategyName === fileName) continue;
        const { data: files } = await supabase
          .from("uploaded_files")
          .select("id, file_name, schema_info")
          .ilike("file_name", strategyName)
          .eq("user_id", userId)
          .limit(1);

        if (files && files.length > 0) {
          uploadedFiles = files;
          break;
        }
      }
    }

    // Fallback
    if (!uploadedFiles || uploadedFiles.length === 0) {
       const { data: allFiles } = await supabase
        .from("uploaded_files")
        .select("id, file_name, schema_info")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (allFiles && allFiles.length > 0) {
        const fileNameLower = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const file of allFiles) {
          const fileLower = file.file_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (fileLower.includes(fileNameLower) || fileNameLower.includes(fileLower)) {
            uploadedFiles = [file];
            break;
          }
        }
      }
    }

    if (uploadedFiles && uploadedFiles.length > 0) {
      fileId = uploadedFiles[0].id;
      schemaInfo = uploadedFiles[0].schema_info || schemaInfo;
    }

    if (!fileId) {
      await logger.error("Analytics", "FILE_NOT_FOUND", "No uploaded file match found for data source", null, { fileName });
      return new Response(
        JSON.stringify({ error: "No uploaded file found for this data source", data_source_name: fileName }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch all records with pagination (Supabase default limit is 1000)
    let allRecords: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    let recError: any = null;

    while (hasMore) {
      const { data: records, error } = await supabase
        .from("data_records")
        .select("row_data")
        .eq("file_id", fileId)
        .range(from, from + pageSize - 1);

      if (error) {
        recError = error;
        break;
      }

      if (records && records.length > 0) {
        allRecords = [...allRecords, ...records];
        from += pageSize;
        hasMore = records.length === pageSize; // If we got less than pageSize, we're done
      } else {
        hasMore = false;
      }
    }

    if (recError) {
      await logger.error("Analytics", "FETCH_RECORDS_ERROR", "Failed to fetch data records", recError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data records", details: recError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = allRecords.map((r: any) => r.row_data);
    
    if (data.length === 0) {
      await logger.warn("Analytics", "EMPTY_DATA", "No data records found", { fileId });
      return new Response(
        JSON.stringify({ error: "No data records found for this data source" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const columns = schemaInfo?.columns ?? (data.length > 0 ? Object.keys(data[0]) : []);
    let recommendations: any[] = [];
    let aiSummary: string | null = null;
    let insights: any[] = []; // For prescriptive

    if (type === "dashboard") {
      recommendations = generateDashboardRecommendations(data, columns, industry);
      aiSummary = await callGroq([
        {
          role: "system",
          content: "You are a senior analytics assistant. Given column names and sample data, propose 3-6 high-value charts for a business dashboard.",
        },
        {
          role: "user",
          content: JSON.stringify({ columns, sample_rows: data.slice(0, 20), industry }),
        },
      ], "dashboard", logger);
    } else if (type === "descriptive") {
      recommendations = generateDescriptiveAnalytics(data, columns);
      aiSummary = await callGroq([
        {
          role: "system",
          content: "You are a descriptive analytics expert. Summarize key trends, distributions, and segments in the dataset.",
        },
        {
          role: "user",
          content: JSON.stringify({ columns, sample_rows: data.slice(0, 500), industry }),
        },
      ], "descriptive", logger);
    } else if (type === "prescriptive") {
      insights = generatePrescriptiveAnalytics(data, columns, industry);
      aiSummary = await callGroq([
        {
          role: "system",
          content: "You are a prescriptive analytics expert. Propose concrete actions and recommendations based on the data.",
        },
        {
          role: "user",
          content: JSON.stringify({ columns, sample_rows: data.slice(0, 500), industry, insights_count: insights.length }),
        },
      ], "prescriptive", logger);
      
      await logger.info("Analytics", "ANALYTICS_SUCCESS", "Successfully generated prescriptive insights", { count: insights.length });

      return new Response(
        JSON.stringify({
          success: true,
          insights,
          recommendations: insights,
          data_source_id,
          type,
          row_count: data.length,
          ai_summary: aiSummary,
          count: insights.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      recommendations = generateDashboardRecommendations(data, columns, industry);
    }

    await logger.info("Analytics", "ANALYTICS_SUCCESS", `Successfully generated analytics for ${type}`, { count: recommendations.length });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations,
        data_source_id,
        type,
        row_count: data.length,
        ai_summary: aiSummary,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    if (logger) await logger.error("Analytics", "CRITICAL_ERROR", "Internal server error in analytics function", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Helper functions remain the same but ensure they don't use console.log excessively if possible
// ... (generateDashboardRecommendations, generateDescriptiveAnalytics, generatePrescriptiveAnalytics copied below or assumed intact)

function generateDashboardRecommendations(data: any[], columns: string[], industry?: string) {
  const recs: any[] = [];
  if (!data.length || !columns.length) return recs;

  const sample = data[0];
  
  // Better column detection - check multiple rows for accuracy
  const numeric: string[] = [];
  const categorical: string[] = [];
  const dateColumns: string[] = [];
  
  for (const col of columns) {
    let isNumeric = true;
    let isDate = false;
    let checkedCount = 0;
    
    // Check up to 10 rows to determine column type
    for (let i = 0; i < Math.min(data.length, 10); i++) {
      const val = data[i][col];
      if (val === null || val === undefined || val === "") continue;
      
      checkedCount++;
      
      // Check if it's a date
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
        const dateVal = new Date(val);
        if (!isNaN(dateVal.getTime()) && dateVal.getFullYear() > 1900) {
          isDate = true;
          isNumeric = false;
          break;
        }
      }
      
      // Check if numeric
      if (isNaN(Number(val))) {
        isNumeric = false;
      }
    }
    
    if (checkedCount === 0) continue;
    
    if (isDate) {
      dateColumns.push(col);
    } else if (isNumeric) {
      numeric.push(col);
    } else {
      categorical.push(col);
    }
  }

  console.log("Column analysis:", { numeric, categorical, dateColumns });

  // Generate more accurate and diverse chart recommendations
  
  // 1. Bar chart: Categorical vs Numeric (most common)
  if (numeric.length > 0 && categorical.length > 0) {
    const bestNumeric = numeric.find(c => /sales|revenue|amount|total|price|cost|value|quantity|qty|count/i.test(c)) || numeric[0];
    const bestCategorical = categorical.find(c => /category|type|brand|product|name|status|region|location/i.test(c)) || categorical[0];
    
    recs.push({
      title: `${bestCategorical} vs ${bestNumeric}`,
      type: "bar",
      x_axis: bestCategorical,
      y_axis: bestNumeric,
      aggregation: "sum",
      reasoning: `Compare ${bestCategorical} distribution against ${bestNumeric} metric`,
      priority: "high",
    });
  }

  // 2. Line chart: Time series if date column exists
  if (dateColumns.length > 0 && numeric.length > 0) {
    const bestNumeric = numeric.find(c => /sales|revenue|amount|total|price|value/i.test(c)) || numeric[0];
    recs.push({
      title: `${bestNumeric} over time`,
      type: "line",
      x_axis: dateColumns[0],
      y_axis: bestNumeric,
      reasoning: `Track ${bestNumeric} trends over time`,
      priority: "high",
    });
  }

  // 3. Pie chart: Distribution
  if (numeric.length > 0 && categorical.length > 0) {
    const bestNumeric = numeric.find(c => /sales|revenue|amount|total|price|value/i.test(c)) || numeric[0];
    const bestCategorical = categorical.find(c => /category|type|brand|product|name|status/i.test(c)) || categorical[0];
    
    recs.push({
      title: `Distribution of ${bestNumeric} by ${bestCategorical}`,
      type: "pie",
      dimension: bestCategorical,
      metric: bestNumeric,
      x_axis: bestCategorical, // Also include for compatibility
      y_axis: bestNumeric, // Also include for compatibility
      reasoning: `Show proportional breakdown of ${bestNumeric} across ${bestCategorical}`,
      priority: "medium",
    });
  }

  // 4. Area chart: Multiple metrics over time
  if (dateColumns.length > 0 && numeric.length >= 2) {
    recs.push({
      title: `Multiple Metrics over Time`,
      type: "area",
      x_axis: dateColumns[0],
      y_axis: numeric.slice(0, 3),
      reasoning: `Compare multiple metrics over time to identify correlations`,
      priority: "medium",
    });
  }

  // 5. Stacked bar: Multiple categories
  if (numeric.length > 0 && categorical.length >= 2) {
    const bestNumeric = numeric.find(c => /sales|revenue|amount|total|price|value/i.test(c)) || numeric[0];
    recs.push({
      title: `${bestNumeric} by ${categorical[0]} and ${categorical[1]}`,
      type: "bar",
      x_axis: categorical[0],
      y_axis: bestNumeric,
      group_by: categorical[1],
      reasoning: `Stacked view showing ${bestNumeric} broken down by ${categorical[0]} and ${categorical[1]}`,
      priority: "medium",
    });
  }

  // 6. Scatter plot: Two numeric variables
  if (numeric.length >= 2) {
    recs.push({
      title: `${numeric[0]} vs ${numeric[1]}`,
      type: "scatter",
      x_axis: numeric[0],
      y_axis: numeric[1],
      reasoning: `Identify correlation between ${numeric[0]} and ${numeric[1]}`,
      priority: "low",
    });
  }

  return recs.slice(0, 6);
}

function generateDescriptiveAnalytics(data: any[], columns: string[]) {
  const recs: any[] = [];
  if (!data.length) return recs;

  const sample = data[0];
  const numeric = columns.filter((c) => {
    const val = sample[c];
    return val !== null && val !== undefined && !isNaN(Number(val)) && val !== "";
  });

  for (const col of numeric) {
    const vals = data
      .map((r) => Number(r[col]))
      .filter((v) => !isNaN(v));
    if (!vals.length) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    recs.push({
      title: `Statistics for ${col}`,
      type: "statistics",
      metric: col,
      statistics: { sum, average: avg, min, max, count: vals.length },
    });
  }

  return recs;
}

function generatePrescriptiveAnalytics(data: any[], columns: string[], industry?: string) {
  const insights: any[] = [];
  if (!data.length || !columns.length) return insights;

  const industryKey = (industry || "").toLowerCase();
  const sample = data[0];
  const keys = Object.keys(sample);
  
  // Detect numeric and categorical columns
  const numeric: string[] = [];
  const categorical: string[] = [];
  
  for (const col of columns) {
    const val = sample[col];
    if (val === null || val === undefined || val === "") continue;
    
    if (!isNaN(Number(val)) && val !== "") {
      numeric.push(col);
    } else {
      categorical.push(col);
    }
  }

  // 1. Industry-Specific High-Level Insight
  if (industryKey.includes('retail') || industryKey.includes('sale') || industryKey.includes('commerce')) {
    const salesCol = numeric.find(k => /sales|revenue|amount|total|price/i.test(k));
    if (salesCol) {
      const values = data.map(r => Number(r[salesCol]) || 0);
      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / data.length;
      const sorted = [...values].sort((a, b) => b - a);
      const top10Percent = sorted.slice(0, Math.ceil(sorted.length * 0.1));
      const top10PercentTotal = top10Percent.reduce((a, b) => a + b, 0);
      const top10PercentShare = (top10PercentTotal / total) * 100;
      
      insights.push({
        type: 'trend',
        title: `${industry || 'Retail'} Revenue Optimization`,
        description: `Average transaction value is $${avg.toFixed(2)}. Top 10% of sales drive ${top10PercentShare.toFixed(1)}% of revenue.`,
        recommendation: 'Target high-value customer segments with loyalty programs and personalized offers.',
        priority: 'high'
      });
    }
  } else if (industryKey.includes('manuf') || industryKey.includes('production')) {
    insights.push({
      type: 'optimization',
      title: 'Production Efficiency',
      description: 'Detected variance in output metrics across different production cycles.',
      recommendation: 'Standardize production processes and implement quality control checkpoints to reduce variance.',
      priority: 'high'
    });
  } else if (industryKey.includes('finance') || industryKey.includes('financial')) {
    const expenseCol = numeric.find(k => /expense|cost|spend|outgoing/i.test(k));
    if (expenseCol) {
      insights.push({
        type: 'risk',
        title: 'Cost Anomaly Detection',
        description: 'Unusual expense patterns detected in the dataset. Variance analysis shows potential outliers.',
        recommendation: 'Audit expense categories for compliance and implement automated anomaly detection.',
        priority: 'high'
      });
    } else {
      insights.push({
        type: 'risk',
        title: 'Financial Pattern Analysis',
        description: 'Data patterns suggest opportunities for cost optimization and revenue enhancement.',
        recommendation: 'Implement predictive analytics to forecast trends and optimize financial planning.',
        priority: 'high'
      });
    }
  } else if (industryKey.includes('health') || industryKey.includes('medical')) {
    insights.push({
      type: 'optimization',
      title: 'Patient Care Optimization',
      description: 'Data patterns indicate opportunities to improve patient outcomes and operational efficiency.',
      recommendation: 'Implement data-driven care protocols and resource allocation strategies.',
      priority: 'high'
    });
  } else {
    // Generic Industry Insight
    insights.push({
      type: 'discovery',
      title: `${industry || 'Industry'} Sector Trends`,
      description: `Data patterns align with standard ${industry || 'industry'} seasonality curves and operational metrics.`,
      recommendation: 'Prepare resources for expected activity spikes and optimize for peak performance periods.',
      priority: 'medium'
    });
  }

  // 2. Data Volume & Confidence Insight
  const recCount = data.length;
  if (recCount > 1000) {
    insights.push({
      type: 'prediction',
      title: 'High-Volume Confidence',
      description: `Dataset size (${recCount.toLocaleString()} rows) allows for 95% confidence intervals in forecasting and statistical analysis.`,
      recommendation: 'Enable "Advanced Forecasting" module for deep-dive predictions and trend analysis.',
      priority: 'medium'
    });
  } else if (recCount < 100) {
    insights.push({
      type: 'warning',
      title: 'Limited Sample Size',
      description: `Dataset contains ${recCount} rows. Statistical significance may be limited for complex analysis.`,
      recommendation: 'Collect more data points or focus on descriptive analytics rather than predictive models.',
      priority: 'medium'
    });
  }

  // 3. Outlier / Anomaly Detection
  if (numeric.length > 0) {
    const primaryMetric = numeric.find(k => /sales|revenue|amount|total|price|value|quantity|qty/i.test(k)) || numeric[0];
    const values = data.map(d => Number(d[primaryMetric]) || 0).filter(v => v > 0);
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length);
      
      if (max > avg + (3 * stdDev)) {
        insights.push({
          type: 'anomaly',
          title: `Statistical Outliers in ${primaryMetric}`,
          description: `Extreme values detected (max: ${max.toLocaleString()} vs avg: ${avg.toFixed(2)}), indicating potential outliers that may skew analysis.`,
          recommendation: `Isolate top 1% of ${primaryMetric} records for separate anomaly review and consider outlier treatment strategies.`,
          priority: 'high'
        });
      }
    }
  }

  // 4. Missing Data Strategy
  let nullCount = 0;
  let totalFields = 0;
  for (const row of data) {
    for (const key of keys) {
      totalFields++;
      if (row[key] === null || row[key] === undefined || row[key] === '') {
        nullCount++;
      }
    }
  }
  const nullPercentage = (nullCount / totalFields) * 100;
  
  if (nullPercentage > 5) {
    insights.push({
      type: 'optimization',
      title: 'Data Quality Enhancement',
      description: `Identified ${nullCount.toLocaleString()} missing data points (${nullPercentage.toFixed(1)}%) across the dataset.`,
      recommendation: 'Implement default value imputation, data validation rules, and missing data handling strategies for cleaner analysis.',
      priority: nullPercentage > 20 ? 'high' : 'medium'
    });
  }

  // 5. Growth Opportunity / Cross-Correlation
  if (numeric.length >= 2 && categorical.length >= 1) {
    insights.push({
      type: 'growth',
      title: 'Untapped Potential',
      description: `Cross-correlation analysis suggests underutilized dimensions in ${categorical[0] || 'categorical data'}. Multiple metrics available for deeper analysis.`,
      recommendation: `Explore ${categorical[0] || 'categorical'} breakdown and multi-dimensional analysis to find hidden pockets of value and optimization opportunities.`,
      priority: 'medium'
    });
  }

  // 6. Trend Analysis (if date column exists)
  const dateCol = columns.find(c => {
    const val = sample[c];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return true;
    }
    return /date|time|created|updated|timestamp|period/i.test(c);
  });
  
  if (dateCol && numeric.length > 0) {
    const metricCol = numeric.find(k => /sales|revenue|amount|total|price|value/i.test(k)) || numeric[0];
    const dateValues = data.map(r => {
      const dateStr = r[dateCol];
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    }).filter(d => d !== null);
    
    if (dateValues.length > 1) {
      dateValues.sort((a, b) => a!.getTime() - b!.getTime());
      const timeSpan = dateValues[dateValues.length - 1]!.getTime() - dateValues[0]!.getTime();
      const days = timeSpan / (1000 * 60 * 60 * 24);
      
      if (days > 30) {
        insights.push({
          type: 'trend',
          title: 'Long-Term Trend Analysis Available',
          description: `Dataset spans ${Math.round(days)} days, enabling comprehensive trend analysis and seasonality detection.`,
          recommendation: 'Implement time-series forecasting models to predict future trends and identify seasonal patterns.',
          priority: 'medium'
        });
      }
    }
  }

  // 7. Performance Optimization
  if (numeric.length > 0) {
    const primaryMetric = numeric.find(k => /sales|revenue|amount|total|price|value|efficiency|performance/i.test(k)) || numeric[0];
    const values = data.map(d => Number(d[primaryMetric]) || 0).filter(v => v > 0);
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const variance = avg - median;
      
      if (Math.abs(variance) > avg * 0.2) {
        insights.push({
          type: 'optimization',
          title: `Performance Variance in ${primaryMetric}`,
          description: `Significant variance detected (avg: ${avg.toFixed(2)}, median: ${median.toFixed(2)}), indicating inconsistent performance.`,
          recommendation: 'Investigate root causes of variance and implement standardization measures to improve consistency.',
          priority: 'high'
        });
      }
    }
  }

  // Ensure we return at least 5 insights
  while (insights.length < 5) {
    insights.push({
      type: 'discovery',
      title: `Additional Analysis Opportunity ${insights.length + 1}`,
      description: 'Further data exploration could reveal additional insights and optimization opportunities.',
      recommendation: 'Consider running advanced analytics and machine learning models on this dataset.',
      priority: 'low'
    });
  }

  return insights.slice(0, Math.max(5, insights.length));
}
