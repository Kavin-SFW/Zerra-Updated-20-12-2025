import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '@/components/ui/command';
import { Check, ChevronsUpDown, BarChart3, LineChart, PieChart, AreaChart, ScatterChart, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import EChartsWrapper from '@/components/charts/EChartsWrapper';
import { createEChartsOption } from '@/lib/chart-utils';

interface InteractiveChartBuilderProps {
    data: any[];
    isOpen: boolean;
    onClose: () => void;
}

const CHART_TYPES = [
    { id: 'bar', label: 'Bar', icon: BarChart3 },
    { id: 'line', label: 'Line', icon: LineChart },
    { id: 'area', label: 'Area', icon: AreaChart },
    { id: 'pie', label: 'Pie', icon: PieChart },
    { id: 'scatter', label: 'Scatter', icon: ScatterChart },
];

export function InteractiveChartBuilder({ data, isOpen, onClose }: InteractiveChartBuilderProps) {
    // --- State ---
    const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie' | 'scatter'>('bar');
    const [measureField, setMeasureField] = useState<string>('');
    const [aggregation, setAggregation] = useState<'sum' | 'count' | 'average'>('sum');

    const [groupByFields, setGroupByFields] = useState<string[]>([]);
    const [openGroupPopover, setOpenGroupPopover] = useState(false);

    const [segmentByFields, setSegmentByFields] = useState<string[]>([]);
    const [openSegmentPopover, setOpenSegmentPopover] = useState(false);

    const [breakdownMode, setBreakdownMode] = useState<'stacked' | 'grouped'>('stacked');

    // --- Derived Data (Dimensions) ---
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    const numericColumns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return columns.filter(col => {
            const val = data[0][col];
            return typeof val === 'number' || (!isNaN(Number(val)) && typeof val !== 'boolean');
        });
    }, [data, columns]);

    const categoricalColumns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return columns; // Allow all columns for X-Axis/Breakdown usually
    }, [data, columns]);

    // Set defaults on load
    useEffect(() => {
        if (isOpen && data.length > 0) {
            if (!measureField) setMeasureField(numericColumns[0] || categoricalColumns[0]);
            if (groupByFields.length === 0) {
                const defaultGroup = categoricalColumns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('category')) || categoricalColumns[0];
                if (defaultGroup) setGroupByFields([defaultGroup]);
            }
        }
    }, [isOpen, data, numericColumns, categoricalColumns, groupByFields.length, measureField]);

    const measureIsNumeric = useMemo(() => {
        if (!measureField) return false;
        return numericColumns.includes(measureField);
    }, [measureField, numericColumns]);

    useEffect(() => {
        if (!measureIsNumeric && (aggregation === 'sum' || aggregation === 'average')) {
            setAggregation('count');
        }
    }, [measureIsNumeric, aggregation]);

    const groupedData = useMemo(() => {
        if (!data || data.length === 0) return [] as Array<{ __group: string; __segment?: string; __value: number }>;
        if (groupByFields.length === 0) return [] as Array<{ __group: string; __segment?: string; __value: number }>;

        const groupKeyFor = (row: any) => groupByFields.map(f => row?.[f] ?? '—').join(' | ');
        const segmentKeyFor = (row: any) => segmentByFields.map(f => row?.[f] ?? '—').join(' | ');

        const map = new Map<string, { sum: number; count: number; segment?: string; group: string }>();

        for (const row of data) {
            const group = groupKeyFor(row);
            const segment = segmentByFields.length > 0 ? segmentKeyFor(row) : undefined;
            const key = segment ? `${group}|||${segment}` : group;

            const current = map.get(key) || { sum: 0, count: 0, segment, group };
            current.count += 1;

            if (aggregation === 'sum' || aggregation === 'average') {
                const v = Number(row?.[measureField]);
                current.sum += isNaN(v) ? 0 : v;
            }

            map.set(key, current);
        }

        const rows = Array.from(map.values()).map(v => {
            const value = aggregation === 'count'
                ? v.count
                : aggregation === 'average'
                    ? (v.count ? v.sum / v.count : 0)
                    : v.sum;

            return {
                __group: String(v.group),
                __segment: v.segment ? String(v.segment) : undefined,
                __value: value
            };
        });

        return rows;
    }, [data, groupByFields, segmentByFields, aggregation, measureField]);

    const summary = useMemo(() => {
        const uniqueGroups = new Set(groupedData.map(r => r.__group));
        const uniqueSegments = new Set(groupedData.map(r => r.__segment).filter(Boolean) as string[]);
        const total = groupedData.reduce((a, b) => a + (Number(b.__value) || 0), 0);
        return {
            groupCount: uniqueGroups.size,
            segmentCount: uniqueSegments.size,
            total
        };
    }, [groupedData]);

    const recommendations = useMemo(() => {
        const warnings: string[] = [];
        const recs: Array<{ type: 'bar' | 'line' | 'area' | 'pie'; label: string; reason: string; set: () => void }> = [];

        if (summary.groupCount > 40) {
            warnings.push('Too many groups; consider filtering or using top categories for readability.');
        }
        if (summary.segmentCount > 12) {
            warnings.push('Too many segments; legends may become cluttered and hard to interpret.');
        }

        const hasDateGroup = groupByFields.some(f => /date|time|month|day|year/i.test(f));
        const hasSegments = segmentByFields.length > 0;

        if (hasDateGroup) {
            recs.push({
                type: 'line',
                label: 'Line',
                reason: 'Best for trends over time.',
                set: () => { setChartType('line'); }
            });
            recs.push({
                type: 'area',
                label: 'Area',
                reason: 'Highlights magnitude changes over time; good for totals.',
                set: () => { setChartType('area'); }
            });
        }

        if (!hasSegments && summary.groupCount > 1 && summary.groupCount <= 8) {
            recs.push({
                type: 'pie',
                label: 'Pie',
                reason: 'Clear part-to-whole comparison when categories are limited.',
                set: () => { setChartType('pie'); }
            });
        }

        if (hasSegments) {
            recs.push({
                type: 'bar',
                label: 'Stacked Bar',
                reason: 'Compares totals and composition across groups.',
                set: () => { setChartType('bar'); setBreakdownMode('stacked'); }
            });
            recs.push({
                type: 'bar',
                label: 'Grouped Bar',
                reason: 'Compares segment values side-by-side for each group.',
                set: () => { setChartType('bar'); setBreakdownMode('grouped'); }
            });
        } else {
            recs.push({
                type: 'bar',
                label: 'Bar',
                reason: 'Best for comparing categories.',
                set: () => { setChartType('bar'); }
            });
        }

        return { warnings, recs: recs.slice(0, 4) };
    }, [groupByFields, segmentByFields.length, summary.groupCount, summary.segmentCount]);

    // --- Chart Logic --- //
    const chartOption = useMemo(() => {
        if (!data || data.length === 0 || groupByFields.length === 0) return null;

        // Construct a recommendation object compatible with createEChartsOption
        const recommendation = {
            type: chartType,
            x_axis: '__group',
            y_axis: '__value',
            chart_title: 'Custom Analysis',
            description: `Analysis of ${measureField || 'Records'} by ${groupByFields.join(', ')}`,
            breakdownMode: breakdownMode
        };

        const breakdown = segmentByFields.length > 0 ? '__segment' : undefined;

        return createEChartsOption(
            recommendation as any,
            groupedData as any,
            'none',
            true,
            breakdown
        );
    }, [data, chartType, measureField, groupByFields, groupedData, segmentByFields.length, breakdownMode]);


    // --- Render --- //
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50/50">
                <DialogHeader className="px-6 py-4 border-b bg-white flex flex-row items-center justify-between shrink-0">
                    <DialogTitle className="text-xl font-semibold text-slate-800">New Visualization</DialogTitle>
                    {/* Close button handled by Dialog primitive usually, but we can add custom actions here */}
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* --- Sidebar: Configuration --- */}
                    <div className="w-80 bg-white border-r flex flex-col shrink-0 overflow-y-auto p-5 gap-6">

                        {/* Chart Type */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Visualization Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {CHART_TYPES.map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setChartType(type.id as any)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-all",
                                            chartType === type.id
                                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <type.icon className="h-6 w-6 mb-2 opacity-80" />
                                        <span className="font-medium text-xs">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Grouping */}
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Axis & Grouping</Label>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Group By (one or more)</Label>
                                <Popover open={openGroupPopover} onOpenChange={setOpenGroupPopover}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between h-9 px-3 text-left font-normal">
                                            {groupByFields.length > 0 ? (
                                                <span className="truncate">
                                                    {groupByFields.length === 1 ? groupByFields[0] : `${groupByFields.length} selected`}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search columns..." />
                                            <CommandList>
                                                <CommandEmpty>No column found.</CommandEmpty>
                                                <CommandGroup className="max-h-64 overflow-y-auto">
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setGroupByFields([]);
                                                            setOpenGroupPopover(false);
                                                        }}
                                                        className="cursor-pointer font-medium text-muted-foreground"
                                                    >
                                                        <div className={cn(
                                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                            groupByFields.length === 0 ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                        )}>
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        <span>None (Clear)</span>
                                                    </CommandItem>
                                                    <CommandSeparator className="my-1" />
                                                    {categoricalColumns.map((col) => {
                                                        const isSelected = groupByFields.includes(col);
                                                        return (
                                                            <CommandItem
                                                                key={col}
                                                                onSelect={() => {
                                                                    setGroupByFields(prev => isSelected
                                                                        ? prev.filter(f => f !== col)
                                                                        : [...prev, col]
                                                                    );
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className={cn(
                                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                                )}>
                                                                    <Check className={cn("h-4 w-4")} />
                                                                </div>
                                                                <span>{col}</span>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Segment By (optional)</Label>
                                <Popover open={openSegmentPopover} onOpenChange={setOpenSegmentPopover}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between h-9 px-3 text-left font-normal">
                                            {segmentByFields.length > 0 ? (
                                                <span className="truncate">
                                                    {segmentByFields.length === 1 ? segmentByFields[0] : `${segmentByFields.length} selected`}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search columns..." />
                                            <CommandList>
                                                <CommandEmpty>No column found.</CommandEmpty>
                                                <CommandGroup className="max-h-64 overflow-y-auto">
                                                    <CommandItem
                                                        onSelect={() => {
                                                            setSegmentByFields([]);
                                                            setOpenSegmentPopover(false);
                                                        }}
                                                        className="cursor-pointer font-medium text-muted-foreground"
                                                    >
                                                        <div className={cn(
                                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                            segmentByFields.length === 0 ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                        )}>
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        <span>None (Clear)</span>
                                                    </CommandItem>
                                                    <CommandSeparator className="my-1" />
                                                    {categoricalColumns.map((col) => {
                                                        const isSelected = segmentByFields.includes(col);
                                                        return (
                                                            <CommandItem
                                                                key={col}
                                                                onSelect={() => {
                                                                    setSegmentByFields(prev => isSelected
                                                                        ? prev.filter(f => f !== col)
                                                                        : [...prev, col]
                                                                    );
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <div className={cn(
                                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                                )}>
                                                                    <Check className={cn("h-4 w-4")} />
                                                                </div>
                                                                <span>{col}</span>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {segmentByFields.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Segment display</Label>
                                    <Select value={breakdownMode} onValueChange={(v: any) => setBreakdownMode(v)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="stacked">Stacked</SelectItem>
                                            <SelectItem value="grouped">Grouped (Side-by-side)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Values */}
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Values</Label>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Measure Column</Label>
                                <Select value={measureField} onValueChange={setMeasureField}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select number column..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {numericColumns.map(col => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Aggregation</Label>
                                <Select value={aggregation} onValueChange={(v: any) => setAggregation(v)}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sum" disabled={!measureIsNumeric}>Sum</SelectItem>
                                        <SelectItem value="average" disabled={!measureIsNumeric}>Average</SelectItem>
                                        <SelectItem value="count">Count rows</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* Recommendations */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Smart Recommendations</Label>

                            {recommendations.warnings.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                    <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                                        <AlertCircle className="h-4 w-4" />
                                        Warnings
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {recommendations.warnings.map((w, i) => (
                                            <div key={i} className="text-[11px] text-amber-800 leading-snug">{w}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {recommendations.recs.map((r, idx) => (
                                    <button
                                        key={`${r.label}-${idx}`}
                                        onClick={r.set}
                                        className="w-full text-left rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                                <div className="text-xs font-semibold text-slate-800">{r.label}</div>
                                            </div>
                                            <div className="text-[10px] font-medium text-slate-500">Recommended</div>
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-600 leading-snug">{r.reason}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* --- Main Area: Preview --- */}
                    <div className="flex-1 bg-slate-50/50 flex flex-col min-w-0">
                        <Tabs defaultValue="chart" className="flex-1 flex flex-col">
                            <div className="px-6 py-3 border-b bg-white flex items-center justify-between">
                                <TabsList>
                                    <TabsTrigger value="chart">Chart Preview</TabsTrigger>
                                    <TabsTrigger value="data">Data Table</TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="flex-1 p-6 overflow-hidden">
                                <CardContentWrapper>
                                    <TabsContent value="chart" className="h-full w-full m-0 data-[state=inactive]:hidden">
                                        {chartOption ? (
                                            <div className="w-full h-full bg-white rounded-lg border shadow-sm p-4 relative">
                                                <div className="mb-3 grid grid-cols-3 gap-3">
                                                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Groups</div>
                                                        <div className="text-sm font-semibold text-slate-800">{summary.groupCount}</div>
                                                    </div>
                                                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Segments</div>
                                                        <div className="text-sm font-semibold text-slate-800">{summary.segmentCount || '—'}</div>
                                                    </div>
                                                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</div>
                                                        <div className="text-sm font-semibold text-slate-800">{Number.isFinite(summary.total) ? summary.total.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
                                                    </div>
                                                </div>
                                                <EChartsWrapper option={chartOption} style={{ height: '100%', width: '100%' }} />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                Select configuration to view chart
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="data" className="h-full w-full m-0 data-[state=inactive]:hidden text-sm">
                                        <div className="w-full h-full bg-white rounded-lg border shadow-sm p-0 overflow-hidden">
                                            {groupedData.length > 0 ? (
                                                <ScrollArea className="h-full w-full">
                                                    <table className="w-full caption-bottom text-sm text-left">
                                                        <thead className="[&_tr]:border-b bg-slate-50 sticky top-0 z-10">
                                                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                                {Object.keys(groupedData[0]).map((h, i) => (
                                                                    <th key={i} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">
                                                                        {h}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="[&_tr:last-child]:border-0">
                                                            {groupedData.slice(0, 100).map((row, i) => (
                                                                <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                                    {Object.values(row).map((cell: any, j) => (
                                                                        <td key={j} className="p-4 align-middle whitespace-nowrap">
                                                                            {String(cell)}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {groupedData.length > 100 && (
                                                        <div className="p-4 text-center text-xs text-muted-foreground border-t">
                                                            Showing first 100 rows of {groupedData.length}
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            ) : (
                                                <div className="p-8 text-center text-muted-foreground">No data available</div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </CardContentWrapper>
                            </div>
                        </Tabs>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}

// Helper to keep the tabs content clean
function CardContentWrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
