import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
// Get CORS headers - dynamically set origin to avoid credentials conflict
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  // Get CORS headers with proper origin
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests FIRST - before ANY other processing
  // This MUST return 200 OK for CORS to work
  // Must be the absolute first thing to avoid any Supabase middleware interference
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    console.log('Origin:', req.headers.get('origin'));
    console.log('Access-Control-Request-Method:', req.headers.get('access-control-request-method'));
    
    // Return immediately with proper CORS headers
    // No try-catch needed - this must always succeed
    return new Response(null, { 
      status: 200,
      statusText: 'OK',
      headers: {
        ...corsHeaders,
        'Content-Length': '0',
        'Content-Type': 'text/plain; charset=utf-8',
        'Vary': 'Origin',
      }
    });
  }
  
  // Log request for debugging
  console.log(`📥 Received ${req.method} request to process-file`);
  console.log('Origin:', req.headers.get('origin'));

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? 
                    Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL');
      throw new Error('Missing SUPABASE_URL environment variable');
    }

    if (!serviceRoleKey && !anonKey) {
      console.error('Missing both SUPABASE_SERVICE_ROLE_KEY and anon key');
      throw new Error('Missing Supabase API keys. Need either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_PUBLISHABLE_KEY');
    }

    // Create service role client for admin operations (bypasses RLS)
    // Prefer service role key, fallback to anon key (less secure but works)
    const adminKey = serviceRoleKey || anonKey;
    console.log(`Using ${serviceRoleKey ? 'service role' : 'anon'} key for admin operations`);
    const supabaseAdmin = createClient(supabaseUrl, adminKey);
    
    // Create user client for RLS operations
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    const supabaseClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      }
    );

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

    // Handle FormData parsing - check content type first
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (!contentType.includes('multipart/form-data') && !contentType.includes('form-data')) {
      console.warn('Unexpected content type:', contentType);
      // Continue anyway - some clients might not set it correctly
    }
    
    let formData: FormData;
    let file: File | null = null;
    
    try {
      formData = await req.formData();
      file = formData.get('file') as File;
      console.log('File extracted:', file ? { name: file.name, size: file.size, type: file.type } : 'null');
    } catch (formError) {
      console.error('Error parsing form data:', formError);
      return new Response(JSON.stringify({ error: 'Invalid form data', details: formError instanceof Error ? formError.message : 'Unknown error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Get user's tenant_id first (needed for data_sources)
    let userProfile;
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      userProfile = existingProfile;
    } else {
      // Create user profile if it doesn't exist
      // First, get or create a default tenant
      const { data: defaultTenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', 'default')
        .single();
      
      let tenant;
      if (defaultTenant) {
        tenant = defaultTenant;
      } else {
        const { data: newTenant } = await supabaseAdmin
          .from('tenants')
          .insert({
            name: 'Default Tenant',
            slug: 'default',
            status: 'active',
          })
          .select()
          .single();
        tenant = newTenant;
      }
      
      // Create user profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          tenant_id: tenant.id,
          role: 'analyst',
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user profile:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user profile', details: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      userProfile = newProfile;
    }

    // Create file record using admin client (bypasses RLS)
    console.log('Creating file record for user:', user.id);
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from('uploaded_files')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        status: 'processing',
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error creating file record:', fileError);
      console.error('Error details:', JSON.stringify(fileError, null, 2));
      console.error('User ID:', user.id);
      console.error('File name:', file.name);
      return new Response(JSON.stringify({ 
        error: 'Failed to create file record', 
        details: fileError.message,
        code: fileError.code,
        hint: fileError.hint,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('File record created successfully:', fileRecord.id);

    // Parse CSV/Excel with proper handling and sanitization
    let rows: Record<string, any>[] = [];

    const isExcel = file.type.includes('spreadsheet') || /\.(xlsx|xls)$/i.test(file.name);
    const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);

    if (isExcel) {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[];
    } else if (isCsv) {
      const text = await file.text();
      rows = parseCSV(text);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize null bytes and problematic characters
    rows = rows.map(sanitizeRow);

    console.log(`Parsed ${rows.length} rows from ${file.name}`);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create data_source record using admin client (bypasses RLS)
    console.log('Creating data source for tenant:', userProfile.tenant_id);
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    
    const dataSourceData = {
      tenant_id: userProfile.tenant_id,
      name: file.name,
      type: 'file' as const,
      source_type: file.type.includes('spreadsheet') ? 'excel' : 'csv',
      file_name: file.name,
      file_size: file.size,
      status: 'syncing' as const, // Use 'syncing' instead of 'processing' to match constraint
      created_by: user.id,
    };
    
    console.log('Data source data:', JSON.stringify(dataSourceData, null, 2));
    
    const { data: dataSource, error: dataSourceError } = await supabaseAdmin
      .from('data_sources')
      .insert(dataSourceData)
      .select()
      .single();

    if (dataSourceError) {
      console.error('Error creating data source:', dataSourceError);
      console.error('Error details:', JSON.stringify(dataSourceError, null, 2));
      console.error('Error code:', dataSourceError.code);
      console.error('Error hint:', dataSourceError.hint);
      return new Response(JSON.stringify({ 
        error: 'Failed to create data source', 
        details: dataSourceError.message,
        code: dataSourceError.code,
        hint: dataSourceError.hint,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Data source created successfully:', dataSource.id);

    // MANDATORY: Use local preprocessing library for feature extraction and ML training
    console.log(`Starting preprocessing and feature engineering for ${rows.length} rows...`);
    
    // For large datasets, limit rows for initial processing to avoid timeout
    const MAX_ROWS_FOR_PREPROCESSING = 10000;
    const rowsToProcess = rows.length > MAX_ROWS_FOR_PREPROCESSING 
      ? rows.slice(0, MAX_ROWS_FOR_PREPROCESSING)
      : rows;
    let dataToStore = rows; // Default to storing all rows
    let preprocessingResult: any = null;
    
    if (rows.length > MAX_ROWS_FOR_PREPROCESSING) {
      console.log(`Large dataset detected (${rows.length} rows). Processing first ${MAX_ROWS_FOR_PREPROCESSING} rows for metadata extraction.`);
    }
    
    try {
      // Import preprocessing library
      console.log('Importing preprocessing library...');
      const { preprocessData, extractFeatureMetadata, detectTargetColumn, generateDataSummary } = await import('../_shared/preprocessing.ts');
      console.log('Preprocessing library imported successfully');
      
      // Step 1: Extract feature metadata (use sample for large datasets)
      console.log('Extracting feature metadata...');
      const featureMetadata = await extractFeatureMetadata(rowsToProcess);
      console.log(`Extracted metadata for ${featureMetadata.total_features} features`);
      console.log(`- Numeric: ${featureMetadata.numeric_features}, Categorical: ${featureMetadata.categorical_features}, Temporal: ${featureMetadata.temporal_features}`);
      console.log(`- Data Quality Score: ${featureMetadata.data_quality_score.toFixed(1)}/100`);
      console.log(`- ML Readiness: ${featureMetadata.ml_readiness}`);
      
      // Step 2: Auto-detect target column
      const autoDetectedTarget = detectTargetColumn(featureMetadata);
      console.log(`Auto-detected target column: ${autoDetectedTarget || 'None'}`);
      
      // Step 3: Run comprehensive preprocessing (on sample for large datasets)
      console.log('Running comprehensive preprocessing...');
      preprocessingResult = await preprocessData(rowsToProcess, {
        target_column: autoDetectedTarget || null,
        auto_detect_target: true,
        handle_missing: 'mean',
        handle_outliers: 'cap',
        encode_categorical: true,
        scale_numeric: true,
        feature_selection: false, // Keep all features for now
      });
      
      console.log(`Preprocessing completed:`);
      console.log(`- Processed ${preprocessingResult.processed_data.length} rows`);
      console.log(`- Transformations: ${preprocessingResult.transformations_applied.join(', ')}`);
      console.log(`- Feature importance calculated: ${Object.keys(preprocessingResult.feature_importance || {}).length} features`);
      
      // Step 4: Store processed data (use original rows if we processed a sample)
      dataToStore = rows.length > MAX_ROWS_FOR_PREPROCESSING ? rows : preprocessingResult.processed_data;
      console.log(`Storing ${dataToStore.length} rows in database...`);
      
      const chunkSize = 500;
      let storedCount = 0;
      for (let i = 0; i < dataToStore.length; i += chunkSize) {
        const chunk = dataToStore.slice(i, i + chunkSize);
        const dataRecords = chunk.map(row => ({
          file_id: fileRecord.id,
          row_data: sanitizeRow(row), // Sanitize to remove invalid characters
        }));

        const { error: insertError } = await supabaseAdmin
          .from('data_records')
          .insert(dataRecords);
        
        if (insertError) {
          console.error(`Error inserting chunk ${i}-${i + chunk.length}:`, insertError);
          throw new Error(`Failed to store data records: ${insertError.message}`);
        }
        
        storedCount += chunk.length;
        if (storedCount % 1000 === 0) {
          console.log(`Stored ${storedCount}/${dataToStore.length} rows...`);
        }
      }
      console.log(`Successfully stored ${storedCount} rows`);
      
      // Step 5: Generate data summary for Gen AI (use processed data or sample)
      const summaryData = preprocessingResult.processed_data.length > 0 
        ? preprocessingResult.processed_data 
        : rowsToProcess;
      const dataSummary = generateDataSummary(summaryData, preprocessingResult.feature_metadata);
      console.log('Data Summary for Gen AI generated');
      
      // Step 6: Update data source with comprehensive metadata
      await supabaseAdmin
        .from('data_sources')
        .update({
          status: 'active',
          row_count: dataToStore.length, // Use actual stored count
          metadata: {
            feature_metadata: preprocessingResult.feature_metadata,
            preprocessing_result: {
              transformations_applied: preprocessingResult.transformations_applied,
              cleaning_applied: preprocessingResult.cleaning_applied,
              feature_engineering_applied: preprocessingResult.feature_engineering_applied,
              target_column: preprocessingResult.target_column,
              feature_importance: preprocessingResult.feature_importance,
              correlation_matrix: preprocessingResult.correlation_matrix,
              data_summary: dataSummary,
            },
            warnings: preprocessingResult.warnings,
            errors: preprocessingResult.errors,
          },
          schema_info: preprocessingResult.feature_metadata.feature_metadata,
          target_column: preprocessingResult.target_column || null,
        })
        .eq('id', dataSource.id);
      
      console.log('✅ Preprocessing and feature engineering completed successfully');
      
      // Step 7: Trigger ML training if target column is available (optional - can call external H2O service)
      // Don't await this - let it run asynchronously to avoid blocking
      if (preprocessingResult.target_column) {
        const H2O_SERVICE_URL = Deno.env.get('H2O_SERVICE_URL') || 'http://localhost:8000';
        console.log(`Triggering ML training for target: ${preprocessingResult.target_column} (async)`);
        
        // Fire and forget - don't block on ML training
        fetch(`${H2O_SERVICE_URL}/train`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: preprocessingResult.processed_data,
            tenant_id: userProfile.tenant_id,
            data_source_id: dataSource.id,
            target_column: preprocessingResult.target_column,
            feature_metadata: preprocessingResult.feature_metadata,
            feature_importance: preprocessingResult.feature_importance,
          }),
        }).then(mlResponse => {
          if (mlResponse.ok) {
            return mlResponse.json();
          } else {
            console.warn('ML training service unavailable');
          }
        }).then(mlResult => {
          if (mlResult) {
            console.log('ML training triggered:', mlResult.message);
          }
        }).catch(mlError => {
          console.warn('ML training service unavailable:', mlError);
        });
      }
      
    } catch (preprocessingError) {
      console.error('Preprocessing error:', preprocessingError);
      console.error('Error details:', preprocessingError instanceof Error ? preprocessingError.message : String(preprocessingError));
      console.error('Stack:', preprocessingError instanceof Error ? preprocessingError.stack : 'No stack trace');
      
      // Fallback: store raw data if preprocessing fails or times out
      console.warn('Preprocessing failed, storing raw data only');
      
      try {
        const chunkSize = 500;
        let storedCount = 0;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const dataRecords = chunk.map(row => ({
            file_id: fileRecord.id,
            row_data: sanitizeRow(row), // Sanitize to remove invalid characters
          }));

          const { error: insertError } = await supabaseAdmin
            .from('data_records')
            .insert(dataRecords);
          
          if (insertError) {
            console.error(`Error inserting fallback chunk ${i}-${i + chunk.length}:`, insertError);
            throw insertError;
          }
          
          storedCount += chunk.length;
          if (storedCount % 1000 === 0) {
            console.log(`Fallback: Stored ${storedCount}/${rows.length} rows...`);
          }
        }
        
        // Still update data source with basic info
        await supabaseAdmin
          .from('data_sources')
          .update({
            status: 'active',
            row_count: rows.length,
            metadata: {
              preprocessing_error: preprocessingError instanceof Error ? preprocessingError.message : String(preprocessingError),
              raw_data_stored: true,
            },
          })
          .eq('id', dataSource.id);
        
        console.log('Raw data stored successfully as fallback');
      } catch (fallbackError) {
        console.error('Even fallback storage failed:', fallbackError);
        return new Response(JSON.stringify({ 
          error: 'Failed to process file', 
          details: preprocessingError instanceof Error ? preprocessingError.message : String(preprocessingError),
          fallback_error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate insights and visualizations using dynamically extracted features
    // Use sample data for large files to avoid timeout
    // Wrap in try-catch to avoid blocking on timeout
    let insights: any = null;
    try {
      const insightsData = rows.length > 5000 ? rows.slice(0, 5000) : rows;
      console.log(`Generating insights for ${insightsData.length} rows (${rows.length > 5000 ? 'sampled from ' + rows.length : 'all'} rows)`);
      
      // Set a timeout for insights generation to avoid blocking
      const insightsPromise = generateInsightsWithFeatures(insightsData, file.name, dataSource.id, supabaseAdmin, userProfile.tenant_id);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Insights generation timeout')), 15000) // 15 second timeout
      );
      
      insights = await Promise.race([insightsPromise, timeoutPromise]);
      
      // Store visualizations using admin client (bypasses RLS)
      if (insights.visualizations && insights.visualizations.length > 0) {
        const visualizations = insights.visualizations.map((viz: any) => ({
          file_id: fileRecord.id,
          user_id: user.id,
          chart_type: viz.type,
          chart_config: viz.config,
          insight: viz.insight,
        }));

        const { error: vizError } = await supabaseAdmin
          .from('visualizations')
          .insert(visualizations);

        if (vizError) {
          console.error('Error storing visualizations:', vizError);
        } else {
          console.log(`Stored ${visualizations.length} visualizations`);
        }
      }
    } catch (insightsError) {
      console.warn('Insights generation failed or timed out, continuing without visualizations:', insightsError);
      // Continue without insights - file is already processed and stored
    }

    // Update file status using admin client
    await supabaseAdmin
      .from('uploaded_files')
      .update({ status: 'completed' })
      .eq('id', fileRecord.id);

    // Update data source status using admin client
    await supabaseAdmin
      .from('data_sources')
      .update({ 
        status: 'active',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', dataSource.id);

    return new Response(
      JSON.stringify({
        success: true,
        file_id: fileRecord.id,
        data_source_id: dataSource.id,
        rows_count: dataToStore.length,
        rows_processed_for_metadata: rowsToProcess.length,
        summary: insights?.summary || 'File processed successfully',
        visualizations: insights?.visualizations || [],
        preprocessing_completed: preprocessingResult !== null,
        ml_training_triggered: preprocessingResult?.target_column ? true : false,
        message: `File processed successfully. ${dataToStore.length} rows stored${preprocessingResult ? ', feature engineering completed' : ', raw data stored'}.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in process-file function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && error.cause ? String(error.cause) : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: 'File processing failed',
        message: errorMessage,
        ...(errorDetails && { details: errorDetails })
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove null bytes and control characters that Postgres rejects
    return value.replace(/\u0000/g, '');
  }
  return value;
}

function sanitizeRow(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const key in row) {
    const v = row[key];
    if (Array.isArray(v)) {
      clean[key] = v.map(sanitizeValue);
    } else if (v && typeof v === 'object') {
      clean[key] = sanitizeRow(v as Record<string, any>);
    } else {
      clean[key] = sanitizeValue(v);
    }
  }
  return clean;
}

function parseCSV(text: string): Record<string, any>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Try to parse as number
      const numValue = parseFloat(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });
    
    rows.push(row);
  }

  return rows;
}

function detectTargetColumn(headers: string[], rows: Record<string, any>[]): string | null {
  // Common target column patterns for ML
  const targetPatterns = [
    /^(target|label|y|output|prediction|result|outcome|class|category)$/i,
    /^(price|cost|amount|value|revenue|sales|profit|loss)$/i,
    /^(score|rating|rank|priority)$/i,
    /^(status|state|condition|quality)$/i,
  ];

  // Find numeric columns that could be targets
  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    
    // Check if matches target patterns
    for (const pattern of targetPatterns) {
      if (pattern.test(lowerHeader)) {
        // Verify it's numeric
        const sampleValues = rows.slice(0, 100).map(r => r[header]).filter(v => v != null);
        const numericCount = sampleValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
        
        if (numericCount > sampleValues.length * 0.8) {
          return header;
        }
      }
    }
  }

  // Fallback: find first numeric column that's not an ID
  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader.includes('id') || lowerHeader.includes('_id')) continue;
    
    const sampleValues = rows.slice(0, 100).map(r => r[header]).filter(v => v != null);
    const numericCount = sampleValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
    
    if (numericCount > sampleValues.length * 0.8) {
      return header;
    }
  }

  return null;
}

async function generateInsightsWithFeatures(
  data: Record<string, any>[], 
  fileName: string,
  dataSourceId: string,
  supabaseClient: any,
  tenantId: string
) {
  // Fetch dynamically extracted features from preprocessing
  const { data: dataSource } = await supabaseClient
    .from('data_sources')
    .select('schema_info, metadata, target_column')
    .eq('id', dataSourceId)
    .eq('tenant_id', tenantId)
    .single();

  // Get ML model for this data source (if trained)
  const { data: mlModel } = await supabaseClient
    .from('ml_models')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .eq('tenant_id', tenantId)
    .eq('status', 'deployed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Get recent predictions for chart generation
  let predictions: any[] = [];
  if (mlModel) {
    const { data: recentPredictions } = await supabaseClient
      .from('predictions')
      .select('*')
      .eq('model_id', mlModel.id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    predictions = recentPredictions || [];
  }

  // Extract feature columns from preprocessing metadata
  let featureColumns: string[] = [];
  if (dataSource?.metadata?.feature_metadata?.feature_metadata) {
    // Use preprocessed feature metadata
    const featureMetadata = dataSource.metadata.feature_metadata.feature_metadata;
    featureColumns = Object.keys(featureMetadata).filter(col => {
      const colInfo = featureMetadata[col];
      return colInfo?.feature_type && 
             col !== dataSource.target_column &&
             !col.toLowerCase().includes('id');
    });
  } else if (dataSource?.schema_info) {
    // Fallback to schema_info
    featureColumns = Object.keys(dataSource.schema_info).filter(col => {
      const colInfo = dataSource.schema_info[col];
      return colInfo?.feature_type && !col.toLowerCase().includes('id');
    });
  } else {
    // Final fallback
    featureColumns = Object.keys(data[0] || {}).filter(h => 
      h !== dataSource?.target_column && !h.toLowerCase().includes('id')
    );
  }

  // Use dynamic features for chart generation with enhanced context
  const preprocessingContext = dataSource?.metadata?.preprocessing_result?.data_summary || '';
  return await generateInsights(data, fileName, featureColumns, predictions, mlModel, preprocessingContext);
}

async function generateInsights(
  data: Record<string, any>[], 
  fileName: string,
  featureColumns?: string[],
  predictions?: any[],
  mlModel?: any,
  preprocessingContext?: string
) {
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  
  // Use dynamically extracted features if available
  const headers = featureColumns && featureColumns.length > 0 
    ? featureColumns 
    : Object.keys(data[0] || {});
  
  if (!GROQ_API_KEY) {
    console.error('GROQ_API_KEY not configured');
    return generateBasicInsights(data, headers, predictions);
  }

  try {
    const dataPreview = data.slice(0, 10);
    
    // Build context about ML model and predictions
    let mlContext = '';
    if (mlModel && predictions && predictions.length > 0) {
      mlContext = `\n\nML MODEL CONTEXT:
- Model Type: ${mlModel.model_type}
- Model Status: ${mlModel.status}
- Target Column: ${mlModel.target_column}
- Recent Predictions Available: ${predictions.length} predictions
- Model Performance: ${mlModel.metrics ? JSON.stringify(mlModel.metrics) : 'N/A'}

IMPORTANT: Generate charts that incorporate PREDICTIVE ANALYTICS:
1. Include prediction trends in time series charts
2. Show actual vs predicted comparisons where applicable
3. Highlight forecasted values for future periods
4. Use model confidence intervals if available`;
    }
    
    const preprocessingInfo = preprocessingContext 
      ? `\n\nPREPROCESSING & FEATURE ENGINEERING COMPLETED:
${preprocessingContext}

IMPORTANT: Use the preprocessed features and metadata above to generate highly accurate visualizations.`
      : '';

    const prompt = `Analyze this dataset from file "${fileName}":

DYNAMICALLY EXTRACTED FEATURES: ${headers.join(', ')}
Sample data (first 10 rows): ${JSON.stringify(dataPreview, null, 2)}
Total rows: ${data.length}${preprocessingInfo}${mlContext}

Analyze the data structure and generate 4-6 diverse, meaningful visualizations that provide different insights.

CRITICAL RULES:
1. Use ONLY the dynamically extracted feature columns listed above
2. NEVER use ID columns (id, _id, created_at, updated_at) for visualization
3. Prefer meaningful metric columns like: price, quantity, amount, total, revenue, sales, count, value, cost
4. Use categorical columns like: location, product, type, status, category, store, region, country, city for grouping
5. Use date/time columns (date, time, day, month, year) for x-axis in time series charts
6. Generate different chart types: bar (distributions), line (trends with predictions), area (cumulative), pie (proportions), composed (comparisons)
7. If ML model is available, include predictive analytics in charts (forecasts, confidence intervals, actual vs predicted)

Return ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "Brief overview of the data and key findings",
  "visualizations": [
    {
      "type": "bar|line|pie|area|composed",
      "config": {
        "title": "Descriptive chart title (e.g., 'Total Sales by Store')",
        "xAxis": "exact column name from headers for x-axis (use categorical or date columns)",
        "yAxis": "exact column name from headers for y-axis (use metric columns)",
        "dataKey": "exact column name from headers to visualize (must be a metric column)",
        "secondaryDataKey": "exact column name for secondary metric (optional, for composed charts only)"
      },
      "insight": "Key insight or finding from this visualization"
    }
  ]
}

IMPORTANT: 
- Use exact column names from the headers
- Generate 4-6 different visualizations showing various aspects
- Avoid ID columns completely
- Focus on business metrics and meaningful comparisons`;

    const fullPrompt = `You are a data analyst. Always respond with valid JSON only.\n\n${prompt}`;

    // Use Groq API with Llama 3.1
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
            content: 'You are a data analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status, await response.text());
      return generateBasicInsights(data, headers, predictions);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    console.log('Groq response content:', content);
    
    // Extract JSON from response - try multiple strategies
    let insights = null;
    
    // Strategy 1: Try to parse the entire content as JSON
    try {
      insights = JSON.parse(content.trim());
    } catch (e) {
      // Strategy 2: Extract JSON from markdown code blocks
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        try {
          insights = JSON.parse(codeBlockMatch[1]);
        } catch (e2) {
          console.error('Failed to parse JSON from code block:', e2);
        }
      }
      
      // Strategy 3: Extract JSON object from text
      if (!insights) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            insights = JSON.parse(jsonMatch[0]);
          } catch (e3) {
            console.error('Failed to parse extracted JSON:', e3);
          }
        }
      }
    }
    
    if (insights && insights.visualizations && Array.isArray(insights.visualizations)) {
      console.log(`✅ Generated ${insights.visualizations.length} visualizations from AI`);
      // Validate that we have at least some visualizations
      if (insights.visualizations.length > 0) {
        return insights;
      }
    }
    
    console.log('⚠️ AI response invalid, falling back to basic insights');
    return generateBasicInsights(data, headers, predictions);
  } catch (error) {
    console.error('Error generating insights with Groq:', error);
    return generateBasicInsights(data, headers, predictions);
  }
}

function generateBasicInsights(
  data: Record<string, any>[], 
  headers?: string[],
  predictions?: any[]
) {
  const allHeaders = headers && headers.length > 0 
    ? headers 
    : Object.keys(data[0] || {});
  if (allHeaders.length === 0) {
    return {
      summary: `Dataset contains ${data.length} rows but no columns were detected.`,
      visualizations: [],
    };
  }

  // Filter out ID columns and timestamp columns that aren't useful for visualization
  const skipColumns = ['id', 'created_at', 'updated_at', '_id'];
  const meaningfulHeaders = allHeaders.filter(h => 
    !skipColumns.some(skip => h.toLowerCase().includes(skip.toLowerCase()))
  );

  // Find numeric columns (excluding IDs)
  const numericColumns = meaningfulHeaders.filter(h => {
    const sampleValue = data[0]?.[h];
    return typeof sampleValue === 'number' && !isNaN(sampleValue) && isFinite(sampleValue);
  });
  
  // Find string/categorical columns
  const stringColumns = meaningfulHeaders.filter(h => {
    const sampleValue = data[0]?.[h];
    return typeof sampleValue === 'string' && !numericColumns.includes(h);
  });

  // Find date/time columns
  const dateColumns = meaningfulHeaders.filter(h => {
    const colName = h.toLowerCase();
    return (colName.includes('date') || colName.includes('time') || colName.includes('day') || colName.includes('month') || colName.includes('year')) &&
           !numericColumns.includes(h);
  });

  // Find meaningful metric columns (price, quantity, amount, total, etc.)
  const metricColumns = numericColumns.filter(h => {
    const colName = h.toLowerCase();
    return colName.includes('price') || colName.includes('quantity') || colName.includes('amount') || 
           colName.includes('total') || colName.includes('revenue') || colName.includes('sales') ||
           colName.includes('count') || colName.includes('value') || colName.includes('cost');
  });

  // Find category columns (location, product, type, status, etc.)
  const categoryColumns = stringColumns.filter(h => {
    const colName = h.toLowerCase();
    return colName.includes('location') || colName.includes('product') || colName.includes('type') ||
           colName.includes('status') || colName.includes('category') || colName.includes('store') ||
           colName.includes('region') || colName.includes('country') || colName.includes('city');
  });

  const visualizations = [];

  // Chart 1: Sales/Revenue by Category (most common use case)
  if (metricColumns.length > 0 && categoryColumns.length > 0) {
    const metric = metricColumns[0];
    const category = categoryColumns[0];
    visualizations.push({
      type: 'bar',
      config: {
        title: `${metric} by ${category}`,
        xAxis: category,
        yAxis: metric,
        dataKey: metric,
      },
      insight: `Distribution of ${metric} across different ${category} categories`,
    });
  }

  // Chart 2: Time series trend if we have date/time column
  if (dateColumns.length > 0 && metricColumns.length > 0) {
    const dateCol = dateColumns[0];
    const metric = metricColumns[0];
    visualizations.push({
      type: 'line',
      config: {
        title: `${metric} Over Time`,
        xAxis: dateCol,
        yAxis: metric,
        dataKey: metric,
      },
      insight: `Trend analysis showing how ${metric} changes over time`,
    });
  }

  // Chart 3: Quantity/Count distribution
  if (metricColumns.length > 1) {
    const metric = metricColumns[1];
    const xAxis = categoryColumns[0] || stringColumns[0] || meaningfulHeaders[0];
    visualizations.push({
      type: 'bar',
      config: {
        title: `${metric} Distribution`,
        xAxis: xAxis,
        yAxis: metric,
        dataKey: metric,
      },
      insight: `Distribution analysis of ${metric} values`,
    });
  }

  // Chart 4: Pie chart for top categories (if we have categorical data)
  if (categoryColumns.length > 0 && metricColumns.length > 0 && data.length <= 50) {
    visualizations.push({
      type: 'pie',
      config: {
        title: `${metricColumns[0]} by ${categoryColumns[0]}`,
        xAxis: categoryColumns[0],
        yAxis: metricColumns[0],
        dataKey: metricColumns[0],
      },
      insight: `Proportional distribution of ${metricColumns[0]} across ${categoryColumns[0]} categories`,
    });
  }

  // Chart 5: Area chart for cumulative trends
  if (dateColumns.length > 0 && metricColumns.length > 0 && visualizations.length < 5) {
    const dateCol = dateColumns[0];
    const metric = metricColumns[dateColumns.length > 0 ? 0 : 1];
    visualizations.push({
      type: 'area',
      config: {
        title: `${metric} Cumulative Trend`,
        xAxis: dateCol,
        yAxis: metric,
        dataKey: metric,
      },
      insight: `Cumulative trend showing the growth of ${metric} over time`,
    });
  }

  // Chart 6: Composed chart comparing two metrics
  if (metricColumns.length >= 2 && categoryColumns.length > 0) {
    visualizations.push({
      type: 'composed',
      config: {
        title: `${metricColumns[0]} vs ${metricColumns[1]}`,
        xAxis: categoryColumns[0] || stringColumns[0] || meaningfulHeaders[0],
        yAxis: metricColumns[0],
        dataKey: metricColumns[0],
        secondaryDataKey: metricColumns[1],
      },
      insight: `Comparison of ${metricColumns[0]} (bars) and ${metricColumns[1]} (line) to identify relationships`,
    });
  }

  // Fallback charts if we don't have enough meaningful columns
  if (visualizations.length === 0) {
    // Use first available numeric and string columns
    if (numericColumns.length > 0 && stringColumns.length > 0) {
      visualizations.push({
        type: 'bar',
        config: {
          title: `${numericColumns[0]} by ${stringColumns[0]}`,
          xAxis: stringColumns[0],
          yAxis: numericColumns[0],
          dataKey: numericColumns[0],
        },
        insight: `Distribution of ${numericColumns[0]} across ${stringColumns[0]}`,
      });
    } else if (numericColumns.length >= 2) {
      visualizations.push({
        type: 'line',
        config: {
          title: `${numericColumns[0]} vs ${numericColumns[1]}`,
          xAxis: meaningfulHeaders[0],
          yAxis: numericColumns[0],
          dataKey: numericColumns[0],
        },
        insight: `Trend comparison of numeric values`,
      });
    }
  }

  // Ensure we have at least 3-4 charts if possible
  if (visualizations.length < 3 && numericColumns.length > 0) {
    // Add more charts using different numeric columns
    const usedMetrics = new Set(visualizations.map(v => v.config.dataKey));
    const unusedMetrics = numericColumns.filter(m => !usedMetrics.has(m));
    
    unusedMetrics.slice(0, 3 - visualizations.length).forEach((metric, idx) => {
      const xAxis = categoryColumns[0] || stringColumns[0] || meaningfulHeaders[0];
      visualizations.push({
        type: idx % 2 === 0 ? 'bar' : 'line',
        config: {
          title: `${metric} Analysis`,
          xAxis: xAxis,
          yAxis: metric,
          dataKey: metric,
        },
        insight: `Analysis of ${metric} values in the dataset`,
      });
    });
  }

  return {
    summary: `Dataset contains ${data.length} rows and ${headers.length} columns: ${headers.join(', ')}. Generated ${visualizations.length} visualizations using ${numericColumns.length} numeric columns and ${categoryColumns.length} category columns.`,
    visualizations: visualizations.length > 0 ? visualizations : [{
      type: 'bar',
      config: {
        title: 'Data Overview',
        xAxis: meaningfulHeaders[0] || 'Index',
        yAxis: meaningfulHeaders[1] || meaningfulHeaders[0] || 'Value',
        dataKey: meaningfulHeaders[1] || meaningfulHeaders[0] || 'Value',
      },
      insight: 'Basic data distribution overview',
    }],
  };
}
