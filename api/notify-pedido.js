import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nlpfjkxqypveontunrxj.supabase.co',
  'sb_publishable_xPCSGVYs-yI7TGS1F2EhFg_x7lMm30Q'
);

const ONESIGNAL_APP_ID = '184f4647-8fbd-427d-8a8e-60f5aa38243c';

// Chamado pelo client logo após criar um pedido. Notifica, via OneSignal, as
// empresas parceiras E os profissionais online cuja categoria_servico bate
// com a do pedido.
// A REST API Key nunca chega ao browser — só existe aqui, como variável de
// ambiente do servidor (Vercel → Settings → Environment Variables).
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

  const { categoria, descricao } = req.body || {};
  if (!categoria) {
    res.status(400).json({ error: 'categoria é obrigatória' });
    return;
  }

  try {
    const [{ data: empresas, error: empresasError }, { data: profissionais, error: profissionaisError }] = await Promise.all([
      supabase
        .from('empresas')
        .select('onesignal_player_id')
        .ilike('categoria_servico', categoria)
        .eq('status', true)
        .eq('ativo', true)
        .not('onesignal_player_id', 'is', null),
      supabase
        .from('usuarios')
        .select('onesignal_player_id')
        .eq('role', 'professional')
        .ilike('categoria_servico', categoria)
        .eq('status', true)
        .not('onesignal_player_id', 'is', null),
    ]);

    if (empresasError) throw empresasError;
    if (profissionaisError) throw profissionaisError;

    const playerIds = [...new Set([
      ...(empresas || []).map(e => e.onesignal_player_id),
      ...(profissionais || []).map(p => p.onesignal_player_id),
    ].filter(Boolean))];
    if (playerIds.length === 0) {
      res.status(200).json({ sent: 0 });
      return;
    }

    const oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds,
        headings: { en: 'Novo pedido na sua categoria!', pt: 'Novo pedido na sua categoria!' },
        contents: {
          en: descricao || 'Um cliente publicou um novo serviço.',
          pt: descricao || 'Um cliente publicou um novo serviço.',
        },
      }),
    });

    const data = await oneSignalRes.json();
    res.status(200).json({ sent: playerIds.length, oneSignal: data });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
