/**
 * ZERRA Preprocessing & Feature Engineering Library
 * Comprehensive data preprocessing, feature extraction, and engineering
 * Designed to enable robust predictive and prescriptive analytics
 */

export interface ColumnMetadata {
  name: string;
  type: 'numeric' | 'categorical' | 'temporal' | 'boolean' | 'text' | 'id';
  feature_type?: 'continuous' | 'discrete' | 'ordinal' | 'nominal' | 'datetime' | 'target';
  dtype: 'number' | 'string' | 'boolean' | 'date';
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  sample_values: any[];
  statistics?: NumericStatistics | CategoricalStatistics | TemporalStatistics;
  encoding_suggested?: 'one-hot' | 'label' | 'ordinal' | 'target' | 'none';
  scaling_suggested?: 'standard' | 'min-max' | 'robust' | 'none';
  is_target_candidate?: boolean;
  target_score?: number;
}

export interface NumericStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  variance: number;
  q25: number;
  q50: number;
  q75: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  outliers_count: number;
  outliers_percentage: number;
  zero_count: number;
  negative_count: number;
  distribution_type?: 'normal' | 'uniform' | 'skewed' | 'bimodal';
}

export interface CategoricalStatistics {
  value_counts: Record<string, number>;
  top_values: Array<{ value: string; count: number; percentage: number }>;
  entropy: number;
  cardinality: number;
  most_frequent: string;
  least_frequent: string;
}

export interface TemporalStatistics {
  min_date: string;
  max_date: string;
  date_range_days: number;
  has_time_component: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'irregular';
  gaps_detected: number;
}

export interface FeatureMetadata {
  total_features: number;
  numeric_features: number;
  categorical_features: number;
  temporal_features: number;
  target_features: number;
  feature_metadata: Record<string, ColumnMetadata>;
  data_quality_score: number;
  preprocessing_recommendations: string[];
  ml_readiness: 'ready' | 'needs_cleaning' | 'needs_engineering' | 'not_suitable';
}

export interface PreprocessingResult {
  processed_data: Record<string, any>[];
  feature_metadata: FeatureMetadata;
  transformations_applied: string[];
  cleaning_applied: string[];
  feature_engineering_applied: string[];
  target_column?: string;
  feature_importance?: Record<string, number>;
  correlation_matrix?: Record<string, Record<string, number>>;
  warnings: string[];
  errors: string[];
}

/**
 * Main preprocessing function
 */
export async function preprocessData(
  data: Record<string, any>[],
  options: {
    target_column?: string | null;
    auto_detect_target?: boolean;
    handle_missing?: 'drop' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'interpolate';
    handle_outliers?: 'remove' | 'cap' | 'transform' | 'ignore';
    encode_categorical?: boolean;
    scale_numeric?: boolean;
    feature_selection?: boolean;
    max_features?: number;
  } = {}
): Promise<PreprocessingResult> {
  if (!data || data.length === 0) {
    throw new Error('Input data is empty');
  }

  const result: PreprocessingResult = {
    processed_data: [],
    feature_metadata: {} as FeatureMetadata,
    transformations_applied: [],
    cleaning_applied: [],
    feature_engineering_applied: [],
    warnings: [],
    errors: [],
  };

  try {
    // Step 1: Data Profiling and Metadata Extraction
    const metadata = await extractFeatureMetadata(data);
    result.feature_metadata = metadata;

    // Step 2: Data Cleaning
    let cleanedData = cleanData(data, metadata, options);
    result.cleaning_applied.push('Data cleaning completed');

    // Step 3: Handle Missing Values
    cleanedData = handleMissingValues(cleanedData, metadata, options.handle_missing || 'mean');
    result.cleaning_applied.push(`Missing values handled using: ${options.handle_missing || 'mean'}`);

    // Step 4: Handle Outliers
    if (options.handle_outliers !== 'ignore') {
      cleanedData = handleOutliers(cleanedData, metadata, options.handle_outliers || 'cap');
      result.cleaning_applied.push(`Outliers handled using: ${options.handle_outliers || 'cap'}`);
    }

    // Step 5: Auto-detect target column if needed
    let targetColumn = options.target_column;
    if (options.auto_detect_target && !targetColumn) {
      targetColumn = detectTargetColumn(metadata);
      if (targetColumn) {
        result.target_column = targetColumn;
        result.transformations_applied.push(`Auto-detected target column: ${targetColumn}`);
      }
    }

    // Step 6: Feature Engineering
    cleanedData = engineerFeatures(cleanedData, metadata, targetColumn);
    result.feature_engineering_applied.push('Feature engineering completed');

    // Step 7: Encode Categorical Variables
    if (options.encode_categorical !== false) {
      const encoded = encodeCategorical(cleanedData, metadata);
      cleanedData = encoded.data;
      result.transformations_applied.push('Categorical encoding applied');
    }

    // Step 8: Scale Numeric Features
    if (options.scale_numeric !== false) {
      const scaled = scaleNumeric(cleanedData, metadata);
      cleanedData = scaled.data;
      result.transformations_applied.push('Numeric scaling applied');
    }

    // Step 9: Feature Selection (if enabled)
    if (options.feature_selection && targetColumn) {
      const selected = selectFeatures(cleanedData, metadata, targetColumn, options.max_features);
      cleanedData = selected.data;
      result.feature_importance = selected.importance;
      result.transformations_applied.push(`Feature selection applied: ${selected.selected_features.length} features selected`);
    }

    // Step 10: Calculate Correlation Matrix
    result.correlation_matrix = calculateCorrelationMatrix(cleanedData, metadata);

    result.processed_data = cleanedData;

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    throw error;
  }
}

/**
 * Extract comprehensive feature metadata
 */
export async function extractFeatureMetadata(
  data: Record<string, any>[]
): Promise<FeatureMetadata> {
  if (!data || data.length === 0) {
    throw new Error('Cannot extract metadata from empty data');
  }

  const columns = Object.keys(data[0]);
  const rowCount = data.length;
  const metadata: Record<string, ColumnMetadata> = {};
  const recommendations: string[] = [];
  let qualityScore = 100;

  for (const col of columns) {
    const values = data.map(row => row[col]).filter(v => v != null && v !== '');
    const nullCount = rowCount - values.length;
    const nullPercentage = (nullCount / rowCount) * 100;
    const uniqueValues = new Set(values);
    const uniqueCount = uniqueValues.size;
    const uniquePercentage = (uniqueCount / rowCount) * 100;

    // Detect column type
    const type = detectColumnType(values, col);
    const dtype = detectDataType(values);

    const columnMeta: ColumnMetadata = {
      name: col,
      type,
      dtype,
      null_count: nullCount,
      null_percentage,
      unique_count: uniqueCount,
      unique_percentage: uniquePercentage,
      sample_values: Array.from(uniqueValues).slice(0, 5),
    };

    // Calculate statistics based on type
    if (type === 'numeric') {
      const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v) && isFinite(v));
      columnMeta.statistics = calculateNumericStatistics(numericValues);
      columnMeta.feature_type = detectNumericFeatureType(numericValues, columnMeta.statistics as NumericStatistics);
      
      // Suggest scaling
      if (columnMeta.statistics) {
        const stats = columnMeta.statistics as NumericStatistics;
        if (stats.std > 0) {
          const cv = stats.std / Math.abs(stats.mean || 1); // Coefficient of variation
          if (cv > 1) {
            columnMeta.scaling_suggested = 'robust';
          } else if (stats.min < 0 || stats.max > 100) {
            columnMeta.scaling_suggested = 'standard';
          } else {
            columnMeta.scaling_suggested = 'min-max';
          }
        }
      }

      // Check if suitable as target
      columnMeta.is_target_candidate = isTargetCandidate(col, numericValues, columnMeta.statistics as NumericStatistics);
      if (columnMeta.is_target_candidate) {
        columnMeta.target_score = calculateTargetScore(col, numericValues, columnMeta.statistics as NumericStatistics);
      }
    } else if (type === 'categorical') {
      columnMeta.statistics = calculateCategoricalStatistics(values);
      columnMeta.feature_type = detectCategoricalFeatureType(uniqueCount, rowCount);
      
      // Suggest encoding
      if (uniqueCount <= 2) {
        columnMeta.encoding_suggested = 'label';
      } else if (uniqueCount <= 10) {
        columnMeta.encoding_suggested = 'one-hot';
      } else {
        columnMeta.encoding_suggested = 'target';
      }
    } else if (type === 'temporal') {
      columnMeta.statistics = calculateTemporalStatistics(values);
      columnMeta.feature_type = 'datetime';
    }

    // Quality checks
    if (nullPercentage > 50) {
      qualityScore -= 20;
      recommendations.push(`Column "${col}" has ${nullPercentage.toFixed(1)}% missing values`);
    }
    if (type === 'numeric' && columnMeta.statistics) {
      const stats = columnMeta.statistics as NumericStatistics;
      if (stats.outliers_percentage > 10) {
        qualityScore -= 10;
        recommendations.push(`Column "${col}" has ${stats.outliers_percentage.toFixed(1)}% outliers`);
      }
    }

    metadata[col] = columnMeta;
  }

  const numericFeatures = Object.values(metadata).filter(m => m.type === 'numeric').length;
  const categoricalFeatures = Object.values(metadata).filter(m => m.type === 'categorical').length;
  const temporalFeatures = Object.values(metadata).filter(m => m.type === 'temporal').length;
  const targetFeatures = Object.values(metadata).filter(m => m.is_target_candidate).length;

  let mlReadiness: 'ready' | 'needs_cleaning' | 'needs_engineering' | 'not_suitable' = 'ready';
  if (qualityScore < 50) {
    mlReadiness = 'not_suitable';
  } else if (qualityScore < 70) {
    mlReadiness = 'needs_cleaning';
  } else if (numericFeatures === 0 && categoricalFeatures === 0) {
    mlReadiness = 'needs_engineering';
  }

  return {
    total_features: columns.length,
    numeric_features: numericFeatures,
    categorical_features: categoricalFeatures,
    temporal_features: temporalFeatures,
    target_features: targetFeatures,
    feature_metadata: metadata,
    data_quality_score: Math.max(0, qualityScore),
    preprocessing_recommendations: recommendations,
    ml_readiness: mlReadiness,
  };
}

/**
 * Detect column type
 */
function detectColumnType(values: any[], columnName: string): ColumnMetadata['type'] {
  const lowerName = columnName.toLowerCase();
  
  // Check for ID columns
  if (lowerName.includes('id') || lowerName.includes('_id') || lowerName.endsWith('id')) {
    return 'id';
  }

  // Check for temporal columns
  if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('timestamp')) {
    return 'temporal';
  }

  // Check for boolean
  const boolCount = values.filter(v => 
    v === true || v === false || 
    String(v).toLowerCase() === 'true' || 
    String(v).toLowerCase() === 'false' ||
    v === 1 || v === 0
  ).length;
  if (boolCount / values.length > 0.8) {
    return 'boolean';
  }

  // Check for numeric
  const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v) && isFinite(v));
  if (numericValues.length / values.length > 0.8) {
    return 'numeric';
  }

  // Check for text (long strings)
  const avgLength = values.reduce((sum, v) => sum + String(v).length, 0) / values.length;
  if (avgLength > 50) {
    return 'text';
  }

  // Default to categorical
  return 'categorical';
}

/**
 * Detect data type
 */
function detectDataType(values: any[]): ColumnMetadata['dtype'] {
  const sample = values.slice(0, 100);
  const types = new Set(sample.map(v => typeof v));
  
  if (types.has('number')) return 'number';
  if (types.has('boolean')) return 'boolean';
  if (sample.some(v => v instanceof Date || !isNaN(Date.parse(String(v))))) return 'date';
  return 'string';
}

/**
 * Calculate numeric statistics
 */
function calculateNumericStatistics(values: number[]): NumericStatistics {
  if (values.length === 0) {
    return {
      min: 0, max: 0, mean: 0, median: 0, std: 0, variance: 0,
      q25: 0, q50: 0, q75: 0, iqr: 0, skewness: 0, kurtosis: 0,
      outliers_count: 0, outliers_percentage: 0, zero_count: 0, negative_count: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  const q25 = sorted[Math.floor(n * 0.25)];
  const q50 = median;
  const q75 = sorted[Math.floor(n * 0.75)];
  const iqr = q75 - q25;
  
  // Detect outliers using IQR method
  const lowerBound = q25 - 1.5 * iqr;
  const upperBound = q75 + 1.5 * iqr;
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  const outliersCount = outliers.length;
  const outliersPercentage = (outliersCount / n) * 100;
  
  // Calculate skewness
  const skewness = n > 2 
    ? (n / ((n - 1) * (n - 2))) * sorted.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0)
    : 0;
  
  // Calculate kurtosis
  const kurtosis = n > 3
    ? (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sorted.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0) - 3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3))
    : 0;
  
  const zeroCount = values.filter(v => v === 0).length;
  const negativeCount = values.filter(v => v < 0).length;
  
  // Detect distribution type
  let distributionType: 'normal' | 'uniform' | 'skewed' | 'bimodal' = 'normal';
  if (Math.abs(skewness) > 1) {
    distributionType = 'skewed';
  } else if (Math.abs(kurtosis) < 0.5) {
    distributionType = 'uniform';
  }

  return {
    min, max, mean, median, std, variance,
    q25, q50, q75, iqr,
    skewness, kurtosis,
    outliers_count: outliersCount,
    outliers_percentage: outliersPercentage,
    zero_count: zeroCount,
    negative_count: negativeCount,
    distribution_type: distributionType,
  };
}

/**
 * Calculate categorical statistics
 */
function calculateCategoricalStatistics(values: any[]): CategoricalStatistics {
  const valueCounts: Record<string, number> = {};
  values.forEach(v => {
    const key = String(v);
    valueCounts[key] = (valueCounts[key] || 0) + 1;
  });

  const total = values.length;
  const topValues = Object.entries(valueCounts)
    .map(([value, count]) => ({ value, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  // Calculate entropy
  const entropy = -Object.values(valueCounts).reduce((sum, count) => {
    const p = count / total;
    return sum + (p > 0 ? p * Math.log2(p) : 0);
  }, 0);

  return {
    value_counts: valueCounts,
    top_values: topValues.slice(0, 10),
    entropy,
    cardinality: Object.keys(valueCounts).length,
    most_frequent: topValues[0]?.value || '',
    least_frequent: topValues[topValues.length - 1]?.value || '',
  };
}

/**
 * Calculate temporal statistics
 */
function calculateTemporalStatistics(values: any[]): TemporalStatistics {
  const dates = values
    .map(v => {
      if (v instanceof Date) return v;
      const parsed = new Date(String(v));
      return isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter(d => d !== null) as Date[];

  if (dates.length === 0) {
    return {
      min_date: '',
      max_date: '',
      date_range_days: 0,
      has_time_component: false,
      gaps_detected: 0,
    };
  }

  const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = sorted[0];
  const maxDate = sorted[sorted.length - 1];
  const rangeDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const hasTime = dates.some(d => d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0);

  // Detect frequency
  let frequency: TemporalStatistics['frequency'] = 'irregular';
  if (rangeDays > 0) {
    const avgGap = rangeDays / dates.length;
    if (avgGap >= 0.9 && avgGap <= 1.1) frequency = 'daily';
    else if (avgGap >= 6.5 && avgGap <= 7.5) frequency = 'weekly';
    else if (avgGap >= 28 && avgGap <= 31) frequency = 'monthly';
    else if (avgGap >= 360 && avgGap <= 370) frequency = 'yearly';
  }

  return {
    min_date: minDate.toISOString(),
    max_date: maxDate.toISOString(),
    date_range_days: rangeDays,
    has_time_component: hasTime,
    frequency,
    gaps_detected: 0, // Could be enhanced to detect actual gaps
  };
}

/**
 * Detect numeric feature type
 */
function detectNumericFeatureType(
  values: number[],
  stats: NumericStatistics
): 'continuous' | 'discrete' {
  const uniqueCount = new Set(values).size;
  const ratio = uniqueCount / values.length;
  
  // If most values are unique, it's likely continuous
  if (ratio > 0.9) return 'continuous';
  
  // If values are mostly integers and limited unique values, it's discrete
  const integers = values.filter(v => Number.isInteger(v)).length;
  if (integers / values.length > 0.8 && uniqueCount < 50) {
    return 'discrete';
  }
  
  return 'continuous';
}

/**
 * Detect categorical feature type
 */
function detectCategoricalFeatureType(
  uniqueCount: number,
  totalCount: number
): 'ordinal' | 'nominal' {
  // This is a simplified version - could be enhanced with domain knowledge
  if (uniqueCount <= 10) {
    return 'ordinal';
  }
  return 'nominal';
}

/**
 * Check if column is suitable as target
 */
function isTargetCandidate(
  columnName: string,
  values: number[],
  stats: NumericStatistics
): boolean {
  const lowerName = columnName.toLowerCase();
  
  // Common target column patterns
  const targetPatterns = [
    /^(target|label|y|output|prediction|result|outcome|class|category)$/i,
    /^(price|cost|amount|value|revenue|sales|profit|loss)$/i,
    /^(score|rating|rank|priority)$/i,
    /^(status|state|condition|quality)$/i,
  ];

  for (const pattern of targetPatterns) {
    if (pattern.test(lowerName)) {
      return true;
    }
  }

  // Check if it's numeric and not an ID
  if (stats && !lowerName.includes('id')) {
    // Check variance - targets should have some variance
    if (stats.std > 0 && stats.variance > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate target score
 */
function calculateTargetScore(
  columnName: string,
  values: number[],
  stats: NumericStatistics
): number {
  let score = 0;
  const lowerName = columnName.toLowerCase();

  // Name-based scoring
  if (/^(target|label|y|output)$/i.test(lowerName)) score += 50;
  else if (/^(price|cost|amount|value|revenue|sales)$/i.test(lowerName)) score += 40;
  else if (/^(score|rating|rank)$/i.test(lowerName)) score += 30;
  else score += 10;

  // Variance-based scoring
  if (stats.std > 0) {
    const cv = stats.std / Math.abs(stats.mean || 1);
    if (cv > 0.1 && cv < 2) score += 30; // Good variance
    else if (cv > 0) score += 10;
  }

  // Outlier scoring (fewer outliers is better for targets)
  if (stats.outliers_percentage < 5) score += 20;
  else if (stats.outliers_percentage < 10) score += 10;

  return Math.min(100, score);
}

/**
 * Clean data
 */
function cleanData(
  data: Record<string, any>[],
  metadata: FeatureMetadata,
  options: any
): Record<string, any>[] {
  return data.map(row => {
    const cleaned: Record<string, any> = {};
    for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
      let value = row[col];
      
      // Remove null bytes and control characters
      if (typeof value === 'string') {
        value = value.replace(/\u0000/g, '').trim();
      }
      
      // Type conversion based on metadata
      if (meta.type === 'numeric' && value != null) {
        const num = Number(value);
        value = isNaN(num) ? null : num;
      } else if (meta.type === 'boolean' && value != null) {
        const str = String(value).toLowerCase();
        value = str === 'true' || str === '1' || value === 1 || value === true;
      } else if (meta.type === 'temporal' && value != null) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? null : date.toISOString();
      }
      
      cleaned[col] = value;
    }
    return cleaned;
  });
}

/**
 * Handle missing values
 */
function handleMissingValues(
  data: Record<string, any>[],
  metadata: FeatureMetadata,
  strategy: 'drop' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'interpolate'
): Record<string, any>[] {
  if (strategy === 'drop') {
    return data.filter(row => 
      Object.keys(row).every(col => row[col] != null && row[col] !== '')
    );
  }

  const processed = data.map(row => ({ ...row }));
  
  for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
    if (meta.null_count === 0) continue;
    
    const values = processed.map(r => r[col]).filter(v => v != null && v !== '');
    
    let fillValue: any = null;
    
    if (strategy === 'mean' && meta.type === 'numeric' && meta.statistics) {
      fillValue = (meta.statistics as NumericStatistics).mean;
    } else if (strategy === 'median' && meta.type === 'numeric' && meta.statistics) {
      fillValue = (meta.statistics as NumericStatistics).median;
    } else if (strategy === 'mode' && meta.type === 'categorical' && meta.statistics) {
      fillValue = (meta.statistics as CategoricalStatistics).most_frequent;
    } else if (strategy === 'forward_fill') {
      // Will be handled in the loop
    } else if (strategy === 'interpolate' && meta.type === 'numeric') {
      // Will be handled in the loop
    }
    
    let lastValue = fillValue;
    for (let i = 0; i < processed.length; i++) {
      if (processed[i][col] == null || processed[i][col] === '') {
        if (strategy === 'forward_fill' && lastValue != null) {
          processed[i][col] = lastValue;
        } else if (strategy === 'interpolate' && meta.type === 'numeric') {
          // Simple linear interpolation
          let nextValue = null;
          for (let j = i + 1; j < processed.length; j++) {
            if (processed[j][col] != null) {
              nextValue = processed[j][col];
              break;
            }
          }
          if (lastValue != null && nextValue != null) {
            processed[i][col] = (lastValue + nextValue) / 2;
          } else if (lastValue != null) {
            processed[i][col] = lastValue;
          } else if (fillValue != null) {
            processed[i][col] = fillValue;
          }
        } else if (fillValue != null) {
          processed[i][col] = fillValue;
        }
      } else {
        lastValue = processed[i][col];
      }
    }
  }
  
  return processed;
}

/**
 * Handle outliers
 */
function handleOutliers(
  data: Record<string, any>[],
  metadata: FeatureMetadata,
  strategy: 'remove' | 'cap' | 'transform' | 'ignore'
): Record<string, any>[] {
  if (strategy === 'ignore') return data;
  
  const processed = data.map(row => ({ ...row }));
  
  for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
    if (meta.type !== 'numeric' || !meta.statistics) continue;
    
    const stats = meta.statistics as NumericStatistics;
    if (stats.outliers_count === 0) continue;
    
    const q25 = stats.q25;
    const q75 = stats.q75;
    const iqr = stats.iqr;
    const lowerBound = q25 - 1.5 * iqr;
    const upperBound = q75 + 1.5 * iqr;
    
    if (strategy === 'remove') {
      // Mark rows for removal (will be filtered later)
      for (let i = 0; i < processed.length; i++) {
        const value = Number(processed[i][col]);
        if (value < lowerBound || value > upperBound) {
          processed[i][`_outlier_${col}`] = true;
        }
      }
    } else if (strategy === 'cap') {
      // Cap outliers at bounds
      for (let i = 0; i < processed.length; i++) {
        const value = Number(processed[i][col]);
        if (value < lowerBound) {
          processed[i][col] = lowerBound;
        } else if (value > upperBound) {
          processed[i][col] = upperBound;
        }
      }
    } else if (strategy === 'transform') {
      // Log transform for right-skewed data
      if (stats.skewness > 1) {
        for (let i = 0; i < processed.length; i++) {
          const value = Number(processed[i][col]);
          if (value > 0) {
            processed[i][col] = Math.log1p(value);
          }
        }
      }
    }
  }
  
  // Remove rows marked for removal
  if (strategy === 'remove') {
    return processed.filter(row => 
      !Object.keys(row).some(k => k.startsWith('_outlier_') && row[k] === true)
    );
  }
  
  return processed;
}

/**
 * Engineer features
 */
function engineerFeatures(
  data: Record<string, any>[],
  metadata: FeatureMetadata,
  targetColumn?: string | null
): Record<string, any>[] {
  const processed = data.map(row => ({ ...row }));
  
  // Extract temporal features
  for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
    if (meta.type === 'temporal') {
      for (let i = 0; i < processed.length; i++) {
        const dateStr = processed[i][col];
        if (dateStr) {
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              processed[i][`${col}_year`] = date.getFullYear();
              processed[i][`${col}_month`] = date.getMonth() + 1;
              processed[i][`${col}_day`] = date.getDate();
              processed[i][`${col}_day_of_week`] = date.getDay();
              processed[i][`${col}_is_weekend`] = date.getDay() === 0 || date.getDay() === 6 ? 1 : 0;
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
      }
    }
  }
  
  // Create interaction features for numeric columns
  const numericCols = Object.entries(metadata.feature_metadata)
    .filter(([_, meta]) => meta.type === 'numeric')
    .map(([col, _]) => col);
  
  if (numericCols.length >= 2) {
    // Create product and ratio features for top correlated pairs
    for (let i = 0; i < Math.min(3, numericCols.length - 1); i++) {
      const col1 = numericCols[i];
      const col2 = numericCols[i + 1];
      
      for (let j = 0; j < processed.length; j++) {
        const val1 = Number(processed[j][col1]) || 0;
        const val2 = Number(processed[j][col2]) || 0;
        
        if (val1 !== 0 && val2 !== 0) {
          processed[j][`${col1}_x_${col2}`] = val1 * val2;
          processed[j][`${col1}_div_${col2}`] = val1 / val2;
        }
      }
    }
  }
  
  return processed;
}

/**
 * Encode categorical variables
 */
function encodeCategorical(
  data: Record<string, any>[],
  metadata: FeatureMetadata
): { data: Record<string, any>[]; encodings: Record<string, any> } {
  const processed = data.map(row => ({ ...row }));
  const encodings: Record<string, any> = {};
  
  for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
    if (meta.type !== 'categorical') continue;
    
    const uniqueValues = new Set(data.map(r => String(r[col] || '')));
    const valueList = Array.from(uniqueValues);
    
    if (meta.encoding_suggested === 'label' || valueList.length <= 2) {
      // Label encoding
      const labelMap: Record<string, number> = {};
      valueList.forEach((val, idx) => {
        labelMap[val] = idx;
      });
      encodings[col] = { type: 'label', mapping: labelMap };
      
      for (let i = 0; i < processed.length; i++) {
        processed[i][col] = labelMap[String(processed[i][col] || '')] ?? 0;
      }
    } else if (meta.encoding_suggested === 'one-hot' && valueList.length <= 10) {
      // One-hot encoding
      const topValues = valueList.slice(0, 10);
      encodings[col] = { type: 'one-hot', values: topValues };
      
      for (const val of topValues) {
        const newCol = `${col}_${val}`;
        for (let i = 0; i < processed.length; i++) {
          processed[i][newCol] = String(processed[i][col] || '') === val ? 1 : 0;
        }
      }
      
      // Remove original column
      for (let i = 0; i < processed.length; i++) {
        delete processed[i][col];
      }
    }
  }
  
  return { data: processed, encodings };
}

/**
 * Scale numeric features
 */
function scaleNumeric(
  data: Record<string, any>[],
  metadata: FeatureMetadata
): { data: Record<string, any>[]; scalers: Record<string, any> } {
  const processed = data.map(row => ({ ...row }));
  const scalers: Record<string, any> = {};
  
  for (const [col, meta] of Object.entries(metadata.feature_metadata)) {
    if (meta.type !== 'numeric' || !meta.statistics) continue;
    
    const stats = meta.statistics as NumericStatistics;
    const values = processed.map(r => Number(r[col]) || 0);
    
    if (meta.scaling_suggested === 'standard') {
      // Standard scaling (z-score)
      const mean = stats.mean;
      const std = stats.std;
      
      if (std > 0) {
        scalers[col] = { type: 'standard', mean, std };
        for (let i = 0; i < processed.length; i++) {
          processed[i][col] = (values[i] - mean) / std;
        }
      }
    } else if (meta.scaling_suggested === 'min-max') {
      // Min-max scaling
      const min = stats.min;
      const max = stats.max;
      const range = max - min;
      
      if (range > 0) {
        scalers[col] = { type: 'min-max', min, max };
        for (let i = 0; i < processed.length; i++) {
          processed[i][col] = (values[i] - min) / range;
        }
      }
    } else if (meta.scaling_suggested === 'robust') {
      // Robust scaling (using median and IQR)
      const median = stats.median;
      const iqr = stats.iqr;
      
      if (iqr > 0) {
        scalers[col] = { type: 'robust', median, iqr };
        for (let i = 0; i < processed.length; i++) {
          processed[i][col] = (values[i] - median) / iqr;
        }
      }
    }
  }
  
  return { data: processed, scalers };
}

/**
 * Select features based on importance
 */
function selectFeatures(
  data: Record<string, any>[],
  metadata: FeatureMetadata,
  targetColumn: string,
  maxFeatures?: number
): { data: Record<string, any>[]; selected_features: string[]; importance: Record<string, number> } {
  if (!targetColumn || !data[0] || !(targetColumn in data[0])) {
    return { data, selected_features: Object.keys(data[0] || {}), importance: {} };
  }
  
  const targetValues = data.map(r => Number(r[targetColumn]) || 0);
  const features = Object.keys(data[0]).filter(col => col !== targetColumn);
  const importance: Record<string, number> = {};
  
  // Calculate feature importance using correlation
  for (const feature of features) {
    const featureValues = data.map(r => Number(r[feature]) || 0);
    const correlation = calculateCorrelation(featureValues, targetValues);
    importance[feature] = Math.abs(correlation);
  }
  
  // Sort by importance
  const sortedFeatures = Object.entries(importance)
    .sort((a, b) => b[1] - a[1])
    .map(([feat, _]) => feat);
  
  const selectedCount = maxFeatures || Math.min(20, sortedFeatures.length);
  const selectedFeatures = sortedFeatures.slice(0, selectedCount);
  
  // Filter data to selected features + target
  const filtered = data.map(row => {
    const filteredRow: Record<string, any> = { [targetColumn]: row[targetColumn] };
    for (const feat of selectedFeatures) {
      filteredRow[feat] = row[feat];
    }
    return filteredRow;
  });
  
  return { data: filtered, selected_features: selectedFeatures, importance };
}

/**
 * Calculate correlation between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate correlation matrix
 */
function calculateCorrelationMatrix(
  data: Record<string, any>[],
  metadata: FeatureMetadata
): Record<string, Record<string, number>> {
  const numericCols = Object.entries(metadata.feature_metadata)
    .filter(([_, meta]) => meta.type === 'numeric')
    .map(([col, _]) => col);
  
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const col1 of numericCols) {
    matrix[col1] = {};
    const values1 = data.map(r => Number(r[col1]) || 0);
    
    for (const col2 of numericCols) {
      if (col1 === col2) {
        matrix[col1][col2] = 1;
      } else {
        const values2 = data.map(r => Number(r[col2]) || 0);
        matrix[col1][col2] = calculateCorrelation(values1, values2);
      }
    }
  }
  
  return matrix;
}

/**
 * Detect target column automatically
 */
export function detectTargetColumn(metadata: FeatureMetadata): string | null {
  const candidates = Object.entries(metadata.feature_metadata)
    .filter(([_, meta]) => meta.is_target_candidate)
    .sort((a, b) => (b[1].target_score || 0) - (a[1].target_score || 0));
  
  return candidates.length > 0 ? candidates[0][0] : null;
}

