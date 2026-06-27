import { Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated locally.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-primary" />
          Settings
        </h1>
      </div>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="font-mono">Download Defaults</CardTitle>
          <CardDescription className="font-mono text-xs">Configure the default settings applied to new downloads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label className="font-mono text-sm">Default Format</Label>
            <Select defaultValue="best">
              <SelectTrigger className="font-mono text-sm w-[200px] bg-background">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best" className="font-mono text-sm">Best (Auto)</SelectItem>
                <SelectItem value="mp4" className="font-mono text-sm">MP4</SelectItem>
                <SelectItem value="mp3" className="font-mono text-sm">MP3 (Audio)</SelectItem>
                <SelectItem value="webm" className="font-mono text-sm">WebM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-sm">Default Quality</Label>
            <Select defaultValue="1080p">
              <SelectTrigger className="font-mono text-sm w-[200px] bg-background">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best" className="font-mono text-sm">Highest available</SelectItem>
                <SelectItem value="1080p" className="font-mono text-sm">1080p</SelectItem>
                <SelectItem value="720p" className="font-mono text-sm">720p</SelectItem>
                <SelectItem value="audio-only" className="font-mono text-sm">Audio only</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="font-mono">System Preferences</CardTitle>
          <CardDescription className="font-mono text-xs">Manage UI and application behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-mono text-sm">Auto-retry failed downloads</Label>
              <div className="text-xs font-mono text-muted-foreground">Automatically retry network failures up to 3 times.</div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-mono text-sm">Notifications</Label>
              <div className="text-xs font-mono text-muted-foreground">Show toast notifications when downloads complete.</div>
            </div>
            <Switch defaultChecked />
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="font-mono font-bold tracking-tight px-8">
          <Save className="w-4 h-4 mr-2" />
          SAVE SETTINGS
        </Button>
      </div>

    </div>
  );
}
