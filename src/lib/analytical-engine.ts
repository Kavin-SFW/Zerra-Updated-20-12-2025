import { supabase } from "@/integrations/supabase/client";
import { EChartsOption } from "echarts";
import { capitalize, createEChartsOption } from "./chart-utils";
import { VisualizationRecommendation } from "@/types/analytics";
import { mockDataService } from "@/services/MockDataService";

type AggregationType =
    | "sum"
    | "avg"
    | "count"
    | "min"
    | "max"
    | "median"
    | "mode";
export type ChartType =
    | "bar"
    | "line"
    | "pie"
    | "scatter"
    | "area"
    | "funnel"
    | "gauge"
    | "radar"
    | "treemap"
    | "heatmap"
    | "sunburst"
    | "sankey"
    | "waterfall"
    | "polar-bar"
    | "themeRiver"
    | "pictorialBar"
    | "network"
    | "map"
    | "3d-scatter"
    | "3d-bar";

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
    filters: Record<string, string>;
    dimension2?: string | null; // Secondary dimension for complex charts (Sankey, Heatmap, etc.)
    limit?: number | null;
}

export class AnalyticalEngine {
    private static instance: AnalyticalEngine;

    private constructor() {}

    public static getInstance(): AnalyticalEngine {
        if (!AnalyticalEngine.instance) {
            AnalyticalEngine.instance = new AnalyticalEngine();
        }
        return AnalyticalEngine.instance;
    }

    public async analyzeQuery(
        query: string,
        dataSourceId: string | null,
        context: AnalyticalContext | null = null,
    ): Promise<AnalyticalResponse | null> {
        console.log(
            "AnalyticalEngine: Analyzing query:",
            query,
            "Source:",
            dataSourceId,
        );
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
        const entities = this.extractEntities(
            lowerQuery,
            columns,
            rawData,
            context,
        );
        console.log("AnalyticalEngine: Extracted Entities:", entities);

        // 3.5 Apply Filters
        let processedData = rawData;
        if (Object.keys(entities.filters).length > 0) {
            console.log("Applying Filters:", entities.filters);
            processedData = rawData.filter((row) => {
                return Object.entries(entities.filters).every(([col, val]) => {
                    const rowVal = String(row[col] || "").toLowerCase();
                    return rowVal.includes(val.toLowerCase());
                });
            });
            console.log("Filtered Data Rows:", processedData.length);
            if (processedData.length === 0) {
                return {
                    answer:
                        `I couldn't find any data matching your filter for **${
                            Object.keys(entities.filters).map((k) =>
                                `${k}="${entities.filters[k]}"`
                            ).join(", ")
                        }**.`,
                    chart: undefined,
                };
            }
        }

        // 4. Analyze Data & Generate Chart
        const response = this.generateInsight(
            lowerQuery,
            entities,
            processedData,
        );
        if (response && fileId) {
            response.fileId = fileId;
        }
        return response;
    }

    private detectAnalyticalIntent(query: string): boolean {
        const keywords = [
            "trend",
            "compare",
            "distribution",
            "breakdown",
            "show me",
            "graph",
            "chart",
            "plot",
            "visualize",
            "sales",
            "revenue",
            "count",
            "average",
            "total",
            "top",
            "performance",
            "how many",
            "analysis",
            "sum",
            "min",
            "minimum",
            "max",
            "maximum",
            "vs",
            "mean",
            "median",
            "mode",
            "list",
            "what is",
            "funnel",
            "gauge",
            "radar",
            "scatter",
            "heatmap",
            "treemap",
            "sunburst",
            "sankey",
            "waterfall",
            "polar",
            "pictorial",
            // New natural language additions
            "which",
            "what",
            "highest",
            "lowest",
            "most",
            "more",
            "least",
            "smallest",
            "largest",
            "best",
            "worst",
            "sold",
            "bought",
            "profit",
            "loss",
            "growth",
            "decline",
            "how much",
            "how many",
            "what type of questions",
            "what questions",
            "help",
        ];

        // If it's a "How to" or "What is" question without specific data keywords, let the LLM handle it.
        // This improves "correctness" for general questions.
        if (
            (query.startsWith("what is") || query.startsWith("how to") ||
                query.startsWith("explain")) &&
            !keywords.some((k) => query.includes(k) && k !== "what is")
        ) {
            return false;
        }

        return keywords.some((k) => this.safeMatch(query, k));
    }

    private safeMatch(text: string, pattern: string): boolean {
        try {
            // Escape special regex characters in pattern
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            // Look for whole word match
            const regex = new RegExp(`\\b${escaped}\\b`, "i");
            return regex.test(text);
        } catch (e) {
            return text.toLowerCase().includes(pattern.toLowerCase());
        }
    }

    private extractEntities(
        query: string,
        columns: string[],
        data: DataRow[],
        context?: AnalyticalContext | null,
    ): AnalyticalEntities {
        // Normalize query for consistent detection (Fixes "Total" vs "total", "Show" vs "show")
        query = query.toLowerCase();

        let dimension = this.detectDimension(query, columns, data);
        // If we found a dimension using a "Question Word" pattern (e.g., "Which Location"),
        // we should valid it strongly and try not to let metric detection override it or confuse it.

        // Pass the already found dimension to detectMetric to avoid picking the same column as metric
        // UPDATE: Do NOT exclude it. If "Productivity Score" is found as both, we resolve later.
        // If we exclude it here, we miss the metric entirely if it was falsely flagged as a dimension.
        let metric = this.detectMetric(query, columns, data, null);

        // Special Case: "Total count of [Dimension]" (e.g. Total count of Employee ID)
        if (
            dimension &&
            (query.includes("total count") || query.includes("total number"))
        ) {
            if (!metric) {
                metric = dimension;
                dimension = null;
            }
        }

        let chartType = this.detectChartType(query);
        let aggregation = this.detectAggregationType(query);

        // Special Case: "Total Records in data" or "Row count"
        if (
            query.includes("records") || query.includes("rows") ||
            query.includes("how many data")
        ) {
            aggregation = "count";
            if (!metric && !dimension) {
                // Force a count even if no column found
                metric = null;
            }
        }

        let limit = this.detectLimit(query);
        // Context Inheritance
        if (context) {
            // Check if this looks like a completely new question (e.g., "Show me...", "What is...")
            // If so, and we found NO entities, we should probably NOT inherit, but rather fail
            // and let the LLM handle it (via null return later), OR assume a minimal default.
            // Check if this looks like a completely new question (e.g., "Show me...", "What is...")
            // If so, and we found NO entities, we should probably NOT inherit, but rather fail
            // and let the LLM handle it (via null return later), OR assume a minimal default.
            const isNewIntent =
                /^(show|what|which|list|give|tell|who|how|sum|count|average|avg|min|minimum|max|maximum|total|summary)\b/i
                    .test(query) ||
                query.includes("analyze") ||
                query.includes("visualize") ||
                query.includes("graph") ||
                query.includes("chart");

            // Look for implicit follow-ups (short queries, sorting, limiting)
            const isFollowUp = query.length < 20 ||
                /^(sort|order|filter|limit|top|bottom)/i.test(query) ||
                query.startsWith("and") ||
                query.startsWith("but");

            // Inherit metric if dimension found but no metric (likely grouping change)
            // Ensure we don't inherit metric if it's a completely NEW intent, UNLESS it's an explicit "by" grouping
            const allowInheritance = !isNewIntent || query.includes(" by ") ||
                query.includes("breakdown");
            if (dimension && !metric && context.metric && allowInheritance) {
                metric = context.metric;
            }

            // Inherit dimension if metric found but no dimension (likely metric change)
            // BUT: Avoid inheriting dimension if the user asks a specific scalar question ("What is the total sales?")
            if (metric && !dimension && context.dimension) {
                const isScalarQuestion =
                    /^(what is|how many|tell me|give me|show me value)\b/i.test(
                        query,
                    );
                const hasGrouping = query.includes(" by ") ||
                    query.includes("breakdown");

                if (!isScalarQuestion || hasGrouping) {
                    dimension = context.dimension;
                }
            }

            // Inherit both if neither found (e.g., sorting or simple follow-up)
            if (!metric && !dimension) {
                // Only inherit if it Looks like a follow-up OR it's NOT a new intent
                // If it is a new intent but we found nothing, inheriting usually leads to the "Previous Answer" bug.
                if (isFollowUp && !isNewIntent) {
                    metric = context.metric || null;
                    dimension = context.dimension || null;
                } else if (!isNewIntent) {
                    // If it's ambiguous (not clearly new, not clearly follow-up), try to be helpful but cautious
                    // But if the user typed valid text that we missed, inheriting is worse than failing.
                    // Let's rely on isFollowUp.

                    // Exception: "Make it a bar chart" -> isNewIntent=false, isFollowUp=maybe?
                    // If chart type changed, we should inherit data.
                    if (chartType && chartType !== context.chartType) {
                        metric = context.metric || null;
                        dimension = context.dimension || null;
                    }
                }
            }
            // Inherit aggregation if not explicitly changed
            if (
                aggregation === "sum" && context.aggregation &&
                context.aggregation !== "sum"
            ) {
                // If the user explicitly asked for "total" or "sum", DO NOT inherit previous aggregation (like avg)
                const isExplicitSum = query.includes("total") ||
                    query.includes("sum") || query.includes("combined");

                if (!isExplicitSum && context.aggregation !== "count") {
                    aggregation = context.aggregation;
                }
            }
        }

        // Conflict Resolution: If metric and dimension match the same column (e.g., "Average Time")
        if (
            metric && dimension &&
            metric.toLowerCase() === dimension.toLowerCase()
        ) {
            // Prioritize Dimension if explicit grouping/listing is requested
            if (query.includes(" by ") || query.includes("list") || chartType) {
                metric = null;
            } else {
                // Otherwise prioritize Metric (Scalar) - e.g. "Average Time", "Count Orders"
                dimension = null;
            }
        }

        // Refine Aggregation defaults
        if (aggregation === "sum" && (query.includes("list") || !metric)) {
            if (!query.includes("total") && !query.includes("sum")) {
                aggregation = "count";
            }
        }

        // Special: If "Highest/Max/Most" is requested for Sales/Quantity, user likely means Total Sales (Sum), not Max Transaction record.
        if (
            (aggregation === "max" || aggregation === "min") && metric
        ) {
            const lowerM = metric.toLowerCase();
            if (
                lowerM.includes("sale") || lowerM.includes("revenue") ||
                lowerM.includes("amount") || lowerM.includes("profit") ||
                lowerM.includes("quantity") || lowerM.includes("qty") ||
                lowerM.includes("price") || lowerM.includes("cost") ||
                lowerM.includes("rate") || lowerM.includes("value") ||
                lowerM.includes("hour") || lowerM.includes("time") ||
                lowerM.includes("duration") || lowerM.includes("score")
            ) {
                // Check if query explicitly asks for "record" or "transaction" or "single"
                // UPDATE: Only switch to SUM if we are grouping by something (Dimension is present).
                // If the user asks "What is the max price?", they want the single highest price (Scalar Max), NOT the sum of all prices.
                const isGrouped = !!dimension;

                if (
                    isGrouped && // Only switch to sum if we are aggregating groups
                    !query.includes("record") &&
                    !query.includes("transaction") && !query.includes("single")
                ) {
                    // Default to sum for "Highest Sales [by Region]" -> "Highest Total Sales"
                    aggregation = "sum";
                }
            }
        }

        // Detect Filters (New)
        const filters: Record<string, string> = {};
        // Only look for filters if we have a dimension, or if we need to find one.
        // Simple heuristic: If a word in query matches a value in a categorical column, treat as filter.

        // We limit this scanning to avoid performance hit on large datasets,
        // but here we already have 'data' (first 2000 rows).

        const potentialFilterCols = columns.filter((c) =>
            // Exclude metric/numeric columns from being treated as categorical filters for now unless explicit
            !this.detectMetric(c, [c], data)
        );

        // Scan for value matches
        // Optimization: Use a Set of all values processing? Too expensive.
        // Instead, iterate columns and check if query contains any high-cardinality values?
        // Better: Iterate known categorical columns or dimension candidates.

        for (const col of potentialFilterCols) {
            if (col === dimension) continue; // Don't filter by the dimension we are grouping by, usually.
            // UNLESS query is specific? e.g. "Sales for Cashier A" where Dimension=Cashier.
            // Actually, if we filter by Cashier=A, the dimension 'Cashier' results in 1 row.

            // Check distinct values in this column (sample)
            const uniqueVals = Array.from(
                new Set(
                    data.map((d) => String(d[col]).toLowerCase()).filter((v) =>
                        v.length > 2
                    ),
                ),
            ); // Filter short junk

            // Sort by length desc to match longest phrases first
            uniqueVals.sort((a, b) => b.length - a.length);

            // Filter out common stopwords to avoid false positives in filters
            const stopwords = new Set([
                "the",
                "and",
                "or",
                "in",
                "on",
                "at",
                "to",
                "for",
                "of",
                "a",
                "an",
                "is",
                "are",
                "was",
                "were",
            ]);

            for (const val of uniqueVals) {
                if (stopwords.has(val.toLowerCase())) continue;

                if (this.safeMatch(query, val)) {
                    // Found a filter!
                    filters[col] = val; // Store exact value found (but lowercased)
                    break;
                }
            }
        }

        // Conflict Resolution: If we are filtering by the same column we detected as dimension,
        // we should probably NOT group by that dimension (it will result in 1 row).
        // e.g. "Highest price in Store D". Filter=Store, Dimension=Store. Result: "Store D: 100".
        // Better: Filter=Store, Dimension=Product? Result: "Product X: 50".
        if (dimension && filters[dimension]) {
            console.log(
                `Conflict: Filtering by grouping dimension '${dimension}'. Searching for alternative dimension.`,
            );
            const oldDim = dimension;
            dimension = null; // invalid

            // 1. Specific Fallback: If query implies looking for an Item/Product
            if (
                query.includes("product") || query.includes("item") ||
                query.includes("unit")
            ) {
                dimension = columns.find((c) =>
                    (c.toLowerCase().includes("product") ||
                        c.toLowerCase().includes("item") ||
                        c.toLowerCase().includes("name")) &&
                    c !== oldDim
                ) || null;
            }

            // 2. General Fallback: Find next best dimension
            if (!dimension) {
                dimension = this.detectDimension(
                    query,
                    columns.filter((c) => c !== oldDim),
                    data,
                );
            }

            // 3. Last Resort: First string column that isn't the filter
            if (!dimension) {
                dimension = columns.find((c) =>
                    c !== oldDim &&
                    !this.detectMetric(c, [c], data) && // Not numeric
                    !c.toLowerCase().includes("id")
                ) || null;
            }
        }

        // Special Case: specific "for [Value]" pattern

        // Detect 2nd Dimension for complex charts
        let dimension2: string | null = null;
        if (
            dimension &&
            (chartType === "sankey" || chartType === "heatmap" ||
                chartType === "themeRiver" || chartType === "scatter")
        ) {
            // Find a second non-numeric column that isn't the first dimension
            dimension2 = columns.find((c) =>
                c !== dimension && c !== metric &&
                !c.toLowerCase().includes("id") &&
                (
                    // Check if it's a string column (heuristic) or just not the same
                    !this.detectMetric(c, [c], data)
                )
            ) || null;
        }

        // Override for explicit "List" intent (prevent metric inheritance/defaults)
        if (query.includes("list") && dimension && !query.includes(" by ")) {
            const isCalc = query.includes("sum") || query.includes("total") ||
                query.includes("average") || query.includes("count") ||
                query.includes("min") || query.includes("max");
            // If not asking for a calculation or breakdown, assume pure list
            if (!isCalc) {
                metric = null;
            }
        }

        return {
            metric,
            dimension,
            dimension2,
            chartType,
            aggregation,
            filters,
            limit,
        };
    }

    private detectLimit(query: string): number | null {
        // "top 10", "first 5", "limit 20", "bottom 3"
        const match = query.match(
            /\b(top|first|limit|bottom|last|show)\s+(\d+)\b/i,
        );
        if (match && match[2]) {
            return parseInt(match[2], 10);
        }
        return null;
    }

    // ... (detectAggregationType)

    private detectDimension(
        query: string,
        columns: string[],
        data: DataRow[],
    ): string | null {
        // Helper to check if column is numeric
        const isNumeric = (col: string) => {
            // Check up to 5 non-null values
            const values = data.filter((d) =>
                d[col] !== null && d[col] !== undefined && d[col] !== ""
            ).slice(0, 5).map((d) => d[col]);
            if (values.length === 0) return false;
            return values.every((val) => {
                if (typeof val === "number") return true;
                if (typeof val === "string") {
                    const cleaned = val.replace(/[^0-9.-]+/g, "");
                    if (!/\d/.test(cleaned)) return false;
                    const garbage = val.replace(/[0-9.,\s$€£¥%-]/g, "");
                    if (garbage.length > 2) return false;
                    return !isNaN(parseFloat(cleaned));
                }
                return false;
            });
        };

        const isAggregation = query.includes("average") ||
            query.includes("avg") || query.includes("mean") ||
            query.includes("sum") || query.includes("total") ||
            query.includes("max") || query.includes("min") ||
            query.includes("highest") || query.includes("lowest") ||
            query.includes("most") || query.includes("least");

        // 0. Explicit 'Question' pattern: "Which [Column]", "What [Column]", "List [Column]", "Show [Column]"
        const questionPatterns = [
            /which\s+([a-z0-9\s]+?)\s+(has|have|is|are|was|were)/i,
            /what\s+([a-z0-9\s]+?)\s+(has|have|is|are|was|were)/i,
            /list\s+([a-z0-9\s]+?)\s+(by|with|that)/i,
            /show\s+([a-z0-9\s]+?)\s+(by|with|that)/i,
            /breakdown\s+by\s+([a-z0-9\s]+)/i,
            /group\s+by\s+([a-z0-9\s]+)/i,
            /per\s+([a-z0-9\s]+)/i,
            /by\s+([a-z0-9\s]+)/i,
        ];

        for (const pattern of questionPatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                const candidate = match[1].trim().toLowerCase();
                // Check if candidate matches a column
                for (const col of columns) {
                    if (
                        candidate.includes(col.toLowerCase()) ||
                        col.toLowerCase().includes(candidate)
                    ) {
                        // Filter false positives where the candidate is just a small word like "the"
                        if (candidate.length < 3) continue;
                        return col;
                    }
                }
            }
        }

        // 1. Dynamic Match from Columns (Prioritize Categorical)
        // Sort columns so string columns come first appropriately?
        // Just iterate and check isNumeric.

        for (const col of columns) {
            // Filter out common false positives if very short
            if (col.length <= 2 && col.toLowerCase() !== "id") continue;

            // If aggregation is requested, Numeric columns are likely Metrics, not Dimensions.
            // UNLESS explicit "by [Numeric]" which is caught by regex above.
            if (isAggregation && isNumeric(col)) continue;

            if (this.safeMatch(query, col)) {
                return col;
            }
        }

        // 2. Token match (e.g. col "Customer Name", query "customer")
        for (const col of columns) {
            // Again, skip numeric if aggregation
            if (isAggregation && isNumeric(col)) continue;

            const tokens = col.toLowerCase().split(/[ _-]+/);
            for (const token of tokens) {
                if (token.length < 3) continue;
                if (this.safeMatch(query, token)) {
                    return col;
                }
            }
        }

        return null;
    }

    private detectAggregationType(
        query: string,
    ): "sum" | "avg" | "count" | "min" | "max" | "median" | "mode" {
        // Prioritize explicit Sum/Total
        if (
            query.includes("sum ") || query.includes("total ") ||
            query.includes("combined")
        ) return "sum";

        if (
            query.includes("average") || query.includes("avg") ||
            query.includes("mean")
        ) return "avg";
        if (query.includes("median")) return "median";
        if (query.includes("mode")) return "mode";
        if (
            query.includes("count") || query.includes("how many") ||
            query.includes("number of")
        ) return "count";
        if (
            query.includes("min") || query.includes("lowest") ||
            query.includes("bottom") || query.includes("worst") ||
            query.includes("least") || query.includes("minimum")
        ) return "min";
        if (
            query.includes("max") || query.includes("highest") ||
            query.includes("top") || query.includes("peak") ||
            query.includes("best") || query.includes("most") ||
            query.includes("maximum")
        ) return "max";
        return "sum";
    }

    private detectMetric(
        query: string,
        columns: string[],
        data: DataRow[],
        excludeColumn: string | null = null, // New: avoid picking the same column as dimension
    ): string | null {
        // Helper to check if column is numeric
        const isNumeric = (col: string) => {
            // Check up to 5 non-null values to ensure consistency
            const values = data
                .filter((d) =>
                    d[col] !== null && d[col] !== undefined && d[col] !== ""
                )
                .slice(0, 5)
                .map((d) => d[col]);

            if (values.length === 0) return false;

            return values.every((val) => {
                if (typeof val === "number") return true;
                if (typeof val === "string") {
                    const cleaned = val.replace(/[^0-9.-]+/g, "");
                    if (!/\d/.test(cleaned)) return false;
                    const garbage = val.replace(/[0-9.,\s$€£¥%-]/g, "");
                    if (garbage.length > 2) return false;
                    return !isNaN(parseFloat(cleaned));
                }
                return false;
            });
        };

        // 0. Manual Schema Overrides (User Defined Rules)
        const manualMappings: Record<string, string> = {
            "worked hours": "worked_hours",
            "hours worked": "worked_hours",
            "overtime": "overtime_hours",
            "productivity": "productivity_score",
            "scheduled": "scheduled_hours",
            "scheduled hours": "scheduled_hours",
            "schedule": "scheduled_hours",
        };

        for (const [keyword, targetCol] of Object.entries(manualMappings)) {
            if (this.safeMatch(query, keyword)) {
                // Verify the target column actually exists in the dataset
                const exactMatch = columns.find((c) =>
                    c === targetCol ||
                    c.toLowerCase() === targetCol.toLowerCase()
                );
                if (exactMatch) {
                    console.log(
                        `Schema Override: Mapping '${keyword}' to column '${exactMatch}'`,
                    );
                    return exactMatch;
                }
            }
        }

        // 1. Explicit 'by [Column]' check? No, that's for dimension.
        // Metric is usually the subject of aggregation.

        // 1. Dynamic Match: Check if any numeric column is mentioned in the query
        for (const col of columns) {
            if (col === excludeColumn) continue;

            if (this.safeMatch(query, col)) {
                // Skip non-numeric columns if MATH arithmetic is requested (Sum/Avg)
                // BUT allow them for Min/Max/Mode/Count
                const isMathOp = query.includes("average") ||
                    query.includes("sum") || query.includes("total") ||
                    query.includes("mean");

                if (isMathOp && !isNumeric(col)) {
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
                if (this.safeMatch(query, token)) {
                    const isMathOp = query.includes("average") ||
                        query.includes("sum") ||
                        query.includes("total") || query.includes("mean");
                    if (isMathOp && !isNumeric(col)) {
                        continue;
                    }
                    return col;
                }
            }
        }

        // 2. Hardcoded Common Metrics (Fallback)
        const commonMetrics = [
            "sales",
            "revenue",
            "amount",
            "profit",
            "margin",
            "cost",
            "expense",
            "quantity",
            "units",
            "volume",
            "price",
            "rate",
            "rating",
            "score",
            "value",
            "transaction",
            "order",
        ];

        for (const m of commonMetrics) {
            if (this.safeMatch(query, m)) {
                // Verify hardcoded metric exists in columns
                const closest = columns.find((c) =>
                    c.toLowerCase().includes(m)
                );
                if (closest && isNumeric(closest)) return closest;
                if (closest) return closest; // Return even if not numeric? Maybe safe.
            }
        }

        // 3. Synonym Mapping (Specific Business Logic)
        if (query.includes("sold")) {
            // Look for 'Sales', 'Quantity', 'Amount'
            const soldMatch = columns.find((c) => {
                const lower = c.toLowerCase();
                return (lower.includes("sale") || lower.includes("qty") ||
                    lower.includes("quantity") || lower.includes("amount")) &&
                    isNumeric(c);
            });
            if (soldMatch) return soldMatch;
        }

        return null;
    }

    private detectChartType(query: string): ChartType | null {
        // Special charts first
        if (
            query.includes("funnel") || query.includes("pipeline") ||
            query.includes("conversion")
        ) return "funnel";
        if (
            query.includes("gauge") || query.includes("dashboard") ||
            query.includes("meter")
        ) return "gauge";
        if (query.includes("radar") || query.includes("spider")) return "radar";
        if (
            query.includes("scatter") || query.includes("bubble") ||
            query.includes("correlation")
        ) return "scatter";
        if (query.includes("heatmap") || query.includes("matrix")) {
            return "heatmap";
        }
        if (query.includes("treemap")) return "treemap";
        if (query.includes("sunburst")) return "sunburst";
        if (query.includes("sankey") || query.includes("flow")) return "sankey";
        if (query.includes("waterfall")) return "waterfall";
        if (query.includes("river") || query.includes("stream")) {
            return "themeRiver";
        }
        if (query.includes("polar")) return "polar-bar";
        if (query.includes("pictorial")) return "pictorialBar";

        // Standard charts
        if (query.includes("area") || query.includes("fill")) return "area";
        if (
            query.includes("line") || query.includes("trend") ||
            query.includes("over time") || query.includes("growth")
        ) return "line";
        if (
            query.includes("pie") || query.includes("distribution") ||
            query.includes("share") || query.includes("breakdown") ||
            query.includes("proportion")
        ) return "pie";
        if (
            query.includes("bar") || query.includes("compare") ||
            query.includes("rank") || query.includes("vs")
        ) return "bar";

        return null;
    }

    private async fetchData(
        dataSourceId: string,
    ): Promise<{ data: DataRow[]; fileId: string | null }> {
        // 0. (Mock Data removed)

        try {
            console.log("Fetching data source details for:", dataSourceId);
            const { data: dataSource, error: dsError } = await supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from("data_sources" as any)
                .select("*")
                .eq("id", dataSourceId)
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
                fileName.endsWith(".csv") ? fileName : `${fileName}.csv`,
                fileName.replace(/ /g, "_"),
                `${fileName.replace(/ /g, "_")}.csv`,
                fileName.replace(/ /g, "-"),
                `${fileName.replace(/ /g, "-")}.csv`,
            ];

            let fileId: string | null = (dataSource as any).file_id ||
                (dataSource as any).uploaded_file_id || null;

            if (fileId) {
                console.log("Using direct file_id from dataSource:", fileId);
            } else {
                // Strategies and Fallback Logic only if no direct ID
                // ... (we wrap the search logic or just let it fall through if fileId is null)
                // Actually, simplest is to just set it. The following search logic can check if(!fileId)
            }

            // Strategies to find the file (only used if fileId not found yet)
            if (!fileId) {
                for (const strategyName of strategies) {
                    console.log("Trying strategy:", strategyName);
                    const { data: files } = await supabase
                        .from("uploaded_files")
                        .select("id")
                        .eq("file_name", strategyName)
                        .order("created_at", { ascending: false })
                        .limit(1);

                    if (files && files.length > 0) {
                        fileId = files[0].id;
                        console.log("Found file with strategy:", strategyName);
                        break;
                    }
                }
            }

            // 2. Fallback: Case insensitive match on original name
            if (!fileId) {
                console.log("Retrying with ILIKE:", fileName);
                const { data: fuzzyFiles } = await supabase
                    .from("uploaded_files")
                    .select("id")
                    .ilike("file_name", fileName)
                    .order("created_at", { ascending: false })
                    .limit(1);
                if (fuzzyFiles && fuzzyFiles.length > 0) {
                    fileId = fuzzyFiles[0].id;
                }
            }

            if (!fileId) {
                console.error(
                    "Could not find any matching uploaded file for source:",
                    fileName,
                );
                return { data: [], fileId: null };
            }

            console.log("Found File ID:", fileId);

            // Fetch all records with pagination (Supabase default limit is 1000)
            let allRecords: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;
            let recordsError: any = null;

            while (hasMore) {
                const { data: records, error } = await supabase
                    .from("data_records")
                    .select("row_data")
                    .eq("file_id", fileId)
                    .range(from, from + pageSize - 1);

                if (error) {
                    recordsError = error;
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

            // Fetch all records to ensure full dataset analysis
            // If dataset is massive, we might need server-side aggregation later,
            // but for 10k-50k rows, fetching all is necessary for correctness.

            if (recordsError || allRecords.length === 0) {
                console.error("Error fetching records:", recordsError);
                return { data: [], fileId: null };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { data: allRecords.map((r: any) => r.row_data), fileId };
        } catch (e) {
            console.error("Error fetching data for analysis", e);
            return { data: [], fileId: null };
        }
    }

    private calculateScalar(
        data: DataRow[],
        metric: string | null,
        type: AggregationType,
    ): number | string {
        let values: (string | number)[] = [];
        if (type === "count" && !metric) {
            return data.length;
        }

        if (metric) {
            values = data.map((item) => item[metric]).filter((v) =>
                v !== null && v !== undefined && v !== ""
            );
        }

        if (values.length === 0 && type !== "count") return 0;

        // Check for Date Column
        const isDateCol = values.some((v) => {
            if (typeof v !== "string") return false;
            // Basic ISO or Date-like check
            return !isNaN(Date.parse(v)) && v.length > 5 &&
                (v.includes("-") || v.includes("/") || v.includes(":"));
        }) && values.length > 0;

        if (isDateCol) {
            values.sort((a, b) => {
                const da = new Date(String(a)).getTime();
                const db = new Date(String(b)).getTime();
                return da - db;
            });
            if (type === "min") return values[0];
            if (type === "max") return values[values.length - 1];
            // Sum/Avg on dates is meaningless, maybe Count/Mode works
        }

        const toNum = (v: unknown) => {
            if (typeof v === "number") return v;
            if (typeof v === "string") {
                const clean = v.replace(/[^0-9.-]+/g, "");
                if (!clean) return NaN;
                return parseFloat(clean);
            }
            return NaN;
        };

        const numValues = values.map(toNum).filter((v) => !isNaN(v));
        const isNumericCol = numValues.length > 0 &&
            numValues.length >= values.length * 0.5;

        if (isNumericCol) {
            numValues.sort((a, b) => a - b);
        } else {
            values.sort();
        }

        if (
            (type === "sum" || type === "avg" || type === "median") &&
            numValues.length === 0
        ) return 0;

        switch (type) {
            case "min":
                if (isNumericCol) return numValues[0];
                return values[0];
            case "max":
                if (isNumericCol) return numValues[numValues.length - 1];
                return values[values.length - 1];
            case "sum":
                return numValues.reduce((a, b) => a + b, 0);
            case "avg":
                return numValues.reduce((a, b) => a + b, 0) / numValues.length;
            case "count":
                return values.length;
            case "median": {
                const mid = Math.floor(numValues.length / 2);
                return numValues.length % 2 !== 0
                    ? numValues[mid]
                    : (numValues[mid - 1] + numValues[mid]) / 2;
            }
            case "mode": {
                const counts: Record<string, number> = {};
                let maxFreq = 0;
                let mode: string | number = values[0] || 0;
                for (const v of values) {
                    const s = String(v);
                    counts[s] = (counts[s] || 0) + 1;
                    if (counts[s] > maxFreq) {
                        maxFreq = counts[s];
                        mode = v;
                    }
                }
                return mode;
            }
            default:
                return 0;
        }
    }

    private aggregateData(
        data: DataRow[],
        dimension: string,
        dimension2: string | null,
        metric: string | null,
        type: AggregationType,
    ): DataRow[] {
        const groups: Record<string, (number | string)[]> = {};
        // Store composite keys to reconstruct later
        const keysMap: Record<string, { d1: string; d2?: string }> = {};

        console.log(
            `__Aggregating: Dim1=${dimension}, Dim2=${dimension2}, Metric=${metric}, Type=${type}`,
        );

        data.forEach((item) => {
            const val1 = String(item[dimension] || "Unknown");
            const val2 = dimension2
                ? String(item[dimension2] || "Unknown")
                : undefined;

            // Composite key
            const key = dimension2 ? `${val1}:::${val2}` : val1;

            if (!keysMap[key]) {
                keysMap[key] = { d1: val1, d2: val2 };
            }

            let val: number | string | null = null;
            if (metric) {
                const rawVal = item[metric];
                if (typeof rawVal === "number") {
                    val = rawVal;
                } else if (typeof rawVal === "string") {
                    // Check if it's a date-like string (e.g. 2023-01-01) which parseFloat turns into 2023 (wrong for Dates)
                    const isDateLike = rawVal.length > 8 &&
                        (rawVal.includes("-") || rawVal.includes("/")) &&
                        !isNaN(Date.parse(rawVal));

                    const isMathOp = type === "sum" || type === "avg" ||
                        type === "median";

                    // If it's a Date and we are doing Min/Max/Mode, keep it as string
                    if (isDateLike && !isMathOp) {
                        val = rawVal;
                    } else {
                        // Try to parse as number
                        const clean = rawVal.replace(/[^0-9.-]+/g, "");
                        const parsed = parseFloat(clean);

                        if (clean && !isNaN(parsed)) {
                            val = parsed;
                        } else if (!isMathOp) {
                            // Keep string for non-arithmetic ops
                            val = rawVal;
                        }
                    }
                } else if (rawVal !== null && rawVal !== undefined) {
                    val = String(rawVal);
                }
            } else {
                val = 1; // Count *
            }

            if (!groups[key]) groups[key] = [];

            if (val !== null) {
                groups[key].push(val);
            }
        });

        const result = Object.entries(groups).map(([key, values]) => {
            let res: string | number = 0;

            // Filter strictly numbers for math ops
            const numValues = values.filter((v) =>
                typeof v === "number"
            ) as number[];

            // Sort values (smart sort for mixed types)
            values.sort((a, b) => {
                if (typeof a === "number" && typeof b === "number") {
                    return a - b;
                }
                return String(a).localeCompare(String(b));
            });

            switch (type) {
                case "sum":
                    res = numValues.reduce((a, b) => a + b, 0);
                    break;
                case "avg":
                    res = numValues.reduce((a, b) => a + b, 0) /
                        (numValues.length || 1);
                    break;
                case "min":
                    res = values[0] || 0;
                    break;
                case "max":
                    res = values[values.length - 1] || 0;
                    break;
                case "count":
                    res = values.length;
                    break;
                case "median":
                    if (numValues.length === 0) res = 0;
                    else {
                        numValues.sort((a, b) => a - b);
                        const mid = Math.floor(numValues.length / 2);
                        res = numValues.length % 2 !== 0
                            ? numValues[mid]
                            : (numValues[mid - 1] + numValues[mid]) / 2;
                    }
                    break;
                case "mode": {
                    const counts: Record<string, number> = {};
                    let maxFreq = 0;
                    let mode: string | number = values[0] || 0;
                    for (const v of values) {
                        const s = String(v);
                        counts[s] = (counts[s] || 0) + 1;
                        if (counts[s] > maxFreq) {
                            maxFreq = counts[s];
                            mode = v;
                        }
                    }
                    res = mode;
                    break;
                }
            }

            const out: DataRow = {};
            out[dimension] = keysMap[key].d1;
            // If d2 exists, add it to the row
            if (dimension2 && keysMap[key].d2 !== undefined) {
                out[dimension2] = keysMap[key].d2;
            }
            out[metric || "count"] = res;
            return out;
        });

        console.log("Aggregation Result (Top 3):", result.slice(0, 3));
        return result;
    }

    private generateInsight(
        query: string,
        entities: AnalyticalEntities,
        data: DataRow[],
    ): AnalyticalResponse | null {
        const keys = Object.keys(data[0] || {});
        console.log("Data Keys:", keys);

        // 1. Resolve Fields
        let metricField: string | undefined;
        if (entities.metric) {
            metricField = keys.find((k) =>
                k.toLowerCase() === entities.metric?.toLowerCase()
            );
            if (!metricField && entities.metric) {
                metricField = keys.find((k) =>
                    k.toLowerCase().includes(entities.metric.toLowerCase())
                );
            }
        }

        let dimensionField: string | null = null;
        if (entities.dimension) {
            dimensionField = keys.find((k) =>
                k.toLowerCase() === entities.dimension?.toLowerCase()
            );
            if (!dimensionField && entities.dimension) {
                dimensionField = keys.find((k) =>
                    k.toLowerCase().includes(entities.dimension.toLowerCase())
                );
            }
        }

        // SCALAR FORCE: If we are filtering by the same column as the dimension,
        // it means we want the result FOR that specific value, not a list.
        if (dimensionField && entities.filters[dimensionField]) {
            console.log(
                "Blocking dimension because of equality filter -> Scalar Mode",
            );
            dimensionField = null;
        }

        // HELP / DISCOVERY INTENT
        if (
            query.includes("what type of questions") ||
            query.includes("what questions") ||
            query.toLowerCase() === "help" ||
            query.includes("what charts") ||
            query.includes("available charts") ||
            query.includes("list of charts")
        ) {
            // Check if user is asking about charts specifically
            if (
                query.includes("chart") || query.includes("graph") ||
                query.includes("visual")
            ) {
                const chartTypes = [
                    "Bar",
                    "Line",
                    "Pie",
                    "Scatter",
                    "Area",
                    "Funnel",
                    "Gauge",
                    "Radar",
                    "Treemap",
                    "Heatmap",
                    "Sunburst",
                    "Sankey",
                    "Waterfall",
                    "Polar Bar",
                    "Theme River",
                    "Pictorial Bar",
                ];
                return {
                    answer:
                        `I can generate the following types of charts:\n\n` +
                        chartTypes.map((c) => `• ${c}`).join("\n") +
                        `\n\nJust ask me to "show" or "visualize" data using one of these types!`,
                    chart: undefined,
                };
            }

            const numericCols = keys.filter((k) => {
                const val = data[0][k];
                return typeof val === "number" ||
                    (typeof val === "string" && !isNaN(parseFloat(val)));
            });
            const categoricalCols = keys.filter((k) => {
                const val = data[0][k];
                return typeof val === "string" && isNaN(parseFloat(val));
            });

            const examples = [];
            if (numericCols.length > 0) {
                examples.push(`What is the total **${numericCols[0]}**?`);
                examples.push(
                    `Which location has the highest **${numericCols[0]}**?`,
                );
            }
            if (categoricalCols.length > 0) {
                examples.push(`Show breakdown by **${categoricalCols[0]}**`);
            }
            if (numericCols.length > 0 && categoricalCols.length > 0) {
                examples.push(
                    `Show **${numericCols[0]}** by **${categoricalCols[0]}**`,
                );
            }

            return {
                answer: "You can ask questions like:\n\n" +
                    examples.map((e) => `• ${e}`).join("\n"),
                chart: undefined,
            };
        }

        console.log(
            `Resolved Fields: Metric=${metricField}, Dimension=${dimensionField}`,
        );

        // LIST OPERATION (Dimension but 'List' intent, no Chart intent)
        if (
            dimensionField && query.includes("list") &&
            !query.includes("chart") && !query.includes("graph") &&
            !query.includes("plot") && !entities.chartType &&
            (!metricField || metricField === dimensionField)
        ) {
            console.log("Performing List Operation (Text Only)");
            // Extract distinct values
            const distinctValues = Array.from(
                new Set(
                    data.map((d) => d[dimensionField!]).filter((v) =>
                        v !== null && v !== undefined && v !== ""
                    ),
                ),
            );
            // Limit to user request or default to 50 for list to be more accurate/complete
            const limit = entities.limit || 50;
            const limitedValues = distinctValues.slice(0, limit);
            const formattedDim = capitalize(dimensionField);

            let listStr = limitedValues.join(", ");
            if (distinctValues.length > limit) {
                listStr += `, and ${distinctValues.length - limit} more...`;
            }

            return {
                answer:
                    `**${formattedDim}** (${distinctValues.length}):\n${listStr}`,
                chart: undefined,
                chartTitle: undefined,
            };
        }

        // SCALAR AGGREGATION (No Dimension)
        // SCALAR AGGREGATION (No Dimension)
        if (!dimensionField) {
            // Check if we have enough to do a scalar (need metric or count)
            if (!metricField && entities.aggregation !== "count") {
                console.warn("No metric and no dimension. Cannot analyze.");
                return null;
            }

            console.log("Performing Scalar Aggregation (Text Only)");

            // Special: Count * (Total Records)
            if (entities.aggregation === "count" && !metricField) {
                return {
                    answer:
                        `The total count of **records** is **${data.length}**.`,
                    chart: undefined,
                };
            }

            // Check for "All Statistics" or multiple aggregations
            const isAllStats = query.includes("all") ||
                query.includes("summary") || query.includes("stats") ||
                (query.includes("min") && query.includes("max") &&
                    query.includes("avg"));

            if (isAllStats) {
                const countVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "count",
                );
                const sumVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "sum",
                );
                const minVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "min",
                );
                const maxVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "max",
                );
                const avgVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "avg",
                );

                const formattedMetric = metricField
                    ? capitalize(metricField)
                    : "Records";
                const fmt = (v: number | string) =>
                    typeof v === "number"
                        ? v.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })
                        : v;

                const answer = `**Statistics for ${formattedMetric}:**\n` +
                    `• **Count**: ${fmt(countVal)}\n` +
                    `• **Sum**: ${fmt(sumVal)}\n` +
                    `• **Average**: ${fmt(avgVal)}\n` +
                    `• **Min**: ${fmt(minVal)}\n` +
                    `• **Max**: ${fmt(maxVal)}`;

                return {
                    answer,
                    chart: undefined,
                    chartTitle: undefined,
                };
            }

            // Check for Dual Aggregation (Min AND Max)
            const isMin = query.includes("min") || query.includes("lowest") ||
                query.includes("bottom") || query.includes("least");
            const isMax = query.includes("max") || query.includes("highest") ||
                query.includes("top") || query.includes("peak") ||
                query.includes("most");

            if (isMin && isMax) {
                const minVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "min",
                );
                const maxVal = this.calculateScalar(
                    data,
                    metricField || null,
                    "max",
                );

                const formattedMetric = metricField
                    ? capitalize(metricField)
                    : "Records";

                const fmt = (v: number | string) =>
                    typeof v === "number"
                        ? v.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })
                        : v;

                return {
                    answer: `The **Minimum ${formattedMetric}** is **${
                        fmt(minVal)
                    }** and the **Maximum ${formattedMetric}** is **${
                        fmt(maxVal)
                    }**.`,
                    chart: undefined,
                    chartTitle: undefined,
                };
            }

            const value = this.calculateScalar(
                data,
                metricField || null,
                entities.aggregation,
            );

            let displayAgg = capitalize(entities.aggregation);
            if (entities.aggregation === "avg") displayAgg = "Average";
            if (entities.aggregation === "max") {
                displayAgg = query.includes("maximum") ? "Maximum" : "Top";
            }
            if (entities.aggregation === "min") {
                displayAgg = query.includes("minimum") ? "Minimum" : "Lowest";
            }

            if (query.includes("performer")) {
                displayAgg += " performer";
            }

            const formattedMetric = metricField
                ? capitalize(metricField)
                : "Records";
            const valStr = typeof value === "number"
                ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : String(value);

            let textAnswer = `The ${displayAgg} ${formattedMetric}`;

            const yearMatch = query.match(/\b(20\d{2})\b/);
            if (yearMatch) {
                textAnswer += ` in ${yearMatch[1]}`;
            }

            textAnswer += ` is **${valStr}**.`;

            if (entities.aggregation === "count") {
                textAnswer =
                    `The total count of **${formattedMetric}** is **${valStr}**.`;
            }

            return {
                answer: textAnswer,
                chart: undefined,
                chartTitle: undefined,
            };
        }

        // Fallbacks
        if (!metricField && entities.aggregation !== "count") {
            // Find first numeric field for math ops
            metricField = keys.find((k) => {
                const val = data[0][k];
                if (typeof val === "number") {
                    return !k.toLowerCase().includes("id");
                }
                if (
                    typeof val === "string" &&
                    !isNaN(parseFloat(val.replace(/[^0-9.-]+/g, "")))
                ) return !k.toLowerCase().includes("id");
                return false;
            });
            console.log("Fallback Metric Field:", metricField);

            // If still no numeric metric found, switch to COUNT if chart is requested
            // OR if we are looking for "highest/lowest" (frequency)
            if (
                !metricField &&
                (entities.chartType || entities.aggregation === "max" ||
                    entities.aggregation === "min")
            ) {
                console.log(
                    "No numeric metric found. Switching to COUNT aggregation.",
                );
                entities.aggregation = "count";
            }
        }

        // Auto-select dimension for Sales related queries if missing
        const isSalesQuery = metricField &&
            ["sales", "revenue", "profit", "amount"].some((k) =>
                metricField!.toLowerCase().includes(k)
            );

        if (!dimensionField && (isSalesQuery || entities.chartType)) {
            console.log(
                "Sales query or Chart intent detected without dimension. Attempting to auto-select dimension.",
            );
            // 1. Try Date/Time
            dimensionField = keys.find((k) =>
                k.toLowerCase().includes("date") ||
                k.toLowerCase().includes("year") ||
                k.toLowerCase().includes("month") ||
                k.toLowerCase().includes("time")
            );

            // 2. Try Category/Region/Product
            if (!dimensionField) {
                dimensionField = keys.find((k) =>
                    [
                        "category",
                        "sub-category",
                        "region",
                        "segment",
                        "country",
                        "state",
                        "product",
                        "item",
                    ].some((t) => k.toLowerCase().includes(t))
                );
            }

            // 3. Fallback: First reasonable string column (exclude IDs, URLs)
            if (!dimensionField) {
                dimensionField = keys.find((k) => {
                    const val = data[0][k];
                    const key = k.toLowerCase();
                    return typeof val === "string" && !key.includes("id") &&
                        !key.includes("url") && !key.includes("image") &&
                        val.length < 50;
                });
            }

            if (dimensionField) {
                console.log("Auto-selected Dimension:", dimensionField);
            }
        }

        if (
            !dimensionField &&
            (entities.chartType === "line" || query.includes("trend"))
        ) {
            dimensionField = keys.find((k) =>
                k.toLowerCase().includes("date") ||
                k.toLowerCase().includes("time") ||
                k.toLowerCase().includes("year")
            );
            console.log("Fallback Dimension Field (Time):", dimensionField);
        }

        if (!dimensionField) {
            console.warn("Could not resolve dimension field");
            return null; // Cannot visualize without dimension
        }
        if (!metricField && entities.aggregation !== "count") {
            return null;
        }

        // 2. Determine Chart Type (Early Detection for Sorting)
        let chartType = entities.chartType;

        // Check if it's a specific text question (avoid forcing chart)
        const isQuestion = /^(which|what|who|how|list|tell|give)\b/i.test(
            query.trim(),
        );

        // Force chart for Sales/Revenue if dimension exists and no chart type specified
        // Only if it is NOT a direct specific question (e.g. "Which brand...").
        // If it is a "Show me" or general topic query, default to chart.
        if (!chartType && isSalesQuery && dimensionField && !isQuestion) {
            const dimLower = dimensionField.toLowerCase();
            if (
                dimLower.includes("date") || dimLower.includes("year") ||
                dimLower.includes("month") || dimLower.includes("time")
            ) {
                chartType = "line";
            } else if (
                query.includes("share") || query.includes("distribution")
            ) {
                chartType = "pie";
            } else {
                chartType = "bar";
            }
        }

        if (!chartType && !isQuestion) {
            const dimLower = dimensionField.toLowerCase();
            if (
                dimLower.includes("date") || dimLower.includes("year") ||
                dimLower.includes("month") || dimLower.includes("time")
            ) {
                chartType = "line";
            } else if (
                query.includes("share") || query.includes("distribution")
            ) {
                chartType = "pie";
            } else {
                chartType = "bar";
            }
        }

        // 3. Aggregate Data
        const aggregatedData = this.aggregateData(
            data,
            dimensionField,
            entities.dimension2 || null, // Pass dimension 2
            metricField || null,
            entities.aggregation,
        );

        const formattedDim = capitalize(dimensionField);

        if (aggregatedData.length === 0) {
            return {
                answer:
                    `I categorized the data but found no valid results for **${formattedDim}**. Please check your data or try a different breakdown.`,
                chart: undefined,
            };
        }

        // 4. Sort Data Smartly
        const valueField = metricField || "count";
        const isTimeChart = chartType === "line" ||
            dimensionField.toLowerCase().includes("date") ||
            dimensionField.toLowerCase().includes("year");

        // Filter out invalid rows (null metric values)
        const cleanData = aggregatedData.filter((d) => {
            const v = d[valueField];
            if (v === null || v === undefined) return false;
            if (typeof v === "number") return !isNaN(v);
            return String(v).trim() !== "";
        });

        if (isTimeChart) {
            // Sort by Time (Ascending)
            cleanData.sort((a, b) => {
                const valA = a[dimensionField!];
                const valB = b[dimensionField!];
                const dateA = new Date(valA).getTime();
                const dateB = new Date(valB).getTime();
                if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
                return String(valA).localeCompare(String(valB));
            });
        } else {
            // Sort by Value (Descending)
            cleanData.sort((a, b) => {
                const va = a[valueField];
                const vb = b[valueField];
                if (typeof va === "number" && typeof vb === "number") {
                    return vb - va;
                }
                // Sort strings descending
                return String(vb).localeCompare(String(va));
            });
        }

        // 5. Generate Insight Text
        let aggLabel = capitalize(entities.aggregation);
        if (entities.aggregation === "avg") aggLabel = "Average";
        if (entities.aggregation === "sum") aggLabel = "Total";

        const formattedMetric = capitalize(valueField);

        let desc = `${aggLabel} ${formattedMetric}`;
        if (entities.aggregation === "count") {
            desc = valueField === "count"
                ? "Count"
                : `Count of ${formattedMetric}`;
        }

        let answer = `Here is the **${desc} by ${formattedDim}**.`;

        // Dynamic Insight Generation with Values
        if (isTimeChart) {
            answer += `\n\nThe chart shows the **trend over time**.`;

            // Find peak
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // Find peak
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sortedByValue = [...cleanData].sort((a, b) =>
                (b[valueField] as any) - (a[valueField] as any)
            );
            const localPeak = sortedByValue[0];
            const val = typeof localPeak[valueField] === "number"
                ? localPeak[valueField].toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                })
                : localPeak[valueField];

            answer += ` The highest activity was in **${
                localPeak[dimensionField]
            }** with **${val}**.`;

            // Average
            const total = cleanData.reduce(
                (acc, curr) => acc + (Number(curr[valueField]) || 0),
                0,
            );
            const avg = total / (cleanData.length || 1);
            answer += ` The average over this period is **${
                avg.toLocaleString(undefined, { maximumFractionDigits: 1 })
            }**.`;
        } else {
            // Categorical: Show Top 3 or Single Winner

            // formatting helper
            const formatVal = (v: any) =>
                typeof v === "number"
                    ? v.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : v;

            // Detect "Winner/Loser" intent (Single Answer)
            const isWinnerQuestion =
                /^(which|what|who)\b/i.test(query.trim()) &&
                (query.includes("highest") || query.includes("most") ||
                    query.includes("max") || query.includes("more") ||
                    query.includes("largest") ||
                    query.includes("lowest") || query.includes("least") ||
                    query.includes("smallest") ||
                    query.includes("min"));

            if (isWinnerQuestion && cleanData.length > 0) {
                const winner = cleanData[0];
                const val = formatVal(winner[valueField]);

                // If "lowest/least", we actually need the last one if sorted descending?
                // Current sort is Descending by default for categorical
                let target = winner;
                let descriptor = "highest";

                if (
                    query.includes("lowest") || query.includes("least") ||
                    query.includes("smallest") ||
                    query.includes("min")
                ) {
                    target = cleanData[cleanData.length - 1];
                    descriptor = "lowest";
                }

                answer = `The **${
                    target[dimensionField]
                }** has the ${descriptor} ${formattedMetric.toLowerCase()} with **${
                    formatVal(target[valueField])
                }**.`;

                // Quick fix for when the answer "Top Store_id is S9" makes no sense contextually:
                // If the dimension is an ID and the metric is distinct, we might be just listing the top record.
                // But if the query was "maximum unit price in Store D", and we grouped by "Store_ID", we get 1 result "Store D".
                // If we grouped by "Product" we would get "Product X".
            } else {
                // Standard List answer
                answer += `\n\n**Top Results:**\n`;

                // Use user-defined limit or default to 10 for text answer
                const topN = entities.limit || 10;
                const topItems = cleanData.slice(0, topN);
                topItems.forEach((item, index) => {
                    const val = formatVal(item[valueField]);
                    answer += `${index + 1}. **${
                        item[dimensionField]
                    }**: ${val}\n`;
                });

                if (cleanData.length > topN) {
                    const remaining = cleanData.length - topN;
                    answer += `...and ${remaining} more.`;
                }
            }

            // Show lowest if specifically asked or relevant (and not already covered)
            if (
                !isWinnerQuestion &&
                (query.includes("lowest") || query.includes("min")) &&
                cleanData.length > 0
            ) {
                const lowest = cleanData[cleanData.length - 1];
                const val = formatVal(lowest[valueField]);
                answer += `\n\nThe lowest is **${
                    lowest[dimensionField]
                }** (${val}).`;
            }
        }
        // 6. Create ECharts Option (Only if chart type determined)
        // 6. Create ECharts Option (Only if chart type determined)
        let chartTitle = `${desc} by ${formattedDim}`;

        let option: EChartsOption | undefined;

        if (chartType && cleanData.length > 0) {
            let chartData = cleanData;
            let actualLimit = 0;

            if (!isTimeChart) {
                const chartLimit = entities.limit || 10;
                chartData = cleanData.slice(0, chartLimit);
                actualLimit = chartLimit;
            }

            if (actualLimit > 0 && cleanData.length > actualLimit) {
                chartTitle += ` (Top ${actualLimit})`;
            }

            const rec: VisualizationRecommendation = {
                title: chartTitle,
                type: chartType as string,
                x_axis: dimensionField,
                y_axis: valueField,
                priority: "high",
            };

            option = createEChartsOption(
                rec,
                chartData,
                "desc",
                false,
                entities.dimension2 || undefined, // Pass breakdown/secondary dimension
            );
        }

        return {
            answer,
            chart: option,
            chartTitle: chartType ? chartTitle : undefined,
            chartType: chartType || undefined,
            context: {
                metric: metricField || null,
                dimension: dimensionField || null,
                chartType: chartType || null,
                aggregation: entities.aggregation,
            },
        };
    }
}

export const analyticalEngine = AnalyticalEngine.getInstance();
