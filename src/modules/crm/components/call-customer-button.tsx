'use client';

import { PhoneCallIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRecordCallAttempt } from '../hooks/use-leads';
import { CallResultDialog } from './call-result-dialog';

type Props = {
  leadId: string;
  phone: string;
  disabled?: boolean;
  defaultConsultation?: {
    consultationNote?: string | null;
    customerRequirements?: string | null;
    followUpAt?: Date | string | null;
  };
};

export function CallCustomerButton({
  leadId,
  phone,
  disabled,
  defaultConsultation,
}: Props) {
  const recordCall = useRecordCallAttempt(leadId);
  const [resultOpen, setResultOpen] = useState(false);

  const handleClick = async () => {
    const result = await recordCall.mutateAsync();
    if (!result.success) {
      alert(result.error);
      return;
    }
    setResultOpen(true);
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        nativeButton={false}
        render={
          <a href={`tel:${phone}`} onClick={handleClick} />
        }
        disabled={disabled || recordCall.isPending}
      >
        <PhoneCallIcon className="size-4" />
        {recordCall.isPending ? 'Đang ghi nhận...' : 'Gọi khách'}
      </Button>

      <CallResultDialog
        leadId={leadId}
        open={resultOpen}
        onOpenChange={setResultOpen}
        defaultConsultation={defaultConsultation}
      />
    </>
  );
}
