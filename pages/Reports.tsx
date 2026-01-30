import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Reports = () => {
  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Reports</span>
          </h1>
          <p className="text-[#E5E7EB]/70 text-lg">Generate and manage reports</p>
        </div>

        {/* Content */}
        <Card className="glass-card p-12 border-white/10 text-center">
          <FileText className="w-16 h-16 text-[#00D4FF] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-white">Reports</h3>
          <p className="text-[#E5E7EB]/70">Report generation features coming soon...</p>
        </Card>
      </div>
    </div>
  );
};

export default Reports;

