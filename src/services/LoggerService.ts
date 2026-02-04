import { supabase } from "@/integrations/supabase/client";

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  action_type: string;
  module: string;
  message: string;
  metadata?: Record<string, any>;
  level?: LogLevel;
  user_id?: string; // Optional override
  error_stack?: string;
}

class LoggerService {
  private static currentUserId: string | null = null;

  // Initialize auth listener
  static {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUserId = session?.user?.id || null;
    });

    // Listen for changes
    supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUserId = session?.user?.id || null;
    });
  }

  private static async getUser() {
    if (this.currentUserId) return this.currentUserId;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  static async log(entry: LogEntry) {
    // In development, log to console
    if (import.meta.env.DEV) {
      const color = entry.level === 'error' ? 'red' : entry.level === 'warn' ? 'orange' : 'blue';
      console.log(`%c[${entry.module}] ${entry.action_type}: ${entry.message}`, `color: ${color}`, entry.metadata || '');
    }

    try {
      const user_id = entry.user_id || this.currentUserId || await this.getUser();
      const now = new Date();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const log_date = `${year}-${month}-${day}`; // Local YYYY-MM-DD
      
      const log_time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`; // Local HH:MM:SS.mmm

      const payload = {
        user_id,
        log_date,
        log_time,
        timezone,
        level: entry.level || 'info',
        action: entry.action_type,
        module: entry.module,
        message: entry.message,
        metadata: {
            ...entry.metadata,
            userAgent: navigator.userAgent,
            url: window.location.href
        },
        error_stack: entry.error_stack || null
      };

      const { error } = await supabase.from('logs').insert(payload);
      
      if (error) {
        console.error('Failed to write log to Supabase:', error);
      }
    } catch (err) {
      console.error('Critical error in LoggerService:', err);
    }
  }

  static info(module: string, action: string, message: string, metadata?: Record<string, any>) {
    this.log({ 
      level: 'info', 
      module, 
      action_type: action, 
      message, 
      metadata 
    });
  }

  static warn(module: string, action: string, message: string, metadata?: Record<string, any>) {
    this.log({ 
      level: 'warn', 
      module, 
      action_type: action, 
      message, 
      metadata 
    });
  }

  static error(module: string, action: string, message: string, error?: any, metadata?: Record<string, any>) {
    this.log({ 
        level: 'error', 
        module, 
        action_type: action, 
        message, 
        metadata,
        error_stack: error instanceof Error ? error.stack : typeof error === 'string' ? error : JSON.stringify(error)
    });
  }

  static debug(module: string, action: string, message: string, metadata?: Record<string, any>) {
    // Only log debug to console in development, can optionally send to Supabase
    if (import.meta.env.DEV) {
      console.debug(`%c[DEBUG][${module}] ${action}: ${message}`, "color: gray", metadata || '');
    }
    // We send to DB with 'debug' level
    this.log({ 
      level: 'info', // Using info level in DB for debug entries but tagged in message/metadata if needed, or update LogLevel type
      module, 
      action_type: `DEBUG_${action}`, 
      message, 
      metadata 
    });
  }

  static action(module: string, actionName: string, message: string, metadata?: Record<string, any>) {
    // Specialized method for user-initiated actions
    this.log({ 
      level: 'info', 
      module, 
      action_type: actionName, 
      message, 
      metadata: { ...metadata, is_user_action: true } 
    });
  }
}

export default LoggerService;
