import React, { useState, useEffect } from "react";
import {
  Shield, Users, DollarSign, Activity, CheckCircle2, X, Crown,
  Lock, Bell, Eye, EyeOff, LogOut, AlertCircle, FileText,
  Wallet, CreditCard, HeartHandshake, KeyRound, BellRing,
  BadgeCheck, Banknote, ShieldCheck, Mail, TrendingUp,
  Clock, MapPin, Phone, Star, XCircle, ChevronDown, ChevronUp,
  Search, Filter, Download, RefreshCw, Tag, Plus, Building2, FlaskConical, QrCode
} from "lucide-react";
import { CATS } from "./cats";

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  cardHover: "#263347",
  border: "#334155",
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
  purple: "#A855F7",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
};

// "api.multifuncao.com.br" nunca foi configurado no DNS (NXDOMAIN, confirmado
// 2026-08-07) — era um domínio planejado que nunca saiu do papel. O resto do
// app (App.jsx) já usa o backend real no Render; este arquivo tinha ficado
// pra trás apontando pro domínio morto, então nenhum fetch daqui chegava nem
// a sair da máquina do usuário.
const API = "https://multi-backend-lfwp.onrender.com";

// ─── Componentes base ───────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card,
      border: "1px solid " + COLORS.border,
      borderRadius: 12,
      padding: 20,
      ...style
    }}>
      {children}
    </div>
  );
}

function Badge({ color, children }) {
  const bg = {
    green: "#14532D",
    red: "#7F1D1D",
    orange: "#78350F",
    blue: "#1E3A5F",
    purple: "#3B0764",
  };
  return (
    <span style={{
      background: bg[color] || bg.blue,
      color: COLORS[color] || COLORS.blue,
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 20,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    }}>
      {children}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: (color || COLORS.blue) + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={22} color={color || COLORS.blue} />
      </div>
      <div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
        <div style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: 800 }}>{value}</div>
        {sub && <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{sub}</div>}
      </div>
    </Card>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: COLORS.bg, borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: active === t.id ? COLORS.blue : "transparent",
            color: active === t.id ? "#fff" : COLORS.textSecondary,
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s",
          }}
        >
          {t.icon && <t.icon size={14} />}
          {t.label}
          {t.count !== undefined && (
            <span style={{
              background: active === t.id ? "rgba(255,255,255,0.25)" : COLORS.border,
              color: active === t.id ? "#fff" : COLORS.textMuted,
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 10,
            }}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: COLORS.textMuted }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Buscar..."}
        style={{
          background: COLORS.bg,
          border: "1px solid " + COLORS.border,
          borderRadius: 8,
          padding: "8px 12px 8px 32px",
          color: COLORS.textPrimary,
          fontSize: 13,
          width: "100%",
          outline: "none",
        }}
      />
    </div>
  );
}

// ─── Central de Alertas ──────────────────────────────────────────
// Fase 2 do plano de CRM (multi_admin_crm_plano na memória) — versão
// "de negócio", narrada, não técnica, ficando bem em cima na Visão Geral
// (é a primeira coisa que o admin vê ao entrar, como os dois documentos
// pediam). Reaproveita /api/admin/oportunidades (Fase 1) — sem endpoint
// novo, só uma camada de apresentação por cima do que já existia.
function CentralAlertas({ adminKey, pendingApproval, onNavigate }) {
  const [oport, setOport] = useState(null);

  useEffect(() => {
    fetch(API + "/api/admin/oportunidades", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(setOport)
      .catch(() => setOport(null));
  }, []);

  const r = oport?.resumo;
  if (!r) return null;

  const alertas = [
    r.sem_proposta?.count > 0 && {
      cor: "red", tab: "oportunidades",
      texto: `🔴 ${r.sem_proposta.count} cliente(s) com pedido aberto sem nenhuma proposta ainda`,
    },
    r.proposta_sem_resposta?.count > 0 && {
      cor: "orange", tab: "oportunidades",
      texto: `🟠 ${r.proposta_sem_resposta.count} cliente(s) receberam proposta e ainda não decidiram`,
    },
    r.parado_pos_aceite?.count > 0 && {
      cor: "orange", tab: "oportunidades",
      texto: `🟡 ${r.parado_pos_aceite.count} serviço(s) aceito(s) que nunca chegaram a concluir`,
    },
    pendingApproval > 0 && {
      cor: "blue", tab: "pros",
      texto: `🔵 ${pendingApproval} profissional(is) aguardando aprovação de documentos`,
    },
    r.clientes_reativaveis?.count > 0 && {
      cor: "purple", tab: "oportunidades",
      texto: `🟣 ${r.clientes_reativaveis.count} cliente(s) que já fecharam antes e sumiram há 30+ dias`,
    },
    r.dinheiro_na_mesa > 0 && {
      cor: "green", tab: "oportunidades",
      texto: `💰 R$ ${Number(r.dinheiro_na_mesa).toFixed(2)} em oportunidades abertas agora`,
    },
  ].filter(Boolean);

  if (alertas.length === 0) return null;

  return (
    <Card style={{ marginBottom: 4 }}>
      <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <BellRing size={16} color={COLORS.orange} /> Central de Alertas
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alertas.map((a, i) => (
          <div key={i} onClick={() => onNavigate?.(a.tab)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            padding: "10px 12px", borderRadius: 8, background: COLORS.bg,
            border: "1px solid " + COLORS.border, cursor: onNavigate ? "pointer" : "default", fontSize: 13.5,
          }}>
            <span style={{ color: COLORS.textPrimary }}>{a.texto}</span>
            {onNavigate && <ChevronDown size={14} color={COLORS.textMuted} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Seção: Métricas ────────────────────────────────────────────
function SectionMetrics({ data, adminKey, onNavigate }) {
  const metrics = [
    { icon: Users, label: "Total Usuários", value: data.totalUsers || 0, sub: "clientes + profissionais", color: COLORS.blue },
    { icon: HeartHandshake, label: "Clientes", value: data.totalClients || 0, sub: "clientes cadastrados", color: COLORS.purple },
    { icon: ShieldCheck, label: "Profissionais", value: data.totalPros || 0, sub: "profissionais cadastrados", color: COLORS.green },
    { icon: Activity, label: "Serviços", value: data.totalServices || 0, sub: data.activeServices + " em andamento", color: COLORS.orange },
    { icon: DollarSign, label: "Receita Total", value: "R$ " + (data.totalRevenue || "0,00"), sub: "pagamentos liberados", color: COLORS.green },
    { icon: Crown, label: "PRO Ativos", value: data.totalPro || 0, sub: "assinantes", color: COLORS.orange },
    { icon: Clock, label: "Pendentes Aprovação", value: data.pendingApproval || 0, sub: "profissionais", color: COLORS.red },
    { icon: TrendingUp, label: "Taxa Conclusão", value: (data.conclusionRate || 0) + "%", sub: "dos serviços", color: COLORS.blue },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CentralAlertas adminKey={adminKey} pendingApproval={data.pendingApproval || 0} onNavigate={onNavigate} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
      </div>
    </div>
  );
}

// plano/paymentStatus vêm de "assinaturas" via /api/admin/professionals (ver
// server.js) — plano real do profissional (usuarios.pro_plan é coluna morta).
// Pílula (Badge) pro plano, ponto+texto (PaymentStatusDot) pro pagamento —
// linguagem visual diferente de propósito, pra não dar pra confundir os dois
// mesmo de relance (2026-08-13: "Pro" e "Cancelado" chegaram a colidir na
// mesma cor laranja quando os dois eram pílula).
const PLANO_INFO = {
  autonomo: { label: "Autônomo", color: "blue" },
  pro:      { label: "Pro",      color: "orange" },
  premium:  { label: "Premium",  color: "purple" },
};
const PAGAMENTO_INFO = {
  pago:            { label: "Pago em dia",          color: "green" },
  vencido:         { label: "Pagamento vencido",    color: "red" },
  cancelado:       { label: "Cancelado",            color: "textMuted" },
  sem_plano:       { label: "Nunca pagou",          color: "textMuted" },
  // "ativa" no banco mas sem asaas_customer_id/cortesia — dado de teste
  // ativado por SQL direto, nunca passou por pagamento real nenhum (ver
  // comentário em server.js /api/admin/professionals). Laranja de propósito:
  // não é "pago" (verde) nem "nunca tentou" (cinza) — precisa de atenção.
  sem_confirmacao: { label: "Sem confirmação Asaas", color: "orange" },
};

function PaymentStatusDot({ status }) {
  const info = PAGAMENTO_INFO[status];
  if (!info) return null;
  const dotColor = COLORS[info.color] || COLORS.textMuted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: dotColor }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      {info.label}
    </span>
  );
}

// 2026-08-13: "assinaturas" só guarda o estado atual (1 linha por titular,
// sobrescrita a cada renovação) — não existe ledger de pagamentos passados
// no Supabase. Busca o extrato de verdade direto na Asaas (ver
// GET /api/admin/professional-payments), só quando o card expande — nunca
// bate na Asaas pra lista inteira de profissionais de uma vez.
const ASAAS_STATUS_LABEL = {
  RECEIVED: "Recebido", CONFIRMED: "Confirmado", PENDING: "Pendente",
  OVERDUE: "Vencido", REFUNDED: "Estornado", RECEIVED_IN_CASH: "Recebido (dinheiro)",
  AWAITING_RISK_ANALYSIS: "Em análise",
};
function PaymentsExtrato({ email, adminKey }) {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPayments(null);
    setError(false);
    fetch(API + "/api/admin/professional-payments?email=" + encodeURIComponent(email), { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(() => setError(true));
  }, [email]);

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid " + COLORS.border }}>
      <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Extrato de pagamentos (Asaas)
      </div>
      {error ? (
        <div style={{ color: COLORS.red, fontSize: 12 }}>Erro ao buscar na Asaas.</div>
      ) : payments === null ? (
        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Carregando...</div>
      ) : payments.length === 0 ? (
        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Nenhum pagamento encontrado — nunca virou cliente pago.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {payments.map(pay => (
            <div key={pay.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid " + COLORS.border }}>
              <div>
                <span style={{ color: COLORS.textPrimary, fontWeight: 700 }}>R$ {Number(pay.value || 0).toFixed(2)}</span>
                <span style={{ color: COLORS.textMuted, marginLeft: 8 }}>{pay.billingType || "—"}</span>
              </div>
              <div style={{ color: COLORS.textMuted }}>
                venc. {pay.dueDate ? new Date(pay.dueDate).toLocaleDateString("pt-BR") : "—"}
                {pay.paymentDate && ` · pago ${new Date(pay.paymentDate).toLocaleDateString("pt-BR")}`}
              </div>
              <Badge color={pay.status === "RECEIVED" || pay.status === "CONFIRMED" || pay.status === "RECEIVED_IN_CASH" ? "green" : pay.status === "OVERDUE" ? "red" : "blue"}>
                {ASAAS_STATUS_LABEL[pay.status] || pay.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Profissionais ────────────────────────────────────────
function SectionProfissionais({ filter, adminKey }) {
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("todos");
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(API + "/api/admin/professionals", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setPros(d.professionals || []); setLoading(false); })
      .catch(() => { setPros([]); setLoading(false); });
  }, []);

  const handleApprove = async (id) => {
    try {
      const r = await fetch(API + "/api/admin/approve-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        setPros(p => p.map(x => x.id === id ? { ...x, approved: true } : x));
        showToast("Profissional aprovado!", "green");
      } else {
        showToast("Erro ao aprovar", "red");
      }
    } catch { showToast("Erro ao aprovar", "red"); }
  };

  const handleReject = async (id) => {
    try {
      const r = await fetch(API + "/api/admin/reject-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id }),
      });
      if (r.ok) {
        setPros(p => p.map(x => x.id === id ? { ...x, approved: false } : x));
        showToast("Profissional reprovado.", "orange");
      } else {
        showToast("Erro ao reprovar", "red");
      }
    } catch { showToast("Erro ao reprovar", "red"); }
  };

  // 2026-08-13: is_pro (usuarios.pro_plan, coluna morta) virou plano/paymentStatus
  // de verdade, lidos de "assinaturas" pelo backend — ver /api/admin/professionals.
  const filtered = pros.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q) || (p.whatsapp || "").includes(q);
    if (!matchSearch) return false;
    if (subTab === "pendentes") return !p.approved;
    if (subTab === "aprovados") return p.approved && !p.plano;
    if (subTab === "autonomo") return p.plano === "autonomo";
    if (subTab === "pro") return p.plano === "pro";
    if (subTab === "premium") return p.plano === "premium";
    if (subTab === "vencidos") return p.paymentStatus === "vencido";
    // "nunca pagou" = sem linha nenhuma em "assinaturas" — ativarAssinatura()
    // só grava essa linha DEPOIS de confirmar um pagamento real na Asaas (ou
    // cortesia explícita), então "sem_plano" aqui é sempre "baixou/se
    // cadastrou mas nunca chegou a pagar nada", independente de já ter sido
    // aprovado ou não. Ver server.js.
    if (subTab === "nunca_pagou") return p.paymentStatus === "sem_plano";
    // "ativa" no banco sem asaas_customer_id/cortesia — dado de teste ativado
    // por SQL direto, nunca teve pagamento real por trás (achado 2026-08-13,
    // ver server.js). Filtro à parte porque tecnicamente "tem plano" mas não
    // deve contar nem como "pago" nem se misturar com quem nunca teve linha
    // nenhuma em "assinaturas".
    if (subTab === "sem_confirmacao") return p.paymentStatus === "sem_confirmacao";
    if (subTab === "sem_fechar") return p.approved && (p.services_count || 0) === 0;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: pros.length },
    { id: "pendentes", label: "Pendentes", count: pros.filter(p => !p.approved).length },
    { id: "aprovados", label: "Aprovados", count: pros.filter(p => p.approved && !p.plano).length },
    { id: "autonomo", label: "Autônomo", count: pros.filter(p => p.plano === "autonomo").length },
    { id: "pro", label: "Pro", count: pros.filter(p => p.plano === "pro").length },
    { id: "premium", label: "Premium", count: pros.filter(p => p.plano === "premium").length },
    { id: "vencidos", label: "Pagamento Vencido", count: pros.filter(p => p.paymentStatus === "vencido").length },
    { id: "nunca_pagou", label: "Nunca Pagou", count: pros.filter(p => p.paymentStatus === "sem_plano").length },
    { id: "sem_confirmacao", label: "Sem Confirmação Asaas", count: pros.filter(p => p.paymentStatus === "sem_confirmacao").length },
    { id: "sem_fechar", label: "Sem Fechar", count: pros.filter(p => p.approved && (p.services_count || 0) === 0).length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.color === "green" ? COLORS.green : toast.color === "orange" ? COLORS.orange : COLORS.red,
          color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar profissional..." />
        </div>
        <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum profissional encontrado</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ padding: 0, overflow: "hidden" }}>
              <div
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  cursor: "pointer", transition: "background 0.2s",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: COLORS.blue + "33",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: COLORS.blue, fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>
                  {(p.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Linha 1: identidade + aprovação. Linha 2 (só quando tem
                      plano): plano (pílula) + pagamento (ponto+texto) — estilos
                      visuais diferentes de propósito, pra escanear de relance
                      sem depender só da cor (ver comentário em PLANO_INFO). */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{p.name || "Sem nome"}</span>
                    {p.approved ? <Badge color="green">Aprovado</Badge> : <Badge color="red">Pendente</Badge>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 5 }}>
                    {p.plano && <Badge color={PLANO_INFO[p.plano]?.color || "blue"}>{PLANO_INFO[p.plano]?.label || p.plano}</Badge>}
                    <PaymentStatusDot status={p.paymentStatus} />
                    {p.cortesia && <span style={{ fontSize: 11.5, color: COLORS.purple, fontWeight: 700 }}>· Cortesia</span>}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 5 }}>
                    {p.email || "—"} • {p.whatsapp || "—"} • {p.city || p.location || "Sem cidade"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.services_count || 0} serviços</span>
                  {!p.approved && (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleApprove(p.id); }} style={{
                        background: COLORS.green + "22", color: COLORS.green, border: "1px solid " + COLORS.green + "44",
                        borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>
                        Aprovar
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleReject(p.id); }} style={{
                        background: COLORS.red + "22", color: COLORS.red, border: "1px solid " + COLORS.red + "44",
                        borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>
                        Reprovar
                      </button>
                    </>
                  )}
                  {expanded === p.id ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
                </div>
              </div>

              {expanded === p.id && (
                <div style={{ borderTop: "1px solid " + COLORS.border, padding: "14px 16px", background: COLORS.bg }}>
                  {/* Documento (RG/CNH) + parecer da pré-checagem por IA —
                      primeira coisa que o admin precisa olhar antes de
                      decidir Aprovar/Reprovar (botões ficam no header do
                      card, acima). A IA só dá um parecer, nunca aprova
                      sozinha. */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid " + COLORS.border }}>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {[{ url: p.docRgUrl, label: "Frente" }, { url: p.docRgUrlVerso, label: "Verso" }].map((doc, i) => (
                        <div key={i}>
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <img src={doc.url} alt={"RG/CNH — " + doc.label} style={{ width: 110, height: 74, objectFit: "cover", borderRadius: 10, border: "1px solid " + COLORS.border, display: "block" }} />
                            </a>
                          ) : (
                            <div style={{ width: 110, height: 74, borderRadius: 10, border: "1.5px dashed " + COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted, fontSize: 10, textAlign: "center", padding: 6 }}>
                              {doc.label} não enviada
                            </div>
                          )}
                          <div style={{ textAlign: "center", color: COLORS.textMuted, fontSize: 10, fontWeight: 700, marginTop: 3 }}>{doc.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      {(() => {
                        const ia = {
                          ok:       { color: "green",  label: "IA: documento legível" },
                          suspeito: { color: "orange", label: "IA: suspeito — revisar com atenção" },
                          ilegivel: { color: "red",    label: "IA: ilegível" },
                        }[p.iaStatus] || { color: "blue", label: "IA: análise indisponível" };
                        return <Badge color={ia.color}>{ia.label}</Badge>;
                      })()}
                      {p.iaObservacoes && (
                        <p style={{ color: COLORS.textSecondary, fontSize: 12.5, margin: "8px 0 0", lineHeight: 1.5 }}>{p.iaObservacoes}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {[
                      { label: "ID", value: p.id },
                      { label: "Email", value: p.email || "—" },
                      { label: "WhatsApp", value: p.whatsapp || "—" },
                      { label: "CEP", value: p.cep || "—" },
                      { label: "Cidade", value: p.city || p.location || "—" },
                      { label: "Categorias", value: (p.categories || []).join(", ") || "—" },
                      { label: "Avaliação", value: p.rating ? p.rating + " ★" : "Sem avaliação" },
                      { label: "Serviços", value: p.services_count || 0 },
                      { label: "Serviços sem fechar", value: p.open_services || 0 },
                      { label: "Receita", value: p.revenue ? "R$ " + p.revenue : "R$ 0" },
                      { label: "Plano", value: p.plano ? (PLANO_INFO[p.plano]?.label || p.plano) : "Sem plano" },
                      { label: "Status pagamento", value: PAGAMENTO_INFO[p.paymentStatus]?.label || p.paymentStatus || "—" },
                      { label: "Próxima cobrança", value: p.proximaCobranca ? new Date(p.proximaCobranca).toLocaleDateString("pt-BR") : "—" },
                      { label: "PRO desde", value: p.pro_since ? new Date(p.pro_since).toLocaleDateString("pt-BR") : "—" },
                      { label: "Cadastro", value: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—" },
                      { label: "Último acesso", value: p.last_seen ? new Date(p.last_seen).toLocaleDateString("pt-BR") : "—" },
                    ].map((f, i) => (
                      <div key={i}>
                        <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                        <div style={{ color: COLORS.textPrimary, fontSize: 13, marginTop: 2, wordBreak: "break-all" }}>{String(f.value)}</div>
                      </div>
                    ))}
                  </div>
                  <PaymentsExtrato email={p.email} adminKey={adminKey} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Clientes ─────────────────────────────────────────────
function SectionClientes({ adminKey }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("todos");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(API + "/api/admin/clientes", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setClients([]); setLoading(false); });
  }, []);

  // "completed_count" (pedidos com status 'concluido'), não "services_count"
  // (total de pedidos em qualquer status) — achado 2026-08-18: o backend
  // nunca calculava nenhum dos dois antes, então services_count vinha
  // sempre undefined e TODO cliente caía em "Não Fecharam", mesmo quem
  // tinha fechado serviço de verdade (ver Erika/Rafael/Fabio na memória).
  // Corrigido no endpoint (/api/admin/clientes, MULTI-BACKEND); aqui só
  // troca pra olhar o campo certo — "fechou" precisa ser conclusão de
  // verdade, não só ter um pedido aberto que nunca andou.
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (subTab === "sem_fechar") return (c.completed_count || 0) === 0;
    if (subTab === "com_servico") return (c.completed_count || 0) > 0;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: clients.length },
    { id: "com_servico", label: "Com Serviço", count: clients.filter(c => (c.completed_count || 0) > 0).length },
    { id: "sem_fechar", label: "Não Fecharam", count: clients.filter(c => (c.completed_count || 0) === 0).length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
        </div>
        <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum cliente encontrado</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(c => (
            <Card key={c.id} style={{ padding: 0, overflow: "hidden" }}>
              <div
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: COLORS.purple + "33",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: COLORS.purple, fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>
                  {(c.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{c.name || "Sem nome"}</span>
                    {(c.completed_count || 0) === 0
                      ? <Badge color="orange">Não fechou</Badge>
                      : <Badge color="green">{c.completed_count} fechado(s)</Badge>
                    }
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                    {c.email || "—"} • {c.whatsapp || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                  </span>
                  {expanded === c.id ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
                </div>
              </div>

              {expanded === c.id && (
                <div style={{ borderTop: "1px solid " + COLORS.border, padding: "14px 16px", background: COLORS.bg }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {[
                      { label: "ID", value: c.id },
                      { label: "Email", value: c.email || "—" },
                      { label: "WhatsApp", value: c.whatsapp || "—" },
                      { label: "CEP", value: c.cep || "—" },
                      { label: "Cidade", value: c.city || c.location || "—" },
                      { label: "Total de pedidos", value: c.services_count || 0 },
                      { label: "Serviços fechados", value: c.completed_count || 0 },
                      { label: "Gasto total", value: "R$ " + (Number(c.valor_movimentado || 0).toFixed(2)) },
                      { label: "Último serviço", value: c.last_service ? new Date(c.last_service).toLocaleDateString("pt-BR") : "—" },
                      { label: "Cadastro", value: c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—" },
                      { label: "Último acesso", value: c.last_seen ? new Date(c.last_seen).toLocaleDateString("pt-BR") : "—" },
                    ].map((f, i) => (
                      <div key={i}>
                        <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                        <div style={{ color: COLORS.textPrimary, fontSize: 13, marginTop: 2, wordBreak: "break-all" }}>{String(f.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Badge "FICT" — pedido/serviço fictício em QUALQUER lista do Admin ────
// Não só na aba dedicada "Fictícios": pedido do usuário 2026-08-27 foi
// explicitamente ver isso em qualquer tela onde pedidos reais e fictícios
// aparecem misturados (ex.: aba "Serviços"), sem precisar abrir cada um pra
// conferir. Ver plano em multi_dados_ficticios_plano na memória.
function FictBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      background: COLORS.purple + "33", color: COLORS.purple,
      border: "1px solid " + COLORS.purple + "66",
      borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
    }}>
      🧪 FICT
    </span>
  );
}

// ─── Seção: Serviços ─────────────────────────────────────────────
function SectionServicos({ adminKey }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("todos");

  useEffect(() => {
    fetch(API + "/api/admin/services", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setServices(d.services || []); setLoading(false); })
      .catch(() => { setServices([]); setLoading(false); });
  }, []);

  const statusLabel = (s) => {
    const map = { aberto: "Aguardando", em_andamento: "Em andamento", executando: "Executando", concluido: "Concluído", cancelado: "Cancelado" };
    return map[s] || s;
  };

  const statusColor = (s) => {
    const map = { aberto: "blue", em_andamento: "orange", executando: "purple", concluido: "green", cancelado: "red" };
    return map[s] || "blue";
  };

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.title || "").toLowerCase().includes(q) || (s.client_name || "").toLowerCase().includes(q) || (s.protocol || "").includes(q);
    if (!matchSearch) return false;
    if (subTab === "executando") return s.status === "executando" || s.status === "em_andamento";
    if (subTab !== "todos") return s.status === subTab;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: services.length },
    { id: "aberto", label: "Aguardando", count: services.filter(s => s.status === "aberto").length },
    { id: "executando", label: "Em andamento", count: services.filter(s => s.status === "executando" || s.status === "em_andamento").length },
    { id: "concluido", label: "Concluídos", count: services.filter(s => s.status === "concluido").length },
    { id: "cancelado", label: "Cancelados", count: services.filter(s => s.status === "cancelado").length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar serviço ou protocolo..." />
        </div>
        <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum serviço encontrado</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(s => (
            <Card key={s.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    {s.origem === "demo" && <FictBadge />}
                    {s.origem === "suporte" && <Badge color="blue">SUPORTE</Badge>}
                    <Badge color={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{s.protocol || "—"}</span>
                    {s.codigo_interno && <span style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>{s.codigo_interno}</span>}
                  </div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{s.title || "Sem título"}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                    Cliente: {s.client_name || s.user_id || "—"} • Prof: {s.professional_name || "Sem profissional"}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {s.location || s.city || "—"} • {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "—"}
                    {s.cadastrado_por && ` • cadastrado por ${s.cadastrado_por}`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 18 }}>
                    {s.value ? "R$ " + s.value : "—"}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11 }}>
                    {s.payment_released ? "Pago" : "Pendente"}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Dados Fictícios ──────────────────────────────────────────────
// Pedidos "demo" (origem='demo' em pedidos) pra preencher o mural do
// profissional em cidade/categoria nova sem demanda real ainda — plano
// aprovado 2026-08-27 (ver memória multi_dados_ficticios_plano). CRUD
// completo exceto DELETE: "Pausar" (demo_ativo=false) em vez de apagar,
// mesmo padrão adotado depois do histórico de bug de durabilidade em
// DELETE nesse projeto Supabase (ver supabase_multifuncao_project).
function SectionFicticios({ adminKey }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos"); // todos | ativo | pausado
  const [editandoId, setEditandoId] = useState(null); // null = criando novo
  const [form, setForm] = useState({ categoria: "", descricao: "", valor: "", cidade: "", cliente_nome: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = () => {
    setLoading(true);
    fetch(API + "/api/admin/pedidos-ficticios", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setPedidos(d.pedidos || []); setLoading(false); })
      .catch(() => { setPedidos([]); setLoading(false); });
  };
  useEffect(carregar, []);

  const limparForm = () => { setForm({ categoria: "", descricao: "", valor: "", cidade: "", cliente_nome: "" }); setEditandoId(null); setErro(""); };

  const iniciarEdicao = (p) => {
    setEditandoId(p.id);
    setForm({ categoria: p.categoria || "", descricao: p.descricao || "", valor: p.valor ?? "", cidade: p.cidade || "", cliente_nome: p.cliente_nome || "" });
    setErro("");
  };

  const salvar = async () => {
    if (!form.categoria.trim()) { setErro("Categoria é obrigatória"); return; }
    setSalvando(true); setErro("");
    try {
      const body = {
        categoria: form.categoria.trim(),
        descricao: form.descricao.trim() || null,
        valor: form.valor === "" ? null : Number(form.valor),
        cidade: form.cidade.trim() || null,
        cliente_nome: form.cliente_nome.trim() || null,
      };
      const url = editandoId ? API + "/api/admin/pedidos-ficticios/" + editandoId : API + "/api/admin/pedidos-ficticios";
      const r = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || "Erro ao salvar"); return; }
      limparForm();
      carregar();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (p) => {
    await fetch(API + "/api/admin/pedidos-ficticios/" + p.id + "/toggle", { method: "POST", headers: { "x-admin-key": adminKey } });
    carregar();
  };

  const duplicar = async (p) => {
    await fetch(API + "/api/admin/pedidos-ficticios/" + p.id + "/duplicate", { method: "POST", headers: { "x-admin-key": adminKey } });
    carregar();
  };

  const cidades = [...new Set(pedidos.map(p => p.cidade).filter(Boolean))].sort();
  const categorias = [...new Set(pedidos.map(p => p.categoria).filter(Boolean))].sort();

  const filtered = pedidos.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.descricao || "").toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q) || (p.cliente_nome || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filtroCidade && p.cidade !== filtroCidade) return false;
    if (filtroCategoria && p.categoria !== filtroCategoria) return false;
    if (filtroStatus === "ativo" && !p.demo_ativo) return false;
    if (filtroStatus === "pausado" && p.demo_ativo) return false;
    return true;
  });

  const inputStyle = {
    background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
    padding: "10px 14px", color: COLORS.textPrimary, fontSize: 13,
    outline: "none", fontFamily: "inherit", width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <FlaskConical size={17} /> {editandoId ? "Editar pedido fictício" : "Novo pedido fictício"}
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 14 }}>
          Só aparece no mural do profissional (com a etiqueta "🧪 FICT", nunca disfarçado de real) quando a categoria tem menos de 3 pedidos reais em aberto pra esse profissional. Nunca pode ser respondido — quem tenta se candidatar recebe um aviso, não vira proposta de verdade.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>CATEGORIA (id exato, ex: eletricista)</label>
            <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="encanador" style={inputStyle} />
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>CIDADE</label>
            <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Sorocaba, SP" style={inputStyle} />
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>VALOR (R$)</label>
            <input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="150" style={inputStyle} />
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>NOME DO CLIENTE (fictício)</label>
            <input value={form.cliente_nome} onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))} placeholder="Ana S." style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>DESCRIÇÃO</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Vazamento na cozinha, cano embaixo da pia" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={salvar} disabled={salvando || !form.categoria.trim()} style={{
            background: salvando || !form.categoria.trim() ? COLORS.border : COLORS.purple,
            color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, cursor: salvando || !form.categoria.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, height: 38,
          }}>
            <Plus size={15} /> {salvando ? "Salvando..." : editandoId ? "Salvar edição" : "Criar pedido fictício"}
          </button>
          {editandoId && (
            <button onClick={limparForm} style={{
              background: "none", color: COLORS.textMuted, border: "1px solid " + COLORS.border,
              borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", height: 38,
            }}>
              Cancelar edição
            </button>
          )}
        </div>
        {erro && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 10, fontWeight: 600 }}>{erro}</div>}
      </Card>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por descrição, categoria ou cliente..." />
        </div>
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Todas as cidades</option>
          {cidades.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <TabBar tabs={[
          { id: "todos", label: "Todos", count: pedidos.length },
          { id: "ativo", label: "Ativos", count: pedidos.filter(p => p.demo_ativo).length },
          { id: "pausado", label: "Pausados", count: pedidos.filter(p => !p.demo_ativo).length },
        ]} active={filtroStatus} onChange={setFiltroStatus} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum pedido fictício encontrado</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => (
            <Card key={p.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <FictBadge />
                    <Badge color={p.demo_ativo ? "green" : "orange"}>{p.demo_ativo ? "Ativo" : "Pausado"}</Badge>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{p.categoria}</span>
                  </div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{p.descricao || "Sem descrição"}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                    Cliente: {p.cliente_nome || "—"} • {p.cidade || "—"} • {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>
                    {p.valor ? "R$ " + p.valor : "A combinar"}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => iniciarEdicao(p)} style={{ background: "none", border: "1px solid " + COLORS.border, color: COLORS.textSecondary, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Editar</button>
                    <button onClick={() => duplicar(p)} style={{ background: "none", border: "1px solid " + COLORS.border, color: COLORS.textSecondary, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Duplicar</button>
                    <button onClick={() => alternarAtivo(p)} style={{ background: "none", border: "1px solid " + (p.demo_ativo ? COLORS.orange : COLORS.green), color: p.demo_ativo ? COLORS.orange : COLORS.green, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {p.demo_ativo ? "Pausar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seletor de categoria com busca (MULTI-SUP) ─────────────────────
// Substitui o campo de texto livre "CATEGORIA (id exato, ex: eletricista)"
// — achado 2026-09-02: demanda real já cadastrada no banco tinha categoria
// digitada errada (maiúscula, id inexistente, até frase livre tipo
// "montador de imovel") que nunca bate com o categoria_servico (ids exatos
// de CATS) de nenhum profissional — a demanda ficava invisível no mural,
// silenciosamente, sem erro nenhum avisando ninguém. Esse seletor só deixa
// escolher um id que existe de verdade em CATS (as 157 profissões, 23
// grupos — ver cats.js), busca por nome, sem digitação livre.
function CategoriaBuscaAdmin({ value, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const selecionada = CATS.find(c => c.id === value);
  const resultados = busca.trim()
    ? CATS.filter(c => c.label.toLowerCase().includes(busca.trim().toLowerCase()) || c.grupo.toLowerCase().includes(busca.trim().toLowerCase())).slice(0, 30)
    : CATS;

  if (selecionada && !aberto) {
    return (
      <div style={{
        background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
        padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <span style={{ color: COLORS.textPrimary, fontSize: 13 }}>{selecionada.emoji} {selecionada.label} <span style={{ color: COLORS.textMuted, fontSize: 11 }}>· {selecionada.grupo}</span></span>
        <button onClick={() => { setAberto(true); setBusca(""); }} style={{ background: "none", border: "none", color: COLORS.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Trocar</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={14} color={COLORS.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          autoFocus={aberto}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          onFocus={() => setAberto(true)}
          placeholder="Buscar profissão (ex: eletricista, montador...)"
          style={{
            background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
            padding: "10px 14px 10px 34px", color: COLORS.textPrimary, fontSize: 13,
            outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box",
          }} />
      </div>
      {aberto && (
        <div style={{
          position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0,
          maxHeight: 260, overflowY: "auto", background: COLORS.card, border: "1px solid " + COLORS.border,
          borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.4)",
        }}>
          {resultados.length === 0 ? (
            <div style={{ padding: "12px 14px", color: COLORS.textMuted, fontSize: 12 }}>Nenhuma profissão encontrada</div>
          ) : resultados.map(c => (
            <div key={c.id} onClick={() => { onChange(c.id); setAberto(false); setBusca(""); }} style={{
              padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid " + COLORS.border,
            }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.cardHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span>{c.emoji}</span>
              <span style={{ color: COLORS.textPrimary, fontSize: 13 }}>{c.label}</span>
              <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: "auto" }}>{c.grupo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Demandas de Suporte (MULTI-SUP) ─────────────────────────
// Substitui os pedidos fictícios (SectionFicticios acima, desativados
// 2026-08-30) como estratégia de captação — ver multi_sup_captacao_manual
// na memória. Diferença central: aqui SEMPRE tem um cliente real por trás
// (pediu ou autorizou por telefone/WhatsApp/e-mail), nunca uma demanda
// inventada — por isso a demanda entra na distribuição normal do mural,
// sem badge nenhum pro profissional (origem='suporte' é só rastreio
// interno). Fase 1 do plano: cadastro único + listagem/busca. Cadastro em
// lote, filtro dedicado, página de detalhe e log de alteração ficam pra
// fases seguintes.
function SectionDemandaSuporte({ adminKey }) {
  const [demandas, setDemandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const vazio = { clienteNome: "", clienteEmail: "", telefone: "", tipoAtendimento: "residencial", cidade: "", bairro: "", endereco: "", categoria: "", descricao: "", valor: "", urgencia: "normal", dataDesejada: "", horarioDesejado: "" };
  const [form, setForm] = useState(vazio);
  // Nome de quem está cadastrando — não é login de verdade (o admin inteiro
  // roda numa senha única compartilhada, ver checkAdminKey em server.js),
  // só rótulo de rastreio (campo "cadastrado_por"). Fica salvo no navegador
  // pra não digitar de novo a cada demanda.
  const [meuNome, setMeuNome] = useState(() => localStorage.getItem("multiSupCadastradoPor") || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimoCodigo, setUltimoCodigo] = useState(null);

  const carregar = () => {
    setLoading(true);
    fetch(API + "/api/admin/demandas-suporte", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setDemandas(d.demandas || []); setLoading(false); })
      .catch(() => { setDemandas([]); setLoading(false); });
  };
  useEffect(carregar, []);

  const salvar = async () => {
    setErro(""); setUltimoCodigo(null);
    if (!meuNome.trim()) { setErro("Informe seu nome (campo 'Cadastrado por')"); return; }
    if (!form.clienteNome.trim() || !form.categoria.trim() || !form.descricao.trim() || !form.cidade.trim()) {
      setErro("Cliente, categoria, descrição e cidade são obrigatórios");
      return;
    }
    setSalvando(true);
    try {
      localStorage.setItem("multiSupCadastradoPor", meuNome.trim());
      const r = await fetch(API + "/api/admin/demandas-suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          clienteNome: form.clienteNome.trim(),
          clienteEmail: form.clienteEmail.trim(),
          telefone: form.telefone.trim(),
          tipoAtendimento: form.tipoAtendimento,
          cidade: form.cidade.trim(),
          bairro: form.bairro.trim(),
          endereco: form.endereco.trim(),
          categoria: form.categoria.trim(),
          descricao: form.descricao.trim(),
          valor: form.valor,
          urgencia: form.urgencia,
          dataDesejada: form.dataDesejada.trim(),
          horarioDesejado: form.horarioDesejado.trim(),
          cadastradoPor: meuNome.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || "Erro ao cadastrar"); return; }
      setUltimoCodigo(d.pedido?.codigo_interno || null);
      setForm(vazio);
      carregar();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  };

  const filtered = demandas.filter(d => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (d.codigo_interno || "").toLowerCase().includes(q)
      || (d.cliente_nome || "").toLowerCase().includes(q)
      || (d.categoria || "").toLowerCase().includes(q)
      || (d.cidade || "").toLowerCase().includes(q)
      || (d.descricao || "").toLowerCase().includes(q);
  });

  const inputStyle = {
    background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
    padding: "10px 14px", color: COLORS.textPrimary, fontSize: 13,
    outline: "none", fontFamily: "inherit", width: "100%",
  };
  const labelStyle = { color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Phone size={17} /> Cadastrar demanda para cliente
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 14 }}>
          Só pra solicitações reais, feitas ou autorizadas pelo cliente (telefone, WhatsApp, e-mail). Entra no mural exatamente como um pedido publicado pelo app — mesmas regras de categoria, localização e distribuição.
        </div>

        <div style={{ marginBottom: 12, maxWidth: 260 }}>
          <label style={labelStyle}>CADASTRADO POR (seu nome)</label>
          <input value={meuNome} onChange={e => setMeuNome(e.target.value)} placeholder="Ana" style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>NOME DO CLIENTE *</label>
            <input value={form.clienteNome} onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} placeholder="João da Silva" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>E-MAIL</label>
            <input value={form.clienteEmail} onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))} placeholder="joao@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>TELEFONE</label>
            <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>TIPO</label>
            <select value={form.tipoAtendimento} onChange={e => setForm(f => ({ ...f, tipoAtendimento: e.target.value }))} style={inputStyle}>
              <option value="residencial">Residencial</option>
              <option value="empresarial">Empresarial</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>CIDADE *</label>
            <input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Guarulhos, SP" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>BAIRRO</label>
            <input value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} placeholder="Centro" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ENDEREÇO</label>
            <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua X, 123 (se necessário)" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>CATEGORIA *</label>
            <CategoriaBuscaAdmin value={form.categoria} onChange={v => setForm(f => ({ ...f, categoria: v }))} />
          </div>
          <div>
            <label style={labelStyle}>VALOR ESTIMADO (R$)</label>
            <input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="150" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>URGÊNCIA</label>
            <select value={form.urgencia} onChange={e => setForm(f => ({ ...f, urgencia: e.target.value }))} style={inputStyle}>
              <option value="normal">🟢 Normal</option>
              <option value="urgente">🟡 Urgente</option>
              <option value="muito_urgente">🔴 Muito Urgente</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>DATA DESEJADA</label>
            <input value={form.dataDesejada} onChange={e => setForm(f => ({ ...f, dataDesejada: e.target.value }))} placeholder="Amanhã, essa semana..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>HORÁRIO DESEJADO</label>
            <input value={form.horarioDesejado} onChange={e => setForm(f => ({ ...f, horarioDesejado: e.target.value }))} placeholder="Manhã, 14h..." style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>DESCRIÇÃO *</label>
          <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Vazamento na cozinha, cano embaixo da pia" style={inputStyle} />
        </div>

        <button onClick={salvar} disabled={salvando} style={{
          background: salvando ? COLORS.border : COLORS.blue,
          color: "#fff", border: "none", borderRadius: 8, padding: "12px 22px",
          fontSize: 14, fontWeight: 700, cursor: salvando ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6, height: 42,
        }}>
          <Plus size={16} /> {salvando ? "Cadastrando..." : "CADASTRAR DEMANDA"}
        </button>

        {erro && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 10, fontWeight: 600 }}>{erro}</div>}
        {ultimoCodigo && (
          <div style={{ color: COLORS.green, fontSize: 13, marginTop: 10, fontWeight: 700 }}>
            ✓ Demanda cadastrada — código {ultimoCodigo}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por código, cliente, categoria ou cidade..." />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhuma demanda de suporte encontrada</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(d => (
            <Card key={d.id} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <Badge color="blue">SUPORTE</Badge>
                    <span style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>{d.codigo_interno || "—"}</span>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{d.categoria}</span>
                    {(d.urgencia === "urgente" || d.urgencia === "muito_urgente") && (
                      <Badge color={d.urgencia === "muito_urgente" ? "red" : "orange"}>{d.urgencia === "muito_urgente" ? "🔴 MUITO URGENTE" : "🟡 URGENTE"}</Badge>
                    )}
                  </div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{d.descricao || "Sem descrição"}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                    Cliente: {d.cliente_nome || "—"} • {d.telefone_cliente || d.cliente_id || "sem contato"} • {d.cidade || "—"}{d.bairro ? ", " + d.bairro : ""}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                    Cadastrado por {d.cadastrado_por || "—"} em {d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>
                    {d.valor ? "R$ " + d.valor : "A combinar"}
                  </div>
                  <Badge color={d.status === "aberto" ? "blue" : d.status === "concluido" ? "green" : "orange"}>{d.status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Interesses MULTI-SUP (intermediação manual) ──────────────
// Decisão 2026-09-02: demanda MULTI-SUP nunca expõe telefone do cliente
// pro profissional, e "Tenho Interesse" nunca tenta abrir chat/WhatsApp
// (cliente não tem conta no app) — só grava uma "proposta" normal e avisa
// que a equipe vai ligar. Esta tela é essa equipe (Thiago/Ana): lista quem
// demonstrou interesse em qual demanda, com o telefone do PROFISSIONAL
// (nunca do cliente) pra ligar de volta, e um botão pra marcar depois de
// ligar/conectar.
function SectionInteressesMultiSup({ adminKey }) {
  const [interesses, setInteresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendente"); // pendente | todos
  const [atualizando, setAtualizando] = useState(null); // id em andamento

  const carregar = () => {
    setLoading(true);
    fetch(API + "/api/admin/interesses-multi-sup", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setInteresses(d.interesses || []); setLoading(false); })
      .catch(() => { setInteresses([]); setLoading(false); });
  };
  useEffect(carregar, []);

  const marcarStatus = async (id, status) => {
    setAtualizando(id);
    try {
      const r = await fetch(API + `/api/admin/interesses-multi-sup/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status }),
      });
      if (r.ok) carregar();
    } finally {
      setAtualizando(null);
    }
  };

  const filtered = filtro === "pendente" ? interesses.filter(i => i.status === "pendente") : interesses;
  const catInfo = id => CATS.find(c => c.id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <BellRing size={17} /> Interesses MULTI-SUP
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
          Profissional clicou "Tenho Interesse" numa demanda MULTI-SUP — sem chat/WhatsApp automático (cliente não tem conta no app). Ligue pro profissional pelo telefone abaixo, feche o contato com o cliente por fora, e marque o resultado.
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        {[{ id: "pendente", label: "Pendentes" }, { id: "todos", label: "Todos" }].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            background: filtro === f.id ? COLORS.blue : COLORS.card,
            color: filtro === f.id ? "#fff" : COLORS.textMuted,
            border: "1px solid " + (filtro === f.id ? COLORS.blue : COLORS.border),
            borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum interesse {filtro === "pendente" ? "pendente" : ""} encontrado</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(i => {
            const cat = catInfo(i.categoria);
            return (
              <Card key={i.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <Badge color={i.status === "pendente" ? "orange" : i.status === "aceita" ? "green" : "red"}>{i.status}</Badge>
                      <span style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>{i.codigoInterno || "—"}</span>
                      <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{cat ? `${cat.emoji} ${cat.label}` : i.categoria}</span>
                    </div>
                    <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{i.descricao || "Sem descrição"}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                      {i.cidade || "—"} {i.valor ? `• R$ ${i.valor}` : ""}
                    </div>
                    <div style={{ color: COLORS.textPrimary, fontSize: 13, marginTop: 8, fontWeight: 700 }}>
                      👷 {i.profissionalNome || i.profissionalEmail}
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                      {i.profissionalEmail} {i.profissionalWhatsapp ? `• ${i.profissionalWhatsapp}` : "• sem telefone cadastrado"}
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                      Interesse em {i.criadoEm ? new Date(i.criadoEm).toLocaleString("pt-BR") : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {i.profissionalWhatsapp && (
                      <a href={`https://wa.me/55${i.profissionalWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none",
                        background: "#25D366", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700,
                      }}><Phone size={13} /> Chamar profissional</a>
                    )}
                    {i.status === "pendente" && (
                      <>
                        <button disabled={atualizando === i.id} onClick={() => marcarStatus(i.id, "aceita")} style={{
                          background: COLORS.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px",
                          fontSize: 12, fontWeight: 700, cursor: atualizando === i.id ? "default" : "pointer",
                        }}>✓ Conectei os dois</button>
                        <button disabled={atualizando === i.id} onClick={() => marcarStatus(i.id, "recusada")} style={{
                          background: "transparent", color: COLORS.red, border: "1px solid " + COLORS.red, borderRadius: 8, padding: "8px 14px",
                          fontSize: 12, fontWeight: 700, cursor: atualizando === i.id ? "default" : "pointer",
                        }}>Não deu certo</button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Pix Manual ───────────────────────────────────────────
// Mitigação emergencial (2026-08-31, ver comentário em PagamentoPlanoScreen
// no App.jsx) — enquanto o Pix dinâmico da Asaas está com o recebedor.nome
// corrompido e falhando em qualquer banco pagador, a Taxa de Acesso gera Pix
// estático (chave Nubank PJ) sem confirmação automática. Esta aba lista quem
// já gerou um código e está aguardando conciliação manual do extrato — o
// botão "Aprovar" ativa a assinatura na hora, sem precisar de nenhuma chave
// (mesmo login por token de todas as outras abas, ver checkAdminKey no
// backend — não a EMAIL_ADMIN_KEY antiga).
function SectionPixManual({ adminKey }) {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState(null); // titularEmail em andamento
  const [erro, setErro] = useState("");

  const carregar = () => {
    setLoading(true);
    fetch(API + "/api/admin/pix-manual-pendentes", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setPendentes(d.pendentes || []); setLoading(false); })
      .catch(() => { setPendentes([]); setLoading(false); });
  };
  useEffect(carregar, []);

  // Devolve {ok, error} em vez de só boolean — quem chama (aprovar() e
  // ativarPorEmail()) precisa do texto do erro na hora, e ler o state `erro`
  // logo após o await pegaria o valor de ANTES do setErro deste render (state
  // fica "stale" dentro da própria função até o próximo render).
  const ativar = async ({ titularTipo, titularEmail, plano, txid, nota }) => {
    setErro("");
    setAprovando(titularEmail);
    try {
      const r = await fetch(API + "/api/admin/ativar-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ titularTipo, titularEmail, plano, txid, nota }),
      });
      const d = await r.json();
      if (!r.ok) { const msg = d.error || "Erro ao aprovar"; setErro(msg); return { ok: false, error: msg }; }
      carregar(); // some da lista sozinho (status vira "ativa")
      return { ok: true };
    } catch {
      setErro("Erro de conexão");
      return { ok: false, error: "Erro de conexão" };
    } finally {
      setAprovando(null);
    }
  };

  const aprovar = (p) => ativar({
    titularTipo: p.titularTipo, titularEmail: p.titularEmail, plano: p.plano,
    txid: p.txid, nota: "aprovado via aba Pix Manual do admin",
  });

  // Ativação avulsa por e-mail — não depende da lista acima (que só existe
  // depois da migration ALTER TABLE ter rodado e só lista quem gerou o Pix
  // DEPOIS disso). Cobre qualquer pagamento manual anterior à migration ou
  // que por qualquer motivo não apareceu sozinho na lista — sempre disponível
  // como via de escape, sem depender de mim ter chave nenhuma.
  const [manual, setManual] = useState({ titularTipo: "usuario", titularEmail: "", plano: "acesso", txid: "" });
  const [manualMsg, setManualMsg] = useState(null); // {ok, texto}
  const ativarPorEmail = async () => {
    setManualMsg(null);
    if (!manual.titularEmail.trim()) { setManualMsg({ ok: false, texto: "Informe o e-mail" }); return; }
    const res = await ativar({
      titularTipo: manual.titularTipo, titularEmail: manual.titularEmail.trim(),
      plano: manual.plano, txid: manual.txid.trim() || undefined,
      nota: "ativação avulsa por e-mail (aba Pix Manual)",
    });
    setManualMsg(res.ok
      ? { ok: true, texto: `✓ ${manual.titularEmail.trim()} ativado` }
      : { ok: false, texto: res.error || "Erro ao ativar" });
    if (res.ok) setManual({ titularTipo: "usuario", titularEmail: "", plano: "acesso", txid: "" });
  };

  const inputStyle = {
    background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
    padding: "10px 14px", color: COLORS.textPrimary, fontSize: 13,
    outline: "none", fontFamily: "inherit", width: "100%",
  };
  const labelStyle = { color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> Ativar avulso por e-mail
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 12 }}>
          Pra quando o pagamento não aparece na lista abaixo (ex.: antes da migration, ou qualquer imprevisto) — confira o comprovante antes de ativar.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>E-MAIL *</label>
            <input value={manual.titularEmail} onChange={e => setManual(m => ({ ...m, titularEmail: e.target.value }))} placeholder="pessoa@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>TIPO</label>
            <select value={manual.titularTipo} onChange={e => setManual(m => ({ ...m, titularTipo: e.target.value }))} style={inputStyle}>
              <option value="usuario">Profissional</option>
              <option value="empresa">Empresa</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>PLANO</label>
            <select value={manual.plano} onChange={e => setManual(m => ({ ...m, plano: e.target.value }))} style={inputStyle}>
              <option value="acesso">Taxa de Acesso</option>
              <option value="autonomo">Multi Autônomo</option>
              <option value="pro">Multi Pro</option>
              <option value="premium">Multi Premium</option>
              <option value="empresa">Multi Empresa</option>
              <option value="empresa_plus">Multi Empresa Plus</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>TXID (opcional)</label>
            <input value={manual.txid} onChange={e => setManual(m => ({ ...m, txid: e.target.value }))} placeholder="ACESSO..." style={inputStyle} />
          </div>
        </div>
        <button onClick={ativarPorEmail} disabled={aprovando === manual.titularEmail.trim()} style={{
          background: COLORS.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px",
          fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <CheckCircle2 size={15} /> {aprovando === manual.titularEmail.trim() ? "Ativando..." : "Ativar"}
        </button>
        {manualMsg && (
          <div style={{ color: manualMsg.ok ? COLORS.green : COLORS.red, fontSize: 12, marginTop: 10, fontWeight: 600 }}>
            {manualMsg.texto}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <QrCode size={17} /> Pix Manual — aguardando conciliação
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
          Confira o comprovante/extrato do Nubank PJ contra o código (txid) de cada linha antes de aprovar. Some da lista sozinho depois de aprovado.
        </div>
      </Card>

      {erro && <div style={{ color: COLORS.red, fontSize: 12, fontWeight: 600 }}>{erro}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : pendentes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum Pix manual aguardando confirmação</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pendentes.map(p => (
            <Card key={p.titularEmail} style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <Badge color="orange">{p.plano}</Badge>
                    <span style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: "monospace" }}>{p.txid}</span>
                  </div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{p.nome || p.titularEmail}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                    {p.titularEmail}{p.whatsapp ? " • " + p.whatsapp : ""}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                    Gerado em {p.geradoEm ? new Date(p.geradoEm).toLocaleString("pt-BR") : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: COLORS.green, fontWeight: 800, fontSize: 16 }}>
                    {p.valor != null ? "R$ " + Number(p.valor).toFixed(2).replace(".", ",") : "—"}
                  </div>
                  <button onClick={() => aprovar(p)} disabled={aprovando === p.titularEmail} style={{
                    background: aprovando === p.titularEmail ? COLORS.border : COLORS.green,
                    color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px",
                    fontSize: 13, fontWeight: 700, cursor: aprovando === p.titularEmail ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <CheckCircle2 size={15} /> {aprovando === p.titularEmail ? "Aprovando..." : "Aprovar"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Empresas ─────────────────────────────────────────────
// Fase 1 do plano de CRM (ver memória multi_admin_crm_plano) — primeira aba
// nova do Admin, dados 100% já existentes na tabela "empresas" +
// "pedidos" (demanda de empresa entra em "pedidos" com cliente_id = email
// da empresa, ver NovaDemandaFuncionarioScreen em App.jsx). Sem plano/
// assinatura de empresa pra mostrar — deixou de existir (cadastro é
// grátis agora, ver multi_reforma_modelo_comercial).
function SectionEmpresas({ adminKey }) {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState("todas");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(API + "/api/admin/empresas", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setEmpresas(d.empresas || []); setLoading(false); })
      .catch(() => { setEmpresas([]); setLoading(false); });
  }, []);

  const tipoLabel = (t) => ({ basica: "Presta serviço", contratante: "Só contrata", pro: "Presta e contrata" }[t] || t || "—");

  const filtered = empresas.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || (e.nome || "").toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q) || (e.cnpj || "").includes(q);
    if (!matchSearch) return false;
    if (subTab === "contratam") return e.tipo_conta === "contratante" || e.tipo_conta === "pro";
    if (subTab === "sem_demanda") return (e.demandas_recebidas || 0) === 0;
    return true;
  });

  const subTabs = [
    { id: "todas", label: "Todas", count: empresas.length },
    { id: "contratam", label: "Contratam", count: empresas.filter(e => e.tipo_conta === "contratante" || e.tipo_conta === "pro").length },
    { id: "sem_demanda", label: "Sem Demanda", count: empresas.filter(e => (e.demandas_recebidas || 0) === 0).length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar empresa (nome, email, CNPJ)..." />
        </div>
        <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhuma empresa encontrada</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(e => (
            <Card key={e.id} style={{ padding: 0, overflow: "hidden" }}>
              <div
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: COLORS.blue + "33",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: COLORS.blue, fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>
                  {(e.nome || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{e.nome || "Sem nome"}</span>
                    <Badge color="blue">{tipoLabel(e.tipo_conta)}</Badge>
                    {!e.ativo && <Badge color="red">Inativa</Badge>}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                    {e.email || "—"} • {e.telefone_contato || "—"} • {e.cidade || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {(e.demandas_recebidas || 0) === 0 ? "Sem demanda" : `${e.demandas_recebidas} demanda(s)`}
                  </span>
                  {expanded === e.id ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
                </div>
              </div>

              {expanded === e.id && (
                <div style={{ borderTop: "1px solid " + COLORS.border, padding: "14px 16px", background: COLORS.bg }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {[
                      { label: "CNPJ", value: e.cnpj || "—" },
                      { label: "Categorias", value: (e.categoria_servico || []).join(", ") || "—" },
                      { label: "Vinculados (empresa_id)", value: e.qtd_vinculados || 0 },
                      { label: "Demandas recebidas", value: e.demandas_recebidas || 0 },
                      { label: "Demandas aceitas", value: e.demandas_aceitas || 0 },
                      { label: "Demandas concluídas", value: e.demandas_concluidas || 0 },
                      { label: "Taxa de conversão", value: (e.taxa_conversao || 0) + "%" },
                      { label: "Valor movimentado", value: "R$ " + Number(e.valor_movimentado || 0).toFixed(2) },
                      { label: "Cadastro", value: e.criado_em ? new Date(e.criado_em).toLocaleDateString("pt-BR") : "—" },
                    ].map((f, i) => (
                      <div key={i}>
                        <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</div>
                        <div style={{ color: COLORS.textPrimary, fontSize: 13, marginTop: 2, wordBreak: "break-all" }}>{String(f.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Categorias ───────────────────────────────────────────
// Fase 1 do plano de CRM. Sem coluna "Buscas" (spec original pedia) —
// não existe tracking de busca/visita ainda, isso é Fase 3. O resto
// (solicitações/propostas/fechamentos/conversão) já dá pra calcular com
// o que existe hoje (ver /api/admin/categorias, MULTI-BACKEND).
function SectionCategorias({ adminKey }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(API + "/api/admin/categorias", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setCategorias(d.categorias || []); setLoading(false); })
      .catch(() => { setCategorias([]); setLoading(false); });
  }, []);

  const filtered = categorias.filter(c => !search || c.categoria.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar categoria..." />
      </div>

      <div style={{
        color: COLORS.textMuted, fontSize: 12, background: COLORS.card,
        border: "1px solid " + COLORS.border, borderRadius: 10, padding: "10px 14px",
      }}>
        ℹ️ "Buscas" ainda não é rastreado (precisa de instrumentação nova, fora do escopo desta fase) — os números abaixo partem de solicitações publicadas de verdade.
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhuma categoria encontrada</div>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + COLORS.border }}>
                  {["Categoria", "Solicitações", "Propostas", "Fechamentos", "Conversão"].map(h => (
                    <th key={h} style={{ textAlign: h === "Categoria" ? "left" : "right", padding: "12px 16px", color: COLORS.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.categoria} style={{ borderBottom: i < filtered.length - 1 ? "1px solid " + COLORS.border : "none" }}>
                    <td style={{ padding: "12px 16px", color: COLORS.textPrimary, fontWeight: 700 }}>{c.categoria}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: COLORS.textPrimary }}>{c.solicitacoes}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: COLORS.textPrimary }}>{c.propostas}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: COLORS.textPrimary }}>{c.fechamentos}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Badge color={c.conversao >= 50 ? "green" : c.conversao >= 25 ? "orange" : "red"}>{c.conversao}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Seção: Oportunidades ────────────────────────────────────────
// Fase 1 do plano de CRM — "central de oportunidades perdidas" +
// "dinheiro na mesa" (doc2, o item de maior valor de negócio dos dois
// documentos), calculado com o que já existe hoje (ver
// /api/admin/oportunidades). Não cobre "pagamento abandonado" — não
// existe estado de pagamento parcial por pedido pra detectar isso ainda.
const OPORTUNIDADE_INFO = {
  sem_proposta: { label: "Sem proposta", color: "red", desc: "Pedido aberto, nenhum profissional se candidatou ainda" },
  proposta_sem_resposta: { label: "Proposta sem resposta", color: "orange", desc: "Cliente recebeu proposta e ainda não escolheu" },
  parado_pos_aceite: { label: "Parado pós-aceite", color: "orange", desc: "Profissional aceito, mas o serviço nunca foi concluído" },
};

function waLink(whatsapp) {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : "55" + digits;
  return "https://wa.me/" + withCountry;
}

function tempoParadoLabel(horas) {
  if (horas == null) return "—";
  if (horas < 1) return "menos de 1h";
  if (horas < 24) return horas + "h";
  return Math.round(horas / 24) + "d";
}

function SectionOportunidades({ adminKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("sem_proposta");

  useEffect(() => {
    fetch(API + "/api/admin/oportunidades", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ resumo: {}, itens: [], reativaveis: [] }); setLoading(false); });
  }, []);

  if (loading || !data) {
    return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>;
  }

  const { resumo = {}, itens = [], reativaveis = [] } = data;

  const subTabs = [
    { id: "sem_proposta", label: "Sem Proposta", count: resumo.sem_proposta?.count || 0 },
    { id: "proposta_sem_resposta", label: "Proposta Sem Resposta", count: resumo.proposta_sem_resposta?.count || 0 },
    { id: "parado_pos_aceite", label: "Parado Pós-Aceite", count: resumo.parado_pos_aceite?.count || 0 },
    { id: "reativaveis", label: "Pra Reativar", count: resumo.clientes_reativaveis?.count || 0 },
  ];

  const itensFiltrados = itens.filter(i => i.tipo === subTab).sort((a, b) => (b.horas_parado || 0) - (a.horas_parado || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Dinheiro na mesa */}
      <Card style={{ background: "linear-gradient(135deg, " + COLORS.card + ", " + COLORS.cardHover + ")" }}>
        <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>💰 Dinheiro na mesa</div>
        <div style={{ color: COLORS.green, fontSize: 32, fontWeight: 900, marginTop: 4 }}>
          R$ {Number(resumo.dinheiro_na_mesa || 0).toFixed(2)}
        </div>
        <div style={{ color: COLORS.textSecondary, fontSize: 12.5, marginTop: 4 }}>
          Soma do valor de pedidos parados nas 3 categorias abaixo — não é perda ainda, é o que dá pra recuperar agindo agora.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {Object.entries(OPORTUNIDADE_INFO).map(([tipo, info]) => (
          <MetricCard key={tipo} icon={AlertCircle} label={info.label} value={resumo[tipo]?.count || 0}
            sub={"R$ " + Number(resumo[tipo]?.valor || 0).toFixed(2)} color={COLORS[info.color]} />
        ))}
        <MetricCard icon={RefreshCw} label="Pra Reativar" value={resumo.clientes_reativaveis?.count || 0}
          sub="30+ dias sem pedir de novo" color={COLORS.purple} />
      </div>

      <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} />

      {subTab === "reativaveis" ? (
        reativaveis.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum cliente pra reativar agora</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reativaveis.sort((a, b) => b.dias_parado - a.dias_parado).map(r => (
              <Card key={r.cliente_email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{r.cliente_nome}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{r.cliente_email} • há {r.dias_parado} dias sem pedir</div>
                </div>
                {waLink(r.cliente_whatsapp) && (
                  <a href={waLink(r.cliente_whatsapp)} target="_blank" rel="noopener noreferrer" style={{
                    background: COLORS.green + "22", color: COLORS.green, border: "1px solid " + COLORS.green + "44",
                    borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, textDecoration: "none",
                  }}>Enviar mensagem</a>
                )}
              </Card>
            ))}
          </div>
        )
      ) : itensFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nada parado nessa categoria agora 🎉</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {itensFiltrados.map(i => (
            <Card key={i.pedido_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{i.cliente_nome}</span>
                  <Badge color={OPORTUNIDADE_INFO[i.tipo]?.color}>parado há {tempoParadoLabel(i.horas_parado)}</Badge>
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
                  {i.categoria} • {i.cliente_email} {i.valor ? "• R$ " + i.valor.toFixed(2) : ""}
                </div>
              </div>
              {waLink(i.cliente_whatsapp) && (
                <a href={waLink(i.cliente_whatsapp)} target="_blank" rel="noopener noreferrer" style={{
                  background: COLORS.green + "22", color: COLORS.green, border: "1px solid " + COLORS.green + "44",
                  borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, textDecoration: "none", flexShrink: 0,
                }}>Enviar mensagem</a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Funil ────────────────────────────────────────────────
// Fase 1 do plano de CRM. Funil com os status reais de "pedidos" desse
// projeto — não o funil idealizado da spec original (solicitado→
// aguardando profissional→proposta recebida→...→avaliação), que exigiria
// mudar o fluxo do app inteiro. Ver comentário grande em
// /api/admin/funil (MULTI-BACKEND).
function SectionFunil({ adminKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API + "/api/admin/funil", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData({ funil: [], tempos_medios_horas: {} }); setLoading(false); });
  }, []);

  if (loading || !data) {
    return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>;
  }

  const { funil = [], tempos_medios_horas = {} } = data;
  const max = Math.max(1, ...funil.map(f => f.count));
  const statusColor = { aberto: "blue", confirmado: "purple", em_andamento: "orange", executando: "orange", concluido: "green", cancelado: "red", em_disputa: "red" };
  const fmtHoras = (h) => h == null ? "sem dado suficiente" : h < 24 ? h + "h" : (h / 24).toFixed(1) + " dias";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <MetricCard icon={Clock} label="Criado → Aceite" value={fmtHoras(tempos_medios_horas.criado_ate_aceite)} sub="tempo médio até os dois lados confirmarem" color={COLORS.blue} />
        <MetricCard icon={Clock} label="Aceite → Concluído" value={fmtHoras(tempos_medios_horas.aceite_ate_concluido)} sub="tempo médio de execução" color={COLORS.orange} />
        <MetricCard icon={Clock} label="Criado → Concluído" value={fmtHoras(tempos_medios_horas.criado_ate_concluido)} sub="tempo médio ponta a ponta" color={COLORS.green} />
      </div>

      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 16 }}>Pedidos por status</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {funil.map(f => (
            <div key={f.status}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: COLORS.textMuted }}>{f.count}</span>
              </div>
              <div style={{ background: COLORS.bg, borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{
                  width: (f.count / max * 100) + "%", height: "100%",
                  background: COLORS[statusColor[f.status]] || COLORS.blue, borderRadius: 6, transition: "width .3s",
                }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Seção: Relatórios ───────────────────────────────────────────
// Fase 1 do plano de CRM. Período comparado com o período imediatamente
// anterior de mesmo tamanho (ver /api/admin/relatorio) — dá uma noção de
// crescimento sem precisar de mais infra.
// Agrupa uma lista de linhas {data, categoria, quantidade, valor?} por
// "só categoria" (soma todas as datas) ou "só data" (soma todas as
// categorias) — reaproveita a mesma lista crua que o backend já manda
// agrupada por data×categoria, sem precisar de rota nova pra cada visão
// (ver /api/admin/relatorio-detalhado no backend).
function agruparPor(linhas, campo) {
  const mapa = {};
  linhas.forEach(l => {
    const chave = l[campo];
    if (!mapa[chave]) mapa[chave] = { chave, quantidade: 0, valor: 0 };
    mapa[chave].quantidade += l.quantidade;
    mapa[chave].valor += l.valor || 0;
  });
  return Object.values(mapa).sort((a, b) => a.chave.localeCompare(b.chave));
}

// Tabela genérica data×categoria×quantidade (+valor opcional) com 3 modos
// de visão (detalhado / só categoria / só data) — usada pelos dois
// relatórios novos (Profissionais Ativados, Serviços Concluídos).
function TabelaRelatorio({ titulo, linhas, comValor, aviso }) {
  const [visao, setVisao] = useState("detalhado"); // detalhado | categoria | data

  if (!linhas.length) {
    return (
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 8 }}>{titulo}</div>
        <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Nenhum registro no período.</div>
      </Card>
    );
  }

  const linhasVisao = visao === "categoria" ? agruparPor(linhas, "categoria")
    : visao === "data" ? agruparPor(linhas, "data")
    : linhas;
  const totalQuantidade = linhas.reduce((s, l) => s + l.quantidade, 0);
  const totalValor = linhas.reduce((s, l) => s + (l.valor || 0), 0);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700 }}>{titulo}</div>
        <div style={{ display: "flex", gap: 4, background: COLORS.bg, borderRadius: 8, padding: 3 }}>
          {[{ id: "detalhado", label: "Data × Categoria" }, { id: "categoria", label: "Só Categoria" }, { id: "data", label: "Só Data" }].map(v => (
            <button key={v.id} onClick={() => setVisao(v.id)} style={{
              padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              background: visao === v.id ? COLORS.blue : "transparent", color: visao === v.id ? "#fff" : COLORS.textSecondary,
              fontWeight: 700, fontSize: 11,
            }}>{v.label}</button>
          ))}
        </div>
      </div>
      <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 12 }}>
        Total: {totalQuantidade} {comValor && <>· R$ {totalValor.toFixed(2)}</>}
      </div>
      {aviso && <div style={{ color: COLORS.orange, fontSize: 11, marginBottom: 10, fontStyle: "italic" }}>⚠️ {aviso}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid " + COLORS.border }}>
              {visao !== "categoria" && <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.textMuted, fontWeight: 700 }}>Data</th>}
              {visao !== "data" && <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.textMuted, fontWeight: 700 }}>Categoria</th>}
              <th style={{ textAlign: "right", padding: "6px 8px", color: COLORS.textMuted, fontWeight: 700 }}>Qtd</th>
              {comValor && <th style={{ textAlign: "right", padding: "6px 8px", color: COLORS.textMuted, fontWeight: 700 }}>Valor</th>}
            </tr>
          </thead>
          <tbody>
            {linhasVisao.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid " + COLORS.bg }}>
                {visao !== "categoria" && <td style={{ padding: "6px 8px", color: COLORS.textPrimary }}>{visao === "data" ? l.chave : l.data}</td>}
                {visao !== "data" && <td style={{ padding: "6px 8px", color: COLORS.textPrimary }}>{visao === "categoria" ? l.chave : l.categoria}</td>}
                <td style={{ padding: "6px 8px", color: COLORS.textPrimary, textAlign: "right", fontWeight: 700 }}>{l.quantidade}</td>
                {comValor && <td style={{ padding: "6px 8px", color: COLORS.green, textAlign: "right", fontWeight: 700 }}>R$ {(l.valor || 0).toFixed(2)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SectionRelatorios({ adminKey }) {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detalhado, setDetalhado] = useState(null);
  const [loadingDetalhado, setLoadingDetalhado] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(API + "/api/admin/relatorio?dias=" + dias, { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [dias]);

  useEffect(() => {
    setLoadingDetalhado(true);
    fetch(API + "/api/admin/relatorio-detalhado?dias=" + dias, { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setDetalhado(d); setLoadingDetalhado(false); })
      .catch(() => { setDetalhado(null); setLoadingDetalhado(false); });
  }, [dias]);

  const variacao = (atual, anterior) => {
    if (!anterior) return null;
    return Math.round(((atual - anterior) / anterior) * 100);
  };

  const VarBadge = ({ atual, anterior }) => {
    const v = variacao(atual, anterior);
    if (v == null) return null;
    return <Badge color={v >= 0 ? "green" : "red"}>{v >= 0 ? "+" : ""}{v}% vs. período anterior</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 4, background: COLORS.bg, borderRadius: 10, padding: 4, width: "fit-content" }}>
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDias(d)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: dias === d ? COLORS.blue : "transparent", color: dias === d ? "#fff" : COLORS.textSecondary,
            fontWeight: 700, fontSize: 13,
          }}>{d} dias</button>
        ))}
      </div>

      {loading || !data ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 12 }}>Crescimento</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "Novos clientes", atual: data.atual.usuarios.clientes, anterior: data.anterior.usuarios.clientes },
                { label: "Novos profissionais", atual: data.atual.usuarios.profissionais, anterior: data.anterior.usuarios.profissionais },
                { label: "Novas empresas", atual: data.atual.usuarios.empresas, anterior: data.anterior.usuarios.empresas },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: 800, marginTop: 2 }}>{m.atual}</div>
                  <div style={{ marginTop: 4 }}><VarBadge atual={m.atual} anterior={m.anterior} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 12 }}>Solicitações e conversão</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "Solicitações", atual: data.atual.pedidos.solicitacoes, anterior: data.anterior.pedidos.solicitacoes },
                { label: "Concluídos", atual: data.atual.pedidos.concluidos, anterior: data.anterior.pedidos.concluidos },
                { label: "Cancelados", atual: data.atual.pedidos.cancelados, anterior: data.anterior.pedidos.cancelados },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: 800, marginTop: 2 }}>{m.atual}</div>
                  <div style={{ marginTop: 4 }}><VarBadge atual={m.atual} anterior={m.anterior} /></div>
                </div>
              ))}
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>Taxa de conversão</div>
                <div style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: 800, marginTop: 2 }}>{data.atual.pedidos.taxa_conversao}%</div>
              </div>
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>Valor movimentado</div>
                <div style={{ color: COLORS.green, fontSize: 24, fontWeight: 800, marginTop: 2 }}>R$ {Number(data.atual.pedidos.valor_movimentado || 0).toFixed(2)}</div>
              </div>
            </div>
          </Card>

          {/* Dois relatórios pedidos pelo Thiago (2026-08-31): Profissionais
              Ativados e Serviços Concluídos, cada um agrupável por data e por
              categoria — ver /api/admin/relatorio-detalhado no backend pro
              detalhe de como cada um é calculado (inclusive a limitação de
              data do relatório 1, sem approved_em na tabela). */}
          {loadingDetalhado || !detalhado ? (
            <div style={{ textAlign: "center", padding: 24, color: COLORS.textMuted }}>Carregando relatórios detalhados...</div>
          ) : (
            <>
              <TabelaRelatorio
                titulo={`Profissionais Ativados${detalhado.profissionais_ativados.sem_categoria ? ` (${detalhado.profissionais_ativados.sem_categoria} sem categoria, não listados)` : ""}`}
                linhas={detalhado.profissionais_ativados.linhas}
                aviso={detalhado.profissionais_ativados.limitacao_data}
              />
              <TabelaRelatorio
                titulo="Serviços Concluídos"
                linhas={detalhado.servicos_concluidos.linhas}
                comValor
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Sugestões de categoria — texto livre por trás (ver supabase_despesas_migration.sql,
// "categorias de despesa mudam mais rápido do que valeria travar num enum"),
// isso aqui é só datalist pra digitar mais rápido, não trava nada.
const DESPESA_CATEGORIAS_SUGERIDAS = ["Tráfego pago", "Ferramentas", "Freelancer", "Infraestrutura", "Outros"];

// ─── Seção: Financeiro ────────────────────────────────────────────
function SectionFinanceiro({ adminKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [despesas, setDespesas] = useState([]);
  const [loadingDespesas, setLoadingDespesas] = useState(true);
  const [form, setForm] = useState({ categoria: "", descricao: "", valor: "", data: new Date().toISOString().slice(0, 10) });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregarDespesas = () => {
    setLoadingDespesas(true);
    fetch(API + "/api/admin/despesas", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setDespesas(d.despesas || []); setLoadingDespesas(false); })
      .catch(() => { setDespesas([]); setLoadingDespesas(false); });
  };

  const carregarFinanceiro = () => {
    setLoading(true);
    fetch(API + "/api/admin/financial", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  };

  useEffect(() => { carregarFinanceiro(); carregarDespesas(); }, []);

  const handleLancar = async () => {
    const valorNum = Number(form.valor.replace(",", "."));
    if (!form.categoria.trim()) return setErro("Categoria é obrigatória");
    if (!valorNum || valorNum <= 0) return setErro("Valor precisa ser maior que zero");
    setErro("");
    setSalvando(true);
    try {
      const r = await fetch(API + "/api/admin/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ categoria: form.categoria.trim(), descricao: form.descricao.trim() || null, valor: valorNum, data: form.data }),
      });
      if (!r.ok) throw new Error();
      setForm({ categoria: "", descricao: "", valor: "", data: new Date().toISOString().slice(0, 10) });
      carregarDespesas();
      carregarFinanceiro(); // Lucro Líquido muda com toda despesa nova
    } catch {
      setErro("Erro ao lançar despesa");
    } finally {
      setSalvando(false);
    }
  };

  const handleApagar = async (id) => {
    try {
      await fetch(API + "/api/admin/despesas/" + id, { method: "DELETE", headers: { "x-admin-key": adminKey } });
      carregarDespesas();
      carregarFinanceiro();
    } catch {}
  };

  // Auditoria sob demanda (não roda sozinha) — ver comentário grande em
  // server.js /api/admin/reconciliacao-assinaturas. Nasceu do caso do
  // RENATO: pagamento real na Asaas, linha em "assinaturas" sumiu sozinha
  // (bug de durabilidade do Supabase). Só relata — corrigir um problema
  // encontrado aqui é sempre manual (mesmo processo usado pra restaurar o
  // Renato), nunca escrita automática.
  const [reconciliacao, setReconciliacao] = useState(null);
  const [reconciliando, setReconciliando] = useState(false);
  const handleReconciliar = async () => {
    setReconciliando(true);
    setReconciliacao(null);
    try {
      const r = await fetch(API + "/api/admin/reconciliacao-assinaturas?dias=90", { headers: { "x-admin-key": adminKey } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro");
      setReconciliacao(d);
    } catch {
      setReconciliacao({ erro: true });
    } finally {
      setReconciliando(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Dados financeiros indisponíveis</div>;

  const lucroPositivo = Number(data.lucroLiquido) >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Receita Total", value: "R$ " + (data.totalRevenue || "0,00"), color: COLORS.green, icon: DollarSign },
          { label: "Despesas Total", value: "R$ " + (data.totalDespesas || "0,00"), color: COLORS.red, icon: Banknote },
          { label: "Lucro Líquido", value: "R$ " + (data.lucroLiquido || "0,00"), color: lucroPositivo ? COLORS.green : COLORS.red, icon: TrendingUp },
          { label: "Saldo em Carteiras", value: "R$ " + (data.totalWallets || "0,00"), color: COLORS.blue, icon: Wallet },
          { label: "Saques Realizados", value: "R$ " + (data.totalWithdrawals || "0,00"), color: COLORS.orange, icon: Banknote },
          { label: "Receita PRO", value: "R$ " + (data.proRevenue || "0,00"), color: COLORS.purple, icon: Crown },
          { label: "Pagamentos Pendentes", value: data.pendingPayments || 0, color: COLORS.red, icon: Clock },
          { label: "Assinaturas Ativas", value: data.activeSubscriptions || 0, color: COLORS.orange, icon: CreditCard },
        ].map((m, i) => <MetricCard key={i} {...m} />)}
      </div>

      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 12 }}>Lançar Despesa</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Categoria</div>
            <input list="despesa-categorias" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              placeholder="Ex: Tráfego pago" style={{ background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "8px 10px", color: COLORS.textPrimary, fontSize: 13, width: "100%", outline: "none" }} />
            <datalist id="despesa-categorias">
              {DESPESA_CATEGORIAS_SUGERIDAS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Descrição (opcional)</div>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Campanha Instagram Ads" style={{ background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "8px 10px", color: COLORS.textPrimary, fontSize: 13, width: "100%", outline: "none" }} />
          </div>
          <div style={{ flex: "0 1 130px" }}>
            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Data</div>
            <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              style={{ background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "8px 10px", color: COLORS.textPrimary, fontSize: 13, width: "100%", outline: "none" }} />
          </div>
          <div style={{ flex: "0 1 120px" }}>
            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Valor (R$)</div>
            <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              placeholder="40,00" style={{ background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8, padding: "8px 10px", color: COLORS.textPrimary, fontSize: 13, width: "100%", outline: "none" }} />
          </div>
          <button onClick={handleLancar} disabled={salvando} style={{
            background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer",
            opacity: salvando ? 0.7 : 1, flexShrink: 0,
          }}>
            {salvando ? "Salvando..." : "Lançar"}
          </button>
        </div>
        {erro && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 8 }}>{erro}</div>}
      </Card>

      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 12 }}>Despesas Lançadas</div>
        {loadingDespesas ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Carregando...</div>
        ) : despesas.length === 0 ? (
          <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Nenhuma despesa lançada ainda.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {despesas.map((d, i) => (
              <div key={d.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
                padding: "10px 0", borderBottom: i < despesas.length - 1 ? "1px solid " + COLORS.border : "none",
              }}>
                <div>
                  <div style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>
                    {d.categoria}{d.descricao ? " — " + d.descricao : ""}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{d.data ? new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: COLORS.red, fontWeight: 700 }}>- R$ {Number(d.valor).toFixed(2)}</div>
                  <button onClick={() => handleApagar(d.id)} style={{
                    background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: 4,
                  }} title="Apagar">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <div>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700 }}>Auditoria Asaas × Supabase</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
              Compara pagamentos reais dos últimos 90 dias contra "assinaturas" — acha casos como o do Renato antes que precisem de reclamação.
            </div>
          </div>
          <button onClick={handleReconciliar} disabled={reconciliando} style={{
            background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: reconciliando ? "default" : "pointer",
            opacity: reconciliando ? 0.7 : 1, flexShrink: 0,
          }}>
            {reconciliando ? "Auditando..." : "Rodar Auditoria"}
          </button>
        </div>

        {reconciliacao?.erro && (
          <div style={{ color: COLORS.red, fontSize: 13, marginTop: 12 }}>Erro ao auditar — tenta de novo.</div>
        )}

        {reconciliacao && !reconciliacao.erro && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 10 }}>
              {reconciliacao.pagamentos_verificados} pagamento(s) · {reconciliacao.clientes_verificados || 0} cliente(s) verificado(s) nos últimos {reconciliacao.periodo_dias} dias
            </div>
            {reconciliacao.problemas.length === 0 ? (
              <div style={{ color: COLORS.green, fontSize: 13, fontWeight: 600 }}>✓ Nenhuma divergência encontrada — tudo bate.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reconciliacao.problemas.map((p, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: COLORS.red + "18", border: "1px solid " + COLORS.red + "44" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Badge color="red">
                        {p.tipo === "assinatura_ausente" ? "Assinatura sumiu" : p.tipo === "customer_id_divergente" ? "Customer ID divergente" : p.tipo === "cliente_sem_email" ? "Cliente sem email" : "Status desconhecido"}
                      </Badge>
                      <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 13 }}>{p.nome || p.email || p.asaasCustomerId}</span>
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                      {p.email && <>{p.email} · </>}
                      {p.asaasCustomerId && <>Asaas: {p.asaasCustomerId}</>}
                      {p.supabaseCustomerId && <> · Supabase: {p.supabaseCustomerId}</>}
                      {p.supabaseStatus && <> · status atual: {p.supabaseStatus}</>}
                    </div>
                    {p.pagamentos && p.pagamentos.length > 0 && (
                      <div style={{ color: COLORS.textSecondary, fontSize: 11.5, marginTop: 4 }}>
                        {p.pagamentos.length} pagamento(s): {p.pagamentos.map(pg => "R$ " + Number(pg.value).toFixed(2)).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {data.transactions && data.transactions.length > 0 && (
        <Card>
          <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 12 }}>Últimas Transações</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.transactions.map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < data.transactions.length - 1 ? "1px solid " + COLORS.border : "none",
              }}>
                <div>
                  <div style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{t.description || "Transação"}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{t.date ? new Date(t.date).toLocaleDateString("pt-BR") : "—"}</div>
                </div>
                <div style={{ color: t.type === "credit" ? COLORS.green : COLORS.red, fontWeight: 700 }}>
                  {t.type === "credit" ? "+" : "-"}R$ {t.amount || "0,00"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Seção: Cupons ────────────────────────────────────────────────
// Cupons de parceria/divulgação — 1 mês grátis do Multi Autônomo, código
// reutilizável (mesmo código serve pra vários profissionais). Ver
// supabase_cupons_migration.sql e /api/admin/cupons* no backend.
function SectionCupons({ adminKey }) {
  const [cupons, setCupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoExpira, setNovoExpira] = useState("");
  const [novoUsosMax, setNovoUsosMax] = useState("");
  // Checkboxes explícitos em vez de confiar em "campo vazio" — achado
  // 2026-08-12: um clique sem querer na setinha do input numérico (que pula
  // pra "1" mesmo partindo de vazio, comportamento padrão do browser) ou no
  // seletor de data nativo criava um cupom com expira_em/usos_maximos reais
  // mesmo sem a pessoa perceber que preencheu algo. Os inputs abaixo agora
  // ficam desabilitados enquanto o checkbox "sem limite/sem expiração"
  // (marcado por padrão) estiver ativo, e o valor é ignorado no envio nesse
  // caso independente do que estiver digitado neles.
  const [semExpiracao, setSemExpiracao] = useState(true);
  const [semLimite, setSemLimite] = useState(true);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  // Qual cupom está com a lista de "quem usou" expandida — só 1 por vez,
  // busca sob demanda (não carrega os usos de todos os cupons de cara).
  const [expandido, setExpandido] = useState(null);
  const [usos, setUsos] = useState({}); // { [cupomId]: [...] }
  const [carregandoUsos, setCarregandoUsos] = useState(false);

  const carregar = () => {
    setLoading(true);
    fetch(API + "/api/admin/cupons", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => { setCupons(d.cupons || []); setLoading(false); })
      .catch(() => { setCupons([]); setLoading(false); });
  };
  useEffect(carregar, []);

  const criarCupom = async () => {
    if (!novoCodigo.trim()) return;
    setCriando(true);
    setErro("");
    try {
      const r = await fetch(API + "/api/admin/cupons", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          codigo: novoCodigo,
          // Ignora o que estiver nos inputs quando o checkbox "sem
          // limite/sem expiração" está marcado — não basta o campo estar
          // vazio, o checkbox é quem decide de verdade.
          expiraEm: semExpiracao || !novoExpira ? null : new Date(novoExpira).toISOString(),
          usosMaximos: semLimite || !novoUsosMax ? null : novoUsosMax,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || "Erro ao criar cupom"); return; }
      setNovoCodigo(""); setNovoExpira(""); setNovoUsosMax(""); setSemExpiracao(true); setSemLimite(true);
      carregar();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setCriando(false);
    }
  };

  const alternarAtivo = async (cupom) => {
    await fetch(API + "/api/admin/cupons/" + cupom.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ ativo: !cupom.ativo }),
    });
    carregar();
  };

  const verUsos = async (cupom) => {
    if (expandido === cupom.id) { setExpandido(null); return; }
    setExpandido(cupom.id);
    if (usos[cupom.id]) return; // já carregado, só reabre
    setCarregandoUsos(true);
    try {
      const r = await fetch(API + "/api/admin/cupons/" + cupom.id + "/usos", { headers: { "x-admin-key": adminKey } });
      const d = await r.json();
      setUsos(u => ({ ...u, [cupom.id]: d.usos || [] }));
    } finally {
      setCarregandoUsos(false);
    }
  };

  const inputStyle = {
    background: COLORS.bg, border: "1px solid " + COLORS.border, borderRadius: 8,
    padding: "10px 14px", color: COLORS.textPrimary, fontSize: 13,
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Tag size={17} /> Novo cupom
        </div>
        <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 14 }}>
          Dá 1 mês grátis do Multi Autônomo. Reutilizável — o mesmo código serve pra vários profissionais (cada um só pode usar uma vez).
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>CÓDIGO</label>
            <input value={novoCodigo} onChange={e => setNovoCodigo(e.target.value.toUpperCase())} placeholder="DIVULGA30" style={{ ...inputStyle, width: 160, textTransform: "uppercase" }} />
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>EXPIRA EM</label>
            <input
              type="date" value={novoExpira} disabled={semExpiracao}
              onChange={e => setNovoExpira(e.target.value)}
              style={{ ...inputStyle, width: 150, opacity: semExpiracao ? 0.4 : 1, cursor: semExpiracao ? "not-allowed" : "text" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, color: COLORS.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={semExpiracao} onChange={e => setSemExpiracao(e.target.checked)} />
              Sem expiração
            </label>
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>LIMITE DE USOS</label>
            <input
              type="number" min="1" value={novoUsosMax} disabled={semLimite}
              onChange={e => setNovoUsosMax(e.target.value)}
              style={{ ...inputStyle, width: 150, opacity: semLimite ? 0.4 : 1, cursor: semLimite ? "not-allowed" : "text" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, color: COLORS.textMuted, cursor: "pointer" }}>
              <input type="checkbox" checked={semLimite} onChange={e => setSemLimite(e.target.checked)} />
              Sem limite de usos
            </label>
          </div>
          <button onClick={criarCupom} disabled={criando || !novoCodigo.trim()} style={{
            background: criando || !novoCodigo.trim() ? COLORS.border : COLORS.blue,
            color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px",
            fontSize: 13, fontWeight: 700, cursor: criando || !novoCodigo.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, height: 38,
          }}>
            <Plus size={15} /> {criando ? "Criando..." : "Criar cupom"}
          </button>
        </div>
        {erro && <div style={{ color: COLORS.red, fontSize: 12, marginTop: 10, fontWeight: 600 }}>{erro}</div>}
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>
      ) : cupons.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Nenhum cupom criado ainda</div>
      ) : (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {cupons.map((c, i) => {
              const expirado = c.expira_em && new Date(c.expira_em) < new Date();
              const esgotado = c.usos_maximos != null && c.usos_count >= c.usos_maximos;
              return (
                <div key={c.id} style={{ borderBottom: i < cupons.length - 1 ? "1px solid " + COLORS.border : "none", padding: "12px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: COLORS.textPrimary, fontWeight: 800, fontSize: 14, fontFamily: "monospace" }}>{c.codigo}</span>
                      <Badge color={c.ativo && !expirado && !esgotado ? "green" : "red"}>
                        {!c.ativo ? "Desativado" : expirado ? "Expirado" : esgotado ? "Esgotado" : "Ativo"}
                      </Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
                        {c.usos_count} uso{c.usos_count === 1 ? "" : "s"}{c.usos_maximos != null ? ` / ${c.usos_maximos}` : ""}
                      </span>
                      {c.expira_em && (
                        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>expira {new Date(c.expira_em).toLocaleDateString("pt-BR")}</span>
                      )}
                      <button onClick={() => verUsos(c)} style={{
                        background: "none", border: "1px solid " + COLORS.border, borderRadius: 6,
                        color: COLORS.textMuted, fontSize: 11.5, fontWeight: 600, padding: "5px 10px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        Ver usos {expandido === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button onClick={() => alternarAtivo(c)} style={{
                        background: c.ativo ? COLORS.red + "22" : COLORS.green + "22",
                        color: c.ativo ? COLORS.red : COLORS.green, border: "none", borderRadius: 6,
                        fontSize: 11.5, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
                      }}>
                        {c.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  </div>
                  {expandido === c.id && (
                    <div style={{ marginTop: 10, paddingLeft: 4 }}>
                      {carregandoUsos && !usos[c.id] ? (
                        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Carregando...</div>
                      ) : !usos[c.id]?.length ? (
                        <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Ninguém usou esse cupom ainda</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {usos[c.id].map(u => (
                            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: COLORS.textPrimary, background: COLORS.bg, borderRadius: 6, padding: "6px 10px" }}>
                              <span>{u.titular_email}</span>
                              <span style={{ color: COLORS.textMuted }}>{new Date(u.usado_em).toLocaleDateString("pt-BR")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Seção: Email ─────────────────────────────────────────────────
function SectionEmail({ adminKey }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!subject || !body) return;
    setSending(true);
    try {
      const r = await fetch(API + "/api/admin/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ subject, body, target }),
      });
      const d = await r.json();
      setResult({ ok: r.ok, msg: r.ok ? "Campanha enviada para " + (d.sent || 0) + " destinatários!" : "Erro: " + (d.error || "falha") });
    } catch (e) {
      setResult({ ok: false, msg: "Erro de conexão" });
    }
    setSending(false);
  };

  const inputStyle = {
    background: COLORS.bg,
    border: "1px solid " + COLORS.border,
    borderRadius: 8,
    padding: "10px 14px",
    color: COLORS.textPrimary,
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <Card>
      <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
        Campanha de Email
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DESTINATÁRIOS</label>
          <select value={target} onChange={e => setTarget(e.target.value)} style={{ ...inputStyle }}>
            <option value="all">Todos os usuários</option>
            <option value="clients">Apenas clientes</option>
            <option value="professionals">Apenas profissionais</option>
            <option value="pro">Assinantes PRO</option>
            <option value="no_close_clients">Clientes que não fecharam</option>
            <option value="no_close_pros">Profissionais sem serviços</option>
          </select>
        </div>

        <div>
          <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ASSUNTO</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto do email" style={inputStyle} />
        </div>

        <div>
          <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>MENSAGEM</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Escreva a mensagem..."
            rows={6}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {result && (
          <div style={{
            background: result.ok ? COLORS.green + "22" : COLORS.red + "22",
            border: "1px solid " + (result.ok ? COLORS.green : COLORS.red) + "44",
            color: result.ok ? COLORS.green : COLORS.red,
            padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          }}>
            {result.msg}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject || !body}
          style={{
            background: sending || !subject || !body ? COLORS.border : COLORS.blue,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: sending || !subject || !body ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <Mail size={16} />
          {sending ? "Enviando..." : "Enviar Campanha"}
        </button>
      </div>
    </Card>
  );
}

// ─── AdminDashboard principal ─────────────────────────────────────
function AdminDashboard({ onExit }) {
  // 2026-08-13: a senha real não mora mais aqui — só o token que o backend
  // devolve depois de validar a senha (POST /api/admin/login). Guardado em
  // sessionStorage pra sobreviver a reload, mas some ao fechar a aba/1x
  // sem precisar logar nada persistente no disco.
  const [token, setToken] = useState(() => sessionStorage.getItem("adminToken") || "");
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem("adminToken"));
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState("metrics");
  const [metrics, setMetrics] = useState({});

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setAuthed(false);
  };

  useEffect(() => {
    if (authed) {
      const headers = { "x-admin-key": token };
      // se o token expirou (24h) ou foi revogado, o backend responde 401 —
      // desloga em vez de deixar o painel travado mostrando tudo em branco.
      const getJson = r => (r.status === 401 ? (handleLogout(), Promise.reject("unauthorized")) : r.json());
      // /api/admin/stats não tem pendingApproval/totalServices/activeServices —
      // completa com /professionals e /services. conclusionRate fica 0: não
      // existe status "concluído" nos pedidos reais ainda para calcular a taxa.
      Promise.all([
        fetch(API + "/api/admin/stats", { headers }).then(getJson).catch(() => ({})),
        fetch(API + "/api/admin/professionals", { headers }).then(getJson).catch(() => ({ professionals: [] })),
        fetch(API + "/api/admin/services", { headers }).then(getJson).catch(() => ({ services: [] })),
      ]).then(([stats, prosData, servicesData]) => {
        const pros = prosData.professionals || [];
        const services = servicesData.services || [];
        // origem "demo" (pedido fictício) fora da contagem da Visão Geral —
        // senão infla totalServices artificialmente (activeServices já ficava
        // naturalmente de fora, pedido fictício nunca sai de "aberto").
        const servicesReais = services.filter(s => s.origem !== "demo");
        setMetrics({
          totalUsers: stats.totalUsers,
          totalClients: stats.totalClients,
          totalPros: stats.totalPros,
          totalPro: stats.proAtivos,
          totalRevenue: stats.receitaEstimada,
          pendingApproval: pros.filter(p => !p.approved).length,
          totalServices: servicesReais.length,
          activeServices: servicesReais.filter(s => s.status === "executando" || s.status === "em_andamento").length,
        });
      });
    }
  }, [authed]);

  const handleLogin = () => {
    setLoggingIn(true);
    setError("");
    fetch(API + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.token) throw new Error(data.error || "Senha incorreta");
        sessionStorage.setItem("adminToken", data.token);
        setToken(data.token);
        setPass("");
        setAuthed(true);
      })
      .catch(err => setError(err.message === "Failed to fetch" ? "Não foi possível conectar ao servidor" : err.message))
      .finally(() => setLoggingIn(false));
  };

  // ── Tela de login ──
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", background: COLORS.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Nunito, sans-serif",
      }}>
        <Card style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: COLORS.blue + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Shield size={28} color={COLORS.blue} />
          </div>
          <div style={{ color: COLORS.textPrimary, fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Admin Multi</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 24 }}>Painel administrativo restrito</div>

          <div style={{ position: "relative", marginBottom: 12 }}>
            <input
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Senha"
              style={{
                background: COLORS.bg, border: "1px solid " + (error ? COLORS.red : COLORS.border),
                borderRadius: 10, padding: "12px 44px 12px 16px",
                color: COLORS.textPrimary, fontSize: 14, width: "100%", outline: "none",
              }}
            />
            <button onClick={() => setShowPass(!showPass)} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: COLORS.textMuted, padding: 0,
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <div style={{ color: COLORS.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <button onClick={handleLogin} disabled={loggingIn} style={{
            background: COLORS.blue, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: loggingIn ? "default" : "pointer", width: "100%",
            opacity: loggingIn ? 0.7 : 1,
          }}>
            {loggingIn ? "Entrando..." : "Entrar"}
          </button>

          {onExit && (
            <button onClick={onExit} style={{
              background: "none", border: "none", color: COLORS.textMuted,
              fontSize: 13, cursor: "pointer", marginTop: 12,
            }}>
              Voltar ao app
            </button>
          )}
        </Card>
      </div>
    );
  }

  // ── Dashboard ──
  const tabs = [
    { id: "metrics", label: "Visão Geral", icon: Activity },
    { id: "pros", label: "Profissionais", icon: ShieldCheck, count: metrics.pendingApproval || undefined },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "empresas", label: "Empresas", icon: Building2 },
    { id: "services", label: "Serviços", icon: FileText },
    { id: "ficticios", label: "Fictícios", icon: FlaskConical },
    { id: "pixmanual", label: "Pix Manual", icon: QrCode },
    { id: "suporte", label: "Demandas Suporte", icon: Phone },
    { id: "interesses", label: "Interesses MULTI-SUP", icon: BellRing },
    { id: "categorias", label: "Categorias", icon: Filter },
    { id: "oportunidades", label: "Oportunidades", icon: AlertCircle },
    { id: "funil", label: "Funil", icon: TrendingUp },
    { id: "relatorios", label: "Relatórios", icon: Download },
    { id: "financial", label: "Financeiro", icon: DollarSign },
    { id: "cupons", label: "Cupons", icon: Tag },
    { id: "email", label: "Email", icon: Mail },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "Nunito, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: COLORS.card, borderBottom: "1px solid " + COLORS.border,
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Shield size={20} color={COLORS.blue} />
          <span style={{ color: COLORS.textPrimary, fontWeight: 800, fontSize: 16 }}>Multi Admin</span>
          <Badge color="blue">v2</Badge>
        </div>
        <button onClick={() => { handleLogout(); if (onExit) onExit(); }} style={{
          background: COLORS.red + "22", color: COLORS.red, border: "none",
          borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <LogOut size={14} /> Sair
        </button>
      </div>

      {/* Nav */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid " + COLORS.border, overflowX: "auto" }}>
        <TabBar tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {/* Content */}
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        {tab === "metrics" && <SectionMetrics data={metrics} adminKey={token} onNavigate={setTab} />}
        {tab === "pros" && <SectionProfissionais adminKey={token} />}
        {tab === "clients" && <SectionClientes adminKey={token} />}
        {tab === "empresas" && <SectionEmpresas adminKey={token} />}
        {tab === "services" && <SectionServicos adminKey={token} />}
        {tab === "ficticios" && <SectionFicticios adminKey={token} />}
        {tab === "pixmanual" && <SectionPixManual adminKey={token} />}
        {tab === "suporte" && <SectionDemandaSuporte adminKey={token} />}
        {tab === "interesses" && <SectionInteressesMultiSup adminKey={token} />}
        {tab === "categorias" && <SectionCategorias adminKey={token} />}
        {tab === "oportunidades" && <SectionOportunidades adminKey={token} />}
        {tab === "funil" && <SectionFunil adminKey={token} />}
        {tab === "relatorios" && <SectionRelatorios adminKey={token} />}
        {tab === "financial" && <SectionFinanceiro adminKey={token} />}
        {tab === "cupons" && <SectionCupons adminKey={token} />}
        {tab === "email" && <SectionEmail adminKey={token} />}
      </div>
    </div>
  );
}

export default AdminDashboard;
