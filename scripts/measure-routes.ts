/**
 * Server-side query benchmark (no HTTP). Run: npm run perf:routes
 * Requires DATABASE_URL in .env.local. Does not log secrets.
 */
import { config } from 'dotenv';
import { performance } from 'node:perf_hooks';

config({ path: '.env.local' });

type BenchResult = {
  route: string;
  dbMs: number;
  dbQueryCount: number;
  slowestDbMs: number;
  slowestDbName: string;
  rowCount: number;
  serverSecondFetch: string;
  headerNotification: string;
  notes: string;
};

async function time<T>(name: string, fn: () => Promise<T>): Promise<{ name: string; ms: number; result: T }> {
  const t0 = performance.now();
  const result = await fn();
  return { name, ms: performance.now() - t0, result };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing — add .env.local');
    process.exit(1);
  }

  const { count, desc, eq } = await import('drizzle-orm');
  const { db } = await import('../src/db');
  const {
    contracts,
    customers,
    handovers,
    leads,
    notifications,
    quotations,
    surveys,
    users,
    warrantyCertificates,
    warrantyTickets,
    workOrders,
  } = await import('../src/db/schema');

  const samples: BenchResult[] = [];

  async function bench(
    route: string,
    opts: {
      serverSecondFetch: string;
      headerNotification: string;
      notes: string;
      queries: Array<{ name: string; fn: () => Promise<{ rows: number }> }>;
    },
  ) {
    const timings: Array<{ name: string; ms: number; rows: number }> = [];
    for (const q of opts.queries) {
      try {
        const t = await time(q.name, q.fn);
        timings.push({ name: t.name, ms: t.ms, rows: t.result.rows });
      } catch (error) {
        const msg = error instanceof Error ? error.message.slice(0, 80) : 'error';
        timings.push({ name: q.name + ' (failed)', ms: 0, rows: 0 });
        console.warn(`[perf] ${route} ${q.name}: ${msg}`);
      }
    }
    const dbMs = timings.reduce((s, t) => s + t.ms, 0);
    const slowest = timings.reduce((a, b) => (b.ms > a.ms ? b : a), { name: '—', ms: 0, rows: 0 });
    samples.push({
      route,
      dbMs: Math.round(dbMs),
      dbQueryCount: timings.length,
      slowestDbMs: Math.round(slowest.ms),
      slowestDbName: slowest.name,
      rowCount: timings.reduce((max, t) => Math.max(max, t.rows), 0),
      serverSecondFetch: opts.serverSecondFetch,
      headerNotification: opts.headerNotification,
      notes: opts.notes,
    });
  }

  const unreadBench = await time('db:unreadNotificationCount', async () => {
    const [row] = await db
      .select({ value: count() })
      .from(notifications)
      .where(eq(notifications.isRead, false));
    return { rows: Number(row?.value ?? 0) };
  });

  await bench('/dashboard', {
    serverSecondFetch: 'No',
    headerNotification: 'Yes (client, ~' + Math.round(unreadBench.ms) + 'ms DB)',
    notes: 'Static RSC; layout verifySession only',
    queries: [],
  });

  await bench('/crm/leads', {
    serverSecondFetch: 'Yes — useLeads + useProjectProgressForLeads',
    headerNotification: 'Yes (client)',
    notes: 'App query: LIMIT 500 + assignedUser + createdByUser joins',
    queries: [
      {
        name: 'db:leads_list',
        fn: async () => ({
          rows: (
            await db.query.leads.findMany({
              with: {
                assignedUser: { columns: { id: true, name: true } },
                createdByUser: { columns: { id: true, name: true } },
              },
              orderBy: [desc(leads.createdAt)],
              limit: 500,
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/crm/customers', {
    serverSecondFetch: 'Yes — useCustomers (client-only page)',
    headerNotification: 'Yes (client)',
    notes: 'NO LIMIT; linkedLeads per customer',
    queries: [
      {
        name: 'db:customers_list',
        fn: async () => ({
          rows: (
            await db.query.customers.findMany({
              with: {
                lead: { columns: { id: true, code: true } },
                linkedLeads: { columns: { id: true, code: true, status: true, createdAt: true } },
              },
              orderBy: [desc(customers.createdAt)],
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/surveys', {
    serverSecondFetch: 'Yes — useSurveys',
    headerNotification: 'Yes (client)',
    notes: 'NO LIMIT; includes survey zones',
    queries: [
      {
        name: 'db:surveys_list',
        fn: async () => ({
          rows: (
            await db.query.surveys.findMany({
              with: {
                customer: { columns: { id: true, code: true, fullName: true } },
                zones: true,
              },
              orderBy: [desc(surveys.createdAt)],
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/quotations', {
    serverSecondFetch: 'Yes — useQuotations',
    headerNotification: 'Yes (client)',
    notes: 'NO LIMIT',
    queries: [
      {
        name: 'db:quotations_list',
        fn: async () => ({
          rows: (
            await db.query.quotations.findMany({
              with: { customer: { columns: { id: true, code: true, fullName: true } } },
              orderBy: [desc(quotations.createdAt)],
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/contracts', {
    serverSecondFetch: 'Yes — useContracts',
    headerNotification: 'Yes (client)',
    notes: 'NO LIMIT',
    queries: [
      {
        name: 'db:contracts_list',
        fn: async () => ({
          rows: (
            await db.query.contracts.findMany({
              with: { customer: { columns: { id: true, code: true, fullName: true } } },
              orderBy: [desc(contracts.createdAt)],
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/inventory', {
    serverSecondFetch: 'No',
    headerNotification: 'Yes (client)',
    notes: 'Placeholder only',
    queries: [],
  });

  await bench('/work-orders', {
    serverSecondFetch: 'Partial — server initialData + client refetch',
    headerNotification: 'Yes (client)',
    notes: 'LIMIT 200',
    queries: [
      {
        name: 'db:work_orders_list',
        fn: async () => ({
          rows: (
            await db.query.workOrders.findMany({
              orderBy: [desc(workOrders.createdAt)],
              limit: 200,
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/handovers', {
    serverSecondFetch: 'Partial — server initialData + client refetch',
    headerNotification: 'Yes (client)',
    notes: 'LIMIT 200',
    queries: [
      {
        name: 'db:handovers_list',
        fn: async () => ({
          rows: (
            await db.query.handovers.findMany({
              orderBy: [desc(handovers.createdAt)],
              limit: 200,
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/warranty', {
    serverSecondFetch: 'Partial — server initialData + client refetch',
    headerNotification: 'Yes (client)',
    notes: 'LIMIT 200',
    queries: [
      {
        name: 'db:warranty_tickets_list',
        fn: async () => ({
          rows: (
            await db.query.warrantyTickets.findMany({
              orderBy: [desc(warrantyTickets.createdAt)],
              limit: 200,
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/warranty-certificates', {
    serverSecondFetch: 'Partial — server initialData + client refetch',
    headerNotification: 'Yes (client)',
    notes: 'LIMIT 200',
    queries: [
      {
        name: 'db:warranty_certificates_list',
        fn: async () => ({
          rows: (
            await db.query.warrantyCertificates.findMany({
              orderBy: [desc(warrantyCertificates.createdAt)],
              limit: 200,
            })
          ).length,
        }),
      },
    ],
  });

  await bench('/admin/users', {
    serverSecondFetch: 'Partial — server initialData + client refetch',
    headerNotification: 'Yes (client)',
    notes: '+ super-admin DB check on page',
    queries: [
      {
        name: 'db:admin_users_list',
        fn: async () => ({
          rows: (
            await db
              .select({ id: users.id })
              .from(users)
              .orderBy(desc(users.createdAt))
              .limit(200)
          ).length,
        }),
      },
      {
        name: 'db:super_admin_lookup',
        fn: async () => {
          await db.query.users.findFirst({
            columns: { id: true, isActive: true, isSuperAdmin: true },
          });
          return { rows: 0 };
        },
      },
    ],
  });

  console.log('\n=== GoldenCard ERP — DB benchmark (local, ' + new Date().toISOString() + ') ===\n');
  console.log('Unread notification count query: ' + Math.round(unreadBench.ms) + 'ms\n');
  console.log(
    '| Route | DB time | Queries | Slowest | Rows | 2nd client fetch | Header notif | Notes |',
  );
  console.log(
    '|-------|---------|---------|---------|------|------------------|----------------|-------|',
  );
  for (const s of samples) {
    console.log(
      `| ${s.route} | ${s.dbMs}ms | ${s.dbQueryCount} | ${s.slowestDbName} ${s.slowestDbMs}ms | ${s.rowCount} | ${s.serverSecondFetch} | ${s.headerNotification} | ${s.notes} |`,
    );
  }

  console.log(`
Auth/session (code audit):
- Layout: verifySession() uses React cache → one auth() per RSC request when pages use verifySession/getAuthSession
- Pages calling auth() directly (surveys, quotations, contracts, many detail pages): extra auth() NOT deduped with getAuthSession
- JWT may re-query users table every 60s (USER_STATUS_REFRESH_MS) inside auth()
- admin/users: verifySession + assertSuperAdminFromDb (extra DB)

Client (every dashboard navigation):
- NotificationBell: useUnreadNotificationCount() → server action + auth + COUNT query (~${Math.round(unreadBench.ms)}ms measured)
- List open: useNotifications only when bell opened (not blocking initial paint)

Estimated total perceived delay ≈ server DB above + auth (~20–80ms) + Vercel cold/warm (+0–800ms) + client hydration + notification fetch

Live perf logs: PERF_LOG=1 npm run dev
Production-safe: set PERF_LOG=1 on Vercel preview only (JSON logs, no secrets)
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
