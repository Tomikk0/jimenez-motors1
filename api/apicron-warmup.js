export default async function handler(req, res) {
  try {
    // Meghívja a neon-query API-t belülről (POST módszerrel)
    await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://jimenez-motors1.vercel.app'}/api/neon-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cars',
        action: 'select',
        columns: 'id',
        expect: 'maybeSingle'
      }),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Cron warmup failed', err);
    return res.status(500).json({ error: err.message });
  }
}
