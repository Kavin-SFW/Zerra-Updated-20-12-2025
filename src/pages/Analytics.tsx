import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Lightbulb, Database,
  Loader2, AlertCircle, Sparkles, RefreshCw, Target, Zap
} from "lucide-react";
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
  const [charts, setCharts] = useState<Array<{ title: string; option: EChartsOption }>>([]);
  const [loading, setLoading] = useState({ dashboard: false, ai: false, prescriptive: false });
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();
  const [dataSources, setDataSources] = useState<any[]>([]);

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

      // Auto-create all charts
      setCharts([]);
      for (const rec of (result.recommendations || [])) {
        await createChart(rec, true);
      }

      toast.success(`Created ${result.recommendations?.length || 0} charts`);
    } catch (error) {
      console.error('Error generating dashboard:', error);
      toast.error('Failed to generate dashboard');
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
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
    const chartType = rec.type || 'bar';

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

    // Default: bar/line charts
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analytics with AI insights
          </p>
        </div>
      </div>

      {/* Data Source Selector */}
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

      {/* Auto-Generated Dashboard */}
      {charts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Auto-Generated Dashboard ({charts.length} charts)
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
              Automatically created visualizations from your data
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

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Chart Recommendations
              </CardTitle>
              <Button
                onClick={generateAIRecommendations}
                size="sm"
                variant="outline"
                disabled={loading.ai}
              >
                {loading.ai ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate
              </Button>
            </div>
            <CardDescription>
              AI-suggested visualizations based on your data patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiRecommendations.map((rec, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{rec.title}</h3>
                    <Badge variant={getPriorityColor(rec.priority) as any}>
                      {rec.priority}
                    </Badge>
                  </div>
                  {rec.reasoning && (
                    <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                  )}
                  <Button
                    onClick={() => createChart(rec)}
                    size="sm"
                    variant="secondary"
                  >
                    Create Chart
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prescriptive Insights */}
      {prescriptiveInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Prescriptive Analytics
            </CardTitle>
            <CardDescription>
              Actionable insights and recommendations from your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prescriptiveInsights.map((insight, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <h3 className="font-semibold">{insight.title}</h3>
                    </div>
                    <Badge variant={getPriorityColor(insight.priority) as any}>
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">💡 Recommendation:</p>
                    <p className="text-sm">{insight.recommendation}</p>
                  </div>
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
                Select a data source above to generate comprehensive analytics
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
