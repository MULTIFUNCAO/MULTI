import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nlpfjkxqypveontunrxj.supabase.co',
  'sb_publishable_xPCSGVYs-yI7TGS1F2EhFg_x7lMm30Q'
);

const ONESIGNAL_APP_ID = '184f4647-8fbd-427d-8a8e-60f5aa38243c';

// Chamado depois que uma empresa/cliente escolhe uma proposta — avisa os
// outros candidatos (já marcados como "recusada") que a vaga foi preenchida.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!restApiKey) {
    res.status(500).json({ error: 'ONESIGNAL_REST_API_KEY não configurada' });
    return;
  }

  const { emails } = req.body || {};
  if (!Array.isArray(emails) || emails.length === 0) {
    res.status(200).json({ sent: 0 });
    return;
  }

  try {
    const { data: profissionais, error } = await supabase
      .from('usuarios')
      .select('onesignal_player_id')
      .in('email', emails)
      .not('onesignal_player_id', 'is', null);
    if (error) throw error;

    const playerIds = [...new Set((profissionais || []).map(p => p.onesignal_player_id).filter(Boolean))];
    if (playerIds.length === 0) {
      res.status(200).json({ sent: 0 });
      return;
    }

    const heading = 'Vaga preenchida';
    const content = 'Essa oportunidade já foi preenchida por outro profissional. Obrigado pelo interesse!';

    const oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: heading, pt: heading },
        contents: { en: content, pt: content },
      }),
    });

    const data = await oneSignalRes.json();
    res.status(200).json({ sent: playerIds.length, oneSignal: data });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
