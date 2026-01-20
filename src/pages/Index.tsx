import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  BarChart3,
  Brain,
  Compass,
  Database,
  Zap,
  Shield,
  RefreshCw,
  LayoutDashboard,
  Users,
  Factory,
  ShoppingBag,
  Heart,
  Building2,
  Truck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll("[data-animate]");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      elements.forEach((el) => observerRef.current?.unobserve(el));
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0A0E27]/80 border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo-sfw.png"
              alt="SFW ZERRA"
              className={`transition-all duration-300 object-contain w-15 h-10`}
            />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("features")} className="text-sm text-[#E5E7EB] hover:text-[#00D4FF] transition-colors">Features</button>
            <button onClick={() => scrollToSection("industries")} className="text-sm text-[#E5E7EB] hover:text-[#00D4FF] transition-colors">Industries</button>
            <button onClick={() => scrollToSection("demo")} className="text-sm text-[#E5E7EB] hover:text-[#00D4FF] transition-colors">Demo</button>
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-white hover:bg-white/10">
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90 text-white border-0"
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0E27] via-[#1a1f3a] to-[#0A0E27]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(107,70,193,0.15),transparent_50%)]"></div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#00D4FF] rounded-full opacity-40 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div
              data-animate
              id="hero-text"
              className={`space-y-8 ${isVisible["hero-text"] ? "animate-fade-in-up" : "opacity-0"}`}
            >
              <div className="inline-block">
                <span className="text-xs uppercase tracking-[0.2em] text-[#00D4FF] font-medium">
                  The Future of Data Intelligence
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight">
                Transform Data Into{" "}
                <span className="bg-gradient-to-r from-[#00D4FF] via-[#6B46C1] to-[#9333EA] bg-clip-text text-transparent">
                  Decisions
                </span>{" "}
                With <span className="text-[#00D4FF]">SFW ZERRA</span>
              </h1>
              <p className="text-xl md:text-2xl text-[#E5E7EB] leading-relaxed">
                AI-powered analytics platform delivering descriptive, predictive, and prescriptive insights in real-time
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90 text-white text-lg px-8 py-6 rounded-lg shadow-[0_0_30px_rgba(0,212,255,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.5)] transition-all"
                >
                  Start Free Trial <ArrowRight className="ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white text-lg px-8 py-6 rounded-lg"
                >
                  <Play className="mr-2" size={20} />
                  Watch Demo
                </Button>
              </div>
              <div className="pt-4">
                <p className="text-sm text-[#E5E7EB]/70">
                  Trusted by <span className="text-[#00D4FF] font-semibold">500+ enterprises</span> across Manufacturing, Healthcare, Finance & Retail
                </p>
              </div>
            </div>

            {/* 3D Dashboard Mockup */}
            <div
              data-animate
              id="hero-visual"
              className={`relative ${isVisible["hero-visual"] ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="relative glass-card p-6 rounded-2xl transform hover:scale-105 transition-transform duration-500">
                <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0A0E27] rounded-xl p-5 border border-white/10">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse"></div>
                      <span className="text-xs text-[#E5E7EB]/70 font-medium">Live Dashboard</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/50"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#6B46C1]/50"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#9333EA]/50"></div>
                    </div>
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "Revenue", value: "$2.4M", change: "+23%", color: "from-[#00D4FF] to-[#00A8CC]" },
                      { label: "Users", value: "12.5K", change: "+18%", color: "from-[#6B46C1] to-[#9333EA]" },
                      { label: "Growth", value: "31%", change: "+5%", color: "from-[#9333EA] to-[#C026D3]" },
                    ].map((metric, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-[#E5E7EB]/60 mb-1">{metric.label}</p>
                        <p className="text-lg font-bold text-white mb-1">{metric.value}</p>
                        <span className={`text-xs bg-gradient-to-r ${metric.color} bg-clip-text text-transparent font-semibold`}>
                          {metric.change}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Main Chart */}
                  <div className="h-40 bg-gradient-to-br from-[#00D4FF]/10 to-[#6B46C1]/10 rounded-lg p-4 mb-4 border border-white/10">
                    <div className="flex items-end gap-2 h-full">
                      {[35, 52, 48, 68, 55, 62, 75, 58, 70, 65, 80, 72].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#00D4FF] via-[#6B46C1] to-[#9333EA] rounded-t opacity-80 hover:opacity-100 transition-opacity"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-[#E5E7EB]/50">
                      <span>Jan</span>
                      <span>Mar</span>
                      <span>Jun</span>
                      <span>Sep</span>
                      <span>Dec</span>
                    </div>
                  </div>

                  {/* Secondary Charts Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-[#E5E7EB]/60 mb-2">Conversion Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] rounded-full" style={{ width: "68%" }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#00D4FF]">68%</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs text-[#E5E7EB]/60 mb-2">Active Sessions</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#6B46C1] to-[#9333EA] rounded-full" style={{ width: "84%" }}></div>
                        </div>
                        <span className="text-xs font-semibold text-[#6B46C1]">84%</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating UI Elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] rounded-xl shadow-[0_0_30px_rgba(0,212,255,0.5)] animate-float-slow flex items-center justify-center">
                  <BarChart3 className="text-white" size={32} />
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-[#6B46C1] to-[#9333EA] rounded-lg shadow-[0_0_20px_rgba(107,70,193,0.5)] animate-float-slow flex items-center justify-center" style={{ animationDelay: "1s" }}>
                  <Brain className="text-white" size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section id="features" className="relative py-32 bg-gradient-to-b from-[#0A0E27] to-[#0f1429]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="pillars-header"
            className={`text-center mb-20 ${isVisible["pillars-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Intelligence, <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Evolved</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                id: "pillar-1",
                icon: BarChart3,
                title: "See What Happened",
                description: "Comprehensive visualizations that transform complex datasets into crystal-clear insights. Real-time dashboards powered by ClickHouse deliver sub-second query performance.",
                gradient: "from-[#00D4FF] to-[#00A8CC]",
              },
              {
                id: "pillar-2",
                icon: Brain,
                title: "Know What's Coming",
                description: "H2O AutoML algorithms forecast trends before they happen. Automated machine learning identifies patterns invisible to traditional analysis.",
                gradient: "from-[#6B46C1] to-[#9333EA]",
              },
              {
                id: "pillar-3",
                icon: Compass,
                title: "Act With Confidence",
                description: "AI-generated recommendations tell you exactly what to do next. Conversational intelligence powered by advanced LLMs turns insights into action plans.",
                gradient: "from-[#9333EA] to-[#C026D3]",
              },
            ].map((pillar, index) => (
              <div
                key={pillar.id}
                data-animate
                id={pillar.id}
                className={`glass-card p-8 rounded-2xl hover:scale-105 hover:shadow-[0_0_40px_rgba(0,212,255,0.3)] transition-all duration-500 cursor-pointer group ${isVisible[pillar.id] ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${pillar.gradient} p-4 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <pillar.icon className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{pillar.title}</h3>
                <p className="text-[#E5E7EB]/80 leading-relaxed">{pillar.description}</p>
                <div className="mt-6 h-1 w-0 group-hover:w-full bg-gradient-to-r transition-all duration-500" style={{ background: `linear-gradient(to right, ${pillar.gradient.includes("00D4FF") ? "#00D4FF" : pillar.gradient.includes("6B46C1") ? "#6B46C1" : "#9333EA"}, transparent)` }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Conversation Demo Section */}
      <section id="demo" className="relative py-32 bg-[#0f1429]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="demo-header"
            className={`text-center mb-20 ${isVisible["demo-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Ask Anything. <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Get Everything.</span>
            </h2>
            <p className="text-xl text-[#E5E7EB]/70">Natural language meets enterprise data</p>
          </div>

          <div
            data-animate
            id="demo-chat"
            className={`max-w-4xl mx-auto ${isVisible["demo-chat"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <div className="glass-card p-8 rounded-2xl">
              <div className="space-y-6">
                {/* User Message */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center flex-shrink-0">
                    <Users className="text-white" size={20} />
                  </div>
                  <div className="flex-1 bg-white/5 rounded-lg p-4 border border-white/10">
                    <p className="text-[#E5E7EB]">Show me revenue trends for Q3 vs costs</p>
                  </div>
                </div>

                {/* ZERRA Response */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6B46C1] to-[#9333EA] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0A0E27] rounded-lg p-6 border border-[#00D4FF]/20">
                      {/* Chart Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">Revenue vs Costs - Q3 Analysis</h4>
                          <p className="text-xs text-[#E5E7EB]/60">Quarter-over-Quarter Comparison</p>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-gradient-to-r from-[#00D4FF] to-[#6B46C1]"></div>
                            <span className="text-xs text-[#E5E7EB]/70">Revenue</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-gradient-to-r from-[#9333EA] to-[#C026D3]"></div>
                            <span className="text-xs text-[#E5E7EB]/70">Costs</span>
                          </div>
                        </div>
                      </div>

                      {/* Dual Chart Visualization */}
                      <div className="h-56 bg-gradient-to-br from-[#00D4FF]/5 to-[#6B46C1]/5 rounded-lg p-4 mb-4 border border-white/10 relative overflow-hidden">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 opacity-20">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className="absolute w-full border-t border-white/10"
                              style={{ top: `${(i + 1) * 20}%` }}
                            />
                          ))}
                        </div>

                        {/* Chart Bars - Revenue (Blue) */}
                        <div className="flex gap-3 items-end h-full relative z-10">
                          {[
                            { revenue: 65, cost: 55, month: "Jul" },
                            { revenue: 80, cost: 58, month: "Aug" },
                            { revenue: 70, cost: 60, month: "Sep" },
                          ].map((data, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                              <div className="flex items-end gap-1.5 w-full h-full">
                                {/* Revenue Bar */}
                                <div
                                  className="flex-1 bg-gradient-to-t from-[#00D4FF] via-[#00D4FF]/80 to-[#6B46C1] rounded-t animate-chart-grow relative group"
                                  style={{ height: `${data.revenue}%`, animationDelay: `${i * 0.15}s` }}
                                >
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0E27] px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-white/20">
                                    ${(data.revenue * 10000).toLocaleString()}
                                  </div>
                                </div>
                                {/* Cost Bar */}
                                <div
                                  className="flex-1 bg-gradient-to-t from-[#9333EA] via-[#9333EA]/80 to-[#C026D3] rounded-t animate-chart-grow relative group"
                                  style={{ height: `${data.cost}%`, animationDelay: `${i * 0.15 + 0.05}s` }}
                                >
                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0E27] px-2 py-1 rounded text-xs text-white whitespace-nowrap border border-white/20">
                                    ${(data.cost * 10000).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-[#E5E7EB]/50 mt-auto">{data.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Insights */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-[#00D4FF]/10 rounded-lg p-3 border border-[#00D4FF]/20">
                          <p className="text-xs text-[#E5E7EB]/60 mb-1">Revenue Growth</p>
                          <p className="text-lg font-bold text-[#00D4FF]">+23%</p>
                        </div>
                        <div className="bg-[#9333EA]/10 rounded-lg p-3 border border-[#9333EA]/20">
                          <p className="text-xs text-[#E5E7EB]/60 mb-1">Cost Stability</p>
                          <p className="text-lg font-bold text-[#9333EA]">+2%</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 rounded-lg p-3 border border-[#00D4FF]/30">
                          <p className="text-xs text-[#E5E7EB]/60 mb-1">Profit Margin</p>
                          <p className="text-lg font-bold text-white">+31%</p>
                        </div>
                      </div>

                      <p className="text-[#E5E7EB] text-sm leading-relaxed">
                        Q3 revenue increased by <span className="text-[#00D4FF] font-semibold">23%</span> compared to Q2,
                        while costs remained stable at <span className="text-[#9333EA] font-semibold">+2%</span>. This resulted in a
                        <span className="text-[#00D4FF] font-semibold"> 31% improvement</span> in profit margins.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources Showcase */}
      <section className="relative py-32 bg-gradient-to-b from-[#0f1429] to-[#0A0E27]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="sources-header"
            className={`text-center mb-20 ${isVisible["sources-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Connect Everything, <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Instantly</span>
            </h2>
          </div>

          <div
            data-animate
            id="sources-visual"
            className={`max-w-4xl mx-auto ${isVisible["sources-visual"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <div className="relative h-96 flex items-center justify-center">
              {/* Center Logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center shadow-[0_0_50px_rgba(0,212,255,0.5)] animate-pulse-slow">
                  <Database className="text-white" size={48} />
                </div>
              </div>

              {/* Orbiting Icons */}
              {[
                { name: "Excel", icon: "📊" },
                { name: "CSV", icon: "📄" },
                { name: "PostgreSQL", icon: "🐘" },
                { name: "SAP", icon: "💼" },
                { name: "Oracle", icon: "🗄️" },
                { name: "Dynamics", icon: "⚡" },
                { name: "MySQL", icon: "🗃️" },
                { name: "MongoDB", icon: "🍃" },
              ].map((source, i) => {
                const angle = (i * 360) / 8;
                const radius = 180;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;
                return (
                  <div
                    key={source.name}
                    className="absolute glass-card p-4 rounded-xl animate-orbit"
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: "20s",
                    }}
                  >
                    <div className="text-2xl mb-2">{source.icon}</div>
                    <div className="text-xs text-center text-[#E5E7EB]">{source.name}</div>
                  </div>
                );
              })}

              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
                {[...Array(8)].map((_, i) => {
                  const angle = (i * 360) / 8;
                  const radius = 180;
                  const centerX = 200;
                  const centerY = 200;
                  const x = Math.cos((angle * Math.PI) / 180) * radius + centerX;
                  const y = Math.sin((angle * Math.PI) / 180) * radius + centerY;
                  return (
                    <line
                      key={i}
                      x1={centerX}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke="#00D4FF"
                      strokeWidth="1"
                      className="animate-pulse-slow"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {[
                { label: "100+ Data Sources", icon: Database },
                { label: "Real-Time Sync", icon: Zap },
                { label: "Enterprise-Grade Security", icon: Shield },
                { label: "GDPR Compliant", icon: CheckCircle2 },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="glass-card p-6 rounded-xl text-center hover:scale-105 transition-transform"
                >
                  <stat.icon className="mx-auto mb-3 text-[#00D4FF]" size={32} />
                  <p className="text-sm text-[#E5E7EB]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="relative py-32 bg-[#0A0E27]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="features-header"
            className={`text-center mb-20 ${isVisible["features-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Enterprise <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Features</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {[
              { icon: Building2, title: "Multi-Tenant Architecture", desc: "Isolated environments for maximum security and performance" },
              { icon: Zap, title: "Apache Kafka Streaming", desc: "Real-time data processing at enterprise scale" },
              { icon: Brain, title: "Schema Intelligence", desc: "Automatic schema detection and optimization" },
              { icon: RefreshCw, title: "ML Model Auto-Refresh", desc: "Self-updating models that improve over time" },
              { icon: LayoutDashboard, title: "Embedded Dashboards", desc: "Seamlessly integrate analytics into your apps" },
              { icon: Users, title: "Role-Based Access", desc: "Granular permissions for teams and individuals" },
            ].map((feature, i) => (
              <div
                key={i}
                data-animate
                id={`feature-${i}`}
                className={`glass-card p-6 rounded-xl hover:scale-105 hover:border-[#00D4FF]/50 transition-all cursor-pointer group ${isVisible[`feature-${i}`] ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 p-3 mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-[#00D4FF]" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[#E5E7EB]/70 text-sm">{feature.desc}</p>
                <a href="#" className="text-[#00D4FF] text-sm mt-4 inline-block hover:underline">
                  Learn more →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="relative py-32 bg-gradient-to-b from-[#0A0E27] to-[#0f1429]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="industries-header"
            className={`text-center mb-20 ${isVisible["industries-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Built For Every <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Industry</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Factory, name: "Manufacturing", useCase: "Production optimization" },
              { icon: ShoppingBag, name: "Retail", useCase: "Demand forecasting" },
              { icon: Heart, name: "Healthcare", useCase: "Patient analytics" },
              { icon: Building2, name: "Finance", useCase: "Risk analysis" },
              { icon: Truck, name: "Logistics", useCase: "Route optimization" },
            ].map((industry, i) => (
              <div
                key={i}
                data-animate
                id={`industry-${i}`}
                className={`glass-card p-6 rounded-xl text-center hover:scale-105 transition-all cursor-pointer ${isVisible[`industry-${i}`] ? "animate-fade-in-up" : "opacity-0"}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 mx-auto mb-4 flex items-center justify-center">
                  <industry.icon className="text-[#00D4FF]" size={32} />
                </div>
                <h3 className="font-bold mb-2">{industry.name}</h3>
                <p className="text-sm text-[#E5E7EB]/70">{industry.useCase}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Excellence Section */}
      <section className="relative py-32 bg-[#0f1429]">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div
              data-animate
              id="tech-text"
              className={`space-y-6 ${isVisible["tech-text"] ? "animate-fade-in-up" : "opacity-0"}`}
            >
              <h2 className="text-4xl md:text-6xl font-bold">
                Enterprise Architecture, <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Startup Speed</span>
              </h2>
              <p className="text-xl text-[#E5E7EB]/70">Built on battle-tested technology</p>

              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  "Sub-second query performance",
                  "99.9% uptime SLA",
                  "AES-256 encryption",
                  "Horizontal scalability",
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-[#00D4FF] flex-shrink-0" size={20} />
                    <span className="text-[#E5E7EB]">{stat}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mt-8">
                {["Kafka", "Spark", "ClickHouse", "LangChain", "Ollama"].map((tech, i) => (
                  <div key={i} className="glass-card px-4 py-2 rounded-lg text-sm">
                    {tech}
                  </div>
                ))}
              </div>
            </div>

            <div
              data-animate
              id="tech-visual"
              className={`${isVisible["tech-visual"] ? "animate-fade-in-up" : "opacity-0"}`}
            >
              <div className="glass-card p-6 rounded-2xl">
                <div className="mb-4 pb-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-1">Data Flow Architecture</h3>
                  <p className="text-xs text-[#E5E7EB]/60">Real-time processing pipeline</p>
                </div>

                {/* Architecture Diagram */}
                <div className="space-y-4">
                  {/* Data Sources Layer */}
                  <div className="flex items-center justify-center gap-2">
                    {["CSV", "API", "DB"].map((source, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 rounded-lg p-3 border border-[#00D4FF]/30 text-center"
                      >
                        <Database className="mx-auto mb-1 text-[#00D4FF]" size={16} />
                        <p className="text-xs text-white font-medium">{source}</p>
                      </div>
                    ))}
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-[#00D4FF] to-[#6B46C1]"></div>
                  </div>

                  {/* Kafka Streaming Layer */}
                  <div className="bg-gradient-to-r from-[#6B46C1]/20 to-[#9333EA]/20 rounded-lg p-4 border border-[#6B46C1]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="text-[#6B46C1]" size={18} />
                        <span className="text-sm font-semibold text-white">Apache Kafka</span>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[#E5E7EB]/70 mt-2">Real-time data streaming</p>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-[#6B46C1] to-[#9333EA]"></div>
                  </div>

                  {/* Processing Layer */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-[#00D4FF]/15 to-[#6B46C1]/15 rounded-lg p-3 border border-[#00D4FF]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="text-[#00D4FF]" size={14} />
                        <span className="text-xs font-semibold text-white">ClickHouse</span>
                      </div>
                      <p className="text-xs text-[#E5E7EB]/60">Analytics DB</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#6B46C1]/15 to-[#9333EA]/15 rounded-lg p-3 border border-[#6B46C1]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="text-[#6B46C1]" size={14} />
                        <span className="text-xs font-semibold text-white">H2O AutoML</span>
                      </div>
                      <p className="text-xs text-[#E5E7EB]/60">ML Processing</p>
                    </div>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-[#9333EA] to-[#00D4FF]"></div>
                  </div>

                  {/* AI Layer */}
                  <div className="bg-gradient-to-r from-[#9333EA]/20 to-[#00D4FF]/20 rounded-lg p-4 border border-[#9333EA]/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-[#9333EA]" size={18} />
                        <span className="text-sm font-semibold text-white">LLM Intelligence</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#00D4FF]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#6B46C1]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#9333EA]"></div>
                      </div>
                    </div>
                    <p className="text-xs text-[#E5E7EB]/70 mt-2">LangChain + Ollama</p>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-6 bg-gradient-to-b from-[#00D4FF] to-[#6B46C1]"></div>
                  </div>

                  {/* Output Layer */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex-1 bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 rounded-lg p-3 border border-[#00D4FF]/30 text-center">
                      <LayoutDashboard className="mx-auto mb-1 text-[#00D4FF]" size={16} />
                      <p className="text-xs text-white font-medium">Dashboards</p>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-[#6B46C1]/20 to-[#9333EA]/20 rounded-lg p-3 border border-[#6B46C1]/30 text-center">
                      <Users className="mx-auto mb-1 text-[#6B46C1]" size={16} />
                      <p className="text-xs text-white font-medium">API</p>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#00D4FF]">&lt;1s</p>
                    <p className="text-xs text-[#E5E7EB]/60">Query Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#6B46C1]">99.9%</p>
                    <p className="text-xs text-[#E5E7EB]/60">Uptime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative py-32 bg-gradient-to-b from-[#0f1429] to-[#0A0E27]">
        <div className="container mx-auto px-4">
          <div
            data-animate
            id="social-header"
            className={`text-center mb-20 ${isVisible["social-header"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Trusted By <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Leaders</span>
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="glass-card p-8 rounded-2xl mb-8">
              <p className="text-xl text-[#E5E7EB] mb-6 italic">
                "ZERRA transformed how we analyze our manufacturing data. What used to take hours now takes minutes, and the AI insights have helped us optimize production by 30%."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1]"></div>
                <div>
                  <p className="font-semibold">Sarah Chen</p>
                  <p className="text-sm text-[#E5E7EB]/70">CTO, Manufacturing Corp</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-[#00D4FF] mb-2">Reduced reporting time from 4 hours to 4 minutes</p>
              <p className="text-[#E5E7EB]/70">Average improvement across 500+ enterprise customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 bg-gradient-to-br from-[#0A0E27] via-[#1a1f3a] to-[#0A0E27] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,255,0.15),transparent_70%)]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div
            data-animate
            id="cta-content"
            className={`max-w-4xl mx-auto text-center space-y-8 ${isVisible["cta-content"] ? "animate-fade-in-up" : "opacity-0"}`}
          >
            <h2 className="text-4xl md:text-6xl font-bold">
              Ready to Transform Your <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Data?</span>
            </h2>
            <p className="text-xl text-[#E5E7EB]/70">
              Join hundreds of companies making smarter decisions with ZERRA
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90 text-white text-lg px-12 py-6 rounded-lg shadow-[0_0_40px_rgba(0,212,255,0.4)] hover:shadow-[0_0_60px_rgba(0,212,255,0.6)] transition-all"
              >
                Start Your Free Trial <ArrowRight className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white text-lg px-12 py-6 rounded-lg"
              >
                Schedule a Demo
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[#E5E7EB]/70 pt-4">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00D4FF]" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00D4FF]" />
                14-day trial
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00D4FF]" />
                5-minute setup
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-[#0A0E27] border-t border-white/10">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-bold mb-4 text-[#00D4FF]">Product</h3>
              <ul className="space-y-2 text-sm text-[#E5E7EB]/70">
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#00D4FF]">Company</h3>
              <ul className="space-y-2 text-sm text-[#E5E7EB]/70">
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#00D4FF]">Resources</h3>
              <ul className="space-y-2 text-sm text-[#E5E7EB]/70">
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">API</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#00D4FF]">Legal</h3>
              <ul className="space-y-2 text-sm text-[#E5E7EB]/70">
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">GDPR Compliance</a></li>
                <li><a href="#" className="hover:text-[#00D4FF] transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-[#E5E7EB]/70">© 2025 SFW ZERRA. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-[#E5E7EB]/70 hover:text-[#00D4FF] transition-colors">LinkedIn</a>
              <a href="#" className="text-[#E5E7EB]/70 hover:text-[#00D4FF] transition-colors">Twitter</a>
              <a href="#" className="text-[#E5E7EB]/70 hover:text-[#00D4FF] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
