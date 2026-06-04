import 'server-only';

import { createNotificationsForUsers } from './create-notification';
import { dedupeRecipients } from './dedupe-recipients';
import type { CreateNotificationInput } from './types';

export type TitleBody = { title: string; body: string };

export type CategoryBatch = {
  recipientUserIds: Array<string | null | undefined>;
  titleBody: TitleBody;
};

type CommonPayload = Omit<CreateNotificationInput, 'recipientUserId' | 'title' | 'body'>;

/**
 * Sends category-specific title/body per batch. Earlier batches win for duplicate user ids
 * (e.g. lead owner who is also admin gets sales wording, not oversight).
 */
export async function notifyCategoryBatches(
  batches: CategoryBatch[],
  payload: CommonPayload,
  actorUserId?: string | null,
): Promise<void> {
  const alreadyNotified = new Set<string>();

  for (const batch of batches) {
    const recipients = dedupeRecipients(batch.recipientUserIds, actorUserId).filter(
      (id) => !alreadyNotified.has(id),
    );
    if (recipients.length === 0) continue;

    await createNotificationsForUsers(
      recipients,
      {
        ...payload,
        title: batch.titleBody.title,
        body: batch.titleBody.body,
      },
      { actorUserId },
    );

    for (const id of recipients) {
      alreadyNotified.add(id);
    }
  }
}
