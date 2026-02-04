import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    GripVertical, Plus, Trash2, Save, Copy, Download, 
    LayoutGrid, Maximize2, Minimize2, RotateCcw 
} from 'lucide-react';
import { ReactSortable } from 'react-sortablejs';
import { EChartsOption } from 'echarts';
import EChartsWrapper from '@/components/charts/EChartsWrapper';
import { VisualizationRecommendation } from '@/types/analytics';
import { createEChartsOption } from '@/lib/chart-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DashboardWidget {
    id: string;
    title: string;
    chartType: string;
    xAxis: string;
    yAxis: string | string[];
    data: any[];
    rec: VisualizationRecommendation;
    position: { x: number; y: number; w: number; h: number };
    isMinimized?: boolean;
}

interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    widgets: DashboardWidget[];
    createdAt: string;
    version: number;
}

interface DashboardBuilderProps {
    data: any[];
    columns: string[];
    onSave?: (template: DashboardTemplate) => void;
    onLoad?: (template: DashboardTemplate) => void;
}

const GRID_COLS = 12;
const GRID_ROW_HEIGHT = 50;

export function DashboardBuilder({ data, columns, onSave, onLoad }: DashboardBuilderProps) {
    const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [isAddingWidget, setIsAddingWidget] = useState(false);
    const [newWidget, setNewWidget] = useState<Partial<DashboardWidget>>({});
    const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const addWidget = useCallback(() => {
        if (!newWidget.chartType || !newWidget.xAxis || !newWidget.yAxis) {
            toast.error('Please fill all required fields');
            return;
        }

        const widget: DashboardWidget = {
            id: `widget-${Date.now()}`,
            title: newWidget.title || `${newWidget.chartType} Chart`,
            chartType: newWidget.chartType!,
            xAxis: newWidget.xAxis!,
            yAxis: newWidget.yAxis as string | string[],
            data: data,
            rec: {
                type: newWidget.chartType as any,
                x_axis: newWidget.xAxis!,
                y_axis: newWidget.yAxis as string | string[],
                title: newWidget.title || `${newWidget.chartType} Chart`,
                priority: 'medium',
                size: 'normal'
            },
            position: {
                x: 0,
                y: widgets.length * 4,
                w: 6,
                h: 4
            }
        };

        setWidgets([...widgets, widget]);
        setNewWidget({});
        setIsAddingWidget(false);
        toast.success('Widget added successfully');
    }, [newWidget, data, widgets]);

    const removeWidget = useCallback((id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
        if (selectedWidget === id) setSelectedWidget(null);
        toast.success('Widget removed');
    }, [widgets, selectedWidget]);

    const toggleMinimize = useCallback((id: string) => {
        setWidgets(widgets.map(w => 
            w.id === id ? { ...w, isMinimized: !w.isMinimized } : w
        ));
    }, [widgets]);

    const saveTemplate = useCallback(() => {
        const template: DashboardTemplate = {
            id: `template-${Date.now()}`,
            name: `Dashboard ${new Date().toLocaleDateString()}`,
            description: `Dashboard with ${widgets.length} widgets`,
            widgets: widgets,
            createdAt: new Date().toISOString(),
            version: 1
        };
        setTemplates([...templates, template]);
        if (onSave) onSave(template);
        toast.success('Dashboard template saved');
    }, [widgets, templates, onSave]);

    const loadTemplate = useCallback((template: DashboardTemplate) => {
        setWidgets(template.widgets);
        setIsTemplateDialogOpen(false);
        toast.success('Template loaded');
        if (onLoad) onLoad(template);
    }, [onLoad]);

    const exportDashboard = useCallback(() => {
        const dashboardData = {
            widgets: widgets,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Dashboard exported');
    }, [widgets]);

    const getChartOption = (widget: DashboardWidget): EChartsOption | null => {
        try {
            if (!widget.data || widget.data.length === 0) {
                console.warn('No data available for widget:', widget.id);
                return {
                    title: { text: 'No data available', left: 'center' },
                    graphic: {
                        type: 'text',
                        left: 'center',
                        top: 'middle',
                        style: { text: 'No data to display', fontSize: 14, fill: '#999' }
                    }
                };
            }
            return createEChartsOption(widget.rec, widget.data);
        } catch (error) {
            console.error('Error creating chart option:', error);
            return {
                title: { text: 'Chart Error', left: 'center' },
                graphic: {
                    type: 'text',
                    left: 'center',
                    top: 'middle',
                    style: { text: 'Failed to render chart', fontSize: 14, fill: '#f00' }
                }
            };
        }
    };

    return (
        <div className="w-full flex flex-col" style={{ minHeight: '600px' }}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Dashboard Builder</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTemplateDialogOpen(true)}
                    >
                        Templates
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportDashboard}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={saveTemplate}
                        disabled={widgets.length === 0}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsAddingWidget(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Widget
                    </Button>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50 min-h-[600px]">
                {widgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                        <LayoutGrid className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Widgets Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Click "Add Widget" to start building your dashboard</p>
                        <Button onClick={() => setIsAddingWidget(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Widget
                        </Button>
                    </div>
                ) : (
                    <ReactSortable
                        list={widgets}
                        setList={setWidgets}
                        animation={200}
                        handle=".drag-handle"
                        className="grid gap-4"
                        style={{ 
                            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                            gridAutoRows: `${GRID_ROW_HEIGHT}px`
                        }}
                    >
                        {widgets.map((widget) => {
                            const option = getChartOption(widget);
                            if (!option) {
                                return (
                                    <Card
                                        key={widget.id}
                                        className="relative border-2 border-red-200"
                                        style={{
                                            gridColumn: `span ${widget.position.w}`,
                                            gridRow: `span 2`
                                        }}
                                    >
                                        <CardContent className="p-4 text-center text-red-600">
                                            Failed to load widget: {widget.title}
                                        </CardContent>
                                    </Card>
                                );
                            }

                            return (
                                <Card
                                    key={widget.id}
                                    className={`relative border-2 transition-all ${
                                        selectedWidget === widget.id 
                                            ? 'border-blue-500 shadow-lg' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={{
                                        gridColumn: `span ${widget.position.w}`,
                                        gridRow: `span ${widget.isMinimized ? 1 : widget.position.h}`,
                                        cursor: 'move'
                                    }}
                                    onClick={() => setSelectedWidget(widget.id)}
                                >
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move drag-handle" />
                                    <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                        {widget.chartType}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMinimize(widget.id);
                                        }}
                                    >
                                        {widget.isMinimized ? (
                                            <Maximize2 className="h-3 w-3" />
                                        ) : (
                                            <Minimize2 className="h-3 w-3" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeWidget(widget.id);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardHeader>
                            {!widget.isMinimized && (
                                <CardContent className="p-2 flex-1">
                                    <div style={{ height: `${Math.max((widget.position.h * GRID_ROW_HEIGHT) - 100, 200)}px`, minHeight: '200px' }}>
                                        <EChartsWrapper option={option} />
                                    </div>
                                </CardContent>
                            )}
                                </Card>
                            );
                        })}
                    </ReactSortable>
                )}
            </div>

            {/* Add Widget Dialog */}
            <Dialog open={isAddingWidget} onOpenChange={setIsAddingWidget}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Widget</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Chart Type</Label>
                            <Select
                                value={newWidget.chartType}
                                onValueChange={(value) => setNewWidget({ ...newWidget, chartType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select chart type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bar">Bar Chart</SelectItem>
                                    <SelectItem value="line">Line Chart</SelectItem>
                                    <SelectItem value="pie">Pie Chart</SelectItem>
                                    <SelectItem value="area">Area Chart</SelectItem>
                                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                                    <SelectItem value="heatmap">Heatmap</SelectItem>
                                    <SelectItem value="sankey">Sankey Diagram</SelectItem>
                                    <SelectItem value="network">Network Graph</SelectItem>
                                    <SelectItem value="map">Geographic Map</SelectItem>
                                    <SelectItem value="3d-scatter">3D Scatter</SelectItem>
                                    <SelectItem value="3d-bar">3D Bar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Title</Label>
                            <Input
                                value={newWidget.title || ''}
                                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                                placeholder="Widget title"
                            />
                        </div>
                        <div>
                            <Label>X-Axis</Label>
                            <Select
                                value={newWidget.xAxis}
                                onValueChange={(value) => setNewWidget({ ...newWidget, xAxis: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select X-axis column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(col => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Y-Axis</Label>
                            <Select
                                value={Array.isArray(newWidget.yAxis) ? newWidget.yAxis[0] : (newWidget.yAxis || '')}
                                onValueChange={(value) => setNewWidget({ ...newWidget, yAxis: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Y-axis column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.length > 0 ? (
                                        columns.map(col => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="" disabled>No columns available</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsAddingWidget(false)}>
                                Cancel
                            </Button>
                            <Button onClick={addWidget}>
                                Add Widget
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Templates Dialog */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Dashboard Templates</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {templates.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No templates saved yet. Create a dashboard and save it as a template.
                            </p>
                        ) : (
                            templates.map(template => (
                                <Card
                                    key={template.id}
                                    className="cursor-pointer hover:border-blue-500 transition-colors"
                                    onClick={() => loadTemplate(template)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold">{template.name}</h3>
                                                <p className="text-sm text-gray-500">{template.description}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(template.createdAt).toLocaleDateString()} • Version {template.version}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm">
                                                Load
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
