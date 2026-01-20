import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Lightbulb, Database,
  Loader2, AlertCircle, CheckCircle2, Target, Zap, TrendingDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HighchartsWrapper } from "@/components/HighchartsWrapper";
import Highcharts from "@/lib/highcharts-init";
import { useAnalytics } from "@/contexts/AnalyticsContext";

const Analytics = () => {
  const [descriptiveAnalytics, setDescriptiveAnalytics] = useState<any[]>([]);
  const [predictiveModels, setPredictiveModels] = useState<any[]>([]);
  const [prescriptiveInsights, setPrescriptiveInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState({ descriptive: false, predictive: false, prescriptive: false });
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();
  const [dataSources, setDataSources] = useState<any[]>([]);

  useEffect(() => {
    loadDataSources();
  }, []);

  useEffect(() => {
    if (selectedDataSourceId) {
      loadAnalytics();
      autoGenerateAnalytics();
    } else {
      // Clear analytics when no data source selected
      setDescriptiveAnalytics([]);
      setPredictiveModels([]);
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

  const loadAnalytics = async () => {
    await Promise.all([
      loadDescriptiveAnalytics(),
      loadPredictiveModels(),
      loadPrescriptiveInsights(),
    ]);
  };

  // Automatically generate all analytics types
  const autoGenerateAnalytics = async () => {
    if (!selectedDataSourceId) return;

    // Check if analytics already exist
    const { data: existingAnalytics } = await (supabase as any)
      .from('descriptive_analytics')
      .select('id')
      .eq('data_source_id', selectedDataSourceId)
      .limit(1);

    const { data: existingInsights } = await (supabase as any)
      .from('prescriptive_insights')
      .select('id')
      .eq('data_source_id', selectedDataSourceId)
      .limit(1);

    // Only generate if they don't exist
    if (!existingAnalytics || existingAnalytics.length === 0) {
      await runDescriptiveAnalytics(true); // Pass true for silent mode
    }

    if (!existingInsights || existingInsights.length === 0) {
      await generatePrescriptiveInsights(true); // Pass true for silent mode
    }

    // Reload analytics after a short delay to allow generation to complete
    setTimeout(() => {
      loadAnalytics();
    }, 2000);
  };

  const loadDescriptiveAnalytics = async () => {
    if (!selectedDataSourceId) {
      setDescriptiveAnalytics([]);
      return;
    }
    const { data } = await (supabase as any)
      .from('descriptive_analytics')
      .select('*')
      .eq('data_source_id', selectedDataSourceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setDescriptiveAnalytics(data);
  };

  const loadPredictiveModels = async () => {
    if (!selectedDataSourceId) {
      setPredictiveModels([]);
      return;
    }
    const { data } = await (supabase as any)
      .from('ml_models')
      .select('*')
      .eq('data_source_id', selectedDataSourceId)
      .eq('status', 'deployed')
      .order('created_at', { ascending: false });

    if (data) setPredictiveModels(data);
  };

  const loadPrescriptiveInsights = async () => {
    if (!selectedDataSourceId) {
      setPrescriptiveInsights([]);
      return;
    }
    const { data } = await (supabase as any)
      .from('prescriptive_insights')
      .select('*')
      .eq('data_source_id', selectedDataSourceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPrescriptiveInsights(data);
  };

  const runDescriptiveAnalytics = async (silent = false) => {
    if (!selectedDataSourceId) {
      if (!silent) toast.error("Please select a data source");
      return;
    }

    setLoading(prev => ({ ...prev, descriptive: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get data source to understand its structure
      const { data: dataSource } = await (supabase as any)
        .from('data_sources')
        .select('schema_info, metadata')
        .eq('id', selectedDataSourceId)
        .single();

      // Build dynamic query config based on data source schema
      const schemaInfo = dataSource?.schema_info || {};
      const columns = Object.keys(schemaInfo);
      
      // Try to find suitable columns for analysis
      const categoricalColumns = columns.filter((col: string) => 
        schemaInfo[col]?.type === 'categorical' || 
        schemaInfo[col]?.data_type === 'text' ||
        schemaInfo[col]?.data_type === 'string'
      );
      
      const numericColumns = columns.filter((col: string) => 
        schemaInfo[col]?.type === 'numeric' ||
        schemaInfo[col]?.data_type === 'number' ||
        schemaInfo[col]?.data_type === 'integer' ||
        schemaInfo[col]?.data_type === 'float'
      );

      const queryConfig: any = {
        query_type: 'aggregation',
      };

      // Use first available categorical column for grouping
      if (categoricalColumns.length > 0) {
        queryConfig.group_by = categoricalColumns[0];
      }

      // Use first available numeric columns for metrics
      if (numericColumns.length > 0) {
        queryConfig.metrics = numericColumns.slice(0, 3); // Use up to 3 metrics
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=descriptive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data_source_id: selectedDataSourceId,
            query_config: queryConfig,
            name: 'Auto-generated Descriptive Analysis',
            description: 'Automatically generated descriptive analytics',
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to run analytics');

      const result = await response.json();
      if (!silent) toast.success("Descriptive analytics generated");
      await loadDescriptiveAnalytics();
    } catch (error) {
      if (!silent) toast.error("Failed to run descriptive analytics");
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, descriptive: false }));
    }
  };

  const generatePrescriptiveInsights = async (silent = false) => {
    if (!selectedDataSourceId) {
      if (!silent) toast.error("Please select a data source");
      return;
    }

    setLoading(prev => ({ ...prev, prescriptive: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics?type=prescriptive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data_source_id: selectedDataSourceId,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Prescriptive analytics error:', errorText);
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      console.log('Prescriptive insights result:', result);
      if (!silent) {
        if (result.success && result.insights?.length > 0) {
          toast.success(`Generated ${result.insights.length} insights`);
        } else if (result.success && result.count === 0) {
          toast.warning('No insights generated. Try again with more data.');
        } else {
          toast.error('Failed to generate insights');
        }
      }
      await loadPrescriptiveInsights();
    } catch (error) {
      if (!silent) toast.error("Failed to generate prescriptive insights");
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, prescriptive: false }));
    }
  };

  const getInsightBadgeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'risk': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'efficiency': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'optimization': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const isLoadingAny = loading.descriptive || loading.predictive || loading.prescriptive;

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Analytics Dashboard</span>
          </h1>
          <p className="text-[#E5E7EB]/70 text-lg">Comprehensive insights from your data</p>
        </div>

        {/* Data Source Selector */}
        {dataSources.length > 0 && (
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5" />
                Select Data Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedDataSourceId || ''}
                onChange={(e) => setSelectedDataSourceId(e.target.value)}
                className="w-full bg-white/5 border-white/20 text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]"
              >
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Loading Indicator */}
        {isLoadingAny && (
          <Card className="glass-card border-[#00D4FF]/30">
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF] mr-3" />
              <span className="text-[#00D4FF]">Generating analytics...</span>
            </CardContent>
          </Card>
        )}

        {/* Unified Analytics View */}
        {selectedDataSourceId && (
          <div className="space-y-8">
            {/* Descriptive Analytics Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#00D4FF]/20 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-[#00D4FF]" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Descriptive Analytics</h2>
                  <p className="text-[#E5E7EB]/70 text-sm">Historical data analysis and trends</p>
                </div>
              </div>

              {descriptiveAnalytics.length === 0 ? (
                <Card className="glass-card border-white/10">
                  <CardContent className="text-center py-12 text-[#E5E7EB]/50">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{loading.descriptive ? 'Generating descriptive analytics...' : 'No descriptive analytics yet. Analytics will be generated automatically.'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {descriptiveAnalytics.map((analytics) => (
                    <Card key={analytics.id} className="glass-card border-white/10 hover:border-[#00D4FF]/30 transition-all">
                      <CardHeader>
                        <CardTitle className="text-white text-lg">{analytics.name}</CardTitle>
                        <CardDescription className="text-[#E5E7EB]/70">{analytics.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {analytics.chart_config && typeof analytics.chart_config === 'object' && (
                          <div className="h-80 -mx-6 -mb-6">
                            <HighchartsWrapper
                              options={analytics.chart_config as Highcharts.Options}
                            />
                          </div>
                        )}
                        {!analytics.chart_config && analytics.results && Array.isArray(analytics.results) && analytics.results.length > 0 && (
                          <div className="text-sm text-[#E5E7EB]/50 text-center py-8">
                            Chart data available but visualization not generated
                          </div>
                        )}
                        {analytics.results && Array.isArray(analytics.results) && analytics.results.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-[#E5E7EB]/50 mb-2">
                              {analytics.results.length} data point{analytics.results.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Predictive Analytics Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Predictive Analytics</h2>
                  <p className="text-[#E5E7EB]/70 text-sm">ML-powered predictions and forecasting</p>
                </div>
              </div>

              {predictiveModels.length === 0 ? (
                <Card className="glass-card border-white/10">
                  <CardContent className="text-center py-12 text-[#E5E7EB]/50">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No deployed models yet. Train a model to get predictions.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {predictiveModels.map((model) => (
                    <Card key={model.id} className="glass-card border-white/10 hover:border-purple-500/30 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white">{model.name}</CardTitle>
                            <CardDescription className="text-[#E5E7EB]/70 mt-1">
                              {model.model_type} • {model.algorithm}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Deployed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {model.model_metrics && (
                          <div className="space-y-3">
                            {Object.entries(model.model_metrics).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-sm text-[#E5E7EB]/70">{key}:</span>
                                <span className="text-sm font-semibold text-white">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {model.target_column && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-sm">
                              <Target className="w-4 h-4 text-purple-400" />
                              <span className="text-[#E5E7EB]/70">Target:</span>
                              <span className="text-white font-medium">{model.target_column}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptive Analytics Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Lightbulb className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Prescriptive Insights</h2>
                  <p className="text-[#E5E7EB]/70 text-sm">Actionable recommendations and next steps</p>
                </div>
              </div>

              {prescriptiveInsights.length === 0 ? (
                <Card className="glass-card border-white/10">
                  <CardContent className="text-center py-12 text-[#E5E7EB]/50">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{loading.prescriptive ? 'Generating prescriptive insights...' : 'No insights yet. Insights will be generated automatically when data is available.'}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {prescriptiveInsights.map((insight) => (
                    <Card key={insight.id} className="glass-card border-white/10 hover:border-yellow-500/30 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge className={getInsightBadgeColor(insight.insight_type)}>
                                {insight.insight_type}
                              </Badge>
                              <Badge className={getPriorityBadgeColor(insight.priority)}>
                                {insight.priority}
                              </Badge>
                              {insight.status === 'implemented' && (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                            <CardTitle className="text-white text-xl mb-2">{insight.title}</CardTitle>
                            <CardDescription className="text-[#E5E7EB]/70">
                              {insight.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {insight.reasoning && (
                          <div>
                            <h4 className="text-sm font-semibold text-[#E5E7EB] mb-2 flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Reasoning
                            </h4>
                            <p className="text-sm text-[#E5E7EB]/70 leading-relaxed">{insight.reasoning}</p>
                          </div>
                        )}
                        {insight.actionable_steps && Array.isArray(insight.actionable_steps) && (
                          <div>
                            <h4 className="text-sm font-semibold text-[#E5E7EB] mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Actionable Steps
                            </h4>
                            <ul className="space-y-2">
                              {insight.actionable_steps.map((step: string, idx: number) => (
                                <li key={idx} className="text-sm text-[#E5E7EB]/70 flex items-start gap-2">
                                  <span className="text-[#00D4FF] mt-1">•</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {insight.confidence_score && (
                          <div className="flex items-center justify-between pt-4 border-t border-white/10">
                            <span className="text-sm text-[#E5E7EB]/70">Confidence Score</span>
                            <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30">
                              {(insight.confidence_score * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedDataSourceId && !isLoadingAny && (
          <Card className="glass-card border-white/10">
            <CardContent className="text-center py-16">
              <Database className="w-20 h-20 mx-auto mb-4 opacity-50 text-[#00D4FF]" />
              <h3 className="text-xl font-semibold text-white mb-2">No Data Source Selected</h3>
              <p className="text-[#E5E7EB]/70">Please select a data source to view analytics</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Analytics;
