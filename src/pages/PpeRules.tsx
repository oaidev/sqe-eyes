import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type PpeRule = Tables<'zone_ppe_rules'>;
type Zone = Tables<'zones'>;

const PPE_ITEMS = ['HEAD_COVER', 'HAND_COVER', 'FACE_COVER', 'SAFETY_SHOES', 'REFLECTIVE_VEST'] as const;
const PPE_LABELS: Record<string, string> = {
  HEAD_COVER: 'Helm', HAND_COVER: 'Sarung Tangan', FACE_COVER: 'Masker/Face Shield',
  SAFETY_SHOES: 'Sepatu Safety', REFLECTIVE_VEST: 'Rompi Reflektif',
};

export default function PpeRules() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: zones = [], isLoading: zl } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => { const { data } = await supabase.from('zones').select('*').order('name'); return (data || []) as Zone[]; },
  });

  const { data: rules = [], isLoading: rl } = useQuery({
    queryKey: ['ppe-rules'],
    queryFn: async () => { const { data } = await supabase.from('zone_ppe_rules').select('*'); return (data || []) as PpeRule[]; },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ zoneId, ppeItem, current }: { zoneId: string; ppeItem: string; current: PpeRule | undefined }) => {
      if (current) {
        const { error } = await supabase.from('zone_ppe_rules').update({ is_required: !current.is_required }).eq('id', current.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zone_ppe_rules').insert({ zone_id: zoneId, ppe_item: ppeItem as any, is_required: true });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ppe-rules'] }),
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const getRule = (zoneId: string, ppeItem: string) => rules.find(r => r.zone_id === zoneId && r.ppe_item === ppeItem);
  const isRequired = (zoneId: string, ppeItem: string) => getRule(zoneId, ppeItem)?.is_required ?? false;
  const loading = zl || rl;

  return (
    <AppLayout title="Aturan APD">
      <Card>
        <CardHeader><CardTitle className="text-base">Matriks APD per Zona</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Zona</th>
                    {PPE_ITEMS.map(item => (
                      <th key={item} className="text-center py-3 px-2 font-medium text-muted-foreground min-w-[100px]">{PPE_LABELS[item]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map(zone => (
                    <tr key={zone.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{zone.name}</td>
                      {PPE_ITEMS.map(item => {
                        const rule = getRule(zone.id, item);
                        return (
                          <td key={item} className="text-center py-3 px-2">
                            <Switch
                              checked={isRequired(zone.id, item)}
                              onCheckedChange={() => toggleMut.mutate({ zoneId: zone.id, ppeItem: item, current: rule })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
