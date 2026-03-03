import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Reports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState('compliance');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const { data: exports = [] } = useQuery({
    queryKey: ['report-exports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_exports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('report_exports').insert({
        report_type: reportType,
        format: reportFormat,
        period_start: periodStart,
        period_end: periodEnd,
        exported_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-exports'] });
      toast.success('Laporan berhasil digenerate');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reportTypes: Record<string, string> = {
    compliance: 'Kepatuhan',
    violations: 'Pelanggaran',
    events: 'Event Harian',
    ppe: 'APD Compliance',
  };

  return (
    <AppLayout title="Ekspor Laporan">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Generate Laporan Baru</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Tipe Laporan</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypes).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={reportFormat} onValueChange={setReportFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Periode Mulai</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Periode Akhir</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <Button className="mt-4" onClick={() => generateMutation.mutate()} disabled={!periodStart || !periodEnd || generateMutation.isPending}>
              <Download className="h-4 w-4 mr-1" /> Generate Laporan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Riwayat Ekspor</CardTitle></CardHeader>
          <CardContent>
            {exports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2" />
                <p className="text-sm">Belum ada laporan</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{format(new Date(e.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell className="text-xs">{reportTypes[e.report_type] || e.report_type}</TableCell>
                      <TableCell className="text-xs">{e.period_start} → {e.period_end}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase">{e.format}</Badge></TableCell>
                      <TableCell>
                        {e.file_url
                          ? <Badge className="bg-green-600 text-white text-[10px]">Siap</Badge>
                          : <Badge variant="secondary" className="text-[10px]">Menunggu</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
