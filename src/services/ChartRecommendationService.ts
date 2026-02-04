/**
 * Intelligent Chart Recommendation Service
 * Analyzes data patterns to suggest the most appropriate chart types
 * Similar to PowerBI's chart suggestions
 */

import { VisualizationRecommendation } from '@/types/analytics';

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'temporal' | 'boolean' | 'text';
  uniqueValues: number;
  nullCount: number;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    hasNegative: boolean;
  };
  categoricalStats?: {
    topValues: Array<{ value: string; count: number }>;
    cardinality: 'low' | 'medium' | 'high';
  };
  temporalStats?: {
    isDate: boolean;
    dateRange?: { min: Date; max: Date };
    hasTimeComponent: boolean;
  };
}

interface DataProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnAnalysis[];
  relationships: Array<{
    column1: string;
    column2: string;
    correlation: number;
    relationshipType: 'strong' | 'moderate' | 'weak';
  }>;
  patterns: {
    hasTimeSeries: boolean;
    hasHierarchy: boolean;
    hasGeographic: boolean;
    hasPartToWhole: boolean;
    hasComparison: boolean;
    hasDistribution: boolean;
    hasCorrelation: boolean;
  };
}

export class ChartRecommendationService {
  /**
   * Analyze data structure and generate intelligent chart recommendations
   */
  static analyzeDataAndRecommend(data: any[]): VisualizationRecommendation[] {
    if (!data || data.length === 0) return [];

    const profile = this.profileData(data);
    const recommendations: VisualizationRecommendation[] = [];

    // 1. Time Series Analysis
    if (profile.patterns.hasTimeSeries) {
      const timeCol = profile.columns.find(c => c.temporalStats?.isDate);
      const numericCols = profile.columns.filter(c => c.type === 'numeric' && c.numericStats);
      
      numericCols.forEach(numCol => {
        if (timeCol) {
          recommendations.push({
            title: `${this.formatColumnName(numCol.name)} Over Time`,
            type: 'line',
            x_axis: timeCol.name,
            y_axis: numCol.name,
            reasoning: `Time series showing ${numCol.name} trends. ${this.getTrendInsight(data, timeCol.name, numCol.name)}`,
            priority: 'high',
            colorPalette: ['#00D4FF', '#6B46C1']
          });
        }
      });
    }

    // 2. Part-to-Whole Analysis (Pie/Donut)
    const categoricalCols = profile.columns.filter(c => 
      c.type === 'categorical' && 
      c.categoricalStats && 
      c.categoricalStats.cardinality !== 'high' &&
      c.uniqueValues <= 10
    );
    const numericCols = profile.columns.filter(c => c.type === 'numeric');

    categoricalCols.forEach(catCol => {
      numericCols.forEach(numCol => {
        if (this.isPartToWholeSuitable(data, catCol.name, numCol.name)) {
          recommendations.push({
            title: `${this.formatColumnName(numCol.name)} by ${this.formatColumnName(catCol.name)}`,
            type: 'pie',
            x_axis: catCol.name,
            y_axis: numCol.name,
            reasoning: `Distribution showing how ${numCol.name} is divided across ${catCol.name} categories.`,
            priority: 'medium',
            colorPalette: this.generateColorPalette(10)
          });
        }
      });
    });

    // 3. Comparison Analysis (Bar/Column)
    categoricalCols.forEach(catCol => {
      numericCols.forEach(numCol => {
        if (catCol.uniqueValues <= 15) {
          const sortedData = this.getTopCategories(data, catCol.name, numCol.name, 10);
          recommendations.push({
            title: `${this.formatColumnName(numCol.name)} by ${this.formatColumnName(catCol.name)}`,
            type: sortedData.length <= 5 ? 'bar' : 'bar',
            x_axis: catCol.name,
            y_axis: numCol.name,
            reasoning: `Comparison of ${numCol.name} across ${catCol.name} categories. Top performer: ${sortedData[0]?.name || 'N/A'}.`,
            priority: 'high',
            colorPalette: this.generateGradientPalette(sortedData.length)
          });
        }
      });
    });

    // 4. Correlation Analysis (Scatter)
    const strongCorrelations = profile.relationships.filter(r => r.relationshipType === 'strong');
    strongCorrelations.forEach(rel => {
      const col1 = profile.columns.find(c => c.name === rel.column1);
      const col2 = profile.columns.find(c => c.name === rel.column2);
      
      if (col1?.type === 'numeric' && col2?.type === 'numeric') {
        recommendations.push({
          title: `${this.formatColumnName(rel.column1)} vs ${this.formatColumnName(rel.column2)}`,
          type: 'scatter',
          x_axis: rel.column1,
          y_axis: rel.column2,
          reasoning: `Strong correlation (${(rel.correlation * 100).toFixed(1)}%) detected between ${rel.column1} and ${rel.column2}.`,
          priority: 'high',
          colorPalette: ['#00D4FF']
        });
      }
    });

    // 5. Distribution Analysis (Histogram/Box Plot)
    numericCols.forEach(numCol => {
      if (numCol.numericStats && this.hasGoodDistribution(data.length, numCol.uniqueValues)) {
        recommendations.push({
          title: `Distribution of ${this.formatColumnName(numCol.name)}`,
          type: 'bar',
          x_axis: numCol.name,
          y_axis: 'count',
          reasoning: `Distribution analysis showing the spread of ${numCol.name} values. Mean: ${numCol.numericStats.mean.toFixed(2)}, Median: ${numCol.numericStats.median.toFixed(2)}.`,
          priority: 'medium',
          colorPalette: ['#6B46C1']
        });
      }
    });

    // 6. Multi-Series Comparison (Line/Area with multiple series)
    if (categoricalCols.length > 0 && numericCols.length > 0 && profile.patterns.hasTimeSeries) {
      const timeCol = profile.columns.find(c => c.temporalStats?.isDate);
      const topCatCol = categoricalCols
        .filter(c => c.uniqueValues <= 8)
        .sort((a, b) => a.uniqueValues - b.uniqueValues)[0];
      
      if (timeCol && topCatCol && numericCols.length > 0) {
        numericCols.slice(0, 2).forEach(numCol => {
          recommendations.push({
            title: `${this.formatColumnName(numCol.name)} Trends by ${this.formatColumnName(topCatCol.name)}`,
            type: 'line',
            x_axis: timeCol.name,
            y_axis: numCol.name,
            reasoning: `Multi-series time series comparing ${numCol.name} across different ${topCatCol.name} categories.`,
            priority: 'high',
            colorPalette: this.generateColorPalette(8),
            breakdownDimension: topCatCol.name
          });
        });
      }
    }

    // 7. Stacked Analysis
    if (categoricalCols.length >= 2 && numericCols.length > 0) {
      const primaryCat = categoricalCols[0];
      const secondaryCat = categoricalCols.find(c => 
        c.name !== primaryCat.name && 
        c.uniqueValues <= 6
      );
      
      if (secondaryCat && numericCols.length > 0) {
        recommendations.push({
          title: `${this.formatColumnName(numericCols[0].name)} by ${this.formatColumnName(primaryCat.name)} and ${this.formatColumnName(secondaryCat.name)}`,
          type: 'bar',
          x_axis: primaryCat.name,
          y_axis: numericCols[0].name,
          reasoning: `Stacked comparison showing ${numericCols[0].name} broken down by ${primaryCat.name} and ${secondaryCat.name}.`,
          priority: 'medium',
          colorPalette: this.generateColorPalette(6),
          breakdownDimension: secondaryCat.name
        });
      }
    }

    // 8. KPI/Gauge Charts for Key Metrics
    numericCols.forEach(numCol => {
      if (numCol.numericStats && this.isKPISuitable(numCol)) {
        const target = numCol.numericStats.max * 0.8; // 80% of max as target
        recommendations.push({
          title: `${this.formatColumnName(numCol.name)} Performance`,
          type: 'gauge',
          x_axis: 'target',
          y_axis: numCol.name,
          reasoning: `KPI gauge showing current ${numCol.name} performance against target of ${target.toFixed(2)}.`,
          priority: 'high',
          colorPalette: ['#00D4FF', '#10B981', '#F59E0B']
        });
      }
    });

    // Sort by priority and return top recommendations
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      })
      .slice(0, 10); // Return top 10 recommendations
  }

  /**
   * Profile the data structure
   */
  private static profileData(data: any[]): DataProfile {
    if (!data || data.length === 0) {
      return {
        rowCount: 0,
        columnCount: 0,
        columns: [],
        relationships: [],
        patterns: {
          hasTimeSeries: false,
          hasHierarchy: false,
          hasGeographic: false,
          hasPartToWhole: false,
          hasComparison: false,
          hasDistribution: false,
          hasCorrelation: false
        }
      };
    }

    const columns = Object.keys(data[0] || {});
    const columnAnalyses: ColumnAnalysis[] = columns.map(colName => 
      this.analyzeColumn(data, colName)
    );

    const relationships = this.findRelationships(data, columnAnalyses);
    const patterns = this.detectPatterns(columnAnalyses, relationships);

    return {
      rowCount: data.length,
      columnCount: columns.length,
      columns: columnAnalyses,
      relationships,
      patterns
    };
  }

  /**
   * Analyze a single column
   */
  private static analyzeColumn(data: any[], columnName: string): ColumnAnalysis {
    const values = data.map(row => row[columnName]).filter(v => v !== null && v !== undefined);
    const uniqueValues = new Set(values).size;
    const nullCount = data.length - values.length;

    // Detect type
    let type: ColumnAnalysis['type'] = 'text';
    let numericStats: ColumnAnalysis['numericStats'] | undefined;
    let categoricalStats: ColumnAnalysis['categoricalStats'] | undefined;
    let temporalStats: ColumnAnalysis['temporalStats'] | undefined;

    // Check if numeric
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (numericValues.length > values.length * 0.8) {
      type = 'numeric';
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);

      numericStats = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        mean,
        median,
        stdDev,
        hasNegative: numericValues.some(v => v < 0)
      };
    }
    // Check if temporal
    else if (this.isTemporalColumn(values)) {
      type = 'temporal';
      const dates = values.map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
      temporalStats = {
        isDate: true,
        dateRange: dates.length > 0 ? {
          min: new Date(Math.min(...dates.map(d => d.getTime()))),
          max: new Date(Math.max(...dates.map(d => d.getTime())))
        } : undefined,
        hasTimeComponent: values.some(v => String(v).includes('T') || String(v).includes(' '))
      };
    }
    // Check if boolean
    else if (uniqueValues <= 2 && values.every(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase()))) {
      type = 'boolean';
    }
    // Categorical
    else if (uniqueValues < data.length * 0.5 && uniqueValues <= 50) {
      type = 'categorical';
      const valueCounts = new Map<string, number>();
      values.forEach(v => {
        const key = String(v);
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
      });
      const topValues = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      categoricalStats = {
        topValues,
        cardinality: uniqueValues <= 5 ? 'low' : uniqueValues <= 20 ? 'medium' : 'high'
      };
    }

    return {
      name: columnName,
      type,
      uniqueValues,
      nullCount,
      numericStats,
      categoricalStats,
      temporalStats
    };
  }

  /**
   * Find relationships between columns
   */
  private static findRelationships(data: any[], columns: ColumnAnalysis[]): DataProfile['relationships'] {
    const relationships: DataProfile['relationships'] = [];
    const numericColumns = columns.filter(c => c.type === 'numeric');

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const correlation = this.calculateCorrelation(data, col1.name, col2.name);

        if (Math.abs(correlation) > 0.3) {
          relationships.push({
            column1: col1.name,
            column2: col2.name,
            correlation: Math.abs(correlation),
            relationshipType: Math.abs(correlation) > 0.7 ? 'strong' : 
                             Math.abs(correlation) > 0.5 ? 'moderate' : 'weak'
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static calculateCorrelation(data: any[], col1: string, col2: string): number {
    const values1 = data.map(row => Number(row[col1])).filter(v => !isNaN(v));
    const values2 = data.map(row => Number(row[col2])).filter(v => !isNaN(v));

    if (values1.length !== values2.length || values1.length === 0) return 0;

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Detect data patterns
   */
  private static detectPatterns(columns: ColumnAnalysis[], relationships: DataProfile['relationships']): DataProfile['patterns'] {
    return {
      hasTimeSeries: columns.some(c => c.temporalStats?.isDate),
      hasHierarchy: columns.some(c => c.type === 'categorical' && c.categoricalStats?.cardinality === 'low'),
      hasGeographic: columns.some(c => 
        /country|state|city|region|location|lat|lon|latitude|longitude/i.test(c.name)
      ),
      hasPartToWhole: columns.some(c => 
        c.type === 'categorical' && 
        c.categoricalStats && 
        c.categoricalStats.cardinality !== 'high'
      ),
      hasComparison: columns.some(c => c.type === 'categorical'),
      hasDistribution: columns.some(c => c.type === 'numeric' && c.numericStats),
      hasCorrelation: relationships.some(r => r.relationshipType === 'strong' || r.relationshipType === 'moderate')
    };
  }

  /**
   * Check if column is temporal
   */
  private static isTemporalColumn(values: any[]): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/,
      /^\d{2}\/\d{2}\/\d{4}/,
      /^\d{4}\/\d{2}\/\d{2}/
    ];

    const dateCount = values.filter(v => {
      const str = String(v);
      if (datePatterns.some(p => p.test(str))) return true;
      const date = new Date(str);
      return !isNaN(date.getTime()) && str.length > 5;
    }).length;

    return dateCount > values.length * 0.7;
  }

  /**
   * Check if suitable for part-to-whole visualization
   */
  private static isPartToWholeSuitable(data: any[], catCol: string, numCol: string): boolean {
    const grouped = data.reduce((acc: any, row) => {
      const key = String(row[catCol] || 'Other');
      acc[key] = (acc[key] || 0) + (Number(row[numCol]) || 0);
      return acc;
    }, {});

    const values = Object.values(grouped) as number[];
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return false;

    // Check if values are reasonably distributed (not all in one category)
    const maxShare = Math.max(...values) / total;
    return maxShare < 0.95 && Object.keys(grouped).length <= 10;
  }

  /**
   * Get top categories for comparison
   */
  private static getTopCategories(data: any[], catCol: string, numCol: string, limit: number): Array<{ name: string; value: number }> {
    const grouped = data.reduce((acc: any, row) => {
      const key = String(row[catCol] || 'Other');
      acc[key] = (acc[key] || 0) + (Number(row[numCol]) || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  /**
   * Check if distribution analysis is suitable
   */
  private static hasGoodDistribution(totalRows: number, uniqueValues: number): boolean {
    return uniqueValues >= 5 && uniqueValues <= totalRows * 0.8;
  }

  /**
   * Check if column is suitable for KPI gauge
   */
  private static isKPISuitable(col: ColumnAnalysis): boolean {
    if (!col.numericStats) return false;
    const { min, max, mean } = col.numericStats;
    return max > 0 && (max - min) / mean > 0.1; // Has meaningful variance
  }

  /**
   * Get trend insight for time series
   */
  private static getTrendInsight(data: any[], timeCol: string, numCol: string): string {
    const sorted = [...data].sort((a, b) => {
      const dateA = new Date(a[timeCol]).getTime();
      const dateB = new Date(b[timeCol]).getTime();
      return dateA - dateB;
    });

    if (sorted.length < 2) return 'Insufficient data for trend analysis.';

    const first = Number(sorted[0][numCol]) || 0;
    const last = Number(sorted[sorted.length - 1][numCol]) || 0;
    const change = last - first;
    const percentChange = first !== 0 ? (change / first) * 100 : 0;

    if (Math.abs(percentChange) < 5) {
      return 'Trend shows relatively stable values over time.';
    } else if (percentChange > 0) {
      return `Upward trend detected: ${percentChange.toFixed(1)}% increase from start to end.`;
    } else {
      return `Downward trend detected: ${Math.abs(percentChange).toFixed(1)}% decrease from start to end.`;
    }
  }

  /**
   * Format column name for display
   */
  private static formatColumnName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate color palette
   */
  private static generateColorPalette(count: number): string[] {
    const baseColors = [
      '#00D4FF', '#6B46C1', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899'
    ];
    
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Generate additional colors if needed
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden angle for color distribution
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  }

  /**
   * Generate gradient palette
   */
  private static generateGradientPalette(count: number): string[] {
    const gradients = [
      ['#00D4FF', '#6B46C1'],
      ['#10B981', '#059669'],
      ['#F59E0B', '#D97706'],
      ['#EF4444', '#DC2626'],
      ['#8B5CF6', '#7C3AED']
    ];
    
    return gradients.slice(0, Math.min(count, gradients.length)).flat();
  }
}
