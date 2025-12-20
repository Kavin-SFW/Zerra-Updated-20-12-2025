import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Database,
  BarChart3,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import logo from "@/assets/softworks-logo.png";
import { useToast } from "@/hooks/use-toast";

interface SidebarLayoutProps {
  children: ReactNode;
}

const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({ title: "Logged out successfully" });
  };

  const menuItems = [
    {
      icon: Database,
      label: "Data Sources",
      path: "/data-sources",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      path: "/analytics",
    },
    {
      icon: FileText,
      label: "Reports",
      path: "/reports",
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Get user initials for avatar
  const [userInitials, setUserInitials] = useState("NR");

  useEffect(() => {
    const getUserInitials = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserInitials(user.email.substring(0, 2).toUpperCase());
        }
      } catch (error) {
        console.error("Error getting user:", error);
      }
    };
    getUserInitials();
  }, []);

  return (
    <div className="flex h-screen bg-[#0A0E27] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f1429] border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src={logo} alt="SFW ZERRA" className="h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">
              Zerra
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  active
                    ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-[#E5E7EB]/70 hover:text-[#E5E7EB] hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-[#00D4FF]" : ""}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Account Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#E5E7EB]/70">Account</span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center">
              <span className="text-sm font-bold text-white">{userInitials}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-[#E5E7EB]/70 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default SidebarLayout;

