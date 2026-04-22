/**
 * ProUpgrade.jsx — Componente React com PIX real via Asaas
 *
 * Substitua o componente ProUpgrade no seu multi-app.jsx por este.
 * Configuração: defina VITE_API_URL no .env do projeto React:
 *   VITE_API_URL=http://localhost:3001         (desenvolvimento)
 *   VITE_API_URL=https://api.multifuncao.com.br (produção)
 */

import { useState, useEffect, useRef } from "react";
import {
  Crown, Check, ArrowLeft, CheckCircle2,
  Shield, Bell, Star, TrendingUp, MessageCircle,
  BadgeCheck, Copy, RefreshCw, AlertCircle,
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const B = "#007BFF";
const O = "#FF5722";
const G = "#22c55e";

const PLANS = [
  { id:"monthly",   label:"Mensal",     price:"29,90", period:"/mês",     badge:null,            value:29.90  },
  { id:"quarterly", label:"Trimestral", price:"79,90", period:"/3 meses", badge:"Economize 11%", value:79.90  },
  { id:"annual",    label:"Anual",      price:"249,90",period:"/ano",     badge:"🏆 Melhor valor!", value:249.90 },
];

const BENEFITS = [
  { Icon:Shield,        label:"Ver contato completo do cliente",  sub:"Telefone e e-mail liberados"     },
  { Icon:MessageCircle, label:"Chat direto e ilimitado",          sub:"Converse antes de aceitar"       },
  { Icon:BadgeCheck,    label:"Selo PRO verificado no perfil",    sub:"Mais confiança para o cliente"   },
  { Icon:TrendingUp,    label:"Destaque no mural de serviços",    sub:"Apareça primeiro nas buscas"     },
  { Icon:Bell,          label:"Alertas em tempo real",            sub:"Não perca nenhuma oportunidade"  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function ProUpgrade({ onBack, onSubscribe, userName, userPhone }) {
  const [step,    setStep]    = useState("plans"); // plans | loading | pix | done | error
  const [sel,     setSel]     = useState("monthly");
  const [pix,     setPix]     = useState(null);    // resposta da API
  const [seconds, setSeconds] = useState(300);
  const [copied,  setCopied]  = useState(false);
  const [polling, setPolling] = useState(false);
  const [errMsg,  setErrMsg]  = useState("");
  const pollRef = useRef(null);

  const chosen = PLANS.find(p => p.id === sel);

  // ── Countdown ──
  useEffect(() => {
    if (step !== "pix") return;
    if (seconds <= 0)   return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, seconds]);

  // ── Polling de status (verifica a cada 4s se PIX foi pago) ──
  useEffect(() => {
    if (step !== "pix" || !pix?.paymentId) return;

    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/status-pagamento/${pix.paymentId}`);
        const data = await r.json();
        if (data.isPaid) {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep("done");
          setTimeout(onSubscribe, 2500);
        }
      } catch (_) { /* ignora erros de rede no polling */ }
    }, 4000);

    return () => clearInterval(pollRef.current);
  }, [step, pix]);

  // ── Gerar PIX ──
  const handleAssinar = async () => {
    setStep("loading");
    setErrMsg("");

    try {
      // 1. Cria ou recupera o cliente no Asaas
      const clienteRes = await fetch(`${API}/api/criar-cliente`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:  userName  || "Usuário Multi",
          phone: userPhone || "11999999999",
        }),
      });

      if (!clienteRes.ok) throw new Error("Falha ao criar cliente");
      const { customerId } = await clienteRes.json();

      // 2. Gera cobrança PIX
      const pixRes = await fetch(`${API}/api/gerar-pix`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          customerId,
          plan:  sel,
          phone: userPhone || "11999999999",
        }),
      });

      if (!pixRes.ok) throw new Error("Falha ao gerar PIX");
      const pixData = await pixRes.json();

      setPix(pixData);
      setSeconds(300);
      setStep("pix");

    } catch (e) {
      setErrMsg(e.message || "Erro inesperado. Tente novamente.");
      setStep("error");
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(pix?.pixCode || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // TELA: Sucesso
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div style={S.fullDark}>
        <style>{`@keyframes pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}} .pop{animation:pop .5s ease-out forwards;}`}</style>
        <div className="pop" style={S.crownCircle}>
          <Crown size={52} color="#FDE68A" />
        </div>
        <h2 style={S.doneTitle}>Você é Multi PRO!</h2>
        <p style={S.doneSub}>
          Pagamento confirmado. 🎉<br />
          Assinatura Ativada — todos os contatos desbloqueados.
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", margin:"0 0 28px" }}>
          {["✅ Contatos","✅ Chat","✅ Selo PRO","✅ Mural"].map((b, i) => (
            <span key={i} style={S.badge}>{b}</span>
          ))}
        </div>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Redirecionando…</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TELA: Carregando
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div style={S.fullCenter}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={S.spinner} />
        <p style={{ fontWeight:800, color:"#1a1a2e", marginTop:20 }}>Gerando PIX…</p>
        <p style={{ fontSize:13, color:"#aaa" }}>Conectando ao Asaas</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TELA: Erro
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div style={S.fullCenter}>
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom:16 }} />
        <p style={{ fontWeight:800, color:"#EF4444", marginBottom:8 }}>Ops! Algo deu errado</p>
        <p style={{ fontSize:13, color:"#888", marginBottom:24, textAlign:"center" }}>{errMsg}</p>
        <button onClick={() => setStep("plans")} style={S.retryBtn}>
          <RefreshCw size={15} /> Tentar novamente
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TELA: PIX Real
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "pix") {
    const expired = seconds <= 0;
    return (
      <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

        {/* header escuro */}
        <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", padding:"16px 20px 22px" }}>
          <button onClick={() => setStep("plans")} style={S.backCircle}>
            <ArrowLeft size={17} color="white" />
          </button>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginTop:14 }}>
            <div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", margin:0 }}>Plano {chosen?.label}</p>
              <p style={{ fontSize:30, fontWeight:900, color:"white", margin:0 }}>R$ {chosen?.price}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:10, color:"rgba(255,255,255,.45)", margin:"0 0 3px", textTransform:"uppercase", letterSpacing:1 }}>
                {expired ? "Expirado" : "Expira em"}
              </p>
              <p style={{ fontSize:24, fontWeight:900, margin:0, color: expired ? "#EF4444" : seconds < 60 ? "#EF4444" : G, animation: seconds < 60 && !expired ? "blink 1s infinite" : "none" }}>
                {expired ? "00:00" : fmt(seconds)}
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex:1, padding:"22px 20px 40px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto" }}>
          {expired ? (
            /* PIX expirado */
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <p style={{ fontSize:16, fontWeight:800, color:"#EF4444", marginBottom:16 }}>⏰ PIX expirado</p>
              <button onClick={handleAssinar} style={{ ...S.primaryBtn, background:O }}>
                <RefreshCw size={16} /> Gerar novo PIX
              </button>
            </div>
          ) : (
            <>
              {/* QR Code real (base64 da API do Asaas) */}
              <div style={S.card}>
                <p style={{ fontSize:12, color:"#888", fontWeight:700, textAlign:"center", margin:"0 0 16px" }}>
                  Escaneie com o app do seu banco
                </p>

                {pix?.qrCodeBase64 ? (
                  /* QR Code real retornado pela API */
                  <img
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code PIX"
                    style={{ width:200, height:200, display:"block", margin:"0 auto 16px", borderRadius:12, border:"3px solid #1a1a2e" }}
                  />
                ) : (
                  /* Fallback se API não retornar imagem */
                  <div style={{ width:200, height:200, margin:"0 auto 16px", background:"#F8F9FA", borderRadius:12, border:"2px dashed #D1D5DB", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <p style={{ fontSize:11, color:"#aaa", textAlign:"center", padding:12 }}>QR Code indisponível — use o código abaixo</p>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"center" }}>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:99, padding:"5px 14px" }}>
                    {polling
                      ? <><div style={{ width:8, height:8, borderRadius:"50%", background:G, animation:"blink 1s infinite" }} /><span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>Aguardando pagamento…</span></>
                      : <><Check size={13} color={G} /><span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>PIX gerado com sucesso</span></>
                    }
                  </div>
                </div>
              </div>

              {/* Código copia e cola */}
              <div style={S.card}>
                <p style={{ fontSize:11, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>
                  Pix Copia e Cola
                </p>
                <div style={S.pixCodeBox}>
                  {pix?.pixCode
                    ? `${pix.pixCode.slice(0, 50)}...`
                    : "Código não disponível"}
                </div>
                <button onClick={handleCopy} style={{ ...S.primaryBtn, background: copied ? G : B, marginTop:12 }}>
                  {copied
                    ? <><Check size={15} /> Copiado!</>
                    : <><Copy size={15} /> Copiar código PIX</>}
                </button>
              </div>

              {/* Benefícios */}
              <div style={{ ...S.card, background:"#F5F3FF", border:"1px solid #DDD6FE" }}>
                <p style={{ fontSize:12, fontWeight:900, color:"#5B21B6", margin:"0 0 10px" }}>
                  Você está assinando:
                </p>
                {["Contatos desbloqueados", "Chat direto com clientes", "Selo PRO verificado", "Prioridade no mural"].map((b, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginBottom: i < 3 ? 6 : 0 }}>
                    <Check size={13} color="#7C3AED" />
                    <span style={{ fontSize:12, color:"#4C1D95", fontWeight:600 }}>{b}</span>
                  </div>
                ))}
              </div>

              <p style={{ textAlign:"center", fontSize:11, color:"#aaa" }}>
                O acesso PRO é liberado automaticamente em até 10 segundos após o pagamento.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TELA: Planos
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:"18px 16px 48px" }}>
      <button onClick={onBack} style={S.backBtn}>
        <ArrowLeft size={18} color="#888" />
      </button>

      {/* hero */}
      <div style={S.hero}>
        <div style={S.heroBg} />
        <Crown size={44} color="#FDE68A" style={{ margin:"0 auto 12px", display:"block", position:"relative", zIndex:1 }} />
        <h2 style={{ fontSize:26, fontWeight:900, color:"white", margin:"0 0 6px", position:"relative", zIndex:1 }}>Multi PRO</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,.7)", margin:0, position:"relative", zIndex:1 }}>Desbloqueie todo o potencial da plataforma</p>
      </div>

      {/* benefícios */}
      <div style={S.card}>
        <p style={{ fontWeight:900, color:"#1a1a2e", marginBottom:14, fontSize:14 }}>O que você ganha:</p>
        {BENEFITS.map(({ Icon, label, sub }, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < BENEFITS.length-1 ? "1px solid #F8F8F8" : "none" }}>
            <span style={{ width:36, height:36, borderRadius:10, background:"#7C3AED18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Icon size={16} color="#7C3AED" />
            </span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 1px" }}>{label}</p>
              <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{sub}</p>
            </div>
            <Check size={15} color={G} />
          </div>
        ))}
      </div>

      {/* seletor de planos */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {PLANS.map(p => (
          <div key={p.id} onClick={() => setSel(p.id)}
            style={{ borderRadius:16, padding:"14px 16px", border:`2px solid ${sel === p.id ? "#7C3AED" : "#EBEBEB"}`, background: sel === p.id ? "#F5F3FF" : "white", cursor:"pointer", position:"relative", transition:"all .15s" }}>
            {p.badge && (
              <span style={{ position:"absolute", top:-9, right:14, background: p.id === "annual" ? "#7C3AED" : O, color:"white", fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:99 }}>
                {p.badge}
              </span>
            )}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontWeight:800, color:"#1a1a2e", margin:"0 0 1px" }}>{p.label}</p>
                <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{p.period}</p>
              </div>
              <p style={{ fontSize:20, fontWeight:900, color: sel === p.id ? "#7C3AED" : "#1a1a2e", margin:0 }}>R$ {p.price}</p>
              <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${sel === p.id ? "#7C3AED" : "#DDD"}`, background: sel === p.id ? "#7C3AED" : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {sel === p.id && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={handleAssinar} style={{ ...S.primaryBtn, padding:"16px 0", fontSize:15, background:"linear-gradient(135deg,#7C3AED,#4F46E5)", boxShadow:"0 6px 20px rgba(124,58,237,.4)" }}>
        <span style={{ fontSize:18 }}>⚡</span> Assinar com PIX — R$ {chosen?.price}
      </button>

      <p style={{ textAlign:"center", fontSize:11, color:"#bbb" }}>
        Cancele quando quiser · Sem fidelidade · Ativação imediata
      </p>
    </div>
  );
}

// ─── ESTILOS ─────────────────────────────────────────────────────────────────

const S = {
  card: {
    background:"white", borderRadius:18, padding:16,
    boxShadow:"0 2px 12px rgba(0,0,0,.07)",
  },
  fullDark: {
    minHeight:"100vh", background:"linear-gradient(160deg,#0F3460,#7C3AED)",
    display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", padding:32, textAlign:"center",
  },
  fullCenter: {
    minHeight:"100vh", background:"#F8F9FA",
    display:"flex", flexDirection:"column", alignItems:"center",
    justifyContent:"center", padding:32, textAlign:"center",
  },
  crownCircle: {
    width:96, height:96, borderRadius:"50%",
    background:"linear-gradient(135deg,#F9A825,#E65100)",
    display:"flex", alignItems:"center", justifyContent:"center",
    marginBottom:24, boxShadow:"0 8px 32px rgba(249,168,37,.5)",
  },
  doneTitle: { fontSize:28, fontWeight:900, color:"white", margin:"0 0 10px" },
  doneSub:   { fontSize:14, color:"rgba(255,255,255,.75)", lineHeight:1.7, margin:"0 0 24px" },
  badge:     { fontSize:12, fontWeight:700, color:"white", background:"rgba(255,255,255,.15)", borderRadius:99, padding:"6px 14px" },
  spinner:   { width:44, height:44, border:"4px solid #E5E7EB", borderTopColor:"#7C3AED", borderRadius:"50%", animation:"spin .8s linear infinite" },
  backCircle:{ background:"rgba(255,255,255,.12)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" },
  backBtn:   { background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", width:34, height:34, alignItems:"center", justifyContent:"center" },
  hero:      { borderRadius:24, padding:"28px 24px", textAlign:"center", background:"linear-gradient(135deg,#7C3AED,#4F46E5,#1d4ed8)", boxShadow:"0 8px 28px rgba(124,58,237,.35)", position:"relative", overflow:"hidden" },
  heroBg:    { position:"absolute", top:-20, right:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.08)" },
  pixCodeBox:{ background:"#F8F9FA", borderRadius:12, padding:"12px 14px", wordBreak:"break-all", fontSize:11, color:"#555", lineHeight:1.6, fontFamily:"monospace", border:"1px dashed #E5E7EB" },
  primaryBtn:{ width:"100%", padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer", color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"background .2s" },
  retryBtn:  { padding:"12px 28px", borderRadius:12, border:"none", background:O, color:"white", fontWeight:800, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8 },
};
