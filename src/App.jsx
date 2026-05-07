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
       From:                  contato@multifuncao.com.br
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
        <button style={{ display:"flex", alignItems:"center", gap:2, fontSize:12, fontWeight:700, color:B, background:"none", border:"none", cursor:"pointer" }}>
          Ver todos <ChevronRight size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:6, color:"#aaa", fontSize:13, fontWeight:700, background:"none", border:"none", cursor:"pointer", alignSelf:"flex-start" }}>
      <ArrowLeft size={15} /> Voltar
    </button>
  );
}

function CatBubble({ cat }) {
  return (
    <button style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0, border:"none", background:"none", cursor:"pointer", padding:0 }}>
      <div style={{ position:"relative" }}>
        <span style={{ position:"absolute", top:-5, right:-5, zIndex:1, background:"white", border:"1px solid #F0F0F0", borderRadius:99, padding:"1px 5px", display:"flex", alignItems:"center", gap:2, boxShadow:"0 1px 6px rgba(0,0,0,.10)" }}>
          <Star size={8} fill="#F9A825" stroke="none" />
          <span style={{ fontSize:9, fontWeight:800, color:"#444" }}>{cat.star}</span>
        </span>
        <div style={{ width:58, height:58, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, background:cat.bg, boxShadow:"0 3px 10px rgba(0,0,0,.09)", border:"2.5px solid white" }}>{cat.emoji}</div>
      </div>
      <span style={{ fontSize:10, fontWeight:700, color:"#555", textAlign:"center", width:62, lineHeight:1.25 }}>{cat.label}</span>
    </button>
  );
}

function NearbyCard({ s }) {
  return (
    <div style={{ flexShrink:0, width:148, borderRadius:16, overflow:"hidden", background:"white", boxShadow:"0 2px 12px rgba(0,0,0,.07)", cursor:"pointer" }}>
      <div style={{ height:76, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, background:`linear-gradient(135deg,${s.bg},${s.bg}aa)` }}>{s.emoji}</div>
      <div style={{ padding:"10px 12px 12px" }}>
        <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e", lineHeight:1.3, marginBottom:5 }}>{s.title}</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:3 }}>
            <Star size={10} fill="#F9A825" stroke="none" />
            <span style={{ fontSize:11, color:"#888", fontWeight:600 }}>{s.rating}</span>
          </div>
          <span style={{ fontSize:11, fontWeight:800, color:B }}>R${s.price}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:4 }}>
          <MapPin size={9} color="#bbb" />
          <span style={{ fontSize:10, color:"#bbb" }}>{s.dist}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── LOGO ───────────────────────────────────────────── */
function Logo({ size = 28, white = false }) {
  const stroke = white ? "white" : B;
  return (
    <svg width={size} height={size * 0.95} viewBox="0 0 44 42" fill="none">
      <path d="M4 36 L4 12 L15 26 L22 14 L29 26 L40 12 L40 36" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 36 L15 27" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M29 36 L29 27" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M37 4 C33.7 4 31 6.7 31 10 C31 14.5 37 21 37 21 C37 21 43 14.5 43 10 C43 6.7 40.3 4 37 4Z" fill={O} />
      <path d="M37 6 L37.9 8.8 L40.9 8.8 L38.5 10.6 L39.4 13.4 L37 11.6 L34.6 13.4 L35.5 10.6 L33.1 8.8 L36.1 8.8Z" fill="white" opacity=".95" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER — two completely separate render paths, zero shared toggle logic.
   isLoggedIn=false  → GuestHeader (shows toggle)
   isLoggedIn=true   → AuthHeader  (NO toggle, ever, for any reason)
───────────────────────────────────────────────────────────────────────────── */

function AuthHeader({ isPro, notifCount, userRole, onAlerts, userLocation = "Sua localização" }) {
  const isProfessional = userRole === "professional";
  return (
    <div style={{
      position:"sticky", top:0, zIndex:50,
      background: isProfessional
        ? "linear-gradient(180deg,#0F3460 0%,#163a6a 100%)"
        : `linear-gradient(180deg,${B} 0%,#0057d4 100%)`,
      boxShadow:"0 4px 20px rgba(0,0,0,.28)",
      borderRadius:"0 0 20px 20px",
    }}>
      {/* row 1: location + bells + avatar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px 6px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <MapPin size={13} color="rgba(255,255,255,.7)" />
          <div>
            <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", fontWeight:700, margin:0 }}>Sua Localização</p>
                <p style={{ fontSize:12, color:"white", fontWeight:800, margin:0 }}>{localStorage.getItem("multiLocation") || userLocation}</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {!isProfessional && (
            <button onClick={onAlerts} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              <Bell size={15} color="white" />
              {notifCount > 0 && <span style={{ position:"absolute", top:5, right:5, width:7, height:7, background:"#FF4444", borderRadius:"50%", border:"1.5px solid rgba(0,0,0,.3)" }} />}
            </button>
          )}
          <div style={{ position:"relative" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>
              {isProfessional ? "👨‍🔧" : "👩"}
            </div>
            {!isProfessional && (
              <div style={{ position:"absolute", bottom:-4, right:-4, background:"linear-gradient(135deg,#F9A825,#E65100)", borderRadius:99, padding:"1px 5px", boxShadow:"0 2px 6px rgba(0,0,0,.22)", cursor:"pointer" }} onClick={() => window.dispatchEvent(new Event("openRanking"))}>
                <span style={{ fontSize:8, fontWeight:900, color:"white" }}>OURO</span>
              </div>
            )}
            {isProfessional && (
              <div style={{ position:"absolute", bottom:-4, right:-4, background:O, borderRadius:99, padding:"1px 5px", boxShadow:"0 2px 6px rgba(0,0,0,.22)", display:"flex", alignItems:"center", gap:2 }}>
                <Wrench size={8} color="white" />
                <span style={{ fontSize:8, fontWeight:900, color:"white" }}>{isPro ? "PRO" : "Pro"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* row 2: logo */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2px 18px 10px", gap:8 }}>
        <Logo size={26} white />
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:19, fontWeight:900, color:"white", letterSpacing:-0.5, lineHeight:1 }}>multi</span>
            {isProfessional && (
              <span style={{ fontSize:9, fontWeight:900, background:O, color:"white", padding:"2px 7px", borderRadius:99 }}>
                {isPro ? "PRO" : "Profissional"}
              </span>
            )}
          </div>
          <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", margin:0, lineHeight:1.2 }}>
            {isProfessional ? "mural de serviços" : "serviços em um toque"}
          </p>
        </div>
      </div>

      {/* row 3: context indicator */}
      {!isProfessional && (
        <div style={{ margin:"0 16px 12px", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />
          <span style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:700 }}>Logado como Cliente</span>
        </div>
      )}
      {isProfessional && (
        <div style={{ margin:"0 16px 12px", background:"rgba(255,87,34,.2)", border:"1px solid rgba(255,87,34,.3)", borderRadius:12, padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Briefcase size={13} color={O} />
            <span style={{ fontSize:11, color:"rgba(255,255,255,.9)", fontWeight:800 }}>Modo Profissional Ativo</span>
          </div>
          <span style={{ fontSize:10, fontWeight:800, color:O, background:"rgba(255,87,34,.25)", borderRadius:99, padding:"2px 8px" }}>
            {isPro ? "PRO ✓" : "Free"}
          </span>
        </div>
      )}
      {/* NO TOGGLE. EVER. FULL STOP. */}
    </div>
  );
}

function GuestHeader({ onToggleRole, activeRole = "client" }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:50, background:`linear-gradient(180deg,${B} 0%,#0057d4 100%)`, boxShadow:"0 4px 20px rgba(0,112,255,.28)", borderRadius:"0 0 20px 20px" }}>
      {/* row 1 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px 6px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <MapPin size={13} color="rgba(255,255,255,.7)" />
          <div>
            <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", fontWeight:700, margin:0 }}>Sua Localização</p>
                <p style={{ fontSize:12, color:"white", fontWeight:800, margin:0 }}>{localStorage.getItem("multiLocation") || "Sua localização"}</p>
          </div>
        </div>
        <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>👤</div>
      </div>
      {/* row 2: logo */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2px 18px 10px", gap:8 }}>
        <Logo size={26} white />
        <div>
          <span style={{ fontSize:19, fontWeight:900, color:"white", letterSpacing:-0.5, lineHeight:1 }}>multi</span>
          <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", margin:0, lineHeight:1.2 }}>serviços em um toque</p>
        </div>
      </div>
      {/* row 3: toggle — now drives App role state */}
      <div style={{ display:"flex", margin:"0 16px 14px", background:"rgba(255,255,255,.15)", borderRadius:14, padding:3 }}>
        {[{ id:"client", label:"Cliente", Icon:User }, { id:"professional", label:"Profissional", Icon:Briefcase }].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => onToggleRole?.(id)} style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            padding:"9px 0", borderRadius:12, fontSize:12, fontWeight:800,
            border:"none", cursor:"pointer", transition:"all .18s",
            background: activeRole === id ? "white" : "transparent",
            color:      activeRole === id ? "#1a1a2e" : "rgba(255,255,255,.75)",
            boxShadow:  activeRole === id ? "0 2px 8px rgba(0,0,0,.12)" : "none",
          }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Public façade — picks the right header, nothing shared between them */
function Header({ isPro, notifCount, isLoggedIn, userRole, onAlerts, userLocation, onToggleRole, activeRole }) {
  if (isLoggedIn) {
    return <AuthHeader isPro={isPro} notifCount={notifCount} userRole={userRole} onAlerts={onAlerts} userLocation={localStorage.getItem("multiLocation") || userLocation} />;
  }
  return <GuestHeader onToggleRole={onToggleRole} activeRole={activeRole} />;
}

/* ───────────────────────── BOTTOM NAV ─────────────────────────────────────── */
function BottomNav({ role, screen, setScreen, notifCount }) {
  const clientTabs = [
    { id:"home",    label:"Início",       Icon:Home },
    { id:"orders",  label:"Meus Pedidos", Icon:ClipboardList },
    { id:"chat",    label:"Mensagens",    Icon:MessageCircle },
    { id:"profile", label:"Perfil",       Icon:User },
  ];
  const proTabs = [
    { id:"home",    label:"Início",    Icon:Home },
    { id:"orders",  label:"Pedidos",   Icon:ClipboardList },
    { id:"upgrade", label:"Seja PRO",  Icon:Crown },
    { id:"profile", label:"Perfil",    Icon:User },
  ];
  const tabs = role === "client" ? clientTabs : proTabs;
  return (
    <div style={{ position:"sticky", bottom:0, background:"white", borderTop:"1px solid #EBEBEB", boxShadow:"0 -3px 16px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-around", padding:"8px 0 10px" }}>
      {tabs.map(({ id, label, Icon, badge }) => {
        const active = screen === id || (id === "home" && !["orders","alerts","upgrade","profile","chat","post","service","radar","activechat"].includes(screen));
        return (
          <button key={id} onClick={() => setScreen(id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"0 12px", position:"relative" }}>
            {badge > 0 && <span style={{ position:"absolute", top:-2, right:8, background:"#FF4444", color:"white", fontSize:9, fontWeight:900, padding:"1px 5px", borderRadius:99, minWidth:16, textAlign:"center" }}>{badge}</span>}
            <Icon size={21} color={active ? B : "#C0C0C0"} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize:10, fontWeight:700, color: active ? B : "#C0C0C0" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── PROPOSAL MODAL ──────────────────────────────────── */
function ProposalModal({ service, onClose, onSend }) {
  const [proposal, setProposal] = useState("");
  const [value, setValue] = useState(String(service.value));
  const cat = CATS.find(c => c.id === service.cat);

  const handleSend = () => {
    if (!proposal.trim()) return;
    onSend({ serviceId: service.id, serviceTitle: service.title, proposal, value: Number(value), proName: "João Silva (Profissional)" });
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", background:"rgba(0,0,0,.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 36px", boxShadow:"0 -8px 32px rgba(0,0,0,.15)" }}>
        {/* handle */}
        <div style={{ width:40, height:4, background:"#E0E0E0", borderRadius:99, margin:"0 auto 20px" }} />
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{cat?.emoji}</div>
          <div>
            <p style={{ fontWeight:900, fontSize:15, color:"#1a1a2e" }}>Enviar Proposta</p>
            <p style={{ fontSize:12, color:"#aaa" }}>{service.title}</p>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>Sua proposta</label>
          <textarea
            rows={3}
            placeholder="Descreva brevemente como você pode resolver o problema..."
            value={proposal}
            onChange={e => setProposal(e.target.value)}
            style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1a1a2e", outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5 }}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>Valor que você cobra (R$)</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"#999", fontSize:13 }}>R$</span>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px 12px 38px", fontSize:13, color:"#1a1a2e", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}
            />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={onClose} style={{ padding:"13px 0", borderRadius:12, border:"1.5px solid #E8E8E8", background:"white", color:"#888", fontWeight:800, fontSize:13, cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSend} style={{ padding:"13px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 4px 14px rgba(255,87,34,.3)" }}>
            Enviar Proposta
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── ALERTS SCREEN ────────────────────────────────────── */
function AlertsScreen({ notifications, onAccept, onOpenChat }) {
  if (notifications.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 32px", gap:14, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:B+"12", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Bell size={28} color={B} />
        </div>
        <p style={{ fontWeight:800, fontSize:16, color:"#1a1a2e" }}>Nenhuma notificação</p>
        <p style={{ fontSize:13, color:"#aaa", lineHeight:1.5 }}>Quando um profissional enviar uma proposta, ela aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, padding:"18px 16px 40px" }}>
      <h2 style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", margin:0 }}>Alertas</h2>
      {notifications.map(n => (
        <Card key={n.id}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💼</div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:800, fontSize:13, color:"#1a1a2e", marginBottom:2 }}>Nova proposta recebida!</p>
              <p style={{ fontSize:12, color:"#aaa", marginBottom:4 }}>
                <strong style={{ color:"#555" }}>{n.proName}</strong> quer atender seu serviço
              </p>
              <p style={{ fontSize:12, color:"#555", fontStyle:"italic", lineHeight:1.4, background:BG, borderRadius:8, padding:"8px 10px" }}>"{n.proposal}"</p>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <p style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>Serviço</p>
              <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e" }}>{n.serviceTitle}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:11, color:"#aaa", marginBottom:2 }}>Valor proposto</p>
              <p style={{ fontSize:16, fontWeight:900, color:B }}>R$ {n.value}</p>
            </div>
          </div>

          {n.status === "pending" ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onClick={() => onAccept(n.id)} style={{ padding:"11px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Check size={14} /> Aceitar
              </button>
              <button style={{ padding:"11px 0", borderRadius:10, border:"1.5px solid #FFE0E0", background:"#FFF8F8", color:"#E53935", fontWeight:800, fontSize:12, cursor:"pointer" }}>
                Recusar
              </button>
            </div>
          ) : (
            <button onClick={() => onOpenChat(n)} style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <MessageCircle size={15} /> Abrir Chat com Profissional
            </button>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ───────────────────────── CHAT SCREEN ─────────────────────────────────────── */
function ChatScreen({ chat, onBack, onFinish }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(chat.messages || [
    { id:1, from:"pro",    text:"Olá! Recebi seu serviço. Posso ir amanhã às 9h, tudo bem?", time:"10:01" },
    { id:2, from:"client", text:"Ótimo! Estarei em casa. Por favor confirme antes de vir.", time:"10:03" },
    { id:3, from:"pro",    text:"Confirmado! Trarei todos os materiais necessários 🔧",       time:"10:04" },
  ]);
  const [finished, setFinished] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = (msg) => {
    if (!msg.trim()) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
    setMessages(m => [...m, { id: Date.now(), from:"client", text: msg, time }]);
    setText("");
    // simulate pro reply with quick actions
    if (msg.includes("Localização")) {
      setTimeout(() => setMessages(m => [...m, { id: Date.now()+1, from:"pro", text:"📍 Localização recebida! Estou a caminho.", time }]), 800);
    } else if (msg.includes("Foto")) {
      setTimeout(() => setMessages(m => [...m, { id: Date.now()+1, from:"pro", text:"📸 Pode enviar! Vou verificar o problema antes de chegar.", time }]), 800);
    }
  };

  const handleFinish = () => {
    setFinished(true);
    setMessages(m => [...m, { id: Date.now(), from:"system", text:"✅ Serviço finalizado! Obrigado por usar o Multi.", time:"" }]);
    setTimeout(onFinish, 2000);
  };

  const quickActions = [
    { label:"📍 Enviar Localização", msg:"📍 Localização enviada — Rua das Flores, 123, sua região" },
    { label:"📸 Solicitar Foto",    msg:"📸 Solicitar Foto do problema" },
    { label:"✅ Finalizar Serviço", action: handleFinish },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxHeight:"calc(100vh - 130px)" }}>
      {/* chat header */}
      <div style={{ padding:"14px 16px 12px", background:"white", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", padding:0 }}><ArrowLeft size={20} color="#aaa" /></button>
        <div style={{ width:38, height:38, borderRadius:12, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💼</div>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:900, fontSize:14, color:"#1a1a2e" }}>{chat.proName}</p>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:G, display:"inline-block" }} />
            <span style={{ fontSize:11, color:G, fontWeight:700 }}>Online</span>
          </div>
        </div>
        <div>
          <p style={{ fontSize:10, color:"#aaa", textAlign:"right" }}>Serviço</p>
          <p style={{ fontSize:12, fontWeight:800, color:B }}>{chat.serviceTitle}</p>
        </div>
      </div>

      {/* messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10, background:BG }}>
        {messages.map(m => {
          if (m.from === "system") return (
            <div key={m.id} style={{ textAlign:"center" }}>
              <span style={{ background:G+"18", color:G, fontSize:12, fontWeight:800, padding:"6px 14px", borderRadius:99 }}>{m.text}</span>
            </div>
          );
          const isClient = m.from === "client";
          return (
            <div key={m.id} style={{ display:"flex", justifyContent: isClient ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth:"75%", padding:"10px 13px", borderRadius: isClient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isClient ? B : "white",
                color: isClient ? "white" : "#1a1a2e",
                fontSize:13, lineHeight:1.5,
                boxShadow:"0 2px 8px rgba(0,0,0,.08)",
              }}>
                <p style={{ margin:0 }}>{m.text}</p>
                <p style={{ margin:"4px 0 0", fontSize:10, opacity:.6, textAlign:"right" }}>{m.time}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* quick actions */}
      {!finished && (
        <div style={{ padding:"10px 12px 4px", background:"white", borderTop:"1px solid #F0F0F0", display:"flex", gap:7, overflowX:"auto", scrollbarWidth:"none" }}>
          {quickActions.map((qa, i) => (
            <button key={i} onClick={() => qa.action ? qa.action() : send(qa.msg)} style={{
              flexShrink:0, padding:"7px 12px", borderRadius:99, fontSize:11, fontWeight:700, border:"none", cursor:"pointer",
              background: qa.label.includes("Finalizar") ? G+"15" : B+"10",
              color:      qa.label.includes("Finalizar") ? G       : B,
            }}>{qa.label}</button>
          ))}
        </div>
      )}

      {/* input */}
      {!finished && (
        <div style={{ padding:"10px 12px 16px", background:"white", display:"flex", alignItems:"center", gap:10 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(text)}
            placeholder="Digite uma mensagem..."
            style={{ flex:1, border:"1.5px solid #EBEBEB", borderRadius:12, padding:"11px 14px", fontSize:13, outline:"none", fontFamily:"inherit" }}
          />
          <button onClick={() => send(text)} style={{ width:42, height:42, borderRadius:12, border:"none", background:B, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 3px 10px rgba(0,112,255,.3)", flexShrink:0 }}>
            <Send size={16} color="white" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── CATEGORY GRID CARDS ──────────────────────────────── */
const CAT_GRID = [
  {
    id:"repairs", label:"REPAROS GERAIS", star:"5.0", bg:"#EBF4FF", accent:"#1E6FD9",
    icons:["🔨","🔧"], desc:"Elétrica, hidráulica e mais",
  },
  {
    id:"garden", label:"JARDIM & PISCINA", star:"4.9", bg:"#EAFAF1", accent:"#1A8A4A",
    icons:["🌿","🏊"], desc:"Jardinagem e piscinas",
  },
  {
    id:"paint", label:"PINTURA & ACABAMENTO", star:"4.8", bg:"#FDF0FF", accent:"#8B2FC9",
    icons:["🖌️","🎨"], desc:"Pintura residencial e comercial",
  },
  {
    id:"clean", label:"LIMPEZA ESPECIAL", star:"4.7", bg:"#FFF8E7", accent:"#C77B0A",
    icons:["✨","🧹"], desc:"Fachadas, janelas e geral",
  },
];

const MOCK_PROS = [
  { id:1, name:"Ricardo Alves",  cat:"Encanador",  rating:5.0, jobs:127, value:180, verified:true,  avatar:"👨", tag:"Mais rápido"    },
  { id:2, name:"Miguel Santos",  cat:"Encanador",  rating:4.9, jobs:89,  value:220, verified:true,  avatar:"👷", tag:"Melhor avaliado" },
  { id:3, name:"Carla Freitas",  cat:"Encanadora", rating:4.8, jobs:54,  value:160, verified:false, avatar:"👩", tag:"Mais barato"     },
  { id:4, name:"João Oliveira",  cat:"Encanador",  rating:4.7, jobs:203, value:190, verified:true,  avatar:"🧑", tag:"" },
  { id:5, name:"Paula Mendes",   cat:"Encanadora", rating:4.6, jobs:41,  value:175, verified:true,  avatar:"👩", tag:"" },
  { id:6, name:"Roberto Lima",   cat:"Encanador",  rating:4.5, jobs:88,  value:200, verified:false, avatar:"👨", tag:"" },
  { id:7, name:"Sandra Costa",   cat:"Encanadora", rating:4.4, jobs:62,  value:155, verified:true,  avatar:"👩", tag:"" },
];
/* ───────────────────────── RADAR SCREEN ────────────────────────────────────── */
function RadarSearchScreen({ service, onFound }) {
  const [phase, setPhase] = useState(0); // 0=searching, 1=found

  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 3000);
    return () => clearTimeout(t);
  }, []);

  const cat = CATS.find(c => c.id === service.cat);

  if (phase === 1) {
    return (
      <div style={{ display:"flex", flexDirection:"column", paddingBottom:100 }}>
        {/* success header */}
        <div style={{ padding:"20px 20px 16px", background:"white", borderBottom:"1px solid #F0F0F0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{cat?.emoji}</div>
            <div>
              <p style={{ fontSize:12, color:"#aaa", margin:0 }}>{service.title}</p>
              <p style={{ fontSize:14, fontWeight:900, color:"#1a1a2e", margin:0 }}>R$ {service.value} · {service.loc || "sua região"}</p>
            </div>
          </div>
          {/* interest banner */}
          <div style={{ marginTop:12, padding:"10px 14px", borderRadius:14, background:G+"12", border:`1px solid ${G}40`, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>🎉</span>
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:"#166534", margin:0 }}>${MOCK_PROS.length} Profissionais Interessados!</p>
              <p style={{ fontSize:11, color:"#4ade80", margin:0 }}>Selecione o melhor para você</p>
            </div>
          </div>
        </div>

        {/* candidate cards */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px 16px 0" }}>
          {MOCK_PROS.map((pro, i) => (
            <div key={pro.id} style={{
              background:"white", borderRadius:20, overflow:"hidden",
              boxShadow:"0 4px 20px rgba(0,0,0,.08)", border:"1px solid #F0F0F0",
            }}>
              {/* tag ribbon */}
              {pro.tag && (
                <div style={{ padding:"6px 14px", background: i === 0 ? O : i === 1 ? B : "#8B2FC9", display:"inline-block" }}>
                  <span style={{ fontSize:10, fontWeight:900, color:"white", letterSpacing:.5 }}>{pro.tag.toUpperCase()}</span>
                </div>
              )}

              <div style={{ padding:"14px 16px" }}>
                {/* pro info row */}
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:B+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>{pro.avatar}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
                      <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>{pro.name}</p>
                      {pro.verified && (
                        <span style={{ display:"flex", alignItems:"center", gap:3, background:"#FFF9E0", border:"1px solid #F9A82540", borderRadius:99, padding:"2px 7px" }}>
                          <BadgeCheck size={11} color="#F9A825" />
                          <span style={{ fontSize:10, fontWeight:800, color:"#B7791F" }}>Verificado</span>
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:12, color:"#aaa", margin:0 }}>{pro.cat} · {pro.jobs} serviços</p>
                  </div>
                </div>

                {/* rating + value */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, padding:"10px 12px", background:"#F8F9FA", borderRadius:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    {[1,2,3,4,5].map(s => <Star key={s} size={15} fill={pro.rating >= s ? "#F9A825" : "#E5E7EB"} stroke="none" />)}
                    <span style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", marginLeft:3 }}>{pro.rating.toFixed(1)}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:10, color:"#aaa", margin:0 }}>Proposta</p>
                    <p style={{ fontSize:18, fontWeight:900, color:B, margin:0 }}>R$ {pro.value}</p>
                  </div>
                </div>

                {/* action buttons */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                  <button onClick={() => onFound(pro, service)} style={{ padding:"12px 0", borderRadius:12, border:`1.5px solid ${B}`, background:"white", color:B, fontWeight:800, fontSize:12, cursor:"pointer" }}>
                    VER PERFIL
                  </button>
                  <button onClick={() => onFound(pro, service)} style={{ padding:"12px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontWeight:800, fontSize:12, cursor:"pointer", boxShadow:`0 4px 12px ${B}44`, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <MessageCircle size={14} /> ABRIR CHAT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Phase 0 — radar animation
  return (
    <>
      <style>{`
        @keyframes radar-ring {
          0%   { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes radar-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        .rring { position:absolute; border-radius:50%; border:2px solid ${B}; animation: radar-ring 2.4s ease-out infinite; }
        .rring-2 { animation-delay:.8s; }
        .rring-3 { animation-delay:1.6s; }
      `}</style>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", padding:32, textAlign:"center" }}>
        {/* radar */}
        <div style={{ position:"relative", width:140, height:140, marginBottom:36 }}>
          <span className="rring" style={{ inset:20 }} />
          <span className="rring rring-2" style={{ inset:20 }} />
          <span className="rring rring-3" style={{ inset:20 }} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg,${B},#0056c7)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 6px 24px ${B}55` }}>
              <Search size={26} color="white" />
            </div>
          </div>
        </div>
        <h3 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", marginBottom:8 }}>Buscando Profissionais…</h3>
        <p style={{ fontSize:13, color:"#aaa", lineHeight:1.6, marginBottom:6 }}>
          Enviando para profissionais verificados<br/>na sua região
        </p>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:16 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width:8, height:8, borderRadius:"50%", background:B, animation:`radar-dot 1.2s ease-in-out ${i*.4}s infinite`, display:"inline-block" }} />
          ))}
        </div>
        <div style={{ marginTop:28, padding:"12px 20px", borderRadius:14, background:"#F8F9FA", border:"1px solid #E9ECEF" }}>
          <p style={{ fontSize:12, color:"#888", margin:0 }}>Seu pedido: <strong style={{ color:"#1a1a2e" }}>{service.title}</strong></p>
          <p style={{ fontSize:13, fontWeight:900, color:B, margin:"4px 0 0" }}>R$ {service.value}</p>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── CLIENT HOME (FOCUSED PREMIUM) ────────────────────── */

const HOME_CATS = [
  { id:"pedreiro",     label:"Pedreiro",          emoji:"👷", star:"4.8", bg:"#EBF4FF", accent:"#1565C0", grad:"linear-gradient(135deg,#1565C0,#1976D2)", desc:"Obras e reparos"    },
  { id:"encanador",    label:"Encanador",          emoji:"🔧", star:"4.6", bg:"#E8F8EE", accent:"#1B5E20", grad:"linear-gradient(135deg,#1B5E20,#2E7D32)", desc:"Água e gás"          },
  { id:"jardineiro",   label:"Jardineiro",         emoji:"🌿", star:"4.9", bg:"#FFF8E1", accent:"#E65100", grad:"linear-gradient(135deg,#E65100,#F57C00)", desc:"Jardim e poda"       },
  { id:"pintor",       label:"Pintor",             emoji:"🖌️", star:"4.5", bg:"#F3E5F5", accent:"#6A1B9A", grad:"linear-gradient(135deg,#6A1B9A,#7B1FA2)", desc:"Pintura geral"       },
  { id:"eletricista",  label:"Eletricista",        emoji:"⚡", star:"4.7", bg:"#FFFCE8", accent:"#F57F17", grad:"linear-gradient(135deg,#F57F17,#F9A825)", desc:"Instalações"         },
  { id:"vidraceiro",   label:"Vidraceiro",         emoji:"🪟", star:"4.4", bg:"#E0F7FA", accent:"#00838F", grad:"linear-gradient(135deg,#00838F,#00ACC1)", desc:"Vidros e janelas"    },
  { id:"chaveiro",     label:"Chaveiro 24h",       emoji:"🔑", star:"4.7", bg:"#FFF8E1", accent:"#F57F17", grad:"linear-gradient(135deg,#F9A825,#FFB300)", desc:"Urgência 24 horas"   },
  { id:"desentupidor", label:"Desentupimento",     emoji:"💧", star:"4.5", bg:"#E3F2FD", accent:"#0277BD", grad:"linear-gradient(135deg,#0277BD,#039BE5)", desc:"Pias, ralos e tubos" },
  { id:"redes",        label:"Redes de Proteção",  emoji:"🕸️", star:"4.6", bg:"#E8F5E9", accent:"#2E7D32", grad:"linear-gradient(135deg,#1B5E20,#388E3C)", desc:"Varanda e janelas"   },
  { id:"lavanderia",   label:"Téc. Máq. de Lavar", emoji:"🫧", star:"4.4", bg:"#EDE7F6", accent:"#6A1B9A", grad:"linear-gradient(135deg,#4A148C,#7B1FA2)", desc:"Conserto e manutenção"},
  { id:"tv",           label:"Instal. TV/Suporte", emoji:"📺", star:"4.6", bg:"#E1F5FE", accent:"#0277BD", grad:"linear-gradient(135deg,#01579B,#0288D1)", desc:"TVs e suportes"       },
  { id:"montador",     label:"Montador de Móveis", emoji:"🪛", star:"4.7", bg:"#FBE9E7", accent:"#BF360C", grad:"linear-gradient(135deg,#BF360C,#E64A19)", desc:"Montagem e desmontagem"},
  { id:"estofados",    label:"Higien. Estofados",  emoji:"🛋️", star:"4.8", bg:"#F3E5F5", accent:"#6A1B9A", grad:"linear-gradient(135deg,#880E4F,#C2185B)", desc:"Sofás e colchões"    },
];

function ClientHome({ onPost, onViewService, onSwitchPro, myServices, userName }) {
  const greeting     = userName ? `Olá, ${userName}! 👋` : "Olá! Seja bem-vindo 👋";
  const subgreeting  = userName ? "O que vamos resolver hoje?" : "Vamos resolver algo hoje?";

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#F8F9FA", minHeight:"100vh", paddingBottom:120 }}>

      {/* ── WARM GREETING ROW ── */}
      <div style={{ padding:"22px 20px 0" }}>
        <p style={{ fontSize:13, color:"#888", fontWeight:600, margin:"0 0 3px" }}>{greeting}</p>
        <h2 style={{ fontSize:22, fontWeight:900, color:"#1a1a2e", lineHeight:1.3, margin:0 }}>{subgreeting}</h2>
      </div>

      {/* ── HERO BANNER ── */}
      <div style={{ margin:"20px 20px 0", borderRadius:28, overflow:"hidden", height:176, position:"relative", boxShadow:"0 12px 36px rgba(0,0,0,.18)" }}>
        {/* layered illustrated background */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(140deg,#0d2d6e 0%,#1a56c4 55%,#6c3fc2 100%)" }} />
        {/* decorative circles */}
        <div style={{ position:"absolute", top:-30, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.06)" }} />
        <div style={{ position:"absolute", bottom:-40, right:40, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.05)" }} />
        <div style={{ position:"absolute", top:16, right:16, opacity:.28, fontSize:56, lineHeight:1 }}>🏠</div>
        <div style={{ position:"absolute", bottom:14, right:22, opacity:.40, fontSize:34 }}>✨</div>
        <div style={{ position:"absolute", bottom:20, right:70, opacity:.35, fontSize:28 }}>🖌️</div>
        {/* content */}
        <div style={{ position:"relative", zIndex:1, padding:"26px 24px", height:"100%", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.65)", textTransform:"uppercase", letterSpacing:2, margin:"0 0 8px" }}>Multi · Serviços Premium</p>
          <h3 style={{ fontSize:21, fontWeight:900, color:"white", lineHeight:1.35, margin:"0 0 16px" }}>Sua casa em boas<br/>mãos, num toque.</h3>
          <button onClick={onPost} style={{
            alignSelf:"flex-start", padding:"10px 20px", borderRadius:99,
            background:"rgba(255,255,255,.95)", border:"none", cursor:"pointer",
            color:"#1565C0", fontWeight:900, fontSize:13,
            display:"flex", alignItems:"center", gap:7,
            boxShadow:"0 4px 16px rgba(0,0,0,.22)",
          }}>
            <Plus size={15} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* ── CATEGORIES SECTION ── */}
      <div style={{ padding:"30px 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"0 20px" }}>
          <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:0 }}>Categorias</h3>
          <span style={{ fontSize:11, color:"#aaa", fontWeight:700 }}>{HOME_CATS.length} serviços</span>
        </div>

        {/* ── First 4 as featured 2x2 grid ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"0 20px", marginBottom:16 }}>
          {HOME_CATS.slice(0, 4).map(cat => (
            <button key={cat.id} onClick={onPost} style={{
              background:"white", borderRadius:22, overflow:"hidden",
              border:"1px solid #F0F2F5", cursor:"pointer", textAlign:"left",
              boxShadow:"0 3px 14px rgba(0,0,0,.07)", padding:0,
            }}>
              <div style={{ background:cat.grad, padding:"16px 14px 12px", display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                <span style={{ fontSize:32, lineHeight:1 }}>{cat.emoji}</span>
                <div style={{ display:"flex", alignItems:"center", gap:3, background:"rgba(255,255,255,.22)", borderRadius:99, padding:"3px 9px" }}>
                  <Star size={11} fill="white" stroke="none" />
                  <span style={{ fontSize:11, fontWeight:800, color:"white" }}>{cat.star}</span>
                </div>
              </div>
              <div style={{ padding:"11px 14px 14px" }}>
                <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px", lineHeight:1.25 }}>{cat.label}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{cat.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Remaining 9 as horizontal scroll chips ── */}
        <div>
          <p style={{ fontSize:12, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 12px", padding:"0 20px" }}>Mais serviços</p>
          <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"4px 20px 12px", scrollbarWidth:"none" }}>
            {HOME_CATS.slice(4).map(cat => (
              <button key={cat.id} onClick={onPost} style={{
                flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                background:"white", borderRadius:18, padding:"14px 14px 12px",
                border:"1px solid #F0F2F5", cursor:"pointer",
                boxShadow:"0 2px 10px rgba(0,0,0,.06)", width:88,
              }}>
                <div style={{ width:44, height:44, borderRadius:14, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                  {cat.emoji}
                </div>
                <p style={{ fontSize:11, fontWeight:800, color:"#1a1a2e", margin:0, textAlign:"center", lineHeight:1.3 }}>{cat.label}</p>
                <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                  <Star size={9} fill="#F9A825" stroke="none" />
                  <span style={{ fontSize:10, fontWeight:700, color:"#aaa" }}>{cat.star}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACTIVE ORDERS ── */}
      {myServices.length > 0 && (
        <div style={{ padding:"30px 20px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:0 }}>Meus Pedidos</h3>
            <button onClick={onViewService} style={{ fontSize:12, fontWeight:700, color:B, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:2 }}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {myServices.slice(0, 3).map(s => {
              const cat = CATS.find(c => c.id === s.cat);
              const statusColor = s.status === "open" ? B : s.status === "inprogress" ? O : G;
              const statusLabel = s.status === "open" ? "Aguardando" : s.status === "inprogress" ? "Em andamento" : "Concluído";
              return (
                <div key={s.id} onClick={() => onViewService(s)} style={{
                  background:"white", borderRadius:20, padding:"14px 16px",
                  boxShadow:"0 3px 14px rgba(0,0,0,.07)", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:13,
                  border:"1px solid #F0F2F5",
                }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:cat?.bg || "#F0F0F0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                    {cat?.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", margin:"0 0 5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:99, background:statusColor+"18", color:statusColor }}>{statusLabel}</span>
                      {s.candidates > 0 && <span style={{ fontSize:11, color:"#bbb" }}>{s.candidates} candidatos</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <p style={{ fontSize:15, fontWeight:900, color:B, margin:0 }}>R$ {s.value}</p>
                    <p style={{ fontSize:10, color:"#bbb", margin:"2px 0 0" }}>{s.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TRUST STRIP ── */}
      <div style={{ margin:"28px 20px 0", borderRadius:20, background:"white", padding:"16px 20px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", border:"1px solid #F0F2F5" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-around" }}>
          {[
            { val:"12k+", lbl:"Profissionais" },
            { val:"98%",  lbl:"Satisfação" },
            { val:"4,9★", lbl:"Avaliação" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign:"center", flex:1, borderRight: i < 2 ? "1px solid #F0F2F5" : "none" }}>
              <p style={{ fontSize:18, fontWeight:900, color:B, margin:0 }}>{item.val}</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 0" }}>{item.lbl}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ───────────────────────── POST SERVICE SCREEN ──────────────────────────────── */
function PostServiceScreen({ onBack, onSuccess }) {
  const [form,       setForm]       = useState({ cat:"", desc:"", value:"", cep:"", material: false, urgent:"normal", scheduledDate:"" });
  const [photos,     setPhotos]     = useState([]);
  const [cepInfo,    setCepInfo]    = useState(null);  // { bairro, cidade, uf }
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError,   setCepError]   = useState("");
  const inputRef = useRef(null);

  const handleFiles = e => {
    Array.from(e.target.files).forEach(f => {
      if (!f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = ev => setPhotos(p => [...p, { id:`${Date.now()}-${Math.random()}`, url:ev.target.result }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const handleCepChange = async (raw) => {
    const cep = raw.replace(/\D/g,"").slice(0,8);
    // format as 00000-000
    const formatted = cep.length > 5 ? cep.slice(0,5) + "-" + cep.slice(5) : cep;
    setForm(f => ({ ...f, cep: formatted }));
    setCepError("");
    setCepInfo(null);
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if (d.erro) { setCepError("CEP não encontrado"); }
        else { setCepInfo({ bairro: d.bairro, cidade: d.localidade, uf: d.uf, logradouro: d.logradouro }); }
      } catch { setCepError("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  const F = { background:"white", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"13px 14px", fontSize:13, color:"#1a1a2e", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const L = { display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 };

  const canPublish = form.cat && form.desc && form.value && cepInfo;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:"18px 16px 40px" }}>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:0 }}>Novo Serviço</h2>

      {/* Categoria */}
      <div>
        <label style={L}>Categoria</label>
        <div style={{ position:"relative" }}>
          <select style={{ ...F, paddingRight:36, appearance:"none", cursor:"pointer" }} value={form.cat} onChange={e => setForm({ ...form, cat:e.target.value })}>
            <option value="">Selecione...</option>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <ChevronDown size={14} color="#aaa" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label style={L}>Descrição do problema</label>
        <textarea rows={4} placeholder="Seja detalhado sobre o que precisa…" style={{ ...F, resize:"none", lineHeight:1.6 }} value={form.desc} onChange={e => setForm({ ...form, desc:e.target.value })} />
      </div>

      {/* CEP */}
      <div>
        <label style={L}>CEP do local do serviço</label>
        <div style={{ position:"relative" }}>
          <input
            type="tel"
            placeholder="00000-000"
            maxLength={9}
            value={form.cep}
            onChange={e => handleCepChange(e.target.value)}
            style={{ ...F, paddingRight: cepLoading ? 40 : 14 }}
          />
          {cepLoading && (
            <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, border:"2px solid #E5E7EB", borderTopColor:B, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
          )}
        </div>

        {/* CEP info — mostra bairro/cidade mas NÃO endereço completo */}
        {cepInfo && (
          <div style={{ marginTop:8, padding:"10px 14px", borderRadius:12, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"center", gap:10 }}>
            <MapPin size={14} color={G} style={{ flexShrink:0 }} />
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:"0 0 2px" }}>
                {cepInfo.bairro ? `${cepInfo.bairro} — ` : ""}{cepInfo.cidade}/{cepInfo.uf}
              </p>
              <p style={{ fontSize:11, color:"#16a34a", margin:0 }}>
                🔒 Endereço completo só liberado após acordo com profissional
              </p>
            </div>
          </div>
        )}
        {cepError && <p style={{ fontSize:12, color:"#EF4444", fontWeight:700, margin:"6px 0 0" }}>{cepError}</p>}
      </div>

              
        {/* Endereco completo - so aparece apos CEP valido */}
        {cepInfo && (
          <div style={{marginBottom:18}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'8px 12px',background:'#FFF8E1',borderRadius:8,border:'1px solid #FFE082'}}>
              <span style={{fontSize:13}}>🔒</span>
              <span style={{fontSize:11,color:'#F57F17',fontWeight:600}}>No mural, os profissionais verao apenas o bairro e cidade. O endereco completo so e liberado apos ambos confirmarem o servico.</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,marginBottom:8}}>
              <div><label style={{display:'block',fontSize:10,fontWeight:800,color:'#aaa',textTransform:'uppercase',letterSpacing:1.2,marginBottom:4}}>RUA / LOGRADOURO</label><input placeholder='Ex: Rua das Flores' value={form.rua||''} onChange={e=>setForm({...form,rua:e.target.value})} style={{...F,width:'100%',boxSizing:'border-box'}} /></div>
              <div style={{width:80}}><label style={{display:'block',fontSize:10,fontWeight:800,color:'#aaa',textTransform:'uppercase',letterSpacing:1.2,marginBottom:4}}>NUMERO</label><input placeholder='123' value={form.numero||''} onChange={e=>setForm({...form,numero:e.target.value})} style={{...F,width:'100%',boxSizing:'border-box'}} /></div>
            </div>
            <div><label style={{display:'block',fontSize:10,fontWeight:800,color:'#aaa',textTransform:'uppercase',letterSpacing:1.2,marginBottom:4}}>COMPLEMENTO (opcional)</label><input placeholder='Apto, bloco, ref...' value={form.complemento||''} onChange={e=>setForm({...form,complemento:e.target.value})} style={{...F,width:'100%',boxSizing:'border-box'}} /></div>
          </div>
        )}
{/* Urgência */}
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#aaa', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6 }}>URGÊNCIA</label>
                <div style={{ display:'flex', gap:8 }}>
                  {['normal','urgente','muito urgente'].map(u => (
                    <button key={u} onClick={()=>setForm({...form, urgent:u})} style={{ flex:1, padding:'10px 0', borderRadius:10, border: form.urgent===u ? '2px solid #FF5722' : '1.5px solid #E5E7EB', background: form.urgent===u ? '#FFF3F0' : 'white', color: form.urgent===u ? '#FF5722' : '#555', fontWeight: form.urgent===u ? 800 : 500, fontSize:12, cursor:'pointer', textTransform:'capitalize' }}>
                      {u==='normal'?'🟢':u==='urgente'?'🟡':'🔴'} {u.charAt(0).toUpperCase()+u.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Data preferida */}
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#aaa', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6 }}>QUANDO VOCÊ PRECISA?</label>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  {['Hoje','Amanhã','Esta semana','Flexível'].map(op => (
                    <button key={op} onClick={()=>setForm({...form, scheduledDate:op})} style={{ flex:1, padding:'9px 4px', borderRadius:10, border: form.scheduledDate===op ? '2px solid #007BFF' : '1.5px solid #E5E7EB', background: form.scheduledDate===op ? '#EEF4FF' : 'white', color: form.scheduledDate===op ? '#007BFF' : '#555', fontWeight: form.scheduledDate===op ? 800 : 500, fontSize:11, cursor:'pointer' }}>
                      {op}
                    </button>
                  ))}
                </div>
                <input type='text' style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid #EBEBEB', fontSize:13, color:'#1a1a2e', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} value={['Hoje','Amanhã','Esta semana','Flexível'].includes(form.scheduledDate)?'':form.scheduledDate} onChange={e=>setForm({...form, scheduledDate:e.target.value})} placeholder='Ex: 20/05/2026 às 14h' />
              </div>
      {/* Fotos */}
      <div>
        <label style={L}>Fotos <span style={{ textTransform:"none", fontWeight:400, letterSpacing:0, color:"#ccc" }}>(opcional)</span></label>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {photos.map(p => (
            <div key={p.id} style={{ width:72, height:72, borderRadius:12, overflow:"hidden", position:"relative", boxShadow:"0 2px 8px rgba(0,0,0,.12)", flexShrink:0 }}>
              <img src={p.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
              <button onClick={() => setPhotos(prev => prev.filter(x => x.id !== p.id))} style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,.55)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={10} color="white" />
              </button>
            </div>
          ))}
          <button onClick={() => inputRef.current?.click()} style={{ width:72, height:72, borderRadius:12, border:"2px dashed #DDDEE4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, color:"#ccc", background:"white", cursor:"pointer", flexShrink:0 }}>
            <Camera size={18} /><span style={{ fontSize:10, fontWeight:600 }}>Adicionar</span>
          </button>
        </div>
      </div>

      {/* Material */}
      <div>
        <label style={L}>Material necessário</label>
        <div style={{ background:"white", border:"1.5px solid #EBEBEB", borderRadius:14, overflow:"hidden" }}>
          {[
            { val: false, icon:"🧰", label:"Não precisa de material",   sub:"O profissional só precisa trazer ferramentas" },
            { val: true,  icon:"🪣", label:"Profissional traz material", sub:"Ex: tinta, cano, cimento, peças de reposição" },
          ].map((opt, i) => (
            <div
              key={i}
              onClick={() => setForm(f => ({ ...f, material: opt.val }))}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", cursor:"pointer", borderBottom: i === 0 ? "1px solid #F0F0F0" : "none", background: form.material === opt.val ? "#EBF4FF" : "white", transition:"background .15s" }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{opt.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 2px" }}>{opt.label}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{opt.sub}</p>
              </div>
              <div style={{ width:20, height:20, borderRadius:"50%", border:(form.material===opt.val?"2px solid "+B:"2px solid #D1D5DB"), background: form.material === opt.val ? B : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                {form.material === opt.val && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Valor */}
      <div>
        <label style={L}>Valor que posso pagar</label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"#999", fontSize:13 }}>R$</span>
          <input type="number" placeholder="0,00" style={{ ...F, paddingLeft:38 }} value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} />
        </div>
      </div>

      <button
        onClick={() => { if (canPublish) onSuccess({ cat:form.cat, desc:form.desc, value:Number(form.value), cep:form.cep, cepInfo, material:form.material }); }}
        style={{ padding:"15px 0", borderRadius:14, border:"none", cursor: canPublish ? "pointer" : "not-allowed", background: canPublish ? `linear-gradient(135deg,${O},#E64A19)` : "#E5E7EB", color: canPublish ? "white" : "#9CA3AF", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: canPublish ? "0 5px 18px rgba(255,87,34,.30)" : "none", transition:"all .2s" }}>
        <Send size={15} /> Publicar Serviço
      </button>
    </div>
  );
}

/* ───────────────────────── SERVICE DETAIL CLIENT ──────────────────────────── */
/* ───────────────────────── SERVICE STATUS STEPPER ──────────────────────────── */

// Map service.status to a phase number 0-3
function statusToPhase(status) {
  if (status === "open")       return 0;
  if (status === "inprogress") return 1;
  if (status === "executing")  return 2;
  if (status === "done")       return 3;
  return 0;
}

// Generate a deterministic 4-digit PIN from service id
function generatePin(serviceId) {
  const seed = String(serviceId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return String((seed * 7919) % 10000).padStart(4, "0");
}

const PHASES = [
  { icon:"🔍", label:"Buscando",        sub:"Aguardando profissional",   color:"#6366F1" },
  { icon:"🤝", label:"Acordo Fechado",  sub:"Profissional confirmado",    color:B         },
  { icon:"🛠️", label:"Em Execução",     sub:"Profissional no local",      color:O         },
  { icon:"✅", label:"Concluído & Pago", sub:"Serviço finalizado",         color:G         },
];

function ServiceStatusStepper({ phase }) {
  return (
    <div style={{ padding:"4px 0 8px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", position:"relative" }}>
        {/* connecting line */}
        <div style={{ position:"absolute", top:16, left:16, right:16, height:2, background:"#E5E7EB", zIndex:0 }} />
        <div style={{ position:"absolute", top:16, left:16, height:2, zIndex:1, transition:"width .5s", background: phase === 0 ? "#6366F1" : phase === 1 ? B : phase === 2 ? O : G, width: `${(phase / 3) * (100 - 16)}%` }} />

        {PHASES.map((p, i) => {
          const done    = i < phase;
          const active  = i === phase;
          const pending = i > phase;
          const col     = done || active ? p.color : "#D1D5DB";
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6, position:"relative", zIndex:2 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: done ? p.color : active ? "white" : "#F3F4F6",
                border: `2px solid ${col}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: done ? 14 : 16,
                boxShadow: active ? `0 0 0 4px ${p.color}22` : "none",
                transition:"all .3s",
              }}>
                {done ? <Check size={14} color="white" /> : <span style={{ fontSize:13 }}>{p.icon}</span>}
              </div>
              <div style={{ textAlign:"center" }}>
                <p style={{ fontSize:10, fontWeight: active ? 900 : 700, color: pending ? "#9CA3AF" : "#1a1a2e", margin:0, lineHeight:1.2 }}>{p.label}</p>
                {active && <p style={{ fontSize:9, color: p.color, fontWeight:700, margin:"2px 0 0" }}>{p.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── SERVICE DETAIL — CLIENT VIEW ─────────────────────── */
function ServiceDetailClient({ service, onBack, onStatusChange, showToast }) {
  const [phase,      setPhase]      = useState(statusToPhase(service.status));
  const [rating,     setRating]     = useState(0);
  const [rated,      setRated]      = useState(service.clientRating > 0);
  const [showSOS,    setShowSOS]    = useState(false);
  const [released,   setReleased]   = useState(service.status === "done");
  const cat  = CATS.find(c => c.id === service.cat);
  const pin  = generatePin(service.id);

  const phaseColors = ["#6366F1", B, O, G];
  const currentColor = phaseColors[phase];

  // Simulate pro arriving (demo button)
  const simulateProArrival = () => {
    setPhase(2);
    showToast?.("🛠️ Status atualizado: O profissional está no local!", O);
    onStatusChange?.(service.id, "executing");
  };

  const releasePayment = () => {
    setReleased(true);
    setPhase(3);
    showToast?.("✅ Pagamento liberado! Serviço concluído com sucesso.", G);
    onStatusChange?.(service.id, "done");
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px 16px 60px", background:"#F8F9FA", minHeight:"100vh" }}>
      <BackBtn onClick={onBack} />

      {/* ── SERVICE HEADER ── */}
      <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{cat?.emoji}</div>
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 4px" }}>{service.title}</h2>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, fontWeight:800, color:currentColor, background:currentColor+"18", padding:"2px 8px", borderRadius:99 }}>
                {PHASES[phase].label}
              </span>
              <span style={{ fontSize:11, color:"#aaa" }}>R$ {service.value}</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize:12, color:"#888", lineHeight:1.5, margin:0 }}>{service.desc}</p>
      </div>

      {/* ── STEPPER ── */}
      <div style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
        <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e", margin:"0 0 14px" }}>Progresso do Serviço</p>
        <ServiceStatusStepper phase={phase} />
      </div>

      {/* ── CUSTODY CARD (phases 1–3) ── */}
      {phase >= 1 && !released && (
        <div style={{ borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(0,0,0,.10)" }}>
          {/* header */}
          <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", padding:"14px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Shield size={18} color="#4ade80" />
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:"white", margin:0 }}>Pagamento em Custódia</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.55)", margin:0 }}>Garantia Multi</p>
            </div>
            <span style={{ marginLeft:"auto", fontSize:16, fontWeight:900, color:"#4ade80" }}>R$ {service.proposalValue || service.value}</span>
          </div>

          {/* body */}
          <div style={{ background:"white", padding:"14px 16px" }}>
            <p style={{ fontSize:12, color:"#555", lineHeight:1.6, margin:"0 0 14px" }}>
              💡 Seu pagamento está <strong style={{ color:"#1a1a2e" }}>seguro com o Multi</strong>. Só libere o codigo após o término do serviço.
            </p>

            {/* PIN display */}
            <div style={{ background:"#F8F9FA", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", border:"1.5px dashed #E5E7EB" }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 4px" }}>Codigo de Liberação</p>
                <div style={{ display:"flex", gap:8 }}>
                  {pin.split("").map((d, i) => (
                    <div key={i} style={{ width:36, height:44, borderRadius:10, background:"white", border:`2px solid ${G}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#1a1a2e", boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
                      {phase >= 2 ? d : "•"}
                    </div>
                  ))}
                </div>
                {phase < 2 && <p style={{ fontSize:10, color:"#aaa", margin:"6px 0 0" }}>Liberado quando o profissional chegar</p>}
              </div>
              {phase >= 2 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <KeyRound size={20} color={G} />
                  <span style={{ fontSize:10, fontWeight:800, color:G }}>Ativo</span>
                </div>
              )}
            </div>

            {/* Release button — only when executing */}
            {phase === 2 && (
              <button onClick={releasePayment} style={{ marginTop:14, width:"100%", padding:"14px 0", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:`0 5px 18px ${G}44` }}>
                <Check size={17} /> Liberar Pagamento & Finalizar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PROFESSIONAL INFO (phase 1+) ── */}
      {phase >= 1 && service.pro && (
        <div style={{ background:"white", borderRadius:20, padding:"14px 16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          <p style={{ fontSize:11, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>Profissional Contratado</p>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>👨‍🔧</div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:900, fontSize:14, color:"#1a1a2e", margin:"0 0 3px" }}>{service.pro}</p>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <MiniStars v={service.proRating || 4.8} size={12} />
                <span style={{ fontSize:11, color:"#aaa" }}>{service.proRating || 4.8}</span>
              </div>
            </div>
            {/* phone unlock when executing/done */}
            {phase >= 2 && (
              <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"6px 10px", textAlign:"right" }}>
                <p style={{ fontSize:9, color:G, fontWeight:700, margin:0 }}>Contato</p>
                <p style={{ fontSize:12, fontWeight:900, color:"#166534", margin:0 }}>📱 (11) 9 8765</p>
              </div>
            )}
          </div>

          {/* simulate arrival button — demo only, phase 1 */}
          {phase === 1 && (
            <button onClick={simulateProArrival} style={{ marginTop:12, width:"100%", padding:"11px 0", borderRadius:12, border:`1.5px solid ${O}`, background:"white", color:O, fontWeight:800, fontSize:13, cursor:"pointer" }}>
              🛠️ Simular: Profissional chegou
            </button>
          )}
        </div>
      )}

      {/* ── SOS BUTTON (phase 2 only) ── */}
      {phase === 2 && (
        <div>
          {!showSOS ? (
            <button onClick={() => setShowSOS(true)} style={{ width:"100%", padding:"12px 0", borderRadius:14, border:"1.5px solid #FECACA", background:"#FFF5F5", color:"#DC2626", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <AlertCircle size={16} /> Suporte / Ajuda de Emergência
            </button>
          ) : (
            <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)", border:"1.5px solid #FECACA" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <AlertCircle size={20} color="#DC2626" />
                <p style={{ fontSize:14, fontWeight:900, color:"#DC2626", margin:0 }}>Central de Emergência Multi</p>
              </div>
              <p style={{ fontSize:12, color:"#555", lineHeight:1.6, margin:"0 0 14px" }}>
                Nossa equipe está de sobreaviso. Se sentir qualquer insegurança, acione o suporte imediatamente.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button style={{ padding:"12px 0", borderRadius:12, border:"none", background:"#DC2626", color:"white", fontWeight:900, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  📞 Ligar Suporte
                </button>
                <button style={{ padding:"12px 0", borderRadius:12, border:"none", background:"#1a1a2e", color:"white", fontWeight:900, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  💬 Chat Urgente
                </button>
              </div>
              <button onClick={() => setShowSOS(false)} style={{ marginTop:10, width:"100%", padding:"10px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                Estou bem, cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RATING (done) ── */}
      {phase === 3 && (
        <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          <h3 style={{ fontWeight:900, color:"#1a1a2e", marginBottom:10, fontSize:14 }}>Avalie o Serviço</h3>
          {!rated ? (
            <>
              <p style={{ fontSize:12, color:"#aaa", marginBottom:12 }}>Como foi o atendimento?</p>
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={32} fill={rating >= s ? O : "none"} stroke={rating >= s ? O : "#ddd"} style={{ cursor:"pointer" }} onClick={() => setRating(s)} />)}
              </div>
              {rating > 0 && <button onClick={() => setRated(true)} style={{ width:"100%", padding:"13px 0", borderRadius:12, fontWeight:900, color:"white", fontSize:13, background:`linear-gradient(135deg,${O},#E64A19)`, border:"none", cursor:"pointer" }}>Enviar Avaliação ⭐</button>}
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"8px 0" }}>
              <div style={{ width:50, height:50, borderRadius:"50%", background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={24} color="#16a34a" /></div>
              <p style={{ fontWeight:800, color:"#1a1a2e" }}>Avaliação enviada!</p>
              <MiniStars v={rating} size={18} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── SERVICE DETAIL — PROFESSIONAL PIN ENTRY ──────────── */
function ServiceDetailPinEntry({ service, onBack, onStatusChange, showToast }) {
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const pin = generatePin(service.id);
  const phase = statusToPhase(service.status);

  const handleDigit = (d) => {
    if (enteredPin.length >= 4) return;
    const next = enteredPin + d;
    setEnteredPin(next);
    setPinError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === pin) {
          setConfirmed(true);
          showToast?.("✅ PIN correto! Serviço finalizado. Pagamento liberado!", G);
          onStatusChange?.(service.id, "done");
        } else {
          setPinError(true);
          setEnteredPin("");
        }
      }, 200);
    }
  };

  const cat = CATS.find(c => c.id === service.cat);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px 16px 60px", background:"#F8F9FA", minHeight:"100vh" }}>
      <BackBtn onClick={onBack} />

      {/* service summary */}
      <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:46, height:46, borderRadius:14, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{cat?.emoji}</div>
        <div>
          <p style={{ fontWeight:900, fontSize:14, color:"#1a1a2e", margin:"0 0 3px" }}>{service.title}</p>
          <p style={{ fontSize:12, color:"#aaa", margin:0 }}>R$ {service.proposalValue || service.value} · {service.loc || "Sua região"}</p>
        </div>
      </div>

      {/* stepper */}
      <div style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
        <ServiceStatusStepper phase={phase >= 2 ? phase : 2} />
      </div>

      {!confirmed ? (
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(0,0,0,.10)" }}>
          <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", padding:"16px", display:"flex", alignItems:"center", gap:10 }}>
            <KeyRound size={20} color={O} />
            <div>
              <p style={{ fontSize:14, fontWeight:900, color:"white", margin:0 }}>Inserir Codigo do Cliente</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.55)", margin:0 }}>Digite o PIN de 4 dígitos para liberar o pagamento</p>
            </div>
          </div>
          <div style={{ padding:"20px 16px" }}>
            {/* PIN display */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:24 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width:52, height:60, borderRadius:14, border:`2px solid ${pinError ? "#EF4444" : i < enteredPin.length ? G : "#E5E7EB"}`, background: i < enteredPin.length ? G+"12" : "#F8F9FA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:900, color: pinError ? "#EF4444" : "#1a1a2e", transition:"all .15s" }}>
                  {i < enteredPin.length ? "●" : ""}
                </div>
              ))}
            </div>
            {pinError && <p style={{ textAlign:"center", color:"#EF4444", fontWeight:800, fontSize:13, marginBottom:16 }}>PIN incorreto. Tente novamente.</p>}

            {/* numpad */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                <button key={i} onClick={() => { if (d === "⌫") { setEnteredPin(p => p.slice(0,-1)); setPinError(false); } else if (d) handleDigit(d); }} style={{ padding:"16px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background: d === "⌫" ? "#FFF5F5" : "white", color: d === "⌫" ? "#EF4444" : "#1a1a2e", fontWeight:900, fontSize:20, cursor: d ? "pointer" : "default", boxShadow:"0 1px 4px rgba(0,0,0,.06)", transition:"transform .1s", visibility: d === "" ? "hidden" : "visible" }} >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background:"white", borderRadius:20, padding:"28px 20px", textAlign:"center", boxShadow:"0 4px 18px rgba(0,0,0,.10)" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 6px 20px ${G}44` }}>
            <Check size={36} color="white" strokeWidth={3} />
          </div>
          <h3 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Serviço Finalizado!</h3>
          <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.6, margin:"0 0 20px" }}>
            Pagamento de <strong style={{ color:G }}>R$ {service.proposalValue || service.value}</strong><br/>liberado e em processamento.
          </p>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {[B, O, G, "#F9A825"].map((c, i) => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── PROFESSIONAL FEED ────────────────────────────────── */
function ProfessionalFeed({ onViewService, isPro, feedServices, embedded = false }) {
  const [applied,  setApplied]  = useState([]);
  const [filter,   setFilter]   = useState("all");
  const [modal,    setModal]    = useState(null); // service being proposed
  const [proposals,setProposals]= useState({});   // serviceId -> true

  const list = filter === "all" ? feedServices : feedServices.filter(s => s.cat === filter);

  const handleInterest = (e, service) => {
    e.stopPropagation();
    if (!isPro) { onViewService({ _upgrade:true }); return; }
    setModal(service);
  };

  const handleSendProposal = (proposal) => {
    setProposals(p => ({ ...p, [proposal.serviceId]: true }));
    setApplied(a => [...a, proposal.serviceId]);
    // bubble up to parent to create notification
    onViewService({ _notify: proposal });
  };

  return (
    <>
      {modal && <ProposalModal service={modal} onClose={() => setModal(null)} onSend={p => { handleSendProposal(p); setModal(null); }} />}

      <div style={{ display:"flex", flexDirection:"column", gap:0, paddingBottom: embedded ? 0 : 32 }}>
        {!isPro && !embedded && (
          <div style={{ margin:"16px 16px 0", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, background:`linear-gradient(135deg,${O},#c0392b)`, cursor:"pointer" }} onClick={() => onViewService({ _upgrade:true })}>
            <Crown size={22} color="white" style={{ flexShrink:0 }} />
            <div>
              <p style={{ fontWeight:900, fontSize:13, color:"white", marginBottom:1 }}>Seja PRO e veja o contato!</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.7)" }}>Desbloqueie mais oportunidades agora.</p>
            </div>
          </div>
        )}

        {!embedded && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"16px 16px 0", scrollbarWidth:"none" }}>
          {[{ id:"all", label:"Todos" }, ...CATS].map(c => (
            <button key={c.id} onClick={() => setFilter(c.id)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", background: filter === c.id ? B : "white", color: filter === c.id ? "white" : "#888", boxShadow: filter === c.id ? "0 2px 10px rgba(0,112,255,.25)" : "0 1px 4px rgba(0,0,0,.07)" }}>
              {c.emoji ? `${c.emoji} ${c.label}` : c.label}
            </button>
          ))}
        </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:12, padding:"14px 16px 0" }}>
          {list.map(s => {
            const isApplied = applied.includes(s.id);
            const cat = CATS.find(c => c.id === s.cat);
            return (
              <div key={s.id} style={{
                background:"white", borderRadius:16,
                border:"1px solid #EEEEF2",
                boxShadow:"0 2px 10px rgba(0,0,0,.06)",
                padding:"16px",
                display:"flex", flexDirection:"column", gap:10,
              }}>

                {/* ROW 1 — icon + title + urgent badge */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {cat?.emoji}
                    </div>
                    <span style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", lineHeight:1.35 }}>{s.title}</span>
                  </div>
                  {s.urgent && <Pill color="#E53935" sm>🔥 Urgente</Pill>}
                </div>

                {/* ROW 2 — description */}
                <p style={{ fontSize:13, color:"#888", lineHeight:1.6, margin:0 }}>{s.desc}</p>

                {/* ROW 3 — location + time */}
                <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:11, color:"#bbb" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} />{s.loc}</span>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}><Clock size={11} />{s.time}</span>
                </div>

                {/* ROW 4 — value */}
                <div style={{ borderTop:"1px solid #F4F4F6", paddingTop:10 }}>
                  <span style={{ fontSize:22, fontWeight:900, color:B }}>R$ {s.value}</span>
                </div>

                {/* ROW 5 — action button (always visible, right-aligned) */}
                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button
                    onClick={e => handleInterest(e, s)}
                    disabled={isApplied}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      padding:"9px 18px", borderRadius:10,
                      fontSize:13, fontWeight:800, border:"none",
                      cursor: isApplied ? "default" : "pointer",
                      background: isApplied ? "#DCFCE7" : `linear-gradient(135deg,${O},#E64A19)`,
                      color: isApplied ? "#16a34a" : "white",
                      boxShadow: isApplied ? "none" : "0 3px 10px rgba(255,87,34,.28)",
                    }}>
                    {isApplied ? <><Check size={13} /> Proposta Enviada</> : "Tenho Interesse"}
                  </button>
                </div>

                {/* ROW 6 — subtle pro lock notice (only for non-pro, below everything) */}
                {!isPro && (
                  <div
                    onClick={() => onViewService({ _upgrade:true })}
                    style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"9px 12px", borderRadius:10,
                      background:"#FFF6F2", border:"1px solid #FFD8C8",
                      cursor:"pointer",
                    }}>
                    <Lock size={13} color={O} style={{ flexShrink:0 }} />
                    <span style={{ fontSize:12, color:"#C44B00", fontWeight:700, flex:1 }}>
                      Assine o Multi Pro para ver o contato do cliente
                    </span>
                    <ChevronRight size={13} color="#E08060" style={{ flexShrink:0 }} />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── SERVICE DETAIL PRO ───────────────────────────────── */
function ServiceDetailPro({ service, onBack, isPro, onUpgrade, onOpenPinEntry }) {
  const cat   = CATS.find(c => c.id === service.cat);
  const phase = statusToPhase(service.status);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px 16px 40px" }}>
      <BackBtn onClick={onBack} />
      <div style={{ borderRadius:20, padding:20, color:"white", background:`linear-gradient(135deg,${cat?.dot ?? B},${cat?.dot ?? B}bb)`, boxShadow:"0 6px 18px rgba(0,0,0,.13)" }}>
        <p style={{ fontSize:11, color:"rgba(255,255,255,.65)", marginBottom:4 }}>{cat?.label}</p>
        <h2 style={{ fontSize:18, fontWeight:900, marginBottom:8 }}>{service.title}</h2>
        <span style={{ fontSize:28, fontWeight:900 }}>R$ {service.value}</span>
      </div>

      {/* Stepper for in-progress jobs */}
      {phase >= 1 && (
        <div style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e", margin:"0 0 14px" }}>Progresso do Job</p>
          <ServiceStatusStepper phase={phase} />
        </div>
      )}

      <Card><p style={{ fontWeight:800, color:"#1a1a2e", marginBottom:8, fontSize:13 }}>Descrição</p><p style={{ fontSize:13, color:"#aaa", lineHeight:1.5 }}>{service.desc}</p></Card>

      <Card>
        <p style={{ fontWeight:800, color:"#1a1a2e", marginBottom:12, fontSize:13 }}>Cliente</p>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:B+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👤</div>
          <div>
            <p style={{ fontWeight:800, color:"#1a1a2e", marginBottom:3, fontSize:14 }}>{service.client}</p>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}><MiniStars v={Math.floor(service.rating)} /><span style={{ fontSize:11, color:"#aaa" }}>{service.rating}</span></div>
          </div>
        </div>
        {isPro ? (
          <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:12 }}>
            <p style={{ fontSize:11, fontWeight:800, color:"#166534", marginBottom:5 }}>✅ Contato desbloqueado (PRO)</p>
            <p style={{ fontSize:13, color:"#666" }}>cliente@email.com</p>
          </div>
        ) : (
          <div onClick={onUpgrade} style={{ borderRadius:12, padding:14, textAlign:"center", cursor:"pointer", background:`linear-gradient(135deg,${O},#c0392b)`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, backdropFilter:"blur(2px)", background:"rgba(255,87,34,.15)" }} />
            <div style={{ position:"relative", zIndex:1 }}>
              <Lock size={20} color="white" style={{ margin:"0 auto 6px", display:"block" }} />
              <p style={{ fontWeight:900, fontSize:13, color:"white", marginBottom:2 }}>Assine o Multi Pro para liberar este contato</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.7)" }}>A partir de R$ 29,90/mês</p>
            </div>
          </div>
        )}
      </Card>

      {/* PIN entry CTA for executing/in-progress jobs */}
      {phase >= 1 && (
        <button onClick={onOpenPinEntry} style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 5px 18px rgba(0,0,0,.2)" }}>
          <KeyRound size={18} /> Inserir Codigo do Cliente (Finalizar)
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── PRO UPGRADE ──────────────────────────────────────── */
function ProUpgrade({ onBack, onSubscribe }) {
  const [sel,          setSel]          = useState("monthly");
  const [step,         setStep]         = useState("plans"); // "plans" | "pix" | "done"
  const [seconds,      setSeconds]      = useState(1800);   // 30min real PIX
  const [copied,       setCopied]       = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [form, setForm] = useState({ label:'', number:'', expiry:'', cvv:'', cpf:'', brand:'Visa', type:'credit' });
  const [saving, setSaving] = useState(false);
  const handleCardPayment = async () => {
    setSaving(true);
    try {
      const user = safeGetUser();
      const res = await fetch(API_URL + '/api/cobrar-cartao', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email, name: user.name || form.label, phone: user.whatsapp || '', plan: chosen?.label || 'monthly', cardNumber: form.number.replace(/\s/g,''), cardHolder: form.label, expiryMonth: form.expiry.split('/')[0], expiryYear: '20'+form.expiry.split('/')[1], cvv: form.cvv, cpf: form.cpf, installments: 1 }) });
      const data = await res.json();
      if (res.ok) { showToast('Pagamento aprovado! PRO ativado!'); onSubscribe && onSubscribe(); }
      else { alert(data.error || 'Erro no pagamento'); }
    } catch(e) { alert('Erro de conexão'); }
    setSaving(false);
  };
  const [copiedPix,    setCopiedPix]    = useState(false);

  // Real PIX state
  const [pixLoading,   setPixLoading]   = useState(false);
  const [pixCode,      setPixCode]      = useState("");
  const [qrBase64,     setQrBase64]     = useState("");
  useEffect(() => { if (paymentStep === "pix" && showPaymentModal && !chatQrBase64) { setChatQrLoading(true); const sv = chat.dealValue || chat.proposalValue || "100"; fetch("https://web-production-e103b.up.railway.app/api/gerar-pix-servico", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ value: parseFloat(String(sv).replace(",",".")), name: "Cliente", email: "cliente@multi.com", phone: "11999999999" }) }).then(r => r.json()).then(d => { if (d.qrCodeBase64) { setChatQrBase64(d.qrCodeBase64); setChatQrKey(k => k+1); } }).catch(() => {}).finally(() => setChatQrLoading(false)); } }, [paymentStep, showPaymentModal]);
  const [paymentId,    setPaymentId]    = useState(null);
  const [pixError,     setPixError]     = useState("");

  const API_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "https://web-production-e103b.up.railway.app";

  const plans = [
    { id:"monthly",   label:"Mensal",     price:"29,90", period:"/mês",     badge:null,            value:29.90  },
    { id:"quarterly", label:"Trimestral", price:"79,90", period:"/3 meses", badge:"Economize 11%",  value:79.90  },
    { id:"annual",    label:"Anual",      price:"249,90",period:"/ano",     badge:"🏆 Melhor valor!", value:249.90 },
  ];
  const chosen = plans.find(p => p.id === sel);

  // Generate real PIX via Asaas
  const gerarPixServico = async () => { try { const r = await fetch("https://api.multifuncao.com.br/api/gerar-pix-servico",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({valor:serviceValue||"100",name:"Cliente",email:"cliente@multi.com",phone:"11999999999"})}); const d = await r.json(); if(d.pixCode){setPixCode(d.pixCode);setQrBase64(d.qrCodeBase64);} } catch(e){console.error(e);} };
  const gerarPixReal = async () => {
    if (!chosen) return;
    setPixLoading(true);
    setPixError("");
    try {
      // Step 1: create customer
  const userData = (() => { try { return JSON.parse(localStorage.getItem("multiSession")) || null; } catch { return null; } })();
      const custRes  = await fetch(`${API_URL}/api/criar-cliente`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: userData.name || "Cliente Multi", phone: userData.whatsapp || "11999999999", email: userData.email || "", role:"professional" }),
      });
      const custData = await custRes.json();
      if (!custData.customerId) throw new Error("Erro ao criar cliente");

      // Step 2: generate PIX
      const pixRes  = await fetch(`${API_URL}/api/gerar-pix`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ customerId: custData.customerId, plan: sel, phone: userData.whatsapp || "11999999999", name: userData.name || "", email: userData.email || "" }),
      });
      const pixData = await pixRes.json();
      if (!pixData.pixCode) throw new Error(pixData.error || "Erro ao gerar PIX");

      setPixCode(pixData.pixCode);
      setQrBase64(pixData.qrCodeBase64);
      setPaymentId(pixData.paymentId);
      setSeconds(1800);
      setStep("pix");
    } catch(e) {
      setPixError(e.message || "Erro ao gerar PIX. Tente novamente.");
    } finally {
      setPixLoading(false);
    }
  };

  // Poll payment status every 5s
  useEffect(() => {
    if (step !== "pix" || !paymentId) return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/status-pagamento/${paymentId}`);
        const d = await r.json();
        if (d.isPaid) { clearInterval(poll); setStep("done"); setTimeout(() => onSubscribe(), 2000); }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [step, paymentId]);

  // Countdown timer
  useEffect(() => {
    if (step !== "pix") return;
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, seconds]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── DONE SCREEN ── */
  if (step === "done") {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0F3460,#7C3AED)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
        <style>{`@keyframes pop-in{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}} .pop{animation:pop-in .5s ease-out forwards;}`}</style>
        <div className="pop" style={{ width:96, height:96, borderRadius:"50%", background:"linear-gradient(135deg,#F9A825,#E65100)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, boxShadow:"0 8px 32px rgba(249,168,37,.5)" }}>
          <Crown size={48} color="white" />
        </div>
        <h2 style={{ fontSize:28, fontWeight:900, color:"white", margin:"0 0 10px" }}>Você é Multi PRO!</h2>
        <p style={{ fontSize:15, color:"rgba(255,255,255,.75)", lineHeight:1.7, margin:"0 0 28px" }}>
          Pagamento confirmado. 🎉<br/>Todos os contatos foram desbloqueados.
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center", marginBottom:28 }}>
          {["✅ Contatos liberados","✅ Chat ilimitado","✅ Selo PRO","✅ Prioridade no mural"].map((b, i) => (
            <span key={i} style={{ fontSize:12, fontWeight:700, color:"white", background:"rgba(255,255,255,.15)", borderRadius:99, padding:"6px 14px" }}>{b}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {[O, G, B, "#F9A825"].map((c, i) => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
        </div>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginTop:20 }}>Redirecionando para o mural…</p>
      </div>
    );
  }

  /* ── PIX SCREEN ── */
  if (step === "pix") {
    const expired = seconds <= 0;
    return (
      <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pix-pulse{0%,100%{opacity:1}50%{opacity:.5}}
          .pix-pulse{animation:pix-pulse 1.5s ease-in-out infinite;}
        `}</style>

        {/* header */}
        <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", padding:"16px 20px 20px" }}>
          <button onClick={() => setStep("plans")} style={{ background:"rgba(255,255,255,.12)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.55)", margin:0 }}>Plano {chosen?.label}</p>
              <p style={{ fontSize:26, fontWeight:900, color:"white", margin:0 }}>R$ {chosen?.price}</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ fontSize:10, color:"rgba(255,255,255,.5)", margin:0, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Expira em</p>
              <p className={seconds < 60 ? "pix-pulse" : ""} style={{ fontSize:22, fontWeight:900, color: seconds < 60 ? "#EF4444" : G, margin:0 }}>{fmt(seconds)}</p>
            </div>
          </div>
        </div>

        <div style={{ flex:1, padding:"24px 20px 40px", display:"flex", flexDirection:"column", gap:18 }}>

          {expired ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <p style={{ fontSize:16, fontWeight:800, color:"#EF4444" }}>PIX expirado</p>
              <button onClick={() => { setSeconds(300); }} style={{ marginTop:14, padding:"12px 28px", borderRadius:12, border:"none", background:O, color:"white", fontWeight:800, cursor:"pointer" }}>
                Gerar novo PIX
              </button>
            </div>
          ) : (
            <>
              {/* QR Code — real from Asaas */}
              <div style={{ background:"white", borderRadius:20, padding:20, textAlign:"center", boxShadow:"0 3px 16px rgba(0,0,0,.09)" }}>
                <p style={{ fontSize:12, color:"#888", fontWeight:700, margin:"0 0 14px" }}>Escaneie o QR Code com o app do seu banco</p>

            <PixQRChat valor={serviceValue} />


                <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:99, padding:"5px 14px" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:G }} />
                  <span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>PIX gerado com sucesso</span>
                </div>
              </div>

              {/* Pix copy-paste code */}
              <div style={{ background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
                <p style={{ fontSize:11, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>
                  Ou copie o codigo PIX
                </p>
                <div style={{ background:"#F8F9FA", borderRadius:12, padding:"12px 14px", marginBottom:12, wordBreak:"break-all", fontSize:11, color:"#555", lineHeight:1.6, fontFamily:"monospace", border:"1px dashed #E5E7EB" }}>
                  {pixCode.slice(0, 60)}…
                </div>
                <button onClick={handleCopy} style={{ width:"100%", padding:"12px 0", borderRadius:12, border:"none", cursor:"pointer", background: copied ? G : B, color:"white", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"background .2s" }}>
                  {copied ? <><Check size={15} /> Copiado!</> : <><FileText size={15} /> Copiar codigo PIX</>}
                </button>
              </div>

              {/* Benefits reminder */}
              <div style={{ background:"linear-gradient(135deg,#7C3AED15,#4F46E515)", borderRadius:16, padding:"14px 16px", border:"1px solid #DDD6FE" }}>
                <p style={{ fontSize:12, fontWeight:900, color:"#5B21B6", margin:"0 0 8px" }}>Você está assinando:</p>
                {["Contatos desbloqueados", "Chat direto com clientes", "Selo PRO verificado", "Prioridade no mural de serviços"].map((b, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:7, marginBottom: i < 3 ? 6 : 0 }}>
                    <Check size={13} color="#7C3AED" />
                    <span style={{ fontSize:12, color:"#4C1D95", fontWeight:600 }}>{b}</span>
                  </div>
                ))}
              </div>

              {/* Simulate payment confirmed (demo button) */}
                <button onClick={() => showToast("✅ Pagamento confirmado! Ativando PRO...")} style={{ padding:"14px 0", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", color:"white", fontWeight:900, fontSize:14, boxShadow:"0 5px 18px rgba(124,58,237,.4)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <CheckCircle2 size={18} /> Já paguei — Ativar PRO
              </button>

            </>
          )}
        </div>
      </div>
    );
  }

  // plans screen (default)
  return null;
}

/* ── CHECKOUT SCREEN ── */
const CheckoutScreen = () => {
  const PIX_KEY = "contato@multifuncao.com.br";

  const handleCopyKey = function() {
    if(navigator.clipboard) navigator.clipboard.writeText(PIX_KEY);
    setCopiedPix(true);
    setTimeout(function(){ setCopiedPix(false); }, 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"white", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #EEEEF2", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
        <button onClick={onBack} style={{ background:"#F5F6FA", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
          <ArrowLeft size={18} color="#555" />
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* lock icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Finalizar Pagamento</p>
          </div>
          <p style={{ fontSize:11, color:"#22c55e", fontWeight:700, margin:0 }}>Conexão segura · SSL 256-bit</p>
        </div>
        {/* Multi logo mark */}
        <div style={{ width:34, height:34, borderRadius:10, background:B, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:16, fontWeight:900, color:"white", fontFamily:"sans-serif" }}>M</span>
        </div>
      </div>

      <div style={{ flex:1, padding:"18px 16px 40px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto" }}>

        {/* ── ORDER SUMMARY ── */}
        <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", border:"1px solid #EEEEF2" }}>
          <p style={{ fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 10px" }}>Resumo do Pedido</p>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:"#EBF4FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
              👑
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:900, color:"#1a1a2e", margin:"0 0 2px" }}>Multi PRO — {chosen?.label}</p>
              <p style={{ fontSize:12, color:"#aaa", margin:0 }}>Acesso completo à plataforma{chosen?.id !== "monthly" ? " · Melhor custo-benefício" : ""}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:20, fontWeight:900, color:B, margin:0 }}>R$ {chosen?.price}</p>
              <p style={{ fontSize:10, color:"#aaa", margin:0 }}>{chosen?.period}</p>
            </div>
          </div>

          {/* plan toggle */}
          <div style={{ display:"flex", gap:6, marginTop:12, padding:"10px", background:"#F5F6FA", borderRadius:12 }}>
            {plans.map(p => (
              <button key={p.id} onClick={() => setSel(p.id)} style={{ flex:1, padding:"8px 4px", borderRadius:8, border:"none", cursor:"pointer", fontSize:11, fontWeight:800, transition:"all .15s", background: sel === p.id ? "white" : "transparent", color: sel === p.id ? B : "#888", boxShadow: sel === p.id ? "0 1px 6px rgba(0,0,0,.1)" : "none" }}>
                {p.label}<br/>
                <span style={{ fontSize:10, fontWeight:700, color: sel === p.id ? G : "#aaa" }}>R$ {p.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, height:1, background:"#E5E7EB" }} />
          <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:700 }}>Como deseja pagar?</span>
          <div style={{ flex:1, height:1, background:"#E5E7EB" }} />
        </div>

        {/* ── PIX CARD ── */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(0,122,255,.12)", border:`2px solid ${B}` }}>

          {/* recommended ribbon */}
          <div style={{ background:`linear-gradient(135deg,${B},#0055d4)`, padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:13 }}>⚡</span>
              <span style={{ fontSize:12, fontWeight:900, color:"white" }}>RECOMENDADO</span>
            </div>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.8)", fontWeight:700 }}>Ativação imediata · Sem taxas</span>
          </div>

          <div style={{ padding:"18px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
              {/* Official PIX logo */}
              <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#32BCAD,#1BA79B)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(50,188,173,.35)", flexShrink:0 }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M7.5 7.5L16 16L7.5 24.5" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M24.5 7.5L16 16L24.5 24.5" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px" }}>Pagar com PIX</p>
                <p style={{ fontSize:12, color:"#6B7280", margin:0, lineHeight:1.5 }}>Aprovação imediata e sem taxas extras. QR Code válido por 30 minutos.</p>
              </div>
            </div>

            {/* PIX benefits chips */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
              {["✓ Sem taxas","✓ Instantâneo","✓ Qualquer banco","✓ 24h por dia"].map((t,i) => (
                <span key={i} style={{ fontSize:11, fontWeight:700, color:"#32BCAD", background:"#F0FDFB", border:"1px solid #CCFBF1", borderRadius:99, padding:"3px 10px" }}>{t}</span>
              ))}
            </div>

            {/* Generate QR Code button */}
            <button
              onClick={gerarPixReal}
              disabled={pixLoading}
              style={{ width:"100%", padding:"15px 0", borderRadius:14, border:"none", cursor: pixLoading ? "wait" : "pointer", background: pixLoading ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 5px 18px ${B}44`, marginBottom:10 }}>
              {pixLoading ? (
                <><div style={{ width:18, height:18, border:"3px solid white", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> Gerando PIX...</>
              ) : (
                <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 17v3M14 20h3"/></svg> Gerar QR Code</>
              )}
            </button>
            {pixError && <p style={{ fontSize:12, color:"#EF4444", textAlign:"center", fontWeight:700 }}>{pixError}</p>}

            {/* Manual PIX key */}
            <div style={{ background:"#F8FAFF", border:"1px solid #DBEAFE", borderRadius:12, padding:"10px 12px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#3B82F6", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:.8 }}>Ou copie a chave PIX</p>
                <p style={{ fontSize:12, fontWeight:800, color:"#1E3A8A", margin:0, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{PIX_KEY}</p>
              </div>
              <button onClick={handleCopyKey} style={{ flexShrink:0, padding:"7px 14px", borderRadius:9, border:"none", background: copiedPix ? G : B, color:"white", fontWeight:800, fontSize:12, cursor:"pointer", transition:"background .2s", display:"flex", alignItems:"center", gap:5 }}>
                {copiedPix ? <><Check size={13}/> Copiado!</> : "Copiar"}
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD PAYMENT CARD ── */}
        <div style={{ background:"white", borderRadius:20, boxShadow:"0 2px 12px rgba(0,0,0,.07)", border:"1.5px solid #E5E7EB", overflow:"hidden" }}>
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              {/* card icon */}
              <div style={{ width:46, height:46, borderRadius:14, background:"#F8F9FA", border:"1.5px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <CreditCard size={22} color="#6B7280" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 2px" }}>Pagar com Cartão de Crédito</p>
                <p style={{ fontSize:12, color:"#6B7280", margin:0 }}>Parcele em até 12x sem juros</p>
              </div>
            </div>

            {/* card brand logos */}
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14 }}>
              {/* Visa */}
              <div style={{ background:"#1A1F71", borderRadius:6, padding:"4px 10px" }}>
                <span style={{ fontSize:13, fontWeight:900, color:"white", fontStyle:"italic", letterSpacing:-0.5 }}>VISA</span>
              </div>
              {/* Mastercard */}
              <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"#EB001B" }} />
                <div style={{ width:22, height:22, borderRadius:"50%", background:"#F79E1B", marginLeft:-8 }} />
              </div>
              {/* Elo */}
              <div style={{ background:"#FFD200", borderRadius:6, padding:"4px 8px" }}>
                <span style={{ fontSize:11, fontWeight:900, color:"#1a1a2e" }}>elo</span>
              </div>
              {/* Amex */}
              <div style={{ background:"#016FD0", borderRadius:6, padding:"4px 8px" }}>
                <span style={{ fontSize:11, fontWeight:900, color:"white" }}>AMEX</span>
              </div>
              <span style={{ fontSize:11, color:"#aaa", marginLeft:"auto" }}>e mais</span>
            </div>
          </div>

          {/* card buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, borderTop:"1px solid #F0F0F0" }}>
            <button
              onClick={() => setShowCardForm(v => !v)}
              style={{ padding:"13px 0", border:"none", borderRight:"1px solid #F0F0F0", background:"white", color:B, fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <CreditCard size={15} /> Cartão Salvo
            </button>
            <button
              onClick={() => setShowCardForm(v => !v)}
              style={{ padding:"13px 0", border:"none", background:"white", color:"#555", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span style={{ fontSize:16, lineHeight:1 }}>+</span> Novo Cartão
            </button>
          </div>

          {/* inline card form (expandable) */}
          {showCardForm && (
            <div style={{ padding:"14px 16px 16px", borderTop:"1px solid #F0F0F0", display:"flex", flexDirection:"column", gap:10 }}>
              <input placeholder="Número do cartão" type="tel" style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", fontFamily:"monospace" }} value={form.number} onChange={e => setForm(f=>({...f,number:e.target.value}))} />
              <input placeholder="Nome como no cartão" type="text" style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <input placeholder="MM/AA" type="tel" style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} value={form.expiry} onChange={e => setForm(f=>({...f,expiry:e.target.value}))} />
                <input placeholder="CVV" type="tel" style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} value={form.cvv} onChange={e => setForm(f=>({...f,cvv:e.target.value}))} />
                <input placeholder="CPF do titular (somente números)" type="tel" maxLength={11} style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" }} value={form.cpf} onChange={e => setForm(f=>({...f,cpf:e.target.value.replace(/\D/g,'')}))} />
              </div>
              <select style={{ padding:"12px 14px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", color:"#555", background:"white" }}>
                {[1,2,3,4,6,8,10,12].map(n => <option key={n} value={n}>{n}x de R$ {(parseFloat((chosen?.price||"29,90").replace(",",".")) / n).toFixed(2).replace(".",",")} {n===1?"sem juros":n<=6?"sem juros":"com juros"}</option>)}
              </select>
                <button style={{ padding:"13px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,#1a1a2e,#2d2d44)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }} onClick={handleCardPayment} disabled={saving}>
                Confirmar Pagamento
              </button>
            </div>
          )}
        </div>

        {/* ── SECURITY FOOTER ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"8px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>Pagamento 100% Seguro</span>
          </div>
          <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0, lineHeight:1.6 }}>
            Processado por <strong style={{ color:"#555" }}>Asaas</strong> · Criptografia SSL 256-bit<br/>
            Seus dados financeiros nunca são armazenados pelo Multi
          </p>
          <div style={{ display:"flex", gap:16, marginTop:4 }}>
            {["🔒 Seguro","✅ Verificado","🛡️ Protegido"].map((t,i) => (
              <span key={i} style={{ fontSize:10, color:"#aaa", fontWeight:700 }}>{t}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ───────────────────────── PROFILE SCREEN ──────────────────────────────────── */
/* ───────────────────────── WALLET SCREEN ────────────────────────────────────── */
const WALLET_HISTORY = [
  { id:1, date:"02/07/2026", service:"Pintura do quarto",       value:320,  status:"received" },
  { id:2, date:"28/06/2026", service:"Reforma calçada",          value:600,  status:"received" },
  { id:3, date:"20/06/2026", service:"Instalação elétrica",      value:280,  status:"received" },
  { id:4, date:"15/06/2026", service:"Reparo de encanação",      value:150,  status:"received" },
  { id:5, date:"10/06/2026", service:"Pintura sala e quartos",   value:1200, status:"received" },
];
const PENDING_SERVICES = [
  { id:"p1", service:"Instalação de chuveiro", value:200 },
  { id:"p2", service:"Jardim — poda e limpeza", value:250 },
];

function WalletScreen({ onBack, showToast, walletBalance, setWalletBalance }) {
  const [showPix,     setShowPix]     = useState(false);
  const [pixKey,      setPixKey]      = useState("");
  const [pixAmount,   setPixAmount]   = useState("");
  const [processing,  setProcessing]  = useState(false);
  const [withdrawn,   setWithdrawn]   = useState(false);
  const [history,     setHistory]     = useState(WALLET_HISTORY);

  const balance  = walletBalance ?? 1240;
  const pending  = PENDING_SERVICES.reduce((a, s) => a + s.value, 0);
  const totalMonth = history.filter(h => h.date.includes("/06/2026") || h.date.includes("/07/2026"))
                            .reduce((a, h) => a + h.value, 0);

  const handleWithdraw = () => {
    if (!pixKey.trim() || !pixAmount) return;
    const amount = parseFloat(pixAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      showToast("❌ Valor inválido para saque.", "#DC2626");
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setWithdrawn(true);
      setWalletBalance?.(b => b - amount);
      setHistory(h => [{ id:Date.now(), date: new Date().toLocaleDateString("pt-BR"), service:"Saque via PIX", value:-amount, status:"withdrawn" }, ...h]);
      showToast(`💸 Saque de R$ ${amount.toFixed(2).replace(".",",")} enviado via PIX!`, G);
      setTimeout(() => { setShowPixModal(false); setWithdrawn(false); setPixKey(""); setPixAmount(""); }, 2000);
    }, 2200);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#F8F9FA", minHeight:"100vh", paddingBottom:60 }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(160deg,#0F3460 0%,#1a4a7a 100%)", padding:"16px 18px 32px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <h2 style={{ fontSize:18, fontWeight:900, color:"white", margin:0 }}>Minha Carteira</h2>
        </div>

        {/* balance hero */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.55)", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 6px" }}>Saldo Disponível</p>
          <p style={{ fontSize:42, fontWeight:900, color:"white", margin:"0 0 4px", lineHeight:1 }}>
            R$ <span style={{ color:"#4ade80" }}>{balance.toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 })}</span>
          </p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", margin:0 }}>Disponível para saque agora</p>
        </div>

        {/* stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { label:"Pendente", value:`R$ ${pending}`, color:O },
            { label:"Este mês", value:`R$ ${totalMonth.toLocaleString("pt-BR")}`, color:"#4ade80" },
            { label:"Serviços", value:history.filter(h=>h.status==="received").length, color:"white" },
          ].map((s, i) => (
            <div key={i} style={{ background:"rgba(255,255,255,.08)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <p style={{ fontSize:15, fontWeight:900, color:s.color, margin:0 }}>{s.value}</p>
              <p style={{ fontSize:10, color:"rgba(255,255,255,.45)", fontWeight:700, margin:"3px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"20px 16px 0" }}>
        <button onClick={() => setShowPixModal(true)} style={{ padding:"14px 0", borderRadius:16, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:`0 5px 16px ${G}44` }}>
          <Banknote size={17} /> Sacar via PIX
        </button>
        <button onClick={() => window.open("/relatorio.html", "_blank")} style={{ padding:"14px 0", borderRadius:16, border:"1.5px solid "+B, background:"white", color:B, fontWeight:900, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <TrendingUp size={17} /> Relatório
        </button>
      </div>

      {/* ── PENDING SERVICES ── */}
      {PENDING_SERVICES.length > 0 && (
        <div style={{ margin:"20px 16px 0", background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
          <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:8 }}>
            <Lock size={14} color={O} />
            <p style={{ fontSize:12, fontWeight:900, color:"#1a1a2e", margin:0 }}>Em Custódia Multi</p>
            <span style={{ marginLeft:"auto", fontSize:12, fontWeight:900, color:O }}>R$ {pending}</span>
          </div>
          {PENDING_SERVICES.map((s, i) => (
            <div key={s.id} style={{ padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom: i < PENDING_SERVICES.length-1 ? "1px solid #F8F8F8" : "none" }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", margin:0 }}>{s.service}</p>
                <p style={{ fontSize:11, color:"#aaa", margin:0 }}>Aguardando finalização</p>
              </div>
              <span style={{ fontSize:13, fontWeight:900, color:O }}>R$ {s.value}</span>
            </div>
          ))}
          <div style={{ padding:"10px 16px", background:"#FFF8F5" }}>
            <p style={{ fontSize:11, color:"#C44B00", fontWeight:700, margin:0, display:"flex", alignItems:"center", gap:5 }}>
              <Shield size={12} color={O} /> Liberado pelo cliente ao concluir o serviço
            </p>
          </div>
        </div>
      )}

      {/* ── PAYMENT RULES ── */}
      <div style={{ margin:"16px 16px 0", background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
        <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid #F0F0F0" }}>
          <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:0 }}>⏱️ Prazo de Recebimento</p>
        </div>
        {[
          { icon:"⚡", method:"PIX",              prazo:"D+1 após confirmação", taxa:"Sem taxas",         col:G,        bg:"#F0FDF4", border:"#BBF7D0" },
          { icon:"💳", method:"Cartão de Débito",  prazo:"D+1 após confirmação", taxa:"Sem taxas",         col:G,        bg:"#F0FDF4", border:"#BBF7D0" },
          { icon:"💜", method:"Cartão de Crédito", prazo:"D+2 após confirmação", taxa:"3% descontado",    col:"#F59E0B", bg:"#FFFBEB", border:"#FDE68A" },
        ].map((r, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom: i < 2 ? "1px solid #F8F8F8" : "none" }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{r.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 2px" }}>{r.method}</p>
              <p style={{ fontSize:11, color:"#6B7280", margin:0 }}>{r.prazo}</p>
            </div>
            <span style={{ fontSize:11, fontWeight:800, color:r.col, background:r.bg, border:`1px solid ${r.border}`, borderRadius:99, padding:"4px 10px", whiteSpace:"nowrap" }}>
              {r.taxa}
            </span>
          </div>
        ))}
      </div>

      {/* ── HISTORY ── */}
      <div style={{ margin:"20px 16px 0", background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
        <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #F0F0F0" }}>
          <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:0 }}>Histórico de Ganhos</p>
        </div>
        {history.map((h, i) => {
          const isWithdrawn = h.status === "withdrawn";
          return (
            <div key={h.id} style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, borderBottom: i < history.length-1 ? "1px solid #F8F8F8" : "none" }}>
              <div style={{ width:38, height:38, borderRadius:11, background: isWithdrawn ? "#FFF0F0" : "#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {isWithdrawn ? <Banknote size={17} color="#DC2626" /> : <CheckCircle2 size={17} color={G} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", margin:"0 0 2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.service}</p>
                <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{h.date}</p>
              </div>
              <span style={{ fontSize:14, fontWeight:900, color: isWithdrawn ? "#DC2626" : G, flexShrink:0 }}>
                {isWithdrawn ? "-" : "+"}R$ {Math.abs(h.value).toLocaleString("pt-BR", { minimumFractionDigits:2 })}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── PIX WITHDRAWAL MODAL ── */}
        <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth:400, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px" }}>
            <div style={{ width:40, height:4, background:"#E0E0E0", borderRadius:99, margin:"0 auto 20px" }} />

            {!withdrawn ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:G+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Banknote size={22} color={G} />
                  </div>
                  <div>
                    <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Sacar via PIX</p>
                    <p style={{ fontSize:12, color:"#aaa", margin:0 }}>Disponível: R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits:2 })}</p>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:7 }}>Chave PIX</label>
                  <input type="text" placeholder="CPF, e-mail, telefone ou chave aleatória" value={pixKey} onChange={e => setPixKey(e.target.value)}
                    style={{ width:"100%", border:"1.5px solid #E5E7EB", borderRadius:12, padding:"12px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:7 }}>Valor (R$)</label>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:900, color:"#aaa", fontSize:13 }}>R$</span>
                    <input type="number" placeholder="0,00" value={pixAmount} onChange={e => setPixAmount(e.target.value)} max={balance}
                      style={{ width:"100%", border:"1.5px solid #E5E7EB", borderRadius:12, padding:"12px 14px 12px 40px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    {[50, 100, 500, balance].map(v => (
                      <button key={v} onClick={() => setPixAmount(String(v))} style={{ flex:1, padding:"6px 0", borderRadius:8, border:`1.5px solid ${pixAmount == v ? G : "#E5E7EB"}`, background: pixAmount == v ? G+"12" : "white", color: pixAmount == v ? G : "#888", fontWeight:800, fontSize:11, cursor:"pointer" }}>
                        {v === balance ? "Tudo" : `R$${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <button onClick={() => { setShowPixModal(false); setPixKey(""); setPixAmount(""); }} style={{ padding:"13px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:800, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                  <button onClick={handleWithdraw} disabled={processing || !pixKey.trim() || !pixAmount} style={{ padding:"13px 0", borderRadius:12, border:"none", background: pixKey.trim() && pixAmount ? `linear-gradient(135deg,${G},#16a34a)` : "#E5E7EB", color: pixKey.trim() && pixAmount ? "white" : "#aaa", fontWeight:900, fontSize:13, cursor: pixKey.trim() && pixAmount ? "pointer" : "default", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: pixKey.trim() && pixAmount ? `0 4px 12px ${G}44` : "none" }}>
                    {processing ? <><span style={{ width:16, height:16, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} /> Enviando…</> : <><Check size={15} /> Confirmar</>}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 6px 20px ${G}44` }}>
                  <CheckCircle2 size={36} color="white" />
                </div>
                <h3 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Saque enviado!</h3>
                <p style={{ fontSize:14, color:"#6B7280" }}>O valor chegará em até 60 segundos.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ── Autonomy term card for professional profile ── */
function AutonomyTermCard({ showToast }) {
  const [accepted,   setAccepted]   = useState(true); // pre-accepted at registration
  const [showTerms,  setShowTerms]  = useState(false);
  return (
    <>
      {showTerms && <TermsOfUseModal variant="autonomy" onClose={() => setShowTerms(false)} />}
      <div style={{ background:"white" }}>
        <div style={{ padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:12, borderBottom:"1px solid #F8F8F8" }}>
          <span style={{ width:36, height:36, borderRadius:11, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
            <Shield size={17} color={O} />
          </span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 3px" }}>Declaração de Autonomia</p>
            <p style={{ fontSize:11, color:"#aaa", lineHeight:1.5, margin:"0 0 10px" }}>
              Declaro que presto serviços de forma autônoma e independente, sem vínculo empregatício com a Plataforma Multi.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowTerms(true)} style={{ flex:1, padding:"8px 0", borderRadius:10, border:`1.5px solid ${O}`, background:"white", color:O, fontWeight:800, fontSize:11, cursor:"pointer" }}>
                Ler Termo Completo
              </button>
              {!accepted ? (
                <button onClick={() => { setAccepted(true); showToast("✅ Termo de autonomia aceito!"); }} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:11, cursor:"pointer" }}>
                  Aceitar Termo
                </button>
              ) : (
                <div style={{ flex:1, padding:"8px 0", borderRadius:10, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Check size={13} color={G} />
                  <span style={{ fontSize:11, fontWeight:800, color:G }}>Aceito em {new Date().toLocaleDateString("pt-BR")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── DOCUMENTAÇÃO DO PROFISSIONAL ────────────────────── */
const DOC_TYPES = [
  { id:"rg",      label:"RG / CNH",             icon:"🪪", hint:"Frente e verso legível" },
  { id:"crim",    label:"Antecedentes Crim.",    icon:"📋", hint:"Certidão emitida há menos de 90 dias" },
  { id:"address", label:"Comprovante Endereço",  icon:"🏠", hint:"Conta de luz, água ou telefone" },
];

// Status possíveis: "pending" | "uploading" | "analysis" | "verified" | "rejected"
const STATUS_CONFIG = {
  pending:   { label:"Pendente",    color:"#9CA3AF", bg:"#F5F5F5",  icon:null,            border:"#E5E7EB" },
  uploading: { label:"Enviando…",   color:"#3B82F6", bg:"#EBF4FF",  icon:null,            border:"#93C5FD" },
  analysis:  { label:"Em análise",  color:"#F59E0B", bg:"#FFFBEB",  icon:"clock",         border:"#FDE68A" },
  verified:  { label:"Verificado",  color:"#16a34a", bg:"#F0FDF4",  icon:"badge",         border:"#BBF7D0" },
  rejected:  { label:"Reprovado",   color:"#DC2626", bg:"#FFF5F5",  icon:"x",             border:"#FECACA" },
};

function DocumentacaoSection({ showToast, docStatus: externalDocStatus, onDocStatusChange }) {
  // Internal file/preview/progress state (stays local — not needed globally)
  const [localDocs, setLocalDocs] = useState({
    rg:      { file:null, preview:null, progress:0 },
    crim:    { file:null, preview:null, progress:0 },
    address: { file:null, preview:null, progress:0 },
  });
  const [showAdmin,   setShowAdmin]   = useState(null);
  const [adminKey,    setAdminKey]    = useState("");
  const [keyError,    setKeyError]    = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const fileRefs = { rg: useRef(), crim: useRef(), address: useRef() };

  const ADMIN_PASSWORD = "multi2026";

  // Merge external status with local file state
  const docs = {
    rg:      { ...localDocs.rg,      status: externalDocStatus?.rg      || "pending" },
    crim:    { ...localDocs.crim,     status: externalDocStatus?.crim    || "pending" },
    address: { ...localDocs.address,  status: externalDocStatus?.address || "pending" },
  }; // same as admin dashboard

  const handleFileSelect = (docId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = ev => {
      // Set uploading state locally + notify parent
      setLocalDocs(d => ({ ...d, [docId]: { ...d[docId], file, preview: ev.target.result, progress:0 } }));
      onDocStatusChange?.(docId, "uploading");

      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 18 + 8;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setTimeout(() => {
            setLocalDocs(d => ({ ...d, [docId]: { ...d[docId], progress:100 } }));
            onDocStatusChange?.(docId, "analysis");
            showToast?.("📋 Documento enviado! Status: Em análise.", "#F59E0B");
          }, 300);
        }
        setLocalDocs(d => ({ ...d, [docId]: { ...d[docId], progress: Math.min(prog, 100) } }));
      }, 120);
    };
    reader.readAsDataURL(file);
  };

  const handleAdminApprove = (docId, approve) => {
    if (adminKey !== ADMIN_PASSWORD) {
      setKeyError(true);
      setTimeout(() => setKeyError(false), 1400);
      return;
    }
    onDocStatusChange?.(docId, approve ? "verified" : "rejected");
    setShowAdmin(null);
    setAdminKey("");
    showToast?.(approve ? "✅ Documento verificado!" : "❌ Documento reprovado.", approve ? "#22c55e" : "#DC2626");
  };

  return (
    <div style={{ background:"white" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>

      {DOC_TYPES.map((doc, idx) => {
        const state  = docs[doc.id];
        const cfg    = STATUS_CONFIG[state.status];
        const isLast = idx === DOC_TYPES.length - 1;

        return (
          <div key={doc.id}>
            {/* hidden file input — accepts images + PDF */}
            <input
              ref={fileRefs[doc.id]}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              style={{ display:"none" }}
              onChange={e => handleFileSelect(doc.id, e)}
            />

            {/* ── ROW ── */}
            <div
              style={{ padding:"13px 16px", borderBottom: isLast ? "none" : "1px solid #F8F8F8", cursor: state.status === "uploading" ? "default" : "pointer" }}
              onClick={() => { if (state.status !== "uploading") setExpandedDoc(expandedDoc === doc.id ? null : doc.id); }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                {/* icon */}
                <div style={{ width:40, height:40, borderRadius:12, background:cfg.bg, border:`1.5px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, transition:"all .2s" }}>
                  {state.preview
                    ? <img src={state.preview} alt="" style={{ width:40, height:40, objectFit:"cover", borderRadius:11 }} />
                    : doc.icon}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 2px" }}>{doc.label}</p>

                  {/* progress bar — only during upload */}
                  {state.status === "uploading" ? (
                    <div>
                      <div style={{ height:4, borderRadius:99, background:"#E5E7EB", overflow:"hidden", marginBottom:3 }}>
                        <div style={{ height:"100%", borderRadius:99, background:"linear-gradient(90deg,#3B82F6,#60A5FA)", width:`${state.progress}%`, transition:"width .12s" }} />
                      </div>
                      <p style={{ fontSize:10, color:"#3B82F6", fontWeight:700, margin:0 }}>Enviando… {Math.round(state.progress)}%</p>
                    </div>
                  ) : (
                    <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{doc.hint}</p>
                  )}
                </div>

                {/* status badge */}
                <div style={{ flexShrink:0 }}>
                  {state.status === "uploading" ? (
                    <div style={{ width:28, height:28, border:"3px solid #DBEAFE", borderTopColor:"#3B82F6", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                  ) : (
                    <span style={{ display:"flex", alignItems:"center", gap:4, background:cfg.bg, color:cfg.color, fontWeight:800, fontSize:11, padding:"5px 10px", borderRadius:99, border:`1px solid ${cfg.border}`, whiteSpace:"nowrap" }}>
                      {cfg.icon === "clock"  && <Clock size={11} />}
                      {cfg.icon === "badge"  && <BadgeCheck size={11} />}
                      {cfg.icon === "x"      && <X size={11} />}
                      {cfg.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── EXPANDED PANEL ── */}
            {expandedDoc === doc.id && state.status !== "uploading" && (
              <div style={{ padding:"0 16px 14px", borderBottom: isLast ? "none" : "1px solid #F0F0F0" }}>

                {/* Upload / retake button */}
                {(state.status === "pending" || state.status === "rejected") && (
                  <button
                    onClick={() => fileRefs[doc.id].current?.click()}
                    style={{ width:"100%", padding:"12px 0", borderRadius:12, border:`1.5px dashed ${B}`, background:"#EBF4FF", color:B, fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
                    <Camera size={16} /> {state.status === "rejected" ? "Reenviar documento" : "Tirar foto ou escolher arquivo"}
                  </button>
                )}

                {/* Re-upload when in analysis or verified */}
                {(state.status === "analysis" || state.status === "verified") && (
                  <button
                    onClick={() => fileRefs[doc.id].current?.click()}
                    style={{ width:"100%", padding:"10px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:8 }}>
                    <Camera size={14} /> Substituir documento
                  </button>
                )}

                {/* Preview thumbnail */}
                {state.preview && (
                  <div style={{ marginBottom:10 }}>
                    <img src={state.preview} alt="preview" style={{ width:"100%", maxHeight:140, objectFit:"cover", borderRadius:12, border:"1px solid #E5E7EB" }} />
                    <p style={{ fontSize:10, color:"#aaa", fontWeight:700, margin:"5px 0 0", textAlign:"center" }}>Documento enviado</p>
                  </div>
                )}

                {/* Analysis info */}
                {state.status === "analysis" && (
                  <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"10px 12px", display:"flex", gap:8 }}>
                    <Clock size={15} color="#F59E0B" style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:12, color:"#92400E", fontWeight:700, margin:0, lineHeight:1.5 }}>
                      Documento recebido! A administradora irá analisar em até 24h úteis.
                    </p>
                  </div>
                )}

                {/* Verified info */}
                {state.status === "verified" && (
                  <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"10px 12px", display:"flex", gap:8 }}>
                    <BadgeCheck size={15} color="#16a34a" style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:12, color:"#166534", fontWeight:700, margin:0 }}>
                      Documento verificado e aprovado pela administradora. ✅
                    </p>
                  </div>
                )}

                {/* Admin panel — approve/reject (shown when analysis status) */}
                {state.status === "analysis" && (
                  <div style={{ marginTop:10 }}>
                    {showAdmin !== doc.id ? (
                      <button
                        onClick={e => { e.stopPropagation(); setShowAdmin(doc.id); }}
                        style={{ width:"100%", padding:"9px 0", borderRadius:10, border:"1.5px solid #334155", background:"#0F172A", color:"#6366F1", fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                        <ShieldCheck size={14} /> Acesso Admin — Verificar
                      </button>
                    ) : (
                      <div style={{ background:"#0F172A", borderRadius:14, padding:14 }}>
                        <p style={{ fontSize:11, fontWeight:800, color:"#94A3B8", margin:"0 0 10px", textAlign:"center", textTransform:"uppercase", letterSpacing:1 }}>Senha de Administradora</p>
                        <input
                          type="password"
                          placeholder="Digite a senha admin"
                          value={adminKey}
                          onChange={e => { setAdminKey(e.target.value); setKeyError(false); }}
                          onKeyDown={e => e.key === "Enter" && handleAdminApprove(doc.id, true)}
                          style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${keyError ? "#EF4444" : "#334155"}`, background:"#1E293B", color:"white", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box", animation: keyError ? "shake .4s" : "none" }}
                        />
                        {keyError && <p style={{ fontSize:11, color:"#EF4444", textAlign:"center", margin:"5px 0 0", fontWeight:700 }}>Senha incorreta</p>}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                          <button onClick={() => handleAdminApprove(doc.id, false)} style={{ padding:"10px 0", borderRadius:10, border:"1.5px solid #EF4444", background:"transparent", color:"#EF4444", fontWeight:800, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                            <X size={13} /> Reprovar
                          </button>
                          <button onClick={() => handleAdminApprove(doc.id, true)} style={{ padding:"10px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22c55e,#16a34a)", color:"white", fontWeight:900, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5, boxShadow:"0 3px 10px #22c55e44" }}>
                            <ShieldCheck size={13} /> Aprovar
                          </button>
                        </div>
                        <button onClick={() => { setShowAdmin(null); setAdminKey(""); }} style={{ width:"100%", padding:"8px 0", borderRadius:10, border:"none", background:"transparent", color:"#64748B", fontWeight:700, fontSize:11, cursor:"pointer", marginTop:8 }}>
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
function AdminAccessTrigger({ onOpenAdmin }) {
  const [taps, setTaps] = useState(0);
  const tap = () => { setTaps(n => n >= 5 ? 5 : n + 1); };
  return (
    <div style={{ textAlign:"center", padding:"16px 0 24px" }}>
      <p onClick={tap} style={{ fontSize:11, color:"#ccc", margin:"0 0 8px", cursor:"default", userSelect:"none" }}>
        Multi v2.0.0 · Plataforma Nacional {taps > 0 && taps < 5 && `(${5-taps} toques)`}
      </p>
      {taps >= 5 && (
        <button onClick={onOpenAdmin} style={{ padding:"8px 20px", borderRadius:99, border:"1.5px solid #334155", background:"#0F172A", color:"#6366F1", fontWeight:800, fontSize:12, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7 }}>
          <ShieldCheck size={14} /> Acesso Admin
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── ENDEREÇOS DO CLIENTE ────────────────────────────── */
const API_BASE = "https://web-production-e103b.up.railway.app";

function safeGetUser() {
  try { return JSON.parse(localStorage.getItem("multiUser") || "{}"); } catch { return {}; }
}

const SectionLabelStandalone = ({ label }) => (
  <div style={{ padding:"20px 16px 8px", background:"#F8F9FA" }}>
    <p style={{ fontSize:11, fontWeight:900, color:"#aaa", textTransform:"uppercase", letterSpacing:1.5, margin:0 }}>{label}</p>
  </div>
);

function AddressSection({ showToast }) {
  const [addresses,   setAddresses]   = useState([]);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState({ label:"", street:"", city:"", cep:"" });
  const [editingAddr, setEditingAddr] = useState(null);
  const phone = safeGetUser().email || safeGetUser().whatsapp || "";

  useEffect(() => {
    
    fetch(`${API_BASE}/api/enderecos/${encodeURIComponent(phone)}`)
      .then(r => r.json()).then(d => setAddresses(Array.isArray(d) ? d : [])).catch(() => {});
  }, [phone]);

  const handleSave = async () => {
    
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/enderecos`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ phone, ...form }),
      });
      const d = await r.json();
      if (d.id) {
        setAddresses(prev => [...prev, d]);
        setShowModal(false);
        setForm({ label:"", street:"", city:"", cep:"" });
        showToast?.("✅ Endereço salvo com sucesso!");
      }
    } catch { showToast?.("❌ Erro ao salvar endereço", "#EF4444"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingAddr) return;
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/enderecos/${editingAddr.id}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ label:form.label, street:form.street, city:form.city, cep:form.cep }),
      });
      const d = await r.json();
      if (d.address) {
        setAddresses(prev => prev.map(a => a.id === editingAddr.id ? d.address : a));
        setShowModal(false); setEditingAddr(null); setForm({ label:"", street:"", city:"", cep:"" });
        showToast?.("✅ Endereço atualizado!");
      }
    } catch { showToast?.("❌ Erro ao atualizar", "#EF4444"); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/api/enderecos/${id}`, { method:"DELETE" });
      setAddresses(prev => prev.filter(a => a.id !== id));
      showToast?.("🗑️ Endereço removido");
    } catch {}
  };

  return (
    <>
      <SectionLabelStandalone label="Meus Endereços" />
      <div style={{ background:"white" }}>
        {addresses.length === 0 && (
          <p style={{ fontSize:12, color:"#bbb", textAlign:"center", padding:"16px 0", fontWeight:700 }}>
            Nenhum endereço cadastrado
          </p>
        )}
        {addresses.map((addr, i) => (
          <div key={addr.id} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", borderBottom:"1px solid #F8F8F8", cursor:"pointer" }} onClick={() => { setEditingAddr(addr); setForm({ label:addr.label, street:addr.street, city:addr.city||"", cep:addr.cep||"" }); setShowModal(true); }}>
            <span style={{ width:36, height:36, borderRadius:11, background:B+"12", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏠</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", marginBottom:1 }}>{addr.label}</p>
              <p style={{ fontSize:11, color:"#bbb" }}>{addr.street}{addr.city ? ` — ${addr.city}` : ""}</p>
            </div>
            <button onClick={() => handleDelete(addr.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <X size={14} color="#DDD" />
            </button>
          </div>
        ))}
        <button onClick={() => setShowModal(true)} style={{ width:"100%", padding:"12px 0", border:"none", background:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:7, color:B, fontWeight:800, fontSize:13, cursor:"pointer" }}>
          <Plus size={14} /> Adicionar endereço
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px" }}>
            <div style={{ width:40, height:4, background:"#E5E7EB", borderRadius:99, margin:"0 auto 20px" }} />
            <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:"0 0 18px" }}>{editingAddr ? "Editar Endereço" : "Novo Endereço"}</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input placeholder="Nome (ex: Minha Casa, Trabalho)" value={form.label} onChange={e => setForm(f => ({...f, label:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              <input placeholder="Rua e número" value={form.street} onChange={e => setForm(f => ({...f, street:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              <input placeholder="Cidade" value={form.city} onChange={e => setForm(f => ({...f, city:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              <input placeholder="CEP" value={form.cep} onChange={e => setForm(f => ({...f, cep:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              <button onClick={() => editingAddr ? handleUpdate() : handleSave()} disabled={saving} style={{ padding:"14px 0", borderRadius:14, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }}>
                {saving ? "Salvando..." : "Salvar Endereço"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────────── CARTÕES DO CLIENTE ───────────────────────────────── */
function CardSection({ showToast }) {
  const [cards,     setCards]     = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const handleCardPayment = async () => {
    setSaving(true);
    try {
      const user = safeGetUser();
      const res = await fetch(API + '/cobrar-cartao', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: user.email, name: user.name || form.label, phone: user.whatsapp || '', plan: chosen?.label || 'monthly', cardNumber: form.number.replace(/s/g,''), cardHolder: form.label, expiryMonth: form.expiry.split('/')[0], expiryYear: '20'+form.expiry.split('/')[1], cvv: form.cvv, installments: 1 }) });
      const data = await res.json();
      if (res.ok) { showToast('Pagamento aprovado! PRO ativado!'); onSubscribe && onSubscribe(); }
      else { alert(data.error || 'Erro no pagamento'); }
    } catch(e) { alert('Erro de conexão'); }
    setSaving(false);
  };
  const [form,      setForm]      = useState({ label:"", number:"", expiry:"", cvv:"", brand:"Visa", type:"credit" });
  const phone = safeGetUser().email || safeGetUser().whatsapp || "";

  useEffect(() => {
    
    fetch(`${API_BASE}/api/cartoes/${encodeURIComponent(phone)}`)
      .then(r => r.json()).then(d => setCards(Array.isArray(d) ? d : [])).catch(() => {});
  }, [phone]);

  const handleSave = async () => {
    const digits = form.number.replace(/\D/g, "");
    
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/cartoes`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ phone, label:form.label, last4:digits.slice(-4), brand:form.brand, type:form.type }),
      });
      const d = await r.json();
      if (d.id) {
        setCards(prev => [...prev, d]);
        setShowModal(false);
        setForm({ label:"", number:"", brand:"Visa", type:"credit" });
        showToast?.("✅ Cartão salvo com sucesso!");
      }
    } catch { showToast?.("❌ Erro ao salvar cartão", "#EF4444"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/api/cartoes/${id}`, { method:"DELETE" });
      setCards(prev => prev.filter(c => c.id !== id));
      showToast?.("🗑️ Cartão removido");
    } catch {}
  };

  const brandBg = { Visa:"#1A1F71", Mastercard:"#EB001B", Elo:"#FFD200", Amex:"#016FD0" };
  const brandColor = { Visa:"white", Mastercard:"white", Elo:"#1a1a2e", Amex:"white" };

  return (
    <>
      <SectionLabelStandalone label="Cartões de Pagamento" />
      <div style={{ background:"white" }}>
        {cards.length === 0 && (
          <p style={{ fontSize:12, color:"#bbb", textAlign:"center", padding:"16px 0", fontWeight:700 }}>
            Nenhum cartão cadastrado
          </p>
        )}
        {cards.map((card, i) => (
          <div key={card.id} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", borderBottom:"1px solid #F8F8F8", cursor:"pointer" }} onClick={() => setSelectedCard(card)}>
            <div style={{ width:36, height:36, borderRadius:11, background: brandBg[card.brand] || "#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:9, fontWeight:900, color: brandColor[card.brand] || "#1a1a2e" }}>{card.brand}</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", marginBottom:1 }}>{card.label} •••• {card.last4 || "••••"}</p>
              <p style={{ fontSize:11, color:"#bbb" }}>{card.type === "credit" ? "Crédito" : "Débito"}{card.is_main ? " — Principal" : ""}</p>
            </div>
            <button onClick={() => handleDelete(card.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
              <X size={14} color="#DDD" />
            </button>
          </div>
        ))}
        <button onClick={() => setShowModal(true)} style={{ width:"100%", padding:"12px 0", border:"none", background:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:7, color:B, fontWeight:800, fontSize:13, cursor:"pointer" }}>
          <Plus size={14} /> Adicionar cartão
        </button>
      </div>

      {/* Modal */}
      {selectedCard && (
        <div onClick={() => setSelectedCard(null)} style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px" }}>
            <div style={{ width:40, height:4, background:"#E5E7EB", borderRadius:99, margin:"0 auto 20px" }} />
            <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:"0 0 20px" }}>Detalhes do Cartão</h3>
            <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", borderRadius:16, padding:"20px", marginBottom:20 }}>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", margin:"0 0 16px" }}>{selectedCard.bandeira || selectedCard.brand || "Cartão"} · {(selectedCard.tipo || selectedCard.type) === "credit" ? "Crédito" : "Débito"}</p>
              <p style={{ fontSize:22, fontWeight:900, color:"white", letterSpacing:3, margin:"0 0 16px", fontFamily:"monospace" }}>•••• •••• •••• {selectedCard.last4 || selectedCard.numero?.slice(-4) || "••••"}</p>
              <p style={{ fontSize:13, color:"rgba(255,255,255,.7)", margin:0 }}>{selectedCard.label || selectedCard.nome || ""}</p>
            </div>
            <button onClick={() => { handleDelete(selectedCard.id); setSelectedCard(null); }} style={{ width:"100%", padding:"13px 0", borderRadius:12, border:"1.5px solid #FECACA", background:"#FFF5F5", color:"#DC2626", fontWeight:800, fontSize:13, cursor:"pointer" }}>Remover Cartão</button>
            <button onClick={() => setSelectedCard(null)} style={{ width:"100%", marginTop:10, padding:"13px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:800, fontSize:13, cursor:"pointer" }}>Fechar</button>
          </div>
        </div>
      )}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px" }}>
            <div style={{ width:40, height:4, background:"#E5E7EB", borderRadius:99, margin:"0 auto 20px" }} />
            <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:"0 0 18px" }}>Novo Cartão</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <input placeholder="Nome do cartão (ex: Meu Nubank)" autoComplete="off" value={form.label} onChange={e => setForm(f => ({...f, label:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              <input placeholder="Número do cartão" type="tel" maxLength={19} autoComplete="off" value={form.number} onChange={e => setForm(f => ({...f, number:e.target.value.replace(/(\d{4})/g,"$1 ").trim()}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", fontFamily:"monospace" }} />
              <div style={{ display:"flex", gap:10 }}>
                <input placeholder="Validade (MM/AA)" type="tel" maxLength={5} value={form.expiry||""} onChange={e => { let v=e.target.value.replace(/\D/g,""); if(v.length>2) v=v.slice(0,2)+"/"+v.slice(2,4); setForm(f=>({...f,expiry:v})); }} style={{ flex:1, padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
                <input placeholder="CVV" type="tel" maxLength={4} value={form.cvv||""} onChange={e => setForm(f=>({...f,cvv:e.target.value.replace(/\D/g,"")}))} style={{ width:80, padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none" }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <select value={form.brand} onChange={e => setForm(f => ({...f, brand:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", background:"white" }}>
                  {["Visa","Mastercard","Elo","Amex"].map(b => <option key={b}>{b}</option>)}
                </select>
                <select value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))} style={{ padding:"12px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", fontSize:13, outline:"none", background:"white" }}>
                  <option value="credit">Crédito</option>
                  <option value="debit">Débito</option>
                </select>
              </div>
              <button onClick={() => handleSave()} disabled={saving} style={{ padding:"14px 0", borderRadius:14, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }}>
                {saving ? "Salvando..." : "Salvar Cartão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
function SOSScreen({ onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#fff" }}>
      <div style={{ background:"#EF4444", padding:"20px 16px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer" }}>&larr;</button>
        <h2 style={{ margin:0, color:"white", fontSize:18, fontWeight:800 }}>Botao de Panico</h2>
      </div>
      <div style={{ padding:24, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <p style={{ color:"#6B7280", fontSize:14, textAlign:"center", margin:0 }}>Em caso de emergencia, acione os servicos abaixo imediatamente.</p>
        <a href="tel:192" style={{ width:"100%", textDecoration:"none" }}>
          <div style={{ background:"#EF4444", borderRadius:20, padding:"24px 20px", display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(239,68,68,.4)" }}>
            <span style={{ fontSize:40 }}>🚑</span>
            <div><p style={{ margin:0, color:"white", fontWeight:900, fontSize:20 }}>SAMU</p><p style={{ margin:0, color:"rgba(255,255,255,.8)", fontSize:14 }}>Ligar para 192</p></div>
          </div>
        </a>
        <a href="tel:190" style={{ width:"100%", textDecoration:"none" }}>
          <div style={{ background:"#1D4ED8", borderRadius:20, padding:"24px 20px", display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(29,78,216,.4)" }}>
            <span style={{ fontSize:40 }}>👮</span>
            <div><p style={{ margin:0, color:"white", fontWeight:900, fontSize:20 }}>POLICIA</p><p style={{ margin:0, color:"rgba(255,255,255,.8)", fontSize:14 }}>Ligar para 190</p></div>
          </div>
        </a>
        <a href="tel:193" style={{ width:"100%", textDecoration:"none" }}>
          <div style={{ background:"#F97316", borderRadius:20, padding:"24px 20px", display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(249,115,22,.4)" }}>
            <span style={{ fontSize:40 }}>🚒</span>
            <div><p style={{ margin:0, color:"white", fontWeight:900, fontSize:20 }}>BOMBEIROS</p><p style={{ margin:0, color:"rgba(255,255,255,.8)", fontSize:14 }}>Ligar para 193</p></div>
          </div>
        </a>
        <a href="https://wa.me/5511939437657?text=EMERGENCIA%20-%20Preciso%20de%20ajuda!" target="_blank" style={{ width:"100%", textDecoration:"none" }}>
          <div style={{ background:"#22c55e", borderRadius:20, padding:"24px 20px", display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(34,197,94,.4)" }}>
            <span style={{ fontSize:40 }}>💬</span>
            <div><p style={{ margin:0, color:"white", fontWeight:900, fontSize:20 }}>SUPORTE MULTI</p><p style={{ margin:0, color:"rgba(255,255,255,.8)", fontSize:14 }}>Chamar no WhatsApp</p></div>
          </div>
        </a>
      </div>
    </div>
  );
}

function SuporteScreen({ onBack }) {
  const [faqOpen, setFaqOpen] = useState(null);
  const faqs = [
    { q: "Como contratar um profissional?", a: "Va em Inicio, escolha a categoria do servico, selecione um profissional e clique em Contratar." },
    { q: "Como funciona o pagamento?", a: "O pagamento e feito via PIX apos a conclusao do servico. Voce so paga quando estiver satisfeito." },
    { q: "Posso cancelar um servico?", a: "Sim, voce pode cancelar antes do profissional iniciar o servico sem custo algum." },
    { q: "Como avaliar um profissional?", a: "Apos a conclusao do servico, voce recebe uma notificacao para avaliar o profissional com 1 a 5 estrelas." },
    { q: "O que e o plano PRO?", a: "O plano PRO e para profissionais que querem aparecer em destaque e receber mais pedidos na plataforma." }
  ];
  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA" }}>
      <div style={{ background:"#007BFF", padding:"20px 16px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer" }}>&larr;</button>
        <h2 style={{ margin:0, color:"white", fontSize:18, fontWeight:800 }}>Suporte e Ajuda</h2>
      </div>
      <div style={{ padding:16 }}>
        <div style={{ background:"white", borderRadius:16, padding:20, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:16, fontWeight:800 }}>Fale com a gente</h3>
          <a href="https://wa.me/5511939437657" target="_blank" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid #F3F4F6", textDecoration:"none", color:"#111" }}>
            <span style={{ fontSize:24 }}>💬</span>
            <div><p style={{ margin:0, fontWeight:700, fontSize:15 }}>WhatsApp</p><p style={{ margin:0, fontSize:12, color:"#6B7280" }}>(11) 93943-7657</p></div>
          </a>
          <a href="mailto:suporte@multifuncao.com.br" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", textDecoration:"none", color:"#111" }}>
            <span style={{ fontSize:24 }}>📧</span>
            <div><p style={{ margin:0, fontWeight:700, fontSize:15 }}>Email</p><p style={{ margin:0, fontSize:12, color:"#6B7280" }}>suporte@multifuncao.com.br</p></div>
          </a>
        </div>
        <div style={{ background:"white", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:16, fontWeight:800 }}>Perguntas Frequentes</h3>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom:"1px solid #F3F4F6" }}>
              <div onClick={() => setFaqOpen(faqOpen===i?null:i)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", cursor:"pointer" }}>
                <p style={{ margin:0, fontWeight:600, fontSize:14 }}>{f.q}</p>
                <span style={{ fontSize:18, color:"#007BFF" }}>{faqOpen===i?"−":"+"}</span>
              </div>
              {faqOpen===i && <p style={{ margin:"0 0 14px", fontSize:13, color:"#6B7280", lineHeight:1.5 }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SegurancaScreen({ onBack }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("multiUser")) || {}; } catch { return {}; } })();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const API = "https://web-production-e103b.up.railway.app";
  const email = user.email || "";
  const btn = { width:"100%", padding:14, background:"#007BFF", color:"white", border:"none", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", marginTop:8 };
  const inp = { width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, marginBottom:16, boxSizing:"border-box" };
  const sendCode = async () => {
    if (!email) return alert("Email nao encontrado");
    setLoading(true);
    await fetch(API+"/api/auth/solicitar-codigo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email}) });
    setLoading(false);
    setStep(2);
  };
  const confirm = async () => {
    if (!code || code.length < 6) return alert("Codigo incompleto");
    if (!password || password.length < 6) return alert("Senha muito curta");
    setLoading(true);
    const r = await fetch(API+"/api/auth/verificar-codigo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,code,newPassword:password}) });
    setLoading(false);
    if (r.ok) { alert("Senha alterada com sucesso!"); onBack(); } else { alert("Codigo invalido"); }
  };
  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA" }}>
      <div style={{ background:"#007BFF", padding:"20px 16px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer" }}>&larr;</button>
        <h2 style={{ margin:0, color:"white", fontSize:18, fontWeight:800 }}>Seguranca e Senha</h2>
      </div>
      <div style={{ padding:16 }}>
        <div style={{ background:"white", borderRadius:16, padding:20, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <p style={{ margin:"0 0 4px", fontSize:12, color:"#6B7280", fontWeight:700, textTransform:"uppercase" }}>Email da conta</p>
          <p style={{ margin:0, fontSize:15, fontWeight:600 }}>{email || "Nao informado"}</p>
        </div>
        <div style={{ background:"white", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16, fontWeight:800 }}>Alterar Senha</h3>
          {step === 1 && <>
            <p style={{ color:"#6B7280", fontSize:14, margin:"0 0 16px" }}>Enviaremos um codigo de verificacao para seu email.</p>
            <button style={btn} onClick={sendCode} disabled={loading}>{loading ? "Enviando..." : "Enviar Codigo"}</button>
          </>}
          {step === 2 && <>
            <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>CODIGO</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} style={{ ...inp, fontSize:22, letterSpacing:6, textAlign:"center" }} />
            <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>NOVA SENHA</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
            <button style={btn} onClick={confirm} disabled={loading}>{loading ? "Verificando..." : "Confirmar"}</button>
          </>}
        </div>
      </div>
    </div>
  );
}

function NotificacoesScreen({ onBack }) {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("multiNotif")) || { servicos: true, whatsapp: false, email: false }; } catch { return { servicos: true, whatsapp: false, email: false }; }
  });
  const toggle = (key) => {
    const novo = { ...prefs, [key]: !prefs[key] };
    setPrefs(novo);
    localStorage.setItem("multiNotif", JSON.stringify(novo));
  };
  const Item = ({ icon, title, sub, k }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 0", borderBottom:"1px solid #F3F4F6" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <div><p style={{ margin:0, fontWeight:700, fontSize:15 }}>{title}</p><p style={{ margin:0, fontSize:12, color:"#6B7280" }}>{sub}</p></div>
      </div>
      <div onClick={() => toggle(k)} style={{ width:48, height:26, borderRadius:13, background:prefs[k]?"#007BFF":"#D1D5DB", cursor:"pointer", position:"relative", transition:"background .2s" }}>
        <div style={{ position:"absolute", top:3, left:prefs[k]?22:3, width:20, height:20, borderRadius:"50%", background:"white", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
      </div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA" }}>
      <div style={{ background:"#007BFF", padding:"20px 16px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer" }}>&larr;</button>
        <h2 style={{ margin:0, color:"white", fontSize:18, fontWeight:800 }}>Notificacoes</h2>
      </div>
      <div style={{ padding:"0 16px", background:"white", margin:16, borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
        <Item icon="🔔" title="Notificacoes de servicos" sub="Avisos quando um profissional aceitar seu pedido" k="servicos" />
        <Item icon="📱" title="Notificacoes por WhatsApp" sub="Receber atualizacoes no WhatsApp" k="whatsapp" />
        <Item icon="📧" title="Notificacoes por email" sub="Receber resumos por email" k="email" />
      </div>
    </div>
  );
}

function RankingScreen({ onBack, contratacoes }) {
  const niveis = [
    { nome:"Bronze", icon:"🥉", min:0, max:3, cor:"#CD7F32", bg:"#FDF3E7", beneficios:["Acesso completo a plataforma","Suporte por chat"] },
    { nome:"Prata", icon:"🥈", min:4, max:9, cor:"#9E9E9E", bg:"#F5F5F5", beneficios:["Badge especial no perfil","Prioridade no suporte","Profissionais veem voce como cliente ativo"] },
    { nome:"Ouro", icon:"🥇", min:10, max:19, cor:"#FFC107", bg:"#FFFDE7", beneficios:["Badge dourado no perfil","Selo Cliente Verificado Multi","Acesso antecipado a novidades"] },
    { nome:"Diamante", icon:"💎", min:20, max:49, cor:"#00BCD4", bg:"#E0F7FA", beneficios:["Badge Diamante exclusivo","Perfil em destaque para profissionais","Convite para grupo VIP no WhatsApp"] },
    { nome:"VIP", icon:"👑", min:50, max:999, cor:"#9C27B0", bg:"#F3E5F5", beneficios:["Badge VIP exclusivo","Linha direta no WhatsApp com a equipe Multi","Acesso beta a funcionalidades novas"] }
  ];
  const atual = niveis.findIndex(n => contratacoes >= n.min && contratacoes <= n.max);
  const nivel = niveis[atual] || niveis[0];
  const proximo = niveis[atual + 1];
  const progresso = proximo ? Math.round(((contratacoes - nivel.min) / (proximo.min - nivel.min)) * 100) : 100;
  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA" }}>
      <div style={{ background:nivel.cor, padding:"20px 16px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:"white", fontSize:22, cursor:"pointer" }}>&larr;</button>
        <h2 style={{ margin:0, color:"white", fontSize:18, fontWeight:800 }}>Clube Multi</h2>
      </div>
      <div style={{ padding:16 }}>
        <div style={{ background:nivel.bg, borderRadius:20, padding:24, textAlign:"center", marginBottom:16, border:"2px solid "+nivel.cor }}>
          <div style={{ fontSize:64 }}>{nivel.icon}</div>
          <h2 style={{ margin:"8px 0 4px", fontSize:28, fontWeight:900, color:nivel.cor }}>{nivel.nome}</h2>
          <p style={{ margin:0, color:"#6B7280", fontSize:14 }}>{contratacoes} contratacoes realizadas</p>
          {proximo && <>
            <div style={{ margin:"16px 0 6px", background:"#E5E7EB", borderRadius:99, height:10, overflow:"hidden" }}>
              <div style={{ width:progresso+"%", height:"100%", background:nivel.cor, borderRadius:99, transition:"width 1s" }} />
            </div>
            <p style={{ margin:0, fontSize:12, color:"#6B7280" }}>Faltam {proximo.min - contratacoes} contratacoes para {proximo.icon} {proximo.nome}</p>
          </>}
          {!proximo && <p style={{ margin:"12px 0 0", fontSize:13, fontWeight:700, color:nivel.cor }}>Voce atingiu o nivel maximo! 🎉</p>}
        </div>
        <div style={{ background:"white", borderRadius:16, padding:20, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:800 }}>Seus beneficios atuais</h3>
          {nivel.beneficios.map((b,i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<nivel.beneficios.length-1?"1px solid #F3F4F6":"none" }}><span style={{ color:nivel.cor, fontSize:18 }}>✓</span><p style={{ margin:0, fontSize:14, color:"#374151" }}>{b}</p></div>)}
        </div>
        <div style={{ background:"white", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, fontWeight:800 }}>Todos os niveis</h3>
          {niveis.map((n,i) => <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<niveis.length-1?"1px solid #F3F4F6":"none", opacity:i>atual?0.4:1 }}><span style={{ fontSize:24 }}>{n.icon}</span><div style={{ flex:1 }}><p style={{ margin:0, fontWeight:700, fontSize:14, color:n.cor }}>{n.nome}</p><p style={{ margin:0, fontSize:12, color:"#6B7280" }}>{n.min === 50 ? "50+ contratacoes" : n.min+" - "+n.max+" contratacoes"}</p></div>{i<=atual && <span style={{ fontSize:18 }}>✅</span>}</div>)}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ role, isPro, userName: initialUserName, showRankingGlobal, onClearRankingGlobal, onUpgrade, onLogout, showToast, onOpenWallet, onOpenAdmin, docStatus, onDocStatusChange, onSwitchRole }) {
  const [avatarUrl, setAvatarUrl] = useState(() => sessionStorage.getItem("multiAvatar") || null);
  const [editMode,  setEditMode]  = useState(false);
  const [name, setName] = useState(initialUserName || "");
  useEffect(() => { if (initialUserName) setName(initialUserName); }, [initialUserName]);
  const [portfolioImgs, setPortfolioImgs] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [showSeguranca, setShowSeguranca] = useState(false);
  const [showSuporte, setShowSuporte] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  useEffect(() => { if (showRankingGlobal) { setShowRanking(true); onClearRankingGlobal?.(); } }, [showRankingGlobal]);
  useEffect(() => {
    const h = () => setShowRanking(true);
    window.addEventListener("openRanking", h);
    return () => window.removeEventListener("openRanking", h);
  }, []);
  const avatarRef = useRef(null);
  const portfolioRef = useRef(null);

  // handle avatar upload
  const handleAvatar = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setAvatarUrl(ev.target.result); sessionStorage.setItem("multiAvatar", ev.target.result); };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  // handle portfolio images
  const handlePortfolio = (e) => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setPortfolioImgs(p => [...p, { id: Date.now() + Math.random(), url: ev.target.result }]);
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const stats = role === "client"
    ? { rating: 4.9, count: 12, label: "contratações" }
    : { rating: 4.8, count: 47, label: "serviços feitos" };

  // ── shared menu row
  const MenuRow = ({ Icon, iconBg, iconColor, label, sub, right, danger, onClick }) => (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", cursor:"pointer", background:"white", borderBottom:"1px solid #F8F8F8" }}>
      <span style={{ width:36, height:36, borderRadius:11, background: danger ? "#FFF0F0" : iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={17} color={ danger ? "#E53935" : iconColor} />
      </span>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:13, fontWeight:800, color: danger ? "#E53935" : "#1a1a2e", marginBottom: sub ? 1 : 0 }}>{label}</p>
        {sub && <p style={{ fontSize:11, color:"#bbb" }}>{sub}</p>}
      </div>
      {right || <ChevronRight size={15} color="#D0D0D0" />}
    </div>
  );

  // ── section header inside profile card list
  const SectionLabel = ({ label }) => (
    <div style={{ padding:"14px 16px 6px", background:BG }}>
      <p style={{ fontSize:10, fontWeight:900, color:"#aaa", textTransform:"uppercase", letterSpacing:1.5 }}>{label}</p>
    </div>
  );

  if (showNotif) return <NotificacoesScreen onBack={() => setShowNotif(false)} />;
  if (showSeguranca) return <SegurancaScreen onBack={() => setShowSeguranca(false)} />;
  if (showSuporte) return <SuporteScreen onBack={() => setShowSuporte(false)} />;
  if (showSOS) return <SOSScreen onBack={() => setShowSOS(false)} />;
  if (showRanking) return <RankingScreen onBack={() => setShowRanking(false)} contratacoes={stats.count || 0} />;
  return (
    <div style={{ display:"flex", flexDirection:"column", paddingBottom:40 }}>

      {/* ── HERO ── */}
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0056c7 100%)`, padding:"28px 20px 36px", position:"relative" }}>
        {/* edit toggle */}
        <button
          onClick={() => { if (editMode) showToast("✅ Perfil salvo!"); setEditMode(e => !e); }}
          style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,.2)", border:"none", borderRadius:99, padding:"6px 14px", color:"white", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          <Pencil size={12} /> {editMode ? "Salvar" : "Editar"}
        </button>

        {/* avatar */}
        <input ref={avatarRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatar} />
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ position:"relative", marginBottom:4 }}>
            <div style={{ width:88, height:88, borderRadius:"50%", background:"rgba(255,255,255,.25)", border:"3px solid rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:"pointer" }}
              onClick={() => editMode && avatarRef.current?.click()}>
              {avatarUrl
                ? <img src={avatarUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="avatar" />
                : <span style={{ fontSize:40 }}>{role === "client" ? "👩" : "👨‍🔧"}</span>}
            </div>
            {editMode && (
              <div onClick={() => avatarRef.current?.click()} style={{ position:"absolute", bottom:0, right:0, width:26, height:26, background:O, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white", cursor:"pointer" }}>
                <Camera size={13} color="white" />
              </div>
            )}
            {/* PRO badge */}
            {isPro && role === "professional" && (
              <div style={{ position:"absolute", top:-4, left:-4, background:"linear-gradient(135deg,#F9A825,#E65100)", borderRadius:99, padding:"3px 8px", display:"flex", alignItems:"center", gap:3 }}>
                <Crown size={10} color="white" /><span style={{ fontSize:9, fontWeight:900, color:"white" }}>PRO</span>
              </div>
            )}
          </div>

          {editMode ? (
            <input value={name} onChange={e => setName(e.target.value)} style={{ fontSize:18, fontWeight:900, color:"white", background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.4)", borderRadius:10, padding:"5px 14px", textAlign:"center", outline:"none", fontFamily:"inherit" }} />
          ) : (
            <h2 style={{ fontSize:20, fontWeight:900, color:"white", margin:0 }}>{name}</h2>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
            <MapPin size={12} color="rgba(255,255,255,.65)" />
                <span style={{ fontSize:12, color:"rgba(255,255,255,.65)", fontWeight:600 }}>{localStorage.getItem("multiLocation") || "Sua localização"}</span>
          </div>

          {/* stats row */}
          <div style={{ display:"flex", gap:0, background:"rgba(255,255,255,.12)", borderRadius:14, overflow:"hidden", marginTop:4 }}>
            {[
              { val: `⭐ ${stats.rating}`, lbl:"Avaliação" },
              { val: stats.count,          lbl: stats.label },
              { val: role === "client" ? "2 anos" : "3 anos",  lbl:"No Multi" },
            ].map((st, i) => (
              <div key={i} style={{ padding:"10px 18px", borderRight: i < 2 ? "1px solid rgba(255,255,255,.15)" : "none", textAlign:"center" }}>
                <p style={{ fontSize:15, fontWeight:900, color:"white", marginBottom:2 }}>{st.val}</p>
                <p style={{ fontSize:10, color:"rgba(255,255,255,.6)", fontWeight:600 }}>{st.lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROFESSIONAL SECTIONS ── */}
      {role === "professional" && (
        <>
          {/* Wallet card — links to full WalletScreen */}
          <div style={{ padding:"0 16px", marginTop:-20, position:"relative", zIndex:2 }}>
            <div onClick={onOpenWallet} style={{ background:"white", borderRadius:20, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,.10)", border:"1px solid #F0F0F0", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Wallet size={20} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:"#aaa", fontWeight:700, margin:0 }}>Saldo disponível</p>
                    <p style={{ fontSize:24, fontWeight:900, color:G, margin:0 }}>R$ 1.240,00</p>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Pendente</p>
                  <p style={{ fontSize:14, fontWeight:800, color:O }}>R$ 680</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid #F0F0F0" }}>
                <span style={{ fontSize:12, color:B, fontWeight:800, display:"flex", alignItems:"center", gap:5 }}>
                  <Wallet size={13} /> Ver Carteira Completa
                </span>
                <ChevronRight size={15} color={B} />
              </div>
            </div>
          </div>

          {/* Autonomy term */}
          <SectionLabel label="Termo de Autonomia" />
          <AutonomyTermCard showToast={showToast} />
          <div style={{ background:"white" }}>
            <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #F8F8F8" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:36, height:36, borderRadius:11, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center" }}><Crown size={17} color={O} /></span>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e" }}>Plano Multi PRO</p>
                  <p style={{ fontSize:11, color: isPro ? G : "#bbb" }}>{isPro ? "✅ Ativo — renova em 15/07/2026" : "❌ Inativo"}</p>
                </div>
              </div>
              {isPro
                ? <span style={{ background:G+"18", color:G, fontWeight:800, fontSize:11, padding:"4px 10px", borderRadius:99 }}>PRO</span>
                : <button onClick={onUpgrade} style={{ background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:800, fontSize:11, padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer" }}>Assinar</button>}
            </div>
          </div>

          {/* Portfolio */}
          <SectionLabel label="Portfólio — Antes e Depois" />
          <div style={{ background:"white", padding:"14px 16px" }}>
            <input ref={portfolioRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handlePortfolio} />
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {portfolioImgs.map(img => (
                <div key={img.id} style={{ width:80, height:80, borderRadius:12, overflow:"hidden", position:"relative", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.10)" }}>
                  <img src={img.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                  <button onClick={() => setPortfolioImgs(p => p.filter(x => x.id !== img.id))} style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,.5)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={10} color="white" />
                  </button>
                </div>
              ))}
              <button onClick={() => portfolioRef.current?.click()} style={{ width:80, height:80, borderRadius:12, border:"2px dashed #DDD", background:BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", color:"#ccc", flexShrink:0 }}>
                <Image size={18} /><span style={{ fontSize:10, fontWeight:700 }}>Adicionar</span>
              </button>
            </div>
            <p style={{ fontSize:11, color:"#bbb", marginTop:10 }}>Mostre antes & depois dos seus melhores trabalhos</p>
          </div>

          {/* Verification */}
          <SectionLabel label="Documentação" />
          <DocumentacaoSection showToast={showToast} docStatus={docStatus} onDocStatusChange={onDocStatusChange} />
        </>
      )}

      {/* ── CLIENT SECTIONS ── */}
      {role === "client" && (
        <>
          <div style={{ padding:"0 16px", marginTop:-20, position:"relative", zIndex:2 }}>
            <div style={{ background:"white", borderRadius:20, padding:"14px 18px", boxShadow:"0 4px 20px rgba(0,0,0,.10)", border:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Serviços contratados</p>
                <p style={{ fontSize:22, fontWeight:900, color:"#1a1a2e" }}>12 <span style={{ fontSize:13, color:"#aaa", fontWeight:600 }}>no total</span></p>
              </div>
              <div style={{ width:1, height:38, background:"#F0F0F0" }} />
              <div style={{ flex:1, textAlign:"right" }}>
                <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Profissionais favoritos</p>
                <p style={{ fontSize:22, fontWeight:900, color:O }}>3</p>
              </div>
            </div>
          </div>

          {/* Addresses — functional */}
          <AddressSection showToast={showToast} />

          {/* Payment cards — functional */}
          <CardSection showToast={showToast} />

          {/* Favorites */}
          <SectionLabel label="Profissionais Favoritos" />
          <div style={{ background:"white" }}>
            {[
              { emoji:"👨‍🔧", name:"Carlos Encanador", cat:"Encanador", rating:4.9 },
              { emoji:"👷",   name:"Pedro Mestre",     cat:"Pedreiro",  rating:4.8 },
              { emoji:"🎨",   name:"Ana Pintora",      cat:"Pintora",   rating:5.0 },
            ].map((fav, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", borderBottom:"1px solid #F8F8F8", cursor:"pointer" }} onClick={() => {}}>
                <div style={{ width:40, height:40, borderRadius:12, background:"#E8F4FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{fav.emoji}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", marginBottom:2 }}>{fav.name}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{fav.cat}</span>
                    <span style={{ color:"#E0E0E0" }}>•</span>
                    <Star size={10} fill="#F9A825" stroke="none" />
                    <span style={{ fontSize:11, fontWeight:700, color:"#888" }}>{fav.rating}</span>
                  </div>
                </div>
                <button style={{ padding:"6px 12px", borderRadius:99, border:`1.5px solid ${B}`, background:"white", color:B, fontSize:11, fontWeight:800, cursor:"pointer" }}>Chamar</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── GENERAL SETTINGS ── */}
      <SectionLabel label="Configurações" />
      <div style={{ background:"white", borderRadius:"0", overflow:"hidden" }}>
        <MenuRow Icon={BellRing}   iconBg="#E8F4FF" iconColor={B}        label="Notificações"      sub="Push e WhatsApp ativos"     onClick={() => setShowNotif(true)} />
        <MenuRow Icon={KeyRound}   iconBg="#F3E5F5" iconColor="#7B1FA2"  label="Segurança e Senha" sub="Última alteração há 3 meses"  onClick={() => setShowSeguranca(true)} />
        <MenuRow Icon={HelpCircle} iconBg="#E8F8EE" iconColor="#2E7D32"  label="Suporte e Ajuda"  sub="Fale com nossa equipe"      onClick={() => setShowSuporte(true)} />
        <MenuRow Icon={Shield}     iconBg="#FFF0EE" iconColor={O}        label="Botão de Pânico"   sub="Emergência — acionar segurança"
          right={<span style={{ background:"#FFF0EE", color:O, fontWeight:800, fontSize:11, padding:"4px 10px", borderRadius:99, border:`1px solid ${O}40` }}>SOS</span>}
          onClick={() => setShowSOS(true)} />
      </div>

      {/* Logout */}
      <SectionLabel label="" />
      <div style={{ background:"white" }}>
        <MenuRow Icon={role === "client" ? Briefcase : Home} iconBg={role === "client" ? "#FFF3E0" : "#EBF4FF"} iconColor={role === "client" ? O : B} label={role === "client" ? "Alternar para Profissional" : "Alternar para Cliente"} sub={role === "client" ? "Ver mural de serviços como profissional" : "Ver como cliente e fazer pedidos"} onClick={() => { const newRole = role === "client" ? "professional" : "client"; onSwitchRole?.(newRole); showToast(newRole === "professional" ? "🔧 Modo Profissional ativado!" : "🏠 Modo Cliente ativado!", newRole === "professional" ? O : B); }} />
        <MenuRow Icon={LogOut} iconBg="#FFF0F0" iconColor="#E53935" label="Sair da Conta" danger onClick={() => { showToast("👋 Até logo!"); setTimeout(onLogout, 1200); }} />
      </div>

      <AdminAccessTrigger onOpenAdmin={onOpenAdmin} />
    </div>
  );
}

/* ───────────────────────── MY SERVICES SCREEN ───────────────────────────────── */
function MyServicesScreen({ myServices, onOpenService, onOpenChat, isPro, initialTab = "open" }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { id:"open",       label:"Aguardando",  color:"#0070F3" },
    { id:"inprogress", label:"Em Andamento", color:O },
    { id:"done",       label:"Concluído",   color:G },
  ];

  const filtered = myServices.filter(s => s.status === tab);

  return (
    <div style={{ display:"flex", flexDirection:"column", paddingBottom:32 }}>
      {/* tab pills */}
      <div style={{ display:"flex", gap:8, padding:"16px 16px 0", overflowX:"auto", scrollbarWidth:"none" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink:0, padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:800,
            border:"none", cursor:"pointer",
            background: tab === t.id ? t.color : "white",
            color: tab === t.id ? "white" : "#aaa",
            boxShadow: tab === t.id ? `0 2px 10px ${t.color}44` : "0 1px 4px rgba(0,0,0,.07)",
          }}>
            {t.label}
            <span style={{ marginLeft:6, background: tab === t.id ? "rgba(255,255,255,.25)" : "#F0F0F0", color: tab === t.id ? "white" : "#aaa", borderRadius:99, padding:"1px 7px", fontSize:10 }}>
              {myServices.filter(s => s.status === t.id).length}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12, padding:"16px 16px 0" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 24px", color:"#ccc" }}>
            <ClipboardList size={36} color="#E0E0E0" style={{ margin:"0 auto 12px", display:"block" }} />
            <p style={{ fontSize:14, fontWeight:700 }}>Nenhum serviço aqui</p>
            <p style={{ fontSize:12, marginTop:4 }}>Poste um novo serviço para começar</p>
          </div>
        )}
        {filtered.map(s => {
          const cat = CATS.find(c => c.id === s.cat);
          const statusColor = s.status === "open" ? B : s.status === "inprogress" ? O : G;
          const statusLabel = s.status === "open" ? "Aguardando propostas" : s.status === "inprogress" ? "Em andamento" : "Concluído";
          return (
            <div key={s.id} style={{ background:"white", borderRadius:16, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)", border:"1px solid #F0F0F0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{cat?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", marginBottom:3 }}>{s.title}</p>
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background: statusColor+"18", color: statusColor }}>{statusLabel}</span>
                </div>
                <span style={{ fontSize:16, fontWeight:900, color:B, flexShrink:0 }}>R$ {s.value}</span>
              </div>

              <p style={{ fontSize:12, color:"#aaa", lineHeight:1.5, marginBottom:12 }}>{s.desc}</p>

              {s.status === "open" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"#aaa" }}>👥 {s.candidates} candidatos</span>
                  <button onClick={() => onOpenService(s)} style={{ padding:"8px 14px", borderRadius:10, border:`1.5px solid ${B}`, background:"white", color:B, fontSize:12, fontWeight:800, cursor:"pointer" }}>Ver Propostas</button>
                </div>
              )}

              {s.status === "inprogress" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👨‍🔧</div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e" }}>{s.pro}</p>
                      <p style={{ fontSize:11, color:"#aaa" }}>Profissional ativo</p>
                    </div>
                  </div>
                  <button onClick={() => onOpenChat(s)} style={{ padding:"8px 14px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    <MessageCircle size={13} /> Chat
                  </button>
                </div>
              )}

              {s.status === "done" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <MiniStars v={s.clientRating || 0} size={14} />
                    <span style={{ fontSize:11, color:"#aaa" }}>{s.clientRating ? `${s.clientRating}.0` : "Não avaliado"}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:G }}>✅ Serviço concluído</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── RATING MODAL ─────────────────────────────────────── */
function RatingModal({ service, onRate, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover,  setHover]  = useState(0);
  const [comment, setComment] = useState("");
  const cat = CATS.find(c => c.id === service.cat);

  const labels = ["", "Ruim", "Regular", "Bom", "Ótimo", "Excelente!"];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:400, background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 40px" }}>
        <div style={{ width:40, height:4, background:"#E0E0E0", borderRadius:99, margin:"0 auto 20px" }} />

        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 10px" }}>{cat?.emoji}</div>
          <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", marginBottom:4 }}>Como foi o serviço?</h3>
          <p style={{ fontSize:13, color:"#aaa" }}>Avalie <strong style={{ color:"#1a1a2e" }}>{service.pro}</strong> pelo trabalho em "{service.title}"</p>
        </div>

        {/* stars */}
        <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:8 }}>
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={40}
              fill={(hover || rating) >= s ? "#F9A825" : "none"}
              stroke={(hover || rating) >= s ? "#F9A825" : "#E0E0E0"}
              style={{ cursor:"pointer", transition:"transform .1s" }}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
            />
          ))}
        </div>
        <p style={{ textAlign:"center", fontSize:14, fontWeight:800, color: rating ? "#F9A825" : "#ccc", marginBottom:16, minHeight:20 }}>
          {labels[hover || rating]}
        </p>

        <textarea
          rows={3}
          placeholder="Deixe um comentário (opcional)…"
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ width:"100%", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1a1a2e", outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5, marginBottom:14 }}
        />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={onClose} style={{ padding:"13px 0", borderRadius:12, border:"1.5px solid #E8E8E8", background:"white", color:"#888", fontWeight:800, fontSize:13, cursor:"pointer" }}>
            Agora não
          </button>
          <button onClick={() => rating > 0 && onRate(rating, comment)} style={{ padding:"13px 0", borderRadius:12, border:"none", background: rating > 0 ? `linear-gradient(135deg,#F9A825,#E65100)` : "#F0F0F0", color: rating > 0 ? "white" : "#ccc", fontWeight:800, fontSize:13, cursor: rating > 0 ? "pointer" : "default", boxShadow: rating > 0 ? "0 4px 14px rgba(249,168,37,.35)" : "none" }}>
            Enviar Avaliação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── CHAT INBOX ──────────────────────────────────────── */
function ChatInbox({ myServices, onOpenChat }) {
  const active = myServices.filter(s => s.status === "inprogress" || s.status === "done");
  return (
    <div style={{ display:"flex", flexDirection:"column", paddingBottom:32 }}>
      <div style={{ padding:"18px 16px 12px" }}>
        <h2 style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", margin:0 }}>Mensagens</h2>
        <p style={{ fontSize:12, color:"#aaa", marginTop:2 }}>{active.length} conversa{active.length !== 1 ? "s" : ""} ativa{active.length !== 1 ? "s" : ""}</p>
      </div>
      {active.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 24px", color:"#ccc" }}>
          <MessageCircle size={40} color="#E0E0E0" style={{ margin:"0 auto 14px", display:"block" }} />
          <p style={{ fontSize:14, fontWeight:700 }}>Nenhuma conversa ainda</p>
          <p style={{ fontSize:12, marginTop:4 }}>As conversas aparecem quando você aceitar uma proposta.</p>
        </div>
      )}
      {active.map(s => {
        const cat = CATS.find(c => c.id === s.cat);
        const unread = s.status === "inprogress";
        return (
          <div key={s.id} onClick={() => onOpenChat(s)} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 16px", borderBottom:"1px solid #F4F4F6",
            background:"white", cursor:"pointer",
          }}>
            {/* avatar with online dot */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:48, height:48, borderRadius:15, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{cat?.emoji}</div>
              {s.status === "inprogress" && (
                <span style={{
                  position:"absolute", bottom:1, right:1,
                  width:12, height:12, borderRadius:"50%",
                  background:G, border:"2px solid white",
                }} />
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:3 }}>
                <p style={{ fontWeight:800, fontSize:14, color:"#1a1a2e" }}>{s.pro || "Profissional"}</p>
                <span style={{ fontSize:11, color:"#bbb" }}>Agora</span>
              </div>
              <p style={{ fontSize:12, color: unread ? "#555" : "#aaa", fontWeight: unread ? 700 : 400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {s.status === "inprogress" ? `Orçamento R$ ${s.proposalValue || s.value} confirmado 👍` : "✅ Serviço concluído"}
              </p>
              <p style={{ fontSize:11, color:"#bbb", marginTop:2 }}>{s.title}</p>
            </div>
            {unread && (
              <span style={{ width:10, height:10, borderRadius:"50%", background:O, flexShrink:0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}


function PixQRChat({ valor }) {
  React.useEffect(() => {
    fetch('https://web-production-e103b.up.railway.app/api/gerar-pix-servico', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ value: parseFloat(String(valor).replace(',','.')), name:'Cliente', email:'cliente@multi.com', phone:'11999999999' })
    }).then(r=>r.json()).then(d=>{
      const el = document.getElementById('pix-qr-img');
      const txt = document.getElementById('pix-qr-txt');
      if(d.qrCodeBase64 && el) {
        el.src = 'data:image/png;base64,'+d.qrCodeBase64;
        el.style.display = 'block';
        if(txt) txt.style.display = 'none';
      }
    }).catch(()=>{});
  }, []);
  return <div style={{width:200,height:200,margin:'0 auto',background:'white',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
    <span id='pix-qr-txt' style={{fontSize:12,color:'#888'}}>Gerando...</span>
    <img id='pix-qr-img' alt='QR PIX' style={{width:200,height:200,display:'none'}} />
  </div>;
}

function EnhancedChatScreen({ chat, onBack, onFinishService, isPro, contactUnlocked }) {
  const initMsgs = [
    { id:1, from:"pro",    text:"Olá! Vi seu serviço e posso ajudar. Tenho 8 anos de experiência na área.", time:"10:01", read:true  },
    { id:2, from:"client", text:"Ótimo! Qual seria o prazo e o valor para o serviço?",                      time:"10:03", read:true  },
    { id:3, from:"pro",    text:`Consigo fazer por R$ ${chat.proposalValue || "250"}. Posso ir amanhã às 9h, se preferir.`, time:"10:04", read:true },
  ];

  const [messages,        setMessages]        = useState(chat.messages?.length ? chat.messages : initMsgs);
  const [text,            setText]            = useState("");
  const [dealAccepted,    setDealAccepted]    = useState(false);
    const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [paymentDone,       setPaymentDone]       = useState(false);
  const [paymentStep,       setPaymentStep]       = useState("choose");
  const [chatQrBase64, setChatQrBase64] = useState("");
  const [chatQrLoading, setChatQrLoading] = useState(false);
  const [chatQrKey, setChatQrKey] = useState(0);
  const [isTyping,        setIsTyping]        = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finished,        setFinished]        = useState(false);
  const [showDealForm,    setShowDealForm]    = useState(false);

  // Deal form state
  const [dealValue, setDealValue] = useState(chat.proposalValue || "250");
  const [dealDate,  setDealDate]  = useState("");
  const [dealDesc,  setDealDesc]  = useState("");

  const endRef  = useRef(null);
  const inputRef = useRef(null);

  const nowStr = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isTyping]);

  const proRespond = (reply, delay = 800) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(m => [...m, { id: Date.now(), from:"pro", text: reply, time: nowStr(), read:false }]);
      setTimeout(() => setMessages(m => m.map(x => ({ ...x, read: true }))), 1500);
    }, delay);
  };

  const pushClient = (msgText) => {
    setMessages(m => [...m, { id: Date.now(), from:"client", text: msgText, time: nowStr(), read:false }]);
  };

  const sendText = () => {
    if (!text.trim()) return;
    pushClient(text.trim());
    setText("");
    proRespond("Entendido! Fico à disposição. 👍");
  };

  // ── SEND FINAL DEAL (pro action) ──
  const handleSendDeal = () => {
    if (!dealValue || !dealDate || !dealDesc) return;
    setShowDealForm(false);
    setMessages(m => [...m, {
      id: Date.now(), from:"pro", time: nowStr(), read:false,
      type:"deal",
      deal: { value: dealValue, date: dealDate, desc: dealDesc },
    }]);
  };

  // ── CLIENT CONFIRMS THE DEAL ──
  const handleConfirmDeal = () => {
    setDealAccepted(true);
    setMessages(m => m.map(x => x.type === "deal" ? { ...x, deal: { ...x.deal, accepted:true } } : x));
    pushClient("✅ Acordo confirmado! Serviço garantido pelo Multi.");
    if (dealValue) { chat.dealValue = dealValue; }
    proRespond("Perfeito! Acordo fechado. Estarei no local no horário combinado. Até logo! 🤝", 1000);
  };

  const smartReplies = dealAccepted
    ? ["Pode vir agora?", "Traga os materiais", "Até amanhã!"]
    : ["Qual o valor total?", "Aceito!", "Pode vir agora?"];

  const handleSmartReply = (reply) => {
    pushClient(reply);
    if (reply === "Aceito!") {
      proRespond(`Perfeito! Combinado por R$ ${chat.proposalValue || "250"}. Nos vemos em breve! 🤝`, 900);
    } else if (reply === "Qual o valor total?") {
      proRespond(`O valor total é R$ ${chat.proposalValue || "250"}, incluindo mão de obra e materiais básicos.`);
    } else if (reply === "Pode vir agora?") {
      proRespond("Sim! Consigo chegar em aproximadamente 30 minutos. 🚗");
    } else {
      proRespond("Ótimo! Combinado então. 👍");
    }
  };

  const handleToolbar = (action) => {
    if (action === "photo") {
      pushClient("📷 Foto enviada — [imagem do problema]");
      proRespond("Recebi a foto! Já consigo avaliar. Pode deixar que resolvo.");
    } else if (action === "location") {
      pushClient("📍 Localização: Rua das Flores, 123 — sua região");
      proRespond("Já conheço essa região. Estarei aí no horário combinado! 🗺️");
    } else if (action === "budget") {
      pushClient(`💳 Solicitando resumo do orçamento — R$ ${chat.proposalValue || "250"}`);
      proRespond(`Orçamento: R$ ${chat.proposalValue || "250"}\nServiço: ${chat.serviceTitle}\nPrazo: 2-3 horas\nInclui: mão de obra + materiais básicos`);
    } else if (action === "deal") {
      setShowDealForm(true);
    }
  };

  const handleFinish = () => {
    setFinished(true);
    setShowFinishConfirm(false);
    pushClient("🏁 Serviço marcado como concluído!");
    proRespond("Foi um prazer! Obrigado pela confiança. 🙏", 600);
    setTimeout(() => onFinishService(), 1800);
  };

  // ─── FINISH CONFIRM OVERLAY ───
  if (showFinishConfirm) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"calc(100vh - 130px)", padding:24, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:G+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <Check size={36} color={G} />
        </div>
        <h3 style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", marginBottom:8 }}>Serviço concluído!</h3>
        <p style={{ fontSize:14, color:"#888", lineHeight:1.6, marginBottom:28 }}>
          Deseja avaliar <strong style={{ color:"#1a1a2e" }}>{chat.proName}</strong> agora?<br/>Sua avaliação ajuda outros clientes.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, width:"100%" }}>
          <button onClick={() => { setShowFinishConfirm(false); onFinishService(); }} style={{ padding:"14px 0", borderRadius:14, border:"1.5px solid #E8E8E8", background:"white", color:"#888", fontWeight:800, fontSize:14, cursor:"pointer" }}>Agora não</button>
          <button onClick={handleFinish} style={{ padding:"14px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#F9A825,#E65100)", color:"white", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 4px 14px rgba(249,168,37,.3)" }}>⭐ Avaliar</button>
        </div>
      </div>
    );
  }

  // ── PAYMENT MODAL ────────────────────────────────────────────────────────
  if (showPaymentModal) {
    const serviceValue = chat.dealValue || chat.serviceValue || chat.proposalValue || "150,00";

    // Step: choose payment method
    if (paymentStep === "choose") return (
      <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column" }}>
        <div style={{ background:"white", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #EEEEF2", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
          <button onClick={() => setShowPaymentModal(false)} style={{ background:"#F5F6FA", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ArrowLeft size={18} color="#555" />
          </button>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Pagamento em Custódia</p>
            </div>
            <p style={{ fontSize:11, color:"#22c55e", fontWeight:700, margin:0 }}>Dinheiro liberado só após conclusão</p>
          </div>
        </div>

        <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Order summary */}
          <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", border:"1px solid #EEEEF2" }}>
            <p style={{ fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 10px" }}>Resumo do Serviço</p>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:46, height:46, borderRadius:14, background:"#EBF4FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔧</div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:900, color:"#1a1a2e", margin:"0 0 2px" }}>{chat.serviceTitle}</p>
                <p style={{ fontSize:12, color:"#aaa", margin:0 }}>com {chat.proName}</p>
              </div>
              <p style={{ fontSize:20, fontWeight:900, color:B, margin:0 }}>R$ {serviceValue}</p>
            </div>
          </div>

          {/* Custody explanation */}
          <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:14, padding:"12px 14px", display:"flex", gap:10 }}>
            <Shield size={18} color={G} style={{ flexShrink:0 }} />
            <p style={{ fontSize:12, color:"#166534", fontWeight:700, margin:0, lineHeight:1.6 }}>
              O valor fica <strong>retido com segurança</strong> até você confirmar a conclusão do serviço. Só então o profissional recebe.
            </p>
          </div>

          <p style={{ fontSize:11, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.5, margin:"4px 0 0" }}>Escolha como pagar</p>

          {/* PIX option */}
          <div onClick={() => setPaymentStep("pix")} style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(0,122,255,.12)", border:`2px solid ${B}`, cursor:"pointer" }}>
            <div style={{ background:`linear-gradient(135deg,${B},#0055d4)`, padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13 }}>⚡</span>
                <span style={{ fontSize:12, fontWeight:900, color:"white" }}>RECOMENDADO</span>
              </div>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.8)", fontWeight:700 }}>Sem taxas · Imediato</span>
            </div>
            <div style={{ padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#32BCAD,#1BA79B)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                  <path d="M8 8L16 16m0 0l8 8M16 16l8-8M16 16l-8 8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px" }}>Pagar com PIX</p>
                <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 4px" }}>QR Code gerado na hora · Prof. recebe em D+1</p>
                <span style={{ fontSize:10, fontWeight:800, color:"#22c55e", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:99, padding:"2px 8px" }}>Sem taxas ✅</span>
              </div>
              <ChevronRight size={18} color="#aaa" />
            </div>
          </div>

          {/* Credit card option */}
          <div onClick={() => setPaymentStep("card_credit")} style={{ background:"white", borderRadius:20, border:"1.5px solid #E5E7EB", cursor:"pointer", overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"#F3E8FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <CreditCard size={24} color="#7C3AED" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px" }}>Cartão de Crédito</p>
                <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 4px" }}>Parcele em até 12x · Prof. recebe em D+2</p>
                <span style={{ fontSize:10, fontWeight:800, color:"#F59E0B", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:99, padding:"2px 8px" }}>Taxa 3% descontada do profissional</span>
              </div>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <div style={{ background:"#1A1F71", borderRadius:4, padding:"2px 6px" }}><span style={{ fontSize:9, fontWeight:900, color:"white", fontStyle:"italic" }}>VISA</span></div>
                <div style={{ display:"flex" }}><div style={{ width:16, height:16, borderRadius:"50%", background:"#EB001B" }}/><div style={{ width:16, height:16, borderRadius:"50%", background:"#F79E1B", marginLeft:-6 }}/></div>
                <ChevronRight size={18} color="#aaa" />
              </div>
            </div>
          </div>

          {/* Debit card option */}
          <div onClick={() => setPaymentStep("card_debit")} style={{ background:"white", borderRadius:20, border:"1.5px solid #E5E7EB", cursor:"pointer", overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ padding:"16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:"#E0F2FE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <CreditCard size={24} color="#0277BD" />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px" }}>Cartão de Débito</p>
                <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 4px" }}>Débito direto na conta · Prof. recebe em D+1</p>
                <span style={{ fontSize:10, fontWeight:800, color:"#22c55e", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:99, padding:"2px 8px" }}>Sem taxas adicionais ✅</span>
              </div>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <div style={{ background:"#FFD200", borderRadius:4, padding:"2px 6px" }}><span style={{ fontSize:9, fontWeight:900, color:"#1a1a2e" }}>elo</span></div>
                <ChevronRight size={18} color="#aaa" />
              </div>
            </div>
          </div>

          {/* Security footer */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"8px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>Pagamento 100% Seguro</span>
            </div>
            <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0 }}>Processado pelo Asaas · SSL 256-bit</p>
          </div>
        </div>
      </div>
    );

    // Step: PIX payment
    if (paymentStep === "pix") return (
      <div style={{ minHeight:"100vh", background:"#F5F6FA", display:"flex", flexDirection:"column" }}>
        <div style={{ background:"white", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #EEEEF2" }}>
          <button onClick={() => setPaymentStep("choose")} style={{ background:"#F5F6FA", border:"none", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ArrowLeft size={18} color="#555" />
          </button>
          <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Pagar com PIX</p>
        </div>
        <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14, alignItems:"center" }}>
          <div style={{ background:"white", borderRadius:20, padding:20, width:"100%", textAlign:"center", boxShadow:"0 3px 16px rgba(0,0,0,.09)" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#888", margin:"0 0 16px" }}>Escaneie com o app do seu banco</p>
            <div style={{width:200,height:200,margin:"0 auto 8px",background:"#F0F0F0",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#888"}}>{chatQrLoading ? "Gerando..." : chatQrBase64 ? <img src={"data:image/jpeg;base64,"+chatQrBase64} alt="QR PIX" style={{width:196,height:196,display:"block",margin:"0 auto",borderRadius:8}} /> : <span style={{fontSize:12,color:"#aaa"}}>QR Code PIX</span>}</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:99, padding:"5px 14px", marginBottom:16 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:G }} />
              <span style={{ fontSize:11, fontWeight:800, color:"#166534" }}>Aguardando pagamento — R$ {serviceValue}</span>
            </div>
            <div style={{ background:"#F8FAFF", border:"1px solid #DBEAFE", borderRadius:12, padding:"10px 12px", display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#3B82F6", margin:"0 0 2px", textTransform:"uppercase", letterSpacing:.8 }}>Ou copie a chave PIX</p>
                <p style={{ fontSize:11, fontWeight:800, color:"#1E3A8A", margin:0, fontFamily:"monospace" }}>contato@multifuncao.com.br</p>
              </div>
              <button onClick={() => navigator.clipboard?.writeText("contato@multifuncao.com.br")} style={{ padding:"7px 14px", borderRadius:9, border:"none", background:B, color:"white", fontWeight:800, fontSize:12, cursor:"pointer" }}>Copiar</button>
            </div>
            <button
              onClick={() => { setPaymentDone(true); setPaymentStep("done"); setShowPaymentModal(false); }}
              style={{ width:"100%", padding:"14px 0", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:900, fontSize:14, boxShadow:`0 5px 18px ${G}44` }}>
              ✅ Já fiz o pagamento
            </button>
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
