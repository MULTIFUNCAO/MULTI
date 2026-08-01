import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nlpfjkxqypveontunrxj.supabase.co',
  'sb_publishable_xPCSGVYs-yI7TGS1F2EhFg_x7lMm30Q'
);

const ONESIGNAL_APP_ID = '184f4647-8fbd-427d-8a8e-60f5aa38243c';

// Chamado logo depois que o cliente/empresa aceita a proposta de um
// profissional — avisa esse profissional (o vencedor) que sua proposta
// foi aceita. Espelha o padrão de notify-recusado.js, mas para quem ganhou.
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

  const { email, servico } = req.body || {};
  if (!email) {
    res.status(200).json({ sent: 0 });
    return;
  }

  try {
    const { data: profissional, error } = await supabase
      .from('usuarios')
      .select('onesignal_player_id')
      .eq('email', email)
      .not('onesignal_player_id', 'is', null)
      .maybeSingle();
    if (error) throw error;

    const playerId = profissional?.onesignal_player_id;
    if (!playerId) {
      res.status(200).json({ sent: 0 });
      return;
    }

    const heading = 'Proposta aceita! 🎉';
    const content = servico
      ? `O cliente aceitou sua proposta para "${servico}". Toque para ver os detalhes.`
      : 'O cliente aceitou sua proposta. Toque para ver os detalhes.';

    const oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: heading, pt: heading },
        contents: { en: content, pt: content },
      }),
    });

    const data = await oneSignalRes.json();
    res.status(200).json({ sent: 1, oneSignal: data });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
