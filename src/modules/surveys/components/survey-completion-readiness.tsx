import type { SurveyCompletionRequirements } from '../lib/survey-completion-requirements';

type Props = {
  requirements: SurveyCompletionRequirements;
  className?: string;
};

export function SurveyCompletionReadinessPanel({ requirements, className }: Props) {
  if (requirements.canComplete) {
    if (requirements.warnings.length === 0) return null;
    return (
      <div
        className={
          className ??
          'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30'
        }
      >
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Lưu ý</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-800 dark:text-amber-300">
          {requirements.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        'rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30'
      }
    >
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        Chưa thể hoàn thành khảo sát
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        Cần bổ sung trước khi hoàn thành:
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-amber-900 dark:text-amber-200">
        {requirements.missingReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {requirements.warnings.length > 0 && (
        <>
          <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300">Lưu ý</p>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-amber-800 dark:text-amber-300">
            {requirements.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
