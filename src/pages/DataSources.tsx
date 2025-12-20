import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, Search, MoreVertical, Database, FileSpreadsheet, 
  CheckCircle2, RefreshCw, AlertCircle, Plus,
  Server, Cloud, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAnalytics } from "@/contexts/AnalyticsContext";

interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: any;
  records: string;
  lastSync: string;
  status: "active" | "syncing" | "error" | "inactive";
}

const DataSources = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedDataSourceId, setSelectedDataSourceId } = useAnalytics();

  // Fetch real data sources from Supabase
  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDataSources([]);
        setLoading(false);
        return;
      }

      // Fetch data sources
      const { data: sources, error: sourcesError } = await supabase
        .from('data_sources')
        .select('id, name, type, status, row_count, last_synced_at, created_at')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });

      if (sourcesError) {
        console.error('Error fetching data sources:', sourcesError);
        toast.error('Failed to load data sources');
        setDataSources([]);
        setLoading(false);
        return;
      }

      // Note: We only need data_sources, not uploaded_files for the display

      // Map to DataSource format
      const mappedSources: DataSource[] = (sources || []).map((source) => {
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

        // Format last sync time
        let lastSync = 'Never';
        if (source.last_synced_at) {
          const syncDate = new Date(source.last_synced_at);
          const now = new Date();
          const diffMs = now.getTime() - syncDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) {
            lastSync = 'Just now';
          } else if (diffMins < 60) {
            lastSync = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
          } else if (diffHours < 24) {
            lastSync = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
          } else {
            lastSync = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
          }
        } else if (source.created_at) {
          const createdDate = new Date(source.created_at);
          const now = new Date();
          const diffMs = now.getTime() - createdDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) {
            lastSync = 'Just now';
          } else if (diffMins < 60) {
            lastSync = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
          } else {
            lastSync = 'Recently';
          }
        }

        return {
          id: source.id,
          name: source.name || 'Unnamed Source',
          type: source.type || 'Unknown',
          icon,
          records: recordsText,
          lastSync,
          status: (source.status as "active" | "syncing" | "error" | "inactive") || 'inactive',
        };
      });

      setDataSources(mappedSources);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      toast.error('Failed to load data sources');
      setDataSources([]);
    } finally {
      setLoading(false);
    }
  };

  const quickConnectSources = [
    { name: "PostgreSQL", icon: Database, color: "from-blue-500 to-blue-600" },
    { name: "MySQL", icon: Database, color: "from-orange-500 to-orange-600" },
    { name: "SQL Server", icon: Database, color: "from-red-500 to-red-600" },
    { name: "SAP", icon: Server, color: "from-yellow-500 to-yellow-600" },
    { name: "Oracle", icon: Server, color: "from-red-500 to-red-600" },
    { name: "Dynamics 365", icon: Cloud, color: "from-purple-500 to-purple-600" },
  ];

  const filteredSources = dataSources.filter((source) =>
    source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    source.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Invalid file type. Please upload a CSV or Excel file.");
      return;
    }

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      toast.error("File size exceeds 100MB limit.");
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to upload files.");
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      toast.loading("Uploading and processing file...", { id: "upload" });

      // Don't set Content-Type header for FormData - browser sets it automatically with boundary
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          // Explicitly don't set Content-Type - browser will set multipart/form-data with boundary
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
      
      toast.success(`File processed successfully! ${result.rows_count || 0} rows analyzed.`, { id: "upload" });
      
      // Refresh the data sources list
      await fetchDataSources();
      console.log("File processed:", result);

    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.';
      toast.error(errorMessage, { id: "upload" });
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
          <Button
            className="bg-gradient-to-r from-[#6B46C1] to-[#9333EA] hover:from-[#6B46C1]/90 hover:to-[#9333EA]/90 text-white px-6 py-6 rounded-lg shadow-[0_0_20px_rgba(107,70,193,0.3)] hover:shadow-[0_0_30px_rgba(107,70,193,0.5)] transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Connection
          </Button>
        </div>

        {/* Upload Section */}
        <Card className="glass-card p-8 border-white/10">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              isDragging
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
                className="glass-card p-6 rounded-xl hover:scale-105 hover:border-[#00D4FF]/50 transition-all group text-center"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${source.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <source.icon className="text-white" size={24} />
                </div>
                <p className="text-sm font-medium text-white">{source.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Connected Sources */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Connected Sources</h2>
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
                className="glass-card p-6 border-white/10 hover:border-[#00D4FF]/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
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
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#E5E7EB]/70">
                        <span>{source.records}</span>
                        <span>•</span>
                        <span>{source.lastSync}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
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
                </div>
              </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;

