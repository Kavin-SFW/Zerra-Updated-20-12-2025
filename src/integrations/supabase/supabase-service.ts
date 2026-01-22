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
            // First, try to get tables from the information_schema via RPC or direct query
            // Supabase exposes table info through the PostgREST OpenAPI spec
            const res = await fetch(`${url}/rest/v1/`, {
                headers: { 
                    apikey: key, 
                    Authorization: `Bearer ${key}`,
                    'Accept': 'application/openapi+json'
                }
            });
            
            if (!res.ok) {
                console.warn('[SupabaseService] Failed to fetch OpenAPI spec:', res.status);
                return [];
            }
            
            const spec = await res.json();
            
            // Extract table names from OpenAPI paths (each path like /tablename is a table)
            const tableNames: string[] = [];
            
            if (spec.paths) {
                // OpenAPI spec exposes tables as paths
                Object.keys(spec.paths).forEach(path => {
                    // Paths are like "/tablename" - extract the table name
                    const tableName = path.replace(/^\//, '').split('/')[0];
                    if (tableName && !tableName.startsWith('rpc/') && tableName !== '') {
                        // Avoid duplicates
                        if (!tableNames.includes(tableName)) {
                            tableNames.push(tableName);
                        }
                    }
                });
            } else if (spec.definitions) {
                // Fallback to definitions if paths not available
                Object.keys(spec.definitions).forEach(name => {
                    if (!name.startsWith('_')) {
                        tableNames.push(name);
                    }
                });
            }
            
            // Now fetch actual row counts for each table
            const tables: { name: string; rows: number }[] = [];
            const client = this.createClient(url, key);
            
            for (const tableName of tableNames) {
                try {
                    // Use count query to get actual row count
                    const { count, error } = await client
                        .from(tableName)
                        .select('*', { count: 'exact', head: true });
                    
                    tables.push({ 
                        name: tableName, 
                        rows: error ? 0 : (count || 0) 
                    });
                } catch {
                    tables.push({ name: tableName, rows: 0 });
                }
            }
            
            // Sort tables by row count (descending) so tables with data appear first
            tables.sort((a, b) => b.rows - a.rows);
            
            console.log('[SupabaseService] Discovered tables with counts:', tables);
            return tables;
        } catch (error) {
            console.error('[SupabaseService] Error fetching tables:', error);
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
