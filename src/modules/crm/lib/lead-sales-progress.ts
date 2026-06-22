import { CALL_RESULT_LABELS, LEAD_STATUS_LABELS, type CallResult, type LeadStatus } from '../schema/lead.schema';

type LeadSalesProgressSource = {
  status: string;
  lastContactedAt?: Date | string | null;
  lastCallResult?: string | null;
  followUpAt?: Date | string | null;
};

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: Date) {
  return value.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCallResultLabel(value?: string | null) {
  if (!value) return null;
  return CALL_RESULT_LABELS[value as CallResult] ?? value;
}

export function getLeadSalesProgress(lead: LeadSalesProgressSource, now = new Date()) {
  const status = lead.status as LeadStatus;
  const lastContactedAt = toDate(lead.lastContactedAt);
  const followUpAt = toDate(lead.followUpAt);
  const callResultLabel = getCallResultLabel(lead.lastCallResult);
  const isTerminal = status === 'won' || status === 'lost';
  const isFollowUpOverdue = Boolean(followUpAt && followUpAt.getTime() < now.getTime() && !isTerminal);

  let nextAction = 'Cập nhật bước tiếp theo';
  if (status === 'new' && !lastContactedAt) nextAction = 'Gọi khách lần đầu';
  else if (isFollowUpOverdue) nextAction = 'Quá hẹn gọi lại, cần xử lý';
  else if (lead.lastCallResult === 'call_back') nextAction = 'Gọi lại theo lịch hẹn';
  else if (lead.lastCallResult === 'no_answer') nextAction = 'Gọi lại hoặc nhắn Zalo';
  else if (lead.lastCallResult === 'consulted') nextAction = 'Chốt nhu cầu và hẹn khảo sát';
  else if (lead.lastCallResult === 'survey_agreed') nextAction = 'Tạo hoặc theo dõi phiếu khảo sát';
  else if (lead.lastCallResult === 'not_interested' || lead.lastCallResult === 'wrong_number') {
    nextAction = 'Xác nhận và đóng cơ hội nếu cần';
  } else if (status === 'contacting') nextAction = 'Ghi kết quả liên hệ';
  else if (status === 'consulting') nextAction = 'Chốt nhu cầu khảo sát';
  else if (status === 'awaiting_survey') nextAction = 'Theo dõi khảo sát';
  else if (status === 'quoted') nextAction = 'Theo dõi phản hồi báo giá';
  else if (status === 'negotiating') nextAction = 'Đàm phán và chốt quyết định';
  else if (status === 'won') nextAction = 'Đã chốt, theo dõi hợp đồng';
  else if (status === 'lost') nextAction = 'Đã đóng cơ hội';

  return {
    statusLabel: LEAD_STATUS_LABELS[status] ?? lead.status,
    lastContactLabel: lastContactedAt ? formatDateTime(lastContactedAt) : 'Chưa liên hệ',
    callResultLabel: callResultLabel ?? 'Chưa có kết quả gọi',
    followUpLabel: followUpAt ? formatDateTime(followUpAt) : 'Chưa hẹn lại',
    isFollowUpOverdue,
    nextAction,
  };
}
