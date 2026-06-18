'use client';

import { useMemo, useState } from 'react';
import { BadgeCheckIcon, LinkIcon } from 'lucide-react';
import { ReplaceLink } from '@/components/navigation/replace-link';
import { buildFullAddress } from '@/lib/address/format-address';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { WarrantyCustomerOption } from '../lib/warranty-ticket-create-options';
import {
  WarrantyTicketCreateForm,
  type WarrantyTicketCreatePrefill,
} from './warranty-ticket-create-form';

type Props = {
  customers: WarrantyCustomerOption[];
};

const NONE_VALUE = '__none__';

function getCustomerLabel(customer: WarrantyCustomerOption) {
  return `${customer.code} - ${customer.fullName}`;
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getCertificateLabel(
  certificate: WarrantyCustomerOption['warrantyCertificates'][number],
) {
  const endAt = formatDate(certificate.warrantyEndAt);
  return endAt ? `${certificate.code} - BH đến ${endAt}` : certificate.code;
}

export function WarrantyTicketDirectCreate({ customers }: Props) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCertificateId, setSelectedCertificateId] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );
  const selectedCertificate = useMemo(() => {
    if (!selectedCustomer || !selectedCertificateId) return null;
    return (
      selectedCustomer.warrantyCertificates.find((cert) => cert.id === selectedCertificateId) ??
      null
    );
  }, [selectedCertificateId, selectedCustomer]);

  const prefill = useMemo<WarrantyTicketCreatePrefill | null>(() => {
    if (!selectedCustomer) return null;

    return {
      customerId: selectedCustomer.id,
      customerLabel: getCustomerLabel(selectedCustomer),
      leadId: selectedCertificate?.leadId ?? null,
      surveyId: selectedCertificate?.surveyId ?? null,
      quotationId: selectedCertificate?.quotationId ?? null,
      contractId: selectedCertificate?.contractId ?? null,
      workOrderId: selectedCertificate?.workOrderId ?? null,
      handoverId: selectedCertificate?.handoverId ?? null,
      customerContactName: selectedCustomer.fullName,
      customerContactPhone: selectedCustomer.phone,
    };
  }, [selectedCertificate, selectedCustomer]);

  const installationAddress = selectedCustomer
    ? buildFullAddress(selectedCustomer.address, selectedCustomer.province)
    : '';
  const certificateOptions = selectedCustomer?.warrantyCertificates ?? [];
  const contextKey = `${selectedCustomerId}:${selectedCertificateId || 'no-cert'}`;

  if (customers.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-5 text-sm text-muted-foreground">
        <p>Chưa có khách hàng để tạo yêu cầu bảo hành/CSKH.</p>
        <ReplaceLink href="/crm/customers" className="mt-2 inline-flex text-primary hover:underline">
          Mở danh sách khách hàng
        </ReplaceLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="warrantyCustomer">Khách hàng *</Label>
        <Select
          value={selectedCustomerId || NONE_VALUE}
          onValueChange={(value) => {
            setSelectedCustomerId(!value || value === NONE_VALUE ? '' : value);
            setSelectedCertificateId('');
          }}
        >
          <SelectTrigger id="warrantyCustomer" className="w-full">
            <SelectValue placeholder="Chọn khách hàng">
              {(value) => {
                if (!value || value === NONE_VALUE) return 'Chọn khách hàng';
                const customer = customers.find((item) => item.id === value);
                return customer ? getCustomerLabel(customer) : 'Chọn khách hàng';
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Chọn khách hàng</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{getCustomerLabel(customer)}</span>
                  <span className="truncate text-xs text-muted-foreground">{customer.phone}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCustomer && (
        <div className="rounded-lg border bg-muted/30 px-3 py-3 text-sm">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{selectedCustomer.fullName}</p>
            <p className="text-xs text-muted-foreground">
              SĐT: {selectedCustomer.phone}
              {installationAddress ? ` · ${installationAddress}` : ''}
            </p>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="warrantyCertificate">Phiếu bảo hành / dự án liên quan</Label>
          <Select
            value={selectedCertificateId || NONE_VALUE}
            onValueChange={(value) =>
              setSelectedCertificateId(!value || value === NONE_VALUE ? '' : value)
            }
          >
            <SelectTrigger id="warrantyCertificate" className="w-full">
              <SelectValue placeholder="Không gắn phiếu bảo hành">
                {(value) => {
                  if (!value || value === NONE_VALUE) return 'Không gắn phiếu bảo hành';
                  const certificate = certificateOptions.find((item) => item.id === value);
                  return certificate ? getCertificateLabel(certificate) : 'Không gắn phiếu bảo hành';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Không gắn phiếu bảo hành</SelectItem>
              {certificateOptions.map((certificate) => (
                <SelectItem key={certificate.id} value={certificate.id}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{getCertificateLabel(certificate)}</span>
                    {certificate.handover && (
                      <span className="truncate text-xs text-muted-foreground">
                        Bàn giao: {certificate.handover.code}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {certificateOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Khách này chưa có phiếu bảo hành. Phiếu yêu cầu vẫn có thể tạo và gắn với khách hàng.
            </p>
          )}
        </div>
      )}

      {selectedCertificate && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-sm">
          <div className="flex items-start gap-2">
            <BadgeCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium">Đã gắn {selectedCertificate.code}</p>
              <p className="text-xs text-muted-foreground">
                Thời hạn: {formatDate(selectedCertificate.warrantyStartAt) ?? '—'}
                {' → '}
                {formatDate(selectedCertificate.warrantyEndAt) ?? '—'}
              </p>
              {selectedCertificate.handover && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <LinkIcon className="size-3" />
                  Bàn giao {selectedCertificate.handover.code}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {prefill ? (
        <WarrantyTicketCreateForm
          key={contextKey}
          prefill={prefill}
          cancelHref="/warranty"
          contextNote={
            selectedCertificate
              ? `Phiếu bảo hành: ${selectedCertificate.code}`
              : 'Tạo trực tiếp từ khách hàng, chưa gắn phiếu bảo hành'
          }
        />
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
          Chọn khách hàng để nhập nội dung yêu cầu, người liên hệ và người xử lý.
        </div>
      )}
    </div>
  );
}
