/**
 * True when linked survey data changed after this quotation was last updated.
 */
export function isQuotationStaleFromSurvey(input: {
  quotationUpdatedAt: Date;
  surveyUpdatedAt?: Date | null;
  latestSurveyEditAt?: Date | null;
}): boolean {
  const quotationMs = input.quotationUpdatedAt.getTime();
  if (input.surveyUpdatedAt && input.surveyUpdatedAt.getTime() > quotationMs) {
    return true;
  }
  if (input.latestSurveyEditAt && input.latestSurveyEditAt.getTime() > quotationMs) {
    return true;
  }
  return false;
}

export function computeLatestSurveyEditAt(
  editLogs: { editedAt: Date }[] | undefined,
): Date | null {
  if (!editLogs?.length) return null;
  return editLogs.reduce(
    (latest, log) => (log.editedAt > latest ? log.editedAt : latest),
    editLogs[0].editedAt,
  );
}
