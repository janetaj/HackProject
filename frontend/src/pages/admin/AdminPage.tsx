
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, CreditCard, Box } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPage() {
  return (
    <PageContainer 
      title="Platform Settings" 
      description="Administrative configurations for integrations and system defaults."
    >
      <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Box className="h-5 w-5 text-primary" />
              Jira Integration
            </CardTitle>
            <CardDescription>Configure webhook connections mapping</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Jira Hostname URL</Label>
              <Input defaultValue="https://company.atlassian.net" />
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input type="password" defaultValue="**********************" />
            </div>
            <Button onClick={() => toast.success("Jira settings saved successfully")}>Save Configuration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              LLM Provider
            </CardTitle>
            <CardDescription>Configure which AI models analyze the tickets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>OpenAI API Key</Label>
              <Input type="password" defaultValue="sk-**********************" />
            </div>
            <div className="space-y-2">
              <Label>Model Default</Label>
              <Input defaultValue="gpt-4-turbo" />
            </div>
            <Button onClick={() => toast.success("LLM settings saved successfully")}>Save Configuration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Budget Limiting
            </CardTitle>
            <CardDescription>Protect AI generation costs globally.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Token Limit</Label>
              <Input type="number" defaultValue={5000000} />
            </div>
            <div className="space-y-2">
              <Label>Maximum spend per user ($)</Label>
              <Input type="number" defaultValue={50} />
            </div>
            <Button onClick={() => toast.success("Budget settings saved successfully")}>Save Configuration</Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
