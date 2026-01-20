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
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { ChevronDown, MoreVertical, LayoutDashboard } from "lucide-react";

// import TopChatTrigger from "./TopChatTrigger";

interface SidebarLayoutProps {
  children: ReactNode;
}

const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { selectedTemplate, setSelectedTemplate } = useAnalytics();
  const [isHovered, setIsHovered] = useState(false);
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(true);

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
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${isHovered ? "w-64" : "w-20"} bg-[#0f1429] border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out z-50`}
      >
        {/* Logo */}
        <div
          className={`border-b border-white/10 overflow-hidden transition-all duration-300 ${isHovered ? "p-5" : "p-3"
            }`}
        >
          <div className="flex items-center gap-3 justify-center">
            <img
              src="/favicon.svg"
              alt="SoftWorks Technologies"
              className={`transition-all duration-300 object-contain ${isHovered ? "h-10" : "h-12"
                }`}
            />
            <span
              className={`text-white font-bold text-lg transition-all duration-300 whitespace-nowrap ${isHovered ? "opacity-100" : "opacity-0 w-0"
                }`}
            >
              Zerra
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <div key={item.path} className="space-y-1">
                <button
                  onClick={() => {
                    navigate(item.path);
                    if (item.path === "/analytics") {
                      setIsAnalyticsExpanded(!isAnalyticsExpanded);
                    }
                  }}
                  className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all relative group ${active
                    ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
                    : "text-[#E5E7EB]/70 hover:text-[#E5E7EB] hover:bg-white/5"
                    }`}
                >
                  <Icon className={`w-5 h-5 min-w-[20px] ${active ? "text-[#00D4FF]" : ""}`} />
                  <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {item.label}
                  </span>
                  {/* {isHovered && item.path === "/analytics" && (
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-300 ${isAnalyticsExpanded ? 'rotate-180' : ''}`} />
                  )} */}
                  {!isHovered && (
                    <div className="absolute left-14 bg-[#1e293b] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                      {item.label}
                    </div>
                  )}
                </button>

                {/* Sub-menu for Analytics Template Selection */}
                {/* {active && item.path === "/analytics" && isHovered && isAnalyticsExpanded && (
                  <div className="ml-9 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
                    <button
                      onClick={() => setSelectedTemplate('default')}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10.5px] transition-all ${selectedTemplate === 'default'
                        ? "text-[#00D4FF] bg-[#00D4FF]/10 font-semibold"
                        : "text-[#E5E7EB]/50 hover:text-[#E5E7EB] hover:bg-white/5"
                        }`}
                    >
                      <LayoutDashboard className="w-3 h-3 min-w-[12px]" />
                      <span>Default Analytics</span>
                    </button>

                    <div className="pt-2 pb-1">
                      <p className="text-[9px] font-bold text-[#00D4FF]/40 px-2 tracking-wider uppercase">Dashboards</p>
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[250px] pr-1 scrollbar-hide">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const name = `Template ${i + 1}`;
                        const templateId = `template${i + 1}`;
                        const isSel = selectedTemplate === templateId;
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedTemplate(templateId)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[10.5px] transition-all group/temp ${isSel
                              ? "text-[#00D4FF] bg-[#00D4FF]/10 font-semibold"
                              : "text-[#E5E7EB]/40 hover:text-[#E5E7EB] hover:bg-white/5"
                              }`}
                          >
                            <span className={`w-3.5 h-3.5 flex items-center justify-center border rounded-[3px] text-[8px] transition-colors ${isSel
                              ? "border-[#00D4FF] bg-[#00D4FF]/20"
                              : "border-white/10 group-hover/temp:border-[#00D4FF]/50"
                              }`}>
                              {i + 1}
                            </span>
                            <span className="truncate">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )} */}
              </div>
            );
          })}
        </nav>

        {/* Account Section */}
        <div className={`border-t border-white/10 overflow-hidden transition-all duration-300 ${isHovered ? 'p-4' : 'p-2'}`}>
          <div className={`flex items-center mb-3 transition-all duration-300 ${isHovered ? 'gap-4 px-2' : 'justify-center'}`}>
            <div className="w-10 h-10 min-w-[40px] rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center shadow-lg group-hover:shadow-[#00D4FF]/20">
              <span className="text-sm font-bold text-white">{userInitials}</span>
            </div>
            <span className={`text-sm text-[#E5E7EB]/70 whitespace-nowrap transition-all duration-300 overflow-hidden ${isHovered ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
              Account
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full text-[#E5E7EB]/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 ${isHovered ? 'justify-start px-3' : 'justify-center px-0'}`}
          >
            <LogOut className="w-4 h-4 min-w-[16px]" />
            <span className={`transition-all duration-300 overflow-hidden ${isHovered ? 'opacity-100 w-auto ml-2' : 'opacity-0 w-0 ml-0'}`}>
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-0">
        {/* <TopChatTrigger /> */}
        <div className="p-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;

