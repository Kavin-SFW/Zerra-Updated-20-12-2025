import { createContext, useContext, useState, ReactNode } from "react";

interface AnalyticsContextType {
    selectedDataSourceId: string | null;
    setSelectedDataSourceId: (id: string | null) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);

    return (
        <AnalyticsContext.Provider value={{ selectedDataSourceId, setSelectedDataSourceId }}>
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
