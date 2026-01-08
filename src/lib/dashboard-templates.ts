import { VisualizationRecommendation } from "@/types/analytics";
import {
    DollarSign,
    LayersIcon,
    Package,
    Activity,
    ZapIcon,
    History,
    TrendingUp,
    TargetIcon,
    ShoppingCart,
    Users,
    Store,
    CreditCard,
    TrendingDown,
    Clock,
    BarChart3,
    PieChart,
    LineChart,
    Map
} from "lucide-react";

export interface IndustryConfig {
    name: string;
    kpis: Array<{
        title: string;
        keyMatch: RegExp;
        icon: any;
        color: string;
        bg: string;
        suffix?: string;
        prefix?: string;
        agg?: 'sum' | 'avg' | 'count';
    }>;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
    "retail": {
        name: "Retail",
        kpis: [
            { title: "Total Revenue", keyMatch: /sales|revenue|amount|total/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-pink-500 to-rose-500", prefix: "$", agg: 'sum' },
            { title: "Total Orders", keyMatch: /order|id|transaction|invoice/i, icon: ShoppingCart, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'count' },
            { title: "Avg Order Value", keyMatch: /sales|revenue/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", prefix: "$", agg: 'avg' },
            { title: "Total Units Sold", keyMatch: /qty|quantity|unit/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", agg: 'sum' },
            { title: "Unique Customers", keyMatch: /customer|email|user/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-600", agg: 'count' },
        ]
    },
    "sales": {
        name: "Sales",
        kpis: [
            { title: "Win Rate", keyMatch: /status|win|closed|probability/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-700", suffix: "%", agg: 'avg' },
            { title: "Pipeline Value", keyMatch: /amount|value|deal|potential/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-600", prefix: "$", agg: 'sum' },
            { title: "Total Deals", keyMatch: /id|deal|lead/i, icon: TrendingUp, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-700", agg: 'count' },
            { title: "Avg Deal Size", keyMatch: /amount|value/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-orange-500 to-red-500", prefix: "$", agg: 'avg' },
            { title: "Active Reps", keyMatch: /rep|owner|agent/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", agg: 'count' },
        ]
    },
    "marketing": {
        name: "Marketing",
        kpis: [
            { title: "CTR", keyMatch: /click|ctr|rate/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-orange-400 to-red-500", suffix: "%", agg: 'avg' },
            { title: "CPA", keyMatch: /cost|spend|acquisition/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-pink-400 to-rose-600", prefix: "$", agg: 'avg' },
            { title: "Campaign Reach", keyMatch: /impression|reach|view/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-indigo-400 to-blue-600", agg: 'sum' },
            { title: "Total Leads", keyMatch: /lead|email|conversion/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", agg: 'count' },
            { title: "Conv. Rate", keyMatch: /status|convert|rate/i, icon: TrendingUp, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-500", suffix: "%", agg: 'avg' },
        ]
    },
    "manufacturing": {
        name: "Manufacturing",
        kpis: [
            { title: "Yield %", keyMatch: /yield|efficiency|output|quality/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-emerald-400 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Downtime", keyMatch: /stop|down|delay|maintenance/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-rose-400 to-red-600", suffix: "h", agg: 'sum' },
            { title: "Produced Units", keyMatch: /qty|quantity|count|unit/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'sum' },
            { title: "Defect Count", keyMatch: /defect|reject|fail/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-red-500 to-orange-600", agg: 'sum' },
            { title: "OEE Score", keyMatch: /oee|score|perf/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-500", suffix: "%", agg: 'avg' },
        ]
    },
    "finance": {
        name: "Finance",
        kpis: [
            { title: "Net Profit", keyMatch: /profit|income|net/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-blue-700", prefix: "$", agg: 'sum' },
            { title: "Burn Rate", keyMatch: /expense|cost|burn|spend/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-rose-500 to-orange-600", prefix: "$", agg: 'sum' },
            { title: "Cash Reserve", keyMatch: /balance|cash|reserve/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", prefix: "$", agg: 'sum' },
            { title: "ROI", keyMatch: /roi|return/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", suffix: "%", agg: 'avg' },
            { title: "Total Expenses", keyMatch: /expense|cost|bill/i, icon: CreditCard, color: "white", bg: "bg-gradient-to-br from-red-400 to-pink-600", prefix: "$", agg: 'sum' },
        ]
    },
    "healthcare": {
        name: "Healthcare",
        kpis: [
            { title: "Avg Wait Time", keyMatch: /wait|time|delay|period/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", suffix: "m", agg: 'avg' },
            { title: "Total Patients", keyMatch: /patient|id|user/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'count' },
            { title: "Success Rate", keyMatch: /success|status|outcome/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-indigo-400 to-purple-600", suffix: "%", agg: 'avg' },
            { title: "Available Beds", keyMatch: /bed|capacity|room/i, icon: Store, color: "white", bg: "bg-gradient-to-br from-cyan-400 to-blue-500", agg: 'sum' },
            { title: "Avg Treatment Cost", keyMatch: /cost|bill|price/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-orange-400 to-red-500", prefix: "$", agg: 'avg' },
        ]
    },
    "education": {
        name: "Education",
        kpis: [
            { title: "Pass %", keyMatch: /score|pass|grade|result/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Retention", keyMatch: /retention|active|dropout/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", suffix: "%", agg: 'avg' },
            { title: "Trained Students", keyMatch: /id|student|user/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-purple-500 to-pink-600", agg: 'count' },
            { title: "Attendance Rate", keyMatch: /attendance|present/i, icon: History, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-500", suffix: "%", agg: 'avg' },
            { title: "Total Courses", keyMatch: /course|subject|class/i, icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-indigo-400 to-cyan-600", agg: 'count' },
        ]
    },
    "logistics": {
        name: "Logistics",
        kpis: [
            { title: "Avg Transit Time", keyMatch: /time|duration|transit|delivery/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", suffix: "h", agg: 'avg' },
            { title: "Deliveries", keyMatch: /id|delivery|shipment|order/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", agg: 'count' },
            { title: "On-time Rate", keyMatch: /status|on-time|delay/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-teal-500 to-emerald-600", suffix: "%", agg: 'avg' },
            { title: "Total Distance", keyMatch: /distance|mile|km/i, icon: TrendingUp, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-500", suffix: "km", agg: 'sum' },
            { title: "Fuel Cost", keyMatch: /fuel|gas|cost/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-red-500 to-pink-600", prefix: "$", agg: 'sum' },
        ]
    },
    "realestate": {
        name: "Real Estate",
        kpis: [
            { title: "Avg Deal Value", keyMatch: /price|value|amount|cost/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-amber-500 to-orange-600", prefix: "$", agg: 'avg' },
            { title: "Properties Listed", keyMatch: /id|property|listing/i, icon: Store, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-600", agg: 'count' },
            { title: "Sales Cycle", keyMatch: /days|time|period/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-slate-500 to-slate-700", suffix: "d", agg: 'avg' },
            { title: "Total Commission", keyMatch: /commission|fee/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", prefix: "$", agg: 'sum' },
            { title: "Sold Units", keyMatch: /sold|status/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-blue-600", agg: 'count' },
        ]
    },
    "saas": {
        name: "IT / SaaS",
        kpis: [
            { title: "MRR", keyMatch: /revenue|sales|mrr|subscription/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-blue-700", prefix: "$", agg: 'sum' },
            { title: "Churn Rate", keyMatch: /churn|cancel|rate/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-rose-500 to-pink-600", suffix: "%", agg: 'avg' },
            { title: "Active Users", keyMatch: /active|user|login|id/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-cyan-400 to-blue-600", agg: 'count' },
            { title: "ARR", keyMatch: /arr|annual/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", prefix: "$", agg: 'sum' },
            { title: "NPS Score", keyMatch: /nps|score|rating/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-500", agg: 'avg' },
        ]
    }
};

export interface ChartRecommendation extends VisualizationRecommendation {
    size?: 'large' | 'normal';
    colorPalette?: string[];
}

const TEMPLATE_VARIATIONS: Record<string, ChartRecommendation[][]> = {};

// Label mappings for meaningful axes
const LABEL_MAP: Record<string, string> = {
    // Dimensions
    'category': 'Product Category',
    'region': 'Geographic Region',
    'time': 'Time Period',
    'product': 'Product Name',
    'segment': 'Customer Segment',
    'status': 'Workflow Status',
    'channel': 'Sales Channel',
    'source': 'Lead Source',
    'department': 'Department Name',
    'vendor': 'Vendor Name',

    // Metrics
    'sales': 'Total Revenue ($)',
    'profit': 'Net Profit ($)',
    'cost': 'Operating Cost ($)',
    'count': 'Transaction Count',
    'volume': 'Volume (Units)',
    'rate': 'Rate (%)',
    'score': 'Performance Score',
    'value': 'Total Value ($)',
    'growth': 'Growth Rate (%)',
    'efficiency': 'Efficiency Index'
};

const getLabel = (key: string) => LABEL_MAP[key.toLowerCase()] || capitalize(key);

const PALETTES = [
    ['#0EA5E9', '#8B5CF6', '#F43F5E', '#10B981', '#F59E0B'], // Default
    ['#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899'], // Cool Purple/Pink
    ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'], // Emerald
    ['#F59E0B', '#FBBF24', '#D97706', '#B45309', '#78350F'], // Amber
    ['#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81'], // Indigo Deep
    ['#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843'], // Pink Deep
    ['#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A'], // Teal
    ['#8B5CF6', '#A78BFA', '#7C3AED', '#6D28D9', '#5B21B6'], // Violet
];

// Helper to generate 10 unique templates for an industry
const generateIndustryTemplates = (industry: string): ChartRecommendation[][] => {
    const templates: ChartRecommendation[][] = [];

    // Expanded palette of chart types including advanced ones
    const bigTypes = [
        'gradient-area', 'themeRiver', 'sankey', 'treemap', 'sunburst',
        'map', 'heatmap', 'scatter', 'normalized-bar', 'line', 'bar'
    ];
    const smallTypes = [
        'polar-bar', 'pictorialBar', 'dotted-bar', 'radar', 'gauge',
        'funnel', 'pie', 'doughnut', 'waterfall', 'boxplot', 'bar', 'line'
    ];

    // Dimensions/Metrics keys
    const dimensions = ['Category', 'Region', 'Time', 'Product', 'Segment', 'Status', 'Channel', 'Source', 'Department', 'Vendor'];
    const metrics = ['Sales', 'Profit', 'Cost', 'Count', 'Volume', 'Rate', 'Score', 'Value', 'Growth', 'Efficiency'];

    // Create a simple hash from industry name to seed randomness
    let seed = 0;
    for (let i = 0; i < industry.length; i++) {
        seed += industry.charCodeAt(i);
    }

    for (let i = 0; i < 10; i++) {
        // Use seed to rotate starting positions differently for each industry
        const bigIndex = (seed + i * 7) % bigTypes.length; // Multiplier 7 adds noise
        const smallOffset = (seed + i * 3);
        const dimOffset = (seed + i * 5);
        const metricOffset = (seed + i * 2);
        const paletteIndex = (seed + i) % PALETTES.length;

        const currentPalette = PALETTES[paletteIndex];

        // 1. Big Chart (Hero)
        const bigType = bigTypes[bigIndex];
        const bigDim = dimensions[dimOffset % dimensions.length];
        const bigMetric = metrics[metricOffset % metrics.length];

        const bigRec: ChartRecommendation = {
            type: bigType,
            title: `${industry} ${getLabel(bigMetric)} Analysis (${bigType})`,
            x_axis: bigDim.toLowerCase(),
            y_axis: bigMetric.toLowerCase(),
            x_label: getLabel(bigDim),
            y_label: getLabel(bigMetric),
            priority: 'high',
            size: 'large',
            colorPalette: currentPalette
        };

        // 2. Small Chart 1
        const smallType1 = smallTypes[(smallOffset) % smallTypes.length];
        const dim1 = dimensions[(dimOffset + 1) % dimensions.length];
        const met1 = metrics[(metricOffset + 1) % metrics.length];

        const smallRec1: ChartRecommendation = {
            type: smallType1,
            title: `${getLabel(dim1)} Breakdown`,
            x_axis: dim1.toLowerCase(),
            y_axis: met1.toLowerCase(),
            x_label: getLabel(dim1),
            y_label: getLabel(met1),
            priority: 'medium',
            size: 'normal',
            colorPalette: currentPalette
        };

        // 3. Small Chart 2
        const smallType2 = smallTypes[(smallOffset + 3) % smallTypes.length];
        const dim2 = dimensions[(dimOffset + 2) % dimensions.length];
        const met2 = metrics[(metricOffset + 2) % metrics.length];

        const smallRec2: ChartRecommendation = {
            type: smallType2,
            title: `${getLabel(met2)} Metrics`,
            x_axis: dim2.toLowerCase(),
            y_axis: met2.toLowerCase(),
            x_label: getLabel(dim2),
            y_label: getLabel(met2),
            priority: 'medium',
            size: 'normal',
            colorPalette: currentPalette
        };

        // 4. Small Chart 3
        const smallType3 = smallTypes[(smallOffset + 5) % smallTypes.length];
        const dim3 = dimensions[(dimOffset + 3) % dimensions.length];
        const met3 = metrics[(metricOffset + 3) % metrics.length];

        const smallRec3: ChartRecommendation = {
            type: smallType3,
            title: `${industry} Distribution`,
            x_axis: dim3.toLowerCase(),
            y_axis: met3.toLowerCase(),
            x_label: getLabel(dim3),
            y_label: getLabel(met3),
            priority: 'medium',
            size: 'normal',
            colorPalette: currentPalette
        };

        templates.push([bigRec, smallRec1, smallRec2, smallRec3]);
    }
    return templates;
};

// Fill the map
const industriesList = ['retail', 'sales', 'marketing', 'manufacturing', 'finance', 'healthcare', 'education', 'logistics', 'realestate', 'saas'];
industriesList.forEach(ind => {
    TEMPLATE_VARIATIONS[ind] = generateIndustryTemplates(capitalize(ind));
});

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export const getTemplateCharts = (templateId: string, data: any[], industryName?: string): ChartRecommendation[] => {
    // Determine Index
    const indexStr = templateId.replace('template', '');
    const index = parseInt(indexStr) - 1 || 0;
    const safeIndex = Math.max(0, Math.min(index, 9)); // Ensure 0-9

    // Detect Industry Key
    let key = "retail";
    if (industryName) {
        const lowerInfo = industryName.toLowerCase();
        if (lowerInfo.includes('retail')) key = 'retail';
        else if (lowerInfo.includes('sale')) key = 'sales';
        else if (lowerInfo.includes('market')) key = 'marketing';
        else if (lowerInfo.includes('manufact')) key = 'manufacturing';
        else if (lowerInfo.includes('finance')) key = 'finance';
        else if (lowerInfo.includes('health')) key = 'healthcare';
        else if (lowerInfo.includes('edu')) key = 'education';
        else if (lowerInfo.includes('logistic')) key = 'logistics';
        else if (lowerInfo.includes('real')) key = 'realestate';
        else if (lowerInfo.includes('it') || lowerInfo.includes('saas') || lowerInfo.includes('tech')) key = 'saas';
    }

    // Retrieve Templates
    let templates = TEMPLATE_VARIATIONS[key];
    if (!templates) {
        templates = generateIndustryTemplates(industryName || "General");
    }

    const selectedTemplate = templates[safeIndex] || templates[0];

    // Hydrate dynamic columns
    if (!data || data.length === 0) return selectedTemplate;

    const keys = Object.keys(data[0]);
    const numericKeys = keys.filter(k => typeof data[0][k] === 'number');
    const stringKeys = keys.filter(k => typeof data[0][k] === 'string' && !/id|date|url|email/i.test(k));

    const mainNumeric = numericKeys[0] || keys.find(k => /sales|total|amount|revenue|price/i.test(k)) || numericKeys[0];
    const secondNumeric = numericKeys[1] || numericKeys[0];
    const mainString = stringKeys[0] || keys.find(k => /name|type|category|brand/i.test(k)) || stringKeys[0];

    // Data-aware column mapping
    const colMap: any = {
        'sales': numericKeys.find(k => /sales|revenue|amount/i.test(k)) || mainNumeric,
        'profit': numericKeys.find(k => /profit|net|income/i.test(k)) || secondNumeric || mainNumeric,
        'cost': numericKeys.find(k => /cost|expense/i.test(k)) || secondNumeric || mainNumeric,
        'count': numericKeys.find(k => /count|qty|quantity/i.test(k)) || secondNumeric || mainNumeric,
        'value': numericKeys[0] || mainNumeric,
        'date': keys.find(k => /date|time|day/i.test(k)) || mainString,
        'category': keys.find(k => /category|type|group/i.test(k)) || mainString,
        'region': keys.find(k => /region|city|state/i.test(k)) || mainString,
        'product': keys.find(k => /product|item/i.test(k)) || mainString
    };

    return selectedTemplate.map(chart => {
        // Try to map virtual fields to real fields
        let x = colMap[chart.x_axis as string] || chart.x_axis;
        let y = colMap[chart.y_axis as string] || chart.y_axis;

        // Fallbacks
        if (!x || !keys.includes(x)) x = mainString;
        if (!y || !keys.includes(y as string)) y = mainNumeric;

        return {
            ...chart,
            x_axis: x,
            y_axis: y,
            x_label: chart.x_label, // Preserve label
            y_label: chart.y_label, // Preserve label
            colorPalette: chart.colorPalette // Preserve palette
        };
    });
};
