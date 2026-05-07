import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ALL_PPE_ITEMS = ['HEAD_COVER', 'HAND_COVER', 'SAFETY_GLASSES', 'SAFETY_SHOES', 'REFLECTIVE_VEST'] as const;

interface PpeMatrixDisplayProps {
  zoneId: string;
  zoneName?: string;
}

export function PpeMatrixDisplay({ zoneId, zoneName }: PpeMatrixDisplayProps) {
  const { t } = useTranslation();
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

  const jabatanSet = new Set<string | null>();
  rules.forEach(r => jabatanSet.add(r.jabatan));
  const jabatans = Array.from(jabatanSet).sort((a, b) => {
    if (a === null) return -1;
    if (b === null) return 1;
    return a.localeCompare(b);
  });

  const matrix = new Map<string | null, Set<string>>();
  rules.forEach(r => {
    if (!matrix.has(r.jabatan)) matrix.set(r.jabatan, new Set());
    const item = r.ppe_item === 'FACE_COVER' ? 'SAFETY_GLASSES' : r.ppe_item;
    matrix.get(r.jabatan)!.add(item);
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-1.5">
        <p className="text-xs font-medium">{t('simulate.matrix', { name: zoneName || t('simulate.zone') })}</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-24">{t('simulate.jabatan')}</TableHead>
            {ALL_PPE_ITEMS.map(item => (
              <TableHead key={item} className="text-xs text-center px-1">{t(`zones.ppe.${item}`)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jabatans.map(jab => (
            <TableRow key={jab || '__general__'}>
              <TableCell className="text-xs font-medium py-1">
                <Badge variant="outline" className="text-[10px]">{jab || t('simulate.general')}</Badge>
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
