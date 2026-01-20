import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { cn } from "@/lib/utils";

const TopChatTrigger = () => {
    const { setIsChatOpen } = useAnalytics();

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-4 relative z-40">
            <div
                onClick={() => setIsChatOpen(true)}
                className="relative group cursor-pointer hover:scale-[1.01] transition-all duration-300 ease-in-out"
            >
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
                </div>

                <div className="w-full h-14 pl-12 pr-32 bg-transparent border border-white/10 rounded-2xl flex items-center text-slate-400 text-base">
                    Ask AI anything about your data...
                </div>

                <div className="absolute inset-y-0 right-2 flex items-center">
                    <Button
                        className="h-10 px-5 bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 pointer-events-none"
                    >
                        <Send className="w-4 h-4" />
                        Ask AI
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TopChatTrigger;
