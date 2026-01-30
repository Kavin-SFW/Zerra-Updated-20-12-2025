// Shared logger utility for Supabase Edge Functions
import { createClient } from "jsr:@supabase/supabase-js@2";

export class EdgeLogger {
  private supabase: any;
  private userId: string | null = null;

  constructor(supabaseClient: any, userId?: string | null) {
    this.supabase = supabaseClient;
    this.userId = userId || null;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private async writeLog(level: 'info' | 'warn' | 'error', action: string, module: string, message: string, metadata: any = {}, errorStack: string | null = null) {
    try {
      const now = new Date();
      // Format timestamp components for local-like structure (Edge Functions run in UTC usually, but we keep format consistent)
      const log_date = now.toISOString().split('T')[0];
      const log_time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

      const payload = {
        user_id: this.userId,
        log_date,
        log_time,
        timezone: 'UTC', // Edge Functions typically run in UTC
        level,
        action,
        module,
        message,
        metadata: {
            ...metadata,
            source: 'Edge Function'
        },
        error_stack: errorStack
      };

      // Fire and forget log insertion to avoid blocking main execution significantly
      // However, we want to catch errors if logging fails
      const { error } = await this.supabase.from('logs').insert(payload);
      if (error) {
        console.error('EdgeLogger: Failed to write to DB:', error);
      }
    } catch (err) {
      console.error('EdgeLogger: Critical error:', err);
    }
  }

  async info(module: string, action: string, message: string, metadata?: any) {
    console.log(`[INFO] [${module}] ${action}: ${message}`);
    await this.writeLog('info', action, module, message, metadata);
  }

  async warn(module: string, action: string, message: string, metadata?: any) {
    console.warn(`[WARN] [${module}] ${action}: ${message}`);
    await this.writeLog('warn', action, module, message, metadata);
  }

  async error(module: string, action: string, message: string, error?: any, metadata?: any) {
    console.error(`[ERROR] [${module}] ${action}: ${message}`, error);
    const stack = error instanceof Error ? error.stack : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    await this.writeLog('error', action, module, message, metadata, stack);
  }
  
  async action(module: string, action: string, message: string, metadata?: any) {
    console.log(`[ACTION] [${module}] ${action}: ${message}`);
    await this.writeLog('info', action, module, message, { ...metadata, is_user_action: true });
  }
}
