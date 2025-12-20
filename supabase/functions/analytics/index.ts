import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Length': '0', 'Content-Type': 'text/plain; charset=utf-8', 'Vary': 'Origin' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError) console.error('Auth error:', authError.message);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const analyticsType = url.searchParams.get('type') || 'dashboard';
    
    let body = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (analyticsType === 'dashboard' || analyticsType === 'recommendations') {
      return handleAutoDashboard(supabaseClient, user.id, body, corsHeaders);
    }
    
    if (analyticsType === 'ai_recommendations') {
      return handleAIRecommendations(supabaseClient, user.id, body, corsHeaders);
    }
    
    if (analyticsType === 'prescriptive') {
      return handlePrescriptiveAnalytics(supabaseClient, user.id, body, corsHeaders);
    }

    return new Response(JSON.stringify({ error: 'Invalid analytics type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analytics function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getDataAndColumns(supabase: any, userId: string, dataSourceId: string) {
  const { data: dataSource } = await supabase
    .from('data_sources')
    .select('*')
    .eq('id', dataSourceId)
    .eq('created_by', userId)
    .maybeSingle();

  if (!dataSource) throw new Error('Data source not found');

  const { data: uploadedFiles } = await supabase
    .from('uploaded_files')
    .select('id')
    .eq('file_name', dataSource.name)
    .eq('user_id', userId)
    .limit(1);

  if (!uploadedFiles || uploadedFiles.length === 0) throw new Error('No data found');

  const fileId = uploadedFiles[0].id;
  const { data: records } = await supabase
    .from('data_records')
    .select('row_data')
    .eq('file_id', fileId)
    .limit(1000);

  if (!records || records.length === 0) throw new Error('No data records found');

  const sampleData = records.map(r => r.row_data);
  const columns = Object.keys(sampleData[0] || {});
  
  // Robust column detection
  const numericColumns = columns.filter(col => {
    const colLower = col.toLowerCase();
    if (colLower.includes('id') || colLower === 'index' || colLower === 'row') return false;
    
    let numericCount = 0;
    const sampleSize = Math.min(20, sampleData.length);
    for (let i = 0; i < sampleSize; i++) {
      const val = sampleData[i][col];
      if (val !== null && val !== '' && val !== undefined) {
        const num = Number(val);
        if (!isNaN(num) && isFinite(num)) numericCount++;
      }
    }
    return numericCount >= sampleSize * 0.8;
  });
  
  const categoricalColumns = columns.filter(col => {
    if (numericColumns.includes(col)) return false;
    const uniqueVals = new Set(sampleData.slice(0, 100).map(d => String(d[col])));
    return uniqueVals.size >= 2 && uniqueVals.size <= 50;
  });
  
  const dateColumns = columns.filter(col => {
    const sample = String(sampleData[0][col] || '');
    return /\d{4}-\d{2}-\d{2}/.test(sample) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(sample);
  });

  return { sampleData, columns, numericColumns, categoricalColumns, dateColumns, records };
}

async function handleAutoDashboard(supabase: any, userId: string, body: any, corsHeaders: Record<string, string>) {
  try {
    const { data_source_id } = body;
    if (!data_source_id) {
      return new Response(JSON.stringify({ error: 'data_source_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { numericColumns, categoricalColumns, dateColumns, records } = 
      await getDataAndColumns(supabase, userId, data_source_id);

    const charts = [];

    // Randomly select chart types for variety
    const chartTypes = ['gauge', 'pie', 'bar', 'line', 'scatter', 'area'];
    const selectedTypes = chartTypes.sort(() => Math.random() - 0.5);

    if (numericColumns.length > 0 && selectedTypes.includes('gauge')) {
      charts.push({
        type: 'gauge',
        title: `${numericColumns[0]} Performance`,
        x_axis: categoricalColumns[0] || 'index',
        y_axis: numericColumns[0],
        priority: 'high'
      });
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0 && selectedTypes.includes('pie')) {
      charts.push({
        type: 'pie',
        title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
        x_axis: categoricalColumns[0],
        y_axis: numericColumns[0],
        priority: 'high'
      });
    }

    if (categoricalColumns.length > 0 && numericColumns.length > 0 && selectedTypes.includes('bar')) {
      charts.push({
        type: 'bar',
        title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
        x_axis: categoricalColumns[0],
        y_axis: numericColumns[0],
        priority: 'high'
      });
    }

    if (numericColumns.length > 0 && selectedTypes.includes('line')) {
      const xAxis = dateColumns[0] || categoricalColumns[0] || 'index';
      charts.push({
        type: 'line',
        title: `${numericColumns[0]} Trend`,
        x_axis: xAxis,
        y_axis: numericColumns[0],
        priority: 'high'
      });
    }

    if (numericColumns.length >= 2 && selectedTypes.includes('scatter')) {
      charts.push({
        type: 'scatter',
        title: `${numericColumns[0]} vs ${numericColumns[1]}`,
        x_axis: numericColumns[0],
        y_axis: numericColumns[1],
        priority: 'medium'
      });
    }

    if (numericColumns.length >= 2 && selectedTypes.includes('area')) {
      const xAxis = dateColumns[0] || categoricalColumns[0] || 'index';
      charts.push({
        type: 'area',
        title: 'Multi-Metric Trend',
        x_axis: xAxis,
        y_axis: numericColumns.slice(0, 3),
        priority: 'medium'
      });
    }

    return new Response(JSON.stringify({ 
      recommendations: charts,
      summary: {
        total_records: records.length,
        numeric_columns: numericColumns,
        categorical_columns: categoricalColumns,
        date_columns: dateColumns
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handleAutoDashboard:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate dashboard', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleAIRecommendations(supabase: any, userId: string, body: any, corsHeaders: Record<string, string>) {
  try {
    const { data_source_id } = body;
    if (!data_source_id) {
      return new Response(JSON.stringify({ error: 'data_source_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sampleData, numericColumns, categoricalColumns, dateColumns } = 
      await getDataAndColumns(supabase, userId, data_source_id);

    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) throw new Error('GROQ_API_KEY not configured');

    const prompt = `Analyze this dataset and suggest 5-8 meaningful visualizations.

Dataset structure:
- Numeric columns: ${numericColumns.join(', ')}
- Categorical columns: ${categoricalColumns.join(', ')}
- Date columns: ${dateColumns.join(', ')}
- Total rows: ${sampleData.length}

Sample data (first 3 rows):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}

Generate chart recommendations in this JSON format:
{
  "recommendations": [
    {
      "type": "pie|bar|line|scatter|gauge|area",
      "title": "Chart title",
      "x_axis": "column_name",
      "y_axis": "column_name",
      "reasoning": "Why this chart is useful",
      "priority": "high|medium|low"
    }
  ]
}

Focus on:
1. Business insights (trends, comparisons, distributions)
2. Correlations between metrics
3. Time-based analysis if dates exist
4. Category-based breakdowns`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a data visualization expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI recommendations');
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '{}';
    const recommendationsData = JSON.parse(content);

    return new Response(JSON.stringify(recommendationsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handleAIRecommendations:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate AI recommendations', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePrescriptiveAnalytics(supabase: any, userId: string, body: any, corsHeaders: Record<string, string>) {
  try {
    const { data_source_id } = body;
    if (!data_source_id) {
      return new Response(JSON.stringify({ error: 'data_source_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sampleData, numericColumns, categoricalColumns } = 
      await getDataAndColumns(supabase, userId, data_source_id);

    const insights = [];

    // Analyze trends
    if (numericColumns.length > 0) {
      const col = numericColumns[0];
      const values = sampleData.map(d => Number(d[col]) || 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      if (max > avg * 2) {
        insights.push({
          type: 'opportunity',
          title: `High ${col} Outliers Detected`,
          description: `Some records show ${col} values significantly above average (${max.toFixed(2)} vs avg ${avg.toFixed(2)})`,
          recommendation: `Investigate top performers to identify success patterns and replicate across other areas`,
          priority: 'high'
        });
      }

      if (min < avg * 0.5 && min > 0) {
        insights.push({
          type: 'risk',
          title: `Low ${col} Performance`,
          description: `Some records show ${col} below 50% of average`,
          recommendation: `Review underperforming areas and implement improvement strategies`,
          priority: 'high'
        });
      }
    }

    // Category analysis
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const catCol = categoricalColumns[0];
      const numCol = numericColumns[0];
      
      const grouped: Record<string, number[]> = {};
      sampleData.forEach(d => {
        const key = String(d[catCol]);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(Number(d[numCol]) || 0);
      });

      const avgByCategory = Object.entries(grouped).map(([cat, vals]) => ({
        category: cat,
        avg: vals.reduce((a, b) => a + b, 0) / vals.length
      }));

      avgByCategory.sort((a, b) => b.avg - a.avg);

      if (avgByCategory.length >= 2) {
        const top = avgByCategory[0];
        const bottom = avgByCategory[avgByCategory.length - 1];

        insights.push({
          type: 'insight',
          title: `${catCol} Performance Variation`,
          description: `${top.category} leads with ${top.avg.toFixed(2)} average ${numCol}, while ${bottom.category} shows ${bottom.avg.toFixed(2)}`,
          recommendation: `Analyze best practices from ${top.category} and apply to lower-performing categories`,
          priority: 'medium'
        });
      }
    }

    // General recommendations
    insights.push({
      type: 'action',
      title: 'Data-Driven Decision Making',
      description: `Dataset contains ${sampleData.length} records across ${numericColumns.length} metrics`,
      recommendation: `Use visualizations to identify patterns, set KPI targets, and monitor progress regularly`,
      priority: 'medium'
    });

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handlePrescriptiveAnalytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate prescriptive analytics', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
