import { useState, useEffect } from "react";
import * as echarts from 'echarts';
import type { XAXisOption, YAXisOption, SeriesOption } from 'echarts/types/dist/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Lightbulb, Database,
  Loader2, AlertCircle, Sparkles, RefreshCw, Target, Zap,
  DollarSign, Package, Activity, ShoppingBag, History, Layers,
  Search, ChevronLeft, ChevronRight, MoreHorizontal, Maximize2, Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { EChartsOption } from 'echarts';

interface VisualizationRecommendation {
  type: string;
  title: string;
  x_axis: string;
  y_axis: string | string[];
  reasoning?: string;
  priority: 'high' | 'medium' | 'low';
}

interface PrescriptiveInsight {
  type: string;
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

const Analytics = () => {
  const [aiRecommendations, setAiRecommendations] = useState<VisualizationRecommendation[]>([]);
  const [prescriptiveInsights, setPrescriptiveInsights] = useState<PrescriptiveInsight[]>([]);
  const [charts, setCharts] = useState<Array<{ title: string; option: EChartsOption; rec: VisualizationRecommendation }>>([]);
  const [loading, setLoading] = useState({ dashboard: false, ai: false, prescriptive: false });
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [computedKpis, setComputedKpis] = useState<any[]>([]);
  const [miniChartsData, setMiniChartsData] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

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
      generateAIRecommendations();
      generatePrescriptiveAnalytics();
    } else {
      setCharts([]);
      setAiRecommendations([]);
      setPrescriptiveInsights([]);
    }
  }, [selectedDataSourceId]);

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
      { title: "Dashboard Total Sales", value: formatter.format(totalSales), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
      { title: "Unique Entities", value: String(uniqueBrands || 'N/A'), icon: Layers, color: "text-indigo-600", bg: "bg-blue-50" },
      { title: "Items Analyzed", value: String(totalProducts), icon: Package, color: "text-orange-600", bg: "bg-blue-50" },
      { title: "Avg Insight Value", value: formatter.format(avgOrderValue), icon: Activity, color: "text-emerald-600", bg: "bg-blue-50" },
      { title: "Total Units", value: String(totalQty || data.length), icon: Zap, color: "text-yellow-500", bg: "bg-blue-50" },
      { title: "Data Rows", value: String(data.length), icon: History, color: "text-slate-600", bg: "bg-blue-50" },
      { title: "Growth Variance", value: "2.4 %", icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50", isGrowth: true, trend: 'up' },
      { title: "Performance Score", value: "94/100", icon: Target, color: "text-purple-600", bg: "bg-purple-50", isGrowth: true, trend: 'up' },
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

  const generateAIRecommendations = async () => {
    if (!selectedDataSourceId) return;

    setLoading(prev => ({ ...prev, ai: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=ai_recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data_source_id: selectedDataSourceId }),
      });

      if (!response.ok) throw new Error('Failed to generate AI recommendations');

      const result = await response.json();
      setAiRecommendations(result.recommendations || []);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      toast.error('Failed to generate AI recommendations');
    } finally {
      setLoading(prev => ({ ...prev, ai: false }));
    }
  };

  const generatePrescriptiveAnalytics = async () => {
    if (!selectedDataSourceId) return;

    setLoading(prev => ({ ...prev, prescriptive: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=prescriptive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data_source_id: selectedDataSourceId }),
      });

      if (!response.ok) throw new Error('Failed to generate prescriptive analytics');

      const result = await response.json();
      setPrescriptiveInsights(result.insights || []);
    } catch (error) {
      console.error('Error generating prescriptive analytics:', error);
      toast.error('Failed to generate prescriptive analytics');
    } finally {
      setLoading(prev => ({ ...prev, prescriptive: false }));
    }
  };

  const createEChartsOption = (rec: VisualizationRecommendation, data: any[], isFullView: boolean = false): EChartsOption => {
    const chartType = rec.type || 'bar';

    // Base options for a bright/clean look with background color
    const baseOption: EChartsOption = {
      backgroundColor: '#F8FAFC', // Light blue-gray background
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E8F0',
        textStyle: { color: '#1E293B' },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#64748B',
            color: '#FFFFFF'
          }
        },
        borderWidth: 1,
        padding: [8, 12],
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 6px;'
      },
      grid: {
        left: '12%',
        right: '5%',
        bottom: '25%',
        top: '30px',
        containLabel: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowBlur: 8,
        shadowOffsetY: 2
      },
      color: ['#0EA5E9', '#8B5CF6', '#F43F5E', '#10B981', '#F59E0B'],
      textStyle: {
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
        color: '#1E293B'
      }
    };

    if (chartType === 'gauge') {
      const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
      const values = data.map(d => Number(d[yAxis]) || 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);

      return {
        ...baseOption,
        series: [{
          type: 'gauge',
          center: ['50%', '60%'],
          radius: '85%',
          data: [{ value: Math.round(avg), name: String(yAxis) }],
          max: Math.round(max * 1.2),
          pointer: { itemStyle: { color: 'auto' }, width: 4 },
          detail: {
            formatter: (val: number) => `{value|${val}}{unit|%}`,
            offsetCenter: [0, '50%'],
            rich: {
              value: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
              unit: { fontSize: 12, color: '#64748B', padding: [0, 0, 4, 2] }
            }
          }
        }]
      };
    }

    if (chartType === 'pie') {
      const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
      const grouped = data.reduce((acc: any, item) => {
        const key = String(item[rec.x_axis]);
        const value = Number(item[yAxis]) || 0;
        acc[key] = (acc[key] || 0) + value;
        return acc;
      }, {});

      let pieData = Object.entries(grouped)
        .map(([name, value]) => ({
          name,
          value: Number(value)
        }))
        .sort((a, b) => b.value - a.value);

      // Apply Top 10 + Others in dashboard mode
      if (!isFullView && pieData.length > 10) {
        const top10 = pieData.slice(0, 10);
        const others = pieData.slice(10);
        const othersSum = others.reduce((sum, item) => sum + item.value, 0);
        pieData = [...top10, { name: 'Others', value: othersSum }];
      }

      return {
        ...baseOption,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: isFullView ? ['40%', '75%'] : ['45%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {d}%',
            fontSize: 10,
            color: '#64748B',
          },
          labelLine: { show: true, length: 10, length2: 10 },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' }
          },
          data: pieData
        }]
      };
    }

    if (chartType === 'scatter') {
      const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
      const scatterData = data.map(d => [Number(d[rec.x_axis]) || 0, Number(d[yAxis]) || 0]);

      return {
        ...baseOption,
        xAxis: {
          name: rec.x_axis,
          nameLocation: 'middle',
          nameGap: 40,  // Increased gap to move the label further down
          nameTextStyle: {
            color: '#64748B',
            fontSize: 12,
            fontWeight: 500,
            padding: [25, 0, 0, 0]  // Added padding to push the label down
          },
          splitLine: { lineStyle: { color: '#F1F5F9' } },
          axisLabel: {
            color: '#64748B',
            rotate: 35,
            fontSize: 10,
            interval: 0,
            margin: 15
          }
        },
        yAxis: {
          name: String(yAxis),
          splitLine: { lineStyle: { color: '#F1F5F9' } },
          axisLabel: { color: '#64748B' }
        },
        series: [{
          type: 'scatter',
          data: scatterData,
          symbolSize: 10,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#0EA5E9' },
              { offset: 1, color: '#8B5CF6' }
            ])
          }
        }]
      };
    }

    if (chartType === 'area') {
      const xData = data.map(d => String(d[rec.x_axis]));
      const yAxisArray = Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis];
      const series = yAxisArray.map((yCol: string) => ({
        name: yCol,
        type: 'line' as const,
        smooth: true,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.3,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(14, 165, 233, 0.5)' },
            { offset: 1, color: 'rgba(14, 165, 233, 0.1)' }
          ])
        },
        data: data.map(d => Number(d[yCol]) || 0)
      }));

      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: xData,
          axisLabel: {
            color: '#64748B',
            rotate: 35,
            fontSize: 10,
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#F1F5F9' } },
          axisLabel: { color: '#64748B' }
        },
        series: series as any
      };
    }

    // Default: bar/line charts
    const xDataRaw = data.map(d => String(d[rec.x_axis]));
    const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
    const yDataRaw = data.map(d => Number(d[yAxisRaw]) || 0);

    // Check if this should be a horizontal bar chart
    if ((rec as any).isHorizontal && chartType === 'bar') {
      // Aggregate data by category and sum values
      const aggregated: Record<string, number> = {};
      xDataRaw.forEach((category, idx) => {
        aggregated[category] = (aggregated[category] || 0) + yDataRaw[idx];
      });

      // Sort by value descending
      const sorted = Object.entries(aggregated)
        .sort(([, a], [, b]) => b - a);

      // Take top 10 + aggregate rest into "Others"
      let finalCategories: string[];
      let finalValues: number[];

      if (sorted.length > 10) {
        const top10 = sorted.slice(0, 10);
        const others = sorted.slice(10);
        const othersSum = others.reduce((sum, [, val]) => sum + val, 0);

        finalCategories = [...top10.map(([cat]) => cat), 'Others'];
        finalValues = [...top10.map(([, val]) => val), othersSum];
      } else {
        finalCategories = sorted.map(([cat]) => cat);
        finalValues = sorted.map(([, val]) => val);
      }

      return {
        ...baseOption,
        title: [
          {
            text: rec.title,
            left: 'center',
            top: 0,
            textStyle: {
              color: '#1E293B',
              fontSize: 14,
              fontWeight: 600
            }
          },
          {
            text: 'Data Source: Your Dataset',
            left: 'center',
            top: 25,
            textStyle: {
              color: '#94A3B8',
              fontSize: 10,
              fontWeight: 400
            }
          }
        ],
        grid: {
          left: '15%',
          right: '10%',
          bottom: '22%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          name: yAxisRaw,
          nameLocation: 'middle',
          nameGap: 45,
          nameTextStyle: {
            color: '#64748B',
            fontSize: 11,
            fontWeight: 500,
            padding: [15, 0, 0, 0]
          },
          splitLine: { lineStyle: { color: '#F1F5F9' } },
          axisLabel: {
            color: '#64748B',
            fontSize: 10,
            formatter: (value: number) => {
              return value >= 1000 ? `${(value / 1000).toFixed(0)}K` : String(value);
            }
          }
        },
        yAxis: {
          type: 'category',
          name: rec.x_axis,
          nameLocation: 'middle',
          nameGap: 65,
          nameTextStyle: {
            color: '#64748B',
            fontSize: 11,
            fontWeight: 500
          },
          data: finalCategories,
          axisLabel: {
            color: '#64748B',
            fontSize: 10,
            interval: 0,
            width: 100,
            overflow: 'truncate'
          },
          axisTick: { show: false },
          axisLine: { lineStyle: { color: '#E2E8F0' } }
        },
        dataZoom: finalCategories.length > 15 ? [
          {
            type: 'slider',
            yAxisIndex: 0,
            start: 0,
            end: 50,
            width: 20,
            right: 10,
            showDetail: false
          }
        ] : undefined,
        series: [{
          name: String(yAxisRaw),
          type: 'bar',
          label: {
            show: true,
            position: 'right',
            color: '#64748B',
            fontSize: 10,
            formatter: (params: any) => {
              const val = params.value;
              return typeof val === 'number' ? val.toLocaleString() : val;
            }
          },
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: (params: any) => {
              // Highlight "Others" in a different color
              if (params.name === 'Others') {
                return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#94A3B8' },
                  { offset: 1, color: '#64748B' }
                ]);
              }
              return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#0EA5E9' },
                { offset: 1, color: '#8B5CF6' }
              ]);
            }
          },
          data: finalValues,
        }],
      };
    }

    // Default: bar/line charts (vertical)
    // Use the raw data variables declared above

    // Aggregate and apply Top 10 + Others for vertical charts in dashboard mode
    let xData = xDataRaw;
    let yData = yDataRaw;

    if (!isFullView && !((rec as any).isHorizontal)) {
      const aggregated: Record<string, number> = {};
      xDataRaw.forEach((category, idx) => {
        aggregated[category] = (aggregated[category] || 0) + yDataRaw[idx];
      });

      const sorted = Object.entries(aggregated)
        .sort(([, a], [, b]) => b - a);

      if (sorted.length > 10) {
        const top10 = sorted.slice(0, 10);
        const others = sorted.slice(10);
        const othersSum = others.reduce((sum, [, val]) => sum + val, 0);
        xData = [...top10.map(([cat]) => cat), 'Others'];
        yData = [...top10.map(([, val]) => val), othersSum];
      } else {
        xData = sorted.map(([cat]) => cat);
        yData = sorted.map(([, val]) => val);
      }
    }

    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: {
          color: '#64748B',
          rotate: 35,
          fontSize: 10,
          interval: 0,
          overflow: 'truncate',
          width: 80
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#64748B' }
      },
      dataZoom: isFullView && xData.length > 20 ? [
        {
          type: 'slider',
          xAxisIndex: 0,
          start: 0,
          end: 50,
          height: 20,
          bottom: 10,
          showDetail: false
        },
        {
          type: 'inside',
          xAxisIndex: 0
        }
      ] : undefined,
      series: [{
        name: String(yAxisRaw),
        type: (chartType === 'line' ? 'line' : 'bar') as any,
        smooth: chartType === 'line',
        label: {
          show: true,
          position: 'top',
          color: '#64748B',
          fontSize: 10,
          formatter: (params: any) => {
            const val = params.value;
            return typeof val === 'number' ? val.toLocaleString() : val;
          }
        },
        data: yData,
      }],
    };
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
        const option = createEChartsOption(rec, rawData);
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

        const option = createEChartsOption(rec, fetchedData);
        setCharts(prev => [...prev, { title: rec.title, option, rec }]);
      } else {
        const option = createEChartsOption(rec, dataToUse);
        setCharts(prev => [...prev, { title: rec.title, option, rec }]);
      }

      if (!silent) toast.success(`Chart created: ${rec.title}`);
    } catch (error) {
      console.error('Error creating chart:', error);
      if (!silent) toast.error('Failed to create chart');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Sparkles className="h-5 w-5 text-green-500" />;
      case 'risk': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'insight': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'action': return <Target className="h-5 w-5 text-blue-500" />;
      default: return <Zap className="h-5 w-5" />;
    }
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
      <Card className="border border-gray-100 bg-indigo-50 overflow-hidden group hover:shadow-md transition-all hover:border-gray-200">
        <CardContent className="p-4 py-3">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-medium text-slate-800">{item.name}</h3>
            <span className="text-2xl">{item.icon}</span>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-outfit">Analytics Dashboard</h1>
            <p className="text-slate-500 mt-1">
              Comprehensive analytics with AI insights
            </p>
          </div>
        </div>

        {/* Data Source Selector (Simplified for bright theme) */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-slate-700 text-sm font-medium">
              <Database className="h-4 w-4 text-blue-500" />
              Connected Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedDataSourceId || ''}
              onChange={(e) => setSelectedDataSourceId(e.target.value)}
              className="w-full md:w-64 p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select a data source...</option>
              {dataSources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count} rows)
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* KPI Row Section inspired by image */}
        {selectedDataSourceId && (
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
                <div key={idx} className={`${kpi.bg} border-none rounded-xl p-5 flex items-center justify-between shadow-sm transition-all hover:shadow-md cursor-default relative overflow-hidden group`}>
                  <div className="flex-1 z-10">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 truncate">{kpi.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                      {kpi.isGrowth && (
                        <Badge className={`px-1 py-0 h-5 text-[10px] ${kpi.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} border-none`}>
                          {kpi.trend === 'up' ? '▲' : '▼'} {kpi.value.includes('%') ? '' : '+'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-white/50 ${kpi.color} z-10 transition-transform group-hover:scale-110`}>
                    <kpi.icon size={28} />
                  </div>
                  {kpi.isGrowth && (
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${kpi.trend === 'up' ? 'bg-emerald-500/5' : 'bg-rose-500/5'} blur-2xl`} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Auto-Generated Dashboard */}
        {charts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Visual Analytics
              </h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                <Database className="h-3 w-3" />
                Live Insights
              </Badge>
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-700 data-[state=open]:zoom-in-0 sm:data-[state=open]:zoom-in-100">
                          <DropdownMenuItem onClick={() => handleDrilldownInit(chart)}>
                            <Maximize2 className="mr-2 h-3.5 w-3.5" />
                            <span>Drill Down</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setFullViewChart(chart);
                            setIsFullViewOpen(true);
                          }}>
                            <Maximize2 className="mr-2 h-3.5 w-3.5" />
                            <span>Full View</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                      <EChartsWrapper option={chart.option} style={{ height: '280px', width: '100%' }} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations & Insights Section (Consolidated and Bright) */}
        {selectedDataSourceId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prescriptive Insights */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Prescriptive Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prescriptiveInsights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex gap-4">
                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{insight.title}</h4>
                      <p className="text-xs text-slate-600 mb-2">{insight.description}</p>
                      <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                        {insight.recommendation}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Chart Recommendations */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Suggested Charts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiRecommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{rec.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">{rec.priority}</Badge>
                        <p className="text-[11px] text-slate-500">{rec.type} view</p>
                      </div>
                    </div>
                    <Button onClick={() => createChart(rec)} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      View
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Raw Data Table Section */}
        {selectedDataSourceId && rawData.length > 0 && (
          <div className="space-y-1 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Raw Source Data
              </h2>
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

            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
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
              </div>
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
                const fullOption = createEChartsOption(fullViewChart.rec, rawData, true);
                const isHorizontal = (fullViewChart.rec as any).isHorizontal;

                // Safely get data count with proper type checking
                let dataCount = 10;

                // Helper function to get data length from axis option
                const getAxisDataLength = (axis: XAXisOption | YAXisOption | XAXisOption[] | YAXisOption[] | undefined): number => {
                  if (!axis) return 0;

                  if (Array.isArray(axis)) {
                    return axis.length > 0 ? getAxisDataLength(axis[0]) : 0;
                  }

                  // Check if it's a category axis with data
                  if ('type' in axis && axis.type === 'category' && 'data' in axis) {
                    return Array.isArray(axis.data) ? axis.data.length : 0;
                  }

                  return 0;
                };

                // Try to get data count from yAxis first, then xAxis
                const yAxisLength = getAxisDataLength(fullOption.yAxis as any);
                const xAxisLength = getAxisDataLength(fullOption.xAxis as any);
                dataCount = Math.max(yAxisLength, xAxisLength) || 10;

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
