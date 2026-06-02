/**
 * Returns unique user ids, optionally excluding the actor.
 */
export function dedupeRecipients(
  userIds: Array<string | null | undefined>,
  actorUserId?: string | null,
  options?: { includeActor?: boolean },
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of userIds) {
    if (!id) continue;
    if (!options?.includeActor && actorUserId && id === actorUserId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}
