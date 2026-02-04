import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Terminal } from "lucide-react";

const ApiDocs = () => {
    return (
        <div className="min-h-screen bg-[#0A0E27] text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold mb-2">
                        <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">
                            API Documentation
                        </span>
                    </h1>
                    <p className="text-[#E5E7EB]/70 text-lg">
                        Integrate Zerra into your applications
                    </p>
                </div>

                <Card className="glass-card p-6 border-white/10 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Authentication</h2>
                        <p className="text-[#E5E7EB]/70">
                            All API requests must include your API key in the
                            {" "}
                            <code>Authorization</code> header.
                        </p>
                        <div className="bg-black/50 p-4 rounded-lg flex items-center justify-between group">
                            <code className="text-[#00D4FF]">
                                Authorization: Bearer YOUR_API_KEY
                            </code>
                            <button
                                onClick={() =>
                                    navigator.clipboard.writeText(
                                        "Authorization: Bearer YOUR_API_KEY",
                                    )}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Copy className="w-4 h-4 text-white/50 hover:text-white" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Endpoints</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                        GET
                                    </Badge>
                                    <code className="text-white">
                                        /api/v1/analytics
                                    </code>
                                </div>
                                <p className="text-[#E5E7EB]/70 ml-14">
                                    Retrieve analytics data for your project.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                        POST
                                    </Badge>
                                    <code className="text-white">
                                        /api/v1/data-sources
                                    </code>
                                </div>
                                <p className="text-[#E5E7EB]/70 ml-14">
                                    Upload a new data source.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-[#E5E7EB]/50">
                            <Terminal className="w-4 h-4" />
                            <p className="text-sm">
                                Complete documentation coming soon.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ApiDocs;
