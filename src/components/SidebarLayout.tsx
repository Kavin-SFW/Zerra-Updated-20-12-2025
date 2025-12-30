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
// import TopChatTrigger from "./TopChatTrigger";

interface SidebarLayoutProps {
  children: ReactNode;
}

const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);

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
        className={`${isHovered ? 'w-64' : 'w-20'} bg-[#0f1429] border-r border-white/10 flex flex-col transition-all duration-300 ease-in-out z-50`}
      >
        {/* Logo */}
        <div className={`border-b border-white/10 overflow-hidden transition-all duration-300 ${isHovered ? 'p-5' : 'p-3'}`}>
          <div className="flex items-center justify-center">
            <img
              src="/logo-sfw.png"
              alt="SFW ZERRA"
              className={`transition-all duration-300 object-contain ${isHovered ? 'h-10' : 'h-12'}`}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all relative group ${active
                  ? "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30"
                  : "text-[#E5E7EB]/70 hover:text-[#E5E7EB] hover:bg-white/5"
                  }`}
              >
                <Icon className={`w-5 h-5 min-w-[20px] ${active ? "text-[#00D4FF]" : ""}`} />
                <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {item.label}
                </span>
                {!isHovered && (
                  <div className="absolute left-14 bg-[#1e293b] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-white/10">
                    {item.label}
                  </div>
                )}
              </button>
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

