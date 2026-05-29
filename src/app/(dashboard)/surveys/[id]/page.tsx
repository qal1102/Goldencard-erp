import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { querySurveyById } from '@/modules/surveys/lib/survey.queries';
import { SurveyDetail } from '@/modules/surveys/components/survey-detail';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SurveyDetailPage({ params }: Props) {
  const { id } = await params;

  const [session, survey] = await Promise.all([auth(), querySurveyById(id)]);
  if (!survey) notFound();

  const roles = session?.user?.roles ?? [];
  const userId = session?.user?.id ?? '';

  // Technician can only view surveys assigned to them
  const isTechnician =
    hasRole(roles, 'technician') && !hasRole(roles, 'admin', 'director', 'sales');
  if (isTechnician && survey.assignedTo !== userId) notFound();

  const canManage = hasRole(roles, 'admin', 'director', 'sales');

  return (
    <div className="mx-auto w-full max-w-xl">
      <SurveyDetail
        surveyId={id}
        canManage={canManage}
        isTechnician={isTechnician}
        userId={userId}
      />
    </div>
  );
}
