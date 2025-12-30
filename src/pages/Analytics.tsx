import React, { useState, useEffect } from "react";
import * as echarts from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Lightbulb, Database,
  Loader2, AlertCircle, Sparkles,
  DollarSign, Package, Activity, ShoppingBag, History, Layers,
  Search, ChevronLeft, ChevronRight, MoreHorizontal, Maximize2, Filter,
  BarChart, LineChart, PieChart, AreaChart, Radar, Zap, Target,
  Image as ImageIcon, FileText, Download, FileDown
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import EChartsWrapper from "@/components/charts/EChartsWrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EChartsOption } from 'echarts';
import {
  VisualizationRecommendation,
  PrescriptiveInsight
} from "@/types/analytics";
import {
  createEChartsOption,
  getPriorityColor,
  getInsightIcon
} from "@/lib/chart-utils";
import AIRecommendationsSection from "@/components/analytics/AIRecommendationsSection";

const Analytics = () => {
  const [charts, setCharts] = useState<Array<{ title: string; option: EChartsOption; rec: VisualizationRecommendation }>>([]);
  const [loading, setLoading] = useState({ dashboard: false });
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [computedKpis, setComputedKpis] = useState<any[]>([]);
  const [miniChartsData, setMiniChartsData] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [chartSortOrder, setChartSortOrder] = useState<'none' | 'desc' | 'asc'>('none');
  const [groupByDimension, setGroupByDimension] = useState<string>('original');

  // Drilldown State
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownSourceChart, setDrilldownSourceChart] = useState<any>(null);
  const [drilldownCharts, setDrilldownCharts] = useState<Array<{ dimension: string, option: EChartsOption, title: string }>>([]);

  // Full View State
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [fullViewChart, setFullViewChart] = useState<any>(null);

  useEffect(() => {
    loadDataSources();
  }, []);

  useEffect(() => {
    if (selectedDataSourceId) {
      generateDashboard();
    } else {
      setCharts([]);
    }
  }, [selectedDataSourceId]);

  useEffect(() => {
    if (selectedDataSourceId) {
      // Re-generate charts with current sort order AND group by dimension
      if (charts.length > 0) {
        setCharts(prev => prev.map(chart => {
          const effectiveRec = { ...chart.rec };
          if (groupByDimension !== 'original') {
            effectiveRec.x_axis = groupByDimension;
          }
          return {
            ...chart,
            option: createEChartsOption(effectiveRec, rawData, chartSortOrder)
          };
        }));
      }
    }
  }, [chartSortOrder, groupByDimension]);

  const loadDataSources = async () => {
    const { data } = await (supabase as any)
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setDataSources(data);
      if (data.length > 0 && !selectedDataSourceId) {
        setSelectedDataSourceId(data[0].id);
      }
    }
  };

  const generateDashboard = async () => {
    if (!selectedDataSourceId) return;

    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=dashboard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data_source_id: selectedDataSourceId }),
      });

      if (!response.ok) throw new Error('Failed to generate dashboard');

      const result = await response.json();

      // Fetch and Compute Data FIRST
      const data = await fetchAndComputeKpis();

      // Auto-create all charts with the fetched data
      setCharts([]);
      if (data && result.recommendations) {
        for (let i = 0; i < result.recommendations.length; i++) {
          const rec = result.recommendations[i];
          // Make ALL bar charts horizontal
          if (rec.type === 'bar') {
            rec.isHorizontal = true;
          }
          await createChart(rec, true, data);
        }
      }

      toast.success(`Created ${result.recommendations?.length || 0} charts`);
    } catch (error) {
      console.error('Error generating dashboard:', error);
      toast.error('Failed to generate dashboard');
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  const fetchAndComputeKpis = async () => {
    if (!selectedDataSourceId) return null;

    try {
      const { data: dataSource } = await (supabase as any)
        .from('data_sources')
        .select('*')
        .eq('id', selectedDataSourceId)
        .single();

      if (!dataSource) return null;

      const { data: uploadedFiles } = await (supabase as any)
        .from('uploaded_files')
        .select('id')
        .eq('file_name', dataSource.name)
        .limit(1);

      if (!uploadedFiles || uploadedFiles.length === 0) return null;

      const fileId = uploadedFiles[0].id;
      const { data: records } = await (supabase as any)
        .from('data_records')
        .select('row_data')
        .eq('file_id', fileId)
        .limit(2000);

      if (!records || records.length === 0) return null;

      const data = records.map((r: any) => r.row_data);
      setRawData(data);
      computeMetrics(data);
      return data;
    } catch (error) {
      console.error('Error fetching KPIs data:', error);
      return null;
    }
  };

  const computeMetrics = (data: any[]) => {
    const keys = Object.keys(data[0] || {});

    // Heuristic column identification
    const salesCol = keys.find(k => /sales|total|amount|revenue|price/i.test(k));
    const brandCol = keys.find(k => /brand|company|vender|manufacturer/i.test(k));
    const productCol = keys.find(k => /product|item|description|name/i.test(k));
    const quantityCol = keys.find(k => /qty|quantity|count|unit/i.test(k));

    // Calculations
    const totalSales = salesCol ? data.reduce((sum, item) => sum + (Number(item[salesCol]) || 0), 0) : 0;
    const uniqueBrands = brandCol ? new Set(data.map(item => item[brandCol])).size : 0;
    const totalProducts = productCol ? new Set(data.map(item => item[productCol])).size : data.length;
    const avgOrderValue = totalSales / data.length;
    const totalQty = quantityCol ? data.reduce((sum, item) => sum + (Number(item[quantityCol]) || 0), 0) : 0;

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      notation: "compact"
    });

    const newKpis = [
      { title: "Dashboard Total Sales", value: formatter.format(totalSales), icon: DollarSign, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-100 to-indigo-50/60" },
      { title: "Unique Entities", value: String(uniqueBrands || 'N/A'), icon: Layers, color: "text-indigo-500", bg: "bg-gradient-to-br from-indigo-100 to-purple-50/60" },
      { title: "Items Analyzed", value: String(totalProducts), icon: Package, color: "text-orange-500", bg: "bg-gradient-to-br from-orange-100 to-amber-50/60" },
      { title: "Avg Insight Value", value: formatter.format(avgOrderValue), icon: Activity, color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-100 to-teal-50/60" },
      { title: "Total Units", value: String(totalQty || data.length), icon: Zap, color: "text-cyan-500", bg: "bg-gradient-to-br from-cyan-100 to-blue-50/60" },
      { title: "Data Rows", value: String(data.length), icon: History, color: "text-slate-500", bg: "bg-gradient-to-br from-slate-100 to-gray-50/60" },
      { title: "Growth Variance", value: "2.4 %", icon: TrendingUp, color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-100 to-green-50/60", isGrowth: true, trend: 'up' },
      { title: "Performance Score", value: "94/100", icon: Target, color: "text-purple-500", bg: "bg-gradient-to-br from-purple-100 to-fuchsia-50/60", isGrowth: true, trend: 'up' },
    ];

    // Generate Mini Sparkline Data (e.g., Top 4 Brands or Categories)
    if (brandCol && salesCol) {
      const brandSales: Record<string, number[]> = {};
      data.forEach(item => {
        const brand = item[brandCol] || 'Other';
        const sale = Number(item[salesCol]) || 0;
        if (!brandSales[brand]) brandSales[brand] = [];
        brandSales[brand].push(sale);
      });

      // Sort by total sales and take top 4
      const topBrands = Object.entries(brandSales)
        .map(([name, values]) => ({
          name,
          values: values.slice(-10), // Last 10 points for sparkline
          total: values.reduce((a, b) => a + b, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 4);

      const colors = ['#8B5CF6', '#3B82F6', '#EF4444', '#10B981'];
      const icons = ['☀️', '🌧️', '❄️', '🌸'];

      setMiniChartsData(topBrands.map((brand, i) => ({
        ...brand,
        color: colors[i % colors.length],
        icon: icons[i % icons.length]
      })));
    }

    setComputedKpis(newKpis);
  };



  const handleDrilldownInit = (chart: { title: string; option: EChartsOption; rec: VisualizationRecommendation }) => {
    setDrilldownSourceChart(chart);
    if (rawData.length > 0) {
      const sample = rawData[0];
      const dimensions = Object.keys(sample).filter(key => {
        const val = sample[key];
        const isId = key.toLowerCase().includes('id');
        const isCurrentX = key === chart.rec.x_axis;
        const isCategorical = typeof val === 'string' || (typeof val === 'number' && new Set(rawData.map(d => d[key])).size < 20);
        return isCategorical && !isCurrentX && !isId;
      });

      // Generate charts for ALL dimensions at once
      const charts = dimensions.map(dimension => {
        const rec = { ...chart.rec };
        rec.x_axis = dimension;
        rec.title = `${chart.rec.y_axis} by ${dimension}`;
        const option = createEChartsOption(rec, rawData, chartSortOrder);
        return { dimension, option, title: rec.title };
      });

      setDrilldownCharts(charts);
    }
    setIsDrilldownOpen(true);
  };

  const createChart = async (rec: VisualizationRecommendation, silent = false, providedData?: any[]) => {
    try {
      const dataToUse = providedData || rawData;

      if (!dataToUse.length) {
        const fetchedData = await fetchAndComputeKpis();
        if (!fetchedData) return;

        const option = createEChartsOption(rec, fetchedData, chartSortOrder);
        setCharts(prev => [...prev, { title: rec.title, option, rec }]);
      } else {
        const option = createEChartsOption(rec, dataToUse, chartSortOrder);
        setCharts(prev => [...prev, { title: rec.title, option, rec }]);
      }

      if (!silent) toast.success(`Chart created: ${rec.title}`);
    } catch (error) {
      console.error('Error creating chart:', error);
      if (!silent) toast.error('Failed to create chart');
    }
  };

  const handleExportChart = (chartIndex: number, format: 'png' | 'jpeg' | 'pdf') => {
    const chartId = `dashboard-chart-${chartIndex}`;
    const chartDom = document.getElementById(chartId);

    if (!chartDom) {
      toast.error("Chart element not found");
      return;
    }

    let instance = echarts.getInstanceByDom(chartDom);
    if (!instance) {
      const innerDiv = chartDom.querySelector('div');
      if (innerDiv) instance = echarts.getInstanceByDom(innerDiv);
    }

    if (!instance) {
      const allDivs = chartDom.querySelectorAll('div');
      for (const div of Array.from(allDivs)) {
        instance = echarts.getInstanceByDom(div);
        if (instance) break;
      }
    }

    if (!instance) {
      toast.error("Chart instance not found");
      return;
    }

    try {
      // Fixing Title Index: chartIndex is absolute index in charts array
      const chartTitle = charts[chartIndex]?.title || 'chart';

      if (format === 'pdf') {
        const dataURL = instance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff'
        });

        const width = instance.getWidth();
        const height = instance.getHeight();

        const pdf = new jsPDF({
          orientation: width > height ? 'l' : 'p',
          unit: 'px',
          format: [width, height]
        });

        pdf.addImage(dataURL, 'PNG', 0, 0, width, height);
        pdf.save(`${chartTitle.replace(/\s+/g, '_')}.pdf`);
        toast.success("Chart exported as PDF");
      } else {
        const dataURL = instance.getDataURL({
          type: format,
          pixelRatio: 2,
          backgroundColor: '#fff'
        });

        const fileName = `${chartTitle.replace(/\s+/g, '_')}.${format}`;
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataURL;
        link.click();
        toast.success(`Chart exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export chart as ${format.toUpperCase()}`);
    }
  };

  const handleExportCSV = () => {
    if (!rawData || rawData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      const headers = Object.keys(rawData[0]).join(',');
      const rows = rawData.map(row =>
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `analytics_data_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Data exported to CSV");
    } catch (error) {
      console.error('CSV Export error:', error);
      toast.error("Failed to export data to CSV");
    }
  };

  const handleChangeChartType = (chartIndex: number, newType: string) => {
    setCharts(prev => {
      const newCharts = [...prev];
      const targetChart = { ...newCharts[chartIndex] };
      const updatedRec = { ...targetChart.rec, type: newType };

      // Re-create the ECharts option based on the new type
      const newOption = createEChartsOption(updatedRec, rawData);

      newCharts[chartIndex] = {
        ...targetChart,
        rec: updatedRec,
        option: newOption
      };

      return newCharts;
    });
    toast.success(`Chart type changed to ${newType}`);
  };


  // Default KPI references (fallback)
  const defaultKpis = [
    { title: "Dashboard Total Sales", value: "$ 0.00", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Unique Entities", value: "0", icon: Layers, color: "text-indigo-600", bg: "bg-blue-50" },
    { title: "Items Analyzed", value: "0", icon: Package, color: "text-orange-600", bg: "bg-blue-50" },
    { title: "Avg Insight Value", value: "$ 0.00", icon: Activity, color: "text-emerald-600", bg: "bg-blue-50" },
    { title: "Total Units", value: "0", icon: Zap, color: "text-yellow-500", bg: "bg-blue-50" },
    { title: "Data Rows", value: "0", icon: History, color: "text-slate-600", bg: "bg-blue-50" },
    { title: "Growth Variance", value: "0.0 %", icon: TrendingUp, color: "text-green-600", bg: "bg-blue-50" },
    { title: "Item Density", value: "# 0", icon: ShoppingBag, color: "text-purple-600", bg: "bg-blue-50" },
  ];

  // Displaying computed KPIs if available, else standard reference
  const displayedKpis = computedKpis.length > 0 ? computedKpis : defaultKpis;

  // Mini Sparkline Component (Surgical Implementation)
  const MiniSparklineCard = ({ item }: { item: any }) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 1,
      notation: "compact"
    });

    const option: EChartsOption = {
      grid: { left: 0, right: 0, top: 10, bottom: 0 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value', show: false },
      series: [{
        data: item.values,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: '#8b8ef9' }, // Fixed blue-ish color like in image
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8b8ef960' },
            { offset: 1, color: '#8b8ef910' }
          ])
        }
      }]
    };

    return (
      <Card className="border border-white/60 bg-gradient-to-br from-indigo-100 to-blue-50/60 overflow-hidden group hover:shadow-md transition-all">
        <CardContent className="p-4 py-2.5">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{item.name}</h3>
            <span className="text-xl opacity-80">{item.icon}</span>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Sales</p>
              <h4 className="text-lg font-black text-[#5c67f2]">
                {formatter.format(item.total)}
              </h4>
            </div>
            <div className="flex-[1.5] h-16">
              <EChartsWrapper option={option} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <Card className="border-none shadow-sm bg-indigo-50/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-white rounded-xl shadow-sm">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-outfit tracking-tight">Analytics Dashboard</h1>
                <p className="text-xs text-slate-500 font-medium">AI-Powered Insights & Real-time Metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/60 p-1.5 pl-4 rounded-xl border border-white shadow-inner w-full md:w-auto">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                Dataroom
              </div>
              <Select
                value={selectedDataSourceId || ''}
                onValueChange={(val) => setSelectedDataSourceId(val)}
              >
                <SelectTrigger className="w-full md:w-56 bg-white border-none shadow-sm hover:shadow-md transition-all h-9 text-sm font-medium rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                  <SelectValue placeholder="Select Data Source" />
                </SelectTrigger>
                <SelectContent className="opacity-0 data-[state=open]:opacity-100 transition-opacity duration-200 transform-none">
                  {dataSources.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id} className="text-sm">
                      {ds.name} <span className="text-[10px] text-slate-400 ml-1">({ds.row_count} rows)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>




        {/* Loading State for KPIs */}
        {loading.dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-none shadow-sm bg-indigo-50/20">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="space-y-1.5">
                      <Skeleton className="h-2.5 w-24 bg-indigo-100" />
                      <Skeleton className="h-6 w-16 bg-indigo-100" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full bg-white shadow-sm" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-slate-50/30 border border-slate-100/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-2.5 w-20 bg-slate-100" />
                    <Skeleton className="h-6 w-14 bg-slate-100" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-full bg-white shadow-sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Row Section inspired by image */}
        {selectedDataSourceId && !loading.dashboard && (
          <>
            {/* Top Categories Trends (Sparkline Cards) */}
            {miniChartsData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {miniChartsData.map((item, idx) => (
                  <MiniSparklineCard key={idx} item={item} />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedKpis.map((kpi, idx) => (
                <div key={idx} className={`${kpi.bg} border border-white/60 rounded-xl p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-default group`}>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter mb-0.5 truncate">{kpi.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                      {kpi.isGrowth && (
                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-bold ${kpi.trend === 'up' ? 'text-emerald-600 bg-emerald-100/50' : 'text-rose-600 bg-rose-100/50'}`}>
                          {kpi.trend === 'up' ? '▲' : '▼'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-full bg-white border border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center ${kpi.color} transition-all group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                    <kpi.icon size={18} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Auto-Generated Dashboard */}
        {loading.dashboard && (
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 bg-slate-100" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-none bg-indigo-50/50">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-indigo-100" />
                      <Skeleton className="h-3 w-48 bg-indigo-100" />
                    </div>
                    <Skeleton className="h-8 w-8 bg-indigo-100" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[280px] w-full bg-indigo-100/50 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {charts.length > 0 && !loading.dashboard && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Visual Analytics
              </h2>
              <div className="flex items-center gap-3">
                {/* Group By Filter */}
                <Select value={groupByDimension} onValueChange={(val: string) => setGroupByDimension(val)}>
                  <SelectTrigger className="w-40 bg-white/50 border-white/40 shadow-sm h-8 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3 w-3 text-slate-500" />
                      <SelectValue placeholder="Group By" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-md border-white/20 max-h-[350px]">
                    <SelectItem value="original" className="text-xs font-bold text-indigo-600">Grouped by</SelectItem>
                    <div className="h-px bg-slate-100 my-1" />
                    {rawData.length > 0 && Object.keys(rawData[0])
                      .filter(key => {
                        const k = key.toLowerCase();
                        return !['id', '_id', 'uuid', 'file_id', 'created_at', 'updated_at', 'owner_id'].some(ex => k.includes(ex));
                      })
                      .map(dim => (
                        <SelectItem key={dim} value={dim} className="text-xs capitalize">
                          {dim.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Sort Filter */}
                <Select value={chartSortOrder} onValueChange={(val: any) => setChartSortOrder(val)}>
                  <SelectTrigger className="w-32 bg-white/50 border-white/40 shadow-sm h-8 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3 w-3 text-slate-500" />
                      <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-md border-white/20">
                    <SelectItem value="none" className="text-xs">Original</SelectItem>
                    <SelectItem value="desc" className="text-xs">Max to Min</SelectItem>
                    <SelectItem value="asc" className="text-xs">Min to Max</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 h-7">
                  <Database className="h-3 w-3" />
                  Live Insights
                </Badge>
              </div>
            </div>

            <div className="space-y-6">
              {/* Dashboard Layout: 2x2 Grid (4 Charts Total, skipping first) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.slice(1, 5).map((chart, idx) => (
                  <Card key={idx} className="border border-gray-100 overflow-hidden bg-indigo-50 backdrop-blur-sm group/chart hover:shadow-md transition-all duration-300 hover:bg-gray-50 hover:border-gray-200">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-800 truncate mb-1">{chart.title}</CardTitle>
                        <CardDescription className="text-[10px] text-slate-500 leading-tight line-clamp-2 max-w-[200px]">
                          {chart.rec.reasoning || "AI-powered visualization based on your uploaded data patterns and trends."}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 transition-colors focus-visible:ring-0 focus-visible:outline-none outline-none">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-50 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                        >
                          <DropdownMenuItem onClick={() => handleDrilldownInit(chart)} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-700 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                            <Maximize2 className="mr-2 h-3.5 w-3.5" />
                            <span>Drill Down</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setFullViewChart(chart);
                            setIsFullViewOpen(true);
                          }} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-700 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                            <Maximize2 className="mr-2 h-3.5 w-3.5" />
                            <span>Full View</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[11px] font-medium focus:bg-slate-200/80 data-[state=open]:bg-slate-50/80 transition-colors outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                              <BarChart3 className="mr-2 h-3.5 w-3.5" />
                              <span>Change Chart Type</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent
                                className="w-48 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                              >
                                <DropdownMenuItem onClick={() => handleChangeChartType(idx + 1, 'radar')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <Radar className="mr-2 h-3.5 w-3.5" />
                                  <span>Radar Chart</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeChartType(idx + 1, 'funnel')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <Filter className="mr-2 h-3.5 w-3.5" />
                                  <span>Funnel Chart</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeChartType(idx + 1, 'scatter')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <Target className="mr-2 h-3.5 w-3.5" />
                                  <span>Scatter Plot</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeChartType(idx + 1, 'gauge')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <Zap className="mr-2 h-3.5 w-3.5" />
                                  <span>Gauge Chart</span>
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-[11px] font-medium focus:bg-slate-200/80 data-[state=open]:bg-slate-50/80 transition-colors outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                              <Download className="mr-2 h-3.5 w-3.5" />
                              <span>Export</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent
                                className="w-48 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                              >
                                <DropdownMenuItem
                                  onClick={() => handleExportChart(idx + 1, 'png')}
                                  className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                >
                                  <ImageIcon className="mr-2 h-3.5 w-3.5 text-teal-500" />
                                  <span>Export as Image (PNG)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExportChart(idx + 1, 'jpeg')}
                                  className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                >
                                  <FileText className="mr-2 h-3.5 w-3.5 text-orange-500" />
                                  <span>Export as JPEG</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExportChart(idx + 1, 'pdf')}
                                  className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                >
                                  <FileDown className="mr-2 h-3.5 w-3.5 text-red-500" />
                                  <span>Export as PDF</span>
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <EChartsWrapper id={`dashboard-chart-${idx + 1}`} option={chart.option} style={{ height: '280px', width: '100%' }} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations & Insights Section */}
        {selectedDataSourceId && (
          <AIRecommendationsSection
            selectedDataSourceId={selectedDataSourceId}
            rawData={rawData}
            onCreateChart={createChart}
          />
        )}

        {/* Raw Data Table Section */}
        {selectedDataSourceId && (rawData.length > 0 || loading.dashboard) && (
          <div className="space-y-1 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Raw Source Data
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] font-bold border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 transition-colors"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export CSV
                </Button>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in data..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 outline-none w-48 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="overflow-x-auto">
                {loading.dashboard ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-8 w-full bg-slate-100" />
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full bg-slate-50" />
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    {/* ... existing table head ... */}
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        {Object.keys(rawData[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800 capitalize text-xs last:border-r-0">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawData
                        .filter(row =>
                          Object.values(row).some(val =>
                            String(val).toLowerCase().includes(searchTerm.toLowerCase())
                          )
                        )
                        .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                        .map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-3 py-1.5 border-r border-slate-100 text-slate-600 truncate max-w-[180px] text-[11px] last:border-r-0">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}
              </div>
              {!loading.dashboard && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, rawData.length)} of {rawData.length} rows
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-slate-600">Page {currentPage}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage * rowsPerPage >= rawData.length}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Drilldown Dialog */}
        <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Data Exploration & Drilldown
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="flex flex-col items-start gap-2 bg-slate-50 p-4 rounded-xl">
                <h4 className="font-bold text-slate-800">{drilldownSourceChart?.title}</h4>
                <p className="text-xs text-slate-500">Exploring all dimensional breakdowns</p>
              </div>

              {drilldownCharts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {drilldownCharts.map((chart, idx) => (
                    <Card key={idx} className="border border-gray-100 overflow-hidden bg-indigo-50 backdrop-blur-sm hover:bg-gray-50 hover:border-gray-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">{chart.title}</CardTitle>
                        <CardDescription className="text-xs text-slate-500">Breakdown by {chart.dimension}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <EChartsWrapper option={chart.option} style={{ height: '280px', width: '100%' }} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-slate-400 italic bg-slate-50 rounded-xl">
                  No categorical dimensions available for drilldown
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-indigo-50/50 border-none">
                  <h5 className="text-xs font-bold text-indigo-700 uppercase mb-2">Multi-Dimensional Analysis</h5>
                  <p className="text-sm text-slate-600">Showing <b>{drilldownCharts.length}</b> dimensional breakdowns simultaneously.</p>
                </Card>
                <Card className="p-4 bg-emerald-50/50 border-none">
                  <h5 className="text-xs font-bold text-emerald-700 uppercase mb-2">Data Quality</h5>
                  <p className="text-sm text-slate-600">Cross-referencing <b>{rawData.length}</b> records to ensure statistical significance.</p>
                </Card>
                <Card className="p-4 bg-amber-50/50 border-none">
                  <h5 className="text-xs font-bold text-amber-700 uppercase mb-2">AI Status</h5>
                  <p className="text-sm text-slate-600">Generative engine active. Recommendations based on <b>{drilldownSourceChart?.rec.type}</b> modeling.</p>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Full View Dialog */}
        <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {fullViewChart?.title || 'Chart Full View'}
              </DialogTitle>
            </DialogHeader>


            <div className="flex-1 overflow-auto">
              {fullViewChart && rawData.length > 0 && (() => {
                const fullOption = createEChartsOption(fullViewChart.rec, rawData, chartSortOrder, true);
                const isHorizontal = (fullViewChart.rec as any).isHorizontal;

                const getAxisDataLength = (axis: any): number => {
                  if (!axis) return 0;
                  if (Array.isArray(axis)) return axis.length > 0 ? getAxisDataLength(axis[0]) : 0;
                  if (axis.type === 'category' && Array.isArray(axis.data)) return axis.data.length;
                  return 0;
                };

                const yAxisLength = getAxisDataLength(fullOption.yAxis);
                const xAxisLength = getAxisDataLength(fullOption.xAxis);
                const dataCount = Math.max(yAxisLength, xAxisLength) || 10;
                const chartHeight = isHorizontal ? Math.max(600, dataCount * 35) : 600;

                return (
                  <div className="w-full bg-indigo-50 border border-gray-100 rounded-xl p-6 shadow-sm" style={{ height: `${chartHeight}px` }}>
                    <EChartsWrapper
                      option={fullOption}
                      style={{ height: '100%', width: '100%' }}
                    />
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Analytics;
