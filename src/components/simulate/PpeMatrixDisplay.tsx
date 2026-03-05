import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const ALL_PPE_ITEMS = ['HEAD_COVER', 'HAND_COVER', 'SAFETY_GLASSES', 'SAFETY_SHOES', 'REFLECTIVE_VEST'] as const;
const PPE_LABEL: Record<string, string> = {
  HEAD_COVER: 'Helm', HAND_COVER: 'Sarung Tangan', SAFETY_GLASSES: 'Kacamata',
  SAFETY_SHOES: 'Sepatu', REFLECTIVE_VEST: 'Rompi',
};

interface PpeMatrixDisplayProps {
  zoneId: string;
  zoneName?: string;
}

export function PpeMatrixDisplay({ zoneId, zoneName }: PpeMatrixDisplayProps) {
  const { data: rules = [] } = useQuery({
    queryKey: ['zone-ppe-rules', zoneId],
    queryFn: async () => {
      const { data } = await supabase
        .from('zone_ppe_rules')
        .select('ppe_item, is_required, jabatan')
        .eq('zone_id', zoneId)
        .eq('is_required', true);
      return data || [];
    },
    enabled: !!zoneId,
  });

  if (rules.length === 0) return null;

  // Group by jabatan (null = General)
  const jabatanSet = new Set<string | null>();
  rules.forEach(r => jabatanSet.add(r.jabatan));
  const jabatans = Array.from(jabatanSet).sort((a, b) => {
    if (a === null) return -1;
    if (b === null) return 1;
    return a.localeCompare(b);
  });

  // Build matrix: jabatan → ppe_item → required
  const matrix = new Map<string | null, Set<string>>();
  rules.forEach(r => {
    if (!matrix.has(r.jabatan)) matrix.set(r.jabatan, new Set());
    // Normalize FACE_COVER → SAFETY_GLASSES
    const item = r.ppe_item === 'FACE_COVER' ? 'SAFETY_GLASSES' : r.ppe_item;
    matrix.get(r.jabatan)!.add(item);
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-1.5">
        <p className="text-xs font-medium">Matrix APD — {zoneName || 'Zona'}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-24">Jabatan</TableHead>
            {ALL_PPE_ITEMS.map(item => (
              <TableHead key={item} className="text-xs text-center px-1">{PPE_LABEL[item]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jabatans.map(jab => (
            <TableRow key={jab || '__general__'}>
              <TableCell className="text-xs font-medium py-1">
                <Badge variant="outline" className="text-[10px]">{jab || 'General'}</Badge>
              </TableCell>
              {ALL_PPE_ITEMS.map(item => {
                const required = matrix.get(jab)?.has(item);
                return (
                  <TableCell key={item} className="text-center py-1 px-1">
                    {required ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary mx-auto" />
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
