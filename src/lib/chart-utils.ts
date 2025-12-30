import * as echarts from 'echarts';
import { EChartsOption } from 'echarts';
import { VisualizationRecommendation } from '@/types/analytics';
import React from 'react';
import {
    TrendingUp, Activity, Target, Zap,
    BarChart3, AlertCircle
} from 'lucide-react';

export const createEChartsOption = (
    rec: VisualizationRecommendation,
    data: any[],
    chartSortOrder: 'none' | 'desc' | 'asc' = 'none',
    isFullView: boolean = false
): EChartsOption => {
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
        },
        animationDuration: 800,
        animationEasing: 'cubicOut',
        animationDurationUpdate: 500,
        animationEasingUpdate: 'quinticOut'
    };

    if (chartType === 'gauge') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const values = data.map(d => Number(d[yAxis]) || 0);
        const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        const max = Math.max(...values, 100);

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

    if (chartType === 'funnel') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const grouped = data.reduce((acc: any, item) => {
            const key = String(item[rec.x_axis]);
            const value = Number(item[yAxis]) || 0;
            acc[key] = (acc[key] || 0) + value;
            return acc;
        }, {});

        const funnelData: { name: string; value: number }[] = Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        return {
            ...baseOption,
            tooltip: { trigger: 'item', formatter: '{b}: {c}' },
            series: [{
                type: 'funnel',
                left: '10%',
                top: 40,
                bottom: 40,
                width: '80%',
                min: 0,
                max: (funnelData[0]?.value as number) || 100,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: { show: true, position: 'inside', fontSize: 10 },
                emphasis: { label: { fontSize: 14 } },
                data: funnelData
            }]
        };
    }

    if (chartType === 'radar') {
        const yAxisArray = Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis];
        const sampleSize = 6;
        const topData = data.slice(0, sampleSize);

        const indicators = topData.map(d => ({
            name: String(d[rec.x_axis]),
            max: Math.max(...data.map(i => Number(i[yAxisArray[0]]) || 0)) * 1.2 || 100
        }));

        const seriesData = yAxisArray.map(yCol => ({
            name: yCol,
            value: topData.map(d => Number(d[yCol]) || 0)
        }));

        return {
            ...baseOption,
            tooltip: { trigger: 'item' },
            radar: {
                indicator: indicators,
                radius: '60%',
                center: ['50%', '55%'],
                splitNumber: 4,
                axisLine: { lineStyle: { color: '#E2E8F0' } },
                splitArea: { areaStyle: { color: ['rgba(255,255,255,0)', 'rgba(238,242,255,0.3)'] } },
                splitLine: { lineStyle: { color: '#E2E8F0' } }
            },
            series: [{
                type: 'radar',
                data: seriesData,
                symbolSize: 6,
                areaStyle: { opacity: 0.2 },
                lineStyle: { width: 2 }
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
            }));

        if (chartSortOrder === 'desc') {
            pieData.sort((a, b) => b.value - a.value);
        } else if (chartSortOrder === 'asc') {
            pieData.sort((a, b) => a.value - b.value);
        } else {
            pieData.sort((a, b) => b.value - a.value);
        }

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
                nameGap: 40,
                nameTextStyle: {
                    color: '#64748B',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: [25, 0, 0, 0]
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

    if ((rec as any).isHorizontal && chartType === 'bar') {
        const aggregated: Record<string, number> = {};
        xDataRaw.forEach((category, idx) => {
            aggregated[category] = (aggregated[category] || 0) + yDataRaw[idx];
        });

        const sorted = Object.entries(aggregated);
        if (chartSortOrder === 'desc') {
            sorted.sort(([, a], [, b]) => b - a);
        } else if (chartSortOrder === 'asc') {
            sorted.sort(([, a], [, b]) => a - b);
        } else {
            sorted.sort(([, a], [, b]) => b - a);
        }

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
                data: finalCategories,
                axisLabel: {
                    color: '#64748B',
                    fontSize: 10,
                    interval: 0,
                    width: 100,
                    overflow: 'truncate'
                },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: '#E2E8F0' } },
                inverse: true,
            },
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

    let xData = xDataRaw;
    let yData = yDataRaw;

    if (!isFullView && !((rec as any).isHorizontal)) {
        const aggregated: Record<string, number> = {};
        xDataRaw.forEach((category, idx) => {
            aggregated[category] = (aggregated[category] || 0) + yDataRaw[idx];
        });

        const sorted = Object.entries(aggregated);
        if (chartSortOrder === 'desc') {
            sorted.sort(([, a], [, b]) => b - a);
        } else if (chartSortOrder === 'asc') {
            sorted.sort(([, a], [, b]) => a - b);
        } else {
            sorted.sort(([, a], [, b]) => b - a);
        }

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

export const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
        case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
        case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export const getInsightIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'trend': return React.createElement(TrendingUp, { className: "h-4 w-4 text-blue-500" });
        case 'anomaly': return React.createElement(Activity, { className: "h-4 w-4 text-rose-500" });
        case 'prediction': return React.createElement(Target, { className: "h-4 w-4 text-purple-500" });
        case 'optimization': return React.createElement(Zap, { className: "h-4 w-4 text-amber-500" });
        case 'correlation': return React.createElement(BarChart3, { className: "h-4 w-4 text-teal-500" });
        default: return React.createElement(AlertCircle, { className: "h-4 w-4 text-slate-500" });
    }
};
