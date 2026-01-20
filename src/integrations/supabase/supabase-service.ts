import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

export type ConnectionStatus = 
    | { success: true; message: string }
    | { success: false; errorType: 'AUTH' | 'NETWORK' | 'SCHEMA' | 'UNKNOWN'; message: string; details?: any };

export class SupabaseService {
    private static instance: SupabaseService;

    private constructor() {}

    public static getInstance(): SupabaseService {
        if (!SupabaseService.instance) {
            SupabaseService.instance = new SupabaseService();
        }
        return SupabaseService.instance;
    }

    public createClient(url: string, key: string): SupabaseClient {
        try {
            return createClient(url, key, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
        } catch (error: any) {
            this.logError(error, "Client Creation");
            throw error;
        }
    }

    public logError(error: any, context: string) {
        console.group(`[Supabase Error] ${context}`);
        console.error(error);
        console.groupEnd();
    }

    /**
     * REALTIME SUBSCRIPTION (ADDED)
     */
    public subscribeToTable(
        client: SupabaseClient,
        table: string,
        callback: (payload: {
            eventType: 'INSERT' | 'UPDATE' | 'DELETE';
            new: any;
            old: any;
        }) => void
    ): () => void {
        const channel: RealtimeChannel = client
            .channel(`realtime:${table}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                (payload) => {
                    callback({
                        eventType: payload.eventType as any,
                        new: payload.new,
                        old: payload.old
                    });
                }
            )
            .subscribe();

        return () => {
            client.removeChannel(channel);
        };
    }

    public async testConnection(url: string, key: string): Promise<ConnectionStatus> {
        try {
            const response = await fetch(`${url}/rest/v1/`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` }
            });

            if (response.ok) return { success: true, message: "Connection successful." };

            return {
                success: false,
                errorType: response.status === 401 ? 'AUTH' : 'NETWORK',
                message: response.statusText
            };
        } catch (e: any) {
            return { success: false, errorType: 'UNKNOWN', message: e.message };
        }
    }

    public async fetchAvailableTables(url: string, key: string) {
        try {
            const res = await fetch(`${url}/rest/v1/`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` }
            });
            if (!res.ok) return [];
            const spec = await res.json();
            return Object.keys(spec.definitions || {}).map(name => ({ name, rows: 0 }));
        } catch {
            return [];
        }
    }

    public async fetchTableData(client: SupabaseClient, table: string, limit = 1000) {
        try {
            const { data, error } = await client.from(table).select('*').limit(limit);
            if (error) throw error;
            return { data, error: null };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    }
}

export const supabaseService = SupabaseService.getInstance();
