import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryQuotationBySurveyId } from '@/modules/quotations/lib/quotation.queries';
import { ReplaceLink } from '@/components/navigation/replace-link';
import { QuotationForm } from '@/modules/quotations/components/quotation-form';
import { buildSurveyTechnicalSource } from '@/modules/quotations/lib/generate-quotation-items';
import { querySurveyById } from '@/modules/surveys/lib/survey.queries';
import { queryActiveInventoryItemOptions } from '@/modules/inventory/lib/inventory-item.queries';
import { queryActiveQuotationPriceOptions } from '@/modules/quotations/lib/quotation-price-catalog.queries';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NewQuotationPage({ searchParams }: Props) {
  const session = await auth();
  const roles = session?.user?.roles ?? [];

  if (!hasRole(roles, 'admin', 'director', 'sales', 'chief_accountant')) {
    redirect('/quotations');
  }

  const { surveyId } = await searchParams;
  const resolvedSurveyId = Array.isArray(surveyId) ? surveyId[0] : surveyId;

  if (!resolvedSurveyId) {
    redirect('/quotations');
  }

  const [survey, existingQuotation, inventoryItems, priceCatalogItems] = await Promise.all([
    querySurveyById(resolvedSurveyId),
    queryQuotationBySurveyId(resolvedSurveyId),
    queryActiveInventoryItemOptions(),
    queryActiveQuotationPriceOptions(),
  ]);

  if (!survey) redirect('/quotations');
  if (survey.status !== 'completed') redirect(`/surveys/${resolvedSurveyId}`);
  if (existingQuotation) redirect(`/quotations/${existingQuotation.id}`);

  // Snapshot source: customer takes priority, fall back to lead for lead-origin surveys
  const snapshotName = survey.customer?.fullName ?? survey.lead?.fullName ?? '';
  const snapshotPhone = survey.customer?.phone ?? survey.lead?.phone ?? null;
  const snapshotAddress = survey.customer?.address ?? survey.lead?.address ?? null;

  const leadConsultation = survey.lead
    ? {
        customerRequirements: survey.lead.customerRequirements,
        consultationNote: survey.lead.consultationNote,
        preferredInstallTime: survey.lead.preferredInstallTime,
        followUpAt: survey.lead.followUpAt,
        lastCallResult: survey.lead.lastCallResult,
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <ReplaceLink
          href={`/surveys/${survey.id}`}
          className="text-xs text-primary hover:underline"
        >
          ← Quay lại khảo sát
        </ReplaceLink>
        <h1 className="mt-2 text-base font-semibold">Tạo báo giá mới</h1>
        <p className="text-xs text-muted-foreground">
          Từ khảo sát{' '}
          <span className="font-mono font-medium text-foreground">{survey.code}</span>
        </p>
      </div>

      <QuotationForm
        mode="create"
        survey={{
          id: survey.id,
          code: survey.code,
          customerName: snapshotName,
          customerPhone: snapshotPhone,
          customerAddress: snapshotAddress,
          technical: buildSurveyTechnicalSource(survey),
          photosNote: survey.photosNote,
          leadConsultation,
        }}
        inventoryItems={inventoryItems}
        priceCatalogItems={priceCatalogItems}
      />
    </div>
  );
}
