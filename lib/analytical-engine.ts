import { supabase } from "@/integrations/supabase/client";
import { EChartsOption } from 'echarts';
import { createEChartsOption, capitalize } from "./chart-utils";
import { VisualizationRecommendation } from "@/types/analytics";

export interface AnalyticalResponse {
    answer: string;
    chart?: EChartsOption;
    chartTitle?: string;
    chartType?: ChartType;
}

type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'mode';
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'funnel' | 'gauge' | 'radar' | 'treemap' | 'heatmap' | 'sunburst' | 'sankey' | 'waterfall' | 'polar-bar' | 'themeRiver' | 'pictorialBar';

export interface AnalyticalContext {
    metric?: string | null;
    dimension?: string | null;
    chartType?: ChartType | null;
    aggregation?: AggregationType;
}

export interface AnalyticalResponse {
    answer: string;
    chart?: EChartsOption;
    chartTitle?: string;
    chartType?: ChartType;
    context?: AnalyticalContext;
    fileId?: string; // ID of the file used for analysis
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRow = Record<string, any>;

interface AnalyticalEntities {
    metric: string | null;
    dimension: string | null;
    chartType: ChartType | null;
    aggregation: AggregationType;
    filters: Record<string, string>; // New: Filters to apply (e.g., { 'Cashier': 'John Doe' })
}

type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'mode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRow = Record<string, any>;

interface AnalyticalEntities {
    metric: string | null;
    dimension: string | null;
    chartType: 'bar' | 'line' | 'pie' | null;
    aggregation: AggregationType;
}

export class AnalyticalEngine {
    private static instance: AnalyticalEngine;

    private constructor() { }

    public static getInstance(): AnalyticalEngine {
        if (!AnalyticalEngine.instance) {
            AnalyticalEngine.instance = new AnalyticalEngine();
        }
        return AnalyticalEngine.instance;
    }

    public async analyzeQuery(
        query: string,
        dataSourceId: string | null,
        context: AnalyticalContext | null = null
    ): Promise<AnalyticalResponse | null> {
        console.log("AnalyticalEngine: Analyzing query:", query, "Source:", dataSourceId);
        if (!dataSourceId) return null;

        const lowerQuery = query.toLowerCase();

        // 1. Intent Detection
        const isAnalytical = this.detectAnalyticalIntent(lowerQuery);
        console.log("AnalyticalEngine: Is Analytical?", isAnalytical);
        if (!isAnalytical) return null;

        // 2. Fetch Data First (for dynamic entity detection)
        const { data: rawData, fileId } = await this.fetchData(dataSourceId);
        console.log("AnalyticalEngine: Fetched Data Rows:", rawData?.length);
        if (!rawData || rawData.length === 0) return null;

        const columns = Object.keys(rawData[0] || {});

        // 3. Extract Entities & Aggregation (Dynamic)
        const entities = this.extractEntities(lowerQuery, columns, rawData, context);
        console.log("AnalyticalEngine: Extracted Entities:", entities);

        // 3.5 Apply Filters
        let processedData = rawData;
        if (Object.keys(entities.filters).length > 0) {
            console.log("Applying Filters:", entities.filters);
            processedData = rawData.filter(row => {
                return Object.entries(entities.filters).every(([col, val]) => {
                    const rowVal = String(row[col] || '').toLowerCase();
                    return rowVal.includes(val.toLowerCase());
                });
            });
            console.log("Filtered Data Rows:", processedData.length);
            if (processedData.length === 0) {
                return {
                    answer: `I couldn't find any data matching your filter for **${Object.keys(entities.filters).map(k => `${k}="${entities.filters[k]}"`).join(', ')}**.`,
                    chart: undefined
                };
            }
        }

        // 4. Analyze Data & Generate Chart
        const response = this.generateInsight(lowerQuery, entities, processedData);
        if (response && fileId) {
            response.fileId = fileId;
        }
        return response;
    }

    private detectAnalyticalIntent(query: string): boolean {
        const keywords = [
            'trend', 'compare', 'distribution', 'breakdown', 'show me',
            'graph', 'chart', 'plot', 'visualize', 'sales', 'revenue',
            'count', 'average', 'total', 'top', 'performance', 'how many',
            'analysis', 'sum', 'min', 'max', 'vs', 'mean', 'median', 'mode',
            'list', 'what is',
            'funnel', 'gauge', 'radar', 'scatter', 'heatmap', 'treemap',
            'sunburst', 'sankey', 'waterfall', 'polar', 'pictorial'
        ];
        return keywords.some(k => query.includes(k));
    }

    private extractEntities(query: string, columns: string[], data: DataRow[], context?: AnalyticalContext | null): AnalyticalEntities {
        let metric = this.detectMetric(query, columns, data);
        let dimension = this.detectDimension(query, columns);
        let chartType = this.detectChartType(query);
        let aggregation = this.detectAggregationType(query);

        // Context Inheritance
        if (context) {
            // Inherit metric if dimension found but no metric
            if (dimension && !metric && context.metric) metric = context.metric;
            // Inherit dimension if metric found but no dimension
            if (metric && !dimension && context.dimension) dimension = context.dimension;
            // Inherit both if neither found (e.g., sorting or simple follow-up)
            if (!metric && !dimension) {
                metric = context.metric || null;
                dimension = context.dimension || null;
            }
            // Inherit aggregation if not explicitly changed
            if (aggregation === 'sum' && context.aggregation && context.aggregation !== 'sum') {
                // Only inherit if default 'sum' was returned and user didn't specify new aggregation
                // But aggregation detection defaults to 'sum' if no keyword.
                // We should check if query actually contains aggregation keywords?
                // For now, let's keep it simple. If we inherited metric, we likely want the same aggregation.
                if (context.aggregation !== 'count') aggregation = context.aggregation;
            }
        }

        // Conflict Resolution: If metric and dimension match the same column (e.g., "Average Time")
        if (metric && dimension && metric.toLowerCase() === dimension.toLowerCase()) {
            // Prioritize Dimension if explicit grouping/listing is requested
            if (query.includes(' by ') || query.includes('list') || chartType) {
                metric = null;
            } else {
                // Otherwise prioritize Metric (Scalar) - e.g. "Average Time", "Count Orders"
                dimension = null;
            }
        }

        // Refine Aggregation defaults
        if (aggregation === 'sum' && (query.includes('list') || !metric)) {
            if (!query.includes('total') && !query.includes('sum')) {
                aggregation = 'count';
            }
        }

        // Detect Filters (New)
        const filters: Record<string, string> = {};
        // Only look for filters if we have a dimension, or if we need to find one.
        // Simple heuristic: If a word in query matches a value in a categorical column, treat as filter.

        // We limit this scanning to avoid performance hit on large datasets, 
        // but here we already have 'data' (first 2000 rows).

        const potentialFilterCols = columns.filter(c =>
            // Exclude metric/numeric columns from being treated as categorical filters for now unless explicit
            !this.detectMetric(c, [c], data)
        );

        const words = query.split(' ');

        // Scan for value matches
        // Optimization: Use a Set of all values processing? Too expensive.
        // Instead, iterate columns and check if query contains any high-cardinality values?
        // Better: Iterate known categorical columns or dimension candidates.

        for (const col of potentialFilterCols) {
            if (col === dimension) continue; // Don't filter by the dimension we are grouping by, usually. 
            // UNLESS query is specific? e.g. "Sales for Cashier A" where Dimension=Cashier.
            // Actually, if we filter by Cashier=A, the dimension 'Cashier' results in 1 row.

            // Check distinct values in this column (sample)
            const uniqueVals = Array.from(new Set(data.map(d => String(d[col]).toLowerCase()).filter(v => v.length > 2))); // Filter short junk

            // Sort by length desc to match longest phrases first
            uniqueVals.sort((a, b) => b.length - a.length);

            for (const val of uniqueVals) {
                if (query.includes(val)) {
                    // Found a filter!
                    filters[col] = val; // Store exact value found (but lowercased)
                    // If we found a filter, we might NOT want to use this column as the main grouping dimension 
                    // unless it's the ONLY dimension found.
                    // But let's keep it simple.
                    break;
                }
            }
        }

        // Special Case: specific "for [Value]" pattern

        return {
            metric,
            dimension,
            chartType,
            aggregation,
            filters
        };
    }

    private detectAggregationType(query: string): 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'mode' {
        if (query.includes('average') || query.includes('avg') || query.includes('mean')) return 'avg';
        if (query.includes('median')) return 'median';
        if (query.includes('mode')) return 'mode';
        if (query.includes('count') || query.includes('how many') || query.includes('number of')) return 'count';
        if (query.includes('min') || query.includes('lowest') || query.includes('bottom')) return 'min';
        if (query.includes('max') || query.includes('highest') || query.includes('top') || query.includes('peak')) return 'max';
        return 'sum';
    }

    private detectMetric(query: string, columns: string[], data: DataRow[]): string | null {
        // Helper to check if column is numeric
        const isNumeric = (col: string) => {
            const val = data.find(d => d[col] !== null && d[col] !== undefined)?.[col];
            return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val.replace(/[^0-9.-]+/g, ""))));
        };

        // 1. Dynamic Match: Check if any numeric column is mentioned in the query
        for (const col of columns) {
            if (query.includes(col.toLowerCase())) {
                // Skip non-numeric columns if math operation is requested
                if ((query.includes('average') || query.includes('sum') || query.includes('total')) && !isNumeric(col)) {
                    continue;
                }
                return col;
            }
        }

        // 2. Token match (e.g. col "Total Sales", query "sales")
        for (const col of columns) {
            const tokens = col.toLowerCase().split(/[ _-]+/);
            for (const token of tokens) {
                if (token.length < 3) continue;
                if (query.includes(token)) {
                    if ((query.includes('average') || query.includes('sum') || query.includes('total')) && !isNumeric(col)) {
                        continue;
                    }
                    return col;
                }
            }
        }

        // 2. Hardcoded Common Metrics (Fallback)
        const commonMetrics = [
            'sales', 'revenue', 'amount', 'profit', 'margin', 'cost', 'expense',
            'quantity', 'units', 'volume', 'price', 'rate', 'rating', 'score',
            'value', 'transaction', 'order'
        ];

        for (const m of commonMetrics) {
            if (query.includes(m)) return m;
        }
        return null;
    }

    private detectDimension(query: string, columns: string[]): string | null {
        // 1. Dynamic Match from Columns
        for (const col of columns) {
            // Filter out common false positives if very short
            if (col.length <= 2 && col.toLowerCase() !== 'id') continue;

            if (query.includes(col.toLowerCase())) {
                return col;
            }
        }

        // 2. Token match (e.g. col "Customer Name", query "customer")
        for (const col of columns) {
            const tokens = col.toLowerCase().split(/[ _-]+/);
            for (const token of tokens) {
                if (token.length < 3) continue;
                if (query.includes(token)) {
                    return col;
                }
            }
        }

        // 2. Hardcoded Common Dimensions (Fallback)
        const commonDimensions = [
            'date', 'time', 'year', 'month', 'day', 'quarter',
            'category', 'type', 'sector', 'region', 'country', 'city',
            'state', 'location', 'product', 'item', 'sku',
            'customer', 'client', 'cashier', 'status', 'stage'
        ];

        for (const d of commonDimensions) {
            if (query.includes(d)) return d;
        }
        return null;
    }

    private detectChartType(query: string): ChartType | null {
        // Special charts first
        if (query.includes('funnel') || query.includes('pipeline') || query.includes('conversion')) return 'funnel';
        if (query.includes('gauge') || query.includes('dashboard') || query.includes('meter')) return 'gauge';
        if (query.includes('radar') || query.includes('spider')) return 'radar';
        if (query.includes('scatter') || query.includes('bubble') || query.includes('correlation')) return 'scatter';
        if (query.includes('heatmap') || query.includes('matrix')) return 'heatmap';
        if (query.includes('treemap')) return 'treemap';
        if (query.includes('sunburst')) return 'sunburst';
        if (query.includes('sankey') || query.includes('flow')) return 'sankey';
        if (query.includes('waterfall')) return 'waterfall';
        if (query.includes('river') || query.includes('stream')) return 'themeRiver';
        if (query.includes('polar')) return 'polar-bar';
        if (query.includes('pictorial')) return 'pictorialBar';

        // Standard charts
        if (query.includes('area') || query.includes('fill')) return 'area';
        if (query.includes('line') || query.includes('trend') || query.includes('over time') || query.includes('growth')) return 'line';
        if (query.includes('pie') || query.includes('distribution') || query.includes('share') || query.includes('breakdown') || query.includes('proportion')) return 'pie';
        if (query.includes('bar') || query.includes('compare') || query.includes('rank') || query.includes('vs')) return 'bar';

        return null;
    }

    private async fetchData(dataSourceId: string): Promise<{ data: DataRow[], fileId: string | null }> {
        try {
            console.log("Fetching data source details for:", dataSourceId);
            const { data: dataSource, error: dsError } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('data_sources' as any)
                .select('*')
                .eq('id', dataSourceId)
                .single();

            if (dsError || !dataSource) {
                console.error("Error fetching data source info:", dsError);
                return { data: [], fileId: null };
            }

            const fileName = (dataSource as any).name;
            if (!fileName) {
                console.error("Data source has no name property");
                return { data: [], fileId: null };
            }

            console.log("Looking for file with name:", fileName);

            // Strategies to find the file
            const strategies = [
                fileName,
                fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
                fileName.replace(/ /g, '_'),
                `${fileName.replace(/ /g, '_')}.csv`,
                fileName.replace(/ /g, '-'),
                `${fileName.replace(/ /g, '-')}.csv`
            ];

            let fileId: string | null = null;

            // 1. Try strategies
            for (const strategyName of strategies) {
                console.log("Trying strategy:", strategyName);
                const { data: files } = await supabase
                    .from('uploaded_files')
                    .select('id')
                    .eq('file_name', strategyName)
                    .limit(1);

                if (files && files.length > 0) {
                    fileId = files[0].id;
                    console.log("Found file with strategy:", strategyName);
                    break;
                }
            }

            // 2. Fallback: Case insensitive match on original name
            if (!fileId) {
                console.log("Retrying with ILIKE:", fileName);
                const { data: fuzzyFiles } = await supabase
                    .from('uploaded_files')
                    .select('id')
                    .ilike('file_name', fileName)
                    .limit(1);
                if (fuzzyFiles && fuzzyFiles.length > 0) fileId = fuzzyFiles[0].id;
            }

            if (!fileId) {
                console.error("Could not find any matching uploaded file for source:", fileName);
                return { data: [], fileId: null };
            }

            console.log("Found File ID:", fileId);

            const { data: records, error: recordsError } = await supabase
                .from('data_records')
                .select('row_data')
                .eq('file_id', fileId)
                .limit(2000);

            if (recordsError || !records) {
                console.error("Error fetching records:", recordsError);
                return { data: [], fileId: null };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { data: records.map((r: any) => r.row_data), fileId };
        } catch (e) {
            console.error("Error fetching data for analysis", e);
            return { data: [], fileId: null };
        }
    }

    private calculateScalar(data: DataRow[], metric: string | null, type: AggregationType): number | string {
        let values: (string | number)[] = [];
        if (type === 'count' && !metric) {
            return data.length;
        }

        if (metric) {
            values = data.map(item => item[metric]).filter(v => v !== null && v !== undefined && v !== '');
        }

        if (values.length === 0 && type !== 'count') return 0;

        // Helper for numeric conversion
        const toNum = (v: unknown) => {
            if (typeof v === 'number') return v;
            if (typeof v === 'string') return parseFloat(v.replace(/[^0-9.-]+/g, "")) || 0;
            return 0;
        };

        if (type === 'min' || type === 'max') {
            values.sort(); // Lexicographical sort works for strings and numbers (if consistent type)
            // If numeric, fix sort
            if (values.length > 0 && typeof values[0] === 'number') {
                values.sort((a, b) => (typeof a === 'number' && typeof b === 'number') ? a - b : 0);
            }
            if (type === 'min') return values[0];
            if (type === 'max') return values[values.length - 1];
        }

        // For math ops, convert to numbers
        const numValues = values.map(toNum).filter(v => !isNaN(v));

        if ((type === 'sum' || type === 'avg' || type === 'median' || type === 'mode') && numValues.length === 0) return 0;

        numValues.sort((a, b) => a - b);

        switch (type) {
            case 'sum': return numValues.reduce((a, b) => a + b, 0);
            case 'avg': return numValues.reduce((a, b) => a + b, 0) / numValues.length;
            case 'count': return values.length;
            case 'median': {
                const mid = Math.floor(numValues.length / 2);
                return numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;
            }
            case 'mode': {
                const counts: Record<number, number> = {};
                let maxFreq = 0;
                let mode = numValues[0];
                for (const v of numValues) {
                    counts[v] = (counts[v] || 0) + 1;
                    if (counts[v] > maxFreq) {
                        maxFreq = counts[v];
                        mode = v;
                    }
                }
                return mode;
            }
            default: return 0;
        }
    }

    private aggregateData(data: DataRow[], dimension: string, metric: string | null, type: AggregationType): DataRow[] {
        const groups: Record<string, number[]> = {};
        console.log(`__Aggregating: Dim=${dimension}, Metric=${metric}, Type=${type}`);

        data.forEach(item => {
            const key = String(item[dimension] || 'Unknown');

            let val = 0;
            if (metric) {
                const rawVal = item[metric];
                if (typeof val === 'number') {
                    val = rawVal;
                } else if (typeof rawVal === 'string') {
                    // Remove currency symbols, commas, etc.
                    val = parseFloat(rawVal.replace(/[^0-9.-]+/g, ""));
                }
            } else {
                val = 1; // Count *
            }

            if (!groups[key]) groups[key] = [];

            if (metric) {
                if (!isNaN(val)) groups[key].push(val);
            } else {
                groups[key].push(1);
            }
        });

        const result = Object.entries(groups).map(([key, values]) => {
            let res = 0;
            values.sort((a, b) => a - b);

            switch (type) {
                case 'sum':
                    res = values.reduce((a, b) => a + b, 0);
                    break;
                case 'avg':
                    res = values.reduce((a, b) => a + b, 0) / (values.length || 1);
                    break;
                case 'min':
                    res = values[0] || 0;
                    break;
                case 'max':
                    res = values[values.length - 1] || 0;
                    break;
                case 'count':
                    res = values.length;
                    break;
                case 'median':
                    if (values.length === 0) res = 0;
                    else {
                        const mid = Math.floor(values.length / 2);
                        res = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
                    }
                    break;
                case 'mode': {
                    const counts: Record<number, number> = {};
                    let maxFreq = 0;
                    let mode = values[0] || 0;
                    for (const v of values) {
                        counts[v] = (counts[v] || 0) + 1;
                        if (counts[v] > maxFreq) {
                            maxFreq = counts[v];
                            mode = v;
                        }
                    }
                    res = mode;
                    break;
                }
            }

            const out: DataRow = {};
            out[dimension] = key;
            out[metric || 'count'] = res;
            return out;
        });

        console.log("Aggregation Result (Top 3):", result.slice(0, 3));
        return result;
    }

    private generateInsight(query: string, entities: AnalyticalEntities, data: DataRow[]): AnalyticalResponse | null {
        const keys = Object.keys(data[0] || {});
        console.log("Data Keys:", keys);

        // 1. Resolve Fields
        let metricField: string | undefined;
        if (entities.metric) {
            metricField = keys.find(k => k.toLowerCase() === entities.metric?.toLowerCase());
            if (!metricField && entities.metric) {
                metricField = keys.find(k => k.toLowerCase().includes(entities.metric.toLowerCase()));
            }
        }

        let dimensionField: string | undefined;
        if (entities.dimension) {
            dimensionField = keys.find(k => k.toLowerCase() === entities.dimension?.toLowerCase());
            if (!dimensionField && entities.dimension) {
                dimensionField = keys.find(k => k.toLowerCase().includes(entities.dimension.toLowerCase()));
            }
        }

        console.log(`Resolved Fields: Metric=${metricField}, Dimension=${dimensionField}`);

        // LIST OPERATION (Dimension but 'List' intent, no Chart intent)
        if (dimensionField && query.includes('list') && !query.includes('chart') && !query.includes('graph') && !query.includes('plot') && !entities.chartType && (!metricField || metricField === dimensionField)) {
            console.log("Performing List Operation (Text Only)");
            // Extract distinct values
            const distinctValues = Array.from(new Set(data.map(d => d[dimensionField!]).filter(v => v !== null && v !== undefined && v !== '')));
            const limitedValues = distinctValues.slice(0, 20); // Limit to 20
            const formattedDim = capitalize(dimensionField);

            let listStr = limitedValues.join(', ');
            if (distinctValues.length > 20) {
                listStr += `, and ${distinctValues.length - 20} more...`;
            }

            return {
                answer: `Here is the list of **${formattedDim}**:\n${listStr}`,
                chart: undefined,
                chartTitle: undefined
            };
        }

        // SCALAR AGGREGATION (No Dimension)
        if (!dimensionField) {
            // Check if we have enough to do a scalar (need metric or count)
            if (!metricField && entities.aggregation !== 'count') {
                console.warn("No metric and no dimension. Cannot analyze.");
                return null;
            }

            console.log("Performing Scalar Aggregation (Text Only)");
            const value = this.calculateScalar(data, metricField || null, entities.aggregation);

            let displayAgg = capitalize(entities.aggregation);
            if (entities.aggregation === 'avg') displayAgg = 'Average';
            if (entities.aggregation === 'max') displayAgg = 'Top';
            if (entities.aggregation === 'min') displayAgg = 'Lowest';

            if (query.includes('performer')) {
                displayAgg += ' performer';
            }

            const formattedMetric = metricField ? capitalize(metricField) : 'Records';
            const valStr = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);

            let textAnswer = `The ${displayAgg} ${formattedMetric}`;

            const yearMatch = query.match(/\b(20\d{2})\b/);
            if (yearMatch) {
                textAnswer += ` in ${yearMatch[1]}`;
            }

            textAnswer += ` is **${valStr}**.`;

            if (entities.aggregation === 'count' && !metricField) {
                textAnswer = `The total count is **${valStr}**.`;
            }

            return {
                answer: textAnswer,
                chart: undefined,
                chartTitle: undefined
            };
        }

        // Fallbacks
        if (!metricField && entities.aggregation !== 'count') {
            // Find first numeric field for math ops
            metricField = keys.find(k => {
                const val = data[0][k];
                if (typeof val === 'number') return !k.toLowerCase().includes('id');
                if (typeof val === 'string' && !isNaN(parseFloat(val.replace(/[^0-9.-]+/g, "")))) return !k.toLowerCase().includes('id');
                return false;
            });
            console.log("Fallback Metric Field:", metricField);

            // If still no numeric metric found, switch to COUNT if chart is requested
            if (!metricField && entities.chartType) {
                console.log("No numeric metric found for chart. Switching to COUNT aggregation.");
                entities.aggregation = 'count';
            }
        }

        // Auto-select dimension for Sales related queries if missing
        const isSalesQuery = metricField && ['sales', 'revenue', 'profit', 'amount'].some(k => metricField!.toLowerCase().includes(k));

        if (!dimensionField && (isSalesQuery || entities.chartType)) {
            console.log("Sales query or Chart intent detected without dimension. Attempting to auto-select dimension.");
            // 1. Try Date/Time
            dimensionField = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('year') || k.toLowerCase().includes('month') || k.toLowerCase().includes('time'));

            // 2. Try Category/Region/Product
            if (!dimensionField) {
                dimensionField = keys.find(k => ['category', 'sub-category', 'region', 'segment', 'country', 'state', 'product', 'item'].some(t => k.toLowerCase().includes(t)));
            }

            // 3. Fallback: First reasonable string column (exclude IDs, URLs)
            if (!dimensionField) {
                dimensionField = keys.find(k => {
                    const val = data[0][k];
                    const key = k.toLowerCase();
                    return typeof val === 'string' && !key.includes('id') && !key.includes('url') && !key.includes('image') && val.length < 50;
                });
            }

            if (dimensionField) {
                console.log("Auto-selected Dimension:", dimensionField);
            }
        }

        if (!dimensionField && (entities.chartType === 'line' || query.includes('trend'))) {
            dimensionField = keys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('year'));
            console.log("Fallback Dimension Field (Time):", dimensionField);
        }

        if (!dimensionField) {
            console.warn("Could not resolve dimension field");
            return null; // Cannot visualize without dimension
        }
        if (!metricField && entities.aggregation !== 'count') {
            return null;
        }

        // 2. Determine Chart Type (Early Detection for Sorting)
        let chartType = entities.chartType;

        // Force chart for Sales/Revenue if dimension exists and no chart type specified
        if (!chartType && isSalesQuery && dimensionField) {
            const dimLower = dimensionField.toLowerCase();
            if (dimLower.includes('date') || dimLower.includes('year') || dimLower.includes('month') || dimLower.includes('time')) {
                chartType = 'line';
            } else if (query.includes('share') || query.includes('distribution')) {
                chartType = 'pie';
            } else {
                chartType = 'bar';
            }
        }

        if (!chartType) {
            const dimLower = dimensionField.toLowerCase();
            if (dimLower.includes('date') || dimLower.includes('year') || dimLower.includes('month') || dimLower.includes('time')) {
                chartType = 'line';
            } else if (query.includes('share') || query.includes('distribution')) {
                chartType = 'pie';
            } else {
                chartType = 'bar';
            }
        }

        // 3. Aggregate Data
        const aggregatedData = this.aggregateData(data, dimensionField, metricField || null, entities.aggregation);

        // 4. Sort Data Smartly
        const valueField = metricField || 'count';
        const isTimeChart = chartType === 'line' || dimensionField.toLowerCase().includes('date') || dimensionField.toLowerCase().includes('year');

        if (isTimeChart) {
            // Sort by Time (Ascending)
            aggregatedData.sort((a, b) => {
                const valA = a[dimensionField!];
                const valB = b[dimensionField!];
                const dateA = new Date(valA).getTime();
                const dateB = new Date(valB).getTime();
                if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
                return String(valA).localeCompare(String(valB));
            });
        } else {
            // Sort by Value (Descending)
            aggregatedData.sort((a, b) => {
                if (typeof a[valueField] === 'number' && typeof b[valueField] === 'number') {
                    return b[valueField] - a[valueField];
                }
                return 0;
            });
        }

        // 5. Generate Insight Text
        const formattedAgg = capitalize(entities.aggregation === 'avg' ? 'Average' : entities.aggregation);
        const formattedMetric = capitalize(valueField);
        const formattedDim = capitalize(dimensionField);

        let desc = `${formattedAgg} ${formattedMetric}`;
        if (entities.aggregation === 'count' && valueField === 'count') {
            desc = 'Count';
        }

        let answer = `Here is the **${desc} by ${formattedDim}**.`;

        // Dynamic Insight Generation
        if (isTimeChart) {
            answer += `\n\nThe chart identifies the **trend over time**.`;

            // Optionally find peak if it's a significant outlier or requested
            if (query.includes('top') || query.includes('peak') || query.includes('highest')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const sortedByValue = [...aggregatedData].sort((a, b) => (b[valueField] as any) - (a[valueField] as any));
                const localPeak = sortedByValue[0];
                const val = typeof localPeak[valueField] === 'number' ? localPeak[valueField].toLocaleString(undefined, { maximumFractionDigits: 1 }) : localPeak[valueField];
                answer += ` The highest point was in **${localPeak[dimensionField]}** (${val}).`;
            }
        } else {
            // For categorical charts (Bar, Pie, etc.), determine what to highlight
            let highlightedItem = aggregatedData[0]; // Default to top (sorted desc)
            let highlightDesc = "top";

            if (query.includes('lowest') || query.includes('min') || query.includes('bottom') || query.includes('worst')) {
                highlightedItem = aggregatedData[aggregatedData.length - 1];
                highlightDesc = "lowest";
            } else if (entities.aggregation === 'min') {
                highlightedItem = aggregatedData[aggregatedData.length - 1]; // Since we sort by value desc, last is lowest
                highlightDesc = "lowest";
            }

            // If asking for "distribution" or just "show me", maybe showing top is okay, but phrase it better.
            // If specifically asking for "lowest", we now show lowest.

            if (aggregatedData.length > 0) {
                const val = typeof highlightedItem[valueField] === 'number' ? highlightedItem[valueField].toLocaleString(undefined, { maximumFractionDigits: 1 }) : highlightedItem[valueField];

                if (query.includes('list') || query.includes('breakdown')) {
                    // Minimal insight for lists
                } else if (query.includes('lowest') || query.includes('min') || query.includes('bottom')) {
                    answer += `\n\nThe ${highlightDesc} ${formattedDim} is **${highlightedItem[dimensionField]}** with a ${desc.toLowerCase()} of **${val}**.`;
                } else {
                    // Default / Top / Max
                    answer += `\n\nThe top ${formattedDim} is **${highlightedItem[dimensionField]}** with a ${desc.toLowerCase()} of **${val}**.`;
                }
            }
        }

        // 6. Create ECharts Option
        const chartTitle = `${desc} by ${formattedDim}`;

        const rec: VisualizationRecommendation = {
            title: chartTitle,
            type: chartType as string,
            x_axis: dimensionField,
            y_axis: valueField,
            priority: 'high'
        };

        const option = createEChartsOption(rec, aggregatedData);

        return {
            answer,
            chart: option,
            chartTitle,
            chartType,
            context: {
                metric: metricField || null,
                dimension: dimensionField || null,
                chartType: chartType || null,
                aggregation: entities.aggregation
            }
        };
    }
}

export const analyticalEngine = AnalyticalEngine.getInstance();


