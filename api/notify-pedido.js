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

  const { categoria, descricao, publicoAlvo, cidade } = req.body || {};
  if (!categoria) {
    res.status(400).json({ error: 'categoria é obrigatória' });
    return;
  }

  try {
    let playerIds;
    let heading;

    if (publicoAlvo === 'pro') {
      // Demanda de mão de obra (empresa Plus) — só profissionais com
      // assinatura Multi Pro ativa/trial, nunca empresas parceiras nem
      // Multi Autônomo (mesma restrição aplicada no filtro do mural).
      const { data: assinaturasPro, error: assinaturasError } = await supabase
        .from('assinaturas')
        .select('titular_email')
        .eq('titular_tipo', 'usuario')
        .eq('plano', 'pro')
        .in('status', ['trial', 'ativa']);
      if (assinaturasError) throw assinaturasError;

      const emailsPro = (assinaturasPro || []).map(a => a.titular_email).filter(Boolean);
      if (emailsPro.length === 0) {
        res.status(200).json({ sent: 0 });
        return;
      }

      // Demanda precisa de cidade pra saber quem avisar — profissional sem
      // cidade combatível não recebe (evita ruído fora da região dele).
      let query = supabase
        .from('usuarios')
        .select('onesignal_player_id')
        .eq('role', 'professional')
        .contains('categoria_servico', [categoria])
        .eq('status', true)
        .in('email', emailsPro)
        .not('onesignal_player_id', 'is', null);
      if (cidade) query = query.ilike('city', cidade);
      const { data: profissionaisPro, error: profissionaisError } = await query;
      if (profissionaisError) throw profissionaisError;

      playerIds = [...new Set((profissionaisPro || []).map(p => p.onesignal_player_id).filter(Boolean))];
      heading = 'Nova demanda de empresa na sua categoria!';
    } else {
      const [{ data: empresas, error: empresasError }, { data: profissionais, error: profissionaisError }] = await Promise.all([
        supabase
          .from('empresas')
          .select('onesignal_player_id')
          .contains('categoria_servico', [categoria])
          .eq('status', true)
          .eq('ativo', true)
          .not('onesignal_player_id', 'is', null),
        supabase
          .from('usuarios')
          .select('onesignal_player_id')
          .eq('role', 'professional')
          .contains('categoria_servico', [categoria])
          .eq('status', true)
          .not('onesignal_player_id', 'is', null),
      ]);

      if (empresasError) throw empresasError;
      if (profissionaisError) throw profissionaisError;

      playerIds = [...new Set([
        ...(empresas || []).map(e => e.onesignal_player_id),
        ...(profissionais || []).map(p => p.onesignal_player_id),
      ].filter(Boolean))];
      heading = 'Novo pedido na sua categoria!';
    }

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
        headings: { en: heading, pt: heading },
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
