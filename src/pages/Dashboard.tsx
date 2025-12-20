import { Card } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

const Dashboard = () => {
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
        <Card className="glass-card p-12 border-white/10 text-center">
          <LayoutDashboard className="w-16 h-16 text-[#00D4FF] mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-white">Dashboard</h3>
          <p className="text-[#E5E7EB]/70">Dashboard features coming soon...</p>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
