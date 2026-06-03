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

const MAX_ATTEMPTS = 5;

const GEOLOCATION_ERROR_MESSAGE =
  'Không lấy được vị trí. Vui lòng cấp quyền vị trí cho trình duyệt hoặc nhập địa chỉ thủ công.';

const PERMISSION_DENIED_MESSAGE =
  'Trình duyệt đang chặn quyền vị trí. Vui lòng bật quyền vị trí cho trang này rồi thử lại.';

const PERMISSION_DENIED_RETRY_HINT =
  'Các lần thử lại chỉ thành công sau khi bạn bật quyền vị trí cho trang này.';

const UNSUPPORTED_MESSAGE = 'Trình duyệt không hỗ trợ lấy vị trí.';

const MAX_ATTEMPTS_MESSAGE =
  'Đã thử lấy vị trí 5 lần nhưng chưa thành công. Vui lòng kiểm tra quyền vị trí của trình duyệt hoặc nhập/chỉnh địa chỉ thủ công.';

type GeolocationErrorCode = 'unsupported' | 'permission_denied' | 'failed';

type GeolocationError = {
  code: GeolocationErrorCode;
  message: string;
};

type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type Props = {
  surveyId: string;
  disabled?: boolean;
};

function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

function readGeolocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject({
        code: 'unsupported',
        message: UNSUPPORTED_MESSAGE,
      } satisfies GeolocationError);
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
      (positionError) => {
        if (positionError.code === positionError.PERMISSION_DENIED) {
          reject({
            code: 'permission_denied',
            message: PERMISSION_DENIED_MESSAGE,
          } satisfies GeolocationError);
          return;
        }

        reject({
          code: 'failed',
          message: GEOLOCATION_ERROR_MESSAGE,
        } satisfies GeolocationError);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function parseGeolocationError(error: unknown): GeolocationError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    return error as GeolocationError;
  }

  return {
    code: 'failed',
    message: error instanceof Error ? error.message : GEOLOCATION_ERROR_MESSAGE,
  };
}

export function SurveyLocationCheckIn({ surveyId, disabled }: Props) {
  const checkIn = useCheckInSurveyLocation(surveyId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeolocationResult | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<GeolocationErrorCode | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const reset = () => {
    setLoading(false);
    setPreview(null);
    setNote('');
    setError('');
    setErrorCode(null);
    setAttemptCount(0);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };

  const runGeolocationAttempt = (nextAttempt: number) => {
    setLoading(true);
    setPreview(null);
    setError('');
    setErrorCode(null);

    void readGeolocation()
      .then((coords) => {
        setPreview(coords);
        setError('');
        setErrorCode(null);
        setAttemptCount(0);
      })
      .catch((e) => {
        const geolocationError = parseGeolocationError(e);
        setErrorCode(geolocationError.code);

        if (nextAttempt >= MAX_ATTEMPTS) {
          setError(MAX_ATTEMPTS_MESSAGE);
          return;
        }

        setError(geolocationError.message);
      })
      .finally(() => setLoading(false));
  };

  const handleStartCheckIn = () => {
    reset();
    setOpen(true);

    if (!isGeolocationSupported()) {
      setErrorCode('unsupported');
      setError(UNSUPPORTED_MESSAGE);
      return;
    }

    runGeolocationAttempt(0);
  };

  const handleRetry = () => {
    if (errorCode === 'unsupported' || attemptCount >= MAX_ATTEMPTS) return;

    const nextAttempt = attemptCount + 1;
    setAttemptCount(nextAttempt);
    runGeolocationAttempt(nextAttempt);
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
  const canRetry =
    errorCode !== 'unsupported' &&
    attemptCount < MAX_ATTEMPTS &&
    !loading &&
    !preview;
  const showPermissionHint = errorCode === 'permission_denied' && canRetry;

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
                {showPermissionHint && (
                  <p className="text-xs text-muted-foreground">{PERMISSION_DENIED_RETRY_HINT}</p>
                )}
                {canRetry && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                    Thử lại
                  </Button>
                )}
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
