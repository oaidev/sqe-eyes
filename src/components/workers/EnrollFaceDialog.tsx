import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Worker = Tables<'workers'>;
type FaceEmbedding = Tables<'worker_face_embeddings'>;

interface EnrollFaceDialogProps {
  worker: Worker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollFaceDialog({ worker, open, onOpenChange }: EnrollFaceDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ photo_url: string; face_id: string | null; quality_score: number | null; error?: string }>>([]);

  const { data: embeddings = [] } = useQuery({
    queryKey: ['face-embeddings', worker?.id],
    queryFn: async () => {
      if (!worker) return [];
      const { data, error } = await supabase
        .from('worker_face_embeddings')
        .select('*')
        .eq('worker_id', worker.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FaceEmbedding[];
    },
    enabled: !!worker && open,
  });

  const handleEnroll = async () => {
    if (!worker || files.length === 0) return;
    setEnrolling(true);
    setProgress(10);
    setResults([]);

    try {
      // Upload photos to storage
      const photoUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const path = `${worker.id}/${Date.now()}_${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('worker-photos')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('worker-photos')
          .getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
        setProgress(10 + ((i + 1) / files.length) * 40);
      }

      setProgress(55);

      // Call enroll-worker edge function
      const { data: session } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/enroll-worker`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ worker_id: worker.id, photo_urls: photoUrls }),
        }
      );

      setProgress(90);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Enrollment failed');

      setResults(data.results || []);
      setProgress(100);
      toast({ title: 'Enrollment selesai', description: `${data.results?.filter((r: any) => r.face_id).length} wajah berhasil didaftarkan` });
      qc.invalidateQueries({ queryKey: ['workers'] });
      qc.invalidateQueries({ queryKey: ['face-embeddings', worker.id] });
    } catch (e: any) {
      toast({ title: 'Error enrollment', description: e.message, variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!enrolling) {
      setFiles([]);
      setProgress(0);
      setResults([]);
      onOpenChange(v);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Daftarkan Wajah — {worker?.nama}
          </DialogTitle>
          <DialogDescription>
            Upload 1–3 foto wajah pekerja untuk didaftarkan ke sistem pengenalan wajah.
          </DialogDescription>
        </DialogHeader>

        {/* Existing embeddings */}
        {embeddings.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Wajah Terdaftar ({embeddings.length})</Label>
            <div className="space-y-1">
              {embeddings.map((emb) => (
                <div key={emb.id} className="flex items-center justify-between rounded border p-2 text-xs">
                  <span className="font-mono truncate max-w-[200px]">{emb.face_id || 'N/A'}</span>
                  <Badge variant="outline">{emb.quality_score ? `${emb.quality_score.toFixed(1)}%` : '-'}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File input */}
        <div className="grid gap-2">
          <Label>Foto Wajah</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={enrolling}
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
          />
          <p className="text-xs text-muted-foreground">Maksimal 3 foto, format JPG/PNG</p>
        </div>

        {/* Progress */}
        {enrolling && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress < 50 ? 'Mengupload foto...' : progress < 90 ? 'Mendaftarkan wajah ke AWS Rekognition...' : 'Selesai!'}
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.face_id ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span>{r.face_id ? `Terdaftar (score: ${r.quality_score?.toFixed(1)}%)` : r.error || 'Gagal'}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={enrolling}>Tutup</Button>
          <Button onClick={handleEnroll} disabled={enrolling || files.length === 0}>
            {enrolling && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Daftarkan Wajah
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
