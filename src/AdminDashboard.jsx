import React, { useState, useEffect } from "react";
import {
  Shield, Users, DollarSign, Activity, CheckCircle2, X, Crown,
  Lock, Bell, Eye, EyeOff, LogOut, AlertCircle, FileText,
  Wallet, CreditCard, HeartHandshake, KeyRound, BellRing,
  BadgeCheck, Banknote, ShieldCheck, Mail, TrendingUp,
  Clock, MapPin, Phone, Star, XCircle, ChevronDown, ChevronUp,
  Search, Filter, Download, RefreshCw, Tag, Plus
} from "lucide-react";

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

// ─── Seção: Métricas ────────────────────────────────────────────
function SectionMetrics({ data }) {
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
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

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (subTab === "sem_fechar") return (c.services_count || 0) === 0;
    if (subTab === "com_servico") return (c.services_count || 0) > 0;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: clients.length },
    { id: "com_servico", label: "Com Serviço", count: clients.filter(c => (c.services_count || 0) > 0).length },
    { id: "sem_fechar", label: "Não Fecharam", count: clients.filter(c => (c.services_count || 0) === 0).length },
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
                    {(c.services_count || 0) === 0
                      ? <Badge color="orange">Não fechou</Badge>
                      : <Badge color="green">{c.services_count} serviço(s)</Badge>
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
                      { label: "Total serviços", value: c.services_count || 0 },
                      { label: "Gasto total", value: c.total_spent ? "R$ " + c.total_spent : "R$ 0" },
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Badge color={statusColor(s.status)}>{statusLabel(s.status)}</Badge>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{s.protocol || "—"}</span>
                  </div>
                  <div style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{s.title || "Sem título"}</div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                    Cliente: {s.client_name || s.user_id || "—"} • Prof: {s.professional_name || "Sem profissional"}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    {s.location || s.city || "—"} • {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "—"}
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
        setMetrics({
          totalUsers: stats.totalUsers,
          totalClients: stats.totalClients,
          totalPros: stats.totalPros,
          totalPro: stats.proAtivos,
          totalRevenue: stats.receitaEstimada,
          pendingApproval: pros.filter(p => !p.approved).length,
          totalServices: services.length,
          activeServices: services.filter(s => s.status === "executando" || s.status === "em_andamento").length,
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
    { id: "services", label: "Serviços", icon: FileText },
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
        {tab === "metrics" && <SectionMetrics data={metrics} />}
        {tab === "pros" && <SectionProfissionais adminKey={token} />}
        {tab === "clients" && <SectionClientes adminKey={token} />}
        {tab === "services" && <SectionServicos adminKey={token} />}
        {tab === "financial" && <SectionFinanceiro adminKey={token} />}
        {tab === "cupons" && <SectionCupons adminKey={token} />}
        {tab === "email" && <SectionEmail adminKey={token} />}
      </div>
    </div>
  );
}

export default AdminDashboard;
