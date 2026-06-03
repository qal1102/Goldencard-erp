import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { QuotationForm } from '@/modules/quotations/components/quotation-form';
import { queryQuotationById } from '@/modules/quotations/lib/quotation.queries';
import { buildSurveyTechnicalSource } from '@/modules/quotations/lib/generate-quotation-items';
import { isQuotationEditable } from '@/modules/quotations/lib/quotation-resend';
import { querySurveyById } from '@/modules/surveys/lib/survey.queries';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditQuotationPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant')) {
    redirect(`/quotations/${id}`);
  }

  const quotation = await queryQuotationById(id);

  if (!quotation) redirect('/quotations');

  if (!isQuotationEditable(quotation.status)) {
    redirect(`/quotations/${id}`);
  }

  const surveyRef = quotation.survey;
  const surveyId = surveyRef && !Array.isArray(surveyRef) ? surveyRef.id : null;
  const linkedSurvey = surveyId != null ? await querySurveyById(surveyId) : null;

  const isSentEdit = quotation.status === 'sent';

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Chỉnh sửa báo giá</h1>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground">{quotation.code}</span>
          {' — '}
          {quotation.customerNameSnapshot}
        </p>
      </div>

      {(() => {
        // Back-calculate discountValue and vatRate from stored computed amounts.
        // We can't recover the original discountType, so we default to 'amount'
        // (the user can switch to percent if needed).
        const storedSubtotal = parseFloat(quotation.subtotal ?? '0');
        const storedDiscount = parseFloat(quotation.discountAmount ?? '0');
        const storedTax = parseFloat(quotation.taxAmount ?? '0');
        const taxableAmount = storedSubtotal - storedDiscount;
        // Round to 2 dp to avoid floating-point noise (e.g. 7.999999 → 8)
        const inferredVatRate =
          taxableAmount > 0
            ? Math.round((storedTax / taxableAmount) * 100 * 100) / 100
            : 0;

        return (
          <QuotationForm
            mode="edit"
            quotationId={id}
            isSentEdit={isSentEdit}
            survey={{
              id: surveyId ?? '',
              code: surveyRef && !Array.isArray(surveyRef) ? surveyRef.code : '',
              customerName: quotation.customerNameSnapshot,
              customerPhone: quotation.customerPhoneSnapshot ?? null,
              customerAddress: quotation.customerAddressSnapshot ?? null,
              technical: linkedSurvey
                ? buildSurveyTechnicalSource(linkedSurvey)
                : {
                    recommendedSystemKw: null,
                    panelWattageW: null,
                    recommendedPanelQuantity: null,
                    inverterType: null,
                    inverterQuantity: null,
                    systemType: null,
                    powerPhase: null,
                    needsRoofReinforcement: null,
                    needsElectricalCabinetUpgrade: null,
                    hasGrounding: null,
                    installationDifficulty: null,
                    extraMaterialsNote: null,
                    installationPlanNote: null,
                    projectType: null,
                    projectScale: null,
                    roofAreaM2: null,
                  },
              photosNote: linkedSurvey?.photosNote ?? null,
              leadConsultation: linkedSurvey?.lead
                ? {
                    customerRequirements: linkedSurvey.lead.customerRequirements,
                    consultationNote: linkedSurvey.lead.consultationNote,
                    preferredInstallTime: linkedSurvey.lead.preferredInstallTime,
                    followUpAt: linkedSurvey.lead.followUpAt,
                    lastCallResult: linkedSurvey.lead.lastCallResult,
                  }
                : null,
            }}
            defaultValues={{
              validUntil: quotation.validUntil ?? '',
              note: quotation.note ?? '',
              discountType: 'amount',
              discountValue: storedDiscount,
              vatRate: inferredVatRate,
              editNote: '',
              items: (quotation.items ?? []).map((item) => ({
                productName: item.productName,
                description: item.description ?? '',
                quantity: parseFloat(item.quantity),
                unit: item.unit,
                unitPrice: parseFloat(item.unitPrice),
              })),
            }}
          />
        );
      })()}
    </div>
  );
}
