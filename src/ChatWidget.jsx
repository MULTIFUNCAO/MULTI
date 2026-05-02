import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader } from "lucide-react";

const SYSTEM_PROMPT = `Você é o assistente virtual da Multi (Multifunção), um marketplace brasileiro de serviços domésticos.

Você ajuda clientes e profissionais com dúvidas sobre:
- Como solicitar um serviço (Novo Pedido → escolher categoria → aguardar proposta)
- Como funciona o pagamento (PIX, liberado após conclusão do serviço)
- Como se cadastrar como profissional
- Plano PRO para profissionais (mais visibilidade, prioridade nos pedidos)
- Status dos pedidos (Buscando → Acordo → Executando → Concluído)
- Categorias disponíveis: Pedreiro, Encanador, Eletricista, Pintor, Marceneiro, Faxineiro, Jardineiro, etc.
- Avaliações e estrelas
- Carteira digital e saques para profissionais
- Dúvidas sobre a plataforma

Seja sempre simpático, objetivo e fale em português brasileiro informal mas profissional.
Nunca invente informações. Se não souber, diga que vai acionar o suporte humano.
Responda em no máximo 3 frases curtas. Use emojis com moderação.`;

const SUGGESTED = [
  "Como solicito um serviço?",
  "Como funciona o pagamento?",
  "Quero ser profissional",
  "Como funciona o plano PRO?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Olá! 👋 Sou o assistente da Multi. Como posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    setShowSuggested(false);
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Desculpe, não consegui responder agora. Tente novamente!";

      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Ops, tive um problema de conexão. Tente novamente em instantes! 🙏",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #007BFF, #0056CC)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,123,255,0.4)",
            zIndex: 1000,
            animation: "pulse 2s infinite",
          }}
        >
          <MessageCircle size={22} color="#fff" />
          <span style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            width: "12px",
            height: "12px",
            background: "#22c55e",
            borderRadius: "50%",
            border: "2px solid #fff",
          }} />
        </button>
      )}

      {/* Janela do chat */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          right: "12px",
          width: "320px",
          height: "480px",
          background: "#fff",
          borderRadius: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 1000,
          animation: "slideUp 0.25s ease",
          fontFamily: "Nunito, sans-serif",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #007BFF, #0056CC)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Bot size={18} color="#fff" />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>
                  Multi Assistente
                </div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%", display: "inline-block" }} />
                  Online agora
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} color="#fff" />
            </button>
          </div>

          {/* Mensagens */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "#F5F6FA",
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: "6px",
                }}
              >
                {msg.role === "assistant" && (
                  <div style={{
                    width: "26px",
                    height: "26px",
                    background: "#007BFF",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Bot size={13} color="#fff" />
                  </div>
                )}
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: msg.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "#007BFF" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#1a1a2e",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                <div style={{
                  width: "26px", height: "26px",
                  background: "#007BFF", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={13} color="#fff" />
                </div>
                <div style={{
                  padding: "10px 14px",
                  background: "#fff",
                  borderRadius: "16px 16px 16px 4px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: "6px", height: "6px",
                      background: "#007BFF",
                      borderRadius: "50%",
                      animation: `bounce 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Sugestões */}
            {showSuggested && messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #007BFF20",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      color: "#007BFF",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "Nunito, sans-serif",
                      fontWeight: "600",
                      transition: "all 0.15s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Digite sua dúvida..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "20px",
                border: "1.5px solid #e8e8e8",
                fontSize: "13px",
                outline: "none",
                fontFamily: "Nunito, sans-serif",
                background: "#F5F6FA",
                color: "#1a1a2e",
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: input.trim() && !loading ? "#007BFF" : "#e8e8e8",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              <Send size={15} color={input.trim() && !loading ? "#fff" : "#aaa"} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,123,255,0.4); }
          50% { box-shadow: 0 4px 30px rgba(0,123,255,0.7); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
