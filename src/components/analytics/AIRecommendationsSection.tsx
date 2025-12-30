import React, { useState, useEffect } from "react";
import { Sparkles, Lightbulb, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VisualizationRecommendation, PrescriptiveInsight } from "@/types/analytics";
import { getPriorityColor, getInsightIcon, createEChartsOption } from "@/lib/chart-utils";
import EChartsWrapper from "@/components/charts/EChartsWrapper";

interface AIRecommendationsSectionProps {
    selectedDataSourceId: string | null;
    rawData: any[];
    onCreateChart?: (rec: VisualizationRecommendation) => void;
}

const AIRecommendationsSection: React.FC<AIRecommendationsSectionProps> = ({
    selectedDataSourceId,
    rawData,
    onCreateChart
}) => {
    const [aiRecommendations, setAiRecommendations] = useState<VisualizationRecommendation[]>([]);
    const [prescriptiveInsights, setPrescriptiveInsights] = useState<PrescriptiveInsight[]>([]);
    const [loading, setLoading] = useState({ ai: false, prescriptive: false });
    const [viewingRec, setViewingRec] = useState<VisualizationRecommendation | null>(null);

    useEffect(() => {
        if (selectedDataSourceId) {
            generateAIRecommendations();
            generatePrescriptiveAnalytics();
        } else {
            setAiRecommendations([]);
            setPrescriptiveInsights([]);
        }
    }, [selectedDataSourceId]);

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

    const generateLocalInsights = (data: any[]): PrescriptiveInsight[] => {
        if (!data || data.length === 0) return [];

        const insights: PrescriptiveInsight[] = [];
        const keys = Object.keys(data[0]);
        const numericCols = keys.filter(k => {
            const val = data[0][k];
            return typeof val === 'number' || (!isNaN(Number(val)) && typeof val !== 'boolean' && val !== '');
        });
        const categoricalCols = keys.filter(k => typeof data[0][k] === 'string' && !k.toLowerCase().includes('id') && !k.toLowerCase().includes('url'));

        // 1. Data Density Insight
        insights.push({
            type: 'optimization',
            title: 'Data Capacity Analysis',
            description: `Currently processing ${data.length.toLocaleString()} records across ${keys.length} data points.`,
            recommendation: 'Optimize data intake by focusing on high-variance dimensions.',
            priority: 'medium'
        });

        // 2. Numeric Variance Insight (Real Data)
        if (numericCols.length > 0) {
            const col = numericCols[0];
            const values = data.map(d => Number(d[col])).filter(v => !isNaN(v));
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                if (max > avg * 1.5) {
                    insights.push({
                        type: 'anomaly',
                        title: `${col} Performance Alert`,
                        description: `Top performers are ${((max / avg)).toFixed(1)}x above the mean of ${avg.toFixed(0)}.`,
                        recommendation: 'Investigate top-tier outliers to replicate high-performance patterns.',
                        priority: 'high'
                    });
                }
            }
        }

        // 3. Categorical Distribution (Real Data)
        if (categoricalCols.length > 0) {
            const col = categoricalCols[0];
            const counts: Record<string, number> = {};
            data.slice(0, 100).forEach(d => { counts[d[col]] = (counts[d[col]] || 0) + 1; });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
                const dominance = (sorted[0][1] / Math.min(data.length, 100)) * 100;
                insights.push({
                    type: 'trend',
                    title: `${col} Concentration`,
                    description: `Primary category "${sorted[0][0]}" represents ${dominance.toFixed(1)}% of sampled data.`,
                    recommendation: 'Balance resource allocation toward secondary categories to reduce risk.',
                    priority: 'medium'
                });
            }
        }

        // 4. Quality Insight (Real Data)
        const nullPercentage = (data.reduce((acc, d) => acc + Object.values(d).filter(v => v === null || v === '').length, 0) / (data.length * keys.length)) * 100;
        if (nullPercentage > 0) {
            insights.push({
                type: 'optimization',
                title: 'Data Integrity Score',
                description: `Missing values detected in ${nullPercentage.toFixed(1)}% of the total data matrix.`,
                recommendation: 'Implement validation schemas to improve downstream AI accuracy.',
                priority: 'low'
            });
        }

        // 5. General Prediction
        insights.push({
            type: 'prediction',
            title: 'Statistical Readiness',
            description: 'Dataset volume is sufficient for multi-variable regression modeling.',
            recommendation: 'Switch to "Advanced Mode" for deep-dive predictive forecasting.',
            priority: 'high'
        });

        return insights.slice(0, 5);
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

            const local = generateLocalInsights(rawData);

            if (!response.ok) {
                setPrescriptiveInsights(local);
                return;
            }
            const result = await response.json();
            const apiInsights = result.insights || [];

            // Merge: API insights first, then fill up to 5 with local insights
            const merged = [...apiInsights];
            local.forEach(l => {
                if (merged.length < 5 && !merged.some(m => m.title === l.title)) {
                    merged.push(l);
                }
            });

            setPrescriptiveInsights(merged.slice(0, 5));
        } catch (error) {
            console.error('Error generating prescriptive analytics:', error);
            setPrescriptiveInsights(generateLocalInsights(rawData));
            toast.error('Supplementing with local insights');
        } finally {
            setLoading(prev => ({ ...prev, prescriptive: false }));
        }
    };

    const handleOpenChart = (rec: VisualizationRecommendation) => {
        setViewingRec(rec);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/40 border-b border-slate-100/60 pb-2">
                    <CardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                        Prescriptive Insights
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                    {loading.prescriptive ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex gap-3">
                                <Skeleton className="h-6 w-6 rounded-md bg-slate-200" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3 w-32 bg-slate-200" />
                                    <Skeleton className="h-2 w-full bg-slate-200" />
                                </div>
                            </div>
                        ))
                    ) : prescriptiveInsights.slice(0, 5).map((insight, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white border border-slate-100 flex gap-3 hover:border-indigo-100 hover:bg-slate-50/30 transition-all group">
                            <div className="mt-0.5 opacity-80 group-hover:scale-110 transition-transform">
                                {React.cloneElement(getInsightIcon(insight.type) as React.ReactElement, { className: "h-3.5 w-3.5" })}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <h4 className="font-bold text-slate-900 text-[12px] leading-tight">{insight.title}</h4>
                                    <Badge variant="outline" className={`text-[8px] px-1 py-0 uppercase tracking-tighter ${getPriorityColor(insight.priority)}`}>
                                        {insight.priority}
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight mb-1.5 italic">"{insight.description}"</p>
                                <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50 inline-block">
                                    <span className="text-[8px] uppercase tracking-tighter opacity-70 mr-1">Action:</span>
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
                        AI Suggested Charts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading.ai ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-40 bg-slate-200" />
                                    <Skeleton className="h-3 w-20 bg-slate-200" />
                                </div>
                                <Skeleton className="h-8 w-16 bg-slate-200" />
                            </div>
                        ))
                    ) : aiRecommendations.slice(0, 5).map((rec, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/50 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm mb-1">{rec.title}</h4>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[10px] uppercase ${getPriorityColor(rec.priority)}`}>
                                        {rec.priority}
                                    </Badge>
                                    <p className="text-[11px] text-slate-500">{rec.type} view</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => handleOpenChart(rec)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    View
                                </Button>
                                {onCreateChart && (
                                    <Button
                                        onClick={() => onCreateChart(rec)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-slate-600"
                                        title="Add to Dashboard"
                                    >
                                        +
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Recommendation Chart Preview Dialog */}
            <Dialog open={!!viewingRec} onOpenChange={(open) => !open && setViewingRec(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5 text-purple-500" />
                            {viewingRec?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {viewingRec && rawData.length > 0 && (
                            <div className="h-[340px] w-full bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-inner">
                                <EChartsWrapper
                                    option={createEChartsOption(viewingRec, rawData)}
                                    style={{ height: '100%', width: '100%' }}
                                />
                            </div>
                        )}
                        {viewingRec?.reasoning && (
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                                    <Maximize2 className="h-4 w-4" />
                                    AI Reasoning
                                </h4>
                                <p className="text-sm text-blue-800 leading-relaxed italic">
                                    "{viewingRec.reasoning}"
                                </p>
                            </div>
                        )}
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                            <div className="flex gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dimension</p>
                                    <p className="text-sm font-semibold text-slate-700">{viewingRec?.x_axis}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metric</p>
                                    <p className="text-sm font-semibold text-slate-700">{Array.isArray(viewingRec?.y_axis) ? viewingRec?.y_axis.join(', ') : viewingRec?.y_axis}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setViewingRec(null)}>Close</Button>
                                {onCreateChart && viewingRec && (
                                    <Button onClick={() => {
                                        onCreateChart(viewingRec);
                                        setViewingRec(null);
                                    }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all">
                                        Pin to Dashboard
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AIRecommendationsSection;
