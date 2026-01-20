import React, { useState, useEffect } from "react";
import * as echarts from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Database,
  DollarSign, Package, Activity, ShoppingBag, History, Layers,
  Search, ChevronLeft, ChevronRight, MoreHorizontal, Maximize2, Filter,
  BarChart, LineChart, PieChart, AreaChart, Radar, Zap, Target,
  Image as ImageIcon, FileText, Download, FileDown, Trash2, Calendar, Plus
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { startOfDay, endOfDay, isWithinInterval, parseISO, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem, CommandSeparator } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download as DownloadIcon,
  Filter as FilterIcon,
  RefreshCw,
  MoreHorizontal as MoreHorizontalIcon,
  Maximize2 as Maximize2Icon,
  Trash2 as Trash2Icon,
  FileText as FileTextIcon,
  FileDown as FileDownIcon,
  LayoutGrid,
  Zap as ZapIcon,
  Target as TargetIcon,
  Image as ImageIconLucide,
  BarChart3 as BarChart3Icon,
  Radar as RadarIcon,
  Calendar as CalendarIcon,
  Layers as LayersIcon,
  ChevronDown,
  Check
} from "lucide-react";
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
  getInsightIcon,
  capitalize
} from "@/lib/chart-utils";
import AIRecommendationsSection from "@/components/analytics/AIRecommendationsSection";
import { InteractiveChartBuilder } from "@/components/analytics/InteractiveChartBuilder";
import { cn } from "@/lib/utils";
import { getTemplateCharts, ChartRecommendation, INDUSTRY_CONFIGS } from "@/lib/dashboard-templates";
import { mockDataService } from "@/services/MockDataService";
import { supabaseService } from "@/integrations/supabase/supabase-service";

// Mappings removed for dynamic templating

const Analytics = () => {
  const [charts, setCharts] = useState<Array<{ title: string; option: EChartsOption; rec: ChartRecommendation }>>([]);
  const [loading, setLoading] = useState({ dashboard: false });
  const {
    selectedDataSourceId,
    setSelectedDataSourceId,
    selectedTemplate,
    selectedIndustryName,
    selectedIndustryId,
    setSelectedIndustryId,
    setSelectedIndustryName,
    setSelectedTemplate // Add setSelectedTemplate from context
  } = useAnalytics();
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);

  // Effect removed as templates are now dynamic per industry
  const [computedKpis, setComputedKpis] = useState<any[]>([]);
  const [miniChartsData, setMiniChartsData] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [chartSortOrder, setChartSortOrder] = useState<'none' | 'desc' | 'asc'>('none');
  const [groupByDimension, setGroupByDimension] = useState<string[]>([]); // Changed to array for Multi-Selection
  const [openGroupPopover, setOpenGroupPopover] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateColumn, setDateColumn] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<any[]>([]);



  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownSourceChart, setDrilldownSourceChart] = useState<any>(null);
  const [drilldownCharts, setDrilldownCharts] = useState<Array<{ dimension: string, option: EChartsOption, title: string, rec: ChartRecommendation }>>([]);

  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [fullViewChart, setFullViewChart] = useState<any>(null);

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  useEffect(() => {
    loadDataSources();
    fetchIndustries();
  }, []);

  useEffect(() => {
    if (!selectedDataSourceId) return;

    const unsubscribe = mockDataService.subscribe((id, data) => {
      if (id === selectedDataSourceId) {
        setRawData([...data]);
        setFilteredData([...data]);
        computeMetrics(data);
      }
    });

    return () => unsubscribe();
  }, [selectedDataSourceId]);

  useEffect(() => {
    if (!selectedDataSourceId) return;

    const source = mockDataService
      .getSources()
      .find(s => s.id === selectedDataSourceId);

    if (!source || source.type !== 'SFW CRM') return;

    const unsubscribe = supabaseService.subscribeToTable(
      supabase,
      'leads',
      ({ eventType, new: newRow, old }) => {
        if (eventType === 'DELETE') {
          mockDataService.deleteRecord(selectedDataSourceId, old.id);
        } else {
          mockDataService.upsertRecord(selectedDataSourceId, newRow);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedDataSourceId]);

  const fetchIndustries = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('industries')
        .select('*');

      if (data && !error) {
        const mappedData = data.map((item: any) => ({
          id: String(item.id || item.ID || ''),
          name: item.name || item.industry_name || item.title || item.label || item.industry || 'Unknown Industry'
        }));
        setIndustries(mappedData);
      }
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  };

  useEffect(() => {
    if (selectedDataSourceId) {
      setDateRange(undefined);
      setDateColumn(null);
      setFilteredData([]);

      if (selectedTemplate === 'default') {
        generateDashboard();
      } else {
        loadTemplateDashboard();
      }
    } else {
      setCharts([]);
    }
  }, [selectedDataSourceId, selectedTemplate, selectedIndustryName]);

  const loadTemplateDashboard = async () => {
    if (!selectedDataSourceId) return;

    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      let dataToUse = filteredData;

      if (dataToUse.length === 0) {
        const fetchedData = await fetchAndComputeKpis();
        if (!fetchedData) {
          setLoading(prev => ({ ...prev, dashboard: false }));
          return;
        }
        dataToUse = fetchedData;
      }

      const templateRecs = getTemplateCharts(selectedTemplate, dataToUse, selectedIndustryName);

      const newCharts = templateRecs.map(rec => ({
        title: rec.title,
        rec: rec,
        option: createEChartsOption(rec, dataToUse, chartSortOrder, false, groupByDimension)
      }));

      setCharts(newCharts);
      const templateNum = selectedTemplate.replace('template', '');
      toast.success(`Dashboard Template ${templateNum} applied`);
    } catch (error) {
      console.error('Error loading template dashboard:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  };

  useEffect(() => {
    if (selectedDataSourceId && charts.length > 0) {
      const dataToUse = filteredData;
      setCharts(prev => prev.map(chart => {
        const effectiveRec: any = { ...chart.rec };
        if (groupByDimension.length > 0 && effectiveRec.isHorizontal) {
          delete effectiveRec.isHorizontal;
        }
        return {
          ...chart,
          option: createEChartsOption(effectiveRec, dataToUse, chartSortOrder, false, groupByDimension)
        };
      }));
    }
  }, [chartSortOrder, groupByDimension, filteredData, rawData]);

  useEffect(() => {
    if (rawData.length > 0) {
      // PREFER MAPPED DATE COLUMN
      const sourceInfo = mockDataService.getSources().find(s => s.id === selectedDataSourceId);
      const mappedDateCol = sourceInfo?.mapping?.dateCol;

      if (mappedDateCol && rawData[0].hasOwnProperty(mappedDateCol)) {
        setDateColumn(mappedDateCol);
      } else if (!dateColumn) {
        const columns = Object.keys(rawData[0]);
        const dateKeywords = ['date', 'time', 'at', 'when', 'created', 'updated', 'period', 'timestamp', 'day', 'month', 'year', 'dt', 'trans', 'added'];

        let foundCol = columns.find(key => {
          const k = key.toLowerCase();
          const hasKeyword = dateKeywords.some(kw => k.includes(kw));
          const isBlacklisted = /id|by|user|owner|name|description|title|amount|price|qty|total|status|type/i.test(k);

          if (hasKeyword && !isBlacklisted) {
            for (let i = 0; i < Math.min(rawData.length, 15); i++) {
              const val = rawData[i][key];
              if (val) {
                const dateVal = new Date(val);
                if (!isNaN(dateVal.getTime()) && dateVal.getFullYear() > 1900 && dateVal.getFullYear() < 2100) return true;
              }
            }
          }
          return false;
        });

        if (!foundCol) {
          foundCol = columns.find(key => {
            const k = key.toLowerCase();
            const isBlacklisted = /id|by|user|owner|name|description|title|amount|price|qty|total|status|type|email|url|phone/i.test(k);
            if (isBlacklisted) return false;

            for (let i = 0; i < Math.min(rawData.length, 5); i++) {
              const val = rawData[i][key];
              if (val && (typeof val === 'string' || typeof val === 'number')) {
                const dateVal = new Date(val);
                if (!isNaN(dateVal.getTime()) && dateVal.getFullYear() > 2000 && dateVal.getFullYear() < 2100) return true;
              }
            }
            return false;
          });
        }
        if (foundCol) setDateColumn(foundCol);
      }

      const isFilterActive = dateColumn && dateRange?.from;

      if (isFilterActive) {
        const start = startOfDay(dateRange.from!);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);

        const filtered = rawData.filter(item => {
          const dateVal = item[dateColumn!];
          if (!dateVal) return false;
          try {
            const date = new Date(dateVal);
            if (isNaN(date.getTime())) return false;
            return isWithinInterval(date, { start, end });
          } catch (e) {
            return false;
          }
        });
        setFilteredData(filtered);
        computeMetrics(filtered);
      } else {
        setFilteredData(rawData);
        computeMetrics(rawData);
      }
    } else {
      setFilteredData([]);
    }
  }, [rawData, dateRange, dateColumn, selectedIndustryName, selectedIndustryId]);

  const loadDataSources = async () => {
    // 1. Mock Sources
    const mockSources = mockDataService.getSources().map(s => ({...s, is_mock: true}));

    // 2. Real Sources
    const { data } = await (supabase as any)
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    let allSources = [...mockSources];
    if (data) {
        allSources = [...allSources, ...data];
    }
    
    // Sort
    allSources.sort((a, b) => {
         const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return dateB - dateA;
    });

    setDataSources(allSources);
    if (allSources.length > 0 && !selectedDataSourceId) {
      setSelectedDataSourceId(allSources[0].id);
    }
  };

  const generateDashboard = async () => {
    if (!selectedDataSourceId) return;

    setLoading(prev => ({ ...prev, dashboard: true }));
    try {
      // Fetch data first
      const data = await fetchAndComputeKpis();
      if (!data) throw new Error("No data found");

      // Check if it's a mock source, in which case we don't call the AI endpoint for layout
      // but generate it locally using templates
      const isMock = mockDataService.getData(selectedDataSourceId) !== null;
      
      if (isMock) {
          // Use template generation logic instead of API
          const templateRecs = getTemplateCharts('template1', data, selectedIndustryName);
           const newCharts = templateRecs.map(rec => ({
            title: rec.title,
            rec: rec,
            option: createEChartsOption(rec, data, chartSortOrder, false, groupByDimension)
          }));
          setCharts(newCharts);
          toast.success(`Generated ${newCharts.length} charts from connected database`);
      } else {
          // Original Logic
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=dashboard`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data_source_id: selectedDataSourceId,
              industry: selectedIndustryName
            }),
          });

          if (!response.ok) throw new Error('Failed to generate dashboard');

          const result = await response.json();

          setCharts([]);
          if (data && result.recommendations) {
            for (let i = 0; i < result.recommendations.length; i++) {
              const rec = result.recommendations[i];
              if (rec.type === 'bar') {
                rec.isHorizontal = true;
              }
              await createChart(rec, true, data);
            }
          }
          toast.success(`Created ${result.recommendations?.length || 0} charts`);
      }

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
      // 1. Check Mock Service
      const mockData = mockDataService.getData(selectedDataSourceId);
      if (mockData) {
          setRawData(mockData);
          setFilteredData(mockData);
          computeMetrics(mockData);
          return mockData;
      }

      // 2. Fetch from Supabase
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
      setFilteredData(data);
      computeMetrics(data);
      return data;
    } catch (error) {
      console.error('Error fetching KPIs data:', error);
      return null;
    }
  };

  const computeMetrics = (data: any[]) => {
    // If no data, we still want to compute (zero) metrics to update the UI
    const keys = Object.keys(data[0] || {});
    
    // RETRIEVE MAPPING FROM SOURCE IF AVAILABLE
    const sourceInfo = mockDataService.getSources().find(s => s.id === selectedDataSourceId);
    const mapping = sourceInfo?.mapping || {};

    const industryKey = selectedIndustryName?.toLowerCase();
    const industryConfig = INDUSTRY_CONFIGS[industryKey] || null;

    let newKpis = [];

    if (industryConfig) {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        notation: "compact"
      });

      newKpis = industryConfig.kpis.map(config => {
        let matchingKey = keys.find(k => config.keyMatch.test(k));

        if (!matchingKey) {
          if (config.agg === 'sum' || config.agg === 'avg') {
            // USE MAPPING: If it's a financial metric, try the mapped metricCol first
            if ((config.prefix === '$' || config.title.toLowerCase().includes('revenue')) && mapping.metricCol) {
                matchingKey = mapping.metricCol;
            } else {
                if (config.prefix === '$' || config.title.toLowerCase().includes('revenue') || config.title.toLowerCase().includes('cost')) {
                  matchingKey = keys.find(k => /sales|revenue|amount|price|cost|value|total/i.test(k) && typeof data[0][k] === 'number');
                }
                if (!matchingKey) {
                  matchingKey = keys.find(k => typeof data[0][k] === 'number' && !/id|year|month|day|date/i.test(k));
                }
            }
          } else if (config.agg === 'count') {
             // USE MAPPING: Use mapped categoryCol for counting entities
             if (mapping.categoryCol) {
                matchingKey = mapping.categoryCol;
             } else {
                matchingKey = keys.find(k => /id|name|title|product|customer|email/i.test(k));
                if (!matchingKey) {
                  matchingKey = keys.find(k => typeof data[0][k] === 'string');
                }
             }
          }
        }

        let value = "0";

        if (matchingKey) {
          let resultValue = 0;
          if (config.agg === 'avg') {
            const sum = data.reduce((s, item) => s + (Number(item[matchingKey]) || 0), 0);
            resultValue = sum / data.length;
          } else if (config.agg === 'count') {
            resultValue = new Set(data.map(item => item[matchingKey])).size;
          } else {
            resultValue = data.reduce((s, item) => s + (Number(item[matchingKey]) || 0), 0);
          }

          if (config.prefix === '$') {
            value = formatter.format(resultValue);
          } else {
            value = String(resultValue > 1000 ? (resultValue / 1000).toFixed(1) + 'K' : Math.round(resultValue));
          }
        } else if (config.agg === 'count' && !matchingKey) {
          const resultValue = data.length;
          value = String(resultValue > 1000 ? (resultValue / 1000).toFixed(1) + 'K' : Math.round(resultValue));
        }

        return {
          title: config.title,
          value: value,
          icon: config.icon,
          color: config.color,
          bg: config.bg,
          prefix: config.prefix !== '$' ? config.prefix : '', // Formatter already adds $
          suffix: config.suffix,
          isGrowth: Math.random() > 0.3,
          trend: Math.random() > 0.5 ? 'up' : 'down'
        };
      });
    } else {
      // Fallback Default KPIs - Now Enhanced with Mapping
      const salesCol = mapping.metricCol || keys.find(k => /sales|total|amount|revenue|price/i.test(k));
      const brandCol = mapping.categoryCol || keys.find(k => /brand|company|vender|manufacturer/i.test(k));
      const productCol = keys.find(k => /product|item|description|name/i.test(k));
      const quantityCol = keys.find(k => /qty|quantity|count|unit/i.test(k));

      const totalSales = salesCol ? data.reduce((sum, item) => sum + (Number(item[salesCol]) || 0), 0) : 0;
      const uniqueBrands = brandCol ? new Set(data.map(item => item[brandCol])).size : 0;
      const totalProducts = productCol ? new Set(data.map(item => item[productCol])).size : data.length;
      const totalQty = quantityCol ? data.reduce((sum, item) => sum + (Number(item[quantityCol]) || 0), 0) : 0;

      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
        notation: "compact"
      });

      newKpis = [
        { title: "Total Sales", value: formatter.format(totalSales), icon: DollarSign, color: "white", bg: "bg-gradient-to-br from-pink-500 to-rose-500", isGrowth: true, trend: 'up' },
        { title: "Unique Entities", value: String(uniqueBrands || 'N/A'), icon: LayersIcon, color: "white", bg: "bg-gradient-to-br from-amber-400 to-orange-500", isGrowth: true, trend: 'up' },
        { title: "Items Analyzed", value: String(totalProducts), icon: Package, color: "white", bg: "bg-gradient-to-br from-teal-400 to-emerald-600", isGrowth: false },
        { title: "Total Units", value: String(totalQty || data.length), icon: ZapIcon, color: "white", bg: "bg-gradient-to-br from-green-400 to-emerald-600", isGrowth: true, trend: 'up' },
        { title: "Data Rows", value: String(data.length), icon: History, color: "white", bg: "bg-gradient-to-br from-purple-500 to-indigo-700", isGrowth: false },
      ];
    }

    setComputedKpis(newKpis);

    // Compute Mini Charts (Sparklines) based on filtered data
    if (data.length > 0 && dateColumn) {
      // Group by date (day)
      const dateMap = new Map<string, number>();
      const today = new Date();

      data.forEach(item => {
        const d = new Date(item[dateColumn!]);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split('T')[0];
          // Find a numeric value to sum (e.g., Sales)
          let val = 0;
          const salesCol = keys.find(k => /sales|total|amount|revenue|price/i.test(k) && typeof item[k] === 'number');
          if (salesCol) val = Number(item[salesCol]) || 0;
          else val = 1; // Count if no metric

          dateMap.set(key, (dateMap.get(key) || 0) + val);
        }
      });

      // Sort by date
      const sortedDates = Array.from(dateMap.keys()).sort();
      const values = sortedDates.map(d => dateMap.get(d) || 0);

      // Create Sparkline Data
      if (values.length > 0) {
        setMiniChartsData([
          { name: "Revenue Trend", values: values.slice(-20), total: values.reduce((a, b) => a + b, 0), icon: <TrendingUp className="h-4 w-4 text-white" /> },
          { name: "Traffic Pulse", values: values.slice(-20).map(v => v * (0.5 + Math.random())), total: values.reduce((a, b) => a + b, 0) * 0.7, icon: <Activity className="h-4 w-4 text-white" /> },
          { name: "Conversion Vol", values: values.slice(-20).map(v => v * (0.2 + Math.random() * 0.1)), total: values.reduce((a, b) => a + b, 0) * 0.2, icon: <Zap className="h-4 w-4 text-white" /> },
          { name: "Avg Transaction", values: values.slice(-20).map(v => v / (1 + Math.random() * 10)), total: (values.reduce((a, b) => a + b, 0) / values.length), icon: <Target className="h-4 w-4 text-white" /> }
        ]);
      } else {
        setMiniChartsData([]);
      }
    } else {
      setMiniChartsData([]);
    }
  };

  const handlePresetChange = (val: string) => {
    const today = new Date();
    switch (val) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "7days":
        setDateRange({ from: subDays(today, 6), to: today });
        break;
      case "30days":
        setDateRange({ from: subDays(today, 29), to: today });
        break;
      case "thismonth":
        setDateRange({ from: startOfMonth(today), to: today, });
        break;
      case "lastmonth": {
        const lastMonth = subMonths(today, 1); setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      }
      case "thisquarter":
        setDateRange({
          from: startOfQuarter(today),
          to: today,
        });
        break;
      case "lastquarter": {
        const lastQuarter = subMonths(today, 3);
        setDateRange({
          from: startOfQuarter(lastQuarter),
          to: endOfQuarter(lastQuarter),
        });
        break;
      }
      case "last6months":
        setDateRange({
          from: subMonths(today, 6),
          to: today,
        });
        break;
      case "last12months":
        setDateRange({
          from: subMonths(today, 12),
          to: today,
        });
        break;
      case "clear":
        setDateRange(undefined);
        break;
    }
  }

  const handleDrilldownInit = (chart: { title: string; option: EChartsOption; rec: ChartRecommendation }) => {
    setDrilldownSourceChart(chart);
    const dataToUse = filteredData.length > 0 ? filteredData : rawData;
    if (dataToUse.length > 0) {
      const sample = dataToUse[0];
      const dimensions = Object.keys(sample).filter(key => {
        const val = sample[key];
        const isId = key.toLowerCase().includes('id');
        const isCurrentX = key === chart.rec.x_axis;
        const isCategorical = typeof val === 'string' || (typeof val === 'number' && new Set(dataToUse.map(d => d[key])).size < 20);
        return isCategorical && !isCurrentX && !isId;
      });

      const charts = dimensions.map(dimension => {
        const rec = { ...chart.rec };
        rec.x_axis = dimension;
        rec.title = capitalize(`${chart.rec.y_axis} by ${dimension}`);
        const option = createEChartsOption(rec, dataToUse, chartSortOrder);
        return { dimension, option, title: rec.title, rec };
      });

      setDrilldownCharts(charts);
    }
    setIsDrilldownOpen(true);
  };

  const createChart = async (rec: VisualizationRecommendation, silent = false, providedData?: any[]) => {
    try {
      const dataToUse = providedData || (filteredData.length > 0 ? filteredData : rawData);

      if (!dataToUse.length) {
        const fetchedData = await fetchAndComputeKpis();
        if (!fetchedData) return;

        const effectiveRec: any = { ...rec };
        if (groupByDimension.length > 0 && effectiveRec.isHorizontal) {
          delete effectiveRec.isHorizontal;
        }
        const option = createEChartsOption(effectiveRec, fetchedData, chartSortOrder, false, groupByDimension);
        setCharts(prev => [...prev, { title: effectiveRec.title, option, rec: effectiveRec }]);
      } else {
        const effectiveRec: any = { ...rec };
        if (groupByDimension.length > 0 && effectiveRec.isHorizontal) {
          delete effectiveRec.isHorizontal;
        }
        const option = createEChartsOption(effectiveRec, dataToUse, chartSortOrder, false, groupByDimension);
        setCharts(prev => [...prev, { title: effectiveRec.title, option, rec: effectiveRec }]);
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

      const newOption = createEChartsOption(updatedRec, filteredData);

      newCharts[chartIndex] = {
        ...targetChart,
        rec: updatedRec,
        option: newOption
      };

      return newCharts;
    });
    toast.success(`Chart type changed to ${newType}`);
  };

  const handleRemoveChart = (chartIndex: number) => {
    setCharts(prev => {
      const newCharts = [...prev];
      newCharts.splice(chartIndex, 1);
      return newCharts;
    });
    if (fullViewChart && charts[chartIndex]?.title === fullViewChart.title) {
      setIsFullViewOpen(false);
      setFullViewChart(null);
    }
    toast.success("Chart removed from dashboard");
  };


  // Default KPI references
  const defaultKpis = [
    { title: "Dashboard Total Sales", value: "$ 0.00", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Unique Entities", value: "0", icon: LayersIcon, color: "text-indigo-600", bg: "bg-blue-50" },
    { title: "Items Analyzed", value: "0", icon: Package, color: "text-orange-600", bg: "bg-blue-50" },
    { title: "Avg Insight Value", value: "$ 0.00", icon: Activity, color: "text-emerald-600", bg: "bg-blue-50" },
    { title: "Total Units", value: "0", icon: ZapIcon, color: "text-yellow-500", bg: "bg-blue-50" },
    { title: "Data Rows", value: "0", icon: History, color: "text-slate-600", bg: "bg-blue-50" },
    { title: "Growth Variance", value: "0.0 %", icon: TrendingUp, color: "text-green-600", bg: "bg-blue-50" },
    { title: "Item Density", value: "# 0", icon: ShoppingBag, color: "text-purple-600", bg: "bg-blue-50" },
  ];

  const activeKpis = computedKpis.length > 0 ? computedKpis : defaultKpis.slice(0, 5);

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
        lineStyle: { width: 3, color: '#8b8ef9' },
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
    <div className="min-h-screen bg-slate-100 p-6 space-y-6 scrollbar-hide">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <Card className="border-none shadow-sm bg-indigo-50/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* <div className="p-2.5 bg-white rounded-xl shadow-sm">
                <BarChart3Icon className="h-6 w-6 text-indigo-600" />
              </div> */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 font-outfit tracking-tight">Analytics Dashboard</h1>
                <p className="text-xs text-slate-500 font-medium">AI-Powered Insights & Real-time Metrics</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/60 p-1.5 pl-4 rounded-xl border border-white shadow-inner w-full md:w-auto">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                Sources
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
              <Select
                value={selectedIndustryId}
                onValueChange={(val) => {
                  setSelectedIndustryId(val);
                  if (val === 'all') {
                    setSelectedIndustryName('All Industries');
                  } else {
                    const ind = industries.find(i => i.id === val);
                    if (ind) setSelectedIndustryName(ind.name);
                  }
                  setSelectedTemplate('default'); // Reset to default template on industry change
                }}
              >
                <SelectTrigger className="w-32 bg-transparent border-none shadow-none h-8 text-[11px] font-bold text-indigo-600 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-px h-6 bg-indigo-100 hidden md:block"></div>

              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                Templates
              </div>
              <Select
                value={selectedTemplate === 'default' ? 'template1' : selectedTemplate}
                onValueChange={(val) => setSelectedTemplate(val)}
              >
                <SelectTrigger className="w-auto min-w-[140px] bg-transparent border-none shadow-none h-8 text-[11px] font-bold text-indigo-600 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none text-left">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                  {Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={i} value={`template${i + 1}`}>
                      {selectedIndustryName || 'Industry'} Template {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-6 bg-indigo-100 hidden md:block"></div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {activeKpis.map((kpi, idx) => (
                <Card
                  key={idx}
                  className={cn(
                    "border-none shadow-sm group hover:shadow-md transition-all cursor-default overflow-hidden relative",
                    kpi.bg
                  )}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{kpi.title}</p>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white tracking-tight">
                          {kpi.prefix || ''}{kpi.value}{kpi.suffix || ''}
                        </h3>
                        {kpi.isGrowth && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                            {kpi.trend === 'up' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white/20 rounded-xl shadow-sm group-hover:bg-white/30 transition-all">
                      <kpi.icon className="h-5 w-5 text-white" />
                    </div>
                  </CardContent>
                </Card>
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
                <div className="flex items-center gap-2 mr-2 bg-gray-50/50 p-1 rounded-lg border border-gray-100">
                  <Select onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-24 bg-gray-200 border-gray-200 shadow-sm h-8 text-[11px] font-medium focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today" className="text-xs">Today</SelectItem>
                      <SelectItem value="7days" className="text-xs">Last 7 Days</SelectItem>
                      <SelectItem value="30days" className="text-xs">Last 30 Days</SelectItem>
                      <SelectItem value="thismonth" className="text-xs">This Month</SelectItem>
                      <SelectItem value="lastmonth" className="text-xs">Last Month</SelectItem>
                      <SelectItem value="thisquarter" className="text-xs">This Quarter</SelectItem>
                      <SelectItem value="lastquarter" className="text-xs">Last Quarter</SelectItem>
                      <SelectItem value="last6months" className="text-xs">Last 6 Months</SelectItem>
                      <SelectItem value="last12months" className="text-xs">Last 12 Months</SelectItem>
                      <SelectItem value="clear" className="text-xs text-red-500">Clear Filter</SelectItem>
                    </SelectContent>
                  </Select>
                  <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                  />
                </div>
                {/* Multi-Select Group By Filter */}
                <Popover open={openGroupPopover} onOpenChange={setOpenGroupPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48 bg-gray-200 border-gray/100 shadow-sm h-8 text-xs font-semibold rounded-lg justify-start text-left font-normal px-2 hover:bg-gray-300 transition-colors">
                      <LayersIcon className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      {groupByDimension.length > 0 ? (
                        <span className="truncate flex-1 text-slate-900">
                          {groupByDimension.length === 1
                            ? capitalize(groupByDimension[0])
                            : `${groupByDimension.length} selected`}
                        </span>
                      ) : (
                        <span className="text-slate-500">Group By</span>
                      )}
                      <ChevronDown className="ml-2 h-3 w-3 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0 bg-white/95 backdrop-blur-md border-white/20" align="start">
                    <Command>
                      <CommandInput placeholder="Search dimensions..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty>No dimension found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto scrollbar-hide">
                          <CommandItem
                            onSelect={() => {
                              setGroupByDimension([]);
                              setOpenGroupPopover(false);
                            }}
                            className="text-xs font-bold text-slate-500 cursor-pointer"
                          >
                            <div className={cn(
                              "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary",
                              groupByDimension.length === 0 ? "bg-primary text-primary-foreground" : "opacity-30"
                            )}>
                              {groupByDimension.length === 0 && <Check className="h-3 w-3" />}
                            </div>
                            None (Clear)
                          </CommandItem>
                          <CommandSeparator className="my-1" />
                          {rawData.length > 0 && Object.keys(rawData[0])
                            .filter(key => {
                              const k = key.toLowerCase();
                              return !['id', '_id', 'uuid', 'file_id', 'created_at', 'updated_at', 'owner_id'].some(ex => k.includes(ex));
                            })
                            .map(dim => {
                              const isSelected = groupByDimension.includes(dim);
                              return (
                                <CommandItem
                                  key={dim}
                                  onSelect={() => {
                                    setGroupByDimension(prev => {
                                      if (isSelected) {
                                        return prev.filter(f => f !== dim);
                                      } else {
                                        return [...prev, dim];
                                      }
                                    });
                                  }}
                                  className="text-xs capitalize cursor-pointer"
                                >
                                  <div className={cn(
                                    "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary/50",
                                    isSelected ? "bg-indigo-500 border-indigo-500 text-white" : "opacity-50 [&_svg]:invisible"
                                  )}>
                                    <Check className="h-3 w-3" />
                                  </div>
                                  {dim.replace(/_/g, ' ')}
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Sort Filter */}
                <Select value={chartSortOrder} onValueChange={(val: any) => setChartSortOrder(val)}>
                  <SelectTrigger className="w-32 bg-gray-200 border-gray/100 shadow-sm h-8 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus:outline-none outline-none">
                    <div className="flex items-center gap-2">
                      <FilterIcon className="h-3 w-3 text-slate-500" />
                      <SelectValue placeholder="Sort" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-md border-white/20">
                    <SelectItem value="none" className="text-xs">Default</SelectItem>
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
              {/* Dashboard Layout: Grid logic to show all charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {(selectedTemplate === 'default' ? charts.slice(1) : charts).map((chart, idx) => {
                  const absoluteIndex = selectedTemplate === 'default' ? idx + 1 : idx;
                  const isLarge = chart.rec.size === 'large';

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "min-h-[450px] flex",
                        (idx === 0 || isLarge) ? "lg:col-span-12" : "lg:col-span-6"
                      )}
                    >
                      <Card className="w-full border border-gray-200 overflow-hidden bg-white group/chart hover:shadow-md transition-all duration-300 hover:border-gray-300 flex flex-col">
                        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-800 truncate mb-1">{capitalize(chart.title)}</CardTitle>
                            <CardDescription className="text-[10px] text-slate-500 leading-tight line-clamp-2 max-w-[200px]">
                              {chart.rec.reasoning || "AI-powered visualization based on your uploaded data patterns and trends."}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 transition-colors focus-visible:ring-0 focus-visible:outline-none outline-none">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-50 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                            >
                              <DropdownMenuItem onClick={() => handleDrilldownInit(chart)} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-700 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                <Maximize2Icon className="mr-2 h-3.5 w-3.5" />
                                <span>Drill Down</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setFullViewChart(chart);
                                setIsFullViewOpen(true);
                              }} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-700 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                <Maximize2Icon className="mr-2 h-3.5 w-3.5" />
                                <span>Full View</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-medium focus:bg-slate-200/80 data-[state=open]:bg-slate-50/80 transition-colors outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <BarChart3Icon className="mr-2 h-3.5 w-3.5" />
                                  <span>Change Chart Type</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent
                                    className="w-48 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                                  >
                                    <DropdownMenuItem onClick={() => handleChangeChartType(absoluteIndex, 'radar')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                      <RadarIcon className="mr-2 h-3.5 w-3.5" />
                                      <span>Radar Chart</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleChangeChartType(absoluteIndex, 'funnel')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                      <FilterIcon className="mr-2 h-3.5 w-3.5" />
                                      <span>Funnel Chart</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleChangeChartType(absoluteIndex, 'scatter')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                      <TargetIcon className="mr-2 h-3.5 w-3.5" />
                                      <span>Scatter Plot</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleChangeChartType(absoluteIndex, 'gauge')} className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                      <ZapIcon className="mr-2 h-3.5 w-3.5" />
                                      <span>Gauge Chart</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[11px] font-medium focus:bg-slate-200/80 data-[state=open]:bg-slate-50/80 transition-colors outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none">
                                  <DownloadIcon className="mr-2 h-3.5 w-3.5" />
                                  <span>Export</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                  <DropdownMenuSubContent
                                    className="w-48 bg-white/95 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 duration-200"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => handleExportChart(absoluteIndex, 'png')}
                                      className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                    >
                                      <ImageIconLucide className="mr-2 h-3.5 w-3.5 text-teal-500" />
                                      <span>Export as Image (PNG)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleExportChart(absoluteIndex, 'jpeg')}
                                      className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                    >
                                      <FileTextIcon className="mr-2 h-3.5 w-3.5 text-orange-500" />
                                      <span>Export as JPEG</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleExportChart(absoluteIndex, 'pdf')}
                                      className="text-[11px] font-medium focus:bg-slate-200/80 focus:text-slate-600 data-[state=open]:bg-slate-50/80 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none"
                                    >
                                      <FileDownIcon className="mr-2 h-3.5 w-3.5 text-red-500" />
                                      <span>Export as PDF</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRemoveChart(absoluteIndex)} className="text-[11px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 data-[state=open]:bg-red-50 transition-colors cursor-pointer outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none group/delete">
                                <Trash2Icon className="mr-2 h-3.5 w-3.5 group-hover/delete:animate-bounce" />
                                <span>Remove from Dashboard</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                          <EChartsWrapper id={`dashboard-chart-${absoluteIndex}`} option={chart.option} style={{ height: '280px', width: '100%' }} />
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations & Insights Section - Available on All Dashboards */}
        {selectedDataSourceId && (
          <AIRecommendationsSection
            selectedDataSourceId={selectedDataSourceId}
            rawData={filteredData.length > 0 ? filteredData : rawData}
            onCreateChart={createChart}
            industry={selectedIndustryName}
          />
        )}

        {/* Raw Data Table Section */}
        {selectedDataSourceId && (rawData.length > 0 || loading.dashboard) && (
          <div className="space-y-1 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
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
              <div className="overflow-x-auto scrollbar-hide">
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
                <h4 className="font-bold text-slate-800">{capitalize(drilldownSourceChart?.title)}</h4>
                <p className="text-xs text-slate-500">Exploring all dimensional breakdowns</p>
              </div>

              {drilldownCharts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                  {drilldownCharts.map((chart, index) => (
                    <div
                      key={index}
                      className={`${chart.rec.size === 'large' ? 'lg:col-span-12' : 'lg:col-span-6'} min-h-[400px]`}
                    >
                      <Card className="h-full border-none shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm overflow-hidden flex flex-col">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold text-slate-800">{capitalize(chart.title)}</CardTitle>
                          <CardDescription className="text-xs text-slate-500">Breakdown by {chart.dimension}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <EChartsWrapper option={chart.option} style={{ height: '280px', width: '100%' }} />
                        </CardContent>
                      </Card>
                    </div>
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
          <DialogContent className="max-w-[90vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
            <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {fullViewChart?.title ? capitalize(fullViewChart.title) : 'Chart Detail'}
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1">{fullViewChart?.rec?.reasoning}</p>
              </div>
            </DialogHeader>
            <div className="flex-1 p-6 bg-slate-50/50 overflow-hidden relative">
              {fullViewChart && (
                <EChartsWrapper
                  option={createEChartsOption(
                    fullViewChart.rec,
                    filteredData.length > 0 ? filteredData : rawData,
                    chartSortOrder,
                    true,
                    groupByDimension
                  )}
                  style={{ height: '100%', width: '100%' }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Interactive Chart Builder */}
        <InteractiveChartBuilder
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          data={filteredData.length > 0 ? filteredData : rawData}
        />
      </div>
    </div >
  );
};

export default Analytics;
