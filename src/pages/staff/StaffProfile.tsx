import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Building2 } from 'lucide-react';

const StaffProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your account information" />
      <Card className="max-w-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><Mail className="w-5 h-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div></div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"><Building2 className="w-5 h-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Role</p><p className="font-medium">Pharmacy Staff</p></div></div>
        </CardContent>
      </Card>
    </div>
  );
};
export default StaffProfile;
