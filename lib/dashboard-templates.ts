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
    Map,
    Calendar,
    FileText,
    Smile,
    AlertTriangle,
    CheckCircle,
    Trash2,
    ClipboardCheck,
    ThumbsDown,
    Timer,
    Wrench,
    Zap,
    Star,
    ShieldCheck,
    Heart,
    Award,
    BookOpen,
    Trophy,
    AlertOctagon,
    UserCheck,
    Wallet,
    Globe,
    LifeBuoy,
    Stethoscope,
    MapPin,
    Flag,
    MessageCircle,
    Cpu,
    Database,
    Plane,
    CheckSquare,
    ShieldPlus,
    CalendarOff,
    ShieldAlert,
    ArrowUpRight,
    MessageSquare,
    Layers
} from "lucide-react";

import manufacturingJson from "../data/templates/manufacturing.json";
import financeJson from "../data/templates/finance.json";
import retailJson from "../data/templates/retail.json";
import healthcareJson from "../data/templates/healthcare.json";
import hrJson from "../data/templates/hr_people_analytics.json";

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
        target?: string;
    }>;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
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
    "ecommerce": {
        name: "E-Commerce",
        kpis: [
            { title: "Total Revenue", keyMatch: /sales|revenue|amount/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-pink-500 to-rose-500", prefix: "$", agg: 'sum' },
            { title: "Conversion Rate", keyMatch: /conversion|rate|cv/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-600", suffix: "%", agg: 'avg' },
            { title: "Avg Order Value", keyMatch: /aov|avg|order/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", prefix: "$", agg: 'avg' },
            { title: "Cart Abandonment", keyMatch: /abandon|cart/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-orange-500 to-red-600", suffix: "%", agg: 'avg' },
            { title: "Total Orders", keyMatch: /order|id|transaction/i, icon: ShoppingCart, color: "white", bg: "bg-gradient-to-br from-blue-400 to-cyan-600", agg: 'count' },
        ]
    },
    "saas": {
        name: "SaaS / Technology",
        kpis: [
            { title: "MRR", keyMatch: /mrr|revenue|monthly/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-violet-500 to-purple-700", prefix: "$", agg: 'sum' },
            { title: "Churn Rate", keyMatch: /churn|cancel/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-red-500 to-pink-600", suffix: "%", agg: 'avg' },
            { title: "Active Users", keyMatch: /active|user|dau|mau/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-cyan-400 to-blue-600", agg: 'count' },
            { title: "ARR", keyMatch: /arr|annual/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-blue-600", prefix: "$", agg: 'sum' },
            { title: "LTV", keyMatch: /ltv|lifetime/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", prefix: "$", agg: 'avg' },
        ]
    },
    "manufacturing": {
        name: "Manufacturing",
        kpis: [
            { title: "Yield Efficiency", keyMatch: /yield|efficiency/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-emerald-400 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Downtime Hours", keyMatch: /down|stop|delay/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-rose-400 to-red-600", suffix: "h", agg: 'sum' },
            { title: "Units Produced", keyMatch: /unit|qty|count/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'sum' },
            { title: "Defect Rate", keyMatch: /defect|fail|reject/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-orange-500 to-amber-600", suffix: "%", agg: 'avg' },
            { title: "OEE", keyMatch: /oee|overall/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-500", suffix: "%", agg: 'avg' },
        ]
    },
    "banking": {
        name: "Banking & BFSI",
        kpis: [
            { title: "AUM", keyMatch: /asset|aum|manage/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-600 to-indigo-800", prefix: "$", agg: 'sum' },
            { title: "Net Interest Margin", keyMatch: /margin|interest|nim/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-700", suffix: "%", agg: 'avg' },
            { title: "New Accounts", keyMatch: /account|new|user/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", agg: 'count' },
            { title: "Loan Portfolio", keyMatch: /loan|credit|lend/i, icon: CreditCard, color: "white", bg: "bg-gradient-to-br from-violet-500 to-purple-700", prefix: "$", agg: 'sum' },
            { title: "NPA Ratio", keyMatch: /npa|default|bad/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-red-500 to-rose-600", suffix: "%", agg: 'avg' },
        ]
    },
    "insurance": {
        name: "Insurance",
        kpis: [
            { title: "Gross Premium", keyMatch: /premium|gwp|sales/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-blue-600", prefix: "$", agg: 'sum' },
            { title: "Claims Ratio", keyMatch: /claim|ratio|loss/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-rose-500 to-red-600", suffix: "%", agg: 'avg' },
            { title: "Active Policies", keyMatch: /policy|active|count/i, icon: FileText, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", agg: 'count' },
            { title: "Renewal Rate", keyMatch: /renew|retention/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-500", suffix: "%", agg: 'avg' },
            { title: "Avg Claim Cost", keyMatch: /cost|claim|payout/i, icon: CreditCard, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", prefix: "$", agg: 'avg' },
        ]
    },
    "retail": {
        name: "Retail",
        kpis: [
            { title: "Total Sales", keyMatch: /sales|revenue/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-pink-500 to-red-500", prefix: "$", agg: 'sum' },
            { title: "Transactions", keyMatch: /transaction|order/i, icon: ShoppingCart, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'count' },
            { title: "Basket Size", keyMatch: /qty|basket|items/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", agg: 'avg' },
            { title: "Footfall", keyMatch: /visit|footfall/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'sum' },
            { title: "Returns", keyMatch: /return|refund/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-orange-500 to-amber-600", prefix: "$", agg: 'sum' },
        ]
    },
    "marketplace": {
        name: "Marketplace",
        kpis: [
            { title: "GMV", keyMatch: /gmv|sales|volume/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-violet-500 to-indigo-700", prefix: "$", agg: 'sum' },
            { title: "Take Rate", keyMatch: /commission|take|rate/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Active Sellers", keyMatch: /seller|vendor/i, icon: Store, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-600", agg: 'count' },
            { title: "Active Buyers", keyMatch: /buyer|user|customer/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-pink-500 to-rose-600", agg: 'count' },
            { title: "Avg Order Val", keyMatch: /aov|order|value/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-amber-400 to-orange-600", prefix: "$", agg: 'avg' },
        ]
    },
    "healthcare": {
        name: "Healthcare",
        kpis: [
            { title: "Patient Count", keyMatch: /patient|user/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", agg: 'count' },
            { title: "Avg Wait Time", keyMatch: /wait|time/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", suffix: "m", agg: 'avg' },
            { title: "Bed Occupancy", keyMatch: /occupancy|bed/i, icon: Store, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", suffix: "%", agg: 'avg' },
            { title: "Readmission Rate", keyMatch: /return|readmission/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-rose-500 to-red-600", suffix: "%", agg: 'avg' },
            { title: "Treatment Cost", keyMatch: /cost|bill/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", prefix: "$", agg: 'avg' },
        ]
    },
    "pharma": {
        name: "Pharma",
        kpis: [
            { title: "R&D Spend", keyMatch: /research|r&d|spend/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", prefix: "$", agg: 'sum' },
            { title: "Approval Rate", keyMatch: /approval|success/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Clinical Trials", keyMatch: /trial|test/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'count' },
            { title: "Patent Expiry", keyMatch: /patent|expire/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-orange-500 to-red-600", agg: 'count' },
            { title: "Drug Sales", keyMatch: /sales|revenue/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-teal-600", prefix: "$", agg: 'sum' },
        ]
    },
    "logistics": {
        name: "Logistics",
        kpis: [
            { title: "On-Time Delivery", keyMatch: /time|ontime|delivery/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Fleet Utilization", keyMatch: /fleet|utilization/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", suffix: "%", agg: 'avg' },
            { title: "Total Shipments", keyMatch: /shipment|order/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'count' },
            { title: "Fuel Costs", keyMatch: /fuel|cost/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-red-500 to-orange-600", prefix: "$", agg: 'sum' },
            { title: "Avg Bandwidth", keyMatch: /weight|capacity/i, icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-teal-600", agg: 'avg' },
        ]
    },
    "telecom": {
        name: "Telecom",
        kpis: [
            { title: "ARPU", keyMatch: /arpu|revenue|user/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-600 to-indigo-800", prefix: "$", agg: 'avg' },
            { title: "Churn Rate", keyMatch: /churn|left/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-red-500 to-rose-600", suffix: "%", agg: 'avg' },
            { title: "Data Usage", keyMatch: /data|usage|gb/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-teal-600", suffix: "TB", agg: 'sum' },
            { title: "Subscribers", keyMatch: /subscriber|user/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'count' },
            { title: "Network Uptime", keyMatch: /uptime|network/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
        ]
    },
    "energy": {
        name: "Energy",
        kpis: [
            { title: "Power Gen", keyMatch: /power|generation|kwh/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", suffix: "MWh", agg: 'sum' },
            { title: "Carbon Footprint", keyMatch: /carbon|co2|emission/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-gray-500 to-slate-700", suffix: "t", agg: 'sum' },
            { title: "Grid Load", keyMatch: /load|grid/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-600", suffix: "%", agg: 'avg' },
            { title: "Efficiency", keyMatch: /efficiency|factor/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Revenue", keyMatch: /revenue|sales/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-indigo-500 to-purple-600", prefix: "$", agg: 'sum' },
        ]
    },
    "hr": {
        name: "HR",
        kpis: [
            { title: "Headcount", keyMatch: /headcount|employee/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", agg: 'count' },
            { title: "Attrition Rate", keyMatch: /attrition|churn|turnover/i, icon: TrendingDown, color: "white", bg: "bg-gradient-to-br from-red-500 to-rose-600", suffix: "%", agg: 'avg' },
            { title: "Time to Hire", keyMatch: /time|hire|days/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-600", suffix: "d", agg: 'avg' },
            { title: "eNPS", keyMatch: /enps|score/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'avg' },
            { title: "Training Hours", keyMatch: /training|hours/i, icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", agg: 'sum' },
        ]
    },
    "education": {
        name: "Education & EdTech",
        kpis: [
            { title: "Enrollments", keyMatch: /enroll|student/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", agg: 'count' },
            { title: "Completion Rate", keyMatch: /complete|rate/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", suffix: "%", agg: 'avg' },
            { title: "Avg Score", keyMatch: /score|grade/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-purple-500 to-pink-600", agg: 'avg' },
            { title: "Course Content", keyMatch: /hours|content/i, icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-orange-400 to-amber-500", suffix: "h", agg: 'sum' },
            { title: "Revenue", keyMatch: /fee|revenue/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", prefix: "$", agg: 'sum' },
        ]
    },
    "hospitality": {
        name: "Hospitality",
        kpis: [
            { title: "RevPAR", keyMatch: /revpar|revenue/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-gold-500 to-amber-600", prefix: "$", agg: 'avg' },
            { title: "Occupancy Rate", keyMatch: /occupancy|rate/i, icon: Store, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-600", suffix: "%", agg: 'avg' },
            { title: "ADR", keyMatch: /adr|daily/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", prefix: "$", agg: 'avg' },
            { title: "Guest Score", keyMatch: /score|rating|review/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-purple-500 to-pink-600", agg: 'avg' },
            { title: "Bookings", keyMatch: /booking|reservation/i, icon: Calendar, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-500", agg: 'count' },
        ]
    },
    "agriculture": {
        name: "AgriTech",
        kpis: [
            { title: "Crop Yield", keyMatch: /yield|output|crop/i, icon: Package, color: "white", bg: "bg-gradient-to-br from-green-500 to-emerald-700", suffix: "t", agg: 'sum' },
            { title: "Soil Health", keyMatch: /soil|health/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-amber-500 to-orange-600", agg: 'avg' },
            { title: "Water Usage", keyMatch: /water|usage/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-blue-400 to-cyan-600", suffix: "L", agg: 'sum' },
            { title: "Market Price", keyMatch: /price|market/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", prefix: "$", agg: 'avg' },
            { title: "Area Cultivated", keyMatch: /area|land/i, icon: Map, color: "white", bg: "bg-gradient-to-br from-lime-500 to-green-600", suffix: "ha", agg: 'sum' },
        ]
    },
    "government": {
        name: "Government",
        kpis: [
            { title: "Budget Util", keyMatch: /budget|spend/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-600 to-indigo-800", suffix: "%", agg: 'avg' },
            { title: "Citizen Satisfaction", keyMatch: /satisfaction|score/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", suffix: "%", agg: 'avg' },
            { title: "Service Requests", keyMatch: /request|service/i, icon: FileText, color: "white", bg: "bg-gradient-to-br from-orange-500 to-red-600", agg: 'count' },
            { title: "Avg Latency", keyMatch: /latency|time|delay/i, icon: Clock, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", suffix: "d", agg: 'avg' },
            { title: "Projects Completed", keyMatch: /project|done/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", agg: 'count' },
        ]
    },
    "odoo": {
        name: "Odoo CRM",
        kpis: [
            { title: "Total Revenue", keyMatch: /revenue|expected/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-purple-600 to-indigo-800", prefix: "$", agg: 'sum' },
            { title: "Win Rate", keyMatch: /probability|win/i, icon: TargetIcon, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", suffix: "%", agg: 'avg' },
            { title: "Open Leads", keyMatch: /id|name/i, icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-orange-500 to-red-600", agg: 'count' },
            { title: "Avg Deal Size", keyMatch: /revenue|expected/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-blue-500 to-cyan-600", prefix: "$", agg: 'avg' },
            { title: "Lead Velocity", keyMatch: /date|create/i, icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-pink-500 to-rose-600", suffix: " /mo", agg: 'count' }, // Proxy
        ]
    },
    "crm": {
        name: "CRM / Sales",
        kpis: [
            { title: "Pipeline Value", keyMatch: /est_value|total_value|deal|pipeline|value|amount/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", prefix: "₹", agg: 'sum' },
            { title: "Total Leads", keyMatch: /lead_id|lead_name|lead|contact|prospect/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'count' },
            { title: "Customers", keyMatch: /customer|contact_type|first_name/i, icon: UserCheck, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", agg: 'count' },
            { title: "Avg Deal Size", keyMatch: /est_value|total_value|deal|amount|value/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", prefix: "₹", agg: 'avg' },
            { title: "Activities", keyMatch: /action|activity|task|call|meeting|log/i, icon: Calendar, color: "white", bg: "bg-gradient-to-br from-orange-500 to-amber-600", agg: 'count' },
        ]
    },
    "sfw crm": {
        name: "SFW CRM",
        kpis: [
            { title: "Pipeline Value", keyMatch: /est_value|total_value|deal|pipeline|value|amount/i, icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-blue-500 to-indigo-700", prefix: "₹", agg: 'sum' },
            { title: "Total Leads", keyMatch: /lead_id|lead_name|lead|contact|prospect/i, icon: Users, color: "white", bg: "bg-gradient-to-br from-purple-500 to-violet-600", agg: 'count' },
            { title: "Customers", keyMatch: /customer|contact_type|first_name/i, icon: UserCheck, color: "white", bg: "bg-gradient-to-br from-emerald-500 to-green-600", agg: 'count' },
            { title: "Avg Deal Size", keyMatch: /est_value|total_value|deal|amount|value/i, icon: Activity, color: "white", bg: "bg-gradient-to-br from-cyan-500 to-blue-600", prefix: "₹", agg: 'avg' },
            { title: "Activities", keyMatch: /action|activity|task|call|meeting|log/i, icon: Calendar, color: "white", bg: "bg-gradient-to-br from-orange-500 to-amber-600", agg: 'count' },
        ]
    }
};

export interface ChartRecommendation extends VisualizationRecommendation {
    size?: 'large' | 'normal';
    colorPalette?: string[];
}

const PALETTES = [
    ['#12FFCC', '#A855F7', '#D946EF', '#8B5CF6', '#EC4899'],
    ['#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#EC4899'],
    ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0'],
    ['#F59E0B', '#FBBF24', '#D97706', '#B45309', '#78350F'],
    ['#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81'],
    ['#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843'],
    ['#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A'],
    ['#8B5CF6', '#A78BFA', '#7C3AED', '#6D28D9', '#5B21B6'],
];

const TEMPLATE_VARIATIONS: Record<string, ChartRecommendation[][]> = {
    "odoo": [
        [
            { type: 'funnel', title: 'Sales Pipeline', x_axis: 'Stage', y_axis: 'Revenue', x_label: 'Stage', y_label: 'Expected Revenue', priority: 'high', size: 'large', colorPalette: PALETTES[4] },
            { type: 'bar', title: 'Revenue by Owner', x_axis: 'Owner', y_axis: 'Revenue', x_label: 'Salesperson', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
            { type: 'pie', title: 'Leads by Stage', x_axis: 'Stage', y_axis: 'Revenue', x_label: 'Stage', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
            { type: 'line', title: 'Revenue Forecast', x_axis: 'create_date', y_axis: 'Revenue', x_label: 'Date', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
        ]
    ]
};

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

const generateIndustryTemplates = (industry: string): ChartRecommendation[][] => {
    const templates: ChartRecommendation[][] = [];

    const bigTypes = [
        'gradient-area', 'bar', 'line', 'mixed-line-bar', 'scatter'
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

const FINANCE_TEMPLATES: ChartRecommendation[][] = [
    // Template 1: Executive Financial Overview
    [
        { type: 'gradient-area', title: 'Revenue & Growth Trajectory', x_axis: 'time', y_axis: 'sales', x_label: 'Period', y_label: 'Revenue', priority: 'high', size: 'large', colorPalette: PALETTES[4] },
        { type: 'bar', title: 'Profit by Region', x_axis: 'region', y_axis: 'profit', x_label: 'Region', y_label: 'Profit', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
        { type: 'pie', title: 'Revenue Share by Category', x_axis: 'category', y_axis: 'sales', x_label: 'Category', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
        { type: 'line', title: 'Expense Trend', x_axis: 'time', y_axis: 'cost', x_label: 'Period', y_label: 'Expenses', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
    ],
    // Template 2: Profitability Analysis
    [
        { type: 'mixed-line-bar', title: 'Revenue vs Profit Margins', x_axis: 'time', y_axis: ['sales', 'profit'], x_label: 'Period', y_label: 'Amount', priority: 'high', size: 'large', colorPalette: PALETTES[2] },
        { type: 'bar', title: 'Top Profitable Products', x_axis: 'product', y_axis: 'profit', x_label: 'Product', y_label: 'Profit', priority: 'medium', size: 'normal', colorPalette: PALETTES[3] },
        { type: 'scatter', title: 'Cost vs Revenue Correlation', x_axis: 'cost', y_axis: 'sales', x_label: 'Cost', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
        { type: 'gauge', title: 'Gross Margin %', x_axis: 'none', y_axis: 'rate', x_label: '', y_label: 'Margin', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
    ],
    // Template 3: Cash Flow & Liquidity
    [
        { type: 'line', title: 'Net Cash Flow Evolution', x_axis: 'time', y_axis: 'profit', x_label: 'Period', y_label: 'Cash Flow', priority: 'high', size: 'large', colorPalette: PALETTES[5] },
        { type: 'waterfall', title: 'Profit Bridge', x_axis: 'category', y_axis: 'profit', x_label: 'Item', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
        { type: 'bar', title: 'Receivables by Region', x_axis: 'region', y_axis: 'sales', x_label: 'Region', y_label: 'Receivables', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
        { type: 'line', title: 'Operating Expenses', x_axis: 'time', y_axis: 'cost', x_label: 'Period', y_label: 'Opex', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
    ],
    // Template 4: Expense Management
    [
        { type: 'bar', title: 'Departmental Expense Breakdown', x_axis: 'department', y_axis: 'cost', x_label: 'Department', y_label: 'Expenses', priority: 'high', size: 'large', colorPalette: PALETTES[5] },
        { type: 'pie', title: 'Cost Structure', x_axis: 'category', y_axis: 'cost', x_label: 'Category', y_label: 'Cost', priority: 'medium', size: 'normal', colorPalette: PALETTES[3] },
        { type: 'treemap', title: 'Vendor Spend Map', x_axis: 'vendor', y_axis: 'cost', x_label: 'Vendor', y_label: 'Spend', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
        { type: 'line', title: 'Cost Reduction Trend', x_axis: 'time', y_axis: 'cost', x_label: 'Period', y_label: 'Cost', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
    ],
    // Template 5: Revenue Intelligence
    [
        { type: 'gradient-area', title: 'Cumulative Revenue Growth', x_axis: 'time', y_axis: 'sales', x_label: 'Time', y_label: 'Revenue', priority: 'high', size: 'large', colorPalette: PALETTES[0] },
        { type: 'funnel', title: 'Sales Conversion Pipeline', x_axis: 'status', y_axis: 'count', x_label: 'Stage', y_label: 'Volume', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
        { type: 'bar', title: 'Revenue by Channel', x_axis: 'channel', y_axis: 'sales', x_label: 'Channel', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[3] },
        { type: 'pie', title: 'Customer Segment Contribution', x_axis: 'segment', y_axis: 'sales', x_label: 'Segment', y_label: 'Revenue', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
    ],
    // Template 6: Operational Efficiency
    [
        { type: 'bar', title: 'Revenue per Employee/Unit', x_axis: 'time', y_axis: 'efficiency', x_label: 'Period', y_label: 'Efficiency', priority: 'high', size: 'large', colorPalette: PALETTES[1] },
        { type: 'gauge', title: 'Budget Utilization %', x_axis: 'none', y_axis: 'rate', x_label: '', y_label: 'Utilization', priority: 'medium', size: 'normal', colorPalette: PALETTES[5] },
        { type: 'line', title: 'Overhead Costs', x_axis: 'time', y_axis: 'cost', x_label: 'Period', y_label: 'Overhead', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
        { type: 'scatter', title: 'Spend vs Output', x_axis: 'cost', y_axis: 'volume', x_label: 'Spend', y_label: 'Output', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
    ],
    // Template 7: Strategic Growth (CFO View)
    [
        { type: 'mixed-line-bar', title: 'Actual vs Budget', x_axis: 'time', y_axis: ['sales', 'value'], x_label: 'Period', y_label: 'Value', priority: 'high', size: 'large', colorPalette: PALETTES[6] },
        { type: 'bar', title: 'Regional Growth Leaders', x_axis: 'region', y_axis: 'growth', x_label: 'Region', y_label: 'Growth %', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
        { type: 'pie', title: 'Investment Portfolio', x_axis: 'category', y_axis: 'value', x_label: 'Asset', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: PALETTES[3] },
        { type: 'line', title: 'EBITDA Trend', x_axis: 'time', y_axis: 'profit', x_label: 'Period', y_label: 'EBITDA', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
    ],
    // Template 8: Product Performance
    [
        { type: 'bar', title: 'Product Line Profitability', x_axis: 'product', y_axis: 'profit', x_label: 'Product', y_label: 'Profit', priority: 'high', size: 'large', colorPalette: PALETTES[7] },
        { type: 'bubble', title: 'Volume vs Margin Matrix', x_axis: 'volume', y_axis: 'rate', x_label: 'Volume', y_label: 'Margin', priority: 'medium', size: 'normal', colorPalette: PALETTES[5] },
        { type: 'line', title: 'Unit Sales Velocity', x_axis: 'time', y_axis: 'volume', x_label: 'Period', y_label: 'Units', priority: 'medium', size: 'normal', colorPalette: PALETTES[2] },
        { type: 'bar', title: 'Returns/Refunds Impact', x_axis: 'category', y_axis: 'cost', x_label: 'Category', y_label: 'Returns Cost', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
    ],
    // Template 9: Forecasting & Risk
    [
        { type: 'line', title: 'Revenue Forecast Model', x_axis: 'time', y_axis: 'sales', x_label: 'Period', y_label: 'Projected Revenue', priority: 'high', size: 'large', colorPalette: PALETTES[3] },
        { type: 'radar', title: 'Risk Profile', x_axis: 'category', y_axis: 'score', x_label: 'Risk Type', y_label: 'Level', priority: 'medium', size: 'normal', colorPalette: PALETTES[0] },
        { type: 'bar', title: 'Variance Analysis', x_axis: 'category', y_axis: 'value', x_label: 'Item', y_label: 'Variance', priority: 'medium', size: 'normal', colorPalette: PALETTES[1] },
        { type: 'pie', title: 'Liability Distribution', x_axis: 'source', y_axis: 'value', x_label: 'Source', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: PALETTES[6] },
    ],
    // Template 10: Shareholder Value
    [
        { type: 'gradient-area', title: 'Detailed Net Income', x_axis: 'time', y_axis: 'profit', x_label: 'Period', y_label: 'Net Income', priority: 'high', size: 'large', colorPalette: PALETTES[2] },
        { type: 'bar', title: 'Dividend Payouts', x_axis: 'time', y_axis: 'value', x_label: 'Year', y_label: 'Payout', priority: 'medium', size: 'normal', colorPalette: PALETTES[5] },
        { type: 'line', title: 'EPS Trend', x_axis: 'time', y_axis: 'score', x_label: 'Period', y_label: 'EPS', priority: 'medium', size: 'normal', colorPalette: PALETTES[4] },
        { type: 'bar', title: 'Equity Structure', x_axis: 'category', y_axis: 'value', x_label: 'Holder', y_label: 'Equity', priority: 'medium', size: 'normal', colorPalette: PALETTES[3] },
    ]
];

// CRM-Specific Templates - Designed for SFW CRM data structure
// Tables: leads (lead_status, lead_source, est_value, industry), customers (contact_type, source, status), companies (industry, total_value)
const CRM_TEMPLATES: ChartRecommendation[][] = [
    // Template 1: Sales Pipeline Overview
    [
        { type: 'funnel', title: 'Lead Pipeline by Status', x_axis: 'lead_status', y_axis: 'est_value', x_label: 'Pipeline Stage', y_label: 'Deal Value', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#10B981'] },
        { type: 'pie', title: 'Leads by Source', x_axis: 'lead_source', y_axis: 'est_value', x_label: 'Lead Source', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'] },
        { type: 'bar', title: 'Deal Value by Industry', x_axis: 'industry', y_axis: 'est_value', x_label: 'Industry', y_label: 'Est. Value', priority: 'medium', size: 'normal', colorPalette: ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'] },
        { type: 'doughnut', title: 'Lead Status Distribution', x_axis: 'lead_status', y_axis: 'count', x_label: 'Status', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'] },
    ],
    // Template 2: Customer Analytics
    [
        { type: 'bar', title: 'Customers by Contact Type', x_axis: 'contact_type', y_axis: 'count', x_label: 'Contact Type', y_label: 'Count', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'] },
        { type: 'pie', title: 'Customer Sources', x_axis: 'source', y_axis: 'count', x_label: 'Source', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'] },
        { type: 'doughnut', title: 'Customer Status', x_axis: 'status', y_axis: 'count', x_label: 'Status', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#EF4444'] },
        { type: 'bar', title: 'Customers by Country', x_axis: 'country', y_axis: 'count', x_label: 'Country', y_label: 'Customers', priority: 'medium', size: 'normal', colorPalette: ['#8B5CF6', '#A855F7', '#D946EF', '#EC4899'] },
    ],
    // Template 3: Company Performance
    [
        { type: 'bar', title: 'Company Value by Industry', x_axis: 'industry', y_axis: 'total_value', x_label: 'Industry', y_label: 'Total Value', priority: 'high', size: 'large', colorPalette: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'] },
        { type: 'pie', title: 'Companies by Size', x_axis: 'size', y_axis: 'count', x_label: 'Company Size', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7'] },
        { type: 'bar', title: 'Contact Count by Company', x_axis: 'name', y_axis: 'contact_count', x_label: 'Company', y_label: 'Contacts', priority: 'medium', size: 'normal', colorPalette: ['#EC4899', '#F43F5E', '#F59E0B', '#10B981'] },
        { type: 'doughnut', title: 'Revenue Distribution', x_axis: 'revenue', y_axis: 'count', x_label: 'Revenue Range', y_label: 'Companies', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'] },
    ],
    // Template 4: Lead Activity Analysis
    [
        { type: 'bar', title: 'Activity by Action Type', x_axis: 'action', y_axis: 'count', x_label: 'Action', y_label: 'Count', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] },
        { type: 'line', title: 'Activity Timeline', x_axis: 'created_at', y_axis: 'count', x_label: 'Date', y_label: 'Activities', priority: 'medium', size: 'normal', colorPalette: ['#6366F1'] },
        { type: 'pie', title: 'Actions by Performer', x_axis: 'performed_by', y_axis: 'count', x_label: 'User', y_label: 'Actions', priority: 'medium', size: 'normal', colorPalette: ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981'] },
        { type: 'bar', title: 'Stage Changes Over Time', x_axis: 'details', y_axis: 'count', x_label: 'Stage Change', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#F59E0B', '#EF4444', '#22C55E', '#3B82F6'] },
    ],
    // Template 5: Pipeline Value Analysis
    [
        { type: 'gradient-area', title: 'Pipeline Value Trend', x_axis: 'created_at', y_axis: 'est_value', x_label: 'Date', y_label: 'Est. Value', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#6366F1'] },
        { type: 'bar', title: 'Value by Lead Owner', x_axis: 'lead_owner', y_axis: 'est_value', x_label: 'Sales Owner', y_label: 'Pipeline Value', priority: 'medium', size: 'normal', colorPalette: ['#10B981', '#3B82F6', '#F59E0B'] },
        { type: 'pie', title: 'Value by Lead Source', x_axis: 'lead_source', y_axis: 'est_value', x_label: 'Source', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981'] },
        { type: 'bar', title: 'Avg Deal Size by Industry', x_axis: 'industry', y_axis: 'est_value', x_label: 'Industry', y_label: 'Avg Value', priority: 'medium', size: 'normal', colorPalette: ['#F59E0B', '#EF4444', '#22C55E', '#3B82F6'] },
    ],
    // Template 6: Sales Conversion Funnel
    [
        { type: 'funnel', title: 'Sales Conversion Funnel', x_axis: 'lead_status', y_axis: 'count', x_label: 'Stage', y_label: 'Leads', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#22C55E', '#EF4444'] },
        { type: 'gauge', title: 'Win Rate', x_axis: 'none', y_axis: 'rate', x_label: '', y_label: 'Win %', priority: 'medium', size: 'normal', colorPalette: ['#22C55E'] },
        { type: 'bar', title: 'Lost Reasons Analysis', x_axis: 'lead_status', y_axis: 'count', x_label: 'Status', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#EF4444', '#F59E0B', '#3B82F6'] },
        { type: 'pie', title: 'Pipeline Stage Distribution', x_axis: 'lead_stage', y_axis: 'est_value', x_label: 'Stage', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'] },
    ],
    // Template 7: Geographic Analysis
    [
        { type: 'bar', title: 'Customers by Region', x_axis: 'state', y_axis: 'count', x_label: 'State/Region', y_label: 'Customers', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7'] },
        { type: 'pie', title: 'Distribution by Country', x_axis: 'country', y_axis: 'count', x_label: 'Country', y_label: 'Count', priority: 'medium', size: 'normal', colorPalette: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'] },
        { type: 'bar', title: 'Leads by City', x_axis: 'city', y_axis: 'count', x_label: 'City', y_label: 'Leads', priority: 'medium', size: 'normal', colorPalette: ['#EC4899', '#8B5CF6', '#3B82F6'] },
        { type: 'doughnut', title: 'Market Presence', x_axis: 'country', y_axis: 'est_value', x_label: 'Market', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#3B82F6', '#F59E0B'] },
    ],
    // Template 8: Team Performance
    [
        { type: 'bar', title: 'Pipeline by Sales Owner', x_axis: 'lead_owner', y_axis: 'est_value', x_label: 'Sales Rep', y_label: 'Pipeline Value', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'] },
        { type: 'pie', title: 'Lead Distribution by Owner', x_axis: 'lead_owner', y_axis: 'count', x_label: 'Owner', y_label: 'Leads', priority: 'medium', size: 'normal', colorPalette: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'] },
        { type: 'bar', title: 'Activities by User', x_axis: 'performed_by', y_axis: 'count', x_label: 'User', y_label: 'Activities', priority: 'medium', size: 'normal', colorPalette: ['#8B5CF6', '#A855F7', '#D946EF'] },
        { type: 'line', title: 'Team Activity Trend', x_axis: 'created_at', y_axis: 'count', x_label: 'Date', y_label: 'Actions', priority: 'medium', size: 'normal', colorPalette: ['#3B82F6'] },
    ],
    // Template 9: Product & Quotation Analysis
    [
        { type: 'bar', title: 'Products by Category', x_axis: 'category_name', y_axis: 'count', x_label: 'Category', y_label: 'Products', priority: 'high', size: 'large', colorPalette: ['#10B981', '#3B82F6', '#F59E0B'] },
        { type: 'pie', title: 'Quotation Status', x_axis: 'status', y_axis: 'total_amount', x_label: 'Status', y_label: 'Amount', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'] },
        { type: 'bar', title: 'Product Pricing', x_axis: 'name', y_axis: 'base_price', x_label: 'Product', y_label: 'Price', priority: 'medium', size: 'normal', colorPalette: ['#8B5CF6', '#EC4899', '#3B82F6'] },
        { type: 'line', title: 'Quotation Trend', x_axis: 'created_at', y_axis: 'total_amount', x_label: 'Date', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#6366F1'] },
    ],
    // Template 10: Executive CRM Dashboard
    [
        { type: 'mixed-line-bar', title: 'Pipeline vs Closed Deals', x_axis: 'lead_status', y_axis: ['est_value', 'count'], x_label: 'Status', y_label: 'Value/Count', priority: 'high', size: 'large', colorPalette: ['#3B82F6', '#10B981'] },
        { type: 'gauge', title: 'Pipeline Health Score', x_axis: 'none', y_axis: 'score', x_label: '', y_label: 'Score', priority: 'medium', size: 'normal', colorPalette: ['#22C55E', '#F59E0B', '#EF4444'] },
        { type: 'radar', title: 'Sales Performance Metrics', x_axis: 'lead_source', y_axis: 'est_value', x_label: 'Source', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#8B5CF6', '#3B82F6'] },
        { type: 'pie', title: 'Revenue by Industry', x_axis: 'industry', y_axis: 'est_value', x_label: 'Industry', y_label: 'Value', priority: 'medium', size: 'normal', colorPalette: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'] },
    ]
];

const industriesList = [
    'finance', 'ecommerce', 'saas', 'manufacturing', 'banking', 'insurance', 'retail', 'marketplace',
    'healthcare', 'pharma', 'logistics', 'telecom', 'energy', 'hr', 'education', 'hospitality',
    'agriculture', 'government', 'crm', 'sfw crm'
];

// Map JSON icons to Lucide components
const iconMap: any = {
    'DollarSign': DollarSign,
    'Activity': Activity,
    'Target': TargetIcon,
    'TargetIcon': TargetIcon,
    'Smile': Smile,
    'Users': Users,
    'History': History,
    'Clock': Clock,
    'Package': Package,
    'BarChart3': BarChart3,
    'LayersIcon': LayersIcon,
    'FileText': FileText,
    'ZapIcon': ZapIcon,
    'AlertTriangle': AlertTriangle,
    'CheckCircle': CheckCircle,
    'Trash2': Trash2,
    'ClipboardCheck': ClipboardCheck,
    'ThumbsDown': ThumbsDown,
    'Timer': Timer,
    'Wrench': Wrench,
    'Zap': Zap,
    'Star': Star,
    'ShieldCheck': ShieldCheck,
    'Heart': Heart,
    'Award': Award,
    'BookOpen': BookOpen,
    'Trophy': Trophy,
    'AlertOctagon': AlertOctagon,
    'UserCheck': UserCheck,
    'Wallet': Wallet,
    'Globe': Globe,
    'LifeBuoy': LifeBuoy,
    'Stethoscope': Stethoscope,
    'MapPin': MapPin,
    'Flag': Flag,
    'MessageCircle': MessageCircle,
    'Cpu': Cpu,
    'Database': Database,
    'Plane': Plane,
    'CheckSquare': CheckSquare,
    'ShieldPlus': ShieldPlus,
    'CalendarOff': CalendarOff,
    'ShieldAlert': ShieldAlert,
    'ArrowUpRight': ArrowUpRight,
    'MessageSquare': MessageSquare,
    'Layers': Layers,
};

const jsonConfigs: any = {
    'manufacturing': manufacturingJson,
    'finance': financeJson,
    'retail': retailJson,
    'healthcare': healthcareJson,
    'hr': hrJson
};

industriesList.forEach(ind => {
    const jsonConfig = jsonConfigs[ind];

    if (jsonConfig) {
        // Update INDUSTRY_CONFIGS if JSON has KPIs
        if (jsonConfig.kpis || jsonConfig.templateKpis) {
            const kpis = jsonConfig.kpis || jsonConfig.templateKpis["0"]; // Default to first template KPIs
            INDUSTRY_CONFIGS[ind] = {
                name: jsonConfig.name,
                kpis: kpis.map((k: any) => ({
                    ...k,
                    keyMatch: new RegExp(k.keyMatch, 'i'),
                    icon: iconMap[k.icon] || BarChart3
                }))
            };
        }

        // Use JSON templates
        if (jsonConfig.templates) {
            TEMPLATE_VARIATIONS[ind] = jsonConfig.templates;
        }
    }

    if (!TEMPLATE_VARIATIONS[ind]) {
        if (ind === 'finance') {
            TEMPLATE_VARIATIONS[ind] = FINANCE_TEMPLATES;
        } else if (ind === 'crm' || ind === 'sfw crm') {
            TEMPLATE_VARIATIONS[ind] = CRM_TEMPLATES;
        } else {
            TEMPLATE_VARIATIONS[ind] = generateIndustryTemplates(capitalize(ind));
        }
    }
});

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const getIndustryKey = (industryName?: string): string => {
    let key = "retail";
    if (industryName) {
        const lowerInfo = industryName.toLowerCase();
        if (lowerInfo.includes('odoo')) key = 'odoo';
        else if (lowerInfo.includes('crm') || lowerInfo.includes('sfw')) key = 'crm';
        else if (lowerInfo.includes('retail')) key = 'retail';
        else if (lowerInfo.includes('sale')) key = 'sales';
        else if (lowerInfo.includes('market')) key = 'marketing';
        else if (lowerInfo.includes('manufact')) key = 'manufacturing';
        else if (lowerInfo.includes('finance')) key = 'finance';
        else if (lowerInfo.includes('health')) key = 'healthcare';
        else if (lowerInfo.includes('edu')) key = 'education';
        else if (lowerInfo.includes('logistic')) key = 'logistics';
        else if (lowerInfo.includes('real')) key = 'realestate';
        else if (lowerInfo.includes('hr') || lowerInfo.includes('people') || lowerInfo.includes('human')) key = 'hr';
        else if (lowerInfo.includes('it') || lowerInfo.includes('saas') || lowerInfo.includes('tech')) key = 'saas';
    }
    return key;
};

export const getTemplateCharts = (templateId: string, data: any[], industryName?: string): ChartRecommendation[] => {
    const indexStr = templateId.replace('template', '');
    const index = parseInt(indexStr) - 1 || 0;
    const safeIndex = Math.max(0, Math.min(index, 9));
    const key = getIndustryKey(industryName);
    let templates = TEMPLATE_VARIATIONS[key];
    if (!templates) {
        templates = generateIndustryTemplates(industryName || "General");
    }

    const selectedTemplate = templates[safeIndex] || templates[0];
    if (!data || data.length === 0) return selectedTemplate;

    const keys = Object.keys(data[0]);
    const numericKeys = keys.filter(k => {
        const val = data[0][k];
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)) && /^\d+(\.\d+)?$/.test(val));
    });
    const stringKeys = keys.filter(k => typeof data[0][k] === 'string' && !/id|date|url|email|uuid/i.test(k));
    const mainNumeric = numericKeys[0] || keys.find(k => /sales|total|amount|revenue|price|value|est_value/i.test(k)) || numericKeys[0];
    const secondNumeric = numericKeys[1] || numericKeys[0];
    const mainString = stringKeys[0] || keys.find(k => /name|type|category|brand|status/i.test(k)) || stringKeys[0];

    // CRM-specific column mapping for accurate chart generation
    const isCRM = key === 'crm' || key === 'sfw crm' || (industryName && industryName.toLowerCase().includes('crm'));
    
    let colMap: any;
    
    if (isCRM) {
        // CRM-specific exact column mappings based on SFW CRM schema
        colMap = {
            // Lead table columns
            'lead_status': keys.find(k => k === 'lead_status') || keys.find(k => /lead_status|status/i.test(k)) || mainString,
            'lead_source': keys.find(k => k === 'lead_source') || keys.find(k => /lead_source|source/i.test(k)) || mainString,
            'lead_stage': keys.find(k => k === 'lead_stage') || keys.find(k => /lead_stage|stage/i.test(k)) || mainString,
            'lead_owner': keys.find(k => k === 'lead_owner') || keys.find(k => /lead_owner|owner|sales_owner/i.test(k)) || mainString,
            'est_value': keys.find(k => k === 'est_value') || keys.find(k => /est_value|value|amount|total/i.test(k)) || mainNumeric,
            'industry': keys.find(k => k === 'industry') || mainString,
            
            // Customer table columns
            'contact_type': keys.find(k => k === 'contact_type') || keys.find(k => /contact_type|type/i.test(k)) || mainString,
            'source': keys.find(k => k === 'source') || keys.find(k => /source|lead_source/i.test(k)) || mainString,
            'status': keys.find(k => k === 'status') || keys.find(k => /status|lead_status/i.test(k)) || mainString,
            'country': keys.find(k => k === 'country') || mainString,
            'state': keys.find(k => k === 'state') || mainString,
            'city': keys.find(k => k === 'city') || mainString,
            
            // Company table columns
            'total_value': keys.find(k => k === 'total_value') || keys.find(k => /total_value|value|est_value/i.test(k)) || mainNumeric,
            'contact_count': keys.find(k => k === 'contact_count') || keys.find(k => /contact_count|count/i.test(k)) || mainNumeric,
            'size': keys.find(k => k === 'size') || mainString,
            'revenue': keys.find(k => k === 'revenue') || mainString,
            'name': keys.find(k => k === 'name' || k === 'lead_name' || k === 'company_name') || mainString,
            
            // Activity/Log columns
            'action': keys.find(k => k === 'action') || mainString,
            'performed_by': keys.find(k => k === 'performed_by') || keys.find(k => /performed_by|user|owner/i.test(k)) || mainString,
            'details': keys.find(k => k === 'details') || mainString,
            'created_at': keys.find(k => k === 'created_at') || keys.find(k => /created_at|date|time/i.test(k)) || mainString,
            
            // Product/Quotation columns
            'category_name': keys.find(k => k === 'category_name') || keys.find(k => /category/i.test(k)) || mainString,
            'base_price': keys.find(k => k === 'base_price') || keys.find(k => /price|cost/i.test(k)) || mainNumeric,
            'total_amount': keys.find(k => k === 'total_amount') || keys.find(k => /total|amount/i.test(k)) || mainNumeric,
            
            // Generic mappings
            'count': '_count_', // Special marker for count aggregation
            'rate': keys.find(k => /rate|percentage|score/i.test(k)) || mainNumeric,
            'score': keys.find(k => /score|rating/i.test(k)) || mainNumeric,
            'value': keys.find(k => /value|amount|total|est_value/i.test(k)) || mainNumeric,
        };
    } else {
        // Standard column mapping for non-CRM data
        colMap = {
            'sales': numericKeys.find(k => /sales|revenue|amount|income/i.test(k)) || mainNumeric,
            'profit': numericKeys.find(k => /profit|net|margin|ebitda/i.test(k)) || secondNumeric || mainNumeric,
            'cost': numericKeys.find(k => /cost|expense|spend|overhead/i.test(k)) || secondNumeric || mainNumeric,
            'count': numericKeys.find(k => /count|qty|quantity|headcount|req/i.test(k)) || secondNumeric || mainNumeric,
            'rate': numericKeys.find(k => /rate|ratio|percentage|churn|attrition|occupancy|cvr|roi/i.test(k)) || numericKeys.find(k => /%/i.test(k)) || secondNumeric || mainNumeric,
            'score': numericKeys.find(k => /score|rating|index|nps|csat|quality/i.test(k)) || secondNumeric || mainNumeric,
            'time': numericKeys.find(k => /time|days|hours|minutes|duration|period|tenure|lead/i.test(k)) || secondNumeric || mainNumeric,
            'value': numericKeys[0] || mainNumeric,
            'date': keys.find(k => /date|time|day|period|month|year/i.test(k)) || mainString,
            'category': keys.find(k => /category|type|group|status|segment|sector/i.test(k)) || mainString,
            'region': keys.find(k => /region|city|state|location|market|country/i.test(k)) || mainString,
            'product': keys.find(k => /product|item|sku|description/i.test(k)) || mainString,
            'department': keys.find(k => /department|dept|division|team/i.test(k)) || mainString,
            'vendor': keys.find(k => /vendor|supplier|manufacturer|brand/i.test(k)) || mainString,
            'source': keys.find(k => /source|channel|platform/i.test(k)) || mainString
        };
    }

    return selectedTemplate.map((chart, index) => {
        let x = colMap[chart.x_axis as string] || chart.x_axis;
        let y: string | string[];
        if (Array.isArray(chart.y_axis)) {
            y = chart.y_axis.map(ya => (colMap[ya as string] || ya) as string);
        } else {
            y = (colMap[chart.y_axis as string] || chart.y_axis) as string;
        }

        if (!x || !keys.includes(x)) x = mainString;

        if (Array.isArray(y)) {
            y = y.filter(ya => keys.includes(ya));
            if (y.length === 0) y = [mainNumeric];
        } else {
            if (!y || !keys.includes(y)) y = mainNumeric;
        }

        let palette = chart.colorPalette;
        if (key === 'hr') {
            if (Array.isArray(y) && y.length > 1) {
                palette = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
            } else {
                palette = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];
            }
        }
        if (key === 'manufacturing') {
            const mod = index % 3;
            if (mod === 0) {
                // Blue
                palette = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];
            } else if (mod === 1) {
                // Green (Emerald)
                palette = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
            } else {
                // Violet
                palette = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];
            }
        }

        return {
            ...chart,
            x_axis: x,
            y_axis: y,
            x_label: chart.x_label,
            y_label: chart.y_label,
            colorPalette: palette
        };
    });
};

export const getTemplateCount = (industryName?: string): number => {
    const key = getIndustryKey(industryName);
    return TEMPLATE_VARIATIONS[key]?.length || 10;
};

export const getTemplateKpis = (templateId: string, industryName?: string) => {
    const key = getIndustryKey(industryName);

    const jsonConfig = jsonConfigs[key];
    if (jsonConfig && jsonConfig.templateKpis) {
        const indexStr = templateId.replace('template', '');
        const index = (parseInt(indexStr) - 1) || 0;
        const kpis = jsonConfig.templateKpis[String(index)] || jsonConfig.templateKpis["0"];
        return kpis.map((k: any) => ({
            ...k,
            keyMatch: new RegExp(k.keyMatch, 'i'),
            icon: iconMap[k.icon] || BarChart3
        }));
    }

    return INDUSTRY_CONFIGS[key]?.kpis || [];
};
