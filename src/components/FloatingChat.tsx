import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  X, Send, Bot, ThumbsUp, ThumbsDown, Copy,
  TrendingUp, Database, BarChart3, Minimize2, Mic, MicOff, Pin
} from "lucide-react";

// Custom Logo Icon component matching favicon.svg
const LogoIcon = ({ className = "", size = 24 }: { className?: string; size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 121 121" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="60.5" cy="60.5" r="60.5" fill="white"/>
    <circle cx="60.5" cy="60.5" r="58.6385" stroke="#00B7DC" strokeWidth="2" fill="none"/>
    <path d="M29.9387 35.3692H0V84.1992H29.9387V35.3692Z" fill="white"/>
    <circle cx="61.5279" cy="59.5692" r="50.2615" fill="white"/>
    <path d="M60.9981 109.272C55.7645 109.278 50.5644 108.457 45.5854 106.843C45.6338 106.389 45.6951 105.923 45.7713 105.46C46.0631 104.075 46.8102 102.83 47.8956 101.923C49.085 100.84 50.6276 100.225 52.2352 100.195C52.421 100.195 52.6069 100.195 52.7927 100.221C54.2628 100.363 56.8443 100.514 59.6785 100.514C62.89 100.679 66.1052 100.29 69.1848 99.367C71.9001 98.1235 73.1174 94.9254 71.9149 92.1871C71.2012 90.6197 71.5414 88.7749 72.768 87.5668C73.6452 86.77 74.1935 85.6736 74.305 84.4915C74.305 83.3076 72.9538 82.3786 72.9408 82.3693C73.8478 82.293 74.6971 81.8928 75.3327 81.2412C75.5967 80.9248 75.7025 80.5041 75.6226 80.1001C75.3531 79.0968 74.6953 78.2442 73.7958 77.7267C73.2531 77.3711 72.8925 76.7959 72.8107 76.1518C72.6825 75.02 73.0412 73.8863 73.7958 73.0356C74.673 72.1718 75.8698 71.7102 77.0983 71.7623C78.797 71.9075 80.4083 70.9786 81.1387 69.4354C82.0327 67.464 77.5425 61.0584 74.2622 56.3804C73.8478 55.7884 73.4593 55.2356 73.1099 54.7292C71.0656 51.7657 71.0656 51.6968 71.0656 48.0277C71.0656 46.2071 71.0656 43.4539 70.8091 39.0067C69.6754 25.9014 60.6951 14.8048 48.1279 10.9831C72.1807 4.57565 97.2724 16.8804 106.974 39.8369C114.885 58.577 110.657 80.2509 96.2818 94.6257C86.9354 104.017 74.2362 109.287 60.9981 109.272Z" fill="#00B7DC"/>
    <path d="M27.8773 35.3692H5.5752V39.0923H27.8773V35.3692Z" fill="#00B7DC"/>
    <circle cx="31.5946" cy="37.2308" r="5.5752" fill="#00B7DC"/>
    <circle cx="31.5946" cy="59.5692" r="5.5752" fill="#00B7DC"/>
    <circle cx="31.5946" cy="83.7692" r="5.5752" fill="#00B7DC"/>
    <path d="M27.8773 57.7077H5.5752V61.4307H27.8773V57.7077Z" fill="#00B7DC"/>
    <path d="M27.8773 81.9077H5.5752V85.6308H27.8773V81.9077Z" fill="#00B7DC"/>
    <path d="M5.5753 81.9077H3.7168V85.6308H5.5753V81.9077Z" fill="white"/>
  </svg>
);
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { analyticalEngine, AnalyticalContext } from "@/lib/analytical-engine";
import ChatChart from "./ChatChart";
import { EChartsOption } from "echarts";
import LoggerService from "@/services/LoggerService";

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  chart?: EChartsOption;
  chartTitle?: string;
  chartType?: string;
  fileId?: string; // Track which file generated the chart
}

const FloatingChat = () => {
  const { isChatOpen, setIsChatOpen, selectedDataSourceId, addChartToDashboard } = useAnalytics();
  const [isMinimized, setIsMinimized] = useState(false);
  // ... (keeping existing state hooks) ...
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI analytics assistant. I can help you query your data, generate insights, and create visualizations.\n\n💡 **Tip**: For best results, go to the **Analytics** page and select a data source from the dropdown. Then I'll have full context about your data!\n\nWhat would you like to explore?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [analyticalContext, setAnalyticalContext] = useState<AnalyticalContext | null>(null);

  const [suggestedPrompts, setSuggestedPrompts] = useState<Array<{ text: string, icon: any }>>([]);

  useEffect(() => {
    const generateDynamicPrompts = async () => {
      if (!selectedDataSourceId) {
        setSuggestedPrompts([]);
        setAnalyticalContext(null);
        return;
      }

      try {
        const { data: dataSource, error } = await (supabase as any)
          .from('data_sources')
          .select('schema_info, metadata, name')
          .eq('id', selectedDataSourceId)
          .single();

        if (error || !dataSource) {
          setSuggestedPrompts([]);
          return;
        }

        const schemaInfo = dataSource.schema_info || {};
        const columns = Object.keys(schemaInfo);

        const prompts: Array<{ text: string, icon: any }> = [];

        const numericColumns = columns.filter((col: string) =>
          schemaInfo[col]?.type === 'numeric' ||
          schemaInfo[col]?.data_type === 'number' ||
          ['revenue', 'sales', 'amount', 'price', 'quantity', 'count'].some(keyword =>
            col.toLowerCase().includes(keyword)
          )
        ).slice(0, 3);

        const categoricalColumns = columns.filter((col: string) =>
          schemaInfo[col]?.type === 'categorical' ||
          schemaInfo[col]?.data_type === 'text' ||
          ['category', 'region', 'product', 'customer', 'status', 'type'].some(keyword =>
            col.toLowerCase().includes(keyword)
          )
        ).slice(0, 2);

        if (numericColumns.length > 0 && categoricalColumns.length > 0) {
          prompts.push({
            text: `Show me ${numericColumns[0]} trends by ${categoricalColumns[0]}`,
            icon: TrendingUp,
          });
        }

        if (numericColumns.length > 1) {
          prompts.push({
            text: `What are the top 5 items by ${numericColumns[0]}?`,
            icon: BarChart3,
          });
        }

        if (categoricalColumns.length > 0) {
          prompts.push({
            text: `Compare performance across different ${categoricalColumns[0]}`,
            icon: Database,
          });
        }

        if (prompts.length === 0) {
          prompts.push({
            text: `Analyze trends in ${dataSource.name}`,
            icon: TrendingUp,
          });
          prompts.push({
            text: `What are the key insights from this data?`,
            icon: BarChart3,
          });
          prompts.push({
            text: `Show me the data distribution`,
            icon: Database,
          });
        }

        setSuggestedPrompts(prompts.slice(0, 3));
      } catch (error) {
        console.error('Error generating dynamic prompts:', error);
        setSuggestedPrompts([]);
      }
    };

    generateDynamicPrompts();
  }, [selectedDataSourceId]);

  useEffect(() => {
    if (isChatOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isChatOpen, isMinimized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    // Check for browser support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognitionClass() as SpeechRecognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');

        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

        // Only show errors for critical issues, not for normal interruptions
        if (event.error === 'audio-capture') {
          toast.error("No microphone found. Please check your microphone settings.");
        } else if (event.error === 'not-allowed') {
          toast.error("Microphone permission denied. Please allow microphone access.");
        }
        // Silently handle 'no-speech' and other errors as they're expected when releasing button
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // 0. Check for "Add to Dashboard" Intent
      const lowerInput = userMessage.content.toLowerCase();
      // Expanded regex to catch "add to dashboard", "save in dashboard", "pin this...", etc.
      const isDashboardIntent = /(add|save|pin|put|copy|keep).*(dashboard|board)/i.test(lowerInput) || lowerInput === 'add to dashboard';

      if (isDashboardIntent) {
        // Find the last chart
        const lastChartMessage = [...messages].reverse().find(m => m.role === 'assistant' && m.chart);

        if (lastChartMessage && lastChartMessage.chart) {
          const fileIdToUse = lastChartMessage.fileId;

          if (!fileIdToUse && !selectedDataSourceId) {
            throw new Error("I need to know which data source this chart belongs to. Please select a data source.");
          }

          // Check for session first
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            toast.error("You must be signed in to save to your dashboard");

            const loginMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: "You need to be logged in to save charts. Please sign in or create an account.",
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, loginMsg]);
            setIsLoading(false);
            return;
          }

          const targetFileId = fileIdToUse;

          // Prefer the concise chart title for the dashboard header, fallback to the full insight text
          const dashboardInsight = lastChartMessage.chartTitle || lastChartMessage.content;

          const { error } = await supabase.from('visualizations').insert({
            chart_config: lastChartMessage.chart as any,
            file_id: targetFileId || selectedDataSourceId || '',
            insight: dashboardInsight,
            chart_type: lastChartMessage.chartType || 'custom'
          } as any);

          if (error) {
            LoggerService.error('Chat', 'ADD_TO_DASHBOARD_ERROR', 'Failed to save chart to dashboard', error);
            if (error.message.includes("row-level security")) {
              toast.error("Permission denied. Ensure you are logged in and own this data.");
            } else {
              toast.error("Failed to save chart to dashboard");
            }
            throw new Error("Failed to save to dashboard. " + error.message);
          }

          LoggerService.info('Chat', 'ADD_TO_DASHBOARD', `Added chart "${dashboardInsight}" to dashboard via chat intent`);

          const confirmationMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I've added the chart to your dashboard!",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, confirmationMsg]);
          toast.success("Chart successfully added to dashboard");
          setIsLoading(false);
          return;
        } else {
          const noChartMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I couldn't find a recent chart to add to your dashboard.",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, noChartMsg]);
          setIsLoading(false);
          return;
        }
      }

      // 1. Try Analytical Engine First
      const analyticalResponse = await analyticalEngine.analyzeQuery(userMessage.content, selectedDataSourceId, analyticalContext);

      if (analyticalResponse) {
        if (analyticalResponse.context) {
          setAnalyticalContext(analyticalResponse.context);
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: analyticalResponse.answer,
          timestamp: new Date(),
          chart: analyticalResponse.chart,
          chartTitle: analyticalResponse.chartTitle,
          chartType: analyticalResponse.chartType,
          fileId: analyticalResponse.fileId
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // ... fallback ...
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: userMessage.content,
            dataSourceId: selectedDataSourceId,
          }),
        });

        if (!response.ok) throw new Error('Failed to get response');
        const result = await response.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.answer || 'I received an empty response. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      LoggerService.error('Chat', 'SEND_MESSAGE_ERROR', 'Error processing chat message', error);
      // ... existing error handling ...
      const errorText = error instanceof Error ? error.message : 'Error';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    toast.success(`Feedback ${type === 'up' ? 'sent' : 'recorded'}`);
  };

  const handlePinToDashboard = async (message: Message) => {
    if (!message.chart) {
      toast.error("No chart to pin");
      return;
    }

    try {
      const chartTitle = message.chartTitle || "Chat Generated Chart";
      
      // Add chart to dashboard via context
      addChartToDashboard({
        title: chartTitle,
        option: message.chart,
        rec: {
          title: chartTitle,
          type: message.chartType || 'bar',
          reasoning: message.content,
          priority: 'high'
        }
      });

      LoggerService.info('Chat', 'PIN_CHART', `Pinned chart "${chartTitle}" to dashboard`, { chartTitle, chartType: message.chartType });
      toast.success("Chart pinned to dashboard! Check the Analytics page.");
    } catch (error) {
      LoggerService.error('Chat', 'PIN_CHART_ERROR', 'Failed to pin chart', error);
      toast.error("Failed to pin chart to dashboard");
    }
  };

  const startListening = () => {
    if (!isSpeechSupported) {
      toast.error("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error("Failed to start voice recognition. Please try again.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startListening();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    stopListening();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    startListening();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    stopListening();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="fixed bottom-16 right-10 z-50 flex flex-col items-end gap-4">
      {!isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative p-0 overflow-hidden"
        >
          <div className="relative">
            <LogoIcon size={48} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
            </span>
          </div>
          <div className="absolute right-full mr-3 bg-white text-[#075E54] px-3 py-1.5 rounded-lg text-sm font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with AI
          </div>
        </Button>
      )}

      {isChatOpen && (
        <Card className={`glass-card border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right ${isMinimized ? 'h-16 w-80' : 'h-[550px] w-96'} animate-in fade-in slide-in-from-bottom-5 zoom-in-95`}>
          <div className="bg-gradient-to-r from-[#00D4FF]/20 to-[#6B46C1]/20 border-b border-white/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                <LogoIcon size={40} />
              </div>
              <div>
                <h3 className="font-bold text-white">AI Analytics Chat</h3>
                <p className="text-xs text-[#E5E7EB]/70">Ask questions in natural language</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-[#E5E7EB] hover:text-white hover:bg-white/10 h-8 w-8"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsChatOpen(false)}
                className="text-[#E5E7EB] hover:text-white hover:bg-white/10 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0E27]/50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                        ? 'bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] text-white'
                        : 'bg-white/5 border border-white/10 text-[#E5E7EB]'
                        }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.chart && (
                        <>
                          <ChatChart
                            option={message.chart}
                            title={message.chartTitle}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 w-full text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-lg transition-all"
                            onClick={() => handlePinToDashboard(message)}
                          >
                            <Pin className="w-3 h-3 mr-1.5" />
                            Pin to Dashboard
                          </Button>
                        </>
                      )}

                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#E5E7EB]/70 hover:text-[#00D4FF]"
                            onClick={() => handleFeedback(message.id, 'up')}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#E5E7EB]/70 hover:text-red-400"
                            onClick={() => handleFeedback(message.id, 'down')}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-[#E5E7EB]/70 hover:text-[#00D4FF]"
                            onClick={() => copyMessage(message.content)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B46C1] to-[#9333EA] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">U</span>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6B46C1] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Prompts */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 space-y-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt.text)}
                      className="w-full text-left glass-card p-3 rounded-lg hover:border-[#00D4FF]/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <prompt.icon className="w-4 h-4 text-[#00D4FF]" />
                        </div>
                        <span className="text-sm text-[#E5E7EB] group-hover:text-white transition-colors">
                          {prompt.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-white/10 bg-[#0A0E27]/50">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask me anything about your data..."
                      className="bg-white/5 border-white/20 text-white placeholder:text-[#E5E7EB]/40 focus:border-[#00D4FF] rounded-lg pr-10"
                      disabled={isLoading || isListening}
                    />
                    {isListening && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  {isSpeechSupported && (
                    <Button
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={stopListening}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={handleContextMenu}
                      disabled={isLoading}
                      className={`${isListening
                        ? "bg-red-500 hover:bg-red-600 animate-pulse active:bg-red-700"
                        : "bg-white/10 hover:bg-white/20 border border-white/20 active:bg-white/30"
                        } text-white px-4 rounded-lg transition-all select-none`}
                      title="Hold to speak"
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || isListening}
                    className="bg-gradient-to-r from-[#6B46C1] to-[#9333EA] hover:from-[#6B46C1]/90 hover:to-[#9333EA]/90 text-white px-4 rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {isSpeechSupported && (
                  <p className="text-xs text-[#E5E7EB]/50 mt-2 flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    Hold the microphone button to speak
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default FloatingChat;

