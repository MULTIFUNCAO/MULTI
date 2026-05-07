import CheckoutPagamento from './CheckoutPagamento';
//already from "./PixQRCode";
import ChatWidget from './ChatWidget';
﻿import { useState, useRef, useEffect } from "react";
import AdminDashboard from "./AdminDashboard";
import {
  Search, MapPin, Bell, Star, Plus, ChevronRight,
  Hammer, Wrench, Paintbrush, Scissors, Zap, Square,
  Home, ClipboardList, MessageCircle, User, Settings,
  ArrowLeft, Check, Camera, Send, ChevronDown,
  Briefcase, Crown, Shield, TrendingUp, X, Clock,
  Lock, Navigation, Image, Flag, DollarSign, CheckCircle2,
  AlertCircle, FileText, Pencil, Wallet, LogOut,
  CreditCard, HeartHandshake, HelpCircle, KeyRound,
  BellRing, BadgeCheck, Banknote, Users, ShieldCheck,
  Activity, BarChart2, Package, ChevronUp, Eye, EyeOff,
} from "lucide-react";

/* ───────────────────────── DESIGN TOKENS ──────────────────────────────────── */
const B  = "#007BFF";
const O  = "#FF5722";
const BG = "#F5F6FA";
const G  = "#22c55e";

/* ─────────────────────────────────────────────────────────────────────────────
   EMAIL CONFIG — SendGrid
   ⚠️  NUNCA coloque a chave real aqui. Configure no backend:
       Variável de ambiente:  SENDGRID_API_KEY=SG.xxxxxx
       From:                  fcb02632-5dd9-4c2d-92f6-0c3a907d2b81
   Em produção, substitua a função sendWelcomeEmail() abaixo por uma
   chamada ao seu backend:  POST /api/send-welcome  { name, email, role }
   O backend então usa:  sgMail.send({ to, from, subject, text })
───────────────────────────────────────────────────────────────────────────── */

/* ───────────────────────── STATIC DATA ───────────────────────────────────── */
const CATS = [
  { id:"pedreiro",    label:"Pedreiro",          emoji:"👷", star:4.8, bg:"#FFF0EE", dot:"#E53935" },
  { id:"encanador",   label:"Encanador",          emoji:"🔧", star:4.6, bg:"#E8F4FF", dot:"#0070F3" },
  { id:"jardineiro",  label:"Jardineiro",         emoji:"🌿", star:4.9, bg:"#E8F8EE", dot:"#2E7D32" },
  { id:"eletricista", label:"Eletricista",        emoji:"⚡", star:4.7, bg:"#FFFCE8", dot:"#F9A825" },
  { id:"pintor",      label:"Pintor",             emoji:"🖌️", star:4.5, bg:"#F3E5F5", dot:"#7B1FA2" },
  { id:"vidraceiro",  label:"Vidraceiro",         emoji:"🪟", star:4.4, bg:"#E0F7FA", dot:"#00838F" },
  { id:"chaveiro",    label:"Chaveiro 24h",       emoji:"🔑", star:4.7, bg:"#FFF8E1", dot:"#F57F17" },
  { id:"desentupidor",label:"Desentupimento",     emoji:"💧", star:4.5, bg:"#E3F2FD", dot:"#1565C0" },
  { id:"redes",       label:"Redes de Proteção",  emoji:"🕸️", star:4.6, bg:"#E8F5E9", dot:"#2E7D32" },
  { id:"lavanderia",  label:"Téc. Máq. de Lavar", emoji:"🫧", star:4.4, bg:"#EDE7F6", dot:"#6A1B9A" },
  { id:"tv",          label:"Instal. TV/Suporte", emoji:"📺", star:4.6, bg:"#E1F5FE", dot:"#0277BD" },
  { id:"montador",    label:"Montador de Móveis", emoji:"🪛", star:4.7, bg:"#FBE9E7", dot:"#BF360C" },
  { id:"estofados",   label:"Higien. Estofados",  emoji:"🛋️", star:4.8, bg:"#F3E5F5", dot:"#6A1B9A" },
];

const NEARBY = [
  { id:"n1", title:"Pintar parede sala",    cat:"pintor",     rating:4.4, price:380, dist:"0,8 km", emoji:"🖌️", bg:"#F3E5F5" },
  { id:"n2", title:"Conserto de encanação", cat:"encanador",  rating:4.8, price:220, dist:"1,1 km", emoji:"🔧", bg:"#E8F4FF" },
  { id:"n3", title:"Poda e jardinagem",     cat:"jardineiro", rating:4.9, price:250, dist:"1,9 km", emoji:"🌿", bg:"#E8F8EE" },
  { id:"n4", title:"Instalação elétrica",   cat:"eletricista",rating:4.7, price:310, dist:"2,3 km", emoji:"⚡", bg:"#FFFCE8" },
];

const SEED_FEED = [
  { id:101, cat:"encanador",    title:"Vazamento na cozinha",      desc:"Cano embaixo da pia vazando há 2 dias.", value:150,  loc:"Vila Madalena, SP",  time:"Há 30min", client:"Ana S.",      rating:4.8, urgent:true  },
  { id:102, cat:"pedreiro",     title:"Reforma do banheiro",        desc:"Trocar azulejos e rebocar uma parede.",  value:800,  loc:"Pinheiros, SP",      time:"Há 1h",    client:"Carlos M.",   rating:4.5, urgent:false },
  { id:103, cat:"pintor",       title:"Pintura sala e quartos",     desc:"Apartamento 70m². Tinta por conta.",     value:1200, loc:"Moema, SP",           time:"Há 2h",    client:"Fernanda L.", rating:5.0, urgent:false },
  { id:104, cat:"jardineiro",   title:"Poda e limpeza jardim",      desc:"Jardim 200m², árvores e grama.",         value:250,  loc:"Alto Pinheiros, SP",  time:"Há 3h",    client:"Roberto K.",  rating:4.2, urgent:false },
  { id:105, cat:"chaveiro",     title:"Porta travada urgente",      desc:"Fui trancado do lado de fora de casa.",  value:180,  loc:"Santana, SP",         time:"Há 15min", client:"Paula R.",    rating:4.9, urgent:true  },
  { id:106, cat:"desentupidor", title:"Ralo do banheiro entupido",  desc:"Água acumulando no box há 3 dias.",      value:120,  loc:"Tatuapé, SP",         time:"Há 45min", client:"Marcos T.",   rating:4.6, urgent:true  },
  { id:107, cat:"redes",        title:"Rede de proteção varanda",   desc:"Varanda 8m², apartamento 4º andar.",     value:450,  loc:"Mooca, SP",           time:"Há 2h",    client:"Silvia B.",   rating:4.7, urgent:false },
  { id:108, cat:"lavanderia",   title:"Máquina de lavar com defeito",desc:"Não centrifuga e faz barulho estranho.", value:200,  loc:"Ipiranga, SP",        time:"Há 3h",    client:"Jorge F.",    rating:4.4, urgent:false },
  { id:109, cat:"tv",           title:"Instalar TV 65\" na parede", desc:"TV nova, precisa de suporte articulado.", value:160,  loc:"Vila Olímpia, SP",    time:"Há 1h",    client:"Daniela M.",  rating:4.8, urgent:false },
  { id:110, cat:"montador",     title:"Montar guarda-roupas 6 portas",desc:"Comprei na Tok&Stok, preciso montar.", value:220,  loc:"Lapa, SP",            time:"Há 4h",    client:"André C.",    rating:4.5, urgent:false },
  { id:111, cat:"estofados",    title:"Higienizar sofá e poltrona", desc:"Sofá 3 lugares + 1 poltrona, tecido.",   value:350,  loc:"Perdizes, SP",        time:"Há 5h",    client:"Beatriz N.",  rating:4.9, urgent:false },
];

/* ───────────────────────── MICRO COMPONENTS ──────────────────────────────── */
function MiniStars({ v, size = 10 }) {
  return (
    <span style={{ display:"flex", gap:1 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} fill={v >= s ? "#F9A825" : "none"} stroke={v >= s ? "#F9A825" : "#ddd"} />
      ))}
    </span>
  );
}

function Pill({ children, color = B, solid = false, sm = false }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      background: solid ? color : color + "18",
      color: solid ? "#fff" : color,
      fontWeight:700, fontSize: sm ? 10 : 11,
      padding: sm ? "2px 7px" : "3px 10px", borderRadius:99,
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background:"white", borderRadius:16, padding:16,
      boxShadow:"0 2px 10px rgba(0,0,0,.06)",
      border:"1px solid #F0F0F0", ...style,
    }}>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", marginBottom:14 }}>
        <h3 style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>{title}</h3>
        
          </div>
        </div>
      </div>
    );

    // Step: Card (credit or debit)
    if (paymentStep === "card_credit" || paymentStep === "card_debit") {
      const isCredit = paymentStep === "card_credit";
      return (
        <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column" }}>
          <div style={{ background:"white", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #EEEEF2" }}>
            <button onClick={() => setPaymentStep("choose")} style={{ background:"#F5F6FA", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <ArrowLeft size={18} color="#555" />
            </button>
            <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Cartão de {isCredit ? "Crédito" : "Débito"}</p>
          </div>
          <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
              <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:"0 0 16px" }}>Dados do Cartão</p>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <input placeholder="Número do cartão" type="tel" maxLength={19} autoComplete="off" style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", fontFamily:"monospace" }} />
                <input placeholder="Nome como no cartão" style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <input placeholder="MM/AA" type="tel" maxLength={5} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
                  <input placeholder="CVV" type="tel" maxLength={4} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
                </div>
                {isCredit && (
                  <select style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", background:"white", color:"#555" }}>
                    {[1,2,3,4,6,8,10,12].map(n => (
                      <option key={n} value={n}>{n}x de R$ {(parseFloat(String(serviceValue).replace(",",".")) / n).toFixed(2).replace(".",",")} {n <= 6 ? "sem juros" : "com juros"}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:14, padding:"12px 14px", display:"flex", gap:10 }}>
              <Shield size={16} color="#F59E0B" style={{ flexShrink:0 }} />
              <div>
                <p style={{ fontSize:12, color:"#92400E", fontWeight:700, margin:"0 0 4px", lineHeight:1.6 }}>
                  R$ {serviceValue} ficará em <strong>custódia</strong> até você confirmar o PIN.
                </p>
                {isCredit && (
                  <p style={{ fontSize:11, color:"#92400E", margin:0, lineHeight:1.5 }}>
                    ⚠️ Taxa de antecipação de <strong>3%</strong> será descontada do valor recebido pelo profissional. Ele receberá em <strong>D+2</strong> após confirmação.
                  </p>
                )}
                {!isCredit && (
                  <p style={{ fontSize:11, color:"#166534", margin:0 }}>
                    ✅ Sem taxas adicionais. Profissional recebe em <strong>D+1</strong>.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => { setPaymentDone(true); setPaymentStep("done"); setShowPaymentModal(false); }}
              style={{ padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:`linear-gradient(135deg,#1a1a2e,#2d2d44)`, color:"white", fontWeight:900, fontSize:15, boxShadow:"0 5px 18px rgba(0,0,0,.25)" }}>
              Confirmar Pagamento · R$ {serviceValue}
            </button>
          </div>
        </div>
      );
    }
  }
  // ── END PAYMENT MODAL ─────────────────────────────────────────────────────

  return (
    <>

      {/* ── DEAL FORM MODAL (PRO sends proposal) ── */}
      {showDealForm && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth:400, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 36px" }}>
            <div style={{ width:40, height:4, background:"#E0E0E0", borderRadius:99, margin:"0 auto 18px" }} />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <FileText size={20} color={O} />
              </div>
              <div>
                <p style={{ fontWeight:900, fontSize:16, color:"#1a1a2e" }}>Proposta Final</p>
                <p style={{ fontSize:12, color:"#aaa" }}>Detalhe o acordo para o cliente</p>
              </div>
            </div>

            {/* Value */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>Valor Total (R$)</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:900, color:"#aaa", fontSize:13 }}>R$</span>
                <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)}
                  style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px 12px 40px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
              </div>
            </div>

            {/* Date/time */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>Data e Horário</label>
              <input type="datetime-local" value={dealDate} onChange={e => setDealDate(e.target.value)}
                style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
            </div>

            {/* What will be done */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>O que será feito</label>
              <textarea rows={3} placeholder="Ex: Trocar sifão e vedação do cano, limpar entupimento..." value={dealDesc} onChange={e => setDealDesc(e.target.value)}
                style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px", fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.55, boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button onClick={() => setShowDealForm(false)} style={{ padding:"13px 0", borderRadius:12, border:"1.5px solid #EBEBEB", background:"white", color:"#888", fontWeight:800, fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={handleSendDeal} style={{ padding:"13px 0", borderRadius:12, border:"none", background: dealValue && dealDate && dealDesc ? `linear-gradient(135deg,${O},#E64A19)` : "#F0F0F0", color: dealValue && dealDate && dealDesc ? "white" : "#ccc", fontWeight:800, fontSize:13, cursor: dealValue && dealDate && dealDesc ? "pointer" : "default", boxShadow: dealValue && dealDate && dealDesc ? "0 4px 12px rgba(255,87,34,.3)" : "none" }}>
                Enviar Proposta
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)" }}>

        {/* ── HEADER ── */}
        <div style={{ padding:"10px 16px", background:"white", borderBottom:"1px solid #F0F0F0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexShrink:0 }}>
              <ArrowLeft size={20} color="#aaa" />
            </button>
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👨‍🔧</div>
              <span className="pulse-green" style={{ position:"absolute", bottom:0, right:0, width:11, height:11, borderRadius:"50%", background:G, border:"2px solid white" }} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:900, fontSize:14, color:"#1a1a2e", lineHeight:1.2 }}>{chat.proName}</p>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:11, color:G, fontWeight:700 }}>Online agora</span>
                <span style={{ fontSize:11, color:"#ccc" }}>·</span>
                <span style={{ fontSize:11, color:"#aaa" }}>resp. &lt; 5 min</span>
              </div>
            </div>
            {!finished && dealAccepted && (
              <button onClick={() => setShowFinishConfirm(true)} style={{ flexShrink:0, padding:"7px 13px", borderRadius:10, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontSize:11, fontWeight:900, boxShadow:"0 3px 10px rgba(255,87,34,.3)" }}>
                FINALIZAR
              </button>
            )}
          </div>

          {/* service info + contact chip */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:"1px solid #F4F4F6" }}>
            <span style={{ fontSize:11, color:"#888" }}>Conversa: <strong style={{ color:"#1a1a2e" }}>{chat.serviceTitle}</strong></span>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 8px", display:"flex", flexDirection:"column", gap:8, background:BG }}>
          {messages.map((m) => {

            // ── DEAL CARD ──
            if (m.type === "deal") {
              const d = m.deal;
              const accepted = d.accepted;
              const fmtDate  = d.date ? new Date(d.date).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
              return (
                <div key={m.id} className="deal-card" style={{ margin:"8px 0" }}>
                  <div style={{
                    borderRadius:20, overflow:"hidden",
                    border: accepted ? `2px solid ${G}` : `2px solid ${O}`,
                    background: accepted ? "#F0FDF4" : "#FFFAF7",
                    boxShadow: accepted ? `0 4px 20px ${G}22` : `0 4px 20px ${O}22`,
                  }}>
                    {/* Card header */}
                    <div style={{ padding:"14px 16px 10px", background: accepted ? G : O, display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <FileText size={18} color="white" />
                      </div>
                      <div>
                        <p style={{ fontWeight:900, fontSize:14, color:"white", margin:0 }}>{accepted ? "✅ Acordo Fechado!" : "📋 Proposta Final"}</p>
                        <p style={{ fontSize:11, color:"rgba(255,255,255,.75)", margin:0 }}>Contrato Digital Multi</p>
                      </div>
                      {accepted && <CheckCircle2 size={22} color="white" style={{ marginLeft:"auto" }} />}
                    </div>

                    {/* Deal rows */}
                    <div style={{ padding:"14px 16px" }}>
                      {[
                        { icon:DollarSign, label:"Valor Total", value:`R$ ${d.value}`, highlight:true },
                        { icon:Clock,      label:"Data e Horário", value: fmtDate },
                        { icon:FileText,   label:"O que será feito", value: d.desc },
                      ].map(({ icon:Icon, label, value, highlight }, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom: i < 2 ? `1px solid ${accepted ? G+"30" : O+"20"}` : "none" }}>
                          <span style={{ width:30, height:30, borderRadius:9, background: accepted ? G+"18" : O+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                            <Icon size={15} color={accepted ? G : O} />
                          </span>
                          <div>
                            <p style={{ fontSize:10, fontWeight:700, color:"#aaa", marginBottom:2 }}>{label}</p>
                            <p style={{ fontSize: highlight ? 18 : 13, fontWeight: highlight ? 900 : 600, color: highlight ? (accepted ? "#166534" : O) : "#1a1a2e", lineHeight:1.4 }}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action area */}
                    {!accepted ? (
                      <div style={{ padding:"0 16px 16px" }}>
                        <button onClick={handleConfirmDeal} style={{
                          width:"100%", padding:"14px 0", borderRadius:14, border:"none", cursor:"pointer",
                          background:`linear-gradient(135deg,${G},#16a34a)`,
                          color:"white", fontWeight:900, fontSize:15,
                          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                          boxShadow:`0 5px 18px ${G}44`,
                        }}>
                          <Check size={18} /> CONFIRMAR E AGENDAR
                        </button>
                        <p style={{ textAlign:"center", fontSize:11, color:"#aaa", marginTop:8 }}>Ao confirmar, o acordo é garantido pelo Multi</p>
                      </div>
                    ) : (
                      /* POST-DEAL ACTION BUTTONS */
                      <div style={{ padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                        <p style={{ fontSize:11, fontWeight:800, color:G, textAlign:"center", marginBottom:4 }}>🎉 Acordo fechado com sucesso!</p>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          {/* Client sees: Ver Endereço / Pagar */}
                          <button style={{ padding:"11px 0", borderRadius:12, border:`1.5px solid ${B}`, background:"white", color:B, fontWeight:800, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                            <MapPin size={13} /> Ver Endereço
                          </button>
                          <button onClick={() => setShowPaymentModal(true)} style={{ padding:"11px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:800, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                            <DollarSign size={13} /> Pagar PIX/Cartão
                          </button>
                        </div>
                        {isPro && (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:4 }}>
                            <button style={{ padding:"11px 0", borderRadius:12, border:`1.5px solid ${G}`, background:"white", color:G, fontWeight:800, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                              <MapPin size={13} /> Endereço Completo
                            </button>
                            <button style={{ padding:"11px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontWeight:800, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                              📞 Ligar Agora
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize:10, color:"#bbb", textAlign:"center", marginTop:5 }}>{m.time}</p>
                </div>
              );
            }

            // ── REGULAR MESSAGE ──
            if (m.from === "system") return (
              <div key={m.id} style={{ textAlign:"center", padding:"4px 0" }}>
                <span style={{ background:G+"18", color:G, fontSize:11, fontWeight:800, padding:"5px 14px", borderRadius:99 }}>{m.text}</span>
              </div>
            );

            const isClient = m.from === "client";
            return (
              <div key={m.id} style={{ display:"flex", justifyContent: isClient ? "flex-end" : "flex-start", alignItems:"flex-end", gap:6 }}>
                {!isClient && <div style={{ width:28, height:28, borderRadius:8, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>👨‍🔧</div>}
                <div style={{ maxWidth:"76%", padding:"10px 13px", borderRadius: isClient ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isClient ? B : "white", color: isClient ? "white" : "#1a1a2e", fontSize:13, lineHeight:1.55, boxShadow: isClient ? "0 2px 8px rgba(0,112,255,.20)" : "0 1px 6px rgba(0,0,0,.07)" }}>
                  <p style={{ margin:0, whiteSpace:"pre-wrap" }}>{m.text}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4, marginTop:5 }}>
                    <span style={{ fontSize:10, opacity:.55 }}>{m.time}</span>
                    {isClient && (
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                        <path d="M1 5L4.5 8.5L10 2" stroke={m.read ? "#5BF0A0" : "rgba(255,255,255,.5)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 5L8.5 8.5L14 2" stroke={m.read ? "#5BF0A0" : "rgba(255,255,255,.5)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>👨‍🔧</div>
              <div style={{ background:"white", borderRadius:"18px 18px 18px 4px", padding:"10px 14px", boxShadow:"0 1px 6px rgba(0,0,0,.07)" }}>
                <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                  <span className="tdot" /><span className="tdot" /><span className="tdot" />
                  <span style={{ fontSize:10, color:"#aaa", marginLeft:4 }}>{chat.proName} está digitando…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── SAFETY WARNING ── */}
        <div style={{ padding:"8px 12px 0", background:"white", borderTop:"1px solid #F0F0F0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:8, background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"8px 10px" }}>
            <span style={{ fontSize:15, flexShrink:0, lineHeight:1.4 }}>⚠️</span>
            <p style={{ fontSize:10, fontWeight:700, color:"#92400E", lineHeight:1.5, margin:0 }}>
              Seu pagamento fica guardado no app e só é liberado ao profissional após você confirmar que o serviço foi concluído.
            </p>
          </div>
        </div>

        {/* ── STICKY PAYMENT BUTTON — shown after deal accepted ── */}
        {dealAccepted && !paymentDone && !isPro && (
          <div style={{ padding:"10px 16px", background:"white", borderTop:"1px solid #F0F0F0", display:"flex", gap:8 }}>
            <button
              onClick={() => setShowPaymentModal(true)}
              style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:`0 4px 14px ${G}44` }}>
              <DollarSign size={16} /> Pagar Serviço com Segurança
            </button>
          </div>
        )}
        {dealAccepted && paymentDone && !isPro && (
          <div style={{ padding:"10px 16px", background:"#F0FDF4", borderTop:`1px solid #BBF7D0` }}>
            <p style={{ fontSize:13, fontWeight:800, color:"#166534", textAlign:"center", margin:0, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Shield size={15} color={G} /> Pagamento em custódia · Libere após o serviço
            </p>
          </div>
        )}
        <div style={{ padding:"8px 12px 4px", background:"white", borderTop:"1px solid #F0F0F0", display:"flex", gap:7, overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
          {smartReplies.map(r => (
            <button key={r} onClick={() => handleSmartReply(r)} style={{ flexShrink:0, padding:"6px 13px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", background: r === "Aceito!" ? G+"18" : B+"10", color: r === "Aceito!" ? "#16a34a" : B, border: r === "Aceito!" ? `1px solid ${G}44` : `1px solid ${B}22` }}>
              {r}
            </button>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ padding:"4px 12px 2px", background:"white", display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
          {[
            { id:"photo",    Icon:Camera,     label:"Foto"        },
            { id:"location", Icon:MapPin,     label:"Localização" },
            { id:"budget",   Icon:DollarSign, label:"Orçamento"   },
            { id:"deal",     Icon:FileText,   label:"Proposta Final", highlight:true },
          ].map(({ id, Icon, label, highlight }) => (
            <button key={id} onClick={() => handleToolbar(id)} style={{
              display:"flex", alignItems:"center", gap:5, flexShrink:0,
              padding:"7px 12px", borderRadius:10, fontSize:11, fontWeight: highlight ? 800 : 700,
              background: highlight ? O+"15" : "#F5F6FA",
              border: highlight ? `1px solid ${O}44` : "1px solid #EBEBEB",
              color: highlight ? O : "#666", cursor:"pointer",
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── INPUT ── */}
        <div style={{ padding:"8px 12px 16px", background:"white", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendText()} placeholder="Digite uma mensagem..."
            style={{ flex:1, border:"1.5px solid #EBEBEB", borderRadius:14, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit", background:"#FAFAFA" }} />
          <button onClick={sendText} style={{ width:44, height:44, borderRadius:13, border:"none", background: text.trim() ? `linear-gradient(135deg,${B},#0056c7)` : "#F0F0F0", display:"flex", alignItems:"center", justifyContent:"center", cursor: text.trim() ? "pointer" : "default", flexShrink:0, transition:"background .2s", boxShadow: text.trim() ? "0 3px 10px rgba(0,112,255,.28)" : "none" }}>
            <Send size={16} color={text.trim() ? "white" : "#ccc"} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── AUTH: WELCOME SCREEN ──────────────────────────────── */
function WelcomeScreen({ onGoogle, onEmail, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"0 0 48px" }}>

      {/* top wave */}
      <div style={{ width:"100%", height:260, background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, borderRadius:"0 0 48px 48px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        {onBack && (
          <button onClick={onBack} style={{ position:"absolute", top:14, left:16, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={16} color="white" />
          </button>
        )}
        {/* decorative circles */}
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.07)" }} />
        <div style={{ position:"absolute", bottom:-60, left:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.05)" }} />
        {/* logo */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, position:"relative", zIndex:1 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:"white", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
            <Logo size={44} />
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:32, fontWeight:900, color:"white", letterSpacing:-1, lineHeight:1, margin:0 }}>multi</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.65)", fontWeight:600, marginTop:4, letterSpacing:.5 }}>serviços gerais em um toque</p>
          </div>
        </div>
      </div>

      {/* middle content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 28px 0", width:"100%", maxWidth:400 }}>
        {/* tagline */}
        <h2 style={{ fontSize:24, fontWeight:900, color:"#1a1a2e", textAlign:"center", lineHeight:1.35, margin:"0 0 8px" }}>
          Sua casa em boas mãos,<br/>num toque.
        </h2>
        <p style={{ fontSize:14, color:"#9CA3AF", textAlign:"center", lineHeight:1.6, margin:"0 0 36px" }}>
          Conectamos você aos melhores profissionais<br/>verificados da sua região.
        </p>

        {/* trust badges */}
        <div style={{ display:"flex", gap:20, marginBottom:36, justifyContent:"center" }}>
          {[
            { val:"12k+", lbl:"Profissionais" },
            { val:"98%",  lbl:"Satisfação"    },
            { val:"4,9★", lbl:"Avaliação"     },
          ].map((b, i) => (
            <div key={i} style={{ textAlign:"center" }}>
              <p style={{ fontSize:17, fontWeight:900, color:B, margin:0 }}>{b.val}</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{b.lbl}</p>
            </div>
          ))}
        </div>

        {/* free seal */}
        <div style={{ display:"flex", alignItems:"center", gap:7, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:"8px 16px", marginBottom:28 }}>
          <span style={{ fontSize:16 }}>✨</span>
          <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:0 }}>Cadastro 100% gratuito para clientes</p>
        </div>

        {/* CTA buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%" }}>
          {/* Google */}
          <button onClick={onGoogle} style={{
            width:"100%", padding:"15px 0", borderRadius:16,
            background:"white", border:"1.5px solid #E5E7EB",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            fontWeight:800, fontSize:14, color:"#374151", cursor:"pointer",
            boxShadow:"0 2px 10px rgba(0,0,0,.06)",
          }}>
            {/* Google G SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Em breve
          </button>

          {/* Email register */}
          <button onClick={onEmail} style={{
            width:"100%", padding:"15px 0", borderRadius:16,
            background:`linear-gradient(135deg,${B},#0055d4)`,
            border:"none", color:"white",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            fontWeight:900, fontSize:14, cursor:"pointer",
            boxShadow:`0 6px 20px ${B}44`,
          }}>
            <User size={17} /> Cadastrar com E-mail
          </button>
        </div>

        <p style={{ fontSize:12, color:"#9CA3AF", marginTop:20, textAlign:"center" }}>
          Já tem conta? <button onClick={onEmail} style={{ color:B, fontWeight:800, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>Entrar</button>
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── TERMS OF USE MODAL ──────────────────────────────── */
function TermsOfUseModal({ onClose, variant = "general" }) {
  // variant: "general" | "autonomy"
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"white", borderRadius:"24px 24px 0 0", maxHeight:"85vh", display:"flex", flexDirection:"column" }}>
        {/* handle */}
        <div style={{ flexShrink:0, padding:"14px 20px 10px" }}>
          <div style={{ width:40, height:4, background:"#E0E0E0", borderRadius:99, margin:"0 auto 14px" }} />
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, background: variant === "autonomy" ? O+"18" : B+"12", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Shield size={19} color={ variant === "autonomy" ? O : B} />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>
                {variant === "autonomy" ? "Termo de Autonomia Profissional" : "Termos de Uso e Privacidade"}
              </p>
              <p style={{ fontSize:11, color:"#aaa", margin:0 }}>Multi Serviços Gerais · v2.0</p>
            </div>
          </div>
        </div>

        {/* scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px 20px" }}>
          {variant === "autonomy" ? (
            <>
              <Section title="1. Natureza da Relação">
                O profissional cadastrado na plataforma Multi declara, sob sua total responsabilidade, que presta serviços de forma autônoma e independente, não existindo qualquer vínculo empregatício, subordinação jurídica ou relação trabalhista com a Multi Serviços Gerais Ltda. ("Plataforma").
              </Section>
              <Section title="2. Ausência de Exclusividade">
                O profissional é livre para atender clientes por outros meios, plataformas ou diretamente, sem qualquer restrição imposta pela Plataforma.
              </Section>
              <Section title="3. Responsabilidade pelo Serviço">
                O profissional é inteiramente responsável pela qualidade, segurança e conclusão dos serviços que contratar através da Plataforma. A Multi atua exclusivamente como intermediadora digital.
              </Section>
              <Section title="4. Obrigações Fiscais">
                O profissional é responsável pelo recolhimento de seus próprios impostos e contribuições previdenciárias, devendo estar regularizado como MEI, autônomo ou pessoa jurídica.
              </Section>
              <Section title="5. Isenção de Vínculo">
                A Plataforma não é empregadora, não recolhe FGTS, INSS ou qualquer encargo trabalhista em nome do profissional. O uso da Plataforma não gera qualquer direito trabalhista.
              </Section>
              <p style={{ fontSize:10, color:"#bbb", lineHeight:1.6, marginTop:12 }}>
                Ao marcar a caixa de aceite no cadastro, o profissional confirma que leu, compreendeu e concorda integralmente com este Termo de Autonomia.
              </p>
            </>
          ) : (
            <>
              <Section title="1. Natureza da Plataforma">
                O Multi é um marketplace digital que conecta clientes a prestadores de serviços autônomos. A Plataforma atua exclusivamente como intermediadora, não sendo responsável pela execução, qualidade ou resultado dos serviços contratados entre as partes.
              </Section>
              <Section title="2. Isenção de Responsabilidade">
                A Multi Serviços Gerais Ltda. não é parte nos contratos celebrados entre clientes e profissionais. Eventuais litígios, danos materiais, morais ou físicos decorrentes da prestação de serviços são de responsabilidade exclusiva das partes contratantes.
              </Section>
              <Section title="3. Pagamentos e Custódia">
                Os pagamentos realizados via Plataforma ficam em custódia até a confirmação do término do serviço mediante PIN de liberação. A Multi não se responsabiliza por pagamentos realizados fora da Plataforma, em espécie ou por meios não autorizados.
              </Section>
              <Section title="4. Segurança">
                Recomendamos que clientes nunca realizem pagamentos antecipados antes da conclusão do serviço. O PIN de liberação deve ser fornecido ao profissional apenas após a entrega satisfatória do serviço.
              </Section>
              <Section title="5. Dados Pessoais (LGPD)">
                Os dados coletados são utilizados exclusivamente para operação da Plataforma, intermediação de serviços e comunicações relacionadas. Não compartilhamos dados com terceiros para fins publicitários. O usuário pode solicitar exclusão de seus dados a qualquer momento pelo Perfil.
              </Section>
              <Section title="6. Foro">
                Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes do uso da Plataforma, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </Section>
              <p style={{ fontSize:10, color:"#bbb", lineHeight:1.6, marginTop:12 }}>
                Versão 2.0 · Última atualização: 09/07/2026 · Multi Serviços Gerais Ltda. · CNPJ 00.000.000/0001-00
              </p>
            </>
          )}
        </div>

        <div style={{ padding:"12px 20px 32px", flexShrink:0, borderTop:"1px solid #F0F0F0" }}>
          <button onClick={onClose} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/* Stable checkbox — hoisted at module scope so RegisterScreen never remounts it */
function TermsCheckbox({ errors, setErrors }) {
  const [checked,   setChecked]   = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  return (
    <>
      {showTerms && <TermsOfUseModal onClose={() => setShowTerms(false)} />}
      <div id="terms-checkbox-wrapper" data-checked={checked ? "1" : "0"} style={{ marginBottom:20 }}>
        <div
          onClick={() => { setChecked(v => !v); if (errors?.terms) setErrors(e => ({ ...e, terms:undefined })); }}
          style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer", padding:"12px 14px", borderRadius:14, background: errors?.terms ? "#FFF5F5" : checked ? "#F0FDF4" : "#F8F9FA", border:`1.5px solid ${errors?.terms ? "#EF4444" : checked ? G : "#E5E7EB"}`, transition:"all .15s" }}
        >
          <div style={{ width:22, height:22, borderRadius:7, border:`2px solid ${checked ? G : errors?.terms ? "#EF4444" : "#D1D5DB"}`, background: checked ? G : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, transition:"all .15s" }}>
            {checked && <Check size={13} color="white" strokeWidth={3} />}
          </div>
          <p style={{ fontSize:12, color: errors?.terms ? "#EF4444" : "#555", lineHeight:1.6, margin:0, flex:1 }}>
            Li e aceito os{" "}
            <span onClick={e => { e.stopPropagation(); setShowTerms(true); }} style={{ color:B, fontWeight:800, textDecoration:"underline", cursor:"pointer" }}>Termos de Uso</span>
            {" "}e a{" "}
            <span onClick={e => { e.stopPropagation(); setShowTerms(true); }} style={{ color:B, fontWeight:800, textDecoration:"underline", cursor:"pointer" }}>Política de Privacidade</span>
            . Compreendo que o Multi atua como intermediador e não se responsabiliza pelos serviços prestados.
          </p>
        </div>
        {errors?.terms && <p style={{ fontSize:11, color:"#EF4444", fontWeight:700, margin:"5px 0 0" }}>Você precisa aceitar os termos para continuar.</p>}
      </div>
    </>
  );
}

/* ───────────────────────── AUTH: REGISTER SCREEN ──────────────────────────────── */
const WA_ICON = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display:"block", flexShrink:0 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

/* Stable field wrapper — defined at module scope, never recreated */
function FormField({ IconComp, label, error, hint, children }) {
  return (
    <div style={{ marginBottom: error ? 6 : 18 }}>
      <label style={{
        display:"block", fontSize:11, fontWeight:800,
        color: error ? "#E53935" : "#6B7280",
        textTransform:"uppercase", letterSpacing:1.1, marginBottom:7,
      }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex", alignItems:"center" }}>
          <IconComp size={16} color={error ? "#E53935" : "#9CA3AF"} />
        </span>
        {children}
      </div>
      {error && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{error}</p>}
      {hint  && <p style={{ fontSize:11, color:G,       margin:"5px 0 0", fontWeight:700 }}>{hint}</p>}
    </div>
  );
}

/* Stable base style — object defined once at module level */
const REG_INPUT = {
  width:"100%", border:"1.5px solid #E5E7EB",
  borderRadius:14, padding:"13px 14px 13px 42px",
  fontSize:14, color:"#1a1a2e", outline:"none",
  fontFamily:"inherit", boxSizing:"border-box",
  background:"white", transition:"border-color .15s",
};

/* Mask helpers — pure functions, never change reference */
function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function maskCep(v) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

/* ───────────────────────── AUTH: REGISTER SCREEN ──────────────────────────────── */
function ForgotPasswordScreen({ onBack, onComplete }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API = "https://web-production-e103b.up.railway.app";
  const box = { minHeight:"100vh", background:"#F5F6FA", display:"flex", alignItems:"center", justifyContent:"center", padding:24 };
  const card = { width:"100%", maxWidth:420, background:"white", borderRadius:20, padding:"32px 24px", boxShadow:"0 4px 24px rgba(0,0,0,.08)" };
  const inp = { width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, marginBottom:16, boxSizing:"border-box" };
  const btn = { width:"100%", padding:14, background:"#007BFF", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer" };
  if (step === 1) return <div style={box}><div style={card}>
    <button onClick={onBack} style={{ background:"none", border:"none", color:"#007BFF", cursor:"pointer", marginBottom:16 }}>&larr; Voltar</button>
    <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Recuperar Senha</h2>
    <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Vamos enviar um codigo de 6 digitos para seu e-mail.</p>
    <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>E-MAIL</label>
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inp} />
    <button disabled={loading} style={btn} onClick={async () => { if (!email) return alert("Digite seu e-mail"); setLoading(true); const r = await fetch(API+"/api/auth/solicitar-codigo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email}) }); setLoading(false); if (r.ok) setStep(2); else alert("Erro ao enviar"); }}>{loading ? "Enviando..." : "Enviar Codigo"}</button>
  </div></div>;
  return <div style={box}><div style={card}>
    <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Digite o Codigo</h2>
    <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Codigo enviado para {email}</p>
    <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>CODIGO</label>
    <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} style={{ ...inp, fontSize:24, letterSpacing:8, textAlign:"center" }} />
    <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>NOVA SENHA</label>
    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
    <button disabled={loading} style={btn} onClick={async () => { if (!code||code.length<6) return alert("Codigo incompleto"); if (!password||password.length<6) return alert("Senha muito curta"); setLoading(true); const r = await fetch(API+"/api/auth/verificar-codigo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,code,newPassword:password}) }); const d = await r.json(); if (r.ok) { onComplete(); } else { alert(d.error); setLoading(false); } }}>{loading ? "Verificando..." : "Confirmar"}</button>
  </div></div>;
}
function ResetPasswordScreen({ onComplete }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const API = "https://web-production-e103b.up.railway.app";

  const handleReset = async () => {
    if (!password || password.length < 6) return alert("Senha deve ter pelo menos 6 caracteres");
    if (password !== confirm) return alert("As senhas não coincidem");
    setLoading(true);
    try {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.slice(1));
      const token = params.get("access_token");
      const r = await fetch(`${API}/api/auth/redefinir-senha`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao redefinir senha");
      window.location.hash = "";
      onComplete();
    } catch(e) { setLoading(false); alert(e.message); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ width:"100%", maxWidth:420, background:"white", borderRadius:20, padding:"32px 24px", boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
        <h2 style={{ margin:"0 0 8px", fontSize:24, fontWeight:800, color:"#1a1a2e" }}>Nova Senha</h2>
        <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Digite sua nova senha abaixo.</p>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>NOVA SENHA</label>
          <input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>CONFIRMAR SENHA</label>
          <input type="password" placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleReset()}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <button onClick={handleReset} disabled={loading}
          style={{ width:"100%", padding:"14px", background:"#007BFF", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
          {loading ? "Salvando..." : "Salvar Nova Senha"}
        </button>
      </div>
    </div>
  );
}

function LoginScreen({ onBack, onComplete, onRegister, onForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API = "https://web-production-e103b.up.railway.app";

  const handleLogin = async () => {
    if (!email || !password) return alert("Preencha email e senha");
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao entrar");
      const session = { name: d.user.name, email: d.user.email, role: d.user.role, isPro: d.user.isPro || false, token: d.token };
      localStorage.setItem("multiSession", JSON.stringify(session));
      onComplete(d.user.name, d.user.email, false, "", d.user.role, "");
    } catch(e) {
      setLoading(false);
      alert(e.message);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ width:"100%", maxWidth:420, background:"white", borderRadius:20, padding:"32px 24px", boxShadow:"0 4px 24px rgba(0,0,0,.08)" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", marginBottom:16, color:"#007BFF", fontSize:14 }}>← Voltar</button>
        <h2 style={{ margin:"0 0 8px", fontSize:24, fontWeight:800, color:"#1a1a2e" }}>Entrar na sua conta</h2>
        <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Bem-vindo de volta!</p>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>E-MAIL</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>SENHA</label>
          <input type="password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", padding:"14px", background:"#007BFF", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p style={{ textAlign:"center", marginTop:12, fontSize:13, color:"#6B7280" }}>Esqueceu a senha?
          <button onClick={() => onForgot()} style={{ background:"none", border:"none", color:"#007BFF", fontWeight:700, cursor:"pointer", marginLeft:4 }}>Recuperar</button>
        </p>
        <p style={{ textAlign:"center", marginTop:16, fontSize:14, color:"#6B7280" }}>Não tem conta?
          <button onClick={onRegister} style={{ background:"none", border:"none", color:"#007BFF", fontWeight:700, cursor:"pointer", marginLeft:4 }}>Cadastre-se</button>
        </p>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack, onComplete }) {
  const [step,    setStep]    = useState("form");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [password, setPassword] = useState("");
  const [cep,     setCep]     = useState("");
  const [role,    setRole]    = useState("client");
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim() || name.trim().split(/\s+/).filter(Boolean).length < 2)
      e.name = "Informe nome e sobrenome";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "E-mail inválido (ex: nome@email.com)";
    if (phone.replace(/\D/g,"").length < 11)
      e.phone = "WhatsApp incompleto";
    if (cep.replace(/\D/g,"").length < 8)
      e.cep = "CEP inválido";
    const wrapper = document.getElementById("terms-checkbox-wrapper");
    if (!wrapper || wrapper.dataset.checked !== "1")
      e.terms = "Aceite obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const API = "https://web-production-e103b.up.railway.app";
      const r = await fetch(`${API}/api/auth/cadastro`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name, email: email.trim(), password, role }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao criar conta");
      setLoading(false);
      setStep("success");
    } catch(e) {
      setLoading(false);
      alert(e.message);
    }
  };

  const cepFound = cep.replace(/\D/g,"").length === 8;
  const isProfessional = role === "professional";

  /* ── SUCCESS ── */
  if (step === "success") {
    return (
      <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
        <style>{`@keyframes pop-in{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}} .pop{animation:pop-in .5s ease-out forwards;}`}</style>

        <div className="pop" style={{ width:88, height:88, borderRadius:"50%", background: isProfessional ? `linear-gradient(135deg,${O},#E64A19)` : `linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, boxShadow:`0 8px 28px ${isProfessional ? O : G}44` }}>
          <Check size={40} color="white" strokeWidth={3} />
        </div>

        <h2 style={{ fontSize:24, fontWeight:900, color:"#1a1a2e", margin:"0 0 10px" }}>
          {isProfessional ? "Bem-vindo ao Multi PRO!" : "Bem-vindo ao Multi!"}
        </h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7, margin:"0 0 20px" }}>
          Olá, <strong style={{ color:"#1a1a2e" }}>{name.trim().split(/\s+/)[0]}</strong>! 🎉<br/>
          {isProfessional
            ? "Seu perfil profissional está ativo. Explore o mural de serviços."
            : "Agora você tem os melhores profissionais na palma da mão."}
        </p>

        {/* 7-day trial badge for professionals */}
        {isProfessional && (
          <div style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", borderRadius:16, padding:"14px 20px", marginBottom:20, width:"100%" }}>
            <p style={{ fontSize:14, fontWeight:900, color:"white", margin:"0 0 4px" }}>🎁 7 dias de Multi PRO grátis!</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.75)", margin:0 }}>Contatos desbloqueados · Chat ilimitado · Sem cartão agora</p>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:28 }}>
          {[B, O, G, "#F9A825", "#8B2FC9"].map((c, i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:.8 }} />
          ))}
        </div>

        <button
          onClick={() => onComplete(name, email.trim(), true, cepFound ? "Sua cidade" : "sua região", role, phone)}
          style={{ width:"100%", padding:"16px 0", borderRadius:18, border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 6px 24px ${isProfessional ? O : B}44`, background: isProfessional ? `linear-gradient(135deg,${O},#E64A19)` : `linear-gradient(135deg,${B},#0055d4)` }}>
          {isProfessional ? <><Briefcase size={17} /> Ir para o Mural</> : <><Home size={17} /> Ir para a Tela Inicial</>}
        </button>
      </div>
    );
  }

  /* ── FAST FORM ── */
  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* header */}
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"16px 20px 28px", borderRadius:"0 0 32px 32px" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
          <ArrowLeft size={18} color="white" />
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={30} white />
          <div>
            <p style={{ fontSize:20, fontWeight:900, color:"white", margin:0, lineHeight:1 }}>Criar conta</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.65)", margin:"2px 0 0" }}>Menos de 60 segundos ⚡</p>
          </div>
        </div>
      </div>

      <div style={{ flex:1, padding:"24px 24px 48px", overflowY:"auto" }}>

        {/* ── ROLE SELECTOR ── */}
        <div style={{ marginBottom:22 }}>
          <p style={{ fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 10px" }}>Você é:</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { id:"client",       label:"Cliente",       emoji:"🏠", sub:"Preciso de serviços" },
              { id:"professional", label:"Profissional",  emoji:"🔧", sub:"7 dias PRO grátis!"  },
            ].map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                padding:"14px 10px", borderRadius:16, cursor:"pointer", textAlign:"center",
                border:`2px solid ${role === r.id ? (r.id === "professional" ? "#7C3AED" : B) : "#E5E7EB"}`,
                background: role === r.id ? (r.id === "professional" ? "#F5F3FF" : "#EBF4FF") : "white",
                transition:"all .15s",
              }}>
                <p style={{ fontSize:24, margin:"0 0 4px" }}>{r.emoji}</p>
                <p style={{ fontSize:13, fontWeight:900, color: role === r.id ? (r.id === "professional" ? "#7C3AED" : B) : "#1a1a2e", margin:"0 0 2px" }}>{r.label}</p>
                <p style={{ fontSize:10, color: role === r.id ? (r.id === "professional" ? "#7C3AED" : B) : "#9CA3AF", fontWeight:700, margin:0 }}>{r.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* free / trial badge */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background: isProfessional ? "#F5F3FF" : "#F0FDF4", border:`1px solid ${isProfessional ? "#DDD6FE" : "#BBF7D0"}`, borderRadius:14, padding:"10px 16px", marginBottom:22 }}>
          <span style={{ fontSize:18 }}>{isProfessional ? "🎁" : "✨"}</span>
          <p style={{ fontSize:13, fontWeight:800, color: isProfessional ? "#5B21B6" : "#166534", margin:0 }}>
            {isProfessional ? "7 dias de Multi PRO grátis — sem cartão!" : "Cadastro 100% gratuito para clientes"}
          </p>
        </div>

        {/* NOME */}
        <FormField IconComp={User} label="Nome Completo" error={errors.name}>
          <input autoFocus autoComplete="name" type="text" placeholder="Ex: Julia Mendes" value={name}
            onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.name ? "#E53935" : undefined }} />
        </FormField>

        {/* E-MAIL */}
        <FormField IconComp={({ size, color }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block", flexShrink:0 }}>
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        )} label="E-mail" error={errors.email}>
          <input autoComplete="email" type="email" placeholder="seu@email.com" value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.email ? "#E53935" : undefined }} />
        </FormField>

        {/* SENHA */}
        <FormField IconComp={KeyRound} label="Senha" error={errors.password}>
          <input autoComplete="new-password" type="password" placeholder="Mínimo 6 caracteres" value={password}
            onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.password ? "#E53935" : undefined }} />
        </FormField>
        {/* WHATSAPP */}
        <FormField IconComp={WA_ICON} label="WhatsApp" error={errors.phone}>
          <input autoComplete="tel" type="tel" placeholder="(00) 00000-0000" value={phone}
            onChange={e => { setPhone(maskPhone(e.target.value)); if (errors.phone) setErrors(p => ({ ...p, phone:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.phone ? "#E53935" : undefined }} />
        </FormField>

        {/* CEP */}
        <FormField IconComp={MapPin} label="CEP" error={errors.cep} hint={cepFound ? "📍 Localização encontrada!" : undefined}>
          <input autoComplete="postal-code" type="tel" placeholder="00000-000" value={cep}
            onChange={e => { setCep(maskCep(e.target.value)); if (errors.cep) setErrors(p => ({ ...p, cep:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.cep ? "#E53935" : cepFound ? G : undefined }} />
        </FormField>

        {/* TERMS */}
        <TermsCheckbox errors={errors} setErrors={setErrors} />

        {/* SUBMIT */}
        <button type="button" onClick={handleSubmit} disabled={loading} style={{
          width:"100%", padding:"16px 0", borderRadius:18, border:"none",
          background: loading ? "#93C5FD" : isProfessional ? `linear-gradient(135deg,#7C3AED,#4F46E5)` : `linear-gradient(135deg,${B},#0055d4)`,
          color:"white", fontWeight:900, fontSize:15,
          cursor: loading ? "default" : "pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          boxShadow: loading ? "none" : `0 6px 24px ${isProfessional ? "#7C3AED" : B}44`,
          transition:"background .2s",
        }}>
          {loading ? (
            <><span style={{ width:18, height:18, border:"2.5px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} /> Criando conta…</>
          ) : (
            <><Check size={17} /> {isProfessional ? "Criar conta e ganhar PRO" : "Finalizar Cadastro"}</>
          )}
        </button>
      </div>
    </div>
  );
}


/* ───────────────────────── GUEST MURAL (professional preview) ───────────────── */
function GuestMural({ onSignup, allDocsVerified }) {
  const [filter, setFilter] = useState("all");

  const MURAL_SEED = [
    { id:"g1", cat:"encanador",   emoji:"🔧", title:"Vazamento na cozinha",    bairro:"Vila Madalena, SP", value:150, urgent:true,  time:"Há 12min" },
    { id:"g2", cat:"pintor",      emoji:"🖌️", title:"Pintura sala e quartos",  bairro:"Moema, SP",         value:1200,urgent:false, time:"Há 45min" },
    { id:"g3", cat:"eletricista", emoji:"⚡", title:"Instalação de tomadas",   bairro:"Pinheiros, SP",     value:280, urgent:false, time:"Há 1h"    },
    { id:"g4", cat:"pedreiro",    emoji:"👷", title:"Reforma do banheiro",      bairro:"Lapa, SP",          value:800, urgent:false, time:"Há 2h"    },
    { id:"g5", cat:"jardineiro",  emoji:"🌿", title:"Poda e limpeza jardim",   bairro:"Alto Pinheiros, SP",value:250, urgent:false, time:"Há 3h"    },
    { id:"g6", cat:"encanador",   emoji:"🔧", title:"Entupimento de pia",       bairro:"Santana, SP",       value:120, urgent:true,  time:"Há 4h"    },
  ];

  const CATS_FILTER = [
    { id:"all",        label:"Todos"      },
    { id:"encanador",  label:"Encanador"  },
    { id:"pintor",     label:"Pintor"     },
    { id:"eletricista",label:"Elétrica"   },
    { id:"pedreiro",   label:"Pedreiro"   },
    { id:"jardineiro", label:"Jardineiro" },
  ];

  const list = filter === "all" ? MURAL_SEED : MURAL_SEED.filter(s => s.cat === filter);

  // Document block wall (same logic as ProfessionalHome but for guests)
  if (allDocsVerified === false) {
    return (
      <div style={{ padding:"32px 20px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"#FFF5F5", border:"2px solid #FECACA", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>🔒</div>
        <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Mural bloqueado</h3>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.7, margin:"0 0 20px" }}>
          Verifique seus documentos no Perfil para visualizar serviços disponíveis.
        </p>
        <button onClick={onSignup} style={{ padding:"13px 28px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }}>
          Ir para Perfil
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom:100 }}>

      {/* ── MURAL HEADER ── */}
      <div style={{ padding:"18px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <h2 style={{ fontSize:19, fontWeight:900, color:"#1a1a2e", margin:"0 0 2px" }}>Mural de Serviços</h2>
            <p style={{ fontSize:12, color:"#888", margin:0 }}>{list.length} serviços disponíveis perto de você</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, background:O+"15", borderRadius:99, padding:"5px 12px" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:O }} />
            <span style={{ fontSize:11, fontWeight:800, color:O }}>Ao vivo</span>
          </div>
        </div>

        {/* filters */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", paddingBottom:12 }}>
          {CATS_FILTER.map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)} style={{
              flexShrink:0, padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:800,
              border:"none", cursor:"pointer", transition:"all .15s",
              background: filter === c.id ? "#1a1a2e" : "white",
              color:       filter === c.id ? "white"   : "#666",
              boxShadow:   filter === c.id ? "0 3px 10px rgba(0,0,0,.18)" : "0 1px 4px rgba(0,0,0,.08)",
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* ── SERVICE CARDS ── */}
      <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:14 }}>
        {list.map((s, idx) => {
          const isBlurred = idx > 1; // first 2 fully visible, rest blurred to entice signup
          return (
            <div key={s.id} style={{ position:"relative", borderRadius:20, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,.09)" }}>

              {/* card body */}
              <div style={{ background:"white", padding:"16px", filter: isBlurred ? "blur(3.5px)" : "none", userSelect: isBlurred ? "none" : "auto" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:"#F5F6FA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{s.emoji}</div>
                    <div>
                      <p style={{ fontSize:14, fontWeight:900, color:"#1a1a2e", margin:"0 0 2px" }}>{s.title}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <MapPin size={11} color="#aaa" />
                        <span style={{ fontSize:12, color:"#888" }}>{s.bairro}</span>
                      </div>
                    </div>
                  </div>
                  {s.urgent && (
                    <span style={{ background:"#FFF0EE", color:"#E53935", fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:99, border:"1px solid #FECACA", flexShrink:0 }}>🔥 Urgente</span>
                  )}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid #F5F5F5" }}>
                  <div>
                    <p style={{ fontSize:11, color:"#aaa", margin:"0 0 1px", fontWeight:700 }}>Valor oferecido</p>
                    <span style={{ fontSize:22, fontWeight:900, color:B }}>R$ {s.value}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:10, color:"#aaa", margin:"0 0 8px" }}>{s.time}</p>
                    <button
                      onClick={onSignup}
                      style={{ padding:"10px 18px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:13, cursor:"pointer", boxShadow:`0 4px 12px ${O}44`, display:"flex", alignItems:"center", gap:6 }}>
                      <MessageCircle size={14} /> Tenho Interesse
                    </button>
                  </div>
                </div>
              </div>

              {/* blur overlay — cards 3+ require signup */}
              {isBlurred && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, background:"rgba(15,23,42,.5)", backdropFilter:"blur(1px)" }}>
                  <div style={{ textAlign:"center" }}>
                    <p style={{ fontSize:13, fontWeight:900, color:"white", margin:"0 0 2px" }}>Cadastre-se para ver</p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,.65)", margin:0 }}>mais serviços disponíveis</p>
                  </div>
                  <button onClick={onSignup} style={{ padding:"9px 22px", borderRadius:99, border:"none", background:"white", color:"#1a1a2e", fontWeight:900, fontSize:13, cursor:"pointer" }}>
                    Criar conta grátis
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── SIGNUP CTA (below cards) ── */}
      <div style={{ margin:"24px 16px 0", background:`linear-gradient(135deg,${B},#0055d4)`, borderRadius:20, padding:"22px 20px", textAlign:"center", boxShadow:`0 6px 20px ${B}44` }}>
        <Crown size={28} color="#FDE68A" style={{ display:"block", margin:"0 auto 10px" }} />
        <p style={{ fontSize:15, fontWeight:900, color:"white", margin:"0 0 5px" }}>Seja um Profissional Multi</p>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.7)", margin:"0 0 16px", lineHeight:1.6 }}>
          7 dias de PRO grátis · Sem cartão · Acesso imediato ao mural completo
        </p>
        <button onClick={onSignup} style={{ padding:"13px 32px", borderRadius:14, border:"none", background:"white", color:B, fontWeight:900, fontSize:14, cursor:"pointer" }}>
          Criar conta e acessar →
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── PROFESSIONAL HOME ────────────────────────────────── */
function ProfessionalHome({ userName, isPro, feedServices, onViewService, onUpgrade, userLocation = "sua região", allDocsVerified, docStatus, onGoToDocs, onGoToOrders, onGoToWallet }) {
  const [online,       setOnline]       = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showDocBlock, setShowDocBlock] = useState(false); // pop-up modal

  const filters = [
    { id:"all",    label:"Todos",           emoji:"📋" },
    { id:"urgent", label:"Urgentes",         emoji:"🔥" },
    { id:"nearby", label:"Perto de Mim",     emoji:"📍" },
    { id:"topPay", label:"Melhor Pagamento", emoji:"💰" },
  ];

  const filtered = feedServices.filter(s => {
    if (activeFilter === "urgent") return s.urgent;
    if (activeFilter === "topPay") return s.value >= 400;
    return true;
  });

  const totalValue = feedServices.reduce((acc, s) => acc + (s.value || 0), 0);
  const proTrialDays = 7; // free trial period

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#F0F2F5", minHeight:"100vh", paddingBottom:100 }}>
      <style>{`
        @keyframes radar-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
          70%  { box-shadow: 0 0 0 18px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes radar-pulse-off {
          0%   { box-shadow: 0 0 0 0 rgba(156,163,175,.4); }
          70%  { box-shadow: 0 0 0 12px rgba(156,163,175,0); }
          100% { box-shadow: 0 0 0 0 rgba(156,163,175,0); }
        }
        .pulse-online  { animation: radar-pulse     1.8s ease-out infinite; }
        .pulse-offline { animation: radar-pulse-off 2.4s ease-out infinite; }
      `}</style>

      {/* ── BUSINESS CARD BANNER ── */}
      <div style={{ margin:"18px 16px 0", borderRadius:24, overflow:"hidden", position:"relative", boxShadow:"0 10px 32px rgba(0,0,0,.22)" }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(140deg,#1a1a2e 0%,#2d2d44 55%,#3a2418 100%)" }} />
        <div style={{ position:"absolute", top:-24, right:-24, width:140, height:140, borderRadius:"50%", background:"rgba(255,87,34,.12)" }} />
        <div style={{ position:"absolute", top:14, right:18, fontSize:44, opacity:.18 }}>🏗️</div>
        <div style={{ position:"absolute", bottom:14, right:22, fontSize:26, opacity:.25 }}>🔧</div>

        <div style={{ position:"relative", zIndex:1, padding:"22px 22px 18px" }}>
          {/* header row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background: online ? G : "#6B7280" }} />
                <span style={{ fontSize:10, fontWeight:800, color: online ? G : "#9CA3AF", textTransform:"uppercase", letterSpacing:1.5 }}>
                  {online ? "Online — Recebendo pedidos" : "Offline"}
                </span>
              </div>
              <h3 style={{ fontSize:19, fontWeight:900, color:"white", lineHeight:1.3, margin:0 }}>
                {userName ? `Olá, ${userName}!` : "Bem-vindo,"}<br/>
                <span style={{ color: online ? G : "#94A3B8" }}>Novas Oportunidades Esperam</span>
              </h3>
            </div>
          </div>

          {/* stats */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[
              { label:"Ganhos do mes",   val:"R$ 1.240", color:"#4ade80" },
              { label:"Servicos feitos", val:"47",       color:"white"    },
              { label:"Avaliacao",       val:"4.8 estrelas",  color:"#F9A825"  },
            ].map((s, i) => (
              <div key={i} onClick={i===0 ? onGoToWallet : i===1 ? onGoToOrders : undefined} style={{ flex:1, background:"rgba(255,255,255,.08)", borderRadius:12, padding:"9px 10px", cursor:(i===0||i===1)?"pointer":"default" }}>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.45)", fontWeight:700, margin:0, lineHeight:1.3 }}>{s.label}</p>
                <p style={{ fontSize:17, fontWeight:900, color:s.color, margin:"3px 0 0" }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* FICAR ONLINE button */}
          <button
            onClick={() => setOnline(v => !v)}
            className={online ? "pulse-online" : "pulse-offline"}
            style={{
              width:"100%", padding:"14px 0", borderRadius:16, border:"none", cursor:"pointer",
              background: online ? `linear-gradient(135deg,${G},#16a34a)` : "rgba(255,255,255,.12)",
              color: online ? "white" : "#9CA3AF",
              fontWeight:900, fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              transition:"background .3s, color .3s",
            }}>
            {/* radar icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="2"/>
              <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
              <path d="M7.76 7.76a6 6 0 0 0 0 8.49"/>
              <path d="M20.49 3.51a12 12 0 0 1 0 16.97"/>
              <path d="M3.51 3.51a12 12 0 0 0 0 16.97"/>
            </svg>
            {online ? "✓  Online — Clique para pausar" : "Ficar Online"}
          </button>
        </div>
      </div>

      {/* ── PRO TRIAL BANNER (free users) ── */}
      {!isPro && (
        <div onClick={onUpgrade} style={{ margin:"14px 16px 0", borderRadius:16, padding:"13px 16px", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,58,237,.35)" }}>
          <Crown size={20} color="#FDE68A" style={{ flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:900, color:"white", margin:0 }}>🎁 {proTrialDays} dias de Multi PRO grátis!</p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.7)", margin:0 }}>Libere contatos, chat e acesso total. Sem cartão.</p>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,.7)" />
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={{ padding:"20px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Mural de Serviços</h3>
          <span style={{ fontSize:12, color:"#888" }}>{filtered.length} disponíveis</span>
        </div>
        <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
              flexShrink:0, display:"flex", alignItems:"center", gap:5,
              padding:"8px 14px", borderRadius:99, fontSize:12, fontWeight:800,
              border:"none", cursor:"pointer", transition:"all .15s",
              background: activeFilter === f.id ? "#1a1a2e" : "white",
              color:       activeFilter === f.id ? "white"   : "#555",
              boxShadow:   activeFilter === f.id ? "0 3px 12px rgba(0,0,0,.2)" : "0 1px 4px rgba(0,0,0,.08)",
            }}>
              <span style={{ fontSize:14 }}>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEED WITH PRO LOCK OVERLAY ── */}
      <div style={{ padding:"14px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 24px", color:"#bbb" }}>
            <p style={{ fontSize:15, fontWeight:700 }}>Nenhum serviço neste filtro</p>
            <p style={{ fontSize:12, marginTop:4 }}>Nenhum profissional disponível agora 😔 Seu pedido ficará no mural e você será notificado assim que alguém aceitar.</p>
          </div>
        ) : filtered.map((s, idx) => {
          const cat       = CATS.find(c => c.id === s.cat);
          const isLocked  = !isPro;          // non-PRO sees locked overlay
          const isBlurred = isLocked && idx > 0; // first card always fully visible as preview

          return (
            <div key={s.id} style={{ position:"relative", borderRadius:20, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,.09)" }}>

              {/* ── Card content — ALWAYS fully visible ── */}
              <div style={{ background:"white", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.emoji}</div>
                    <span style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", lineHeight:1.35 }}>{s.title}</span>
                  </div>
                  {s.urgent && <Pill color="#E53935" sm>🔥 Urgente</Pill>}
                </div>
                <p style={{ fontSize:13, color:"#888", lineHeight:1.6, margin:0 }}>{s.desc}</p>
                <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:11, color:"#bbb" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} />{s.loc}</span>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><Clock size={11} />{s.time}</span>
                </div>
                <div style={{ borderTop:"1px solid #F4F4F6", paddingTop:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:22, fontWeight:900, color:B }}>R$ {s.value}</span>
                  {/* client name — hidden for non-PRO */}
                  <span style={{ fontSize:12, color:"#aaa", filter: isLocked ? "blur(4px)" : "none" }}>
                    👤 {isLocked ? "Cliente PRO" : (s.client || "Cliente")}
                  </span>
                </div>

                {/* Action button — triggers doc-block popup if docs not verified */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (!allDocsVerified) { setShowDocBlock(true); return; }
                    if (isLocked) { onUpgrade(); return; }
                    onViewService({ _notify:{ serviceId:s.id, serviceTitle:s.title, value:s.value, proName:"Profissional" } });
                  }}
                  style={{ padding:"11px 0", borderRadius:12, border:"none", cursor:"pointer", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                    background: !allDocsVerified ? "#F5F6FA" : isLocked ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : `linear-gradient(135deg,${O},#E64A19)`,
                    color:      !allDocsVerified ? "#9CA3AF" : "white",
                    boxShadow:  !allDocsVerified ? "none" : isLocked ? "0 3px 10px rgba(124,58,237,.28)" : "0 3px 10px rgba(255,87,34,.28)",
                  }}>
                  {!allDocsVerified
                    ? <><Lock size={13} /> Candidatar-me</>
                    : isLocked
                      ? <><Crown size={13} /> Assinar PRO</>
                      : "Tenho Interesse"}
                </button>
              </div>

              {/* PRO tag on first card for non-PRO users */}
              {isLocked && !allDocsVerified && (
                <div style={{ position:"absolute", top:12, right:12, background:"#7C3AED", borderRadius:99, padding:"3px 10px" }}>
                  <span style={{ fontSize:10, fontWeight:900, color:"white" }}>PRO</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════ DOC BLOCK POPUP — Premium ══════════════════════ */}
      {showDocBlock && (
        <div
          onClick={() => setShowDocBlock(false)}
          style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(15,23,42,.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"28px 28px 0 0", overflow:"hidden", boxShadow:"0 -20px 60px rgba(0,0,0,.3)", maxHeight:"94vh", overflowY:"auto" }}>

            <style>{`
              @keyframes ripple { 0%{transform:scale(.8);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
              @keyframes float-avatar { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
              .doc-avatar { animation: float-avatar 3s ease-in-out infinite; }
              .ripple-ring { animation: ripple 2s ease-out infinite; }
              .ripple-ring2 { animation: ripple 2s ease-out .7s infinite; }
            `}</style>

            {/* ── HERO HEADER — gradient bg + floating avatar ── */}
            <div style={{ background:"linear-gradient(180deg,#EBF4FF 0%,#F8FBFF 60%,white 100%)", padding:"28px 28px 0", textAlign:"center", position:"relative", overflow:"hidden" }}>

              {/* subtle decorative arcs */}
              <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(0,123,255,.06)" }} />
              <div style={{ position:"absolute", top:-30, left:-40, width:140, height:140, borderRadius:"50%", background:"rgba(0,123,255,.04)" }} />

              {/* drag handle */}
              <div style={{ width:44, height:5, background:"#D1D5DB", borderRadius:99, display:"inline-block", marginBottom:24 }} />

              {/* avatar + ripple rings */}
              <div style={{ position:"relative", width:96, height:96, margin:"0 auto 20px" }}>
                <div className="ripple-ring"  style={{ position:"absolute", inset:-8,  borderRadius:"50%", border:"2px solid rgba(0,123,255,.25)" }} />
                <div className="ripple-ring2" style={{ position:"absolute", inset:-18, borderRadius:"50%", border:"2px solid rgba(0,123,255,.15)" }} />
                <div className="doc-avatar" style={{ width:96, height:96, borderRadius:"50%", background:"white", border:"3px solid rgba(0,123,255,.2)", boxShadow:"0 8px 24px rgba(0,123,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    {/* Person silhouette */}
                    <circle cx="24" cy="17" r="9" fill="#93C5FD"/>
                    <path d="M6 42c0-9.9 8.1-18 18-18s18 8.1 18 18" fill="#93C5FD"/>
                    {/* analysis badge */}
                    <circle cx="36" cy="12" r="9" fill="#007BFF"/>
                    <path d="M32 12h8M36 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* Progress pill */}
              {(() => {
                const verified = Object.values(docStatus||{}).filter(s=>s==="verified").length;
                const pct = Math.round((verified/3)*100);
                return (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"white", border:"1px solid #BBF7D0", borderRadius:99, padding:"5px 14px", marginBottom:16, boxShadow:"0 2px 8px rgba(34,197,94,.15)" }}>
                    <div style={{ width:52, height:6, background:"#E5E7EB", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:""+(pct)+"%", background:"linear-gradient(90deg,#22c55e,#16a34a)", borderRadius:99, transition:"width .5s" }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color:"#166534" }}>{verified}/3 verificados</span>
                  </div>
                );
              })()}

              <h2 style={{ fontSize:20, fontWeight:900, color:"#0F172A", margin:"0 0 10px", lineHeight:1.3, letterSpacing:"-.3px" }}>
                Falta um pouco para você<br/>começar a faturar!
              </h2>
              <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.7, margin:"0 0 24px", maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>
                Valide seus documentos para aceitar serviços e transmitir confiança aos clientes.
              </p>
            </div>

            {/* ── DOCUMENT CARDS ── */}
            <div style={{ padding:"0 20px 20px" }}>
              <p style={{ fontSize:11, fontWeight:800, color:"#94A3B8", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 12px" }}>
                Documentos necessários
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {[
                  { id:"rg",      label:"RG / CNH",              icon:"🆔", desc:"Documento de identidade",     hue:"#3B82F6", bg:"#EFF6FF" },
                  { id:"crim",    label:"Antecedentes Criminais", icon:"📜", desc:"Certidão emitida recentemente", hue:"#8B5CF6", bg:"#F5F3FF" },
                  { id:"address", label:"Comprovante de Endereço",icon:"🏠", desc:"Conta de luz, água ou telefone",hue:"#10B981", bg:"#ECFDF5" },
                ].map(doc => {
                  const st = docStatus?.[doc.id] || "pending";
                  const isOk  = st === "verified";
                  const isMid = st === "analysis";
                  return (
                    <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:16, background: isOk ? "#F0FDF4" : isMid ? "#FFFBEB" : "white", border:`1px solid ${isOk ? "#BBF7D0" : isMid ? "#FDE68A" : "#E5E7EB"}`, transition:"all .2s" }}>
                      {/* icon box */}
                      <div style={{ width:44, height:44, borderRadius:12, background:doc.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                        {doc.icon}
                      </div>
                      {/* text */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{doc.label}</p>
                        <p style={{ fontSize:11, color:"#94A3B8", margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{doc.desc}</p>
                      </div>
                      {/* status badge */}
                      <span style={{ fontSize:11, fontWeight:800, borderRadius:99, padding:"4px 11px", whiteSpace:"nowrap", flexShrink:0,
                        background: isOk ? "#DCFCE7" : isMid ? "#FEF3C7" : "#F1F5F9",
                        color:      isOk ? "#166534" : isMid ? "#92400E" : "#94A3B8",
                      }}>
                        {isOk ? "✓ Verificado" : isMid ? "⏳ Análise" : "Pendente"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── PRO CARD — centre of attention ── */}
            <div style={{ margin:"0 20px 20px", borderRadius:20, overflow:"hidden", position:"relative" }}>
              {/* layered bg */}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#0F172A 0%,#1E3A5F 50%,#78350F 100%)" }} />
              {/* animated shimmer border */}
              <div style={{ position:"absolute", inset:0, borderRadius:20, border:"1.5px solid rgba(251,191,36,.55)" }} />
              {/* top gold line */}
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent 0%,#FBBF24 40%,#FDE68A 60%,#FBBF24 80%,transparent 100%)" }} />
              {/* glow blobs */}
              <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"rgba(251,191,36,.12)" }} />
              <div style={{ position:"absolute", bottom:-40, left:-20, width:100, height:100, borderRadius:"50%", background:"rgba(251,191,36,.07)" }} />

              <div style={{ position:"relative", zIndex:1, padding:"20px 20px 18px" }}>

                {/* scarcity tag */}
                <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(251,191,36,.2)", border:"1px solid rgba(251,191,36,.4)", borderRadius:99, padding:"3px 11px", marginBottom:14 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#FBBF24" }} />
                  <span style={{ fontSize:10, fontWeight:800, color:"#FDE68A", letterSpacing:.5 }}>Apenas 3 vagas na sua região hoje</span>
                </div>

                {/* rocket + headline row */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:13, marginBottom:14 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#FBBF24,#F97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0, boxShadow:"0 4px 16px rgba(251,191,36,.45)" }}>
                    🚀
                  </div>
                  <div>
                    <p style={{ fontSize:16, fontWeight:900, color:"#FDE68A", margin:"0 0 4px", lineHeight:1.25 }}>
                      Seja um Profissional PRO
                    </p>
                    <p style={{ fontSize:12, color:"rgba(255,255,255,.65)", margin:0, lineHeight:1.5 }}>
                      Saia na frente dos outros profissionais e feche mais contratos.
                    </p>
                  </div>
                </div>

                {/* checkmark benefits */}
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
                  {[
                    { icon:"⚡", text:"Aprovação prioritária em 15 minutos" },
                    { icon:"🏅", text:"Selo Ouro no Perfil — mais credibilidade" },
                    { icon:"👑", text:"Prioridade no Mural de Serviços" },
                  ].map((b, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:26, height:26, borderRadius:8, background:"rgba(251,191,36,.2)", border:"1px solid rgba(251,191,36,.35)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:13 }}>
                        {b.icon}
                      </div>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,.9)", fontWeight:600 }}>{b.text}</span>
                    </div>
                  ))}
                </div>

                {/* PRO CTA */}
                <button
                  onClick={() => { setShowDocBlock(false); onUpgrade(); }}
                  style={{ width:"100%", padding:"15px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#FBBF24,#F97316,#EA580C)", color:"white", fontWeight:900, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:9, letterSpacing:.2, boxShadow:"0 6px 20px rgba(251,191,36,.45)" }}>
                  <Crown size={17} /> Quero Ser PRO e Faturar Agora
                </button>

                <p style={{ fontSize:10, color:"rgba(255,255,255,.35)", textAlign:"center", margin:"9px 0 0" }}>
                  A partir de R$ 29,90/mês · Cancele quando quiser · Sem fidelidade
                </p>
              </div>
            </div>

            {/* ── SECONDARY ACTIONS ── */}
            <div style={{ padding:"0 20px 44px", display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
              <button
                onClick={() => { setShowDocBlock(false); onGoToDocs?.(); }}
                style={{ width:"100%", padding:"14px 0", borderRadius:16, border:"1.5px solid #007BFF", background:"white", color:"#007BFF", fontWeight:900, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <FileText size={16} /> Completar perfil grátis
              </button>
              <button
                onClick={() => setShowDocBlock(false)}
                style={{ background:"none", border:"none", color:"#94A3B8", fontSize:13, fontWeight:600, cursor:"pointer", padding:"4px 0", textDecoration:"underline", textUnderlineOffset:3 }}>
                Voltar ao Mural
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── GUEST PROFILE TAB ──────────────────────────────── */
function GuestProfileTab({ onLogin }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 32px 40px", textAlign:"center", background:"#F8F9FA", minHeight:"60vh" }}>
      {/* avatar placeholder */}
      <div style={{ width:88, height:88, borderRadius:"50%", background:"#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:42, marginBottom:20 }}>👤</div>
      <h2 style={{ fontSize:22, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Você não está logado</h2>
      <p style={{ fontSize:14, color:"#9CA3AF", lineHeight:1.6, margin:"0 0 36px" }}>
        Entre ou crie sua conta gratuita para<br/>acompanhar pedidos e falar com profissionais.
      </p>
      <button onClick={onLogin} style={{
        width:"100%", padding:"16px 0", borderRadius:18,
        background:`linear-gradient(135deg,${B},#0055d4)`,
        border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        boxShadow:`0 6px 24px ${B}44`, marginBottom:14,
      }}>
        <User size={17} /> Entrar ou Criar Conta
      </button>
      <p style={{ fontSize:12, color:"#9CA3AF" }}>✨ 100% gratuito para clientes</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — Deep Blue dark mode, owner-only access (Thiago)
═══════════════════════════════════════════════════════════════════════════ */

/* ── Static admin data ── */
const ADMIN_PASSWORD = "multi2026";

const REVENUE_7D = [
  { day:"Seg", val:1240 },
  { day:"Ter", val:980  },
  { day:"Qua", val:1620 },
  { day:"Qui", val:2100 },
  { day:"Sex", val:1880 },
  { day:"Sáb", val:2450 },
  { day:"Dom", val:1730 },
];

const PENDING_PROS = [
  { id:1, name:"Carlos Eduardo",  cat:"Encanador",    rg:"✅ Enviado", background:"⏳ Pendente", joined:"08/07/2026" },
  { id:2, name:"Fernanda Costa",  cat:"Eletricista",  rg:"✅ Enviado", background:"✅ Enviado",  joined:"07/07/2026" },
  { id:3, name:"Ricardo Matos",   cat:"Pintor",       rg:"⏳ Pendente", background:"⏳ Pendente", joined:"06/07/2026" },
  { id:4, name:"Juliana Teixeira",cat:"Jardineira",   rg:"✅ Enviado", background:"✅ Enviado",  joined:"05/07/2026" },
];

const HOT_CATS = [
  { rank:1, cat:"Encanador",   searches:342, trend:"+18%" },
  { rank:2, cat:"Pintor",      searches:287, trend:"+12%" },
  { rank:3, cat:"Eletricista", searches:241, trend:"+9%"  },
];

/* ── Admin Login Gate ── */
function AdminLogin({ onSuccess }) {
  const [pass,  setPass]  = useState("");
  const [error, setError] = useState(false);
  const [show,  setShow]  = useState(false);

  const attempt = () => {
    if (pass === ADMIN_PASSWORD) { onSuccess(); }
    else { setError(true); setTimeout(() => setError(false), 1400); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#060D1F", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>

      {/* logo */}
      <div style={{ width:72, height:72, borderRadius:22, background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, boxShadow:"0 8px 32px rgba(29,78,216,.4)" }}>
        <ShieldCheck size={36} color="white" />
      </div>
      <h2 style={{ fontSize:22, fontWeight:900, color:"white", margin:"0 0 6px" }}>Admin Panel</h2>
      <p style={{ fontSize:13, color:"#64748B", margin:"0 0 36px" }}>Acesso restrito — Multi HQ</p>

      <div style={{ width:"100%", maxWidth:320 }}>
        <div style={{ position:"relative", marginBottom:error ? 8 : 20, animation: error ? "shake .4s ease" : "none" }}>
          <Shield size={16} color="#475569" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }} />
          <input
            type={show ? "text" : "password"}
            placeholder="Senha de administrador"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            style={{ width:"100%", background:"#0F172A", border:"1.5px solid "+(error ? "#EF4444" : "#1E293B")+"", borderRadius:14, padding:"13px 44px 13px 42px", fontSize:14, color:"white", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"border-color .2s" }}
          />
          <button onClick={() => setShow(v => !v)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:0, display:"flex" }}>
            {show ? <EyeOff size={16} color="#475569" /> : <Eye size={16} color="#475569" />}
          </button>
        </div>
        {error && <p style={{ fontSize:12, color:"#EF4444", fontWeight:700, margin:"0 0 16px", textAlign:"center" }}>Senha incorreta</p>}
        <button onClick={attempt} style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", color:"white", fontWeight:900, fontSize:14, cursor:"pointer", boxShadow:"0 6px 20px rgba(29,78,216,.35)" }}>
          Acessar Painel
        </button>
        <p style={{ fontSize:11, color:"#334155", textAlign:"center", marginTop:16 }}>Multi v2.0.0 · Plataforma Nacional · © 2026</p>
      </div>
    </div>
  );
}

/* ───────────────────────── ROOT APP ─────────────────────────────────────────── */
export default function App() {
  const [role,      setRole]      = useState(() => {
    try { return JSON.parse(localStorage.getItem("multiSession") || "null")?.role || "client"; } catch { return "client"; }
  });
  const [guestRole, setGuestRole] = useState("client"); // drives the header toggle for guests
  const [screen,    setScreen]    = useState("home");
  const [selected,  setSelected]  = useState(null);
  const [isPro,     setIsPro]     = useState(false);
  const [toast,     setToast]     = useState(null);
  const [ratingTarget, setRatingTarget] = useState(null);
  const [showRankingGlobal, setShowRankingGlobal] = useState(false);
  useEffect(() => {
    const h = () => { setScreen("profile"); setShowRankingGlobal(true); };
    window.addEventListener("openRanking", h);
    return () => window.removeEventListener("openRanking", h);
  }, []);
  const [showAdmin, setShowAdmin] = useState(false);

  // Document verification state — shared between ProfileScreen and ProfessionalHome
  const [docStatus, setDocStatus] = useState({
    rg:      "pending",
    crim:    "pending",
    address: "pending",
  });
  const allDocsVerified = Object.values(docStatus).every(s => s === "verified");

  // ── RESTORE SESSION FROM LOCALSTORAGE ────────────────────────────────────
  const savedSession = (() => {
    if (window.location.hash.includes("access_token")) return null;
    try { return JSON.parse(localStorage.getItem("multiSession")) || null; } catch { return null; }
  })();
  // Auth: starts as guest, modal layers appear on demand
  const [isLoggedIn,    setIsLoggedIn]    = useState(!!savedSession);
  const [authScreen,    setAuthScreen]    = useState(null);
  // Detect password reset link from email
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      setAuthScreen("reset-password");
    } else if (hash.includes("otp_expired") || hash.includes("error=access_denied")) {
      window.location.hash = "";
      alert("Link expirado. Solicite um novo link.");
      setAuthScreen("login");
    }
  }, []);
  const [pendingIntent, setPendingIntent] = useState(null);
  const [userRole,      setUserRole]      = useState(savedSession?.role      || "client");
  const [userName,      setUserName]      = useState(savedSession?.name      || "");

  // SHARED STATE
  const [myServices, setMyServices] = useState([
    { id:10, cat:"encanador", title:"Instalação de chuveiro",  desc:"Trocar chuveiro elétrico por a gás.", value:200, candidates:3, status:"open",       time:"Há 1h",  urgent:false, loc:"sua região", client:"Você", rating:5.0 },
    { id:11, cat:"pintor",    title:"Pintura do quarto",       desc:"Quarto 12m² cor azul claro.",         value:350, candidates:7, status:"inprogress", time:"Ontem",  urgent:false, loc:"sua região", client:"Você", rating:5.0, pro:"Carlos Pintor",   proRating:4.7, proposalValue:320, contactUnlocked:true },
    { id:12, cat:"pedreiro",  title:"Reforma calçada frente",  desc:"Calçada 20m² com pedras irregulares.",value:600, candidates:2, status:"done",       time:"Semana passada", urgent:false, loc:"sua região", client:"Você", rating:5.0, pro:"Pedro Mestre", proRating:4.9, clientRating:5 },
  ]);
  const [notifications, setNotifications] = useState([]);
  const [activeChat,    setActiveChat]    = useState(null);
  const [userEmail,     setUserEmail]     = useState(savedSession?.email    || "");
  const [userLocation,  setUserLocation]  = useState(localStorage.getItem("multiLocation") || savedSession?.location || "sua região");
  const [walletBalance, setWalletBalance] = useState(1240);
  useEffect(() => {
    const sess = (() => { try { return JSON.parse(localStorage.getItem("multiUser")) || {}; } catch { return {}; } })();
    const email = sess.email || savedSession?.email || "";
    console.log("LOCATION EMAIL:", email); if (!email) { console.log("EMAIL VAZIO - multiUser:", JSON.stringify(JSON.parse(localStorage.getItem("multiUser")||"{}"))); return; }
    fetch("https://web-production-e103b.up.railway.app/api/enderecos/" + encodeURIComponent(email))
      .then(r => r.json())
      .then(data => { console.log("ENDERECOS DATA:", JSON.stringify(data));
        if (Array.isArray(data) && data.length > 0) {
          if (data[0].city) { setUserLocation(data[0].city + ", SP"); localStorage.setItem("multiLocation", data[0].city + ", SP"); }
          const cep = data[0].cep.replace(/\D/g,"");
          fetch("https://viacep.com.br/ws/" + cep + "/json/")
            .then(r => r.json())
            .then(d => { if (d.localidade) setUserLocation(d.localidade + ", " + d.uf); })
            .catch(() => { if (data[0].city) setUserLocation(data[0].city); })
            .catch(() => {});
        }
      }).catch(() => {});
  }, []);
  useEffect(() => {
    const sess = (() => { try { return JSON.parse(localStorage.getItem("multiUser")) || {}; } catch { return {}; } })();
    const email = sess.email || savedSession?.email || "";
    console.log("LOCATION EMAIL:", email); if (!email) { console.log("EMAIL VAZIO - multiUser:", JSON.stringify(JSON.parse(localStorage.getItem("multiUser")||"{}"))); return; }
    fetch("https://web-production-e103b.up.railway.app/api/enderecos/" + encodeURIComponent(email))
      .then(r => r.json())
      .then(data => { console.log("ENDERECOS DATA:", JSON.stringify(data));
        if (Array.isArray(data) && data.length > 0) {
          if (data[0].city) { setUserLocation(data[0].city + ", SP"); localStorage.setItem("multiLocation", data[0].city + ", SP"); }
          const cep = data[0].cep.replace(/\D/g,"");
          fetch("https://viacep.com.br/ws/" + cep + "/json/")
            .then(r => r.json())
            .then(d => { if (d.localidade) setUserLocation(d.localidade + ", " + d.uf); })
            .catch(() => { if (data[0].city) setUserLocation(data[0].city); })
            .catch(() => {});
        }
      }).catch(() => {});
  }, []);

  const feedServices = [...SEED_FEED, ...myServices.filter(s => s.status === "open")];

  const showToast = (msg, color = G) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2600);
  };

  // ── WELCOME EMAIL SIMULATION ─────────────────────────────────────────────────
  // URL do backend — troque para https://api.multifuncao.com.br em produção
  const API_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "https://web-production-e103b.up.railway.app";

  const sendWelcomeEmail = async ({ name, email, role }) => {
    const firstName = name?.trim().split(/\s+/)[0] || "Usuário";

    // ── LOG 1: o que chegou à função ──
    console.group("📧 sendWelcomeEmail — iniciando");
    console.log("name    :", name);
    console.log("email   :", email);
    console.log("role    :", role);
    console.log("API_URL :", API_URL);

    // Guarda: sem e-mail não adianta tentar
    if (!email || !email.includes("@")) {
      console.warn("⚠️  E-mail inválido ou vazio — envio cancelado:", email);
      console.groupEnd();
      return;
    }

    try {
      // ── LOG 2: chamada ao backend ──
      console.log("📡 Chamando:", `${API_URL}/api/email/boas-vindas`);

      const response = await fetch(`${API_URL}/api/email/boas-vindas`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, role }),
      });

      // ── LOG 3: status HTTP ──
      console.log("HTTP status :", response.status, response.statusText);

      const data = await response.json();

      // ── LOG 4: resposta do backend ──
      console.log("Resposta    :", data);

      if (response.ok) {
        console.log("✅ E-mail enviado com sucesso pelo SendGrid");
        showToast(`📧 E-mail enviado para ${email}`, role === "client" ? B : O);
      } else {
        // Erro retornado pelo backend (ex: chave inválida, domínio não autenticado)
        console.error("❌ Backend retornou erro:", data.error || data);
        showToast("⚠️ E-mail não enviado. Verifique o terminal.", "#EF4444");
      }

    } catch (err) {
      // ── LOG 5: erro de rede (backend offline, CORS, etc.) ──
      console.error("❌ Erro de rede ao chamar o backend:");
      console.error("   Mensagem  :", err.message);
      console.error("   Dica      : O backend está rodando em", API_URL, "?");
      console.error("   Dica      : VITE_API_URL está configurado no .env?");
    }

    console.groupEnd();
  };

  // ── INTENT-BASED AUTH GATE ──────────────────────────────────────────────────
  const requireAuth = (intent, fn) => {
    if (isLoggedIn) { fn(); return; }
    setPendingIntent({ fn });
    setAuthScreen("welcome");
  };

  const handleLoginComplete = (name = "", email = "", isNewAccount = false, location = "", registeredRole = "", whatsapp = "") => {
    setIsLoggedIn(true);
    setAuthScreen(null);
    const firstName = name.trim().split(/\s+/)[0];
    if (name)     setUserName(firstName);
    if (email)    setUserEmail(email);
    if (location && location !== "sua região") setUserLocation(location);
    const resolvedRole = registeredRole || userRole;
    setUserRole(resolvedRole);
    setRole(resolvedRole);

    // Save session to localStorage — persists across page reloads
    try {
      const session = { name: firstName, email, whatsapp, location, role: resolvedRole };
      localStorage.setItem("multiSession", JSON.stringify(session));
      localStorage.setItem("multiUser",    JSON.stringify(session));
    } catch {}

    setScreen("home");
    // 7-day PRO trial for new professional sign-ups
    if (isNewAccount && resolvedRole === "professional") {
      setIsPro(true);
      setTimeout(() => showToast("🎁 7 dias de Multi PRO ativados! Explore tudo.", "#7C3AED"), 600);
    }
    if (isNewAccount) {
      setTimeout(() => sendWelcomeEmail({ name, email, role: resolvedRole }), 400);
    }
    if (pendingIntent?.fn) {
      const fn = pendingIntent.fn;
      setPendingIntent(null);
      setTimeout(fn, 80);
    }
  };

  // ── SERVICE HANDLERS ────────────────────────────────────────────────────────
  const handlePostService = ({ cat, desc, value }) => {
    const catDef = CATS.find(c => c.id === cat);
    const svc = {
      id: Date.now(), cat, desc, value,
      title: `${catDef?.label ?? "Serviço"} — ${desc.slice(0, 28)}…`,
      candidates: 0, status:"open", time:"Agora", urgent:false,
      loc: userLocation === "sua região" ? "Perto de você" : userLocation,
      client:"Você", rating:5.0,
    };
    setMyServices(s => [svc, ...s]);
    setSelected(svc);
    setScreen("radar");
  };

  const handleProposalNotify = (proposal) => {
    setNotifications(n => [{ id:Date.now(), ...proposal, status:"pending", time:"Agora" }, ...n]);
    setMyServices(s => s.map(x => x.id === proposal.serviceId ? { ...x, candidates: (x.candidates||0)+1 } : x));
    showToast("💼 Proposta enviada! Cliente será notificado.", B);
  };

  const handleAcceptProposal = (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif) return;
    setNotifications(n => n.map(x => x.id === notifId ? { ...x, status:"accepted" } : x));
    setMyServices(s => s.map(x => x.id === notif.serviceId
      ? { ...x, status:"inprogress", pro: notif.proName, proRating:4.8, proposalValue: notif.value, contactUnlocked:true }
      : x));
    showToast("🎉 Proposta aceita! Chat e contato liberados.");
  };

  const openChatFromNotif = (notif) => {
    setActiveChat({ proName: notif.proName, serviceTitle: notif.serviceTitle, proposalValue: notif.value, budgetAccepted: notif.status === "accepted", messages:[] });
    setScreen("activechat");
  };

  const openChatFromService = (svc) => {
    setActiveChat({ proName: svc.pro || "Profissional", serviceTitle: svc.title, proposalValue: svc.proposalValue || svc.value, budgetAccepted: true, contactUnlocked: svc.contactUnlocked || isPro, messages:[] });
    setScreen("activechat");
  };

  const handleFinishService = () => {
    if (!activeChat) return;
    const svc = myServices.find(s => s.title === activeChat.serviceTitle);
    setMyServices(s => s.map(x => x.title === activeChat.serviceTitle ? { ...x, status:"done" } : x));
    setScreen("orders");
    setActiveChat(null);
    if (svc) setTimeout(() => setRatingTarget({ ...svc, status:"done" }), 400);
  };

  const handleRate = (svcId, stars) => {
    setMyServices(s => s.map(x => x.id === svcId ? { ...x, clientRating: stars } : x));
    setRatingTarget(null);
    showToast(`⭐ Obrigada! Você avaliou com ${stars} estrelas.`);
  };

  const handleProFeedAction = (payload) => {
    if (payload._upgrade) { setScreen("upgrade"); return; }
    if (payload._notify)  {
      requireAuth("proposal", () => handleProposalNotify(payload._notify));
      return;
    }
    // Professional must be logged in to see service details
    requireAuth("service", () => {
      // If they logged in as client but clicked a pro service, keep them in pro mode
      setRole("professional");
      setUserRole("professional");
      setSelected(payload);
      setScreen("service");
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole("client");
    setUserRole("client");
    setUserName("");
    setUserEmail("");
    setScreen("home");
    // Clear saved session
    try {
      localStorage.removeItem("multiSession");
      localStorage.removeItem("multiUser");
    } catch {}
    showToast("👋 Até logo!");
  };

  const notifCount = notifications.filter(n => n.status === "pending").length;

  // ── SCREEN ROUTER ───────────────────────────────────────────────────────────
  const renderContent = () => {
    if (screen === "activechat" && activeChat) {
      return (
        <EnhancedChatScreen
          chat={activeChat}
          onBack={() => { setActiveChat(null); setScreen(role === "client" ? "chat" : "home"); }}
          onFinishService={handleFinishService}
          isPro={isPro}
          contactUnlocked={activeChat.contactUnlocked || isPro}
        />
      );
    }

    if (role === "client") {
      // Route guard: logged-in professionals must never see ClientHome
      if (isLoggedIn && userRole === "professional") {
        setTimeout(() => { setRole("professional"); setScreen("home"); }, 0);
        return <ProfessionalFeed isPro={isPro} feedServices={feedServices} onViewService={handleProFeedAction} />;
      }
      if (screen === "post")   return <PostServiceScreen onBack={() => setScreen("home")} onSuccess={handlePostService} />;
      if (screen === "radar" && selected) return <RadarSearchScreen service={selected} onFound={(pro, svc) => { openChatFromService({ ...svc, pro:pro.name, proposalValue:pro.value, contactUnlocked:true, status:"inprogress" }); }} />;
      if (screen === "alerts") return <AlertsScreen notifications={notifications} onAccept={handleAcceptProposal} onOpenChat={openChatFromNotif} />;
      if (screen === "chat")   return <ChatInbox myServices={myServices} onOpenChat={openChatFromService} />;
      if (screen === "orders") return <MyServicesScreen initialTab={screen === "orders" && role === "professional" ? "done" : "open"} myServices={myServices} onOpenService={s => { setSelected(s); setScreen("service"); }} onOpenChat={openChatFromService} isPro={isPro} />;
      if (screen === "profile") {
        if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("welcome")} />;
        return <ProfileScreen role="client" userName={userName} isPro={false} showRankingGlobal={showRankingGlobal} onClearRankingGlobal={() => setShowRankingGlobal(false)} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenAdmin={() => setShowAdmin(true)} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} setScreen("home"); }} />;
      }
      if (screen === "service" && selected) return <ServiceDetailClient service={selected} onBack={() => setScreen("orders")} onStatusChange={(id, newStatus) => { setMyServices(s => s.map(x => x.id === id ? { ...x, status: newStatus } : x)); }} showToast={showToast} />;

      // ── GUEST TOGGLE: show professional mural preview when guest selects "Profissional"
      if (!isLoggedIn && guestRole === "professional") {
        return <GuestMural onSignup={() => setAuthScreen("welcome")} allDocsVerified={null} />;
      }

      // HOME — always visible, auth gates on action
      return (
        <div style={{ position:"relative" }}>
          <ClientHome
            onPost={() => requireAuth("post", () => setScreen("post"))}
            onViewService={s => s
              ? requireAuth("service", () => { setSelected(s); setScreen("service"); })
              : requireAuth("orders", () => setScreen("orders"))
            }
            onSwitchPro={() => { setRole("professional"); setUserRole("professional"); setScreen("home"); setSelected(null); }}
            myServices={isLoggedIn ? myServices : []}
            userName={userName}
          />
          {/* FAB */}
          <button
            onClick={() => requireAuth("post", () => setScreen("post"))}
            style={{
              position:"fixed", bottom:80, right:20, zIndex:100,
              display:"flex", alignItems:"center", gap:8,
              padding:"14px 20px", borderRadius:99, border:"none", cursor:"pointer",
              background:`linear-gradient(135deg,${O},#E64A19)`,
              color:"white", fontWeight:900, fontSize:14,
              boxShadow:"0 6px 24px rgba(255,87,34,.5)",
            }}>
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      );
    }

    // Route guard: logged-in clients must never see the professional feed.
    if (isLoggedIn && userRole === "client" && role !== "client") {
      setTimeout(() => { setRole("client"); setScreen("home"); }, 0);
      return (
        <div style={{ display:"flex", flexDirection:"column", position:"relative" }}>
          <ClientHome
            onPost={() => requireAuth("post", () => setScreen("post"))}
            onViewService={s => s ? requireAuth("service", () => { setSelected(s); setScreen("service"); }) : requireAuth("orders", () => setScreen("orders"))}
            onSwitchPro={() => {}}
            myServices={isLoggedIn ? myServices : []}
            userName={userName}
          />
          <button onClick={() => requireAuth("post", () => setScreen("post"))} style={{ position:"fixed", bottom:80, right:20, zIndex:100, display:"flex", alignItems:"center", gap:8, padding:"14px 20px", borderRadius:99, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:14, boxShadow:"0 6px 24px rgba(255,87,34,.5)" }}>
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      );
    }

    // Professional screens
    if (screen === "upgrade") return <ProUpgrade onBack={() => setScreen("home")} onSubscribe={() => { setIsPro(true); setScreen("home"); showToast("🎉 Você agora é Multi PRO! Contatos desbloqueados."); }} />;
    if (screen === "wallet") return <WalletScreen onBack={() => setScreen("profile")} showToast={showToast} walletBalance={walletBalance} setWalletBalance={setWalletBalance} />;
    if (screen === "profile") {
      if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("welcome")} />;
      return <ProfileScreen role="professional" userName={userName} isPro={isPro} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenWallet={() => setScreen("wallet")} onOpenAdmin={() => setShowAdmin(true)} docStatus={docStatus} onDocStatusChange={(id, st) => setDocStatus(d => ({ ...d, [id]: st }))} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} setScreen("home"); }} />;
    }
    if (screen === "service" && selected) return <ServiceDetailPro service={selected} onBack={() => setScreen("home")} isPro={isPro} onUpgrade={() => setScreen("upgrade")} onOpenPinEntry={() => setScreen("pinjob")} />;
    if (screen === "pinjob"  && selected) return <ServiceDetailPinEntry service={selected} onBack={() => setScreen("service")} onStatusChange={(id, ns) => setMyServices(s => s.map(x => x.id === id ? { ...x, status:ns } : x))} showToast={showToast} />;
    if (screen === "orders") return <MyServicesScreen initialTab="done" myServices={myServices} onOpenService={s => { setSelected(s); setScreen("service"); }} onOpenChat={openChatFromService} isPro={isPro} />;
    // Pro home — shows professional-specific banner + filters + feed
    return (
      <ProfessionalHome
        userName={userName}
        isPro={isPro}
        feedServices={feedServices}
        onViewService={handleProFeedAction}
        onUpgrade={() => setScreen("upgrade")}
        userLocation={localStorage.getItem("multiLocation") || userLocation}
        allDocsVerified={allDocsVerified}
        docStatus={docStatus}
        onGoToDocs={() => setScreen("profile")} onGoToOrders={() => setScreen("orders")} onGoToWallet={() => setScreen("wallet")}
      />
    );
  };

  // ── BOTTOM NAV with auth-gated tabs ─────────────────────────────────────────
  const handleNavTab = (id) => {
    // Client-only gated tabs
    if (["orders","chat","alerts"].includes(id) && !isLoggedIn) {
      requireAuth(id, () => setScreen(id));
      return;
    }
    // If pro is navigating to home, ensure role is set correctly
    if (id === "home" && isLoggedIn && userRole === "professional") {
      setRole("professional");
    }
    setScreen(id);
  };

  // ── WRAPPER ─────────────────────────────────────────────────────────────────
  const wrapper = (children) => (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", justifyContent:"center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { font-family:'Nunito',sans-serif; box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
      `}</style>
      <div style={{ width:"100%", maxWidth:400, background:BG, display:"flex", flexDirection:"column", minHeight:"100vh", position:"relative" }}>
        {children}
      </div>
    </div>
  );

  // ── AUTH MODAL OVERLAYS (slide in over the app, never replace it) ────────────
  if (authScreen === "welcome") {
    return wrapper(
      <WelcomeScreen
        onGoogle={() => alert("Login com Google em breve! Use o cadastro por e-mail.")}
        onEmail={() => setAuthScreen("login")}
        onBack={() => { setAuthScreen(null); setPendingIntent(null); }}
      />
    );
  }

  if (authScreen === "register") {
    return wrapper(
      <RegisterScreen onBack={() => setAuthScreen("welcome")} onComplete={handleLoginComplete} />
    );
  }
  if (authScreen === "reset-password") {
    return wrapper(<ResetPasswordScreen onComplete={() => { setAuthScreen(null); showToast("✅ Senha alterada! Faça login."); setAuthScreen("login"); }} />);
  }
  if (authScreen === "forgot-password") {
    return wrapper(<ForgotPasswordScreen onBack={() => setAuthScreen("login")} onComplete={() => { setAuthScreen("login"); showToast("✅ Senha alterada com sucesso!"); }} />);
  }
  if (authScreen === "login") {
    return wrapper(<LoginScreen onBack={() => setAuthScreen("welcome")} onComplete={handleLoginComplete} onRegister={() => setAuthScreen("register")} onForgot={() => setAuthScreen("forgot-password")} />);
  }
  // Admin overlay — renders over everything else
  if (showAdmin) {
    return wrapper(<AdminDashboard onExit={() => setShowAdmin(false)} />);
  }

  return wrapper(
    <>
      {ratingTarget && (
        <RatingModal
          service={ratingTarget}
          onRate={(stars) => handleRate(ratingTarget.id, stars)}
          onClose={() => setRatingTarget(null)}
        />
      )}

      {toast && (
        <div style={{ position:"fixed", top:18, left:"50%", transform:"translateX(-50%)", zIndex:999, background:toast.color, color:"white", padding:"11px 20px", borderRadius:14, boxShadow:"0 6px 20px rgba(0,0,0,.20)", fontSize:13, fontWeight:800, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:8 }}>
          {toast.msg}
        </div>
      )}

      <Header isPro={isPro} notifCount={notifCount} isLoggedIn={isLoggedIn} userRole={userRole} onAlerts={() => setScreen("alerts")} userLocation={localStorage.getItem("multiLocation") || userLocation} onToggleRole={setGuestRole} activeRole={guestRole} />

      <div style={{ flex:1, overflowY:"auto" }}>
        {renderContent()}
      </div>

      {/* Bottom nav — tabs driven by authenticated role, not the browse toggle */}
      <div style={{ position:"sticky", bottom:0, background:"white", borderTop:"1px solid #EBEBEB", boxShadow:"0 -3px 16px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-around", padding:"8px 0 10px" }}>
        {(isLoggedIn && userRole === "professional"
          // ── Professional tabs (no FAB, no + Novo Pedido) ──
          ? [
              { id:"home",    label:"Mural",    Icon:Home },
              { id:"orders",  label:"Meus Serviços", Icon:ClipboardList },
              { id:"upgrade", label:"Seja PRO",  Icon:Crown },
              { id:"profile", label:"Perfil",    Icon:User },
            ]
          // ── Client tabs (or guest browsing) ──
          : [
              { id:"home",    label:"Início",       Icon:Home },
              { id:"orders",  label:"Meus Pedidos", Icon:ClipboardList },
              { id:"chat",    label:"Mensagens",    Icon:MessageCircle },
              { id:"profile", label:"Perfil",       Icon:User },
            ]
        ).map(({ id, label, Icon }) => {
          const active = screen === id || (id === "home" && !["orders","alerts","upgrade","profile","chat","post","service","radar","activechat"].includes(screen));
          const locked = ["orders","chat"].includes(id) && !isLoggedIn;
          return (
            <button key={id} onClick={() => handleNavTab(id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"0 12px", position:"relative" }}>
              {locked && <span style={{ position:"absolute", top:-2, right:6, width:8, height:8, background:O, borderRadius:"50%" }} />}
              <Icon size={21} color={active ? (isLoggedIn && userRole === "professional" ? O : B) : "#C0C0C0"} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize:10, fontWeight:700, color: active ? (isLoggedIn && userRole === "professional" ? O : B) : "#C0C0C0" }}>{label}</span>
            </button>
          );
        })}
      </div>
    <ChatWidget />
      
    </>

  );
}
// deploy Sun Apr 26 23:30:18     2026
// utf8-fix
