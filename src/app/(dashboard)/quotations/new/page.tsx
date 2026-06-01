import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { queryQuotationBySurveyId } from '@/modules/quotations/lib/quotation.queries';
import { QuotationForm } from '@/modules/quotations/components/quotation-form';
import { buildSurveyTechnicalSource } from '@/modules/quotations/lib/generate-quotation-items';
import { querySurveyById } from '@/modules/surveys/lib/survey.queries';

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

  const [survey, existingQuotation] = await Promise.all([
    querySurveyById(resolvedSurveyId),
    queryQuotationBySurveyId(resolvedSurveyId),
  ]);

  if (!survey) redirect('/quotations');
  if (survey.status !== 'completed') redirect(`/surveys/${resolvedSurveyId}`);
  if (existingQuotation) redirect(`/quotations/${existingQuotation.id}`);

  // Snapshot source: customer takes priority, fall back to lead for lead-origin surveys
  const snapshotName = survey.customer?.fullName ?? survey.lead?.fullName ?? '';
  const snapshotPhone = survey.customer?.phone ?? survey.lead?.phone ?? null;
  const snapshotAddress = survey.customer?.address ?? survey.lead?.address ?? null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4">
        <h1 className="text-base font-semibold">Tạo báo giá mới</h1>
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
        }}
      />
    </div>
  );
}
