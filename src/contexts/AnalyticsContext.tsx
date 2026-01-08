import { createContext, useContext, useState, ReactNode } from "react";

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
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
    const [selectedDataSourceId, setSelectedDataSourceId] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("default");
    const [selectedIndustryId, setSelectedIndustryId] = useState("all");
    const [selectedIndustryName, setSelectedIndustryName] = useState("All Industries");

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
            setSelectedIndustryName
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
