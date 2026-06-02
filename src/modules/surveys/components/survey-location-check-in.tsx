'use client';

import { MapPinnedIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatAccuracyMeters, formatCoordinatePair } from '@/lib/address/survey-location';
import { useCheckInSurveyLocation } from '../hooks/use-surveys';

const GEOLOCATION_ERROR_MESSAGE =
  'Không lấy được vị trí. Vui lòng cấp quyền vị trí cho trình duyệt hoặc nhập địa chỉ thủ công.';

type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type Props = {
  surveyId: string;
  disabled?: boolean;
};

function readGeolocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error(GEOLOCATION_ERROR_MESSAGE));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => reject(new Error(GEOLOCATION_ERROR_MESSAGE)),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

export function SurveyLocationCheckIn({ surveyId, disabled }: Props) {
  const checkIn = useCheckInSurveyLocation(surveyId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeolocationResult | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setLoading(false);
    setPreview(null);
    setNote('');
    setError('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const handleStartCheckIn = () => {
    reset();
    setOpen(true);
    setLoading(true);
    void readGeolocation()
      .then((coords) => {
        setPreview(coords);
        setError('');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : GEOLOCATION_ERROR_MESSAGE);
      })
      .finally(() => setLoading(false));
  };

  const handleRetry = () => {
    setPreview(null);
    setError('');
    setLoading(true);
    void readGeolocation()
      .then((coords) => {
        setPreview(coords);
        setError('');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : GEOLOCATION_ERROR_MESSAGE);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async () => {
    if (!preview) return;
    setError('');
    const result = await checkIn.mutateAsync({
      latitude: preview.latitude,
      longitude: preview.longitude,
      accuracy: preview.accuracy,
      note: note.trim() || undefined,
    });
    if (result.success) {
      handleOpenChange(false);
    } else {
      setError(result.error);
    }
  };

  const coordLabel = preview
    ? formatCoordinatePair(preview.latitude, preview.longitude)
    : null;
  const accuracyLabel = preview ? formatAccuracyMeters(preview.accuracy) : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={disabled || checkIn.isPending}
        onClick={handleStartCheckIn}
      >
        <MapPinnedIcon className="size-4" />
        Ghim vị trí thực tế
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ghim vị trí khảo sát thực tế</DialogTitle>
            <DialogDescription>
              Chỉ lấy vị trí một lần khi bạn bấm lưu — hệ thống không theo dõi liên tục.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {loading && (
              <p className="text-sm text-muted-foreground">Đang lấy vị trí...</p>
            )}

            {!loading && preview && (
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Tọa độ dự kiến</p>
                  <p className="mt-1 font-mono text-xs">{coordLabel}</p>
                  {accuracyLabel && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Độ chính xác GPS: {accuracyLabel}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="check-in-note">Ghi chú vị trí (tuỳ chọn)</Label>
                  <Textarea
                    id="check-in-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Ghi chú vị trí/cổng vào/khu vực..."
                  />
                </div>
              </>
            )}

            {!loading && !preview && error && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  Thử lại
                </Button>
              </div>
            )}

            {error && preview && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={checkIn.isPending} />}>
              Đóng
            </DialogClose>
            {preview && (
              <Button type="button" onClick={handleSubmit} disabled={checkIn.isPending}>
                {checkIn.isPending ? 'Đang lưu...' : 'Lưu vị trí'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
