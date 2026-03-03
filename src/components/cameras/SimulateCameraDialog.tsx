import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, Video, Loader2, UserCheck, UserX, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DetectionResult {
  id: string;
  timestamp: Date;
  worker: { nama: string; sid: string } | null;
  event_type: string;
  confidence: number | null;
  ppe_results: Record<string, { detected: boolean; confidence: number }>;
  alert_created: boolean;
  alert_type?: string;
  violations: string[];
  zone_rules_applied: boolean;
}

interface SimulateCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimulateCameraDialog({ open, onOpenChange }: SimulateCameraDialogProps) {
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState(5);
  const autoCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Webcam state
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video upload state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fix race condition: attach stream after video element renders
  useEffect(() => {
    if (webcamActive && webcamVideoRef.current && webcamStreamRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamActive]);

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cameras').select('id, name, zone_id, zones(name)').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopWebcam();
      stopAutoCapture();
      setUploadedImage(null);
      setVideoSrc(null);
      setResults([]);
    }
  }, [open]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
      setWebcamActive(true);
    } catch (err) {
      toast.error('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
    }
  };

  const stopWebcam = () => {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    webcamStreamRef.current = null;
    setWebcamActive(false);
    stopAutoCapture();
  };

  const stopAutoCapture = () => {
    if (autoCaptureRef.current) {
      clearInterval(autoCaptureRef.current);
      autoCaptureRef.current = null;
    }
    setAutoCapture(false);
  };

  const captureFrame = useCallback((videoEl: HTMLVideoElement): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !videoEl) return null;
    canvas.width = videoEl.videoWidth || videoEl.clientWidth;
    canvas.height = videoEl.videoHeight || videoEl.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, []);

  const runDetection = useCallback(async (imageBase64: string) => {
    if (!selectedCamera) {
      toast.error('Pilih kamera terlebih dahulu');
      return;
    }
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-event', {
        body: { camera_id: selectedCamera, image_base64: imageBase64 },
      });
      if (error) throw error;

      const result: DetectionResult = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        worker: data.worker || null,
        event_type: data.event_type || 'UNKNOWN',
        confidence: data.confidence_score || null,
        ppe_results: data.ppe_results || {},
        alert_created: !!data.alert_id,
        alert_type: data.alert_type,
        violations: data.violations || [],
        zone_rules_applied: data.zone_rules_applied || false,
      };

      setResults(prev => [result, ...prev].slice(0, 5));
      toast.success('Deteksi selesai');
    } catch (err: any) {
      toast.error(`Deteksi gagal: ${err.message}`);
    } finally {
      setDetecting(false);
    }
  }, [selectedCamera]);

  const handleWebcamCapture = () => {
    if (!webcamVideoRef.current) return;
    const base64 = captureFrame(webcamVideoRef.current);
    if (base64) runDetection(base64);
  };

  const handleVideoCapture = () => {
    if (!videoRef.current) return;
    const base64 = captureFrame(videoRef.current);
    if (base64) runDetection(base64);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Maks 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDetect = () => {
    if (!uploadedImage) return;
    const base64 = uploadedImage.split(',')[1];
    runDetection(base64);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.warning('File > 50MB, mungkin lambat'); }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };

  // Auto capture toggle
  useEffect(() => {
    if (autoCapture && webcamActive && webcamVideoRef.current) {
      autoCaptureRef.current = setInterval(() => {
        if (webcamVideoRef.current && !detecting) {
          const base64 = captureFrame(webcamVideoRef.current);
          if (base64) runDetection(base64);
        }
      }, autoCaptureInterval * 1000);
    } else if (autoCapture && videoSrc && videoRef.current) {
      autoCaptureRef.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused && !detecting) {
          const base64 = captureFrame(videoRef.current);
          if (base64) runDetection(base64);
        }
      }, autoCaptureInterval * 1000);
    } else {
      if (autoCaptureRef.current) clearInterval(autoCaptureRef.current);
    }
    return () => { if (autoCaptureRef.current) clearInterval(autoCaptureRef.current); };
  }, [autoCapture, autoCaptureInterval, webcamActive, videoSrc, detecting, captureFrame, runDetection]);

  const ppeLabel: Record<string, string> = {
    HEAD_COVER: 'Helm', HAND_COVER: 'Sarung Tangan', FACE_COVER: 'Masker',
    SAFETY_SHOES: 'Sepatu Safety', REFLECTIVE_VEST: 'Rompi Reflektif',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Simulasi Deteksi Kamera</DialogTitle>
        </DialogHeader>

        <canvas ref={canvasRef} className="hidden" />

        {/* Camera selector */}
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Kamera:</Label>
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Pilih kamera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {c.zones?.name || '?'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto grid md:grid-cols-[1fr,320px] gap-4">
          {/* Left: input tabs */}
          <Tabs defaultValue="webcam" className="flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="webcam" className="flex-1 gap-1"><Camera className="h-3.5 w-3.5" />Webcam</TabsTrigger>
              <TabsTrigger value="image" className="flex-1 gap-1"><Upload className="h-3.5 w-3.5" />Gambar</TabsTrigger>
              <TabsTrigger value="video" className="flex-1 gap-1"><Video className="h-3.5 w-3.5" />Video</TabsTrigger>
            </TabsList>

            {/* Webcam tab */}
            <TabsContent value="webcam" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {webcamActive ? (
                  <video ref={webcamVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Klik tombol di bawah untuk mulai</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!webcamActive ? (
                  <Button onClick={startWebcam} size="sm">Mulai Webcam</Button>
                ) : (
                  <>
                    <Button onClick={handleWebcamCapture} size="sm" disabled={detecting || !selectedCamera}>
                      {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Capture & Detect'}
                    </Button>
                    <Button onClick={stopWebcam} size="sm" variant="outline">Stop</Button>
                  </>
                )}
              </div>
              {webcamActive && (
                <div className="flex items-center gap-3">
                  <Switch checked={autoCapture} onCheckedChange={setAutoCapture} />
                  <Label className="text-sm">Auto-capture setiap</Label>
                  <div className="w-32">
                    <Slider min={3} max={10} step={1} value={[autoCaptureInterval]} onValueChange={([v]) => setAutoCaptureInterval(v)} />
                  </div>
                  <span className="text-xs text-muted-foreground">{autoCaptureInterval}s</span>
                </div>
              )}
            </TabsContent>

            {/* Image tab */}
            <TabsContent value="image" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Upload" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground cursor-pointer" onClick={() => imageInputRef.current?.click()}>
                    <Upload className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Klik untuk upload gambar (JPG/PNG, maks 5MB)</p>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageUpload} />
              <div className="flex items-center gap-2">
                <Button onClick={() => imageInputRef.current?.click()} size="sm" variant="outline">Pilih Gambar</Button>
                {uploadedImage && (
                  <Button onClick={handleImageDetect} size="sm" disabled={detecting || !selectedCamera}>
                    {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Detect'}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Video tab */}
            <TabsContent value="video" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {videoSrc ? (
                  <video ref={videoRef} src={videoSrc} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground cursor-pointer" onClick={() => videoInputRef.current?.click()}>
                    <Video className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Klik untuk upload video (MP4/WebM, maks 50MB)</p>
                  </div>
                )}
              </div>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => videoInputRef.current?.click()} size="sm" variant="outline">Pilih Video</Button>
                {videoSrc && (
                  <Button onClick={handleVideoCapture} size="sm" disabled={detecting || !selectedCamera}>
                    {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Capture Frame & Detect'}
                  </Button>
                )}
              </div>
              {videoSrc && (
                <div className="flex items-center gap-3">
                  <Switch checked={autoCapture} onCheckedChange={setAutoCapture} />
                  <Label className="text-sm">Auto-capture setiap</Label>
                  <div className="w-32">
                    <Slider min={3} max={10} step={1} value={[autoCaptureInterval]} onValueChange={([v]) => setAutoCaptureInterval(v)} />
                  </div>
                  <span className="text-xs text-muted-foreground">{autoCaptureInterval}s</span>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Right: results panel */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Hasil Deteksi</h3>
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada deteksi. Capture frame untuk memulai.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-2">
                  {results.map((r, i) => (
                    <Card key={r.id} className={i === 0 ? 'border-primary' : ''}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {r.timestamp.toLocaleTimeString('id-ID')}
                          </span>
                          <Badge variant={r.event_type === 'MASUK' ? 'default' : r.event_type === 'KELUAR' ? 'secondary' : 'outline'} className="text-[10px]">
                            {r.event_type}
                          </Badge>
                        </div>

                        {/* Worker info */}
                        <div className="flex items-center gap-2">
                          {r.worker ? (
                            <>
                              <UserCheck className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium">{r.worker.nama}</p>
                                <p className="text-[10px] text-muted-foreground">SID: {r.worker.sid}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 text-destructive" />
                              <p className="text-sm text-muted-foreground">Tidak Dikenal</p>
                            </>
                          )}
                          {r.confidence && (
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {(r.confidence * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>

                        {/* PPE results */}
                        {Object.keys(r.ppe_results).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(r.ppe_results).map(([item, val]) => (
                              <Badge
                                key={item}
                                variant={val.detected ? 'default' : 'destructive'}
                                className="text-[9px] gap-0.5"
                              >
                                {val.detected ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
                                {ppeLabel[item] || item}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Alert & Violations */}
                        {r.alert_created && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-[10px] font-medium">
                                {r.alert_type === 'APD_VIOLATION' ? 'Pelanggaran APD' : 
                                 r.alert_type === 'UNKNOWN_PERSON' ? 'Orang Tidak Dikenal' :
                                 r.alert_type === 'UNAUTHORIZED_EXIT' ? 'Keluar Tanpa Izin' :
                                 'Peringatan'}
                              </span>
                            </div>
                            {r.violations.length > 0 && (
                              <p className="text-[9px] text-muted-foreground ml-4">
                                Tidak terdeteksi: {r.violations.join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                        {r.zone_rules_applied && !r.alert_created && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[10px]">APD sesuai aturan zona</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
