import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, Mail, Bell, Shield, Key, Database, Globe, 
  Moon, Sun, Download, Trash2, Eye, EyeOff, Save,
  CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  metadata: any;
}

interface TenantInfo {
  id: string;
  name: string;
  subscription_tier: string;
  status: string;
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  
  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Preferences state
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");
  const [language, setLanguage] = useState("en");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    modelTraining: true,
    dataSync: true,
    alerts: true,
  });
  
  // Privacy state
  const [gdprConsents, setGdprConsents] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // API keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to view settings");
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        toast.error("Failed to load profile");
        return;
      }

      setUserProfile(profile);
      setFullName(profile.full_name || "");
      setEmail(profile.email || user.email || "");
      setAvatarUrl(profile.avatar_url || "");

      // Get tenant info
      if (profile.tenant_id) {
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.tenant_id)
          .single();

        if (!tenantError && tenant) {
          setTenantInfo(tenant);
        }
      }

      // Load preferences from metadata
      if (profile.metadata) {
        if (profile.metadata.theme) setTheme(profile.metadata.theme);
        if (profile.metadata.language) setLanguage(profile.metadata.language);
        if (profile.metadata.notifications) {
          setNotifications(profile.metadata.notifications);
        }
      }

      // Load GDPR consents
      const { data: consents } = await supabase
        .from("gdpr_consents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (consents) {
        setGdprConsents(consents);
      }

    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: fullName || null,
          email: email,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (error) throw error;

      // Update auth email if changed
      if (email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });
        if (emailError) {
          console.error("Error updating email:", emailError);
          toast.warning("Profile updated but email change requires verification");
        }
      }

      toast.success("Profile updated successfully");
      await loadUserData();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!userProfile) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("user_profiles")
        .update({
          metadata: {
            ...userProfile.metadata,
            theme,
            language,
            notifications,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", userProfile.id);

      if (error) throw error;

      // Apply theme
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (theme === "light") {
        document.documentElement.classList.remove("dark");
      }

      toast.success("Preferences saved successfully");
      await loadUserData();
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDataExport = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userProfile) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "access",
            user_id: user.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to request data export");

      const result = await response.json();
      toast.success("Data export requested. You will receive an email when ready.");
    } catch (error: any) {
      console.error("Error requesting data export:", error);
      toast.error(error.message || "Failed to request data export");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDataDeletion = async () => {
    if (!confirm("Are you sure you want to delete all your data? This action cannot be undone.")) {
      return;
    }

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userProfile) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "deletion",
            user_id: user.id,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to request data deletion");

      toast.success("Data deletion requested. You will receive a confirmation email.");
    } catch (error: any) {
      console.error("Error requesting data deletion:", error);
      toast.error(error.message || "Failed to request data deletion");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConsent = async (consentType: string, granted: boolean) => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userProfile) return;

      const { error } = await supabase
        .from("gdpr_consents")
        .upsert({
          user_id: user.id,
          tenant_id: userProfile.tenant_id,
          consent_type: consentType,
          granted: granted,
          version: "1.0",
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Consent updated successfully");
      await loadUserData();
    } catch (error: any) {
      console.error("Error updating consent:", error);
      toast.error(error.message || "Failed to update consent");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E27] text-white p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] bg-clip-text text-transparent">
              Settings
            </span>
          </h1>
          <p className="text-[#E5E7EB]/70 text-lg">Manage your account and preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card bg-white/5 border-white/10 p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#00D4FF]/20">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-[#00D4FF]/20">
              <Shield className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-[#00D4FF]/20">
              <Globe className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#00D4FF]/20">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-[#00D4FF]/20">
              <Database className="w-4 h-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-[#00D4FF]/20">
              <Key className="w-4 h-4 mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="Enter your email"
                  />
                  <p className="text-sm text-[#E5E7EB]/50">
                    Changing your email will require verification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                {tenantInfo && (
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-white">{tenantInfo.name}</p>
                      <Badge className="bg-[#6B46C1]/20 text-[#6B46C1] border-[#6B46C1]/30">
                        {tenantInfo.subscription_tier}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30">
                    {userProfile?.role || "viewer"}
                  </Badge>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">Account Security</h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Change Password</h3>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/5 border-white/20 text-white pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E5E7EB]/50 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={saving || !newPassword || !confirmPassword}
                    className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Account Information</h3>
                  <div className="space-y-2">
                    <Label>Account Created</Label>
                    <p className="text-[#E5E7EB]/70">
                      {userProfile?.created_at
                        ? new Date(userProfile.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Login</Label>
                    <p className="text-[#E5E7EB]/70">
                      {userProfile?.last_login_at
                        ? new Date(userProfile.last_login_at).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">Preferences</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f3a] border-white/10">
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f3a] border-white/10">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">Notification Preferences</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-[#E5E7EB]/50">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-[#E5E7EB]/50">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, push: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Model Training Complete</Label>
                    <p className="text-sm text-[#E5E7EB]/50">
                      Get notified when ML models finish training
                    </p>
                  </div>
                  <Switch
                    checked={notifications.modelTraining}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, modelTraining: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sync Complete</Label>
                    <p className="text-sm text-[#E5E7EB]/50">
                      Get notified when data sources finish syncing
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dataSync}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dataSync: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Alerts</Label>
                    <p className="text-sm text-[#E5E7EB]/50">
                      Receive important system alerts and updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.alerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, alerts: checked })
                    }
                  />
                </div>

                <Button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">Privacy & Data</h2>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">GDPR Consent Management</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Data Processing</Label>
                        <p className="text-sm text-[#E5E7EB]/50">
                          Allow processing of your data for analytics
                        </p>
                      </div>
                      <Switch
                        checked={
                          gdprConsents.find((c) => c.consent_type === "data_processing")
                            ?.granted || false
                        }
                        onCheckedChange={(checked) =>
                          handleUpdateConsent("data_processing", checked)
                        }
                        disabled={saving}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Marketing Communications</Label>
                        <p className="text-sm text-[#E5E7EB]/50">
                          Receive marketing emails and updates
                        </p>
                      </div>
                      <Switch
                        checked={
                          gdprConsents.find((c) => c.consent_type === "marketing")?.granted ||
                          false
                        }
                        onCheckedChange={(checked) =>
                          handleUpdateConsent("marketing", checked)
                        }
                        disabled={saving}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Analytics & Tracking</Label>
                        <p className="text-sm text-[#E5E7EB]/50">
                          Allow usage analytics and tracking
                        </p>
                      </div>
                      <Switch
                        checked={
                          gdprConsents.find((c) => c.consent_type === "analytics")?.granted ||
                          false
                        }
                        onCheckedChange={(checked) =>
                          handleUpdateConsent("analytics", checked)
                        }
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Data Management</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={handleRequestDataExport}
                      disabled={saving}
                      variant="outline"
                      className="w-full border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export My Data
                    </Button>
                    <Button
                      onClick={handleRequestDataDeletion}
                      disabled={saving}
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Request Data Deletion
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api">
            <Card className="glass-card p-6 border-white/10">
              <h2 className="text-2xl font-bold mb-6">API Access</h2>
              <div className="space-y-6">
                <div className="p-4 bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-white">API Documentation</p>
                      <p className="text-sm text-[#E5E7EB]/70">
                        View our API documentation to integrate ZERRA into your applications
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10"
                      onClick={() => window.open("/api-docs", "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Docs
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">API Keys</h3>
                  <p className="text-sm text-[#E5E7EB]/50">
                    Manage your API keys for programmatic access to ZERRA
                  </p>
                  
                  {apiKeys.length === 0 ? (
                    <div className="p-4 bg-white/5 rounded-lg text-center">
                      <p className="text-[#E5E7EB]/70">No API keys created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-white">{key.name}</p>
                            <p className="text-sm text-[#E5E7EB]/50">
                              Created {new Date(key.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#E5E7EB]/70 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      placeholder="API key name"
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <Button
                      disabled={!newApiKeyName || saving}
                      className="bg-gradient-to-r from-[#00D4FF] to-[#6B46C1] hover:from-[#00D4FF]/90 hover:to-[#6B46C1]/90"
                    >
                      Create Key
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
