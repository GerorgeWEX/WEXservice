// Skeleton only (M0). Real HTML -> PDF rendering lands in M2.
export default function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined> },
  res: { status(code: number): { json(body: unknown): void } },
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (req.headers['x-pdf-secret'] !== process.env.PDF_SERVICE_SECRET)
    return res.status(401).json({ error: 'unauthorized' });
  return res.status(501).json({ error: 'not_implemented' });
}
