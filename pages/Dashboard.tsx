import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Trash2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChatChart from "@/components/ChatChart";
import { EChartsOption } from "echarts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import LoggerService from "@/services/LoggerService";

interface Visualization {
  id: string;
  chart_config: any;
  chart_type?: string;
  insight?: string;
  created_at?: string;
  file_id?: string;
  file_name?: string; // Enhanced property
}

const Dashboard = () => {
  const [charts, setCharts] = useState<Visualization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCharts();
  }, []);

  const fetchCharts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch Visualizations
      const { data: vizData, error: vizError } = await supabase
        .from('visualizations')
        .select('*')
        .eq('user_id', session.user.id) // Filter by user
        .order('created_at', { ascending: false });

      if (vizError) throw vizError;
      if (!vizData || vizData.length === 0) {
        setCharts([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch File Names (Resolving file_id to name)
      // Collect unique file IDs
      const fileIds = Array.from(new Set(vizData.map(v => v.file_id).filter(Boolean)));

      let fileMap: Record<string, string> = {};

      if (fileIds.length > 0) {
        // Try identifying as Uploaded Files first
        const { data: files } = await supabase
          .from('uploaded_files')
          .select('id, file_name')
          .in('id', fileIds);

        if (files) {
          files.forEach(f => { fileMap[f.id] = f.file_name; });
        }

        // Fallback: Check Data Sources (if ID refers to a data source directly)
        const missingIds = fileIds.filter(id => !fileMap[id]);
        if (missingIds.length > 0) {
          const { data: sources } = await (supabase as any)
            .from('data_sources')
            .select('id, name')
            .in('id', missingIds);

          if (sources) {
            sources.forEach((s: any) => { fileMap[s.id] = s.name; });
          }
        }
      }

      // 3. Merge
      const enhancedCharts: Visualization[] = vizData.map(v => ({
        ...v,
        file_name: fileMap[v.file_id] || 'Unknown Dataset'
      }));

      setCharts(enhancedCharts);
    } catch (error) {
      console.error('Error fetching dashboard items:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChart = async (id: string) => {
    try {
      LoggerService.info('Dashboard', 'DELETE_CHART_START', `Deleting chart ${id}`, { chartId: id });
      
      const { error } = await supabase
        .from('visualizations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCharts(prev => prev.filter(chart => chart.id !== id));
      toast.success("Chart removed from dashboard");
      LoggerService.info('Dashboard', 'DELETE_CHART_SUCCESS', `Chart ${id} deleted`, { chartId: id });
    } catch (error) {
      LoggerService.error('Dashboard', 'DELETE_CHART_ERROR', 'Failed to delete chart', error, { chartId: id });
      toast.error("Failed to delete chart");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Dashboard</span>
          </h1>
          <p className="text-[#E5E7EB]/70 text-lg">Overview of your analytics and insights</p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-card p-6 h-[400px] animate-pulse bg-white/5 border-white/10" />
            ))}
          </div>
        ) : charts.length === 0 ? (
          <Card className="glass-card p-12 border-white/10 text-center">
            <LayoutDashboard className="w-16 h-16 text-[#00D4FF] mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-white">Empty Dashboard</h3>
            <p className="text-[#E5E7EB]/70">Ask the chatbot to "Add this chart to dashboard" to see it here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {charts.map((item) => (
              <Card key={item.id} className="glass-card border-white/10 overflow-hidden flex flex-col group hover:border-[#00D4FF]/30 transition-all duration-300">
                <div className="p-4 border-b border-white/10 flex justify-between items-start bg-white/5">
                  <div className="flex flex-col gap-1 items-start flex-1 mr-2">
                    <p className="text-base text-white/90 font-semibold line-clamp-1">
                      {item.insight || 'Untitled Chart'}
                    </p>
                    {item.file_name && (
                      <Badge variant="outline" className="text-xs border-[#00D4FF]/30 text-[#00D4FF] bg-[#00D4FF]/10 gap-1 pl-2 pr-2 h-5">
                        <Database className="w-3 h-3" />
                        {item.file_name}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteChart(item.id)}
                    className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-white/10 -mt-1 -mr-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 flex-1 min-h-[350px] bg-[#0A0E27]/50">
                  <ChatChart
                    option={item.chart_config as EChartsOption}
                    title=""
                    type={item.chart_type as any}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
