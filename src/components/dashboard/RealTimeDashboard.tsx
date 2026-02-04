import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Radio, Wifi, WifiOff, RefreshCw, Bell, BellOff, 
    Settings, AlertCircle, CheckCircle, Clock 
} from 'lucide-react';
import EChartsWrapper from '@/components/charts/EChartsWrapper';
import { EChartsOption } from 'echarts';
import { createEChartsOption } from '@/lib/chart-utils';
import { VisualizationRecommendation } from '@/types/analytics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RealTimeWidget {
    id: string;
    title: string;
    chartOption: EChartsOption;
    rec: VisualizationRecommendation;
    refreshInterval?: number;
    lastUpdated?: Date;
    alertThreshold?: { min?: number; max?: number };
    isAlertActive?: boolean;
}

interface RealTimeDashboardProps {
    fileId: string;
    initialWidgets?: RealTimeWidget[];
}

export function RealTimeDashboard({ fileId, initialWidgets = [] }: RealTimeDashboardProps) {
    const [widgets, setWidgets] = useState<RealTimeWidget[]>(initialWidgets);
    const [isLive, setIsLive] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
    const [alertsEnabled, setAlertsEnabled] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null);

    // WebSocket/Realtime subscription
    useEffect(() => {
        if (!isLive || !fileId) return;

        setConnectionStatus('connecting');
        
        // Subscribe to Supabase Realtime for data changes
        const channel = supabase
            .channel(`dashboard-${fileId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'data_records',
                    filter: `file_id=eq.${fileId}`
                },
                (payload) => {
                    console.log('Real-time update received:', payload);
                    handleDataUpdate();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                    toast.success('Real-time connection established');
                } else if (status === 'CLOSED') {
                    setConnectionStatus('disconnected');
                    toast.error('Real-time connection closed');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [isLive, fileId]);

    // Auto-refresh timer
    useEffect(() => {
        if (!isLive || refreshInterval <= 0) {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            return;
        }

        refreshTimerRef.current = setInterval(() => {
            handleDataUpdate();
        }, refreshInterval);

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        };
    }, [isLive, refreshInterval]);

    const handleDataUpdate = useCallback(async () => {
        try {
            // Fetch latest data
            const { data: records, error } = await supabase
                .from('data_records')
                .select('row_data')
                .eq('file_id', fileId)
                .order('created_at', { ascending: false })
                .limit(1000);

            if (error) throw error;

            const latestData = records?.map(r => r.row_data) || [];

            // Update all widgets with new data
            setWidgets(prevWidgets => 
                prevWidgets.map(widget => {
                    try {
                        const newOption = createEChartsOption(widget.rec, latestData);
                        const lastUpdated = new Date();
                        
                        // Check alerts
                        let isAlertActive = false;
                        if (alertsEnabled && widget.alertThreshold) {
                            // Simple alert check - can be enhanced
                            isAlertActive = false; // Implement threshold checking
                        }

                        return {
                            ...widget,
                            chartOption: newOption,
                            lastUpdated,
                            isAlertActive
                        };
                    } catch (error) {
                        console.error('Error updating widget:', error);
                        return widget;
                    }
                })
            );

            toast.success('Dashboard refreshed', { duration: 1000 });
        } catch (error) {
            console.error('Error updating dashboard:', error);
            toast.error('Failed to refresh dashboard');
        }
    }, [fileId, alertsEnabled]);

    const toggleLive = useCallback(() => {
        setIsLive(!isLive);
        if (!isLive) {
            toast.success('Live mode enabled');
        } else {
            toast.info('Live mode disabled');
        }
    }, [isLive]);

    const manualRefresh = useCallback(() => {
        handleDataUpdate();
    }, [handleDataUpdate]);

    return (
        <div className="w-full space-y-4">
            {/* Control Panel */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Real-Time Dashboard Controls</CardTitle>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {connectionStatus === 'connected' ? (
                                    <Wifi className="h-5 w-5 text-green-500" />
                                ) : connectionStatus === 'connecting' ? (
                                    <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                                ) : (
                                    <WifiOff className="h-5 w-5 text-red-500" />
                                )}
                                <Badge 
                                    variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
                                >
                                    {connectionStatus}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={isLive}
                                    onCheckedChange={toggleLive}
                                    id="live-mode"
                                />
                                <Label htmlFor="live-mode" className="cursor-pointer">
                                    Live Mode
                                </Label>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={manualRefresh}
                                disabled={!isLive}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Now
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Auto-Refresh Interval</Label>
                            <Select
                                value={refreshInterval.toString()}
                                onValueChange={(value) => setRefreshInterval(Number(value))}
                                disabled={!isLive}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1000">1 second</SelectItem>
                                    <SelectItem value="5000">5 seconds</SelectItem>
                                    <SelectItem value="10000">10 seconds</SelectItem>
                                    <SelectItem value="30000">30 seconds</SelectItem>
                                    <SelectItem value="60000">1 minute</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={alertsEnabled}
                                onCheckedChange={setAlertsEnabled}
                                id="alerts"
                            />
                            <Label htmlFor="alerts" className="cursor-pointer">
                                Enable Alerts
                            </Label>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>
                                Last update: {widgets[0]?.lastUpdated?.toLocaleTimeString() || 'Never'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {widgets.map((widget) => (
                    <Card 
                        key={widget.id}
                        className={`relative ${
                            widget.isAlertActive ? 'border-red-500 border-2' : ''
                        }`}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold">
                                    {widget.title}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {widget.isAlertActive && (
                                        <Badge variant="destructive" className="text-xs">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Alert
                                        </Badge>
                                    )}
                                    {widget.lastUpdated && (
                                        <span className="text-xs text-gray-500">
                                            {widget.lastUpdated.toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div style={{ height: '300px' }}>
                                <EChartsWrapper option={widget.chartOption} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {widgets.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">No widgets configured. Add widgets to start monitoring.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
