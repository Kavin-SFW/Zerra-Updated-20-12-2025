import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Database, CheckCircle2, AlertCircle, Table as TableIcon, Key, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { mockDataService } from "@/services/MockDataService";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import { supabaseService, ConnectionStatus } from "@/integrations/supabase/supabase-service";

interface DatabaseConnectorProps {
    isOpen: boolean;
    onClose: () => void;
    type: string;
}

// Generate realistic mock data based on industry/type
const generateMockData = (type: string, rowCount = 500) => {
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
    const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Automotive', 'Beauty'];
    const products = [
        ['Laptop', 'Smartphone', 'Tablet', 'Headphones', 'Monitor'],
        ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Dress'],
        ['Sofa', 'Lamp', 'Desk', 'Chair', 'Rug'],
        ['Tires', 'Oil', 'Battery', '', 'Lights'],
        ['Lipstick', 'Perfume', 'Lotion', 'Cream', 'Shampoo']
    ];

    const data = [];
    const now = new Date();

    for (let i = 0; i < rowCount; i++) {
        const date = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
        const catIdx = Math.floor(Math.random() * categories.length);
        const prodIdx = Math.floor(Math.random() * products[catIdx].length);
        const region = regions[Math.floor(Math.random() * regions.length)];
        
        const quantity = Math.floor(Math.random() * 10) + 1;
        const price = Math.floor(Math.random() * 500) + 20;
        const cost = Math.floor(price * (0.4 + Math.random() * 0.3)); // 40-70% of price
        
        data.push({
            id: i + 1,
            date: date.toISOString().split('T')[0],
            category: categories[catIdx],
            product: products[catIdx][prodIdx],
            region: region,
            quantity: quantity,
            unit_price: price,
            total_sales: quantity * price,
            total_cost: quantity * cost,
            profit: (quantity * price) - (quantity * cost),
            customer_satisfaction: Math.floor(Math.random() * 5) + 1,
            is_return: Math.random() < 0.05 ? 'Yes' : 'No'
        });
    }
    return data;
};

// Generate CRM specific data
const generateCrmData = (rowCount = 200) => {
    const statuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const sources = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Partner'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail'];
    
    const data = [];
    const now = new Date();

    for (let i = 0; i < rowCount; i++) {
        const date = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const dealValue = status === 'Closed Lost' ? 0 : Math.floor(Math.random() * 50000) + 5000;
        
        // Map CRM fields to Dashboard expected fields for visualization
        // Deal Value -> Total Sales
        // Status -> Category (to see sales by stage)
        // Source -> Product (to see sales by source)
        
        data.push({
            id: `LEAD-${1000 + i}`,
            date: date.toISOString().split('T')[0],
            category: status, // Mapping Status to Category for charts
            product: sources[Math.floor(Math.random() * sources.length)], // Mapping Source to Product
            region: industries[Math.floor(Math.random() * industries.length)], // Mapping Industry to Region
            quantity: 1,
            unit_price: dealValue,
            total_sales: dealValue,
            total_cost: dealValue * 0.3, // Estimated cost of acquisition
            profit: dealValue * 0.7,
            customer_satisfaction: Math.floor(Math.random() * 5) + 1,
            is_return: 'No',
            // CRM Specific fields (preserved)
            lead_status: status,
            lead_source: sources[Math.floor(Math.random() * sources.length)],
            company_industry: industries[Math.floor(Math.random() * industries.length)]
        });
    }
    return data;
};

export const DatabaseConnector = ({ isOpen, onClose, type }: DatabaseConnectorProps) => {
    const [step, setStep] = useState<'connect' | 'schema' | 'importing'>('connect');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // DB Config
    const [config, setConfig] = useState({
        host: 'localhost',
        port: '5432',
        database: '',
        username: '',
        password: '',
        ssl: false
    });

    // API Config (SFW CRM)
    const [apiConfig, setApiConfig] = useState({
        url: '',
        apiKey: '',
        clientId: ''
    });

    const [connectionName, setConnectionName] = useState("");
    
    const [tables, setTables] = useState<{name: string, rows: number, selected: boolean}[]>([]);

    const navigate = useNavigate();
    const { setSelectedDataSourceId } = useAnalytics();

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep('connect');
            setError(null);
            setLoading(false);
            setTestStatus('idle');
            setConnectionName("");
            
            // Set default tables based on type
            if (type === 'SFW CRM') {
                // Static entities removed per request
                setTables([]);
            } else {
                // Default DB tables
                setTables([
                    { name: 'public.orders', rows: 12500, selected: true },
                    { name: 'public.customers', rows: 840, selected: false },
                    { name: 'public.products', rows: 120, selected: false },
                    { name: 'public.inventory', rows: 3500, selected: false },
                ]);
            }

            // Set default ports
            if (type.includes('Postgre')) setConfig(p => ({ ...p, port: '5432' }));
            else if (type.includes('MySQL')) setConfig(p => ({ ...p, port: '3306' }));
            else if (type.includes('SQL Server')) setConfig(p => ({ ...p, port: '1433' }));
        }
    }, [isOpen, type]);

    const validateInputs = () => {
        if (type === 'SFW CRM') {
            if (!connectionName.trim()) {
                setError("Connection Name is required");
                return false;
            }
            if (!apiConfig.url || !apiConfig.apiKey) {
                setError("Instance URL and API Key are required");
                return false;
            }
        } else {
            if (!config.host || !config.username) {
                setError("Host and Username are required");
                return false;
            }
        }
        return true;
    };

    const getBackendType = (uiType: string) => {
        if (uiType.includes('Postgre')) return 'postgres';
        if (uiType.includes('MySQL')) return 'mysql';
        if (uiType.includes('SQL Server')) return 'mssql';
        if (uiType.includes('Oracle')) return 'oracle';
        if (uiType.includes('MongoDB')) return 'mongodb';
        return 'postgres';
    };

    const checkCredentials = async (): Promise<ConnectionStatus> => {
        if (type === 'SFW CRM') {
            return await supabaseService.testConnection(apiConfig.url, apiConfig.apiKey);
        } else {
            try {
                const dbType = getBackendType(type);
                const backendUrl = 'http://localhost:3005/api/connect';
                console.log(`[DatabaseConnector] Connecting to: ${backendUrl} as ${dbType}`);
                
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
                return { 
                    success: false, 
                    errorType: 'NETWORK', 
                    message: "Failed to reach backend server. Is it running on port 3001?" 
                };
            }
        }
    };

    const handleTest = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        setError(null);
        setTestStatus('testing');

        const result = await checkCredentials();
        setLoading(false);
        
        if (result.success) {
            setTestStatus('success');
            toast.success(result.message || "Test Connection Successful!");
        } else {
            setTestStatus('error');
            
            // Construct a detailed error message
            let displayMessage = result.message;
            if ('details' in result && (result as any).details?.hint) {
                displayMessage += ` ${(result as any).details.hint}`;
            }
            
            setError(displayMessage);
            toast.error(result.message);
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

        const result = await checkCredentials();
        
        if (result.success) {
            // Auto-discover tables
            if (type === 'SFW CRM') {
                console.log('[DatabaseConnector] Attempting to discover tables...');
                const discoveredTables = await supabaseService.fetchAvailableTables(apiConfig.url, apiConfig.apiKey);
                console.log('[DatabaseConnector] Discovered tables:', discoveredTables);
                if (discoveredTables.length > 0) {
                    setTables(discoveredTables.map(t => ({ ...t, selected: true })));
                } else {
                    // If no tables discovered, show empty state with manual input option
                    console.log('[DatabaseConnector] No tables auto-discovered, user can add manually');
                    setTables([]);
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
                         setTables(data.tables.map((t: any) => ({ ...t, selected: false })));
                    }
                } catch (e) {
                    console.error("Failed to fetch tables", e);
                }
            }
            
            setLoading(false);
            setStep('schema');
            toast.success("Connected successfully! Select tables to import.");
        } else {
            setLoading(false);
            setError(result.message || "Connection failed. Please check credentials.");
        }
    };

    const handleImport = async () => {
        const selectedTables = tables.filter(t => t.selected);
        if (selectedTables.length === 0) {
            setError("Please select at least one table to import.");
            return;
        }

        setStep('importing');

        const sourceName = connectionName.trim() || `${type} - ${selectedTables.map(t => t.name).join(', ')}`;

        try {
            let totalRecords = 0;
            let firstDataSourceId: string | null = null;
            let allImportedData: any[] = [];

            // Fetch data from each selected table
            for (const table of selectedTables) {
                let remoteData: any[] = [];

                console.log(`[DatabaseConnector] Fetching data from table: ${table.name}`);

                if (type === 'SFW CRM') {
                    const activeSupabase = supabaseService.createClient(apiConfig.url, apiConfig.apiKey);
                    const { data, error } = await supabaseService.fetchTableData(activeSupabase, table.name);
                    
                    if (error) {
                        console.error(`[DatabaseConnector] Error fetching ${table.name}:`, error);
                        toast.error(`Failed to fetch ${table.name}: ${error}`);
                        continue; // Skip this table but continue with others
                    }
                    
                    remoteData = data || [];
                    console.log(`[DatabaseConnector] Fetched ${remoteData.length} records from ${table.name}`);
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
                        console.error(`[DatabaseConnector] Error fetching ${table.name}:`, resData.message);
                        toast.error(`Failed to fetch ${table.name}: ${resData.message}`);
                        continue;
                    }
                    remoteData = resData.data || [];
                }

                if (remoteData && remoteData.length > 0) {
                    totalRecords += remoteData.length;
                    allImportedData = [...allImportedData, ...remoteData];

                    // --- INTELLIGENT FIELD MAPPING ---
                    // Analyze the first row to determine the best columns for visualization
                    const sampleRow = remoteData[0];
                    const columns = Object.keys(sampleRow);
                    
                    // Find date column
                    const dateCol = columns.find(k => /date|time|created_at|updated_at|timestamp/i.test(k)) || null;
                    
                    // Find metric/numeric column for aggregation
                    const metricCol = columns.find(k => 
                        /amount|price|cost|revenue|sales|total|value|qty|quantity|count|score/i.test(k) && 
                        typeof sampleRow[k] === 'number'
                    ) || columns.find(k => 
                        typeof sampleRow[k] === 'number' && 
                        !/id|code|zip|year|month|day/i.test(k)
                    ) || null;
                    
                    // Find category column for grouping
                    const categoryCol = columns.find(k => 
                        /status|type|category|region|country|source|industry|segment|department|name/i.test(k)
                    ) || columns.find(k => 
                        typeof sampleRow[k] === 'string' && 
                        String(sampleRow[k]).length < 50 && 
                        !/id|url|email|uuid|description|notes|address/i.test(k)
                    ) || null;

                    const mapping = { dateCol, metricCol, categoryCol };
                    console.log(`[DatabaseConnector] Mapping Analysis for ${table.name}:`, mapping);
                    console.log(`[DatabaseConnector] Sample row:`, sampleRow);

                    // Store the fetched data LOCALLY with the mapping metadata
                    const newSource = mockDataService.addSource(
                        selectedTables.length === 1 ? sourceName : `${sourceName} (${table.name})`, 
                        type, 
                        remoteData,
                        mapping,
                        table.name
                    );

                    console.log(`[DatabaseConnector] Created data source: ${newSource.id} with ${remoteData.length} records`);

                    if (!firstDataSourceId) firstDataSourceId = newSource.id;
                }
            }

            if (totalRecords === 0) {
                toast.warning("Connected, but the selected tables appear to be empty. Try a different table name.");
                setStep('schema');
                return;
            }
            
            toast.success(`Successfully imported ${totalRecords} records from ${selectedTables.length} table(s). Generating visualizations...`);
            
            // Set the selected source and navigate to analytics
            if (firstDataSourceId) {
                console.log(`[DatabaseConnector] Setting selected data source: ${firstDataSourceId}`);
                setSelectedDataSourceId(firstDataSourceId);
            }
            
            onClose();
            
            // Navigate to analytics page - the page will auto-generate visualizations
            navigate('/analytics');

        } catch (error: any) {
            console.error('[DatabaseConnector] Import error:', error);
            supabaseService.logError(error, "Import Remote Data");
            toast.error(`Import failed: ${error.message}. Check if the table name is correct and you have access.`);
            setStep('schema'); // Go back to schema step to let them fix table name
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-[#1a1f3a] text-white border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Database className="w-5 h-5 text-[#00D4FF]" />
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
                                {type === 'SFW CRM' ? (
                                    <span className="text-red-400 text-xs ml-1">*</span>
                                ) : (
                                    <span className="text-white/30 text-xs ml-1">(Optional)</span>
                                )}
                            </Label>
                            <Input 
                                value={connectionName}
                                onChange={e => setConnectionName(e.target.value)}
                                className={`bg-white/5 border-white/10 text-white ${type === 'SFW CRM' && !connectionName.trim() ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                placeholder={isApiBased ? "My CRM Prod" : "My Production DB"} 
                                required={type === 'SFW CRM'}
                            />
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
                            /* Standard Database Form */
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Host</Label>
                                        <Input 
                                            value={config.host}
                                            onChange={e => setConfig({ ...config, host: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white" 
                                            placeholder="localhost" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Port</Label>
                                        <Input 
                                            value={config.port}
                                            onChange={e => setConfig({ ...config, port: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white" 
                                            placeholder="5432" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white/70">Database Name</Label>
                                    <Input 
                                        value={config.database}
                                        onChange={e => setConfig({ ...config, database: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white" 
                                        placeholder="my_analytics_db" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Username</Label>
                                        <Input 
                                            value={config.username}
                                            onChange={e => setConfig({ ...config, username: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white" 
                                            placeholder="postgres" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">Password</Label>
                                        <Input 
                                            type="password"
                                            value={config.password}
                                            onChange={e => setConfig({ ...config, password: e.target.value })}
                                            className="bg-white/5 border-white/10 text-white" 
                                            placeholder="••••••••" 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
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
                        )}

                        <DialogFooter className="mt-4 flex sm:justify-between gap-2">
                            <Button variant="ghost" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">Cancel</Button>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleTest} 
                                    variant="outline"
                                    className="border-[#00D4FF]/50 bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 hover:border-[#00D4FF]/70"
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
                        <p className="text-sm text-white/70">Select {type === 'SFW CRM' ? 'entities' : 'tables'} to sync:</p>
                        
                        <div className="border border-white/10 rounded-md overflow-hidden">
                            <div className="bg-white/5 p-2 grid grid-cols-12 text-xs font-bold text-white/70">
                                <div className="col-span-1"></div>
                                <div className="col-span-7">{type === 'SFW CRM' ? 'Entity Name' : 'Table Name'}</div>
                                <div className="col-span-4 text-right">Records (Est.)</div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                                {tables.length === 0 ? (
                                    <div className="p-4 flex flex-col items-center gap-3">
                                        <p className="text-white/50 text-sm text-center">
                                            No tables found or auto-discovery failed. <br/>
                                            Please enter a table name manually.
                                        </p>
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
                                    </div>
                                ) : tables.map((table) => (
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
