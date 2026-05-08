import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Video, Loader2, UserCheck, UserX, ShieldCheck, ShieldAlert, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { BoundingBoxOverlay } from '@/components/simulate/BoundingBoxOverlay';
import { PpeMatrixDisplay } from '@/components/simulate/PpeMatrixDisplay';
import { useMotionDetection } from '@/hooks/useMotionDetection';

interface BoundingBoxData {
  Left: number; Top: number; Width: number; Height: number;
}

interface DetectionResult {
  id: string;
  timestamp: Date;
  personIndex: number;
  worker: { nama: string; sid: string; jabatan: string } | null;
  ppe_results: Record<string, { detected: boolean; confidence: number }>;
  alert_created: boolean;
  alert_type?: string;
  jenisPelanggaran: string;
  boundingBox: BoundingBoxData | null;
}

const ALL_PPE_ITEMS = ['HEAD_COVER', 'HAND_COVER', 'SAFETY_GLASSES', 'SAFETY_SHOES', 'REFLECTIVE_VEST'] as const;

const PPE_KEYS: Record<string, string> = {
  HEAD_COVER: 'HEAD_COVER', HAND_COVER: 'HAND_COVER', SAFETY_GLASSES: 'SAFETY_GLASSES',
  SAFETY_SHOES: 'SAFETY_SHOES', REFLECTIVE_VEST: 'REFLECTIVE_VEST',
  FACE_COVER: 'SAFETY_GLASSES',
};

export default function Simulate() {
  const { t, i18n } = useTranslation();
  const ppeLabel = (k: string) => t(`zones.ppe.${PPE_KEYS[k] || k}`, { defaultValue: k });
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState<DetectionResult[]>([]);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCaptureInterval, setAutoCaptureInterval] = useState(5);
  const [captureMode, setCaptureMode] = useState<'interval' | 'smart'>('interval');
  const [motionDetected, setMotionDetected] = useState(false);
  const autoCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const smartCaptureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const { detectMotion, resetMotion } = useMotionDetection();

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-for-simulate'],
    queryFn: async () => {
      const { data } = await supabase.from('cameras').select('id, name, zone_id, jenis_pelanggaran, off_time_start, off_time_end, zones(name)').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const isInOffTime = useCallback((cam: any): boolean => {
    if (cam?.jenis_pelanggaran !== 'KELUAR_TANPA_IZIN') return false;
    if (!cam?.off_time_start || !cam?.off_time_end) return false;
    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = cam.off_time_start.substring(0, 5); // "HH:MM"
    const end = cam.off_time_end.substring(0, 5);
    if (start <= end) return nowHHMM >= start && nowHHMM <= end;
    return nowHHMM >= start || nowHHMM <= end; // overnight
  }, []);

  useEffect(() => {
    if (webcamActive && webcamVideoRef.current && webcamStreamRef.current) {
      webcamVideoRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamActive]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } });
      webcamStreamRef.current = stream;
      if (webcamVideoRef.current) webcamVideoRef.current.srcObject = stream;
      setWebcamActive(true);
    } catch {
      toast.error(t('simulate.toast.webcamFail'));
    }
  };

  const stopWebcam = () => {
    webcamStreamRef.current?.getTracks().forEach(t => t.stop());
    webcamStreamRef.current = null;
    setWebcamActive(false);
    stopAutoCapture();
  };

  const stopAutoCapture = () => {
    if (autoCaptureRef.current) { clearInterval(autoCaptureRef.current); autoCaptureRef.current = null; }
    if (smartCaptureRef.current) { clearInterval(smartCaptureRef.current); smartCaptureRef.current = null; }
    setAutoCapture(false);
    setMotionDetected(false);
    resetMotion();
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
    if (!selectedCameraId) {
      toast.error(t('simulate.toast.selectFirst'));
      return;
    }
    setDetecting(true);
    setLastCapturedImage(`data:image/jpeg;base64,${imageBase64}`);
    try {
      const { data, error } = await supabase.functions.invoke('detect-event', {
        body: { image_base64: imageBase64, camera_id: selectedCameraId },
      });
      if (error) throw error;
      const cam = cameras.find((c: any) => c.id === selectedCameraId);
      const jenisPelanggaran = (cam as any)?.jenis_pelanggaran || 'APD_TIDAK_LENGKAP';

      // Handle multi-person array response
      const personResults = data.results || [];
      if (personResults.length === 0) {
        const result: DetectionResult = {
          id: crypto.randomUUID(), timestamp: new Date(),
          personIndex: 1,
          worker: data.worker || null,
          ppe_results: data.ppe_results || {},
          alert_created: !!data.alert_id, alert_type: data.alert_type,
          jenisPelanggaran,
          boundingBox: data.bounding_box || null,
        };
        setResults(prev => [result, ...prev].slice(0, 20));
      } else {
        const newResults: DetectionResult[] = personResults.map((p: any, idx: number) => ({
          id: crypto.randomUUID(),
          timestamp: new Date(),
          personIndex: idx + 1,
          worker: p.worker || null,
          ppe_results: p.ppe_results || {},
          alert_created: !!p.alert_id,
          alert_type: p.alert_type,
          jenisPelanggaran,
          boundingBox: p.bounding_box || null,
        }));
        setResults(prev => [...newResults, ...prev].slice(0, 20));
      }
      toast.success(t('simulate.toast.detectDone', { count: personResults.length || 1 }));
    } catch (err: any) {
      toast.error(t('simulate.toast.detectFail', { err: err.message }));
    } finally { setDetecting(false); }
  }, [selectedCameraId]);

  const checkOffTimeAndRun = useCallback((imageBase64: string) => {
    const cam = cameras.find((c: any) => c.id === selectedCameraId);
    if (isInOffTime(cam)) {
      toast.info(t('simulate.toast.offTime', { start: cam.off_time_start?.substring(0,5), end: cam.off_time_end?.substring(0,5) }));
      return;
    }
    runDetection(imageBase64);
  }, [selectedCameraId, cameras, isInOffTime, runDetection]);

  const handleWebcamCapture = () => { if (!webcamVideoRef.current) return; const b = captureFrame(webcamVideoRef.current); if (b) checkOffTimeAndRun(b); };
  const handleVideoCapture = () => { if (!videoRef.current) return; const b = captureFrame(videoRef.current); if (b) checkOffTimeAndRun(b); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('simulate.toast.max5MB')); return; }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageDetect = () => { if (!uploadedImage) return; checkOffTimeAndRun(uploadedImage.split(',')[1]); };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 50 * 1024 * 1024) toast.warning(t('simulate.toast.warn50MB'));
    setVideoSrc(URL.createObjectURL(file));
  };

  // Interval-based auto capture
  useEffect(() => {
    if (autoCapture && captureMode === 'interval') {
      const videoEl = webcamActive ? webcamVideoRef.current : (videoSrc ? videoRef.current : null);
      if (!videoEl) return;
      autoCaptureRef.current = setInterval(() => {
        if (detecting) return;
        if (videoEl === videoRef.current && videoEl.paused) return;
        const b = captureFrame(videoEl);
        if (b) checkOffTimeAndRun(b);
      }, autoCaptureInterval * 1000);
    } else {
      if (autoCaptureRef.current) { clearInterval(autoCaptureRef.current); autoCaptureRef.current = null; }
    }
    return () => { if (autoCaptureRef.current) clearInterval(autoCaptureRef.current); };
  }, [autoCapture, captureMode, autoCaptureInterval, webcamActive, videoSrc, detecting, captureFrame, checkOffTimeAndRun]);

  // Smart (motion-based) auto capture
  useEffect(() => {
    if (autoCapture && captureMode === 'smart') {
      const videoEl = webcamActive ? webcamVideoRef.current : (videoSrc ? videoRef.current : null);
      if (!videoEl) return;
      smartCaptureRef.current = setInterval(() => {
        if (detecting) return;
        if (videoEl === videoRef.current && videoEl.paused) return;
        const hasMotion = detectMotion(videoEl);
        setMotionDetected(hasMotion);
        if (hasMotion) {
          const b = captureFrame(videoEl);
          if (b) checkOffTimeAndRun(b);
        }
      }, 1000); // Check every 1s
    } else {
      if (smartCaptureRef.current) { clearInterval(smartCaptureRef.current); smartCaptureRef.current = null; }
      setMotionDetected(false);
    }
    return () => { if (smartCaptureRef.current) clearInterval(smartCaptureRef.current); };
  }, [autoCapture, captureMode, webcamActive, videoSrc, detecting, captureFrame, checkOffTimeAndRun, detectMotion]);

  const selectedCamera = cameras.find((c: any) => c.id === selectedCameraId);

  return (
    <AppLayout title={t('simulate.title')}>
      <div className="max-w-5xl mx-auto space-y-4">
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera selection */}
        <div className="grid gap-2">
          <Label className="font-medium">{t('simulate.selectCamera')}</Label>
          <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder={t('simulate.selectCameraPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {(c as any).zones?.name || t('simulate.noZone')} ({t(`zones.violationTypes.${(c as any).jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? 'KELUAR_TANPA_IZIN' : 'APD_TIDAK_LENGKAP'}`)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCamera && (
            <p className="text-xs text-muted-foreground">
              {t('simulate.detectionType')} <Badge variant="outline" className="text-[10px]">{t(`zones.violationTypes.${(selectedCamera as any).jenis_pelanggaran === 'KELUAR_TANPA_IZIN' ? 'KELUAR_TANPA_IZIN' : 'APD_TIDAK_LENGKAP'}`)}</Badge>
            </p>
          )}
          {selectedCamera && (selectedCamera as any).jenis_pelanggaran !== 'KELUAR_TANPA_IZIN' && (
            <PpeMatrixDisplay
              zoneId={(selectedCamera as any).zone_id}
              zoneName={(selectedCamera as any).zones?.name}
            />
          )}
        </div>

        <div className="grid md:grid-cols-[1fr,320px] gap-4">
          {/* Left: input tabs */}
          <Tabs defaultValue="webcam" className="flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="webcam" className="flex-1 gap-1"><Camera className="h-3.5 w-3.5" />{t('simulate.tabs.webcam')}</TabsTrigger>
              <TabsTrigger value="image" className="flex-1 gap-1"><Upload className="h-3.5 w-3.5" />{t('simulate.tabs.image')}</TabsTrigger>
              <TabsTrigger value="video" className="flex-1 gap-1"><Video className="h-3.5 w-3.5" />{t('simulate.tabs.video')}</TabsTrigger>
            </TabsList>

            <TabsContent value="webcam" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {webcamActive ? (
                  <video ref={webcamVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-2" /><p className="text-sm">{t('simulate.webcam.startHint')}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!webcamActive ? (
                  <Button onClick={startWebcam} size="sm">{t('simulate.webcam.start')}</Button>
                ) : (
                  <>
                    <Button onClick={handleWebcamCapture} size="sm" disabled={detecting || !selectedCameraId}>
                      {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('simulate.webcam.captureDetect')}
                    </Button>
                    <Button onClick={stopWebcam} size="sm" variant="outline">{t('simulate.webcam.stop')}</Button>
                  </>
                )}
              </div>
              {webcamActive && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={autoCapture} onCheckedChange={setAutoCapture} disabled={!selectedCameraId} />
                    <Label className="text-sm">{t('simulate.autoCapture')}</Label>
                    <Select value={captureMode} onValueChange={(v: 'interval' | 'smart') => setCaptureMode(v)} disabled={!autoCapture}>
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interval">{t('simulate.interval')}</SelectItem>
                        <SelectItem value="smart">{t('simulate.smart')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {autoCapture && captureMode === 'interval' && (
                    <div className="flex items-center gap-3 ml-14">
                      <Label className="text-xs">{t('simulate.every')}</Label>
                      <div className="w-32"><Slider min={3} max={10} step={1} value={[autoCaptureInterval]} onValueChange={([v]) => setAutoCaptureInterval(v)} /></div>
                      <span className="text-xs text-muted-foreground">{autoCaptureInterval}s</span>
                    </div>
                  )}
                  {autoCapture && captureMode === 'smart' && (
                    <div className="flex items-center gap-2 ml-14">
                      {motionDetected ? (
                        <Badge variant="default" className="text-[10px] gap-1 animate-pulse"><Eye className="h-3 w-3" />{t('simulate.motionDetected')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-1"><EyeOff className="h-3 w-3" />{t('simulate.waitingMotion')}</Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="image" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Upload" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground cursor-pointer" onClick={() => imageInputRef.current?.click()}>
                    <Upload className="h-12 w-12 mx-auto mb-2" /><p className="text-sm">{t('simulate.image.hint')}</p>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageUpload} />
              <div className="flex items-center gap-2">
                <Button onClick={() => imageInputRef.current?.click()} size="sm" variant="outline">{t('simulate.image.select')}</Button>
                {uploadedImage && (
                  <Button onClick={handleImageDetect} size="sm" disabled={detecting || !selectedCameraId}>
                    {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('simulate.image.detect')}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="video" className="flex-1 space-y-3">
              <div className="relative bg-muted rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {videoSrc ? (
                  <video ref={videoRef} src={videoSrc} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground cursor-pointer" onClick={() => videoInputRef.current?.click()}>
                    <Video className="h-12 w-12 mx-auto mb-2" /><p className="text-sm">{t('simulate.video.hint')}</p>
                  </div>
                )}
              </div>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => videoInputRef.current?.click()} size="sm" variant="outline">{t('simulate.video.select')}</Button>
                {videoSrc && (
                  <Button onClick={handleVideoCapture} size="sm" disabled={detecting || !selectedCameraId}>
                    {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('simulate.video.captureDetect')}
                  </Button>
                )}
              </div>
              {videoSrc && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={autoCapture} onCheckedChange={setAutoCapture} disabled={!selectedCameraId} />
                    <Label className="text-sm">{t('simulate.autoCapture')}</Label>
                    <Select value={captureMode} onValueChange={(v: 'interval' | 'smart') => setCaptureMode(v)} disabled={!autoCapture}>
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interval">{t('simulate.interval')}</SelectItem>
                        <SelectItem value="smart">{t('simulate.smart')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {autoCapture && captureMode === 'interval' && (
                    <div className="flex items-center gap-3 ml-14">
                      <Label className="text-xs">{t('simulate.every')}</Label>
                      <div className="w-32"><Slider min={3} max={10} step={1} value={[autoCaptureInterval]} onValueChange={([v]) => setAutoCaptureInterval(v)} /></div>
                      <span className="text-xs text-muted-foreground">{autoCaptureInterval}s</span>
                    </div>
                  )}
                  {autoCapture && captureMode === 'smart' && (
                    <div className="flex items-center gap-2 ml-14">
                      {motionDetected ? (
                        <Badge variant="default" className="text-[10px] gap-1 animate-pulse"><Eye className="h-3 w-3" />{t('simulate.motionDetected')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-1"><EyeOff className="h-3 w-3" />{t('simulate.waitingMotion')}</Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Bounding box overlay - shown after detection */}
          {lastCapturedImage && results.length > 0 && (
            <div className="md:col-span-2">
              <h3 className="font-semibold text-sm mb-2">{t('simulate.visualResults')}</h3>
              <BoundingBoxOverlay
                imageSrc={lastCapturedImage}
                persons={results
                  .filter(r => r.timestamp.getTime() === results[0]?.timestamp.getTime())
                .map(r => {
                    const isKeluarZona = r.jenisPelanggaran === 'KELUAR_TANPA_IZIN';
                    if (isKeluarZona) {
                      return {
                        boundingBox: r.boundingBox,
                        workerName: r.worker?.nama || null,
                        hasViolation: r.alert_created,
                        ppeStatus: r.alert_created ? t('simulate.exitNoPermission') : t('simulate.permissionGranted'),
                        personIndex: r.personIndex,
                      };
                    }
                    const hasPpeViolation = Object.values(r.ppe_results).some(v => !v.detected);
                    const ppeItems = Object.entries(r.ppe_results)
                      .map(([k, v]) => `${ppeLabel(k)} ${v.detected ? '✓' : '✗'}`)
                      .join(', ');
                    return {
                      boundingBox: r.boundingBox,
                      workerName: r.worker?.nama || null,
                      hasViolation: hasPpeViolation,
                      ppeStatus: ppeItems,
                      personIndex: r.personIndex,
                    };
                  })}
              />
            </div>
          )}

          {/* Right: results panel */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t('simulate.results')}</h3>
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('simulate.noResults')}</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2 pr-2">
                  {results.map((r, i) => (
                    <Card key={r.id} className={i === 0 ? 'border-primary' : ''}>
                      <CardContent className="p-3 space-y-2">
                        {/* Person index badge */}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {t('simulate.person', { n: r.personIndex })}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground">
                            {r.timestamp.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}, {r.timestamp.toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'id-ID')}
                          </p>
                        </div>

                        {/* SID & Nama */}
                        <div className="flex items-center gap-2">
                          {r.worker ? (
                            <>
                              <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
                              <p className="text-sm font-medium">SID: {r.worker.sid} — {r.worker.nama}</p>
                            </>
                          ) : (
                            <><UserX className="h-4 w-4 text-destructive shrink-0" /><p className="text-sm text-muted-foreground">{t('simulate.unknown')}</p></>
                          )}
                        </div>

                        {/* Jabatan */}
                        <p className="text-xs text-muted-foreground">{t('simulate.jabatan')}: {r.worker?.jabatan || '-'}</p>

                        {/* APD Status */}
                        {(() => {
                          const hasPpeViolation = Object.values(r.ppe_results).some(v => !v.detected);
                          if (r.jenisPelanggaran === 'KELUAR_TANPA_IZIN') {
                            return (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                                <Badge variant="destructive" className="text-[10px]">{t('simulate.exitNoPermission')}</Badge>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1">
                              {hasPpeViolation ? (
                                <><AlertTriangle className="h-3 w-3 text-destructive" /><Badge variant="destructive" className="text-[10px]">{t('simulate.apdIncomplete')}</Badge></>
                              ) : (
                                <><ShieldCheck className="h-3 w-3 text-green-600" /><Badge className="text-[10px] bg-green-600 hover:bg-green-700">{t('simulate.apdComplete')}</Badge></>
                              )}
                            </div>
                          );
                        })()}

                        {/* PPE Checklist - show all 5 items */}
                        {r.jenisPelanggaran === 'KELUAR_TANPA_IZIN' ? (
                          <p className="text-xs text-destructive ml-4">{t('simulate.noPermission')}</p>
                        ) : (
                          <div className="flex flex-wrap gap-1 ml-4">
                            {ALL_PPE_ITEMS.map(item => {
                              const result = r.ppe_results[item];
                              if (!result) {
                                // Not checked by zone rules
                                return (
                                  <Badge key={item} variant="secondary" className="text-[9px] gap-0.5 opacity-60">
                                    {ppeLabel(item)} —
                                  </Badge>
                                );
                              }
                              return (
                                <Badge key={item} variant={result.detected ? 'default' : 'destructive'} className="text-[9px] gap-0.5">
                                  {result.detected ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
                                  {ppeLabel(item)}
                                </Badge>
                              );
                            })}
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
      </div>
    </AppLayout>
  );
}
