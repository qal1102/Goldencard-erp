import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasRole } from '@/lib/auth/roles';
import { recordQuotationExportAction } from '@/modules/quotations/actions/quotation.actions';
import {
  buildQuotationExportData,
  buildQuotationXlsxBuffer,
} from '@/modules/quotations/lib/quotation-export';

const QUOTATION_EXPORT_ROLES = [
  'admin',
  'director',
  'sales',
  'chief_accountant',
] as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasRole(session.user.roles ?? [], ...QUOTATION_EXPORT_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  if (format !== 'xlsx') {
    return NextResponse.json(
      { error: 'Chỉ hỗ trợ format=xlsx' },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const exportData = await buildQuotationExportData(id);
    const buffer = await buildQuotationXlsxBuffer(exportData);

    const recordResult = await recordQuotationExportAction(id, { format: 'xlsx' });
    if (!recordResult.success) {
      return NextResponse.json({ error: recordResult.error }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportData.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[GET /api/quotations/[id]/export]', e);
    const message = e instanceof Error ? e.message : 'Lỗi hệ thống';
    const status = message === 'Không tìm thấy báo giá' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
