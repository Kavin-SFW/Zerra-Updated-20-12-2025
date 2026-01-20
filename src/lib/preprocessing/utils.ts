/**
 * Utility functions for preprocessing library
 */

/**
 * Convert data to format suitable for ML
 */
export function prepareForML(
  data: Record<string, any>[],
  targetColumn?: string
): {
  X: number[][];
  y: number[] | null;
  featureNames: string[];
  targetName: string | null;
} {
  if (!data || data.length === 0) {
    return { X: [], y: null, featureNames: [], targetName: null };
  }

  const features = Object.keys(data[0]).filter(col => col !== targetColumn);
  const featureNames = features;
  const targetName = targetColumn || null;

  const X: number[][] = [];
  const y: number[] | null = targetColumn ? [] : null;

  for (const row of data) {
    const xRow: number[] = [];
    for (const feat of features) {
      const value = Number(row[feat]) || 0;
      xRow.push(isNaN(value) ? 0 : value);
    }
    X.push(xRow);

    if (targetColumn && y) {
      const targetValue = Number(row[targetColumn]) || 0;
      y.push(isNaN(targetValue) ? 0 : targetValue);
    }
  }

  return { X, y, featureNames, targetName };
}

/**
 * Split data into train/test sets
 */
export function trainTestSplit(
  data: Record<string, any>[],
  testSize: number = 0.2,
  randomize: boolean = true
): {
  train: Record<string, any>[];
  test: Record<string, any>[];
} {
  if (!data || data.length === 0) {
    return { train: [], test: [] };
  }

  let indices = Array.from({ length: data.length }, (_, i) => i);

  if (randomize) {
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }

  const testCount = Math.floor(data.length * testSize);
  const testIndices = new Set(indices.slice(0, testCount));
  const trainIndices = indices.slice(testCount);

  return {
    train: trainIndices.map(i => data[i]),
    test: Array.from(testIndices).map(i => data[i]),
  };
}

/**
 * Normalize array to 0-1 range
 */
export function normalizeArray(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return values.map(() => 0.5);
  
  return values.map(v => (v - min) / range);
}

/**
 * Standardize array (z-score)
 */
export function standardizeArray(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  if (std === 0) return values.map(() => 0);
  
  return values.map(v => (v - mean) / std);
}

/**
 * Calculate feature importance using variance
 */
export function calculateVarianceImportance(
  data: Record<string, any>[],
  targetColumn?: string
): Record<string, number> {
  const importance: Record<string, number> = {};
  const features = Object.keys(data[0]).filter(col => col !== targetColumn);

  for (const feature of features) {
    const values = data.map(r => Number(r[feature]) || 0).filter(v => !isNaN(v));
    if (values.length === 0) {
      importance[feature] = 0;
      continue;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    importance[feature] = variance;
  }

  // Normalize to 0-1
  const maxImportance = Math.max(...Object.values(importance));
  if (maxImportance > 0) {
    for (const key in importance) {
      importance[key] = importance[key] / maxImportance;
    }
  }

  return importance;
}

/**
 * Detect data quality issues
 */
export function detectDataQualityIssues(
  data: Record<string, any>[]
): {
  issues: Array<{ severity: 'low' | 'medium' | 'high'; message: string }>;
  score: number;
} {
  const issues: Array<{ severity: 'low' | 'medium' | 'high'; message: string }> = [];
  let score = 100;

  if (!data || data.length === 0) {
    return { issues: [{ severity: 'high', message: 'Dataset is empty' }], score: 0 };
  }

  const columns = Object.keys(data[0]);
  if (columns.length === 0) {
    return { issues: [{ severity: 'high', message: 'No columns found' }], score: 0 };
  }

  // Check for missing values
  for (const col of columns) {
    const nullCount = data.filter(r => r[col] == null || r[col] === '').length;
    const nullPercentage = (nullCount / data.length) * 100;

    if (nullPercentage > 50) {
      issues.push({
        severity: 'high',
        message: `Column "${col}" has ${nullPercentage.toFixed(1)}% missing values`,
      });
      score -= 20;
    } else if (nullPercentage > 20) {
      issues.push({
        severity: 'medium',
        message: `Column "${col}" has ${nullPercentage.toFixed(1)}% missing values`,
      });
      score -= 10;
    } else if (nullPercentage > 5) {
      issues.push({
        severity: 'low',
        message: `Column "${col}" has ${nullPercentage.toFixed(1)}% missing values`,
      });
      score -= 5;
    }
  }

  // Check for duplicate rows
  const uniqueRows = new Set(data.map(r => JSON.stringify(r)));
  const duplicatePercentage = ((data.length - uniqueRows.size) / data.length) * 100;
  if (duplicatePercentage > 10) {
    issues.push({
      severity: 'medium',
      message: `${duplicatePercentage.toFixed(1)}% of rows are duplicates`,
    });
    score -= 10;
  }

  // Check for constant columns
  for (const col of columns) {
    const uniqueValues = new Set(data.map(r => String(r[col] || '')));
    if (uniqueValues.size === 1) {
      issues.push({
        severity: 'medium',
        message: `Column "${col}" has constant values (no variance)`,
      });
      score -= 10;
    }
  }

  return { issues, score: Math.max(0, score) };
}

/**
 * Generate data summary for Gen AI
 */
export function generateDataSummary(
  data: Record<string, any>[],
  metadata: any
): string {
  const summary: string[] = [];

  summary.push(`Dataset Overview:`);
  summary.push(`- Total Rows: ${data.length}`);
  summary.push(`- Total Columns: ${Object.keys(metadata.feature_metadata || {}).length}`);
  summary.push(`- Numeric Features: ${metadata.numeric_features || 0}`);
  summary.push(`- Categorical Features: ${metadata.categorical_features || 0}`);
  summary.push(`- Temporal Features: ${metadata.temporal_features || 0}`);
  summary.push(`- Data Quality Score: ${metadata.data_quality_score?.toFixed(1) || 'N/A'}/100`);
  summary.push(`- ML Readiness: ${metadata.ml_readiness || 'unknown'}`);

  if (metadata.target_features > 0) {
    summary.push(`\nTarget Candidates:`);
    for (const [col, meta] of Object.entries(metadata.feature_metadata || {})) {
      const m = meta as any;
      if (m.is_target_candidate) {
        summary.push(`- ${col} (score: ${m.target_score?.toFixed(1) || 'N/A'})`);
      }
    }
  }

  if (metadata.preprocessing_recommendations?.length > 0) {
    summary.push(`\nRecommendations:`);
    metadata.preprocessing_recommendations.forEach((rec: string) => {
      summary.push(`- ${rec}`);
    });
  }

  return summary.join('\n');
}

