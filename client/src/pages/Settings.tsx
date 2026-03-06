import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Moon, Palette, Bell, Database, Check } from "lucide-react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { useTheme, type ColorTheme } from "@/context/ThemeContext";

const COLOR_THEMES: { id: ColorTheme; name: string; org: string; colors: [string, string] }[] = [
  { id: "epa", name: "EPA", org: "Environmental Protection Agency", colors: ["#3b82f6", "#1e3a5f"] },
  { id: "uf", name: "UF", org: "University of Florida", colors: ["#FA4616", "#0021A5"] },
  { id: "oregon-state", name: "Oregon State", org: "Oregon State University", colors: ["#D73F09", "#000000"] },
  { id: "auburn", name: "Auburn", org: "Auburn University", colors: ["#DD550C", "#03244D"] },
];

export default function Settings() {
  const { dark, colorTheme, setDark, setColorTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your application preferences
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Dark Mode
                </CardTitle>
                <CardDescription className="text-sm">
                  Toggle between light and dark appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {dark ? "Currently using dark theme" : "Currently using light theme"}
                    </p>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={dark}
                    onCheckedChange={setDark}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
                  Color Theme
                </CardTitle>
                <CardDescription className="text-sm">
                  Choose a color scheme for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COLOR_THEMES.map((theme) => {
                    const isActive = colorTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setColorTheme(theme.id)}
                        className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                          isActive
                            ? "border-primary shadow-md"
                            : "border-border hover:border-primary/40"
                        }`}
                        data-testid={`theme-${theme.id}`}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex gap-1">
                            <div
                              className="w-6 h-6 rounded-full border border-border/50"
                              style={{ backgroundColor: theme.colors[0] }}
                            />
                            <div
                              className="w-6 h-6 rounded-full border border-border/50"
                              style={{ backgroundColor: theme.colors[1] }}
                            />
                          </div>
                          <span className="font-semibold text-sm">{theme.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{theme.org}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="upload-notifications" className="text-sm">Upload Notifications</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show notifications when files are uploaded
                    </p>
                  </div>
                  <Switch id="upload-notifications" defaultChecked data-testid="switch-upload-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="analysis-notifications" className="text-sm">Analysis Notifications</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show notifications when AI analysis completes
                    </p>
                  </div>
                  <Switch id="analysis-notifications" defaultChecked data-testid="switch-analysis-notifications" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  Data Management
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your stored data and files
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="auto-parse" className="text-sm">Auto-parse on Upload</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Automatically extract metadata when uploading files
                      </p>
                    </div>
                    <Switch id="auto-parse" defaultChecked data-testid="switch-auto-parse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
