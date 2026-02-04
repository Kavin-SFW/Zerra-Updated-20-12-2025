import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, TrendingDown, BarChart3, Users, 
    Calendar, Target, ArrowUpRight, ArrowDownRight,
    Activity, PieChart, LineChart
} from 'lucide-react';
import EChartsWrapper from '@/components/charts/EChartsWrapper';
import { EChartsOption } from 'echarts';
import { createEChartsOption } from '@/lib/chart-utils';
import { VisualizationRecommendation } from '@/types/analytics';
import { applyPowerBITheme } from '@/lib/powerbi-chart-theme';

interface ComparativeAnalysisProps {
    data: any[];
    dateColumn?: string;
    metricColumn?: string;
    dimensionColumn?: string;
}

export function ComparativeAnalysis({ 
    data, 
    dateColumn, 
    metricColumn, 
    dimensionColumn 
}: ComparativeAnalysisProps) {
    const [periodType, setPeriodType] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
    const [comparisonType, setComparisonType] = useState<'period' | 'ab' | 'cohort' | 'benchmark'>('period');
    const [selectedMetric, setSelectedMetric] = useState<string>(metricColumn || '');
    const [selectedDimension, setSelectedDimension] = useState<string>(dimensionColumn || '');

    // Helper function for standard deviation calculation
    const calculateStdDev = (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    };

    // Period-over-Period Comparison
    const periodOverPeriodData = useMemo(() => {
        if (!dateColumn || !selectedMetric || data.length === 0) return null;

        const currentPeriod = data.filter((item, idx) => idx >= data.length / 2);
        const previousPeriod = data.filter((item, idx) => idx < data.length / 2);

        const currentSum = currentPeriod.reduce((sum, item) => {
            return sum + (Number(item[selectedMetric]) || 0);
        }, 0);

        const previousSum = previousPeriod.reduce((sum, item) => {
            return sum + (Number(item[selectedMetric]) || 0);
        }, 0);

        const change = currentSum - previousSum;
        const changePercent = previousSum !== 0 ? (change / previousSum) * 100 : 0;

        return {
            current: currentSum,
            previous: previousSum,
            change,
            changePercent,
            currentData: currentPeriod,
            previousData: previousPeriod
        };
    }, [data, dateColumn, selectedMetric]);

    // A/B Testing Visualization
    const abTestData = useMemo(() => {
        if (!selectedDimension || !selectedMetric || data.length === 0) return null;

        const groups = data.reduce((acc: any, item) => {
            const group = item[selectedDimension] || 'Unknown';
            if (!acc[group]) {
                acc[group] = { count: 0, sum: 0, values: [] };
            }
            acc[group].count++;
            const value = Number(item[selectedMetric]) || 0;
            acc[group].sum += value;
            acc[group].values.push(value);
            return acc;
        }, {});

        const groupsArray = Object.entries(groups).map(([name, stats]: [string, any]) => ({
            name,
            count: stats.count,
            average: stats.sum / stats.count,
            total: stats.sum,
            values: stats.values
        }));

        // Calculate statistical significance (simplified)
        if (groupsArray.length >= 2) {
            const [groupA, groupB] = groupsArray;
            const meanA = groupA.average;
            const meanB = groupB.average;
            const stdA = calculateStdDev(groupA.values);
            const stdB = calculateStdDev(groupB.values);
            const pooledStd = Math.sqrt((stdA * stdA + stdB * stdB) / 2);
            const tStat = pooledStd > 0 ? (meanA - meanB) / pooledStd : 0;
            const isSignificant = Math.abs(tStat) > 1.96; // 95% confidence

            return {
                groups: groupsArray,
                significance: isSignificant,
                tStatistic: tStat,
                improvement: ((meanA - meanB) / meanB) * 100
            };
        }

        return { groups: groupsArray, significance: false, tStatistic: 0, improvement: 0 };
    }, [data, selectedDimension, selectedMetric]);

    // Cohort Analysis
    const cohortData = useMemo(() => {
        if (!dateColumn || !selectedMetric || data.length === 0) return null;

        // Group by cohort (e.g., first month of activity)
        const cohorts = data.reduce((acc: any, item) => {
            const date = new Date(item[dateColumn]);
            const cohortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[cohortKey]) {
                acc[cohortKey] = [];
            }
            acc[cohortKey].push(item);
            return acc;
        }, {});

        const cohortMetrics = Object.entries(cohorts).map(([cohort, items]: [string, any]) => {
            const total = items.reduce((sum: number, item: any) => {
                return sum + (Number(item[selectedMetric]) || 0);
            }, 0);
            return {
                cohort,
                count: items.length,
                total,
                average: total / items.length
            };
        }).sort((a, b) => a.cohort.localeCompare(b.cohort));

        return cohortMetrics;
    }, [data, dateColumn, selectedMetric]);

    // Benchmarking
    const benchmarkData = useMemo(() => {
        if (!selectedMetric || data.length === 0) return null;

        const values = data.map(item => Number(item[selectedMetric]) || 0).filter(v => !isNaN(v));
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
        const p75 = values[Math.floor(values.length * 0.75)];
        const p90 = values[Math.floor(values.length * 0.90)];

        // Industry benchmarks (mock - should come from external source)
        const industryBenchmarks = {
            average: average * 1.1, // 10% above current
            topQuartile: p75 * 1.2,
            topDecile: p90 * 1.3
        };

        return {
            current: { average, median, p75, p90 },
            industry: industryBenchmarks,
            performance: {
                vsAverage: ((average / industryBenchmarks.average) * 100) - 100,
                vsTopQuartile: ((average / industryBenchmarks.topQuartile) * 100) - 100,
                vsTopDecile: ((average / industryBenchmarks.topDecile) * 100) - 100
            }
        };
    }, [data, selectedMetric]);

    const getPeriodOverPeriodChart = (): EChartsOption | null => {
        if (!periodOverPeriodData) return null;

        return applyPowerBITheme({
            tooltip: { trigger: 'axis' },
            legend: { data: ['Current Period', 'Previous Period'] },
            xAxis: { type: 'category', data: ['Period 1', 'Period 2'] },
            yAxis: { type: 'value' },
            series: [
                {
                    name: 'Current Period',
                    type: 'bar',
                    data: [periodOverPeriodData.current],
                    itemStyle: { color: '#0078D4' }
                },
                {
                    name: 'Previous Period',
                    type: 'bar',
                    data: [periodOverPeriodData.previous],
                    itemStyle: { color: '#605E5C' }
                }
            ]
        });
    };

    const getABTestChart = (): EChartsOption | null => {
        if (!abTestData || abTestData.groups.length === 0) return null;

        return applyPowerBITheme({
            tooltip: { trigger: 'axis' },
            xAxis: { 
                type: 'category', 
                data: abTestData.groups.map(g => g.name) 
            },
            yAxis: { type: 'value' },
            series: [{
                type: 'bar',
                data: abTestData.groups.map(g => g.average),
                itemStyle: { 
                    color: (params: any) => 
                        abTestData.significance && params.dataIndex === 0 
                            ? '#10B981' 
                            : '#0078D4' 
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: (params: any) => `${params.value.toFixed(2)}`
                }
            }]
        });
    };

    const getCohortChart = (): EChartsOption | null => {
        if (!cohortData || cohortData.length === 0) return null;

        return applyPowerBITheme({
            tooltip: { trigger: 'axis' },
            xAxis: { 
                type: 'category', 
                data: cohortData.map(c => c.cohort) 
            },
            yAxis: { type: 'value' },
            series: [{
                type: 'line',
                data: cohortData.map(c => c.average),
                smooth: true,
                itemStyle: { color: '#0078D4' },
                areaStyle: { opacity: 0.3 }
            }]
        });
    };

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return (
        <div className="w-full space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Comparative Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <Label>Metric</Label>
                            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select metric" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(col => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Dimension (for A/B Testing)</Label>
                            <Select value={selectedDimension} onValueChange={setSelectedDimension}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select dimension" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(col => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Period Type</Label>
                            <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Day</SelectItem>
                                    <SelectItem value="week">Week</SelectItem>
                                    <SelectItem value="month">Month</SelectItem>
                                    <SelectItem value="quarter">Quarter</SelectItem>
                                    <SelectItem value="year">Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
                <TabsList>
                    <TabsTrigger value="period">Period-over-Period</TabsTrigger>
                    <TabsTrigger value="ab">A/B Testing</TabsTrigger>
                    <TabsTrigger value="cohort">Cohort Analysis</TabsTrigger>
                    <TabsTrigger value="benchmark">Benchmarking</TabsTrigger>
                </TabsList>

                {/* Period-over-Period */}
                <TabsContent value="period">
                    {periodOverPeriodData && (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Period-over-Period Comparison</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-2xl font-bold">
                                                    {periodOverPeriodData.changePercent > 0 ? (
                                                        <span className="text-green-600">
                                                            <ArrowUpRight className="inline h-5 w-5" />
                                                            {periodOverPeriodData.changePercent.toFixed(2)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-red-600">
                                                            <ArrowDownRight className="inline h-5 w-5" />
                                                            {periodOverPeriodData.changePercent.toFixed(2)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">Change</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-2xl font-bold">
                                                    {periodOverPeriodData.current.toLocaleString()}
                                                </div>
                                                <p className="text-sm text-gray-500">Current Period</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="text-2xl font-bold">
                                                    {periodOverPeriodData.previous.toLocaleString()}
                                                </div>
                                                <p className="text-sm text-gray-500">Previous Period</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div style={{ height: '400px' }}>
                                        <EChartsWrapper option={getPeriodOverPeriodChart()!} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* A/B Testing */}
                <TabsContent value="ab">
                    {abTestData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>A/B Testing Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4">
                                    <Badge variant={abTestData.significance ? 'default' : 'secondary'}>
                                        {abTestData.significance ? 'Statistically Significant' : 'Not Significant'}
                                    </Badge>
                                    {abTestData.improvement !== 0 && (
                                        <span className="ml-2 text-sm">
                                            Improvement: {abTestData.improvement.toFixed(2)}%
                                        </span>
                                    )}
                                </div>
                                <div style={{ height: '400px' }}>
                                    <EChartsWrapper option={getABTestChart()!} />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Cohort Analysis */}
                <TabsContent value="cohort">
                    {cohortData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Cohort Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div style={{ height: '400px' }}>
                                    <EChartsWrapper option={getCohortChart()!} />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Benchmarking */}
                <TabsContent value="benchmark">
                    {benchmarkData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Industry Benchmarking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-2xl font-bold">
                                                {benchmarkData.performance.vsAverage > 0 ? (
                                                    <span className="text-green-600">
                                                        +{benchmarkData.performance.vsAverage.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-red-600">
                                                        {benchmarkData.performance.vsAverage.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">vs Industry Average</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-2xl font-bold">
                                                {benchmarkData.performance.vsTopQuartile > 0 ? (
                                                    <span className="text-green-600">
                                                        +{benchmarkData.performance.vsTopQuartile.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-red-600">
                                                        {benchmarkData.performance.vsTopQuartile.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">vs Top Quartile</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-2xl font-bold">
                                                {benchmarkData.performance.vsTopDecile > 0 ? (
                                                    <span className="text-green-600">
                                                        +{benchmarkData.performance.vsTopDecile.toFixed(2)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-red-600">
                                                        {benchmarkData.performance.vsTopDecile.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">vs Top Decile</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
