import * as echarts from 'echarts';
import { EChartsOption } from 'echarts';
import { VisualizationRecommendation } from '@/types/analytics';
import React from 'react';
import {
    TrendingUp, Activity, Target, Zap,
    BarChart3, AlertCircle
} from 'lucide-react';
import { applyPowerBITheme, POWERBI_COLORS, createPowerBIGradient, formatPowerBINumber } from './powerbi-chart-theme';

export const capitalize = (str: any) => {
    if (!str) return '';
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// Helper to apply PowerBI theme to chart options
const applyTheme = (option: EChartsOption): EChartsOption => {
    return applyPowerBITheme(option);
};

export const createEChartsOption = (
    rec: VisualizationRecommendation,
    data: any[],
    chartSortOrder: 'none' | 'desc' | 'asc' = 'none',
    isFullView: boolean = false,
    breakdownDimension?: string | string[] // Support single or multiple dimensions
): EChartsOption => {
    const chartType = rec.type || 'bar';

    // Use PowerBI theme as base
    const baseOption: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#FFFFFF',
            borderColor: '#E1DFDD',
            borderWidth: 1,
            textStyle: {
                color: '#323130',
                fontSize: 12,
                fontFamily: 'Segoe UI, sans-serif'
            },
            padding: [8, 12],
            extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.15); border-radius: 4px;',
            axisPointer: {
                type: 'line',
                lineStyle: {
                    color: '#0078D4',
                    width: 1,
                    type: 'solid'
                },
                label: {
                    backgroundColor: '#0078D4',
                    borderColor: '#0078D4',
                    color: '#FFFFFF',
                    fontSize: 11
                }
            }
        },
        grid: {
            left: '60px',
            right: '20px',
            top: '50px',
            bottom: '50px',
            containLabel: true,
            borderColor: 'transparent'
        },
        color: POWERBI_COLORS,
        textStyle: {
            fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
            fontSize: 12,
            color: '#323130',
            fontWeight: 'normal'
        },
        animationDuration: 750,
        animationEasing: 'cubicOut'
    };

    // Apply dynamic palette if present
    const chartColors = (rec.colorPalette && rec.colorPalette.length > 0)
        ? rec.colorPalette
        : (baseOption.color as string[]);
    baseOption.color = chartColors;

    if (chartType === 'gauge') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const values = data.map(d => Number(d[yAxis]) || 0);
        const avg = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        const max = Math.max(...values, 100);

        return applyTheme({
            ...baseOption,
            series: [{
                type: 'gauge',
                center: ['50%', '60%'],
                radius: '85%',
                data: [{ value: Math.round(avg), name: capitalize(yAxis) }],
                max: Math.round(max * 1.2),
                pointer: { itemStyle: { color: '#0078D4' }, width: 4 },
                detail: {
                    formatter: (val: number) => `{value|${val}}{unit|%}`,
                    offsetCenter: [0, '50%'],
                    rich: {
                        value: { fontSize: 24, fontWeight: 'bold', color: '#323130' },
                        unit: { fontSize: 12, color: '#605E5C', padding: [0, 0, 4, 2] }
                    }
                }
            }]
        });
    }

    if (chartType === 'funnel') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const isCountAggregation = yAxis === 'count' || yAxis === '_count_' || !data[0]?.[yAxis];
        const grouped = data.reduce((acc: any, item) => {
            const key = capitalize(item[rec.x_axis]);
            // If count aggregation or y_axis column doesn't exist, count occurrences
            const value = isCountAggregation ? 1 : (Number(item[yAxis]) || 0);
            acc[key] = (acc[key] || 0) + value;
            return acc;
        }, {});

        const funnelData: { name: string; value: number }[] = Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        return applyTheme({
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
                label: { show: true, position: 'inside', fontSize: 11, color: '#323130' },
                emphasis: { label: { fontSize: 13, fontWeight: 'bold' } },
                data: funnelData
            }]
        });
    }

    if (chartType === 'radar') {
        const yAxisArray = Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis];
        const sampleSize = 6;
        const topData = data.slice(0, sampleSize);

        const indicators = topData.map(d => ({
            name: capitalize(d[rec.x_axis]),
            max: Math.max(...data.map(i => Number(i[yAxisArray[0]]) || 0)) * 1.2 || 100
        }));

        const seriesData = yAxisArray.map(yCol => ({
            name: capitalize(yCol),
            value: topData.map(d => Number(d[yCol]) || 0)
        }));

        return applyTheme({
            ...baseOption,
            tooltip: { trigger: 'item' },
            radar: {
                indicator: indicators,
                radius: '60%',
                center: ['50%', '55%'],
                splitNumber: 4,
                axisLine: { lineStyle: { color: '#E1DFDD' } },
                splitArea: { areaStyle: { color: ['rgba(255,255,255,0)', 'rgba(243,242,241,0.3)'] } },
                splitLine: { lineStyle: { color: '#E1DFDD' } }
            },
            series: [{
                type: 'radar',
                data: seriesData,
                symbolSize: 6,
                areaStyle: { opacity: 0.25 },
                lineStyle: { width: 2, color: '#0078D4' }
            }]
        });
    }

    if (chartType === 'pie') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const isCountAggregation = yAxis === 'count' || yAxis === '_count_' || !data[0]?.[yAxis];
        const dims = Array.isArray(breakdownDimension)
            ? breakdownDimension
            : (breakdownDimension ? [breakdownDimension] : []);

        const useBreakdown = dims.length > 0
            && data.length > 0
            && dims.every(dim => Object.prototype.hasOwnProperty.call(data[0], dim));

        const getKey = (item: any) => {
            if (useBreakdown) {
                const keyParts = dims.map(dim => {
                    const v = item?.[dim];
                    return capitalize(v ?? 'Other');
                });
                return keyParts.join(' | ');
            }
            return capitalize(item?.[rec.x_axis]);
        };

        const grouped = data.reduce((acc: any, item) => {
            const key = getKey(item);
            // If count aggregation or y_axis column doesn't exist, count occurrences
            let value: number;
            if (isCountAggregation) {
                value = 1;
            } else {
                const rawValue = item[yAxis];
                // More accurate number parsing
                if (rawValue === null || rawValue === undefined || rawValue === '') {
                    value = 0;
                } else {
                    const parsed = Number(rawValue);
                    value = isNaN(parsed) ? 0 : parsed;
                }
            }
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

        return applyTheme({
            ...baseOption,
            tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
            series: [{
                type: 'pie',
                radius: isFullView ? ['40%', '75%'] : ['45%', '80%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: true,
                label: useBreakdown ? { show: false } : {
                    show: true,
                    position: 'outside',
                    formatter: '{b}: {d}%',
                    fontSize: 11,
                    color: '#323130',
                    fontFamily: 'Segoe UI, sans-serif'
                },
                labelLine: useBreakdown ? { show: false } : { show: true, length: 10, length2: 10 },
                emphasis: {
                    label: { show: true, fontSize: 12, fontWeight: 'bold' },
                    itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' }
                },
                data: pieData
            }]
        });
    }

    if (chartType === 'scatter') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const scatterData = data.map(d => [Number(d[rec.x_axis]) || 0, Number(d[yAxis]) || 0]);

        return applyTheme({
            ...baseOption,
            xAxis: {
                name: rec.x_label || capitalize(rec.x_axis),
                nameLocation: 'middle',
                nameGap: 40,
                nameTextStyle: {
                    color: '#323130',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: [25, 0, 0, 0],
                    fontFamily: 'Segoe UI, sans-serif'
                },
                splitLine: { lineStyle: { color: '#F3F2F1' } },
                axisLabel: {
                    color: '#605E5C',
                    rotate: 35,
                    fontSize: 11,
                    interval: 0,
                    margin: 15,
                    fontFamily: 'Segoe UI, sans-serif'
                },
                axisLine: { lineStyle: { color: '#E1DFDD' } }
            },
            yAxis: {
                name: rec.y_label || capitalize(yAxis),
                splitLine: { lineStyle: { color: '#F3F2F1' } },
                axisLabel: { color: '#605E5C', fontFamily: 'Segoe UI, sans-serif' },
                axisLine: { lineStyle: { color: '#E1DFDD' } }
            },
            series: [{
                type: 'scatter',
                data: scatterData,
                symbolSize: 10,
                itemStyle: {
                    color: createPowerBIGradient('#0078D4', '#00B294')
                }
            }]
        });
    }

    if (chartType === 'area') {
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;

        const hasBreakdown = Array.isArray(breakdownDimension)
            ? breakdownDimension.length > 0
            : (breakdownDimension && breakdownDimension !== 'none' && breakdownDimension !== 'original');

        if (hasBreakdown) {
            const dims = Array.isArray(breakdownDimension) ? breakdownDimension : [breakdownDimension!];
            const isValidDimension = dims.every(dim => data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], dim));

            if (isValidDimension) {
                const xDataRaw = data.map(d => capitalize(d[rec.x_axis]));
                const uniqueCategories = Array.from(new Set(xDataRaw));
                const getBreakdownKey = (d: any) => dims.map(dim => d[dim]).join(' | ');
                const uniqueBreakdowns = Array.from(new Set(data.map(d => getBreakdownKey(d))));

                const pivotedData: Record<string, Record<string, number>> = {};
                uniqueCategories.forEach(cat => pivotedData[cat] = {});

                data.forEach(d => {
                    const cat = capitalize(d[rec.x_axis]);
                    const breakdown = getBreakdownKey(d);
                    const val = Number(d[yAxisRaw]) || 0;
                    if (pivotedData[cat]) {
                        pivotedData[cat][breakdown] = (pivotedData[cat][breakdown] || 0) + val;
                    }
                });

                const series = uniqueBreakdowns.map((breakdown: any, seriesIdx: number) => ({
                    name: capitalize(breakdown),
                    type: 'line' as const,
                    smooth: true,
                    stack: 'total',
                    emphasis: { focus: 'series' },
                    areaStyle: {
                        opacity: 0.8,
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: chartColors[seriesIdx % chartColors.length] + '66' }, // 0.4 opacity approx
                            { offset: 1, color: 'transparent' }
                        ])
                    },
                    lineStyle: {
                        width: 3,
                        color: chartColors[seriesIdx % chartColors.length]
                    },
                    data: uniqueCategories.map(cat => pivotedData[cat][breakdown] || 0)
                }));

                return applyTheme({
                    ...baseOption,
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'cross' }
                    },
                    legend: { 
                        show: uniqueBreakdowns.length <= 8,
                        top: 'top',
                        itemGap: 15
                    },
                    grid: {
                        left: '60px',
                        right: '20px',
                        bottom: '50px',
                        top: uniqueBreakdowns.length <= 8 ? '80px' : '50px',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: uniqueCategories,
                        axisLabel: {
                            color: '#605E5C',
                            rotate: uniqueCategories.length > 10 ? 35 : 0,
                            fontSize: 11,
                            interval: 0,
                            width: uniqueCategories.length > 10 ? 80 : undefined,
                            overflow: 'truncate',
                            fontFamily: 'Segoe UI, sans-serif'
                        },
                        axisLine: { lineStyle: { color: '#E1DFDD' } },
                        axisTick: { show: false }
                    },
                    yAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: '#F3F2F1', width: 1 } },
                        axisLabel: { 
                            color: '#605E5C',
                            fontSize: 11,
                            fontFamily: 'Segoe UI, sans-serif',
                            formatter: (value: number) => formatPowerBINumber(value)
                        },
                        axisLine: { show: false },
                        axisTick: { show: false }
                    },
                    series: series as any,
                    dataZoom: isFullView ? [
                        {
                            type: 'slider',
                            show: true,
                            xAxisIndex: [0],
                            start: 0,
                            end: 100,
                            textStyle: { color: '#605E5C' }
                        },
                        {
                            type: 'inside',
                            xAxisIndex: [0],
                            start: 0,
                            end: 100
                        }
                    ] : undefined
                });
            }
        }

        const yAxes = Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis];
        const xData = data.map(d => capitalize(d[rec.x_axis]));

        const series = yAxes.map((yAxis, seriesIdx) => {
            const seriesName = capitalize(yAxis);
            const color = chartColors[seriesIdx % chartColors.length];

            return {
                name: seriesName,
                type: 'line' as const,
                smooth: true,
                lineStyle: { width: 3, color: color },
                showSymbol: false,
                areaStyle: {
                    opacity: 0.4,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: color },
                        { offset: 1, color: 'transparent' }
                    ])
                },
                emphasis: { focus: 'series' },
                data: data.map(d => Number(d[yAxis]) || 0)
            };
        });

        return applyTheme({
            ...baseOption,
            xAxis: {
                type: 'category',
                data: xData,
                axisLabel: {
                    color: '#605E5C',
                    rotate: xData.length > 10 ? 35 : 0,
                    fontSize: 11,
                    interval: 0,
                    fontFamily: 'Segoe UI, sans-serif'
                },
                axisLine: { lineStyle: { color: '#E1DFDD' } },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#F3F2F1', width: 1 } },
                axisLabel: { 
                    color: '#605E5C',
                    fontSize: 11,
                    fontFamily: 'Segoe UI, sans-serif',
                    formatter: (value: number) => formatPowerBINumber(value)
                },
                axisLine: { show: false },
                axisTick: { show: false }
            },
            series: series.map((s: any) => ({
                ...s,
                areaStyle: {
                    opacity: 0.3,
                    color: createPowerBIGradient(s.lineStyle?.color || '#0078D4', 'transparent')
                },
                lineStyle: {
                    ...s.lineStyle,
                    width: 3,
                    cap: 'round',
                    join: 'round'
                }
            })) as any
        });
    }

    if (chartType === 'treemap') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const grouped = data.reduce((acc: any, item) => {
            const key = capitalize(item[rec.x_axis]);
            const value = Number(item[yAxis]) || 0;
            acc[key] = (acc[key] || 0) + value;
            return acc;
        }, {});

        const treemapData = Object.entries(grouped).map(([name, value]) => ({
            name,
            value: Number(value)
        }));

        return {
            ...baseOption,
            tooltip: { trigger: 'item', formatter: '{b}: {c}' },
            series: [{
                type: 'treemap',
                data: treemapData,
                breadcrumb: { show: false },
                label: { show: true, position: 'inside', fontSize: 10 },
                itemStyle: { borderColor: '#fff' }
            }]
        };
    }

    if (chartType === 'heatmap') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const yDim = typeof rec.y_axis === 'string' ? rec.y_axis : (Array.isArray(rec.y_axis) && rec.y_axis.length > 1 ? rec.y_axis[1] : yAxis);

        const xValues = Array.from(new Set(data.map(d => capitalize(d[rec.x_axis])))).slice(0, 12);
        const yValues = Array.from(new Set(data.map(d => capitalize(d[yDim] || 'Value')))).slice(0, 7);

        const heatmapData: any[] = [];
        xValues.forEach((x, xi) => {
            yValues.forEach((y, yi) => {
                const match = data.find(d => capitalize(d[rec.x_axis]) === x && capitalize(d[yDim] || 'Value') === y);
                heatmapData.push([xi, yi, match ? Math.round(Number(match[yAxis] || 0)) : 0]);
            });
        });

        return {
            ...baseOption,
            tooltip: { position: 'top' },
            grid: { ...baseOption.grid, top: '10%', bottom: '15%' },
            xAxis: { type: 'category', data: xValues, splitArea: { show: true } },
            yAxis: { type: 'category', data: yValues, splitArea: { show: true } },
            visualMap: {
                min: 0,
                max: Math.max(...heatmapData.map(d => d[2]), 100),
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                inRange: { color: ['#bae6fd', '#0ea5e9', '#0369a1'] }
            },
            series: [{
                type: 'heatmap',
                data: heatmapData,
                label: { show: false },
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
        };
    }

    if (chartType === 'sunburst') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const grouped = data.reduce((acc: any, item) => {
            const key = capitalize(item[rec.x_axis]);
            const value = Number(item[yAxis]) || 0;
            acc[key] = (acc[key] || 0) + value;
            return acc;
        }, {});

        const sunburstData = Object.entries(grouped).map(([name, value]) => ({
            name,
            value: Number(value),
            children: [{ name: 'Details', value: Number(value) }]
        }));

        return {
            ...baseOption,
            series: [{
                type: 'sunburst',
                data: sunburstData,
                radius: [0, '90%'],
                label: { rotate: 'radial', fontSize: 10 }
            }]
        };
    }

    if (chartType === 'sankey') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const targetDim = typeof rec.y_axis === 'string' ? rec.y_axis : (Array.isArray(rec.y_axis) && rec.y_axis.length > 1 ? rec.y_axis[1] : yAxis);

        const nodesSet = new Set<string>();
        const links: any[] = [];

        data.slice(0, 10).forEach(item => {
            const source = capitalize(item[rec.x_axis]);
            const target = capitalize(item[targetDim]) || 'Target';
            const value = Number(item[yAxis]) || 1;

            nodesSet.add(source);
            nodesSet.add(target);
            links.push({ source, target, value });
        });

        return {
            ...baseOption,
            tooltip: { trigger: 'item', triggerOn: 'mousemove' },
            series: [{
                type: 'sankey',
                data: Array.from(nodesSet).map(name => ({ name })),
                links: links,
                emphasis: { focus: 'adjacency' },
                lineStyle: { color: 'gradient', curveness: 0.5 }
            }]
        };
    }

    // Network Graph
    if (chartType === 'network') {
        const nodesSet = new Set<string>();
        const links: any[] = [];
        const nodeMap = new Map<string, number>();

        data.slice(0, 20).forEach((item, idx) => {
            const source = capitalize(item[rec.x_axis]);
            const targetDim = typeof rec.y_axis === 'string' ? rec.y_axis : (Array.isArray(rec.y_axis) && rec.y_axis.length > 1 ? rec.y_axis[1] : rec.y_axis);
            const target = capitalize(item[targetDim] || `Node${idx}`);
            const value = Number(item[Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis]) || 1;

            if (!nodesSet.has(source)) {
                nodesSet.add(source);
                nodeMap.set(source, nodeMap.size);
            }
            if (!nodesSet.has(target)) {
                nodesSet.add(target);
                nodeMap.set(target, nodeMap.size);
            }
            links.push({ source: nodeMap.get(source), target: nodeMap.get(target), value });
        });

        const nodes = Array.from(nodesSet).map((name, idx) => ({
            id: idx,
            name,
            symbolSize: 30,
            category: idx % 3,
            label: { show: true, fontSize: 10 }
        }));

        return applyPowerBITheme({
            ...baseOption,
            tooltip: { trigger: 'item', formatter: '{b}' },
            legend: { show: false },
            series: [{
                type: 'graph',
                layout: 'force',
                data: nodes,
                links: links,
                categories: [{ name: 'Category A' }, { name: 'Category B' }, { name: 'Category C' }],
                roam: true,
                label: { show: true, position: 'right', fontSize: 10 },
                labelLayout: { hideOverlap: true },
                lineStyle: { color: 'source', curveness: 0.3, width: 2 },
                emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
                force: {
                    repulsion: 200,
                    gravity: 0.1,
                    edgeLength: 100,
                    layoutAnimation: true
                }
            }]
        });
    }

    // Geographic Map
    if (chartType === 'map') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const locationDim = typeof rec.y_axis === 'string' ? rec.y_axis : (Array.isArray(rec.y_axis) && rec.y_axis.length > 1 ? rec.y_axis[1] : rec.x_axis);
        
        // Group by location
        const locationData = data.reduce((acc: any, item) => {
            const location = capitalize(item[locationDim] || item[rec.x_axis] || 'Unknown');
            const value = Number(item[yAxis]) || 0;
            acc[location] = (acc[location] || 0) + value;
            return acc;
        }, {});

        const mapData = Object.entries(locationData).map(([name, value]) => ({
            name,
            value: Number(value)
        }));

        return applyPowerBITheme({
            ...baseOption,
            tooltip: { trigger: 'item', formatter: '{b}: {c}' },
            visualMap: {
                min: 0,
                max: Math.max(...mapData.map(d => d.value), 100),
                left: 'left',
                top: 'bottom',
                text: ['High', 'Low'],
                calculable: true,
                inRange: { color: ['#bae6fd', '#0ea5e9', '#0369a1', '#1e40af'] }
            },
            geo: {
                map: 'world',
                roam: true,
                label: { emphasis: { show: false } },
                itemStyle: {
                    areaColor: '#f0f0f0',
                    borderColor: '#d0d0d0'
                },
                emphasis: {
                    itemStyle: { areaColor: '#0078D4' }
                }
            },
            series: [{
                name: 'Data',
                type: 'map',
                mapType: 'world',
                geoIndex: 0,
                data: mapData,
                label: { show: true, fontSize: 10 }
            }]
        });
    }

    // 3D Scatter Plot
    if (chartType === '3d-scatter') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const zAxis = Array.isArray(rec.y_axis) && rec.y_axis.length > 1 ? rec.y_axis[1] : yAxis;
        
        const scatterData = data.slice(0, 100).map(d => [
            Number(d[rec.x_axis]) || 0,
            Number(d[yAxis]) || 0,
            Number(d[zAxis]) || 0
        ]);

        return applyPowerBITheme({
            ...baseOption,
            grid3D: {},
            xAxis3D: { type: 'value', name: capitalize(rec.x_axis) },
            yAxis3D: { type: 'value', name: capitalize(yAxis) },
            zAxis3D: { type: 'value', name: capitalize(zAxis) },
            visualMap: {
                max: Math.max(...scatterData.map(d => d[2]), 100),
                inRange: { color: ['#bae6fd', '#0ea5e9', '#0369a1'] }
            },
            series: [{
                type: 'scatter3D',
                data: scatterData,
                symbolSize: 8,
                itemStyle: { opacity: 0.8 }
            }]
        });
    }

    // 3D Bar Chart
    if (chartType === '3d-bar') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const xData = data.slice(0, 10).map(d => capitalize(d[rec.x_axis]));
        const values = data.slice(0, 10).map(d => Number(d[yAxis]) || 0);

        return applyPowerBITheme({
            ...baseOption,
            grid3D: {},
            xAxis3D: { type: 'category', data: xData },
            yAxis3D: { type: 'value', name: capitalize(yAxis) },
            zAxis3D: {},
            visualMap: {
                max: Math.max(...values, 100),
                inRange: { color: ['#bae6fd', '#0ea5e9', '#0369a1'] }
            },
            series: [{
                type: 'bar3D',
                data: values.map((v, i) => [i, v, 0]),
                shading: 'lambert',
                itemStyle: { color: '#0078D4' },
                emphasis: { itemStyle: { color: '#005A9E' } }
            }]
        });
    }

    if (chartType === 'waterfall') {
        const yAxis = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const xData = data.slice(0, 6).map(d => capitalize(d[rec.x_axis]));
        const rawValues = data.slice(0, 6).map(d => Number(d[yAxis]) || 0);

        const helping: number[] = [];
        const positive: number[] = [];
        let currentTotal = 0;

        rawValues.forEach((val, i) => {
            helping.push(currentTotal);
            positive.push(val);
            currentTotal += val;
        });

        return {
            ...baseOption,
            xAxis: { type: 'category', data: xData },
            yAxis: { type: 'value' },
            series: [
                {
                    name: 'Placeholder',
                    type: 'bar',
                    stack: 'Total',
                    itemStyle: { borderColor: 'transparent', color: 'transparent' },
                    emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
                    data: helping
                },
                {
                    name: 'Value',
                    type: 'bar',
                    stack: 'Total',
                    label: { show: true, position: 'top' },
                    data: positive
                }
            ]
        };
    }

    if (chartType === 'gradient-area') {
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const xData = data.map(d => capitalize(d[rec.x_axis]));

        return {
            ...baseOption,
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } } },
            xAxis: [
                {
                    type: 'category',
                    boundaryGap: false,
                    data: xData,
                    name: rec.x_label || capitalize(rec.x_axis),
                    nameLocation: 'middle',
                    nameGap: 30,
                    axisLabel: { color: '#64748B', fontSize: 10 }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    name: rec.y_label || capitalize(yAxisRaw),
                    axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 500 },
                    axisLine: { lineStyle: { color: '#e2e8f0' } },
                    splitLine: { lineStyle: { color: '#f1f5f9' } }
                }
            ],
            series: (Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis]).map((yAxis, seriesIdx) => {
                const color = chartColors[seriesIdx % chartColors.length];
                return {
                    name: capitalize(yAxis),
                    type: 'line',
                    smooth: true,
                    lineStyle: { width: 3, color: color },
                    showSymbol: false,
                    areaStyle: {
                        opacity: 0.4,
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: color },
                            { offset: 1, color: 'transparent' }
                        ])
                    },
                    emphasis: { focus: 'series' },
                    data: data.map(d => Number(d[yAxis]) || 0)
                };
            }),
            dataZoom: isFullView ? [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: [0],
                    start: 0,
                    end: 100
                },
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    start: 0,
                    end: 100
                }
            ] : undefined
        };
    }

    if (chartType === 'polar-bar') {
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const values = data.slice(0, 8).map(d => Number(d[yAxisRaw]) || 0);
        const categories = data.slice(0, 8).map(d => capitalize(d[rec.x_axis]));

        return {
            ...baseOption,
            polar: { radius: [30, '80%'] },
            angleAxis: {
                type: 'category',
                data: categories,
                startAngle: 75
            },
            radiusAxis: {
                min: 0,
                max: Math.max(...values) * 1.2
            },
            tooltip: { trigger: 'axis' },
            series: [{
                type: 'bar',
                data: values,
                coordinateSystem: 'polar',
                name: rec.y_label || capitalize(yAxisRaw),
                itemStyle: {
                    color: (params: any) => {
                        const colors = ['#0EA5E9', '#8B5CF6', '#F43F5E', '#10B981', '#F59E0B'];
                        return colors[params.dataIndex % colors.length];
                    }
                }
            }]
        };
    }

    if (chartType === 'themeRiver') {
        // ThemeRiver requires Date, Value, ID structure
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const themeData: any[] = [];

        // Mocking time progression for demo if real time missing, or using x_axis if available
        data.slice(0, 20).forEach((d, i) => {
            const date = d['date'] || `2024-01-${String(i + 1).padStart(2, '0')}`;
            const val = Number(d[yAxisRaw]) || 0;
            const category = capitalize(d[rec.x_axis] || 'General');
            themeData.push([date, val, category]);
        });

        return {
            ...baseOption,
            tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: 'rgba(0,0,0,0.2)', width: 1, type: 'solid' } } },
            singleAxis: {
                top: 50,
                bottom: 50,
                axisTick: {},
                axisLabel: {},
                type: 'time',
                axisPointer: {
                    animation: true,
                    label: { show: true }
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.2 } }
            },
            series: [{
                type: 'themeRiver',
                emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 0, 0, 0.8)' } },
                data: themeData,
                label: { show: false }
            }]
        };
    }

    if (chartType === 'pictorialBar' || chartType === 'dotted-bar') {
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
        const xData = data.slice(0, 8).map(d => capitalize(d[rec.x_axis]));
        const values = data.slice(0, 8).map(d => Number(d[yAxisRaw]) || 0);

        return {
            ...baseOption,
            tooltip: { trigger: 'axis', axisPointer: { type: 'none' } },
            xAxis: {
                data: xData,
                axisTick: { show: false },
                axisLine: { show: false },
                axisLabel: { color: '#64748B' }
            },
            yAxis: {
                splitLine: { show: false },
                axisTick: { show: false },
                axisLine: { show: false },
                axisLabel: { show: false }
            },
            series: [{
                name: 'hill',
                type: 'pictorialBar',
                barCategoryGap: '-130%',
                symbol: 'path://M0,10 L10,10 L5,0 L0,10 z',
                itemStyle: { opacity: 0.5 },
                emphasis: { itemStyle: { opacity: 1 } },
                data: values,
                z: 10
            }, {
                name: 'glyph',
                type: 'pictorialBar',
                barGap: '-100%',
                symbolPosition: 'end',
                symbolSize: 50,
                symbolOffset: [0, -30],
                data: values.map((v, i) => ({
                    value: v,
                    symbol: chartType === 'dotted-bar' ? 'circle' : 'rect' // simple differentiation
                }))
            }]
        };
    }

    if (chartType === 'normalized-bar') {
        const xDataRaw = data.map(d => capitalize(d[rec.x_axis]));
        const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;

        // Assume grouping by a dimension for normalized stack
        const dims = Array.isArray(breakdownDimension) ? breakdownDimension : (breakdownDimension ? [breakdownDimension] : []);
        const hasBreakdown = dims.length > 0;

        if (hasBreakdown) {
            // ... reused pivot logic or simplified ...
            // For brevity, let's treat it as a stacked bar with 100% logic manually calculated or using ECharts 'stack' logic if available.
            // ECharts 5 doesn't have native "stack: '100%'" in simple config without transform.
            // We will manually normalize.

            // 1. Pivot
            const uniqueCategories = Array.from(new Set(xDataRaw));
            const getBreakdownKey = (d: any) => dims.map(dim => d[dim]).join(' | ');
            const uniqueBreakdowns = Array.from(new Set(data.map(d => getBreakdownKey(d))));

            const pivotedData: Record<string, Record<string, number>> = {};
            uniqueCategories.forEach(cat => pivotedData[cat] = {});
            data.forEach(d => {
                const cat = capitalize(d[rec.x_axis]);
                const breakdown = getBreakdownKey(d);
                pivotedData[cat][breakdown] = (pivotedData[cat][breakdown] || 0) + (Number(d[yAxisRaw]) || 0);
            });

            // 2. Normalize
            const series = uniqueBreakdowns.map(breakdown => {
                return {
                    name: capitalize(breakdown),
                    type: 'bar',
                    stack: 'total',
                    data: uniqueCategories.map(cat => {
                        const val = pivotedData[cat][breakdown] || 0;
                        const total = uniqueBreakdowns.reduce((sum, b) => sum + (pivotedData[cat][b] || 0), 0);
                        return total === 0 ? 0 : (val / total) * 100;
                    })
                }
            });

            return {
                ...baseOption,
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params: any) => {
                        let res = params[0].name + '<br/>';
                        params.forEach((param: any) => {
                            res += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}%<br/>`;
                        });
                        return res;
                    }
                },
                xAxis: { type: 'category', data: uniqueCategories, axisLabel: { color: '#64748B', rotate: 30 } },
                yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#64748B' } },
                series: series as any
            };
        }
    }

    // Default: bar/line charts
    const xDataRaw = data.map(d => capitalize(d[rec.x_axis]));
    const yAxisRaw = Array.isArray(rec.y_axis) ? rec.y_axis[0] : rec.y_axis;
    // Handle count aggregation - if y_axis is 'count' or '_count_' or doesn't exist in data, count occurrences
    const isCountAggregation = yAxisRaw === 'count' || yAxisRaw === '_count_' || !data[0]?.[yAxisRaw];
    const yDataRaw = isCountAggregation 
        ? data.map(() => 1) // Each row counts as 1
        : data.map(d => Number(d[yAxisRaw]) || 0);

    // --- STACKING LOGIC START ---
    const hasBreakdown = Array.isArray(breakdownDimension)
        ? breakdownDimension.length > 0
        : (breakdownDimension && breakdownDimension !== 'none' && breakdownDimension !== 'original');

    if (hasBreakdown && (chartType === 'bar' || chartType === 'line')) {
        // Normalize breakdownDimensions to an array
        const dims = Array.isArray(breakdownDimension) ? breakdownDimension : [breakdownDimension!];

        // Validate that all breakdownDimensions exist in the data
        const isValidDimension = dims.every(dim => data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], dim));

        if (isValidDimension) {
            const uniqueCategories = Array.from(new Set(xDataRaw)); // X-Axis values

            // Create composite key for breakdown
            const getBreakdownKey = (d: any) => dims.map(dim => d[dim]).join(' | ');

            const uniqueBreakdowns = Array.from(new Set(data.map(d => getBreakdownKey(d)))); // Legend items

            // ... (proceed with stacking logic)

            // Pivot Data: Map<Category, Map<Breakdown, Value>>
            const pivotedData: Record<string, Record<string, number>> = {};
            uniqueCategories.forEach(cat => pivotedData[cat] = {});

            data.forEach(d => {
                const cat = capitalize(d[rec.x_axis]);
                const breakdown = getBreakdownKey(d);
                const val = Number(d[yAxisRaw]) || 0;
                if (pivotedData[cat]) {
                    pivotedData[cat][breakdown] = (pivotedData[cat][breakdown] || 0) + val;
                }
            });

            // Create Series for each breakdown value
            const series = uniqueBreakdowns.map((breakdown: any) => ({
                name: capitalize(breakdown),
                type: chartType,
                stack: chartType === 'bar' && (rec as any)?.breakdownMode !== 'grouped' ? 'total' : undefined,
                emphasis: { focus: 'series' },
                data: uniqueCategories.map(cat => pivotedData[cat][breakdown] || 0),
                itemStyle: chartType === 'bar' ? { borderRadius: [0, 0, 0, 0] } : undefined // Remove radius for stacked internal bars
            }));

            return {
                ...baseOption,
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' } // Shadow pointer for stacked bars
                },
                legend: { show: false },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '12%',
                    top: '10%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: uniqueCategories,
                    axisLabel: { color: '#64748B', rotate: 30, fontSize: 10, width: 80, overflow: 'truncate' }
                },
                yAxis: {
                    type: 'value',
                    axisLabel: { color: '#64748B' }
                },
                series: series as any,
                dataZoom: isFullView ? [
                    {
                        type: 'slider',
                        show: true,
                        xAxisIndex: [0],
                        start: 0,
                        end: 100
                    },
                    {
                        type: 'inside',
                        xAxisIndex: [0],
                        start: 0,
                        end: 100
                    }
                ] : undefined
            };
        }
    }
    // --- STACKING LOGIC END ---

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

        return applyTheme({
            ...baseOption,
            title: [
                {
                    text: capitalize(rec.title),
                    left: 'center',
                    top: 0,
                    textStyle: {
                        color: '#323130',
                        fontSize: 16,
                        fontWeight: 600,
                        fontFamily: 'Segoe UI, sans-serif'
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
                name: rec.y_label || capitalize(yAxisRaw),
                nameLocation: 'middle',
                nameGap: 45,
                splitLine: { lineStyle: { color: '#F3F2F1', width: 1 } },
                axisLabel: {
                    color: '#605E5C',
                    fontSize: 11,
                    fontFamily: 'Segoe UI, sans-serif',
                    formatter: (value: number) => formatPowerBINumber(value)
                },
                axisLine: { show: false },
                axisTick: { show: false }
            },
            yAxis: {
                type: 'category',
                name: rec.x_label || capitalize(rec.x_axis),
                nameLocation: 'middle',
                nameGap: 65,
                data: finalCategories,
                axisLabel: {
                    color: '#605E5C',
                    fontSize: 11,
                    interval: 0,
                    width: 100,
                    overflow: 'truncate',
                    fontFamily: 'Segoe UI, sans-serif'
                },
                axisTick: { show: false },
                axisLine: { lineStyle: { color: '#E1DFDD' } },
                inverse: true,
            },
            series: [{
                name: capitalize(yAxisRaw),
                type: 'bar',
                label: {
                    show: true,
                    position: 'right',
                    color: '#323130',
                    fontSize: 11,
                    fontFamily: 'Segoe UI, sans-serif',
                    fontWeight: 'normal',
                    formatter: (params: any) => {
                        const val = params.value;
                        return typeof val === 'number' ? formatPowerBINumber(val) : String(val);
                    }
                },
                itemStyle: {
                    borderRadius: [0, 4, 4, 0],
                    color: (params: any) => {
                        if (params.name === 'Others') {
                            return createPowerBIGradient('#94A3B8', '#64748B', 'horizontal');
                        }
                        const idx = params.dataIndex % chartColors.length;
                        return createPowerBIGradient(chartColors[idx], chartColors[(idx + 1) % chartColors.length], 'horizontal');
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0,0,0,0.2)'
                    }
                },
                data: finalValues,
            }],
        });
    }

    // Ensure accurate data processing
    const processedXData = xDataRaw.map(cat => String(cat || '').trim() || 'Unknown');
    const processedYData = yDataRaw.map((val, idx) => {
        const rawVal = val;
        if (rawVal === null || rawVal === undefined || rawVal === '') {
            return 0;
        }
        const num = Number(rawVal);
        return isNaN(num) ? 0 : num;
    });

    let xData = processedXData;
    let yData = processedYData;

    if (!isFullView && !((rec as any).isHorizontal)) {
        const aggregated: Record<string, number> = {};
        processedXData.forEach((category, idx) => {
            const val = processedYData[idx];
            aggregated[category] = (aggregated[category] || 0) + (isNaN(val) ? 0 : val);
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

    const finalOption = {
        ...baseOption,
        xAxis: {
            type: 'category',
            name: rec.x_label || capitalize(rec.x_axis),
            nameLocation: 'middle',
            nameGap: 35,
            data: xData,
            axisLabel: {
                color: '#605E5C',
                rotate: xData.length > 10 ? 35 : 0,
                fontSize: 11,
                interval: 0,
                overflow: 'truncate',
                width: xData.length > 10 ? 80 : undefined,
                fontFamily: 'Segoe UI, sans-serif'
            },
            axisLine: { lineStyle: { color: '#E1DFDD' } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            name: rec.y_label || capitalize(yAxisRaw),
            nameLocation: 'middle',
            nameGap: 50,
            splitLine: { lineStyle: { color: '#F3F2F1', width: 1 } },
            axisLabel: { 
                color: '#605E5C',
                fontSize: 11,
                fontFamily: 'Segoe UI, sans-serif',
                formatter: (value: number) => formatPowerBINumber(value)
            },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: (Array.isArray(rec.y_axis) ? rec.y_axis : [rec.y_axis]).map((yAxis, seriesIdx) => {
            const color = chartColors[seriesIdx % chartColors.length];
            return {
                name: capitalize(yAxis),
                type: (chartType === 'line' ? 'line' : 'bar') as any,
                smooth: chartType === 'line',
                itemStyle: chartType === 'bar' ? {
                    borderRadius: [4, 4, 0, 0],
                    color: (!Array.isArray(rec.y_axis) || rec.y_axis.length === 1)
                        ? (params: any) => {
                            const idx = params.dataIndex % chartColors.length;
                            return createPowerBIGradient(chartColors[idx], chartColors[(idx + 1) % chartColors.length]);
                        }
                        : createPowerBIGradient(color, chartColors[(seriesIdx + 1) % chartColors.length])
                } : undefined,
                lineStyle: chartType === 'line' ? { 
                    width: 3, 
                    color: color,
                    cap: 'round',
                    join: 'round'
                } : undefined,
                areaStyle: chartType === 'area' ? {
                    opacity: 0.3,
                    color: createPowerBIGradient(color, 'transparent')
                } : undefined,
                label: {
                    show: !Array.isArray(rec.y_axis) || rec.y_axis.length === 1,
                    position: 'top',
                    color: '#323130',
                    fontSize: 11,
                    fontFamily: 'Segoe UI, sans-serif',
                    fontWeight: 'normal',
                    formatter: (params: any) => {
                        const val = params.value;
                        return typeof val === 'number' ? formatPowerBINumber(val) : String(val);
                    }
                },
                emphasis: { 
                    focus: 'series',
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0,0,0,0.2)'
                    }
                },
                data: Array.isArray(rec.y_axis) 
                    ? (yAxis === 'count' || yAxis === '_count_' || !data[0]?.[yAxis] 
                        ? data.map(() => 1) 
                        : data.map(d => Number(d[yAxis]) || 0)) 
                    : yData,
            };
        }),
        dataZoom: isFullView ? [
            {
                type: 'slider',
                show: true,
                xAxisIndex: [0],
                start: 0,
                end: 100
            },
            {
                type: 'inside',
                xAxisIndex: [0],
                start: 0,
                end: 100
            }
        ] : undefined
    };
    
    // Apply PowerBI theme for professional styling
    return applyPowerBITheme(finalOption);
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
