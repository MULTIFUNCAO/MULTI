import { useState, useEffect } from "react";

// ─── Cores do Multi ───────────────────────────────────────────────
const C = {
  blue: "#007BFF",
  orange: "#FF5722",
  green: "#22c55e",
  bg: "#F5F6FA",
  dark: "#1a1a2e",
  text: "#1a1a2e",
  sub: "#6b7280",
  border: "#e5e7eb",
  yellow: "#FFF8E1",
  yellowBorder: "#FFE082",
};

const F = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: 14,
  padding: "10px 14px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  outline: "none",
  background: "#fff",
  color: C.text,
  width: "100%",
  boxSizing: "border-box",
};

// ─── Taxas Asaas (aproximadas) ────────────────────────────────────
const TAXAS = {
  pix:    { pct: 0.0099, fixo: 0.00, label: "PIX",            icon: "⚡" },
  debito: { pct: 0.0199, fixo: 0.49, label: "Cartão de Débito", icon: "💳" },
  credito:{ pct: 0.0299, fixo: 0.49, label: "Cartão de Crédito", icon: "💳" },
};

function calcTotal(valor, metodo) {
  const t = TAXAS[metodo];
  const taxa = valor * t.pct + t.fixo;
  return { taxa: taxa.toFixed(2), total: (valor + taxa).toFixed(2) };
}

function fmt(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Tela 1: Escolha do método ────────────────────────────────────
function TelaMetodo({ valor, servico, profissional, onNext }) {
  const [metodo, setMetodo] = useState("pix");
  const calc = calcTotal(valor, metodo);

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* Header do serviço */}
      <div style={{
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        border: `1px solid ${C.border}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
          RESUMO DO SERVIÇO
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{servico}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>👨‍🔧 {profissional}</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.blue }}>{fmt(valor)}</div>
        </div>
      </div>

      {/* Escolha do método */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>
          FORMA DE PAGAMENTO
        </div>

        {Object.entries(TAXAS).map(([key, t]) => {
          const c = calcTotal(valor, key);
          const sel = metodo === key;
          return (
            <div
              key={key}
              onClick={() => setMetodo(key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: 12,
                border: `2px solid ${sel ? C.blue : C.border}`,
                background: sel ? "#EBF5FF" : "#fff",
                marginBottom: 8,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${sel ? C.blue : C.border}`,
                  background: sel ? C.blue : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                    {t.icon} {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: key === "pix" ? C.green : C.sub, fontWeight: 600 }}>
                    {key === "pix" ? "Sem acréscimo 🎉" : `+${fmt(c.taxa)} de taxa`}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: sel ? C.blue : C.text }}>
                  {fmt(c.total)}
                </div>
                {key !== "pix" && (
                  <div style={{ fontSize: 10, color: C.sub }}>total com taxa</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso transparência */}
      <div style={{
        background: C.yellow,
        border: `1px solid ${C.yellowBorder}`,
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 20,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <span style={{ fontSize: 11, color: "#92400E", lineHeight: 1.5 }}>
          A taxa cobrada é da operadora de pagamento (Asaas). O profissional recebe o valor integral de <strong>{fmt(valor)}</strong> após a conclusão do serviço.
        </span>
      </div>

      {/* Botão continuar */}
      <button
        onClick={() => onNext(metodo, calc)}
        style={{
          width: "100%",
          padding: "15px",
          background: C.blue,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Continuar • {fmt(calcTotal(valor, metodo).total)}
      </button>
    </div>
  );
}

// ─── Tela 2: PIX ─────────────────────────────────────────────────
function TelaPIX({ valor, total, taxa, onSuccess, onBack }) {
  const [status, setStatus] = useState("aguardando"); // aguardando | pago
  const [countdown, setCountdown] = useState(300); // 5 min

  useEffect(() => {
    if (status !== "aguardando") return;
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(t);
  }, [status]);

  const min = String(Math.floor(countdown / 60)).padStart(2, "0");
  const sec = String(countdown % 60).padStart(2, "0");

  // Simula confirmação após 5s (em produção, polling da Asaas)
  const simularPagamento = () => {
    setStatus("processando");
    setTimeout(() => { setStatus("pago"); setTimeout(onSuccess, 1500); }, 2000);
  };

  if (status === "pago") return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <div style={{ fontWeight: 800, fontSize: 20, color: C.green }}>Pagamento confirmado!</div>
      <div style={{ color: C.sub, marginTop: 8 }}>Aguarde, liberando o serviço...</div>
    </div>
  );

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>Valor a pagar</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.text }}>{fmt(total)}</div>
        <div style={{ fontSize: 11, color: C.sub }}>
          ({fmt(valor)} + {fmt(taxa)} taxa PIX)
        </div>
      </div>

      {/* QR Code simulado */}
      <div style={{
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        textAlign: "center",
        marginBottom: 16,
      }}>
        <div style={{
          width: 180, height: 180,
          background: "linear-gradient(135deg, #007BFF15, #007BFF08)",
          border: `2px dashed ${C.blue}`,
          borderRadius: 12,
          margin: "0 auto 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 48 }}>📱</span>
          <span style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>QR Code PIX</span>
          <span style={{ fontSize: 10, color: C.sub }}>Gerado via Asaas</span>
        </div>

        {/* Countdown */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: countdown < 60 ? "#FEE2E2" : "#EBF5FF",
          padding: "6px 14px",
          borderRadius: 20,
          marginBottom: 14,
        }}>
          <span style={{ fontSize: 12 }}>⏱</span>
          <span style={{
            fontWeight: 800, fontSize: 14,
            color: countdown < 60 ? "#DC2626" : C.blue,
            fontVariantNumeric: "tabular-nums",
          }}>
            {min}:{sec}
          </span>
          <span style={{ fontSize: 11, color: C.sub }}>para expirar</span>
        </div>

        {/* Chave PIX copiável */}
        <div style={{
          background: C.bg,
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ fontSize: 11, color: C.sub, fontFamily: "monospace" }}>
            00020126...multifuncao
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText("00020126...multifuncao")}
            style={{
              background: C.blue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Copiar
          </button>
        </div>
      </div>

      <div style={{
        background: "#F0FDF4",
        border: "1px solid #86efac",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 20,
        fontSize: 12,
        color: "#166534",
        lineHeight: 1.5,
      }}>
        ✅ Abra seu banco → PIX → Pagar com QR Code ou Cole a chave acima
      </div>

      {/* Botão simular (dev) */}
      <button
        onClick={simularPagamento}
        style={{
          width: "100%",
          padding: 15,
          background: C.green,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        {status === "processando" ? "Confirmando..." : "✅ Simular Pagamento (DEV)"}
      </button>

      <button onClick={onBack} style={{
        width: "100%", padding: 12, background: "transparent",
        border: `1.5px solid ${C.border}`, borderRadius: 12,
        fontFamily: "'Nunito', sans-serif", fontWeight: 700,
        fontSize: 14, cursor: "pointer", color: C.sub,
      }}>
        ← Voltar
      </button>
    </div>
  );
}

// ─── Tela 2: Cartão ───────────────────────────────────────────────
function TelaCartao({ tipo, valor, total, taxa, onSuccess, onBack }) {
  const [form, setForm] = useState({ numero: "", nome: "", validade: "", cvv: "" });
  const [parcelas, setParcelas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const maxParcelas = tipo === "credito" ? 12 : 1;

  const maskCartao = v => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const maskValidade = v => v.replace(/\D/g, "").slice(0, 4).replace(/(.{2})/, "$1/");

  const pagar = () => {
    if (!form.numero || !form.nome || !form.validade || !form.cvv) {
      setErro("Preencha todos os campos do cartão."); return;
    }
    setErro(""); setLoading(true);
    // Em produção: chamar backend → Asaas tokenize → charge
    setTimeout(() => { setLoading(false); onSuccess(); }, 2500);
  };

  const totalParcelado = (Number(total) / parcelas).toFixed(2);

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
          {tipo === "credito" ? "💳 Cartão de Crédito" : "💳 Cartão de Débito"}
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.text }}>{fmt(total)}</div>
        <div style={{ fontSize: 11, color: C.sub }}>
          ({fmt(valor)} + {fmt(taxa)} taxa cartão)
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        {/* Número */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
            NÚMERO DO CARTÃO
          </label>
          <input
            placeholder="0000 0000 0000 0000"
            value={form.numero}
            onChange={e => setForm({ ...form, numero: maskCartao(e.target.value) })}
            style={{ ...F, fontSize: 16, letterSpacing: 2 }}
          />
        </div>

        {/* Nome */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
            NOME NO CARTÃO
          </label>
          <input
            placeholder="Como aparece no cartão"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })}
            style={{ ...F }}
          />
        </div>

        {/* Validade + CVV */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
              VALIDADE
            </label>
            <input
              placeholder="MM/AA"
              value={form.validade}
              onChange={e => setForm({ ...form, validade: maskValidade(e.target.value) })}
              style={{ ...F }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
              CVV
            </label>
            <input
              placeholder="123"
              value={form.cvv}
              onChange={e => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              style={{ ...F }}
              type="password"
            />
          </div>
        </div>

        {/* Parcelas (só crédito) */}
        {tipo === "credito" && (
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
              PARCELAS
            </label>
            <select
              value={parcelas}
              onChange={e => setParcelas(Number(e.target.value))}
              style={{ ...F }}
            >
              {Array.from({ length: maxParcelas }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>
                  {n}x de {fmt(Number(total) / n)}{n === 1 ? " (sem juros)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {erro && (
        <div style={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, fontWeight: 700 }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Segurança */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 16, color: C.sub, fontSize: 11,
      }}>
        <span>🔒</span>
        <span>Pagamento seguro via Asaas • Dados criptografados</span>
      </div>

      <button
        onClick={pagar}
        disabled={loading}
        style={{
          width: "100%", padding: 15,
          background: loading ? "#94a3b8" : C.blue,
          color: "#fff", border: "none", borderRadius: 12,
          fontFamily: "'Nunito', sans-serif", fontWeight: 800,
          fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 10,
        }}
      >
        {loading ? "Processando..." : `Pagar ${fmt(total)}`}
      </button>

      <button onClick={onBack} style={{
        width: "100%", padding: 12, background: "transparent",
        border: `1.5px solid ${C.border}`, borderRadius: 12,
        fontFamily: "'Nunito', sans-serif", fontWeight: 700,
        fontSize: 14, cursor: "pointer", color: C.sub,
      }}>
        ← Voltar
      </button>
    </div>
  );
}

// ─── Tela 3: Sucesso ──────────────────────────────────────────────
function TelaSucesso({ valor, metodo, servico, profissional, onClose }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "#F0FDF4", border: `3px solid ${C.green}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", fontSize: 36,
      }}>
        ✅
      </div>

      <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginBottom: 8 }}>
        Pagamento confirmado!
      </div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 24, lineHeight: 1.6 }}>
        Seu pagamento de <strong>{fmt(valor)}</strong> foi recebido com sucesso via <strong>{TAXAS[metodo]?.label}</strong>.
      </div>

      {/* Card info */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: 16,
        border: `1px solid ${C.border}`, marginBottom: 20, textAlign: "left",
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>
          O QUE ACONTECE AGORA
        </div>
        {[
          { icon: "🔒", text: `O valor fica retido na Multi até a conclusão do serviço` },
          { icon: "👨‍🔧", text: `${profissional} foi notificado e vai entrar em contato` },
          { icon: "⭐", text: "Após o serviço, você libera o pagamento ao profissional" },
          { icon: "💬", text: "Em caso de problemas, o suporte da Multi vai te ajudar" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 12 : 0, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        style={{
          width: "100%", padding: 15, background: C.green,
          color: "#fff", border: "none", borderRadius: 12,
          fontFamily: "'Nunito', sans-serif", fontWeight: 800,
          fontSize: 15, cursor: "pointer",
        }}
      >
        Acompanhar serviço →
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────
export default function CheckoutPagamento({
  valor = 100,
  servico = "Instalação elétrica",
  profissional = "Carlos Silva",
  onClose = () => {},
  onPago = () => {},
}) {
  const [tela, setTela] = useState("metodo"); // metodo | pix | cartao | sucesso
  const [metodoSel, setMetodoSel] = useState(null);
  const [calc, setCalc] = useState(null);

  const handleMetodo = (metodo, c) => {
    setMetodoSel(metodo);
    setCalc(c);
    setTela(metodo === "pix" ? "pix" : "cartao");
  };

  const handleSucesso = () => {
    setTela("sucesso");
    onPago({ metodo: metodoSel, valor, total: calc?.total });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      fontFamily: "'Nunito', sans-serif",
    }}>
      <div style={{
        background: C.bg, width: "100%", maxWidth: 480,
        borderRadius: "20px 20px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        padding: "0 16px",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 0 16px",
          position: "sticky", top: 0, background: C.bg, zIndex: 1,
          borderBottom: tela !== "sucesso" ? `1px solid ${C.border}` : "none",
          marginBottom: 16,
        }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: C.text }}>
            {tela === "metodo" && "💰 Pagamento"}
            {tela === "pix" && "⚡ Pagar com PIX"}
            {tela === "cartao" && `💳 ${metodoSel === "credito" ? "Crédito" : "Débito"}`}
            {tela === "sucesso" && "✅ Confirmado"}
          </div>
          {tela !== "sucesso" && (
            <button onClick={onClose} style={{
              background: "#f1f5f9", border: "none", borderRadius: "50%",
              width: 32, height: 32, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          )}
        </div>

        {/* Telas */}
        {tela === "metodo" && (
          <TelaMetodo
            valor={valor} servico={servico} profissional={profissional}
            onNext={handleMetodo}
          />
        )}
        {tela === "pix" && (
          <TelaPIX
            valor={valor} total={calc.total} taxa={calc.taxa}
            onSuccess={handleSucesso}
            onBack={() => setTela("metodo")}
          />
        )}
        {tela === "cartao" && (
          <TelaCartao
            tipo={metodoSel} valor={valor} total={calc.total} taxa={calc.taxa}
            onSuccess={handleSucesso}
            onBack={() => setTela("metodo")}
          />
        )}
        {tela === "sucesso" && (
          <TelaSucesso
            valor={valor} metodo={metodoSel} servico={servico}
            profissional={profissional} onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
