import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { EChartsOption } from "echarts";

// Chart type for pinned charts from chat/AI recommendations
export interface PinnedChart {
    title: string;
    option: EChartsOption;
    rec: {
        title: string;
        type: string;
        x_axis?: string;
        y_axis?: string | string[];
        reasoning?: string;
        priority?: string;
    };
}

interface AnalyticsContextType {
    selectedDataSourceId: string | null;
    setSelectedDataSourceId: (id: string | null) => void;
    isChatOpen: boolean;
    setIsChatOpen: (open: boolean) => void;
    selectedTemplate: string;
    setSelectedTemplate: (template: string) => void;
    selectedIndustryId: string;
    setSelectedIndustryId: (id: string) => void;
    selectedIndustryName: string;
    setSelectedIndustryName: (name: string) => void;
    // New: Queue for charts to be added to dashboard
    pendingCharts: PinnedChart[];
    addChartToDashboard: (chart: PinnedChart) => void;
    clearPendingCharts: () => PinnedChart[];
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("default");
    const [selectedIndustryId, setSelectedIndustryId] = useState("all");
    const [selectedIndustryName, setSelectedIndustryName] = useState("All Industries");
    const [pendingCharts, setPendingCharts] = useState<PinnedChart[]>([]);

    const addChartToDashboard = useCallback((chart: PinnedChart) => {
        setPendingCharts(prev => [...prev, chart]);
    }, []);

    const clearPendingCharts = useCallback(() => {
        const charts = [...pendingCharts];
        setPendingCharts([]);
        return charts;
    }, [pendingCharts]);

    return (
        <AnalyticsContext.Provider value={{
            selectedDataSourceId,
            setSelectedDataSourceId,
            isChatOpen,
            setIsChatOpen,
            selectedTemplate,
            setSelectedTemplate,
            selectedIndustryId,
            setSelectedIndustryId,
            selectedIndustryName,
            setSelectedIndustryName,
            pendingCharts,
            addChartToDashboard,
            clearPendingCharts
        }}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (context === undefined) {
        throw new Error("useAnalytics must be used within an AnalyticsProvider");
    }
    return context;
};
