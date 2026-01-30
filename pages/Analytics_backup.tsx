import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Lightbulb, Database,
  Loader2, AlertCircle, Sparkles, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import EChartsWrapper from "@/components/charts/EChartsWrapper";
import { EChartsOption } from 'echarts';

interface VisualizationRecommendation {
  chart_type?: string;
  type?: string;
  title: string;
  x_axis: string;
  y_axis: string | string[];
  reasoning?: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

const Analytics = () => {
  const [recommendations, setRecommendations] = useState<VisualizationRecommendation[]>([]);
  const [charts, setCharts] = useState<Array<{ title: string; option: EChartsOption }>>([]);
  const [loading, setLoading] = useState(false);
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();
  const [dataSources, setDataSources] = useState<any[]>([]);

  useEffect(() => {
    loadDataSources();
  }, []);

  useEffect(() => {
    if (selectedDataSourceId) {
      generateRecommendations();
    } else {
      setRecommendations([]);
      setCharts([]);
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

  const generateRecommendations = async () => {
    if (!selectedDataSourceId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data_source_id: selectedDataSourceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const result = await response.json();
      setRecommendations(result.recommendations || []);
      
      // Auto-create ALL charts dynamically
      const allCharts = result.recommendations || [];
      
      // Auto-create all charts
      for (const rec of allCharts) {
        await createChart(rec, true); // silent mode
      }
      
      toast.success(`Created ${allCharts.length} charts automatically`);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast.error('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const createChart = async (rec: VisualizationRecommendation, silent = false) => {
    try {
      const { data: dataSource } = await (supabase as any)
        .from('data_sources')
        .select('*')
        .eq('id', selectedDataSourceId)
        .single();

      if (!dataSource) return;

      const { data: uploadedFiles } = await (supabase as any)
        .from('uploaded_files')
        .select('id')
        .eq('file_name', dataSource.name)
        .limit(1);

      if (!uploadedFiles || uploadedFiles.length === 0) return;

      const fileId = uploadedFiles[0].id;

      const { data: records } = await (supabase as any)
        .from('data_records')
        .select('row_data')
        .eq('file_id', fileId)
        .limit(1000);

      if (!records || records.length === 0) return;

      const option = createEChartsOption(rec, records.map((r: any) => r.row_data));
      
      setCharts(prev => [...prev, { title: rec.title, option }]);
      if (!silent) {
        toast.success(`Created chart: ${rec.title}`);
      }
    } catch (error) {
      console.error('Error creating chart:', error);
      if (!silent) {
        toast.error('Failed to create chart');
      }
    }
  };

  const createEChartsOption = (rec: VisualizationRecommendation, data: any[]): EChartsOption => {
    const chartType = rec.type || rec.chart_type || 'bar';
    
    if (chartType === 'gauge') {
      const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
      const values = data.map(d => Number(d[yAxis]) || 0);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      
      return {
        title: { text: rec.title, left: 'center' },
        series: [{
          type: 'gauge',
          data: [{ value: Math.round(avg), name: String(yAxis) }],
          max: Math.round(max * 1.2),
          detail: { formatter: '{value}' }
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

      const pieData = Object.entries(grouped).map(([name, value]) => ({ 
        name, 
        value: Number(value) 
      }));

      return {
        title: { text: rec.title, left: 'center' },
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          type: 'pie',
          radius: '60%',
          data: pieData as any,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };
    }

    if (chartType === 'scatter') {
      const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
      const scatterData = data.map(d => [Number(d[rec.x_axis]) || 0, Number(d[yAxis]) || 0]);

      return {
        title: { text: rec.title, left: 'center' },
        xAxis: { name: rec.x_axis },
        yAxis: { name: String(yAxis) },
        series: [{
          type: 'scatter',
          data: scatterData,
          symbolSize: 8
        }]
      };
    }

    if (chartType === 'candlestick') {
      const candleData = data.map(d => [
        Number(d['open']) || 0,
        Number(d['close']) || 0,
        Number(d['low']) || 0,
        Number(d['high']) || 0
      ]);

      return {
        title: { text: rec.title, left: 'center' },
        xAxis: { type: 'category', data: data.map((_, i) => i + 1) },
        yAxis: {},
        series: [{
          type: 'candlestick',
          data: candleData
        }]
      };
    }

    if (chartType === 'area') {
      const xData = data.map(d => d[rec.x_axis]);
      const yAxisArray = Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis];
      const series = yAxisArray.map((yCol: string) => ({
        name: yCol,
        type: 'line' as const,
        areaStyle: {},
        data: data.map(d => Number(d[yCol]) || 0)
      }));

      return {
        title: { text: rec.title, left: 'center' },
        xAxis: { type: 'category', data: xData },
        yAxis: { type: 'value' },
        series: series as any
      };
    }

    const xData = data.map(d => d[rec.x_axis]);
    const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
    const yData = data.map(d => Number(d[yAxis]) || 0);

    return {
      title: { text: rec.title, left: 'center' },
      xAxis: { type: 'category', data: xData },
      yAxis: { type: 'value' },
      series: [{
        name: String(yAxis),
        type: chartType as any,
        data: yData,
      }],
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered comprehensive dashboard
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Select Data Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedDataSourceId || ''}
            onChange={(e) => setSelectedDataSourceId(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
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

      {charts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Dashboard ({charts.length} charts)
              </CardTitle>
              <Button
                onClick={() => setCharts([])}
                size="sm"
                variant="outline"
              >
                Clear All
              </Button>
            </div>
            <CardDescription>
              Auto-generated comprehensive dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {charts.map((chart, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-card">
                  <EChartsWrapper option={chart.option} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedDataSourceId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Data Source Selected</h3>
              <p className="text-muted-foreground">
                Select a data source above to generate comprehensive dashboard
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
