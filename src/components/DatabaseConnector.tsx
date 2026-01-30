import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Database, CheckCircle2, AlertCircle, Table as TableIcon, Key, Link as LinkIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { mockDataService } from "@/services/MockDataService";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import { supabaseService, ConnectionStatus } from "@/integrations/supabase/supabase-service";
import LoggerService from "@/services/LoggerService";
import odooLogo from "@/assets/logos/odoo.png";
import gccLogo from "@/assets/logos/gcc logo.png";
import postgresLogo from "@/assets/logos/Postgresql_elephant.svg";
import dynamicsLogo from "@/assets/logos/Dynamics-365-logo.jpg";

interface DatabaseConnectorProps {
    isOpen: boolean;
    onClose: () => void;
    type: string;
}

export const DatabaseConnector = ({ isOpen, onClose, type }: DatabaseConnectorProps) => {
    const [step, setStep] = useState<'connect' | 'schema' | 'importing'>('connect');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    // DB Config
    const [config, setConfig] = useState({
        host: import.meta.env.VITE_PGHOST || 'localhost',
        port: import.meta.env.VITE_PGPORT || '5432',
        database: import.meta.env.VITE_PGDATABASE || '',
        username: import.meta.env.VITE_PGUSER || '',
        password: import.meta.env.VITE_PGPASSWORD || '',
        ssl: import.meta.env.VITE_PGSSL === 'true'
    });

    // API Config (SFW CRM)
    const [apiConfig, setApiConfig] = useState({
        url: 'https://flndlrgxxnlhuuusargv.supabase.co',
        apiKey: '',
        clientId: ''
    });

    const [connectionName, setConnectionName] = useState("");
    const [tableSearch, setTableSearch] = useState("");
    
    const [tables, setTables] = useState<{name: string, rows: number, selected: boolean}[]>([]);

    const navigate = useNavigate();
    const { setSelectedDataSourceId, setSelectedIndustryName } = useAnalytics();

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep('connect');
            setError(null);
            setFieldErrors({}); // Reset field errors
            setLoading(false);
            setTestStatus('idle');
            setConnectionName("");
            setTableSearch("");
            setTables([]); // Start with empty tables for all types

            // Set default ports and credentials
            if (type.includes('Postgre') || type === 'GCC' || type === 'Odoo') {
                setConfig({
                    host: 'localhost',
                    port: '5432',
                    database: 'zerra_analytics',
                    username: 'postgres',
                    password: 'password123',
                    ssl: false
                });
            }
            else if (type.includes('MySQL')) {
                setConfig(p => ({ 
                    ...p, 
                    port: '3306',
                    username: 'admin',
                    password: 'password123',
                    database: 'zerra_analytics'
                }));
            }
            else if (type.includes('SQL Server')) {
                setConfig(p => ({ 
                    ...p, 
                    port: '1433',
                    username: 'sa',
                    password: 'Password123!',
                    database: 'zerra_analytics'
                }));
            }
        }
    }, [isOpen, type]);

    const validateInputs = () => {
        const newFieldErrors: Record<string, string> = {};
        let isValid = true;

        if (!connectionName.trim()) {
            newFieldErrors.connectionName = "Connection name is required";
        }

        if (type === 'SFW CRM') {
            if (!apiConfig.url) newFieldErrors.url = "Instance URL is required";
            if (!apiConfig.apiKey) newFieldErrors.apiKey = "API Key is required";
        } else if (type === 'Odoo') {
            if (!config.host.trim()) newFieldErrors.host = "Instance URL is required";
            if (!config.database.trim()) newFieldErrors.database = "Database name is required";
            if (!config.username.trim()) newFieldErrors.username = "Username/Email is required";
            if (!config.password) newFieldErrors.password = "API Key/Password is required";
        } else {
            if (!config.host.trim()) newFieldErrors.host = "Host is required";
            
            if (!config.port) {
                newFieldErrors.port = "Port is required";
            } else if (isNaN(parseInt(config.port))) {
                newFieldErrors.port = "Port must be a number";
            }
            
            if (!config.database.trim()) newFieldErrors.database = "Database name is required";
            if (!config.username.trim()) newFieldErrors.username = "Username is required";
            // Password might be optional for some local configs, but usually required for remote. 
            // We'll leave it optional if empty string is valid for the DB, but warn if missing? 
            // For now, let's assume it's required for GCC.
            if (!config.password) newFieldErrors.password = "Password is required";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            isValid = false;
        }
        else {
            setFieldErrors({});
        }
        return isValid;
    };

    const getBackendType = (uiType: string) => {
        if (uiType === 'GCC') return 'postgres';
        if (uiType === 'Odoo') return 'odoo';
        if (uiType.includes('Postgre')) return 'postgres';
        if (uiType.includes('MySQL')) return 'mysql';
        if (uiType.includes('SQL Server')) return 'mssql';
        if (uiType.includes('Oracle')) return 'oracle';
        if (uiType.includes('MongoDB')) return 'mongodb';
        return 'postgres';
    };

    const handleConnectionStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const connStr = e.target.value;
        try {
            // Basic parsing for postgres://user:pass@host:port/db
            const url = new URL(connStr);
            setConfig({
                host: url.hostname,
                port: url.port || '5432',
                database: url.pathname.replace('/', ''),
                username: url.username,
                password: url.password,
                ssl: true // Assume SSL for URL-based connections usually
            });
        } catch (err) {
            // Invalid URL, just ignore or could show validation state
        }
    };

    const checkCredentials = async (): Promise<ConnectionStatus> => {
        if (type === 'SFW CRM') {
            return await supabaseService.testConnection(apiConfig.url, apiConfig.apiKey);
        } else {
            try {
                const dbType = getBackendType(type);
                const backendUrl = 'http://localhost:3005/api/connect';
                LoggerService.debug('DatabaseConnector', 'HANDSHAKE_ATTEMPT', `Connecting to: ${backendUrl} as ${dbType}`);
                
                const response = await fetch(backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: dbType,
                        host: config.host,
                        port: parseInt(config.port),
                        database: config.database,
                        username: config.username,
                        password: config.password,
                        ssl: config.ssl
                    })
                });

                const data = await response.json();
                if (data.success) {
                    return { success: true, message: "Connection Successful" };
                } else {
                    return { 
                        success: false, 
                        errorType: 'AUTH', 
                        message: data.message || "Connection failed" 
                    };
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error("[DatabaseConnector] Connection Error:", error);
                // Return the raw error message to the user
                return { 
                    success: false, 
                    errorType: 'NETWORK', 
                    message: `Error: ${errorMsg}` 
                };
            }
        }
    };

    const getFriendlyErrorMessage = (errMsg: string) => {
        const msg = errMsg.toLowerCase();
        
        if (msg.includes('password') || msg.includes('authentication failed') || msg.includes('access denied')) {
            return { 
                field: 'password', 
                message: "Authentication Failed: The password or username provided is incorrect." 
            };
        }
        
        if (msg.includes('port') || msg.includes('connection refused') || msg.includes('econnrefused')) {
            return { 
                field: 'port', 
                message: "Port Error: Could not connect on this port. Please ensure the port number is correct and the database is accepting connections." 
            };
        }

        if (msg.includes('getaddrinfo') || msg.includes('enotfound') || msg.includes('connect to host') || msg.includes('network')) {
            return { 
                field: 'host', 
                message: "Host Error: The host address is incorrectly filled or unreachable. Please verify the hostname or IP address." 
            };
        }

        if (msg.includes('database') && (msg.includes('does not exist') || msg.includes('unknown'))) {
            return { 
                field: 'database', 
                message: `Invalid Database: The database '${config.database}' was not found on this server. Please enter the correct database name.` 
            };
        }

        if (msg.includes('ssl') || msg.includes('tls') || msg.includes('certificate')) {
            return { 
                field: 'ssl', 
                message: "SSL/TLS Error: Connection failed due to SSL settings. Try toggling the SSL checkbox." 
            };
        }

        if (msg.includes('timeout')) {
            return { 
                field: 'host', 
                message: "Connection Timed Out: The server at this host is not responding. Check your network or firewall." 
            };
        }

        if (msg.includes('fetch') || msg.includes('failed to fetch')) {
            return { 
                field: 'general', 
                message: "Backend Service Unreachable: Ensure the Zerra Backend server is running (npm run dev)." 
            };
        }

        return { field: 'general', message: `Connection Error: ${errMsg}` };
    };

    const handleTest = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        setError(null);
        setFieldErrors({});
        setTestStatus('testing');
        
        LoggerService.action('DatabaseConnector', 'TEST_CONNECTION_START', `Testing connection to ${type}`, { 
            type, 
            host: config.host,
            database: config.database
        });

        const result = await checkCredentials();
        setLoading(false);
        
        if (result.success) {
            setTestStatus('success');
            toast.success(result.message || "Test Connection Successful!");
            LoggerService.info('DatabaseConnector', 'TEST_CONNECTION_SUCCESS', `Connection test successful for ${type}`);
        } else {
            setTestStatus('error');
            const { field, message } = getFriendlyErrorMessage(result.message);
            
            if (field !== 'general') {
                setFieldErrors({ [field]: message });
            } else {
                setError(message);
            }
            
            toast.error("Connection Failed", { description: message });
            LoggerService.error('DatabaseConnector', 'TEST_CONNECTION_FAILED', message, result.message, { type });
        }
    };

    const handleConnect = async () => {
        if (!validateInputs()) return;

        if (testStatus === 'success' && tables.length > 0) {
            setStep('schema');
            return;
        }

        setLoading(true);
        setError(null);

        LoggerService.action('DatabaseConnector', 'CONNECT_START', `Connecting to ${type}`, { type, host: config.host });

        const result = await checkCredentials();
        
        if (result.success) {
            // Auto-discover tables
            if (type === 'SFW CRM') {
                const discoveredTables = await supabaseService.fetchAvailableTables(apiConfig.url, apiConfig.apiKey);
                if (discoveredTables.length > 0) {
                    setTables(discoveredTables.map(t => ({ ...t, selected: false })));
                }
            } else {
                // Fetch tables from Backend API
                try {
                    const dbType = getBackendType(type);
                    const response = await fetch('http://localhost:3005/api/tables', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: dbType,
                            host: config.host,
                            port: parseInt(config.port),
                            database: config.database,
                            username: config.username,
                            password: config.password,
                            ssl: config.ssl
                        })
                    });
                    const data = await response.json();
                    if (data.success && Array.isArray(data.tables)) {
                         setTables(data.tables.map((t: { name: string; rows: number }) => ({ ...t, selected: false })));
                    } else {
                        throw new Error(data.message || "Failed to retrieve tables");
                    }
                } catch (e: unknown) {
                    const error = e instanceof Error ? e : new Error(String(e));
                    console.error("Failed to fetch tables", error);
                    setLoading(false);
                    const { field, message } = getFriendlyErrorMessage(error.message);
                   if (field !== 'general') {
                        setFieldErrors({ [field]: message });
                    }
                    setError(`Connected, but failed to list tables: ${message}`);
                    LoggerService.error('DatabaseConnector', 'TABLE_FETCH_FAILED', message, error, { type });
                    return;
                }
            }
            
            setLoading(false);
            setStep('schema');
            toast.success("Connected successfully!");
            LoggerService.info('DatabaseConnector', 'CONNECT_SUCCESS', `Connected and fetched tables for ${type}`);
        } else {
            setLoading(false);
            const { field, message } = getFriendlyErrorMessage(result.message);
            if (field !== 'general') {
                setFieldErrors({ [field]: message });
            } else {
                setError(message);
            }
            LoggerService.error('DatabaseConnector', 'CONNECT_FAILED', message, result.message, { type });
        }
    };

    const handleImport = async () => {
        const selectedTables = tables.filter(t => t.selected);
        if (selectedTables.length === 0) {
            setError("Please select at least one table to import.");
            return;
        }

        setStep('importing');
        LoggerService.action('DatabaseConnector', 'IMPORT_START', `Importing ${selectedTables.length} tables from ${type}`, {
            type,
            tables: selectedTables.map(t => t.name)
        });

        const sourceName = connectionName.trim() || `${type} - ${selectedTables.map(t => t.name).join(', ')}`;

        try {
            const { data: { session } } = await defaultSupabase.auth.getSession();
            if (!session) {
                toast.error("You must be logged in to save this connection.");
                setStep('schema');
                LoggerService.warn('DatabaseConnector', 'IMPORT_UNAUTHORIZED', 'Import attempted without session');
                return;
            }

            let totalRecords = 0;
            let firstDataSourceId = null;

            // 2. Fetch data from each selected table
            const createdSources: { id: string; name: string }[] = [];
            
            // Reuse client for SFW CRM
            let activeSupabase: any = null;
            if (type === 'SFW CRM') {
                 activeSupabase = supabaseService.createClient(apiConfig.url, apiConfig.apiKey);
            }

            for (const table of selectedTables) {
                try {
                    let remoteData: Record<string, unknown>[] = [];

                    if (type === 'SFW CRM') {
                        if (!activeSupabase) throw new Error("Supabase client not initialized");
                        
                        const { data, error } = await supabaseService.fetchTableData(activeSupabase, table.name);
                        if (error) {
                            LoggerService.warn('DatabaseConnector', 'TABLE_FETCH_DATA_ERROR', `Failed to fetch data for ${table.name}`, { error });
                            continue; // Skip this table but continue with others
                        }
                        
                        // SFW CRM Specific Preprocessing (Standardizing Schema like Odoo/GCC)
                        if (data && Array.isArray(data)) {
                            remoteData = data.map((row: any) => {
                                const newRow = { ...row };
                                // Normalize columns for CRM Templates to ensure visualization success
                                
                                // 1. Status / Stage
                                if (!newRow.lead_status) {
                                    if (newRow.status) newRow.lead_status = newRow.status;
                                    else if (newRow.stage) newRow.lead_status = newRow.stage;
                                    else if (newRow.pipeline_stage) newRow.lead_status = newRow.pipeline_stage;
                                    // Odoo/GCC compatibility
                                    else if (newRow.Stage) newRow.lead_status = newRow.Stage; 
                                }
                                
                                // 2. Value / Revenue
                                if (!newRow.est_value) {
                                    if (newRow.value) newRow.est_value = newRow.value;
                                    else if (newRow.amount) newRow.est_value = newRow.amount;
                                    else if (newRow.total_value) newRow.est_value = newRow.total_value;
                                    else if (newRow.revenue) newRow.est_value = newRow.revenue;
                                    else if (newRow.expected_revenue) newRow.est_value = newRow.expected_revenue;
                                    // Odoo/GCC compatibility
                                    else if (newRow.Revenue) newRow.est_value = newRow.Revenue;
                                }

                                // 3. Source
                                if (!newRow.lead_source && newRow.source) newRow.lead_source = newRow.source;
                                
                                // 4. Contact Type
                                if (!newRow.contact_type && newRow.type) newRow.contact_type = newRow.type;

                                // 5. Industry (ensure it exists if possible)
                                if (!newRow.industry && newRow.sector) newRow.industry = newRow.sector;

                                return newRow;
                            });
                        } else {
                            remoteData = data || [];
                        }
                    } else {
                        // SQL Backend Fetch
                        const dbType = getBackendType(type);
                        const response = await fetch('http://localhost:3005/api/query', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                config: {
                                    type: dbType,
                                    host: config.host,
                                    port: parseInt(config.port),
                                    database: config.database,
                                    username: config.username,
                                    password: config.password,
                                    ssl: config.ssl
                                },
                                query: `SELECT * FROM ${table.name} LIMIT 1000` 
                            })
                        });
                        const resData = await response.json();
                        if (!resData.success) {
                            LoggerService.warn('DatabaseConnector', 'TABLE_QUERY_ERROR', `Failed to fetch data for ${table.name}`, { message: resData.message });
                            continue;
                        }
                        remoteData = resData.data;

                        // Odoo Specific Processing
                        if (type === 'Odoo' && Array.isArray(remoteData)) {
                            remoteData = remoteData.map((row: Record<string, unknown>) => {
                                const newRow: Record<string, unknown> = { ...row };
                                // Map Odoo fields to friendly names if not already done by adapter
                                if (newRow.stage_id !== undefined) newRow['Stage'] = newRow.stage_id;
                                if (newRow.user_id !== undefined) newRow['Owner'] = newRow.user_id;
                                if (newRow.expected_revenue !== undefined) newRow['Revenue'] = newRow.expected_revenue;
                                return newRow;
                            });
                        }
                    }

                    if (remoteData && remoteData.length > 0) {
                        totalRecords += remoteData.length;

                        // 1. Create Data Source in Supabase
                        // Truncate name if too long
                        const safeSourceName = sourceName.length > 50 ? sourceName.substring(0, 47) + '...' : sourceName;
                        
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const { data: dsData, error: dsError } = await defaultSupabase
                            .from('data_sources' as any)
                            .insert({
                                name: `${safeSourceName} (${table.name})`,
                                type: type,
                                status: 'active',
                                row_count: remoteData.length,
                                created_by: session.user.id,
                                last_synced_at: new Date().toISOString()
                            })
                            .select()
                            .single();

                        if (dsError || !dsData) {
                            LoggerService.error('DatabaseConnector', 'DATA_SOURCE_CREATE_ERROR', `Failed to create data source for ${table.name}`, dsError);
                            continue;
                        }
                        
                        const newSourceId = dsData.id;
                        createdSources.push({ id: newSourceId, name: table.name });

                        // 2. Create Virtual File Record (Required for Analytical Engine)
                        const { data: fileData, error: fileError } = await defaultSupabase
                            .from('uploaded_files')
                            .insert({
                                file_name: `${safeSourceName} (${table.name})`,
                                // file_path: 'virtual://' + newSourceId, // Not in schema
                                file_type: 'database',
                                file_size: JSON.stringify(remoteData).length,
                                user_id: session.user.id
                            })
                            .select()
                            .single();

                        if (fileError || !fileData) {
                             LoggerService.error('DatabaseConnector', 'FILE_RECORD_CREATE_ERROR', `Failed to create file record for ${table.name}`, fileError);
                             continue;
                        }

                        // 3. Insert Records in Batches
                        const BATCH_SIZE = 100;
                        for (let i = 0; i < remoteData.length; i += BATCH_SIZE) {
                            const batch = remoteData.slice(i, i + BATCH_SIZE).map((row: Record<string, unknown>) => ({
                                file_id: fileData.id,
                                row_data: row
                            }));

                            const { error: rowsError } = await defaultSupabase
                                .from('data_records')
                                .insert(batch);
                            
                            if (rowsError) LoggerService.error('DatabaseConnector', 'BATCH_INSERT_ERROR', `Error inserting rows for ${table.name}`, rowsError);
                        }
                    }
                } catch (tableError) {
                    console.error(`Error processing table ${table.name}:`, tableError);
                    LoggerService.error('DatabaseConnector', 'TABLE_PROCESS_ERROR', `Error processing table ${table.name}`, tableError, { type });
                    // Continue to next table
                }
            }

            if (totalRecords === 0) {
                toast.warning("Connected, but the selected tables appear to be empty or failed to sync.");
                LoggerService.warn('DatabaseConnector', 'IMPORT_EMPTY', 'Import finished with 0 records', { type });
            } else {
                toast.success(`Successfully imported ${totalRecords} records from ${createdSources.length} tables.`);
                LoggerService.info('DatabaseConnector', 'IMPORT_SUCCESS', `Successfully imported ${totalRecords} records from ${createdSources.length} tables`, {
                    type,
                    totalRecords,
                    tablesCount: createdSources.length
                });
            }
            
            // 4. Set the selected source and navigate
            if (createdSources.length > 0) {
                // Smart selection logic to pick the best table for visualization
                // Prioritize business objects (Leads, Deals) over logs/settings
                const priorityKeywords = ['lead', 'opportunity', 'deal', 'sale', 'order', 'revenue', 'invoice', 'crm', 'pipeline', 'customer', 'contact', 'company', 'person', 'people', 'entity'];
                const deprioritizeKeywords = ['log', 'history', 'audit', 'setting', 'config', 'preference', 'param', 'meta'];

                let bestSource = createdSources[0];
                let highestScore = -1;

                for (const source of createdSources) {
                    let score = 0;
                    const name = source.name.toLowerCase();

                    // 1. Keyword Match (+10)
                    if (priorityKeywords.some(k => name.includes(k))) score += 10;
                    
                    // 2. "Log" Penalty (-50) - We really don't want logs as default
                    if (deprioritizeKeywords.some(k => name.includes(k))) score -= 50;

                    // 3. Exact/Start Match Bonus (+5)
                    // Prefers "leads" over "my_leads" or "lead_source"
                    if (priorityKeywords.some(k => name === k || name === k + 's' || name.startsWith(k + '_'))) score += 5;

                    // 4. Row Count Bonus (if available in local state tables)
                    // We want the table with data, but not if it's a log
                    const tableInfo = tables.find(t => t.name === source.name);
                    if (tableInfo && tableInfo.rows > 0) {
                         // Small bonus for having data, but content type matters more
                         score += 1; 
                    }

                    if (score > highestScore) {
                        highestScore = score;
                        bestSource = source;
                    }
                }

                LoggerService.info('DatabaseConnector', 'BEST_SOURCE_SELECTED', `Selected best source: ${bestSource.name} (Score: ${highestScore})`, { sourceName: bestSource.name, score: highestScore });
                setSelectedDataSourceId(bestSource.id);

                if (type === 'Odoo') {
                    setSelectedIndustryName('Odoo CRM');
                } else if (type === 'SFW CRM') {
                    setSelectedIndustryName('CRM');
                }
            }
            
            onClose();
            
            // Navigate to analytics page - the page will auto-generate visualizations
            navigate('/analytics');

        } catch (error: unknown) {
            const e = error instanceof Error ? error : new Error(String(error));
            supabaseService.logError(e, "Import Remote Data");
            toast.error(`Import failed: ${e.message}`);
            setStep('schema');
            LoggerService.error('DatabaseConnector', 'IMPORT_CRITICAL_ERROR', e.message, e, { type });
        }
    };

    const toggleTable = (name: string) => {
        setTables(prev => prev.map(t => 
            t.name === name ? { ...t, selected: !t.selected } : t
        ));
    };

    const isApiBased = type === 'SFW CRM' || type === 'Dynamics 365' || type.includes('Cloud');

    const [manualTableInput, setManualTableInput] = useState("");

    const addManualTable = () => {
        if (!manualTableInput.trim()) return;
        setTables(prev => [...prev, {
            name: manualTableInput.trim(),
            rows: 0,
            selected: true
        }]);
        setManualTableInput("");
    };

    const filteredTables = tables.filter(t => 
        t.name.toLowerCase().includes(tableSearch.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-[#1a1f3a] text-white border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {type === 'PostgreSQL' ? (
                            <img src={postgresLogo} alt="PostgreSQL Logo" className="w-5 h-5 object-contain" />
                        ) : type === 'Odoo' ? (
                            <img src={odooLogo} alt="Odoo Logo" className="w-5 h-5 object-contain" />
                        ) : type === 'GCC' ? (
                            <img src={gccLogo} alt="GCC Logo" className="w-5 h-5 object-contain" />
                        ) : type === 'Dynamics 365' ? (
                            <img src={dynamicsLogo} alt="Dynamics 365 Logo" className="w-5 h-5 object-contain" />
                        ) : (
                            <Database className="w-5 h-5 text-[#00D4FF]" />
                        )}
                        Connect to {type}
                    </DialogTitle>
                </DialogHeader>

                {step === 'connect' && (
                    <div className="space-y-4 py-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-white/70">
                                Connection Name 
                                <span className="text-red-400 text-xs ml-1">*</span>
                            </Label>
                            <Input 
                                value={connectionName}
                                onChange={e => {
                                    setConnectionName(e.target.value);
                                    if (fieldErrors.connectionName) setFieldErrors({ ...fieldErrors, connectionName: '' });
                                }}
                                className={`bg-white/5 text-white ${fieldErrors.connectionName ? 'border-red-500/50' : 'border-white/10'}`}
                                placeholder={isApiBased ? "My CRM Prod" : "My Production DB"} 
                            />
                            {fieldErrors.connectionName && <p className="text-xs text-red-400">{fieldErrors.connectionName}</p>}
                        </div>

                        {/* API Config for SFW CRM (Using Supabase credentials manually) */}
                        {isApiBased && type === 'SFW CRM' ? (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-white/70">Supabase Project URL</Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                        <Input 
                                            value={apiConfig.url}
                                            onChange={e => setApiConfig({ ...apiConfig, url: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white pl-10" 
                                            placeholder="https://your-project.supabase.co" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/70">Supabase Anon Key</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                        <Input 
                                            type="password"
                                            value={apiConfig.apiKey}
                                            onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white pl-10" 
                                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                                        />
                                    </div>
                                    <p className="text-xs text-white/40">Enter your project credentials to connect manually</p>
                                </div>
                            </>
                        ) : isApiBased ? (
                            /* Dynamics 365 or other Cloud */
                            <>
                                <div className="space-y-2">
                                    <Label className="text-white/70">Instance URL</Label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                        <Input 
                                            value={apiConfig.url}
                                            onChange={e => setApiConfig({ ...apiConfig, url: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white pl-10" 
                                            placeholder="https://api.dynamics.com" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/70">API Key / Access Token</Label>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                        <Input 
                                            type="password"
                                            value={apiConfig.apiKey}
                                            onChange={e => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white pl-10" 
                                            placeholder="sk_live_..." 
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                                                                                        {/* Standard Database Form - Connection String */}
                                                                                                        {!isApiBased && (
                                                                                                            <div className="space-y-2 pb-2">
                                                                                                                <Label className="text-white/70">Connection String (Optional)</Label>                                                                                        <div className="relative">
                                                                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                                                                            <Input 
                                                                                                onChange={handleConnectionStringChange}
                                                                                                className="bg-white/5 border-white/10 text-white pl-10" 
                                                                                                placeholder="postgresql://user:pass@host:5432/db" 
                                                                                            />
                                                                                        </div>
                                                                                        <p className="text-xs text-white/40">Paste a connection URL to auto-fill the fields below</p>
                                                                                    </div>
                                                                                )}
                                                                                {/* Standard Database Form - Fields */}
                                                                                {!isApiBased && (
                                                                                    <>
                                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                                            <div className="space-y-2">
                                                                                                                                <Label className="text-white/70">
                                                                                                                                    Host <span className="text-red-400">*</span>
                                                                                                                                </Label>
                                                                                                                                <Input 
                                                                                                                                    value={config.host}
                                                                                                                                    onChange={e => {
                                                                                                                                        setConfig({ ...config, host: e.target.value });
                                                                                                                                        if (fieldErrors.host) setFieldErrors({ ...fieldErrors, host: '' });
                                                                                                                                    }}
                                                                                                                                    className={`bg-white/5 text-white ${fieldErrors.host ? 'border-red-500/50' : 'border-white/10'}`}
                                                                                                                                    placeholder="localhost" 
                                                                                                                                />
                                                                                                                                {fieldErrors.host && <p className="text-xs text-red-400">{fieldErrors.host}</p>}
                                                                                                                            </div>                                                                                            
                                                                                            <div className="space-y-2">
                                                                                                <Label className="text-white/70">Port <span className="text-red-400">*</span></Label>
                                                                                                <Input 
                                                                                                    value={config.port}
                                                                                                    onChange={e => {
                                                                                                        setConfig({ ...config, port: e.target.value });
                                                                                                        if (fieldErrors.port) setFieldErrors({ ...fieldErrors, port: '' });
                                                                                                    }}
                                                                                                    className={`bg-white/5 text-white ${fieldErrors.port ? 'border-red-500/50' : 'border-white/10'}`}
                                                                                                    placeholder="5432" 
                                                                                                />
                                                                                                {fieldErrors.port && <p className="text-xs text-red-400">{fieldErrors.port}</p>}
                                                                                            </div>
                                                                                        </div>
                                                        
                                                                                        <div className="space-y-2">
                                                                                            <Label className="text-white/70">
                                                                                                Database Name <span className="text-red-400">*</span>
                                                                                            </Label>
                                                                                            <Input 
                                                                                                value={config.database}
                                                                                                onChange={e => {
                                                                                                    setConfig({ ...config, database: e.target.value });
                                                                                                    if (fieldErrors.database) setFieldErrors({ ...fieldErrors, database: '' });
                                                                                                }}
                                                                                                className={`bg-white/5 text-white ${fieldErrors.database ? 'border-red-500/50' : 'border-white/10'}`}
                                                                                                placeholder="my_analytics_db" 
                                                                                            />
                                                                                            {fieldErrors.database && <p className="text-xs text-red-400">{fieldErrors.database}</p>}
                                                                                        </div>
                                                        
                                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                                            <div className="space-y-2">
                                                                                                                                <Label className="text-white/70">
                                                                                                                                    Username <span className="text-red-400">*</span>
                                                                                                                                </Label>
                                                                                                                                <Input 
                                                                                                                                    value={config.username}
                                                                                                                                    onChange={e => {
                                                                                                                                        setConfig({ ...config, username: e.target.value });
                                                                                                                                        if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: '' });
                                                                                                                                    }}
                                                                                                                                    className={`bg-white/5 text-white ${fieldErrors.username ? 'border-red-500/50' : 'border-white/10'}`}
                                                                                                                                    placeholder="postgres" 
                                                                                                                                />
                                                                                                                                {fieldErrors.username && <p className="text-xs text-red-400">{fieldErrors.username}</p>}
                                                                                                                            </div>
                                                                                                                            <div className="space-y-2">
                                                                                                                                <Label className="text-white/70">
                                                                                                                                    Password <span className="text-red-400">*</span>
                                                                                                                                </Label>
                                                                                                                                <Input 
                                                                                                                                    type="password"
                                                                                                                                    value={config.password}
                                                                                                                                    onChange={e => {
                                                                                                                                        setConfig({ ...config, password: e.target.value });
                                                                                                                                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                                                                                                                                    }}
                                                                                                                                    className={`bg-white/5 text-white ${fieldErrors.password ? 'border-red-500/50' : 'border-white/10'}`}
                                                                                                                                    placeholder="••••••••" 
                                                                                                                                />
                                                                                                                                {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
                                                                                                                            </div>
                                                                                                                        </div>                                                                <div className="flex items-center space-x-2 pt-2">
                                                                    <Checkbox 
                                                                        id="ssl" 
                                                                        checked={config.ssl} 
                                                                        onCheckedChange={(checked) => setConfig({ ...config, ssl: checked as boolean })}
                                                                        className="border-white/30 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                                                                    />
                                                                    <Label htmlFor="ssl" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/70">
                                                                        Enable SSL/TLS Connection
                                                                    </Label>
                                                                </div>
                                                            </>
                                                        )}                            </>
                        )}

                        <DialogFooter className="mt-4 flex sm:justify-between gap-2">
                            <Button variant="ghost" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">Cancel</Button>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleTest} 
                                    variant="outline"
                                    className="bg-white/5 border-white/20 text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:text-[#00D4FF]"
                                    disabled={loading || testStatus === 'testing'}
                                >
                                    {testStatus === 'testing' ? 'Handshaking...' : 'Test Handshake'}
                                </Button>
                                <Button 
                                    onClick={handleConnect} 
                                    disabled={loading || testStatus === 'testing'}
                                    className="bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-black"
                                >
                                    {loading ? 'Connecting...' : 'Connect'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                )}

                {step === 'schema' && (
                    <div className="space-y-4 py-4">
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-md text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Successfully connected to {type === 'SFW CRM' ? 'SFW CRM Instance' : config.database}
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-white/70">Select {type === 'SFW CRM' ? 'entities' : 'tables'} to sync:</p>
                            <div className="relative w-1/2">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50" />
                                <Input 
                                    placeholder="Search tables..." 
                                    value={tableSearch}
                                    onChange={(e) => setTableSearch(e.target.value)}
                                    className="h-8 pl-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-[#00D4FF]"
                                />
                            </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-md overflow-hidden">
                            <div className="bg-white/5 p-2 grid grid-cols-12 text-xs font-bold text-white/70">
                                <div className="col-span-1"></div>
                                <div className="col-span-7">{type === 'SFW CRM' ? 'Entity Name' : 'Table Name'}</div>
                                <div className="col-span-4 text-right">Records (Est.)</div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                                {filteredTables.length === 0 ? (
                                    <div className="p-4 flex flex-col items-center gap-3">
                                        <p className="text-white/50 text-sm text-center">
                                            {tables.length === 0 
                                                ? "No tables found or auto-discovery failed." 
                                                : "No matching tables found."}
                                            <br/>
                                            {tables.length === 0 && "Please enter a table name manually."}
                                        </p>
                                        {tables.length === 0 && (
                                            <div className="flex w-full gap-2">
                                                <Input 
                                                    value={manualTableInput}
                                                    onChange={(e) => setManualTableInput(e.target.value)}
                                                    placeholder="e.g. public.users"
                                                    className="h-8 text-sm bg-white/5 border-white/10"
                                                    onKeyDown={(e) => e.key === 'Enter' && addManualTable()}
                                                />
                                                <Button 
                                                    size="sm" 
                                                    onClick={addManualTable}
                                                    disabled={!manualTableInput.trim()}
                                                    className="h-8 bg-[#00D4FF]/20 text-[#00D4FF] hover:bg-[#00D4FF]/30 border border-[#00D4FF]/30"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : filteredTables.map((table) => (
                                    <div 
                                        key={table.name} 
                                        className="grid grid-cols-12 p-3 border-t border-white/5 hover:bg-white/5 items-center cursor-pointer transition-colors"
                                        onClick={() => toggleTable(table.name)}
                                    >
                                        <div className="col-span-1 flex items-center justify-center">
                                            <Checkbox 
                                                checked={table.selected} 
                                                onCheckedChange={() => toggleTable(table.name)}
                                                className="border-white/30 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                                            />
                                        </div>
                                        <div className="col-span-7 flex items-center gap-2 text-sm text-white">
                                            <TableIcon className="w-3.5 h-3.5 text-white/50" />
                                            {table.name}
                                        </div>
                                        <div className="col-span-4 text-right text-xs text-white/50">
                                            {table.rows.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button variant="ghost" onClick={() => setStep('connect')} className="text-white/70 hover:text-white hover:bg-white/10">Back</Button>
                            <Button 
                                onClick={handleImport} 
                                className="bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-black"
                            >
                                Import Selected Data
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === 'importing' && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-[#00D4FF] animate-spin" />
                        <div>
                            <h3 className="text-lg font-bold text-white">Syncing Data...</h3>
                            <p className="text-white/50 text-sm">Mapping {type} schema to Zerra Analytics Engine</p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
