import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  // Get CORS headers with proper origin
  const origin = req.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Length': '0',
        'Content-Type': 'text/plain; charset=utf-8',
        'Vary': 'Origin',
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError) {
      console.error('Auth error:', authError.message);
    }
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { question, fileId: providedFileId, dataSourceId, visualizations } = requestBody;

    if (!question) {
      return new Response(JSON.stringify({ error: 'No question provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let vizContext = '';
    // Ensure we have a mutable array
    let vizList: any[] = Array.isArray(visualizations) ? [...visualizations] : [];

    if (vizList.length > 0) {
      vizContext = `

AVAILABLE VISUALIZATIONS IN THE DASHBOARD:
${vizList.map((v: any, i: number) => `
${i + 1}. "${v.title}" - ${v.type.toUpperCase()} CHART
   Shows: ${v.xAxis} vs ${v.dataKey}
   Key Insight: ${v.insight || 'Analysis of ' + v.title}
`).join('')}
`;
    }


    let context = '';
    let dataStats = '';
    let vizSummaries: any[] = [];
    let fileId = providedFileId; // Use let so we can reassign

    // If dataSourceId is provided, find the corresponding uploaded_file
    if (!fileId && dataSourceId) {
      try {
        const { data: dataSource, error: dataSourceError } = await supabaseClient
          .from('data_sources')
          .select('name, created_by')
          .eq('id', dataSourceId)
          .eq('created_by', user.id)
          .maybeSingle();

        if (dataSource && !dataSourceError) {
          // Find uploaded_file by file_name matching data_source name
          const { data: matchingFile, error: fileError } = await supabaseClient
            .from('uploaded_files')
            .select('id')
            .eq('file_name', dataSource.name)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (matchingFile && !fileError) {
            fileId = matchingFile.id;
          }
        }
      } catch (err) {
        console.warn('Error fetching data source for chat:', err);
        // Continue without fileId - chat can still work
      }
    }

    // If still no fileId, automatically get the most recent file for the user
    if (!fileId) {
      try {
        const { data: recentFile, error: recentFileError } = await supabaseClient
          .from('uploaded_files')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentFile && !recentFileError) {
          fileId = recentFile.id;
        }
      } catch (err) {
        console.warn('Error fetching recent file for chat:', err);
        // Continue without fileId - chat can still work
      }
    }

    // If no visualizations provided but we have a fileId, fetch them automatically
    if (vizList.length === 0 && fileId) {
      try {
        const { data: fetchedViz, error: vizError } = await supabaseClient
          .from('visualizations')
          .select('chart_config, chart_type, insight')
          .eq('file_id', fileId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (fetchedViz && fetchedViz.length > 0 && !vizError) {
          // Transform database visualizations to match expected format
          vizList = fetchedViz.map((v: any) => {
            const config = v.chart_config || {};
            return {
              title: config.title || 'Chart',
              type: v.chart_type || 'bar',
              xAxis: config.xAxis?.title?.text || config.xAxis || '',
              dataKey: config.series?.[0]?.name || config.yAxis?.title?.text || '',
              insight: v.insight || '',
            };
          });

          // Update vizContext with fetched visualizations
          vizContext = `

AVAILABLE VISUALIZATIONS IN THE DASHBOARD:
${vizList.map((v: any, i: number) => `
${i + 1}. "${v.title}" - ${v.type.toUpperCase()} CHART
   Shows: ${v.xAxis} vs ${v.dataKey}
   Key Insight: ${v.insight || 'Analysis of ' + v.title}
`).join('')}
`;
        }
      } catch (err) {
        console.warn('Error fetching visualizations for chat:', err);
        // Continue without visualizations - chat can still work
      }
    }

    // Build rich, compact summaries for each chart to answer detailed questions accurately
    if (fileId) {
      const { data: records } = await supabaseClient
        .from('data_records')
        .select('row_data')
        .eq('file_id', fileId)
        .limit(1000); // fetch more rows but only include compact aggregates in the prompt

      if (records && records.length > 0) {
        const headers = Object.keys(records[0].row_data);
        const allData = records.map(r => r.row_data);

        const safeNumber = (v: unknown) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const groupSum = (rows: any[], key: string, valueKey: string) => {
          const m = new Map<string, number>();
          for (const row of rows) {
            const k = String(row?.[key]);
            const val = safeNumber(row?.[valueKey]);
            if (!k) continue;
            m.set(k, (m.get(k) ?? 0) + val);
          }
          return Array.from(m.entries()).map(([k, v]) => ({ key: k, value: v }));
        };

        // Linear regression forecasting
        const linearForecast = (series: Array<{ x: string, y: number }>, periods: number) => {
          if (series.length < 2) return [];

          const n = series.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

          for (let i = 0; i < n; i++) {
            const x = i;
            const y = series[i].y;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
          }

          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;

          const forecasts = [];
          for (let i = 0; i < periods; i++) {
            const x = n + i;
            const predicted = slope * x + intercept;
            forecasts.push({
              x: `Forecast +${i + 1}`,
              y: Math.max(0, Math.round(predicted * 100) / 100)
            });
          }

          return forecasts;
        };

        // Moving average forecast
        const movingAvgForecast = (series: Array<{ x: string, y: number }>, window: number, periods: number) => {
          if (series.length < window) return [];

          const lastN = series.slice(-window);
          const avg = lastN.reduce((sum, p) => sum + p.y, 0) / window;

          const forecasts = [];
          for (let i = 0; i < periods; i++) {
            forecasts.push({
              x: `Forecast +${i + 1}`,
              y: Math.round(avg * 100) / 100
            });
          }

          return forecasts;
        };

        // Calculate trend direction and strength
        const analyzeTrend = (series: Array<{ x: string, y: number }>) => {
          if (series.length < 2) return { direction: 'stable', strength: 0, change: 0 };

          const first = series.slice(0, Math.ceil(series.length / 3));
          const last = series.slice(-Math.ceil(series.length / 3));

          const firstAvg = first.reduce((sum, p) => sum + p.y, 0) / first.length;
          const lastAvg = last.reduce((sum, p) => sum + p.y, 0) / last.length;

          const change = ((lastAvg - firstAvg) / firstAvg) * 100;
          const absChange = Math.abs(change);

          let direction = 'stable';
          let strength: 'strong' | 'moderate' | 'weak' | 'none' = 'none';

          if (absChange > 1) {
            direction = change > 0 ? 'increasing' : 'decreasing';
            strength = absChange > 20 ? 'strong' : absChange > 10 ? 'moderate' : 'weak';
          }

          return {
            direction,
            strength,
            change: Math.round(change * 100) / 100
          };
        };

        if (Array.isArray(vizList) && vizList.length > 0) {
          // Relevance filter: prioritize charts whose title/fields match the question
          let selected = [...vizList];
          const q = (question || '').toString().toLowerCase();
          if (q && selected.length > 6) {
            const scored = selected.map((v: any) => {
              const title = (v?.title || '').toString().toLowerCase();
              const keys = [v?.xAxis, v?.dataKey, v?.secondaryDataKey].filter(Boolean).map((s: any) => String(s).toLowerCase());
              const text = [title, ...keys].join(' ');
              let score = 0;
              for (const token of q.split(/\W+/).filter(Boolean)) {
                if (text.includes(token)) score += 1;
              }
              return { v, score };
            });
            scored.sort((a, b) => b.score - a.score);
            selected = scored.slice(0, 6).map(s => s.v);
          }

          for (const v of selected) {
            const xKey = v?.xAxis;
            const yKey = v?.dataKey;
            if (!xKey || !yKey) continue;

            const grouped = groupSum(allData, xKey, yKey);
            const total = grouped.reduce((a, b) => a + b.value, 0);

            let summary: any = {
              title: v?.title,
              type: v?.type,
              xAxis: xKey,
              dataKey: yKey,
              total,
            };

            if (v?.type === 'line' || v?.type === 'area') {
              const allKeysNumeric = grouped.every(g => !Number.isNaN(Number(g.key)));
              const sorted = grouped
                .sort((a, b) =>
                  allKeysNumeric ? Number(a.key) - Number(b.key) : String(a.key).localeCompare(String(b.key))
                );
              const lastN = 24;
              const sliced = sorted.slice(-lastN);
              summary.series = sliced.map(p => ({ x: p.key, y: p.value }));

              // Add predictive analytics
              const trend = analyzeTrend(summary.series);
              const linearPredictions = linearForecast(summary.series, 3);
              const maPredictions = movingAvgForecast(summary.series, Math.min(6, summary.series.length), 3);

              summary.trend = trend;
              summary.predictions = {
                linear: linearPredictions,
                movingAverage: maPredictions
              };
            } else if (v?.type === 'pie') {
              const top = [...grouped].sort((a, b) => b.value - a.value).slice(0, 6);
              summary.distribution = top.map(p => ({
                label: p.key,
                value: p.value,
                percent: total ? +(((p.value / total) * 100).toFixed(2)) : 0,
              }));
            } else {
              const top = [...grouped].sort((a, b) => b.value - a.value).slice(0, 8);
              summary.top = top;
            }

            if (v?.secondaryDataKey) {
              const grouped2 = groupSum(allData, xKey, v.secondaryDataKey);
              const allKeysNumeric2 = grouped2.every(g => !Number.isNaN(Number(g.key)));
              const sorted2 = grouped2.sort((a, b) =>
                allKeysNumeric2 ? Number(a.key) - Number(b.key) : String(a.key).localeCompare(String(b.key))
              );
              const lastN2 = 24;

              if (v?.type === 'line' || v?.type === 'area') {
                const series2 = sorted2.slice(-lastN2).map(p => ({ x: p.key, y: p.value }));
                summary.secondarySeries = series2;

                const trend2 = analyzeTrend(series2);
                const linearPred2 = linearForecast(series2, 3);
                const maPred2 = movingAvgForecast(series2, Math.min(6, series2.length), 3);

                summary.secondaryTrend = trend2;
                summary.secondaryPredictions = {
                  linear: linearPred2,
                  movingAverage: maPred2
                };
              } else {
                summary.secondarySeries = [...sorted2].sort((a, b) => b.value - a.value).slice(0, 8);
              }
            }

            vizSummaries.push(summary);
          }
        }

        // Compact summaries if prompt is too large
        let summaries: any[] = vizSummaries;
        let vizSummaryJson = JSON.stringify(summaries);
        const approxSize = vizSummaryJson.length + (vizContext?.length || 0);
        if (approxSize > 24000) {
          summaries = summaries.map((s: any) => {
            const copy: any = { ...s };
            if (Array.isArray(copy.series)) copy.series = copy.series.slice(-12);
            if (Array.isArray(copy.secondarySeries)) copy.secondarySeries = copy.secondarySeries.slice(-12);
            if (Array.isArray(copy.distribution)) copy.distribution = copy.distribution.slice(0, 5);
            if (Array.isArray(copy.top)) copy.top = copy.top.slice(0, 5);
            // Keep predictions but trim if needed
            if (copy.predictions) {
              if (copy.predictions.linear) copy.predictions.linear = copy.predictions.linear.slice(0, 2);
              if (copy.predictions.movingAverage) copy.predictions.movingAverage = copy.predictions.movingAverage.slice(0, 2);
            }
            if (copy.secondaryPredictions) {
              if (copy.secondaryPredictions.linear) copy.secondaryPredictions.linear = copy.secondaryPredictions.linear.slice(0, 2);
              if (copy.secondaryPredictions.movingAverage) copy.secondaryPredictions.movingAverage = copy.secondaryPredictions.movingAverage.slice(0, 2);
            }
            return copy;
          });
          vizSummaryJson = JSON.stringify(summaries);
        }
        if (vizSummaryJson.length + (vizContext?.length || 0) > 32000) {
          summaries = summaries.slice(0, 3);
          vizSummaryJson = JSON.stringify(summaries);
        }

        dataStats = `
DATA OVERVIEW:
Total Records: ${records.length}
Columns: ${headers.join(', ')}

VIZ_SUMMARIES:
${vizSummaryJson}
`;

        context = dataStats;
      }
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured. Please set GROQ_API_KEY in environment variables.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get preprocessing metadata if available
    let preprocessingContext = '';
    if (fileId) {
      try {
        // Get data source associated with this file
        const { data: uploadedFile, error: uploadedFileError } = await supabaseClient
          .from('uploaded_files')
          .select('id')
          .eq('id', fileId)
          .maybeSingle();

        if (uploadedFile && !uploadedFileError) {
          // Find data source by file name or created_by
          const { data: dataSources, error: dataSourcesError } = await supabaseClient
            .from('data_sources')
            .select('metadata, target_column')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (dataSources && dataSources.length > 0 && !dataSourcesError) {
            const dataSource = dataSources[0];

            if (dataSource?.metadata?.preprocessing_result?.data_summary) {
              const featureImportance = dataSource.metadata.preprocessing_result.feature_importance || {};
              const topFeatures = Object.entries(featureImportance)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 5)
                .map(([name, score]) => `- ${name}: ${(Number(score) * 100).toFixed(1)}%`)
                .join('\n');

              preprocessingContext = `\n\nPREPROCESSING & FEATURE ENGINEERING METADATA:\n${dataSource.metadata.preprocessing_result.data_summary}${topFeatures ? `\n\nFeature Importance (Top 5):\n${topFeatures}` : ''}`;
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching preprocessing metadata for chat:', err);
        // Continue without preprocessing context - chat can still work
      }
    }

    const systemPrompt = `You are Zerra's AI data analyst assistant with access to comprehensive preprocessing and feature engineering data. You help users understand their data through natural language.

${vizContext}

${context ? 'DATASET CONTEXT:\n' + dataStats : 'No dataset loaded. Ask user to upload data first.'}${preprocessingContext}

When answering questions:
- Be clear, helpful, and concise
- Reference specific data points, visualizations, and feature importance when available
- Use preprocessing metadata to provide deeper insights about data quality and feature characteristics
- If asked about the dataset, provide a comprehensive overview including feature engineering insights
- Reference feature importance scores when discussing which features matter most
- Use bullet points for detailed information
- If you don't have enough information, ask the user to clarify`;

    const fullPrompt = `${systemPrompt}\n\nUser question: ${question}`;

    // Use Groq API with Llama 3.3
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);

      let errorMessage = 'AI service error';
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed?.error?.message || parsed?.error || parsed?.message || errorText;
      } catch {
        errorMessage = errorText || 'Unknown error occurred';
      }

      if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid API key. Please check your GROQ_API_KEY configuration.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. ' + errorMessage;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: response.status >= 500 ? 500 : response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content || 'No response generated';

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
