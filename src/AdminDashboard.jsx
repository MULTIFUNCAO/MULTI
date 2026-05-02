import React, { useState, useEffect } from "react";
import {
  Shield, Users, DollarSign, Activity, CheckCircle2, X, Crown,
  Lock, Bell, Eye, EyeOff, LogOut, AlertCircle, FileText,
  Wallet, CreditCard, HeartHandshake, KeyRound, BellRing,
  BadgeCheck, Banknote, ShieldCheck, Mail, TrendingUp,
  Clock, MapPin, Phone, Star, XCircle, ChevronDown, ChevronUp,
  Search, Filter, Download, RefreshCw
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

const API = "https://api.multifuncao.com.br";

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
    { icon: HeartHandshake, label: "Clientes", value: data.totalClients || 0, sub: data.clientsNoClose + " sem fechar", color: COLORS.purple },
    { icon: ShieldCheck, label: "Profissionais", value: data.totalPros || 0, sub: data.prosNoClose + " sem fechar", color: COLORS.green },
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
    fetch(API + "/admin/professionals?key=" + adminKey)
      .then(r => r.json())
      .then(d => { setPros(d.professionals || []); setLoading(false); })
      .catch(() => { setPros([]); setLoading(false); });
  }, []);

  const handleApprove = async (id) => {
    try {
      const r = await fetch(API + "/admin/approve-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, key: adminKey }),
      });
      if (r.ok) {
        setPros(p => p.map(x => x.id === id ? { ...x, approved: true } : x));
        showToast("Profissional aprovado!", "green");
      }
    } catch { showToast("Erro ao aprovar", "red"); }
  };

  const handleReject = async (id) => {
    try {
      const r = await fetch(API + "/admin/reject-professional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, key: adminKey }),
      });
      if (r.ok) {
        setPros(p => p.filter(x => x.id !== id));
        showToast("Profissional reprovado.", "orange");
      }
    } catch { showToast("Erro ao reprovar", "red"); }
  };

  const filtered = pros.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q) || (p.whatsapp || "").includes(q);
    if (!matchSearch) return false;
    if (subTab === "pendentes") return !p.approved;
    if (subTab === "aprovados") return p.approved && !p.is_pro;
    if (subTab === "pro") return p.is_pro;
    if (subTab === "sem_fechar") return p.approved && (p.services_count || 0) === 0;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: pros.length },
    { id: "pendentes", label: "Pendentes", count: pros.filter(p => !p.approved).length },
    { id: "aprovados", label: "Aprovados", count: pros.filter(p => p.approved && !p.is_pro).length },
    { id: "pro", label: "PRO", count: pros.filter(p => p.is_pro).length },
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: 14 }}>{p.name || "Sem nome"}</span>
                    {p.is_pro && <Badge color="orange">PRO</Badge>}
                    {p.approved ? <Badge color="green">Aprovado</Badge> : <Badge color="red">Pendente</Badge>}
                  </div>
                  <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
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
    fetch(API + "/admin/clients?key=" + adminKey)
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
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
    fetch(API + "/admin/services?key=" + adminKey)
      .then(r => r.json())
      .then(d => { setServices(d.services || []); setLoading(false); })
      .catch(() => { setServices([]); setLoading(false); });
  }, []);

  const statusLabel = (s) => {
    const map = { searching: "Buscando", agreement: "Acordo", executing: "Executando", completed: "Concluído", cancelled: "Cancelado" };
    return map[s] || s;
  };

  const statusColor = (s) => {
    const map = { searching: "blue", agreement: "orange", executing: "purple", completed: "green", cancelled: "red" };
    return map[s] || "blue";
  };

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || (s.title || "").toLowerCase().includes(q) || (s.client_name || "").toLowerCase().includes(q) || (s.protocol || "").includes(q);
    if (!matchSearch) return false;
    if (subTab !== "todos") return s.status === subTab;
    return true;
  });

  const subTabs = [
    { id: "todos", label: "Todos", count: services.length },
    { id: "searching", label: "Buscando", count: services.filter(s => s.status === "searching").length },
    { id: "executing", label: "Em andamento", count: services.filter(s => s.status === "executing").length },
    { id: "completed", label: "Concluídos", count: services.filter(s => s.status === "completed").length },
    { id: "cancelled", label: "Cancelados", count: services.filter(s => s.status === "cancelled").length },
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

// ─── Seção: Financeiro ────────────────────────────────────────────
function SectionFinanceiro({ adminKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API + "/admin/financial?key=" + adminKey)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Carregando...</div>;
  if (!data) return <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>Dados financeiros indisponíveis</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Receita Total", value: "R$ " + (data.totalRevenue || "0,00"), color: COLORS.green, icon: DollarSign },
          { label: "Saldo em Carteiras", value: "R$ " + (data.totalWallets || "0,00"), color: COLORS.blue, icon: Wallet },
          { label: "Saques Realizados", value: "R$ " + (data.totalWithdrawals || "0,00"), color: COLORS.orange, icon: Banknote },
          { label: "Receita PRO", value: "R$ " + (data.proRevenue || "0,00"), color: COLORS.purple, icon: Crown },
          { label: "Pagamentos Pendentes", value: data.pendingPayments || 0, color: COLORS.red, icon: Clock },
          { label: "Assinaturas Ativas", value: data.activeSubscriptions || 0, color: COLORS.orange, icon: CreditCard },
        ].map((m, i) => <MetricCard key={i} {...m} />)}
      </div>

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
      const r = await fetch(API + "/admin/send-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, target, key: adminKey }),
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
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("metrics");
  const [metrics, setMetrics] = useState({});
  const ADMIN_KEY = "multi2026";

  useEffect(() => {
    if (authed) {
      fetch(API + "/admin/metrics?key=" + ADMIN_KEY)
        .then(r => r.json())
        .then(d => setMetrics(d))
        .catch(() => {});
    }
  }, [authed]);

  const handleLogin = () => {
    if (pass === ADMIN_KEY) {
      setAuthed(true);
      setError("");
    } else {
      setError("Senha incorreta");
    }
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

          <button onClick={handleLogin} style={{
            background: COLORS.blue, color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: "pointer", width: "100%",
          }}>
            Entrar
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
        <button onClick={() => { setAuthed(false); if (onExit) onExit(); }} style={{
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
        {tab === "pros" && <SectionProfissionais adminKey={ADMIN_KEY} />}
        {tab === "clients" && <SectionClientes adminKey={ADMIN_KEY} />}
        {tab === "services" && <SectionServicos adminKey={ADMIN_KEY} />}
        {tab === "financial" && <SectionFinanceiro adminKey={ADMIN_KEY} />}
        {tab === "email" && <SectionEmail adminKey={ADMIN_KEY} />}
      </div>
    </div>
  );
}

export default AdminDashboard;
