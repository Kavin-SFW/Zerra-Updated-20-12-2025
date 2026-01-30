# ZERRA Preprocessing & Feature Engineering Library

A comprehensive JavaScript/TypeScript library for data preprocessing, feature extraction, and engineering designed to enable robust predictive and prescriptive analytics with Gen AI.

## Features

### Core Capabilities

1. **Data Profiling & Metadata Extraction**
   - Automatic column type detection (numeric, categorical, temporal, boolean, text, id)
   - Statistical analysis (mean, median, std, quartiles, skewness, kurtosis)
   - Data quality scoring
   - ML readiness assessment

2. **Data Cleaning**
   - Null byte removal
   - Type conversion and validation
   - Duplicate detection
   - Constant column detection

3. **Missing Value Handling**
   - Multiple strategies: drop, mean, median, mode, forward fill, interpolation
   - Type-aware imputation

4. **Outlier Detection & Handling**
   - IQR-based outlier detection
   - Strategies: remove, cap, transform
   - Distribution analysis

5. **Feature Engineering**
   - Temporal feature extraction (year, month, day, day_of_week, is_weekend)
   - Interaction features (product, ratio)
   - Automatic feature type detection

6. **Categorical Encoding**
   - Label encoding (for binary/low cardinality)
   - One-hot encoding (for medium cardinality)
   - Target encoding suggestions

7. **Numeric Scaling**
   - Standard scaling (z-score)
   - Min-max scaling
   - Robust scaling (median & IQR)

8. **Feature Selection**
   - Correlation-based importance
   - Target-aware selection
   - Configurable max features

9. **Target Column Detection**
   - Pattern-based detection (target, label, price, revenue, etc.)
   - Statistical scoring
   - Variance analysis

10. **Correlation Analysis**
    - Full correlation matrix
    - Top correlations extraction
    - Feature relationship insights

## Usage

### Basic Usage

```typescript
import { preprocessData, extractFeatureMetadata } from '@/lib/preprocessing';

// Extract metadata
const metadata = await extractFeatureMetadata(data);

// Preprocess data
const result = await preprocessData(data, {
  auto_detect_target: true,
  handle_missing: 'mean',
  handle_outliers: 'cap',
  encode_categorical: true,
  scale_numeric: true,
  feature_selection: false,
});

console.log(result.processed_data);
console.log(result.feature_metadata);
console.log(result.target_column);
console.log(result.feature_importance);
```

### Advanced Usage

```typescript
const result = await preprocessData(data, {
  target_column: 'revenue', // Specify target
  handle_missing: 'interpolate', // Advanced missing value handling
  handle_outliers: 'transform', // Log transform for skewed data
  encode_categorical: true,
  scale_numeric: true,
  feature_selection: true,
  max_features: 20, // Select top 20 features
});
```

## Integration with Gen AI

The library generates comprehensive metadata that enhances Gen AI capabilities:

1. **Feature Importance**: Helps AI prioritize which features to focus on
2. **Correlation Matrix**: Enables AI to understand feature relationships
3. **Data Quality Score**: Provides confidence metrics for AI recommendations
4. **Preprocessing Summary**: Gives AI context about data transformations
5. **Target Detection**: Helps AI understand prediction goals

## Output Structure

```typescript
interface PreprocessingResult {
  processed_data: Record<string, any>[]; // Cleaned and engineered data
  feature_metadata: FeatureMetadata; // Comprehensive metadata
  transformations_applied: string[]; // List of transformations
  cleaning_applied: string[]; // List of cleaning steps
  feature_engineering_applied: string[]; // List of engineering steps
  target_column?: string; // Detected or specified target
  feature_importance?: Record<string, number>; // Feature importance scores
  correlation_matrix?: Record<string, Record<string, number>>; // Correlation matrix
  warnings: string[]; // Warnings during processing
  errors: string[]; // Errors during processing
}
```

## Gen AI Enhancement

The preprocessing library enhances Gen AI analytics by:

1. **Better Context**: Provides rich metadata about data characteristics
2. **Feature Prioritization**: Importance scores guide AI focus
3. **Relationship Understanding**: Correlation matrix helps AI identify patterns
4. **Quality Awareness**: Data quality scores inform AI confidence
5. **Target Clarity**: Auto-detected targets help AI understand objectives

## Performance

- Handles datasets with thousands of rows efficiently
- Processes in chunks for large datasets
- Optimized statistical calculations
- Memory-efficient feature engineering

## Best Practices

1. Always extract metadata first to understand your data
2. Use auto_detect_target for exploratory analysis
3. Enable feature_selection for large feature sets
4. Review warnings and errors before proceeding
5. Use the data summary for Gen AI context

## License

Part of SFW ZERRA platform.

