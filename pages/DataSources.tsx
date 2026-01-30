import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Search, MoreVertical, Database, FileSpreadsheet,
  CheckCircle2, RefreshCw, AlertCircle, Plus,
  Server, Cloud, Loader2, Trash2, X, Check, Square, CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { DatabaseConnector } from "@/components/DatabaseConnector";
import { mockDataService } from "@/services/MockDataService";
import { supabaseService } from "@/integrations/supabase/supabase-service";
import LoggerService from "@/services/LoggerService";
import odooLogo from "@/assets/logos/odoo.png";
import gccLogo from "@/assets/logos/gcc logo.png";
import postgresLogo from "@/assets/logos/Postgresql_elephant.svg";
import sqlServerLogo from "@/assets/logos/microsoft-sql-server-1.svg";
import mysqlLogo from "@/assets/logos/Mysql_logo.png";
import oracleLogo from "@/assets/logos/oracle-logo.svg";
import mongodbLogo from "@/assets/logos/mongodb.png";
import sapLogo from "@/assets/logos/sap.png";
import dynamicsLogo from "@/assets/logos/Dynamics-365-logo.jpg";

type DataSourceStatus = "active" | "syncing" | "error" | "inactive";

interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: React.ComponentType<any>;
  records: string;
  lastSync: string;
  status: DataSourceStatus;
  created_at?: string;
  row_count?: number;
  last_synced_at?: string;
  is_mock?: boolean;
}

interface QuickConnectSource {
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  image?: string;
}

const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12'
];

const ALLOWED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const DataSources = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [connectorType, setConnectorType] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const {
    selectedDataSourceId,
    setSelectedDataSourceId,
  } = useAnalytics();

  // Fetch real data sources from Supabase
  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Mock Sources
      const mockSources = mockDataService.getSources().map(s => mapSourceToDisplay(s));

      // 2. Fetch Supabase Sources
      const { data: { session } } = await supabase.auth.getSession();
      
      let supabaseSources: DataSource[] = [];
      if (session) {
         const { data: sources, error: sourcesError }: { data: any[] | null, error: any } = await (supabase as any)
          .from('data_sources')
          .select('id, name, type, status, row_count, last_synced_at, created_at')
          .eq('created_by', session.user.id)
          .order('created_at', { ascending: false });

          if (!sourcesError && sources) {
             supabaseSources = sources.map(s => mapSourceToDisplay(s));
          }
      }

      // Merge and Sort
      const allSources = [...mockSources, ...supabaseSources].sort((a, b) => {
         // Sort by created_at desc
         const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return dateB - dateA;
      });

      setDataSources(allSources);
    } catch (error) {
      LoggerService.error('DataSources', 'FETCH_SOURCES_ERROR', 'Error fetching data sources', error);
      // Still show mock sources if DB fails
      const mockSources = mockDataService.getSources().map(s => mapSourceToDisplay(s));
      setDataSources(mockSources);
    } finally {
      setLoading(false);
    }
  };

  const mapSourceToDisplay = (source: any): DataSource => {
      // Determine icon based on type
      let icon = Database;
      if (source.type?.toLowerCase().includes('excel') || source.type?.toLowerCase().includes('csv') || source.type?.toLowerCase().includes('xlsx')) {
        icon = FileSpreadsheet;
      } else if (source.type?.toLowerCase().includes('sap')) {
        icon = Server;
      } else if (source.type?.toLowerCase().includes('cloud') || source.type?.toLowerCase().includes('dynamics')) {
        icon = Cloud;
      }

      // Format row count
      const rowCount = source.row_count || 0;
      let recordsText = `${rowCount.toLocaleString()} records`;
      if (rowCount >= 1000000) {
        recordsText = `${(rowCount / 1000000).toFixed(1)}M records`;
      } else if (rowCount >= 1000) {
        recordsText = `${(rowCount / 1000).toFixed(1)}K records`;
      }

      // Format last sync time as date and time stamp
      let lastSync = 'Never';
      const formatDateTime = (date: Date) => {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) + ' at ' + date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      if (source.last_synced_at) {
        const syncDate = new Date(source.last_synced_at);
        lastSync = formatDateTime(syncDate);
      } else if (source.created_at) {
        const createdDate = new Date(source.created_at);
        lastSync = formatDateTime(createdDate);
      }

      return {
        id: source.id,
        name: source.name || 'Unnamed Source',
        type: source.type || 'Unknown',
        icon,
        records: recordsText,
        lastSync,
        status: (source.status as "active" | "syncing" | "error" | "inactive") || 'inactive',
        is_mock: source.is_mock,
        created_at: source.created_at
      };
  };

  const handleOpenConnector = (type: string) => {
      setConnectorType(type);
      setConnectorOpen(true);
  };

  const quickConnectSources: QuickConnectSource[] = [
    { name: "PostgreSQL", icon: Database, color: "from-blue-500 to-blue-600", image: postgresLogo },
    { name: "MySQL", icon: Database, color: "from-orange-500 to-orange-600", image: mysqlLogo },
    { name: "SQL Server", icon: Database, color: "from-red-500 to-red-600", image: sqlServerLogo },
    { name: "Oracle", icon: Server, color: "from-red-500 to-red-600", image: oracleLogo },
    { name: "MongoDB", icon: Database, color: "from-green-500 to-green-600", image: mongodbLogo },
    { name: "SAP", icon: Server, color: "from-yellow-500 to-yellow-600", image: sapLogo },
    { name: "Dynamics 365", icon: Cloud, color: "from-purple-500 to-purple-600", image: dynamicsLogo },
    { name: "SFW CRM", icon: Database, color: "from-emerald-500 to-emerald-600" },
    { name: "Odoo", icon: Database, color: "from-white-500 to-white-500", image: odooLogo },
    { name: "GCC", icon: Cloud, color: "from-indigo-500 to-indigo-600", image: gccLogo },
  ];

  const filteredSources = dataSources.filter((source) => {
    return source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "syncing":
        return (
          <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const convertXlsxToCsv = async (file: File): Promise<File> => {
    const toastId = `converting-${file.name}`;
    try {
      toast.loading(`Converting ${file.name} to CSV...`, { id: toastId });

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      // Create a new file with .csv extension
      const csvFile = new File([csv], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), {
        type: 'text/csv',
      });

      toast.success(`Successfully converted to ${csvFile.name}`, { id: toastId });
      return csvFile;

    } catch (error) {
      console.error('Error converting XLSX to CSV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      toast.error(`Failed to convert ${file.name}: ${errorMessage}`, {
        id: toastId,
        duration: 5000
      });
      throw error; // Re-throw to allow handleFileUpload to handle the error
    }
  };

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!ALLOWED_FILE_TYPES.includes(file.type) &&
      !ALLOWED_FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return {
        isValid: false,
        error: `Invalid file type. Please upload a CSV or Excel file.`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`
      };
    }

    return { isValid: true };
  };

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    const file = files[0];
    const validation = validateFile(file);

    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    LoggerService.action('DataSources', 'UPLOAD_START', `Starting upload of ${file.name}`, { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to upload files.");
        LoggerService.warn('DataSources', 'UPLOAD_UNAUTHORIZED', 'Upload attempted without session');
        return;
      }

      // Convert XLS/XLSX to CSV if needed
      const isExcelFile = file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls') ||
        file.type.includes('spreadsheetml') ||
        file.type.includes('excel');

      const fileToUpload = isExcelFile ? await convertXlsxToCsv(file) : file;

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const uploadToast = toast.loading("Uploading and processing file...", {
        id: `upload-${Date.now()}`,
        duration: Infinity
      });

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-file`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLIC_KEY || '',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'File processing failed';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();

        toast.success(`File processed successfully! ${result.rows_count || 0} rows analyzed.`, {
          id: uploadToast,
          duration: 5000
        });

        LoggerService.info('DataSources', 'UPLOAD_SUCCESS', `Successfully uploaded and processed ${file.name}`, {
          fileName: file.name,
          rowCount: result.rows_count,
          dataSourceId: result.data_source_id
        });

        // Set the newly created data source ID and navigate to analytics
        if (result.data_source_id) {
          setSelectedDataSourceId(result.data_source_id);
          setTimeout(() => {
            navigate('/analytics');
          }, 1500);
        } else {
          // Refresh the data sources list if we don't navigate
          await fetchDataSources();
        }
      } catch (error: any) {
        console.error('Error uploading file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.';
        toast.error(errorMessage, {
          id: uploadToast,
          icon: <X className="w-5 h-5 text-red-500" />,
          duration: 5000
        });
        LoggerService.error('DataSources', 'UPLOAD_FAILED', errorMessage, error, { fileName: file.name });
      }
    } catch (error: any) {
      console.error('Error in file upload:', error);
      toast.error('An unexpected error occurred');
      LoggerService.error('DataSources', 'UPLOAD_CRITICAL_ERROR', error.message, error, { fileName: file.name });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files));
    }
  };

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSources.size === filteredSources.length) {
      setSelectedSources(new Set());
    } else {
      setSelectedSources(new Set(filteredSources.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSources.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedSources.size} data source${selectedSources.size > 1 ? 's' : ''}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    const toastId = toast.loading(`Deleting ${selectedSources.size} source${selectedSources.size > 1 ? 's' : ''}...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let deletedCount = 0;
      let errorCount = 0;

      for (const sourceId of selectedSources) {
        const source = dataSources.find(s => s.id === sourceId);
        if (!source) continue;

        try {
          if (source.is_mock) {
            mockDataService.deleteSource(sourceId);
            deletedCount++;
          } else if (session) {
            const { error } = await supabase
              .from('data_sources')
              .delete()
              .eq('id', sourceId);

            if (error) {
              console.error(`Failed to delete source ${sourceId}:`, error);
              errorCount++;
            } else {
              deletedCount++;
            }
          }

          // Clear selected data source if it was deleted
          if (selectedDataSourceId === sourceId) {
            setSelectedDataSourceId(null);
          }
        } catch (error) {
          console.error(`Error deleting source ${sourceId}:`, error);
          errorCount++;
        }
      }

      // Clear selection and exit selection mode
      setSelectedSources(new Set());
      setIsSelectionMode(false);

      // Refresh the list
      await fetchDataSources();

      // Show result toast
      toast.dismiss(toastId);
      if (errorCount === 0) {
        toast.success(`Successfully deleted ${deletedCount} data source${deletedCount > 1 ? 's' : ''}`);
        LoggerService.info('DataSources', 'BULK_DELETE_SUCCESS', `Deleted ${deletedCount} sources`);
      } else {
        toast.warning(`Deleted ${deletedCount} source${deletedCount > 1 ? 's' : ''}, ${errorCount} failed`);
        LoggerService.warn('DataSources', 'BULK_DELETE_PARTIAL', `Deleted ${deletedCount}, Failed ${errorCount}`, { errorCount, deletedCount });
      }
    } catch (error) {
      LoggerService.error('DataSources', 'BULK_DELETE_ERROR', 'Failed to delete sources', error);
      toast.error('Failed to delete sources', { id: toastId });
    }
  };

  const cancelSelection = () => {
    setSelectedSources(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Data <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">Sources</span>
            </h1>
            <p className="text-[#E5E7EB]/70 text-lg">Connect and manage your data sources</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              className="bg-gradient-to-r from-[#6B46C1] to-[#9333EA] hover:from-[#6B46C1]/90 hover:to-[#9333EA]/90 text-white px-6 py-6 rounded-lg shadow-[0_0_20px_rgba(107,70,193,0.3)] hover:shadow-[0_0_30px_rgba(107,70,193,0.5)] transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Connection
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="glass-card p-8 border-white/10">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isDragging
              ? "border-[#00D4FF] bg-[#00D4FF]/10"
              : uploading
                ? "border-[#00D4FF] bg-[#00D4FF]/5"
                : "border-[#00D4FF]/30 hover:border-[#00D4FF]/50 cursor-pointer"
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!uploading ? handleBrowseClick : undefined}
            role="button"
            tabIndex={uploading ? -1 : 0}
            onKeyDown={(e) => {
              if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleBrowseClick();
              }
            }}
          >
            <div className="flex flex-col items-center gap-4">
              {uploading ? (
                <>
                  <Loader2 className="w-16 h-16 text-[#00D4FF] animate-spin" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Processing File...</h3>
                    <p className="text-[#E5E7EB]/70">Please wait while we process your data</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#00D4FF]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload Data Files</h3>
                    <p className="text-[#E5E7EB]/70 mb-1">
                      Drag and drop Excel or CSV files, or{" "}
                      <span className="text-[#00D4FF] hover:underline">
                        click here to browse
                      </span>
                    </p>
                    <p className="text-sm text-[#E5E7EB]/50">Maximum file size: 100MB</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInputChange}
            disabled={uploading}
          />
        </Card>

        {/* Quick Connect Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white">Quick Connect</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickConnectSources.map((source) => (
              <button
                key={source.name}
                onClick={() => handleOpenConnector(source.name)}
                className="glass-card p-6 rounded-xl hover:scale-105 hover:border-[#00D4FF]/50 transition-all group text-center"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${source.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {source.image ? (
                     <img src={source.image} alt={source.name} className="w-8 h-8 object-contain" />
                  ) : (
                     <source.icon className="text-white" size={24} />
                  )}
                </div>
                <p className="text-sm font-medium text-white">{source.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Connected Sources */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Connected Sources</h2>
              {filteredSources.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isSelectionMode) {
                      cancelSelection();
                    } else {
                      setIsSelectionMode(true);
                    }
                  }}
                  className={`text-sm ${isSelectionMode ? 'text-[#00D4FF] bg-[#00D4FF]/10' : 'text-[#E5E7EB]/70 hover:text-white'}`}
                >
                  {isSelectionMode ? (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Select
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Selection Actions */}
              {isSelectionMode && (
                <div className="flex items-center gap-2 mr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-[#E5E7EB]/70 hover:text-white text-sm"
                  >
                    {selectedSources.size === filteredSources.length ? (
                      <>
                        <Square className="w-4 h-4 mr-1" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Select All ({filteredSources.length})
                      </>
                    )}
                  </Button>
                  {selectedSources.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete ({selectedSources.size})
                    </Button>
                  )}
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#E5E7EB]/50" />
                <Input
                  type="text"
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-[#E5E7EB]/40 focus:border-[#00D4FF] pl-10 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <Card className="glass-card p-12 text-center border-white/10">
                <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin mx-auto mb-4" />
                <p className="text-[#E5E7EB]/70">Loading data sources...</p>
              </Card>
            ) : filteredSources.length === 0 ? (
              <Card className="glass-card p-12 text-center border-white/10">
                <Database className="w-16 h-16 text-[#E5E7EB]/30 mx-auto mb-4" />
                <p className="text-[#E5E7EB]/70 mb-2">
                  {searchQuery ? `No sources found matching "${searchQuery}"` : 'No data sources connected yet'}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-[#E5E7EB]/50">Upload a file to get started</p>
                )}
              </Card>
            ) : (
              filteredSources.map((source) => (
                <Card
                  key={source.id}
                  className={`glass-card p-6 border-white/10 hover:border-[#00D4FF]/30 transition-all ${
                    selectedSources.has(source.id) ? 'border-[#00D4FF]/50 bg-[#00D4FF]/5' : ''
                  } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                  onClick={isSelectionMode ? () => toggleSourceSelection(source.id) : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceSelection(source.id);
                          }}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            selectedSources.has(source.id)
                              ? 'bg-[#00D4FF] border-[#00D4FF]'
                              : 'border-white/30 hover:border-[#00D4FF]/50'
                          }`}
                        >
                          {selectedSources.has(source.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      )}

                      {/* Icon */}
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#6B46C1]/20 flex items-center justify-center">
                        <source.icon className="text-[#00D4FF]" size={24} />
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{source.name}</h3>
                          <Badge className="bg-white/10 text-[#E5E7EB] border-white/20">
                            {source.type}
                          </Badge>
                          {getStatusBadge(source.status)}
                          {source.is_mock && <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">Demo</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#E5E7EB]/70">
                          <span>{source.records}</span>
                          <span>•</span>
                          <span>{source.lastSync}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isSelectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#E5E7EB]/70 hover:text-white hover:bg-white/10"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1a1f3a] border-white/10 text-white"
                      >
                        <DropdownMenuItem
                          className="hover:bg-white/10"
                          onClick={async () => {
                            const isLocal = mockDataService.getSources().some(s => s.id === source.id);
                            if (isLocal) {
                                if (source.type === 'SFW CRM') {
                                    const toastId = toast.loading("Syncing with SFW CRM...");
                                    try {
                                        // Attempt to find the specific table name from the source metadata, fallback to 'leads'
                                        const mockSource = mockDataService.getSources().find(s => s.id === source.id);
                                        const tableName = mockSource?.tableName || 'leads';
                                        
                                        const { data, error } = await supabaseService.fetchTableData(supabase, tableName);
                                        if (error) throw error;
                                        
                                        if (data) {
                                            mockDataService.updateSourceData(source.id, data);
                                            toast.dismiss(toastId);
                                            toast.success(`Synced ${data.length} records from SFW CRM (${tableName})`);
                                            fetchDataSources();
                                        }
                                    } catch (e: any) {
                                        console.error(e);
                                        toast.dismiss(toastId);
                                        toast.error(`Failed to sync SFW CRM: ${e.message || 'Unknown error'}`);
                                    }
                                    return;
                                }
                                
                                if (!source.is_mock) {
                                    toast.info("To refresh this data, please create a new connection.", {
                                        description: "We do not store your database credentials for security."
                                    });
                                    return;
                                }

                                toast.success("Mock data synced");
                                return;
                            }
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              if (!session) return;

                              const { error } = await supabase
                                .from('data_sources')
                                .update({
                                  status: 'syncing',
                                  last_synced_at: new Date().toISOString()
                                })
                                .eq('id', source.id);

                              if (error) {
                                toast.error('Failed to sync');
                              } else {
                                toast.success('Sync started');
                                await fetchDataSources();
                              }
                            } catch (error) {
                              toast.error('Failed to sync');
                            }
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this data source? This action cannot be undone.")) return;

                            // Check if it exists in mock data service first (recently connected or mock)
                            const isLocalSource = mockDataService.getSources().some(s => s.id === source.id);
                            
                            if (isLocalSource) {
                                mockDataService.deleteSource(source.id);
                                toast.success('Data source deleted');
                                if (selectedDataSourceId === source.id) setSelectedDataSourceId(null);
                                await fetchDataSources();
                                return;
                            }

                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              if (!session) return;

                              // 1. Delete the record from data_sources
                              // RLS should handle cascade or we might need to delete from storage if applicable
                              const { error } = await supabase
                                .from('data_sources')
                                .delete()
                                .eq('id', source.id);

                              if (error) {
                                toast.error('Failed to delete data source');
                                console.error(error);
                              } else {
                                toast.success('Data source deleted');

                                // Clear selected data source if it was the deleted one
                                if (selectedDataSourceId === source.id) {
                                  setSelectedDataSourceId(null);
                                }

                                await fetchDataSources();
                              }
                            } catch (error) {
                              toast.error('Failed to delete data source');
                              console.error(error);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-400"
                          onClick={async () => {
                            const isLocal = mockDataService.getSources().some(s => s.id === source.id);
                            if (isLocal) {
                                toast.success('Disconnected');
                                return;
                            }
                            try {
                              const { data: { session } } = await supabase.auth.getSession();
                              if (!session) return;

                              const { error } = await supabase
                                .from('data_sources')
                                .update({ status: 'inactive' })
                                .eq('id', source.id);

                              if (error) {
                                toast.error('Failed to disconnect');
                              } else {
                                toast.success('Disconnected');
                                await fetchDataSources();
                              }
                            } catch (error) {
                              toast.error('Failed to disconnect');
                            }
                          }}
                        >
                          Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Database Connector Modal */}
        <DatabaseConnector 
            isOpen={connectorOpen} 
            onClose={() => {
                setConnectorOpen(false);
                fetchDataSources();
            }} 
            type={connectorType} 
        />
      </div>
    </div>
  );
};

export default DataSources;