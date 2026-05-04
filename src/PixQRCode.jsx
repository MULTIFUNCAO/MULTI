import { useState, useEffect } from "react";

const API_URL = "https://api.multifuncao.com.br";

export default function PixQRCode({ valor, onPago, onClose }) {
  const [qrBase64, setQrBase64] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    gerarPix();
  }, []);

  useEffect(() => {
    if (!paymentId) return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const r = await fetch(API_URL + "/api/status-pagamento/" + paymentId);
        const d = await r.json();
        if (d.isPaid) {
          clearInterval(interval);
          setPolling(false);
          if (onPago) onPago();
        }
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [paymentId]);

  async function gerarPix() {
    setLoading(true);
    setError("");
    try {
      // Step 1: criar cliente
      const custRes = await fetch(API_URL + "/api/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Cliente Multi",
          phone: "11999999999",
          email: "",
          role: "client"
        })
      });
      const custData = await custRes.json();
      if (!custData.customerId) throw new Error("Erro ao criar cliente");

      // Step 2: gerar PIX do servico
      const valorNum = parseFloat(String(valor).replace(/[^0-9,]/g, "").replace(",", ".")) || 100;
      const pixRes = await fetch(API_URL + "/api/gerar-pix-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: custData.customerId,
          value: valorNum,
          phone: "11999999999",
          name: "Cliente Multi",
          email: ""
        })
      });
      const pixData = await pixRes.json();
      if (!pixData.pixCode) throw new Error(pixData.error || "Erro ao gerar PIX");

      setPixCode(pixData.pixCode);
      setQrBase64(pixData.qrCodeBase64 || "");
      setPaymentId(pixData.paymentId || "");
    } catch (e) {
      setError(e.message || "Erro ao gerar PIX. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    const chave = pixCode || "contato@multifuncao.com.br";
    navigator.clipboard?.writeText(chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const G = "#22c55e";
  const B = "#007BFF";
  const valorFmt = "R$ " + (parseFloat(String(valor).replace(/[^0-9,]/g, "").replace(",", ".")) || 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "20px"
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "24px 20px",
        width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#aaa", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>Pagamento PIX</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", margin: "2px 0 0" }}>{valorFmt}</p>
          </div>
          <button onClick={onClose} style={{ background: "#F5F6FA", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#aaa" }}>×</button>
        </div>

        {/* QR Code area */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {loading ? (
            <div style={{ padding: "40px 0" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: "3px solid #E5E7EB", borderTopColor: B,
                animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
              }} />
              <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>Gerando QR Code...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ padding: "20px 0" }}>
              <p style={{ fontSize: 13, color: "#EF4444", marginBottom: 12 }}>{error}</p>
              <button onClick={gerarPix} style={{
                background: B, color: "white", border: "none", borderRadius: 10,
                padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer"
              }}>Tentar novamente</button>
            </div>
          ) : qrBase64 ? (
            <img
              src={"data:image/png;base64," + qrBase64}
              alt="QR Code PIX"
              style={{ width: 200, height: 200, borderRadius: 12, border: "3px solid #1a1a2e", display: "block", margin: "0 auto" }}
            />
          ) : (
            <div style={{
              width: 200, height: 200, borderRadius: 12, border: "2px dashed #D1D5DB",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto",
              background: "#F8F9FA"
            }}>
              <p style={{ fontSize: 11, color: "#aaa", textAlign: "center", padding: 12, margin: 0 }}>
                Use a chave PIX abaixo
              </p>
            </div>
          )}

          {!loading && !error && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: polling ? "#F0FDF4" : "#FFF9E6",
              border: "1px solid " + (polling ? "#BBF7D0" : "#FDE68A"),
              borderRadius: 99, padding: "5px 14px", marginTop: 12
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: polling ? G : "#F59E0B" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: polling ? "#166534" : "#92400E" }}>
                {polling ? "Aguardando pagamento" : "PIX gerado"} — {valorFmt}
              </span>
            </div>
          )}
        </div>

        {/* Chave PIX */}
        {!loading && !error && (
          <div style={{
            background: "#F8FAFF", border: "1px solid #DBEAFE", borderRadius: 12,
            padding: "12px 14px", display: "flex", alignItems: "center",
            gap: 10, marginBottom: 16
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 2px" }}>
                Ou copie a chave PIX
              </p>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#1E3A8A", margin: 0, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pixCode || "contato@multifuncao.com.br"}
              </p>
            </div>
            <button onClick={copiar} style={{
              background: B, color: "white", border: "none", borderRadius: 9,
              padding: "7px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer",
              flexShrink: 0
            }}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
        )}

        {/* Aviso */}
        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: "0 0 16px" }}>
          Seu pagamento fica guardado no app e só é liberado ao profissional após você confirmar que o serviço foi concluído.
        </p>

        {/* Botão confirmação */}
        <button
          onClick={onPago}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
            cursor: "pointer", background: "linear-gradient(135deg," + G + ",#16a34a)",
            color: "white", fontWeight: 900, fontSize: 14,
            boxShadow: "0 5px 18px " + G + "44"
          }}
        >
          ✅ Já fiz o pagamento
        </button>
      </div>
    </div>
  );
}
