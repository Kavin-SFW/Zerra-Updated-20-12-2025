import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DataSources from "./pages/DataSources";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/AuthGuard";
import FloatingChat from "./components/FloatingChat";
import SidebarLayout from "./components/SidebarLayout";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import LoggerService from "./services/LoggerService";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const NavigationTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    LoggerService.info('Navigation', 'PAGE_VIEW', `Navigated to ${location.pathname}`, {
      path: location.pathname,
      search: location.search,
      hash: location.hash
    });
  }, [location]);

  return null;
};

const AuthTracker = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Log auth events
      if (event === 'SIGNED_IN') {
        LoggerService.info('Auth', 'LOGIN', 'User signed in', { 
            userId: session?.user?.id, 
            email: session?.user?.email 
        });
      } else if (event === 'SIGNED_OUT') {
        LoggerService.info('Auth', 'LOGOUT', 'User signed out');
      } else if (event === 'USER_UPDATED') {
        LoggerService.info('Auth', 'USER_UPDATED', 'User account updated');
      } else if (event === 'PASSWORD_RECOVERY') {
        LoggerService.info('Auth', 'PASSWORD_RECOVERY', 'Password recovery initiated');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AnalyticsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <NavigationTracker />
            <AuthTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/data-sources"
                element={
                  <AuthGuard>
                    <SidebarLayout>
                      <DataSources />
                      <FloatingChat />
                    </SidebarLayout>
                  </AuthGuard>
                }
              />
              <Route
                path="/analytics"
                element={
                  <AuthGuard>
                    <SidebarLayout>
                      <Analytics />
                      <FloatingChat />
                    </SidebarLayout>
                  </AuthGuard>
                }
              />
              <Route
                path="/reports"
                element={
                  <AuthGuard>
                    <SidebarLayout>
                      <Reports />
                      <FloatingChat />
                    </SidebarLayout>
                  </AuthGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthGuard>
                    <SidebarLayout>
                      <Settings />
                      <FloatingChat />
                    </SidebarLayout>
                  </AuthGuard>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AnalyticsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
