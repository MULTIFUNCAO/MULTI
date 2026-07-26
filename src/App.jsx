import { APP_VERSION } from "./AppVersion.js";
// BUILD_V4: 1779569710293 /* REBUILD_1779588782385 */
import CheckoutPagamento from './CheckoutPagamento';
//already from "./PixQRCode";
import ChatWidget from './ChatWidget';
﻿import { playNewOrderSound, stopNewOrderSound } from './newOrderSound';
import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
const supabase=createClient('https://nlpfjkxqypveontunrxj.supabase.co','sb_publishable_xPCSGVYs-yI7TGS1F2EhFg_x7lMm30Q');

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
  BellRing, BadgeCheck, Users, ShieldCheck,
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

/* ───────────────────────── ONESIGNAL ─────────────────────────────────────── */
// Pede permissão de push e devolve o subscription id (player_id) do navegador
// atual, ou null se o SDK não carregar / o usuário recusar. Usado quando a
// empresa ou o profissional ficam online, pra salvar o player_id em
// empresas.onesignal_player_id / usuarios.onesignal_player_id.
function getOneSignalPlayerId() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(null); return; }
    let done = false;
    const finish = (id) => { if (!done) { done = true; resolve(id); } };
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        finish(OneSignal.User.PushSubscription.id || null);
      } catch {
        finish(null);
      }
    });
    setTimeout(() => finish(null), 8000);
  });
}

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

/* usuarios.categoria_servico / empresas.categoria_servico agora são text[]
   (ver supabase_categorias_multiplas_migration.sql) — resolve uma lista de
   ids pros objetos completos de CATS, tolerando o formato antigo (string
   única) pra linhas que por algum motivo não passaram pela migration. */
function resolveCats(ids) {
  if (!ids) return [];
  const arr = Array.isArray(ids) ? ids : [ids];
  return arr
    .map(id => CATS.find(c => c.id === id?.toLowerCase()) || CATS.find(c => c.label?.toLowerCase() === id?.toLowerCase()))
    .filter(Boolean);
}

// Reputação de longo prazo — calculada ao vivo (sem coluna de cache, mesmo
// raciocínio de "Minha Rede": evita dessincronizar) a partir de avaliacoes +
// pedidos. Soma pedidos como cliente + como profissional/empresa (visão de
// confiabilidade geral na plataforma, não separada por papel). Simétrico:
// funciona igual pra qualquer email, dos dois lados.
async function fetchReputacao(email) {
  if (!email) return { mediaEstrelas: null, totalAvaliacoes: 0, concluidos: 0, taxaConclusao: null };
  try {
    const [{ data: avals }, { data: comoCliente }, { data: comoProfissional }] = await Promise.all([
      supabase.from("avaliacoes").select("estrelas").eq("avaliado_email", email),
      supabase.from("pedidos").select("status").eq("cliente_id", email),
      supabase.from("pedidos").select("status").eq("profissional_aceito", email),
    ]);
    const todos = [...(comoCliente || []), ...(comoProfissional || [])];
    const concluidos = todos.filter(p => p.status === "concluido").length;
    const cancelados = todos.filter(p => p.status === "cancelado").length;
    const disputas   = todos.filter(p => p.status === "em_disputa").length;
    const totalTerminado = concluidos + cancelados + disputas;
    return {
      mediaEstrelas: avals?.length ? avals.reduce((s, a) => s + (a.estrelas || 0), 0) / avals.length : null,
      totalAvaliacoes: avals?.length || 0,
      concluidos,
      taxaConclusao: totalTerminado ? concluidos / totalTerminado : null,
    };
  } catch {
    return { mediaEstrelas: null, totalAvaliacoes: 0, concluidos: 0, taxaConclusao: null };
  }
}

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

// Reputação de longo prazo — estrela como número principal, volume e taxa de
// conclusão como texto de apoio (transparente, sem score único opaco que
// esconda de onde vêm os números). null = sem dado ainda, não renderiza nada.
function ReputacaoBadge({ mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }) {
  if (mediaEstrelas == null && !concluidos) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
      {mediaEstrelas != null && (
        <div style={{ display:"flex", alignItems:"center", gap:3, background:"#FFF8E7", border:"1px solid #FDE68A", borderRadius:99, padding:"3px 8px" }}>
          <Star size={12} color="#F9A825" fill="#F9A825" />
          <span style={{ fontSize:11, fontWeight:800, color:"#92400E" }}>{mediaEstrelas.toFixed(1)}</span>
          {totalAvaliacoes > 0 && <span style={{ fontSize:10, color:"#92400E99" }}>({totalAvaliacoes})</span>}
        </div>
      )}
      {!!concluidos && (
        <span style={{ fontSize:10.5, color:"#888" }}>
          {concluidos} concluído{concluidos > 1 ? "s" : ""}{taxaConclusao != null ? ` · ${Math.round(taxaConclusao * 100)}% concluídos` : ""}
        </span>
      )}
    </div>
  );
}

// Fotos da confirmação de conclusão (Fase 4.5) — só nesta tela de detalhe,
// visível pros dois lados; nada de aparecer em perfil público ou outro lugar.
function FotosConclusao({ cliente, profissional }) {
  const temCliente = Array.isArray(cliente) && cliente.length > 0;
  const temProfissional = Array.isArray(profissional) && profissional.length > 0;
  if (!temCliente && !temProfissional) return null;
  return (
    <div style={{ background:"white", borderRadius:20, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
      <p style={{ fontSize:11, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>Fotos da conclusão</p>
      {temCliente && (
        <>
          {temProfissional && <p style={{ fontSize:11, fontWeight:700, color:"#888", margin:"0 0 6px" }}>Do cliente</p>}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: temProfissional ? 12 : 0 }}>
            {cliente.map((url, i) => <img key={i} src={url} style={{ width:64, height:64, borderRadius:10, objectFit:"cover" }} alt="" />)}
          </div>
        </>
      )}
      {temProfissional && (
        <>
          {temCliente && <p style={{ fontSize:11, fontWeight:700, color:"#888", margin:"0 0 6px" }}>Do profissional</p>}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {profissional.map((url, i) => <img key={i} src={url} style={{ width:64, height:64, borderRadius:10, objectFit:"cover" }} alt="" />)}
          </div>
        </>
      )}
    </div>
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

function AuthHeader({ isPro, notifCount, userRole, onAlerts, userLocation = "Sua localização", onToggleRole }) {
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
          <span style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:700,cursor:"pointer" }} onClick={function(){var nr=localStorage.getItem("multiMode")==="professional"?"client":"professional";try{var s=JSON.parse(localStorage.getItem("multiSession")||"{}")||{};s.role=nr;localStorage.setItem("multiSession",JSON.stringify(s));localStorage.setItem("multiMode",nr);}catch(x){}window.location.reload();}}>Modo: {localStorage.getItem("multiMode")==="professional"?"Profissional (toque p/ alternar)":"Cliente (toque p/ alternar)"}</span>
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
    return <AuthHeader isPro={isPro} notifCount={notifCount} userRole={userRole} onToggleRole={onToggleRole} onAlerts={onAlerts} userLocation={localStorage.getItem("multiLocation") || userLocation} />;
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
          <button onClick={handleSend} style={{ padding:"13px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,#FF7043,#E64A19)`, color:"white", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"0 4px 14px rgba(255,87,34,.3)" }}>
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
/* ───────────────────────── EMPRESA PROFILE SCREEN ───────────────────────────── */
function EmpresaProfileScreen({ empresa, onBack, onLogout }) {
  const cats = resolveCats(empresa.categoria_servico);
  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f5" }}>
      <div style={{ background:"linear-gradient(135deg,#1565C0,#0D47A1)", padding:"40px 20px 60px", textAlign:"center", position:"relative" }}>
        {onBack && (
          <button onClick={onBack} style={{ position:"absolute", top:16, left:16, background:"rgba(255,255,255,.2)", border:"none", borderRadius:20, padding:"6px 14px", color:"white", cursor:"pointer", fontSize:14 }}>← Voltar</button>
        )}
        <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", background:"rgba(255,255,255,.2)", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
          {empresa.logo_url
            ? <img src={empresa.logo_url} alt={empresa.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <Briefcase size={36} color="white" />}
        </div>
        <h2 style={{ color:"white", margin:"0 0 8px", fontSize:22 }}>{empresa.nome}</h2>
        <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:"rgba(255,255,255,.18)", borderRadius:99, padding:"4px 10px" }}>
          <ShieldCheck size={12} color="white" />
          <span style={{ color:"white", fontSize:12, fontWeight:700 }}>Empresa Parceira</span>
        </div>
      </div>
      <div style={{ padding:"16px", marginTop:-20 }}>
        {empresa.descricao && (
          <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>Sobre a empresa</h3>
            <p style={{ margin:0, fontSize:13, color:"#555", lineHeight:1.6 }}>{empresa.descricao}</p>
          </div>
        )}
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>{cats.length > 1 ? "Categorias" : "Categoria"}</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {cats.length ? cats.map(c => (
              <span key={c.id} style={{ fontSize:13, color:"#1565C0", fontWeight:700, background:"#EBF4FF", borderRadius:99, padding:"5px 12px" }}>{c.emoji} {c.label}</span>
            )) : <span style={{ fontSize:14, color:"#555" }}>—</span>}
          </div>
        </div>
        {empresa.cnpj && (
          <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:20, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>CNPJ</h3>
            <div style={{ fontSize:14, color:"#555", fontWeight:700 }}>{empresa.cnpj}</div>
          </div>
        )}
        {empresa.telefone_contato && !onLogout && (
          <a href={`https://wa.me/55${empresa.telefone_contato.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"16px", borderRadius:16, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:16, cursor:"pointer", boxShadow:"0 4px 12px rgba(37,211,102,.4)", textDecoration:"none", boxSizing:"border-box" }}>
            <MessageCircle size={18} /> Chamar no WhatsApp
          </a>
        )}
        {onLogout && (
          <div onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", cursor:"pointer", background:"white", borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <span style={{ width:36, height:36, borderRadius:11, background:"#FFF0F0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <LogOut size={17} color="#E53935" />
            </span>
            <p style={{ fontSize:13, fontWeight:800, color:"#E53935", margin:0 }}>Sair da Conta</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Card de empresa parceira — usado no RadarSearchScreen (resultado de busca) e
   no preview "Como você aparece pros clientes" do EmpresaHomeScreen. */
function EmpresaCard({ emp, onVerPerfil }) {
  const isOnline = emp.status === true;
  const [reputacao, setReputacao] = useState(null);
  useEffect(() => { if (emp.email) fetchReputacao(emp.email).then(setReputacao); }, [emp.email]);
  return (
    <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 20px rgba(0,0,0,.08)", border:"1px solid #F0F0F0", padding:"14px 16px", opacity: isOnline ? 1 : .7 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ width:52, height:52, borderRadius:16, overflow:"hidden", background:"#F8F9FA", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {emp.logo_url
            ? <img src={emp.logo_url} alt={emp.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <Briefcase size={24} color="#aaa" />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3, flexWrap:"wrap" }}>
            <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>{emp.nome}</p>
            <span style={{ display:"flex", alignItems:"center", gap:3, background:"#E8F4FF", border:"1px solid #B8DBFF", borderRadius:99, padding:"2px 8px" }}>
              <ShieldCheck size={11} color={B} />
              <span style={{ fontSize:10, fontWeight:800, color:B }}>Empresa Parceira</span>
            </span>
            {!isOnline && (
              <span style={{ background:"#F3F4F6", border:"1px solid #E5E7EB", color:"#6B7280", fontSize:10, fontWeight:800, borderRadius:99, padding:"2px 8px" }}>
                Fechado no momento
              </span>
            )}
          </div>
          {emp.descricao && <p style={{ fontSize:12, color:"#888", margin:0 }}>{emp.descricao}</p>}
          {reputacao && <div style={{ marginTop:4 }}><ReputacaoBadge {...reputacao} /></div>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns: emp.telefone_contato ? "1fr 1fr" : "1fr", gap:9 }}>
        <button onClick={() => onVerPerfil?.(emp)} style={{ padding:"12px 0", borderRadius:12, border:`1.5px solid ${B}`, background:"white", color:B, fontWeight:800, fontSize:12, cursor:"pointer" }}>
          VER PERFIL
        </button>
        {emp.telefone_contato && (
          <a href={`https://wa.me/55${emp.telefone_contato.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"12px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:12 }}>
            <MessageCircle size={14} /> Chamar no WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA HOME (área logada, somente leitura) ─────────── */
function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "há 1 dia";
  if (diffD < 7) return `há ${diffD} dias`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function EmpresaHomeScreen({ userEmail, onLogout, showToast, onGoToPedidos, onGoToEditar, onGoToBanco, onGoToRede, onGoToNovaDemanda, onGoToMinhasDemandas }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [pedidosCount, setPedidosCount] = useState(0);
  const [pedidosPreview, setPedidosPreview] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("empresas").select("*").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        setEmpresa(data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => {
    if (!empresa?.categoria_servico?.length) { setLoadingPedidos(false); return; }
    setLoadingPedidos(true);
    Promise.all([
      supabase.from("pedidos").select("id", { count:"exact", head:true })
        .in("categoria", empresa.categoria_servico)
        .eq("status", "aberto"),
      supabase.from("pedidos").select("*")
        .in("categoria", empresa.categoria_servico)
        .eq("status", "aberto")
        .order("created_at", { ascending:false })
        .limit(3),
    ]).then(([countRes, listRes]) => {
      setPedidosCount(countRes.count || 0);
      setPedidosPreview(listRes.data || []);
      setLoadingPedidos(false);
    }).catch(() => {
      setPedidosCount(0);
      setPedidosPreview([]);
      setLoadingPedidos(false);
    });
  }, [empresa?.categoria_servico]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5f5" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width:32, height:32, border:`3px solid ${B}33`, borderTopColor:B, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f5f5f5", padding:32, textAlign:"center" }}>
        <p style={{ fontSize:14, color:"#6B7280", marginBottom:20 }}>Não encontramos os dados da sua empresa.</p>
        <button onClick={onLogout} style={{ padding:"12px 24px", borderRadius:14, border:"none", background:"#E53935", color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>Sair da Conta</button>
      </div>
    );
  }

  if (showFullPreview) {
    return <EmpresaProfileScreen empresa={empresa} onBack={() => setShowFullPreview(false)} />;
  }

  const isOnline = empresa.status === true;
  const cats = resolveCats(empresa.categoria_servico);
  const catsLabel = cats.map(c => c.label).join(", ");

  const handleToggleOnline = async () => {
    const next = !empresa.status;
    setEmpresa(e => ({ ...e, status: next }));
    setTogglingStatus(true);
    const updates = { status: next };
    if (next) {
      const playerId = await getOneSignalPlayerId();
      if (playerId) updates.onesignal_player_id = playerId;
    }
    const { error } = await supabase.from("empresas").update(updates).eq("id", empresa.id);
    setTogglingStatus(false);
    if (error) {
      setEmpresa(e => ({ ...e, status: !next }));
      showToast?.("❌ Erro ao atualizar status: " + (error.message || ""), "#DC2626");
    } else {
      setEmpresa(e => ({ ...e, ...updates }));
      showToast?.(next ? "✅ Você está online!" : "Você ficou offline", next ? G : "#6B7280");
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f5", paddingBottom:40 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
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

      <div style={{ padding:"16px 16px 0" }}>

        {/* ── CARD DE DESTAQUE — tom grafite/corporativo, compacto, logo ao lado do nome ── */}
        <div style={{ borderRadius:20, overflow:"hidden", position:"relative", boxShadow:"0 8px 24px rgba(15,23,42,.22)", marginBottom:16 }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#1F2937 0%,#374151 100%)" }} />

          <div style={{ position:"relative", zIndex:1, padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, overflow:"hidden", background:"rgba(255,255,255,.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {empresa.logo_url
                  ? <img src={empresa.logo_url} alt={empresa.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <Briefcase size={20} color="rgba(255,255,255,.7)" />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:16, fontWeight:800, color:"white", margin:"0 0 4px", lineHeight:1.25 }}>{empresa.nome}</p>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.6)" }}>
                    {cats.map(c => c.emoji).join(" ")} {catsLabel || "—"}
                  </span>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"rgba(255,255,255,.1)", borderRadius:99, padding:"2px 7px" }}>
                    <ShieldCheck size={10} color="#4ade80" />
                    <span style={{ color:"#4ade80", fontSize:10, fontWeight:800 }}>Verificado</span>
                  </span>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background: isOnline ? G : "#6B7280" }} />
                <span style={{ fontSize:10, fontWeight:800, color: isOnline ? G : "#9CA3AF", textTransform:"uppercase", letterSpacing:1 }}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleOnline}
              disabled={togglingStatus}
              className={isOnline ? "pulse-online" : "pulse-offline"}
              style={{
                width:"100%", padding:"13px 0", borderRadius:14, border:"none", cursor: togglingStatus ? "default" : "pointer",
                background: isOnline ? `linear-gradient(135deg,${G},#16a34a)` : "rgba(255,255,255,.1)",
                color: isOnline ? "white" : "#9CA3AF",
                fontWeight:900, fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                transition:"background .3s, color .3s",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
                <path d="M7.76 7.76a6 6 0 0 0 0 8.49"/>
                <path d="M20.49 3.51a12 12 0 0 1 0 16.97"/>
                <path d="M3.51 3.51a12 12 0 0 0 0 16.97"/>
              </svg>
              {togglingStatus ? "Atualizando…" : (isOnline ? "✓  Online — Clique para pausar" : "Ficar Online")}
            </button>
          </div>
        </div>

        {/* dados da empresa — visão geral (também editáveis em "Editar Perfil") */}
        <div style={{ background:"white", borderRadius:16, padding:"16px 18px", marginBottom:18, boxShadow:"0 3px 14px rgba(0,0,0,.07)" }}>
          <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.1 }}>Sobre a empresa</p>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom: empresa.descricao ? 10 : 0 }}>
            <WA_ICON size={15} color={B} />
            <span style={{ fontSize:14, color:"#333", fontWeight:600 }}>
              {empresa.telefone_contato ? maskPhone(empresa.telefone_contato) : "Telefone não informado"}
            </span>
          </div>
          {empresa.descricao && <p style={{ margin:0, fontSize:13, color:"#555", lineHeight:1.6 }}>{empresa.descricao}</p>}
        </div>

        {/* preview real dos pedidos disponíveis na categoria + atalho pro Mural */}
        <div style={{ background:"white", borderRadius:16, padding:"16px 18px", marginBottom:18, boxShadow:"0 3px 14px rgba(0,0,0,.07)" }}>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#6B7280", lineHeight:1.4 }}>
            <span style={{ fontSize:16, fontWeight:900, color:B }}>{pedidosCount}</span>{" "}
            pedido{pedidosCount === 1 ? "" : "s"} disponíve{pedidosCount === 1 ? "l" : "is"} agora em {catsLabel || "sua categoria"}
          </p>

          {loadingPedidos ? (
            <div style={{ padding:"18px 0", display:"flex", justifyContent:"center" }}>
              <span style={{ width:22, height:22, border:`2.5px solid ${B}33`, borderTopColor:B, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
            </div>
          ) : pedidosPreview.length === 0 ? (
            <p style={{ margin:"0 0 4px", fontSize:13, color:"#9CA3AF", textAlign:"center", padding:"10px 0" }}>
              Nenhum pedido disponível no momento
            </p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
              {pedidosPreview.map(p => {
                const scat = CATS.find(c => c.id === p.categoria?.toLowerCase());
                const title = (p.descricao || p.categoria || "Serviço").slice(0, 40);
                return (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:14, background:"#F8F9FB" }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:scat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{scat?.emoji}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:800, color:"#1a1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</p>
                      <p style={{ margin:0, fontSize:11, color:"#9CA3AF", display:"flex", alignItems:"center", gap:4 }}>
                        <Clock size={10} />{formatTimeAgo(p.created_at)}
                      </p>
                    </div>
                    <span style={{ fontSize:15, fontWeight:900, color:B, flexShrink:0 }}>R$ {p.valor || 0}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onGoToPedidos} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"11px 16px", borderRadius:12, border:"none", background:B, color:"white", fontWeight:800, fontSize:12, cursor:"pointer" }}>
            Ver todos os {pedidosCount} <ChevronRight size={14} />
          </button>
        </div>

        {/* Banco de Profissionais — feature Empresa Plus; o gate real (plano
            ativo/trial) é decidido no router, aqui é só o ponto de entrada */}
        <button onClick={onGoToBanco} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px 0", borderRadius:16, border:"none", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", color:"white", fontWeight:800, fontSize:13, cursor:"pointer", marginBottom:12, boxShadow:"0 4px 14px rgba(124,58,237,.3)" }}>
          <Users size={15} /> Banco de Profissionais
          <span style={{ marginLeft:2, fontSize:9, fontWeight:900, background:"rgba(255,255,255,.25)", borderRadius:99, padding:"2px 6px" }}>PLUS</span>
        </button>

        {/* Minha Rede — favoritos/convites + histórico automático de quem já
            concluiu serviço; mesmo padrão de gate Plus do Banco */}
        <button onClick={onGoToRede} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px 0", borderRadius:16, border:"none", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", color:"white", fontWeight:800, fontSize:13, cursor:"pointer", marginBottom:12, boxShadow:"0 4px 14px rgba(124,58,237,.3)" }}>
          <Star size={15} /> Minha Rede
          <span style={{ marginLeft:2, fontSize:9, fontWeight:900, background:"rgba(255,255,255,.25)", borderRadius:99, padding:"2px 6px" }}>PLUS</span>
        </button>

        {/* Demanda de mão de obra (Multi Pro) — mesmo padrão de gate Plus */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
          <button onClick={onGoToNovaDemanda} style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"12px 0", borderRadius:16, border:"none", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", color:"white", fontWeight:800, fontSize:12, cursor:"pointer", boxShadow:"0 4px 14px rgba(124,58,237,.3)" }}>
            <Send size={15} /> Nova Demanda
            <span style={{ fontSize:9, fontWeight:900, background:"rgba(255,255,255,.25)", borderRadius:99, padding:"2px 6px" }}>PLUS</span>
          </button>
          <button onClick={onGoToMinhasDemandas} style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"12px 0", borderRadius:16, border:"1.5px solid #DDD6FE", background:"#F5F3FF", color:"#6D28D9", fontWeight:800, fontSize:12, cursor:"pointer" }}>
            <ClipboardList size={15} /> Minhas Demandas
          </button>
        </div>

        {/* atalho rápido pra edição, sem depender só da nav inferior */}
        <button onClick={onGoToEditar} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px 0", borderRadius:16, border:"1.5px solid #E5E7EB", background:"white", color:"#374151", fontWeight:800, fontSize:13, cursor:"pointer", marginBottom:18, boxShadow:"0 3px 14px rgba(0,0,0,.05)" }}>
          <Pencil size={15} /> Editar Perfil
        </button>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* preview exato do card de busca */}
        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 10px" }}>Como você aparece pros clientes</p>
          <EmpresaCard emp={empresa} onVerPerfil={() => setShowFullPreview(true)} />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA PLUS — BANCO DE PROFISSIONAIS ───────────── */
// Busca real de profissionais (tabela "usuarios"), exclusiva do plano Empresa
// Plus — o gate de acesso (plano ativo/trial) fica no router em App(), não
// aqui; esta tela assume que quem a renderiza já tem direito a ela.
function BancoProfissionaisScreen({ onBack, empresaEmail }) {
  const [loading,           setLoading]           = useState(true);
  const [profissionais,     setProfissionais]     = useState([]);
  const [reputacoes,        setReputacoes]         = useState({}); // email -> { mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }
  const [busca,             setBusca]              = useState("");
  const [catsSelecionadas,  setCatsSelecionadas]   = useState([]);
  const [soDisponiveis,     setSoDisponiveis]      = useState(false);
  const [rede,              setRede]              = useState({}); // email -> true (na Minha Rede)

  const carregarRede = () => {
    if (!empresaEmail) return;
    supabase.from("empresa_rede_favoritos").select("profissional_email").eq("empresa_email", empresaEmail)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(r => { map[r.profissional_email] = true; });
        setRede(map);
      }).catch(() => {});
  };

  useEffect(() => {
    supabase.from("usuarios").select("email,name,whatsapp,foto_perfil_url,bio,categoria_servico,status")
      .eq("role", "professional")
      .then(({ data }) => {
        const lista = data || [];
        setProfissionais(lista);
        setLoading(false);
        const emails = lista.map(p => p.email).filter(Boolean);
        if (!emails.length) return;
        // Reputação real por profissional (nota + volume + taxa de conclusão),
        // via avaliado_email — a coluna genérica, não a legada profissional_id
        // (que só cobre metade dos casos e não seria simétrica).
        Promise.all(emails.map(email => fetchReputacao(email).then(r => [email, r])))
          .then(pares => setReputacoes(Object.fromEntries(pares)))
          .catch(() => {});
      })
      .catch(() => setLoading(false));
    carregarRede();
  }, []);

  // Minha Rede (Empresa Plus): favoritar guarda silencioso; convidar faz o
  // mesmo insert + abre WhatsApp com uma mensagem pronta de convite.
  const toggleFavorito = (email) => {
    if (!empresaEmail) return;
    if (rede[email]) {
      supabase.from("empresa_rede_favoritos").delete().eq("empresa_email", empresaEmail).eq("profissional_email", email)
        .then(() => carregarRede()).catch(() => {});
    } else {
      // upsert, não insert puro — se já existir uma linha pra esse par
      // (ex: clique em "Convidar" seguido rápido de um clique na estrela,
      // antes do estado local recarregar), força a origem certa em vez de
      // falhar silenciosamente no unique constraint e deixar a origem antiga.
      supabase.from("empresa_rede_favoritos").upsert(
        { empresa_email: empresaEmail, profissional_email: email, origem: "favoritado" },
        { onConflict: "empresa_email,profissional_email" }
      ).then(() => carregarRede()).catch(() => {});
    }
  };

  const convidar = (p) => {
    if (!empresaEmail) return;
    supabase.from("empresa_rede_favoritos").upsert(
      { empresa_email: empresaEmail, profissional_email: p.email, origem: "convidado" },
      { onConflict: "empresa_email,profissional_email" }
    ).then(() => carregarRede()).catch(() => {});
    if (p.whatsapp) {
      const texto = encodeURIComponent(`Olá, ${p.name || ""}! Você foi convidado a fazer parte da rede de profissionais de confiança da nossa empresa no Multi. 🤝`);
      window.open(`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}?text=${texto}`, "_blank");
    }
  };

  const toggleCat = (id) => setCatsSelecionadas(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);

  const filtrados = profissionais
    .filter(p => {
      if (busca.trim() && !(p.name || "").toLowerCase().includes(busca.trim().toLowerCase())) return false;
      if (catsSelecionadas.length && !(p.categoria_servico || []).some(c => catsSelecionadas.includes(c))) return false;
      if (soDisponiveis && p.status !== true) return false;
      return true;
    })
    .sort((a, b) => (reputacoes[b.email]?.mediaEstrelas || 0) - (reputacoes[a.email]?.mediaEstrelas || 0));

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(160deg,#0F3460 0%,#1a4a7a 100%)", padding:"16px 18px 20px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <div>
            <h2 style={{ fontSize:18, fontWeight:900, color:"white", margin:0 }}>Banco de Profissionais</h2>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.6)", margin:0 }}>Busque e filtre profissionais reais da plataforma</p>
          </div>
        </div>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome..."
          style={{ width:"100%", border:"none", borderRadius:12, padding:"12px 14px", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
      </div>

      <div style={{ padding:"14px 16px 0" }}>
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:6 }}>
          {CATS.map(c => {
            const active = catsSelecionadas.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleCat(c.id)} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:99, border:`1.5px solid ${active ? B : "#E5E7EB"}`, background: active ? B+"12" : "white", color: active ? B : "#666", fontWeight:800, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => setSoDisponiveis(s => !s)} style={{ marginTop:8, display:"flex", alignItems:"center", gap:6, padding:"7px 12px", borderRadius:99, border:`1.5px solid ${soDisponiveis ? G : "#E5E7EB"}`, background: soDisponiveis ? G+"12" : "white", color: soDisponiveis ? G : "#666", fontWeight:800, fontSize:12, cursor:"pointer" }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background: soDisponiveis ? G : "#ccc" }} /> Só disponíveis agora
        </button>
      </div>

      <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
        {loading && <p style={{ textAlign:"center", color:"#aaa", fontSize:13 }}>Carregando...</p>}
        {!loading && filtrados.length === 0 && <p style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:"20px 0" }}>Nenhum profissional encontrado com esses filtros.</p>}
        {filtrados.map(p => {
          const cats = resolveCats(p.categoria_servico);
          const reputacao = reputacoes[p.email];
          return (
            <div key={p.email} style={{ background:"white", borderRadius:20, padding:16, boxShadow:"0 4px 20px rgba(0,0,0,.08)", border:"1px solid #F0F0F0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:52, height:52, borderRadius:16, overflow:"hidden", background:"#F8F9FA", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {p.foto_perfil_url
                    ? <img src={p.foto_perfil_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                    : <User size={24} color="#B0B4C0" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>{p.name || "Profissional"}</p>
                    {p.status === true && <span style={{ width:7, height:7, borderRadius:"50%", background:G, flexShrink:0 }} title="Disponível agora" />}
                  </div>
                  {cats.length > 0 && <p style={{ fontSize:11, color:"#888", margin:"2px 0 0" }}>{cats.map(c => `${c.emoji} ${c.label}`).join(" · ")}</p>}
                  {reputacao && <div style={{ marginTop:4 }}><ReputacaoBadge {...reputacao} /></div>}
                </div>
                <button onClick={() => toggleFavorito(p.email)} title={rede[p.email] ? "Remover da Minha Rede" : "Adicionar à Minha Rede"} style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, display:"flex" }}>
                  <Star size={20} color={rede[p.email] ? "#7C3AED" : "#D1D5DB"} fill={rede[p.email] ? "#7C3AED" : "none"} />
                </button>
              </div>
              {p.bio && <p style={{ fontSize:12.5, color:"#555", lineHeight:1.5, margin:"0 0 12px" }}>{p.bio}</p>}
              {p.whatsapp && (
                <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:12 }}>
                  <MessageCircle size={14} /> Chamar no WhatsApp
                </a>
              )}
              {!rede[p.email] && (
                <button onClick={() => convidar(p)} style={{ marginTop:8, width:"100%", padding:"9px 0", borderRadius:12, border:`1.5px solid #DDD6FE`, background:"#F5F3FF", color:"#6D28D9", fontWeight:800, fontSize:12, cursor:"pointer" }}>
                  ⭐ Convidar pra Rede
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── MINHA REDE DE PROFISSIONAIS (EMPRESA PLUS) ──────── */
// Une dois conjuntos: automático (quem já concluiu serviço pra essa empresa,
// calculado ao vivo a partir de "pedidos" — sem linha própria) e manual
// (favoritado/convidado, em "empresa_rede_favoritos"). Um profissional pode
// estar nos dois; mostra uma vez só, com as duas tags se for o caso.
function MinhaRedeScreen({ onBack, empresaEmail }) {
  const [loading,       setLoading]       = useState(true);
  const [profissionais, setProfissionais] = useState([]);
  const [reputacoes,    setReputacoes]    = useState({}); // email -> { mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }

  const carregar = () => {
    if (!empresaEmail) { setLoading(false); return; }
    Promise.all([
      supabase.from("pedidos").select("profissional_aceito").eq("cliente_id", empresaEmail).eq("status", "concluido"),
      supabase.from("empresa_rede_favoritos").select("profissional_email,origem").eq("empresa_email", empresaEmail),
    ]).then(([{ data: concluidos }, { data: favoritos }]) => {
      const origemPorEmail = {};
      (concluidos || []).forEach(p => {
        if (!p.profissional_aceito) return;
        origemPorEmail[p.profissional_aceito] = { ...(origemPorEmail[p.profissional_aceito] || {}), historico: true };
      });
      (favoritos || []).forEach(f => {
        const key = f.origem === "convidado" ? "convidado" : "favoritado";
        origemPorEmail[f.profissional_email] = { ...(origemPorEmail[f.profissional_email] || {}), [key]: true };
      });
      const emails = Object.keys(origemPorEmail);
      if (!emails.length) { setProfissionais([]); setLoading(false); return; }
      supabase.from("usuarios").select("email,name,whatsapp,foto_perfil_url,bio,categoria_servico,status")
        .in("email", emails)
        .then(({ data }) => {
          setProfissionais((data || []).map(p => ({ ...p, ...origemPorEmail[p.email] })));
          setLoading(false);
          Promise.all(emails.map(email => fetchReputacao(email).then(r => [email, r])))
            .then(pares => setReputacoes(Object.fromEntries(pares)))
            .catch(() => {});
        }).catch(() => setLoading(false));
    }).catch(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [empresaEmail]);

  const removerFavorito = (email) => {
    supabase.from("empresa_rede_favoritos").delete().eq("empresa_email", empresaEmail).eq("profissional_email", email)
      .then(() => carregar()).catch(() => {});
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", paddingBottom:40 }}>
      <div style={{ background:"linear-gradient(160deg,#7C3AED 0%,#4F46E5 100%)", padding:"16px 18px 20px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <div>
            <h2 style={{ fontSize:18, fontWeight:900, color:"white", margin:0 }}>Minha Rede</h2>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.6)", margin:0 }}>Profissionais de confiança, prontos pra reutilizar</p>
          </div>
        </div>
      </div>

      <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
        {loading && <p style={{ textAlign:"center", color:"#aaa", fontSize:13 }}>Carregando...</p>}
        {!loading && profissionais.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 24px", color:"#ccc" }}>
            <Star size={36} color="#E0E0E0" style={{ margin:"0 auto 12px", display:"block" }} />
            <p style={{ fontSize:14, fontWeight:700 }}>Sua rede está vazia</p>
            <p style={{ fontSize:12, marginTop:4 }}>Favorite profissionais no Banco de Profissionais ou conclua um serviço com alguém pra ele entrar aqui.</p>
          </div>
        )}
        {profissionais.map(p => {
          const cats = resolveCats(p.categoria_servico);
          const reputacao = reputacoes[p.email];
          return (
            <div key={p.email} style={{ background:"white", borderRadius:20, padding:16, boxShadow:"0 4px 20px rgba(0,0,0,.08)", border:"1px solid #F0F0F0" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <div style={{ width:52, height:52, borderRadius:16, overflow:"hidden", background:"#F8F9FA", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {p.foto_perfil_url
                    ? <img src={p.foto_perfil_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                    : <User size={24} color="#B0B4C0" />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:0 }}>{p.name || "Profissional"}</p>
                    {p.status === true && <span style={{ width:7, height:7, borderRadius:"50%", background:G, flexShrink:0 }} title="Disponível agora" />}
                  </div>
                  {cats.length > 0 && <p style={{ fontSize:11, color:"#888", margin:"2px 0 0" }}>{cats.map(c => `${c.emoji} ${c.label}`).join(" · ")}</p>}
                  {reputacao && <div style={{ marginTop:4 }}><ReputacaoBadge {...reputacao} /></div>}
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    {p.historico && <span style={{ fontSize:10, fontWeight:800, color:G, background:G+"18", borderRadius:99, padding:"2px 7px" }}>Já trabalhou com você</span>}
                    {(p.favoritado || p.convidado) && <span style={{ fontSize:10, fontWeight:800, color:"#7C3AED", background:"#7C3AED18", borderRadius:99, padding:"2px 7px" }}>{p.convidado ? "Convidado" : "Favoritado"}</span>}
                  </div>
                </div>
              </div>
              {p.bio && <p style={{ fontSize:12.5, color:"#555", lineHeight:1.5, margin:"0 0 12px" }}>{p.bio}</p>}
              <div style={{ display:"flex", gap:8 }}>
                {p.whatsapp && (
                  <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ flex:1, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:12 }}>
                    <MessageCircle size={14} /> Chamar no WhatsApp
                  </a>
                )}
                {(p.favoritado || p.convidado) && (
                  <button onClick={() => removerFavorito(p.email)} title="Remover da Minha Rede" style={{ padding:"11px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", cursor:"pointer" }}>
                    <Star size={16} color="#7C3AED" fill="#7C3AED" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA PLUS — NOVA DEMANDA DE MÃO DE OBRA ──────── */
// Empresa Plus anuncia uma demanda (ex: "preciso de um eletricista pra uma
// obra") — reaproveita a tabela "pedidos" já consolidada, só com
// publico_alvo:"pro" pra aparecer só no mural de profissionais Multi Pro
// (ver supabase_demandas_pro_migration.sql e o filtro em ProfessionalHome).
const PRAZO_OPTIONS = [
  { id:"urgente",     label:"Urgente",      emoji:"🔴" },
  { id:"essa_semana", label:"Essa semana",  emoji:"🟡" },
  { id:"sem_pressa",  label:"Sem pressa",   emoji:"🟢" },
];

function NovaDemandaScreen({ userEmail, userName, onBack, showToast }) {
  const [form, setForm] = useState({ cat:"", desc:"", value:"", prazo:"sem_pressa" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.cat) e.cat = "Selecione a categoria do profissional";
    if (!form.desc.trim()) e.desc = "Descreva a demanda";
    if (!form.value || Number(form.value) <= 0) e.value = "Informe um valor";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePublicar = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pedidos").insert({
        cliente_id: userEmail,
        cliente_nome: userName,
        categoria: form.cat,
        descricao: form.desc.trim(),
        valor: Number(form.value),
        status: "aberto",
        publico_alvo: "pro",
        prazo: form.prazo,
      });
      if (error) throw error;
      // Best-effort — não bloqueia a publicação se o push falhar.
      fetch("/api/notify-pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: form.cat, descricao: form.desc.trim(), publicoAlvo: "pro" }),
      }).catch(() => {});
      showToast?.("✅ Demanda publicada! Profissionais Multi Pro da categoria já podem ver.", G);
      onBack?.();
    } catch (e) {
      showToast?.("❌ Erro ao publicar demanda: " + (e.message || ""), "#DC2626");
    } finally {
      setSaving(false);
    }
  };

  const F = { background:"white", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"13px 14px", fontSize:13, color:"#1a1a2e", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const L = { display:"block", fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"16px 20px 28px", borderRadius:"0 0 32px 32px" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
          <ArrowLeft size={18} color="white" />
        </button>
        <p style={{ fontSize:20, fontWeight:900, color:"white", margin:"0 0 6px" }}>Nova Demanda de Mão de Obra</p>
        <p style={{ fontSize:12, color:"rgba(255,255,255,.7)", margin:0 }}>Visível só pra profissionais Multi Pro da categoria — sempre por proposta, sem aceite direto</p>
      </div>

      <div style={{ flex:1, padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <label style={L}>Categoria do profissional</label>
          <div style={{ position:"relative" }}>
            <select style={{ ...F, paddingRight:36, appearance:"none", cursor:"pointer", borderColor: errors.cat ? "#E53935" : undefined }}
              value={form.cat}
              onChange={e => { setForm(f => ({ ...f, cat: e.target.value })); if (errors.cat) setErrors(p => ({ ...p, cat: undefined })); }}>
              <option value="">Selecione...</option>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
            <ChevronDown size={14} color="#aaa" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
          </div>
          {errors.cat && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.cat}</p>}
        </div>

        <div>
          <label style={L}>Descrição da demanda</label>
          <textarea rows={4} placeholder="Ex: Obra residencial de 3 meses, preciso de eletricista com disponibilidade full-time..."
            style={{ ...F, resize:"none", lineHeight:1.6, borderColor: errors.desc ? "#E53935" : undefined }}
            value={form.desc}
            onChange={e => { setForm(f => ({ ...f, desc: e.target.value })); if (errors.desc) setErrors(p => ({ ...p, desc: undefined })); }} />
          {errors.desc && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.desc}</p>}
        </div>

        <div>
          <label style={L}>Valor oferecido (R$)</label>
          <input type="number" placeholder="0,00"
            style={{ ...F, borderColor: errors.value ? "#E53935" : undefined }}
            value={form.value}
            onChange={e => { setForm(f => ({ ...f, value: e.target.value })); if (errors.value) setErrors(p => ({ ...p, value: undefined })); }} />
          {errors.value && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.value}</p>}
        </div>

        <div>
          <label style={L}>Prazo</label>
          <div style={{ display:"flex", gap:8 }}>
            {PRAZO_OPTIONS.map(p => (
              <button key={p.id} onClick={() => setForm(f => ({ ...f, prazo: p.id }))}
                style={{ flex:1, padding:"10px 0", borderRadius:10, border: form.prazo === p.id ? "2px solid "+B : "1.5px solid #E5E7EB", background: form.prazo === p.id ? "#EEF4FF" : "white", color: form.prazo === p.id ? B : "#555", fontWeight: form.prazo === p.id ? 800 : 500, fontSize:12, cursor:"pointer" }}>
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1 }} />
      </div>

      <div style={{ position:"sticky", bottom:0, background:"#F8F9FA", padding:"12px 20px 20px", boxShadow:"0 -4px 16px rgba(0,0,0,.06)" }}>
        <button onClick={handlePublicar} disabled={saving} style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:15, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Publicando..." : "Publicar Demanda"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA PLUS — MINHAS DEMANDAS ──────────────────── */
// Demandas postadas pela própria empresa + propostas recebidas nelas. Papel
// diferente do Mural de Serviços (EmpresaPedidosScreen), que mostra pedidos de
// CLIENTES na categoria da empresa — aqui a empresa é quem está contratando.
function MinhasDemandasScreen({ userEmail, onBack, onVerPropostas, onOpenChat }) {
  const [demandas, setDemandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidatos, setCandidatos] = useState({});
  const [contatos, setContatos] = useState({}); // email do profissional aceito -> whatsapp

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("pedidos").select("*").eq("cliente_id", userEmail).eq("publico_alvo", "pro")
      .order("created_at", { ascending:false })
      .then(({ data }) => {
        const lista = data || [];
        setDemandas(lista);
        setLoading(false);

        const abertos = lista.filter(p => p.status === "aberto").map(p => p.id);
        if (abertos.length) {
          supabase.from("propostas").select("pedido_id").in("pedido_id", abertos).then(({ data: props }) => {
            const counts = {};
            (props || []).forEach(p => { counts[p.pedido_id] = (counts[p.pedido_id] || 0) + 1; });
            setCandidatos(counts);
          }).catch(() => {});
        }

        // Whatsapp do profissional aceito — só existe em "usuarios", não em "pedidos".
        const emails = [...new Set(lista.filter(p => p.status !== "aberto" && p.profissional_aceito).map(p => p.profissional_aceito))];
        if (emails.length) {
          supabase.from("usuarios").select("email,whatsapp").in("email", emails).then(({ data: us }) => {
            const map = {};
            (us || []).forEach(u => { map[u.email] = u.whatsapp; });
            setContatos(map);
          }).catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  const statusLabel = (s) => s === "aberto" ? "Aguardando propostas" : s === "em_andamento" ? "Em andamento" : s === "concluido" ? "Concluído" : s;

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", paddingBottom:40 }}>
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"16px 18px 20px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <h2 style={{ fontSize:18, fontWeight:900, color:"white", margin:0 }}>Minhas Demandas</h2>
        </div>
      </div>

      <div style={{ padding:"16px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
        {loading && <p style={{ textAlign:"center", color:"#aaa", fontSize:13 }}>Carregando...</p>}
        {!loading && demandas.length === 0 && (
          <p style={{ textAlign:"center", color:"#aaa", fontSize:13, padding:"20px 0" }}>Você ainda não publicou nenhuma demanda.</p>
        )}
        {demandas.map(d => {
          const cat = CATS.find(c => c.id === d.categoria);
          const prazo = PRAZO_OPTIONS.find(p => p.id === d.prazo);
          const nCandidatos = candidatos[d.id] || 0;
          const whatsapp = d.profissional_aceito ? contatos[d.profissional_aceito] : null;
          const liberado = !!(d.aceite_formal_cliente_em && d.aceite_formal_profissional_em);
          return (
            <div key={d.id} style={{ background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
              <div onClick={() => d.status === "aberto" && onVerPropostas(d)} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, cursor: d.status === "aberto" ? "pointer" : "default" }}>
                <div style={{ width:38, height:38, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:800, color:"#1a1a2e", margin:0 }}>{cat?.label || d.categoria}</p>
                  <p style={{ fontSize:11, color:"#888", margin:0 }}>{statusLabel(d.status)}</p>
                </div>
                <span style={{ fontSize:14, fontWeight:900, color:B }}>R$ {d.valor}</span>
              </div>
              <p style={{ fontSize:12.5, color:"#555", margin:"0 0 8px", lineHeight:1.5 }}>{d.descricao}</p>
              {prazo && <p style={{ fontSize:11, color:"#888", fontWeight:700, margin:"0 0 8px" }}>{prazo.emoji} {prazo.label}</p>}

              {d.status === "aberto" && (
                <div onClick={() => onVerPropostas(d)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:8, borderTop:"1px solid #F0F0F0", cursor:"pointer" }}>
                  <span style={{ fontSize:12, fontWeight:800, color: nCandidatos > 0 ? G : "#aaa" }}>
                    {nCandidatos > 0 ? `${nCandidatos} proposta${nCandidatos > 1 ? "s" : ""} recebida${nCandidatos > 1 ? "s" : ""}` : "Nenhuma proposta ainda"}
                  </span>
                  <ChevronRight size={15} color="#aaa" />
                </div>
              )}

              {d.status !== "aberto" && d.profissional_nome && (
                <div style={{ paddingTop:8, borderTop:"1px solid #F0F0F0" }}>
                  <p style={{ fontSize:12, color:G, fontWeight:800, margin:"0 0 8px" }}>✅ {d.profissional_nome} aceitou essa demanda</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => onOpenChat?.(d)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontWeight:800, fontSize:12, cursor:"pointer" }}>
                      <MessageCircle size={14} /> Chat
                    </button>
                    {liberado ? (
                      whatsapp && (
                        <a href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ flex:1, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:12 }}>
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      )
                    ) : (
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB", color:"#aaa", fontWeight:700, fontSize:11 }}>
                        🔒 Liberado após aceite no chat
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA — EDITAR PERFIL ─────────────────────────── */
function EmpresaEditProfileScreen({ userEmail, onLogout, showToast, isPro, plano, planoStatus, planoExpiraEm, onUpgrade }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState([]);
  const [errorCategoria, setErrorCategoria] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Multi Empresa trava em MAX_CATEGORIAS_EMPRESA categorias — Empresa Plus é
  // ilimitado. Mesmo padrão/motivo do MAX_CATEGORIAS_AUTONOMO em ProfileScreen
  // (usa "plano", não "isPro", pra não liberar ilimitado só por ter alguma
  // assinatura ativa).
  const MAX_CATEGORIAS_EMPRESA = 3;
  const isEmpresaPlus = plano === "empresa_plus";
  const limiteCategoria = isEmpresaPlus ? undefined : MAX_CATEGORIAS_EMPRESA;
  const handleLimiteCategoria = () => {
    showToast?.(`⚠️ Multi Empresa permite até ${MAX_CATEGORIAS_EMPRESA} categorias — vire Plus pra categorias ilimitadas`, O);
    onUpgrade?.();
  };

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("empresas").select("*").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        setEmpresa(data || null);
        setPhone(maskPhone(data?.telefone_contato || ""));
        setDescricao(data?.descricao || "");
        setCategoria(data?.categoria_servico || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5f5" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width:32, height:32, border:`3px solid ${B}33`, borderTopColor:B, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f5f5f5", padding:32, textAlign:"center" }}>
        <p style={{ fontSize:14, color:"#6B7280", marginBottom:20 }}>Não encontramos os dados da sua empresa.</p>
        <button onClick={onLogout} style={{ padding:"12px 24px", borderRadius:14, border:"none", background:"#E53935", color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>Sair da Conta</button>
      </div>
    );
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!categoria.length) { setErrorCategoria("Selecione ao menos uma categoria de serviço"); return; }
    setErrorCategoria("");
    setSaving(true);
    try {
      let logoUrl = empresa.logo_url;
      if (logoFile) {
        const ext = logoFile.type.includes("png") ? "png" : "jpg";
        const path = `empresas_logo_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, logoFile, { contentType: logoFile.type, upsert: true });
        if (upErr) throw upErr;
        logoUrl = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      }
      const updates = { telefone_contato: phone.replace(/\D/g, ""), descricao: descricao.trim() || null, logo_url: logoUrl, categoria_servico: categoria };
      const { error } = await supabase.from("empresas").update(updates).eq("id", empresa.id);
      if (error) throw error;
      setEmpresa(e => ({ ...e, ...updates }));
      setLogoFile(null);
      setLogoPreview(null);
      showToast?.("✅ Alterações salvas!", G);
    } catch (e) {
      showToast?.("❌ Erro ao salvar: " + (e.message || ""), "#DC2626");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f5", paddingBottom:40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1565C0,#0D47A1)", padding:"28px 20px 40px", textAlign:"center" }}>
        <label htmlFor="empresa-home-logo-input" style={{ width:76, height:76, borderRadius:"50%", overflow:"hidden", background:"rgba(255,255,255,.2)", margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" }}>
          {(logoPreview || empresa.logo_url)
            ? <img src={logoPreview || empresa.logo_url} alt={empresa.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <Briefcase size={30} color="white" />}
          <div style={{ position:"absolute", bottom:0, right:0, width:24, height:24, background:O, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
            <Camera size={12} color="white" />
          </div>
        </label>
        <input id="empresa-home-logo-input" type="file" accept="image/*" onChange={handleLogoChange} style={{ display:"none" }} />
        <h2 style={{ color:"white", margin:"0 0 4px", fontSize:19 }}>Editar Perfil</h2>
        <p style={{ color:"rgba(255,255,255,.75)", margin:0, fontSize:13 }}>{empresa.nome}</p>
      </div>

      <div style={{ padding:"16px", marginTop:-24 }}>

        {/* dados fixos, somente leitura */}
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 10px", fontSize:15, color:"#333" }}>Dados cadastrais</h3>
          <div style={{ marginBottom:8 }}>
            <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1 }}>Razão Social</p>
            <p style={{ margin:0, fontSize:13, color:"#333", fontWeight:600 }}>{empresa.razao_social || "—"}</p>
          </div>
          <div style={{ marginBottom:8 }}>
            <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1 }}>CNPJ</p>
            <p style={{ margin:0, fontSize:13, color:"#333", fontWeight:600 }}>{empresa.cnpj || "—"}</p>
          </div>
        </div>

        {/* categorias de serviço — agora editável (antes era fixa desde o cadastro) */}
        <div style={{ background:"white", borderRadius:16, padding:16, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)", border: errorCategoria ? "1.5px solid #FCA5A5" : undefined }}>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>Categorias de Serviço</h3>
          <CategoriaMultiSelect value={categoria} onChange={v => { setCategoria(v); if (errorCategoria) setErrorCategoria(""); }} max={limiteCategoria} onLimitReached={handleLimiteCategoria} error={errorCategoria} />
          {errorCategoria && <p style={{ fontSize:11, color:"#E53935", margin:"8px 0 0", fontWeight:700 }}>{errorCategoria}</p>}
          {!isEmpresaPlus && <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>Multi Empresa permite até {MAX_CATEGORIAS_EMPRESA} categorias. <span style={{ color:B, fontWeight:800, cursor:"pointer" }} onClick={onUpgrade}>Vire Plus</span> pra categorias ilimitadas.</p>}
        </div>

        {/* plano/assinatura */}
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h3 style={{ margin:"0 0 4px", fontSize:15, color:"#333" }}>Plano</h3>
            <p style={{ margin:0, fontSize:12, color: isPro ? G : "#9CA3AF" }}>
              {isPro
                ? `${plano === "empresa_plus" ? "Multi Empresa Plus" : "Multi Empresa"} — ${planoStatus === "trial" ? "em trial" : "ativo"}${planoExpiraEm ? " até " + new Date(planoExpiraEm).toLocaleDateString("pt-BR") : ""}`
                : "Nenhum plano ativo"}
            </p>
          </div>
          <button onClick={onUpgrade} style={{ background: isPro ? "#F0F0F0" : `linear-gradient(135deg,${O},#E64A19)`, color: isPro ? "#555" : "white", fontWeight:800, fontSize:11, padding:"8px 14px", borderRadius:99, border:"none", cursor:"pointer" }}>
            {isPro ? "Trocar" : "Escolher plano"}
          </button>
        </div>

        {/* campos editáveis */}
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15, color:"#333" }}>Editar informações</h3>
          <FormField IconComp={WA_ICON} label="Telefone de Contato">
            <input autoComplete="tel" type="tel" placeholder="(00) 00000-0000" value={phone}
              onChange={e => setPhone(maskPhone(e.target.value))}
              style={REG_INPUT} />
          </FormField>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conte um pouco sobre os serviços da sua empresa"
              style={{ width:"100%", minHeight:90, border:"1.5px solid #E5E7EB", borderRadius:14, padding:"13px 14px", fontSize:14, color:"#1a1a2e", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"none" }} />
          </div>
        </div>

        {/* salvar */}
        <button onClick={handleSave} disabled={saving} style={{
          width:"100%", padding:"15px 0", borderRadius:16, border:"none", marginBottom:12,
          background: saving ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`,
          color:"white", fontWeight:900, fontSize:14, cursor: saving ? "default" : "pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          boxShadow: saving ? "none" : `0 4px 12px ${B}44`,
        }}>
          {saving
            ? <><span style={{ width:16, height:16, border:"2px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} /> Salvando…</>
            : <><Check size={16} /> Salvar alterações</>}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── EMPRESA — PEDIDOS RECEBIDOS ─────────────────────── */
function EmpresaPedidosScreen({ userEmail }) {
  const [empresa, setEmpresa] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [phones, setPhones] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("empresas").select("*").eq("email", userEmail).maybeSingle()
      .then(async ({ data: emp }) => {
        setEmpresa(emp || null);
        if (emp?.categoria_servico?.length) {
          const { data: peds } = await supabase.from("pedidos").select("*")
            .in("categoria", emp.categoria_servico)
            .eq("status", "aberto")
            .order("created_at", { ascending:false });
          const mapped = (peds || []).map(p => ({
            id: p.id,
            cat: p.categoria || "servico",
            title: (p.descricao || p.categoria || "Serviço").slice(0, 40),
            desc: p.descricao || "",
            value: p.valor || 0,
            loc: p.cidade || "sua região",
            time: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "",
            client: p.cliente_nome || "Cliente",
            cliente_id: p.cliente_id,
            urgent: false,
          }));
          setPedidos(mapped);
          const emails = [...new Set(mapped.map(p => p.cliente_id).filter(Boolean))];
          if (emails.length) {
            const { data: users } = await supabase.from("usuarios").select("email,whatsapp").in("email", emails);
            const map = {};
            (users || []).forEach(u => { map[u.email] = u.whatsapp; });
            setPhones(map);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5f5" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width:32, height:32, border:`3px solid ${B}33`, borderTopColor:B, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} />
      </div>
    );
  }

  const empresaCatsLabel = empresa ? resolveCats(empresa.categoria_servico).map(c => c.label).join(", ") : "";

  const filters = [
    { id:"all",    label:"Todos",           emoji:"📋" },
    { id:"urgent", label:"Urgentes",         emoji:"🔥" },
    { id:"nearby", label:"Perto de Mim",     emoji:"📍" },
    { id:"topPay", label:"Melhor Pagamento", emoji:"💰" },
  ];
  const filtered = pedidos.filter(s => {
    if (activeFilter === "urgent") return s.urgent;
    if (activeFilter === "topPay") return s.value >= 400;
    return true;
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#F0F2F5", minHeight:"100vh", paddingBottom:100 }}>

      {/* ── mesmo padrão do Mural de Serviços do profissional, filtrado pela categoria da empresa ── */}
      <div style={{ padding:"20px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Mural de Serviços</h3>
          <span style={{ fontSize:12, color:"#888" }}>{filtered.length} disponíveis</span>
        </div>
        <p style={{ fontSize:12, color:"#9CA3AF", margin:"2px 0 12px" }}>
          Pedidos de clientes em {empresaCatsLabel || "sua categoria"} — o fechamento continua 100% pelo WhatsApp.
        </p>
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

      <div style={{ padding:"14px 16px 0", display:"flex", flexDirection:"column", gap:14 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 24px", color:"#bbb" }}>
            <p style={{ fontSize:15, fontWeight:700 }}>Nenhum pedido neste filtro</p>
            <p style={{ fontSize:12, marginTop:4 }}>Assim que um cliente publicar um pedido na sua categoria, ele aparece aqui.</p>
          </div>
        ) : filtered.map(s => {
          const scat = CATS.find(c => c.id === s.cat?.toLowerCase());
          const whatsapp = phones[s.cliente_id];
          return (
            <div key={s.id} style={{ borderRadius:20, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,.09)", background:"white", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:scat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{scat?.emoji}</div>
                  <span style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", lineHeight:1.35 }}>{s.title}</span>
                </div>
                {s.urgent && <Pill color="#E53935" sm>🔥 Urgente</Pill>}
              </div>
              {s.desc && <p style={{ fontSize:13, color:"#888", lineHeight:1.6, margin:0 }}>{s.desc}</p>}
              <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:11, color:"#bbb" }}>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}><MapPin size={11} />{s.loc}</span>
                <span style={{ display:"flex", alignItems:"center", gap:4 }}><Clock size={11} />{s.time}</span>
              </div>
              <div style={{ borderTop:"1px solid #F4F4F6", paddingTop:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:22, fontWeight:900, color:B }}>R$ {s.value}</span>
                <span style={{ fontSize:12, color:"#aaa" }}>👤 {s.client}</span>
              </div>
              {whatsapp && (
                <a href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:900, fontSize:13, textDecoration:"none" }}>
                  <MessageCircle size={15} /> Chamar no WhatsApp
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarSearchScreen({ service, onFound, onStatusChange, showToast }) {
  const [phase, setPhase] = useState(0); // 0=searching, 1=found // v3
  const [raio, setRaio] = useState(2);
  const [expandMsg, setExpandMsg] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [viewingEmpresa, setViewingEmpresa] = useState(null);

  useEffect(() => {
    const t1 = setTimeout(() => { setRaio(5); setExpandMsg('Expandindo para 5km...'); }, 8000);
    const t2 = setTimeout(() => { setRaio(10); setExpandMsg('Expandindo para 10km...'); }, 16000);
    const t3 = setTimeout(() => setPhase(1), 24000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (!service?.cat) return;
    supabase.from("empresas").select("*").contains("categoria_servico", [service.cat]).eq("ativo", true)
      .then(({ data, error }) => {
        console.log("EMPRESAS PARCEIRAS busca:", { categoria_servico_buscada: service.cat, data, error });
        setEmpresas(data || []);
      })
      .catch((err) => { console.error("EMPRESAS PARCEIRAS erro:", err); setEmpresas([]); });
  }, [service?.cat]);

  if (viewingEmpresa) {
    return <EmpresaProfileScreen empresa={viewingEmpresa} onBack={() => setViewingEmpresa(null)} />;
  }

  const cat = CATS.find(c => c.id === service.cat);

  if (phase === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0f1117', padding:24 }}>
        <p style={{ color:'#ffffff99', fontSize:12, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>{service.title}</p>
        <p style={{ color:'white', fontSize:16, fontWeight:700, marginBottom:32 }}>R$ {service.value}</p>
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ marginBottom:24 }}>
          <circle cx="120" cy="120" r="100" fill="#FF572208" stroke="#FF572218" strokeWidth="0.5"/>
          <circle cx="120" cy="120" r="72" fill="#FF572210" stroke="#FF572228" strokeWidth="0.5"/>
          <circle cx="120" cy="120" r="44" fill="#FF572218" stroke="#FF572238" strokeWidth="0.5"/>
          <line x1="120" y1="20" x2="120" y2="120" stroke="#FF572240" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="220" y1="120" x2="120" y2="120" stroke="#FF572240" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="120" y1="220" x2="120" y2="120" stroke="#FF572240" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="20" y1="120" x2="120" y2="120" stroke="#FF572240" strokeWidth="1" strokeDasharray="3 4"/>
          <g style={{ transformOrigin:'120px 120px', animation:'radarSweep 3s linear infinite' }}>
            <path d="M120 120 L120 21 A99 99 0 0 1 198 168 Z" fill="#FF572218"/>
            <line x1="120" y1="120" x2="120" y2="21" stroke="#FF572299" strokeWidth="1.5"/>
          </g>
          <circle cx="120" cy="120" fill="none" stroke="#FF5722" strokeWidth="1.5">
            <animate attributeName="r" values="36;98;36" dur="2.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="120" cy="120" fill="none" stroke="#FF5722" strokeWidth="1">
            <animate attributeName="r" values="36;98;36" dur="2.5s" begin="0.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" begin="0.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="160" cy="70" r="5" fill="#4CAF50">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="82" cy="158" r="4" fill="#4CAF50">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="175" cy="148" r="3.5" fill="#4CAF50">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="1.2s" repeatCount="indefinite"/>
          </circle>
          <text x="120" y="104" textAnchor="middle" fontSize="9" fill="#FF572270" fontFamily="sans-serif">500m</text>
          <text x="120" y="76" textAnchor="middle" fontSize="9" fill="#FF572260" fontFamily="sans-serif">1km</text>
          <text x="120" y="48" textAnchor="middle" fontSize="9" fill="#FF572250" fontFamily="sans-serif">2km</text>
          <circle cx="120" cy="120" r="18" fill="#FF5722"/>
          <text x="120" y="125" textAnchor="middle" fontSize="16" fill="white" fontFamily="sans-serif">⌂</text>
        </svg>
        <style>{"`@keyframes radarSweep { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`"}</style>
        <p style={{ color:'white', fontSize:16, fontWeight:700, marginBottom:6 }}>Buscando profissional...</p>
        <p style={{ color:'#ffffff60', fontSize:12, marginBottom:24 }}>3 profissionais na sua região</p>
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#4CAF50' }}></div>
            <span style={{ fontSize:11, color:'#ffffff60' }}>disponíveis</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF5722' }}></div>
            <span style={{ fontSize:11, color:'#ffffff60' }}>raio: {raio}km</span>
          </div>
        </div>
        <div style={{ marginTop:20, padding:'10px 16px', background:'#FF572215', borderRadius:12, border:'0.5px solid #FF572230', fontSize:11, color:'#FF572299', textAlign:'center' }}>
          {expandMsg || 'Se ninguém aceitar em 5 min, o raio expande automaticamente'}
        </div>
      </div>
    );
  }

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
          {/* nao apareceu */}
        <div style={{ margin:'12px 16px 0', padding:'14px', borderRadius:14, border:'1px solid #FFE0E0', background:'#FFF5F5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#C0392B' }}>Profissional nao apareceu?</p>
            <p style={{ margin:0, fontSize:11, color:'#888' }}>Você pode cancelar o pedido</p>
          </div>
          <button onClick={() => { if(window.confirm('Cancelar esse pedido? O profissional será avisado.')) { onStatusChange && onStatusChange(service.id, 'cancelado'); showToast && showToast('Pedido cancelado.', 'E'); } }} style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'#C0392B', color:'white', fontWeight:700, fontSize:12, cursor:'pointer' }}>Cancelar pedido</button>
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

        {/* empresas parceiras — sempre no topo, antes dos profissionais autônomos */}
        {empresas.length > 0 && (
          <div style={{ padding:"18px 16px 0" }}>
            <p style={{ fontSize:12, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, margin:"0 0 12px" }}>Empresas Parceiras</p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {empresas.map(emp => (
                <EmpresaCard key={emp.id} emp={emp} onVerPerfil={setViewingEmpresa} />
              ))}
            </div>
          </div>
        )}

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
              const statusColor = s.status === "aberto" ? B : isEmAndamentoTab(s.status) ? O : G;
              const statusLabel = s.status === "aberto" ? "Aguardando" : s.status === "concluido" ? "Concluído" : "Em andamento";
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
        <label style={{fontSize:12,color:"#666",display:"block"}}>Categoria</label>
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
        <label style={{fontSize:12,color:"#666",display:"block"}}>Descrição do problema</label>
        <textarea rows={4} placeholder="Seja detalhado sobre o que precisa…" style={{ ...F, resize:"none", lineHeight:1.6 }} value={form.desc} onChange={e => setForm({ ...form, desc:e.target.value })} />
      </div>

      {/* Foto do problema */}
        <div>
          <label style={{fontSize:12,color:"#666",display:"block"}}>Fotos do problema <span style={{ textTransform:'none', fontWeight:400, letterSpacing:0, color:'#ccc' }}>(opcional, até 5)</span></label>
          <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, padding:'12px', borderRadius:12, border:'2px dashed #ddd', cursor:'pointer', background:'#fafafa', justifyContent:'center' }}>
            <input type='file' accept='image/*' multiple style={{ display:'none' }} onChange={e => {
              const files=Array.from(e.target.files).slice(0,5);
              const current=window._photos||[];
              const remaining=5-current.length;
              const toAdd=files.slice(0,remaining);
              let loaded=0;
              toAdd.forEach(file=>{
                const reader=new FileReader();
                reader.onload=ev=>{
                  window._photos=[...(window._photos||[]),ev.target.result];
                  loaded++;
                  const grid=document.getElementById('photos-grid');
                  if(grid){
                    grid.innerHTML='';
                    (window._photos||[]).forEach((src,i)=>{
                      const wrap=document.createElement('div');
                      wrap.style.cssText='position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden;';
                      const img=document.createElement('img');
                      img.src=src;
                      img.style.cssText='width:100%;height:100%;object-fit:cover;';
                      const btn=document.createElement('button');
                      btn.innerHTML='×';
                      btn.style.cssText='position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;';
                      btn.onclick=()=>{ window._photos.splice(i,1); wrap.remove(); const cnt=document.getElementById('photos-count'); if(cnt) cnt.textContent=window._photos.length>0?window._photos.length+' foto(s)':''; };
                      wrap.appendChild(img);
                      wrap.appendChild(btn);
                      grid.appendChild(wrap);
                    });
                    const cnt=document.getElementById('photos-count');
                    if(cnt) cnt.textContent=window._photos.length+' foto(s) adicionada(s)';
                  }
                };
                reader.readAsDataURL(file);
              });
            }} />
            📷 <span id='photos-count' style={{ fontSize:13, color:'#888' }}>Tirar foto ou escolher da galeria</span>
          </label>
          <div id='photos-grid' style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}></div>
        </div>

        {/* CEP */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>CEP do local do serviço</label>
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
      {/* Material */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>Material necessário</label>
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
        <label style={{fontSize:12,color:"#666",display:"block"}}>Valor que posso pagar</label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"#999", fontSize:13 }}>R$</span>
          <input type="number" placeholder="0,00" style={{ ...F, paddingLeft:38 }} value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} />
        </div>
      </div>

        <button
            onClick={() => { if (canPublish) { (async()=>{ const ts=Date.now(); const urls=await Promise.all((window._photos||[]).map(async(b64,i)=>{ const res=await fetch(b64); const blob=await res.blob(); const ext=blob.type.includes("png")?"png":"jpg"; const path="pedido_"+ts+"_"+i+"."+ext; const{error:ue}=await supabase.storage.from("pedidos-fotos").upload(path,blob,{contentType:blob.type,upsert:true}); if(ue){console.warn("upload:",ue);return null;} return supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl; })); const fotos=urls.filter(Boolean); const{data:novoPedido,error}=await supabase.from("pedidos").insert({cliente_id:safeGetUser().email||"anonimo",cliente_nome:safeGetUser().name||"Cliente",categoria:form.cat,descricao:form.desc,valor:Number(form.value),cep:form.cep,fotos,status:"aberto"}).select().single(); if(error){alert("Erro ao publicar serviço: "+(error.message||"")); return;} fetch("/api/notify-pedido",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({categoria:form.cat,descricao:form.desc})}).catch(()=>{}); onSuccess({...mapPedidoRow(novoPedido), cepInfo, material:form.material}); })(); }}}
            style={{ padding:"15px 0", borderRadius:14, border:"none", cursor: canPublish ? "pointer" : "not-allowed", background: canPublish ? `linear-gradient(135deg,${0},#E64A19)` : "#9CA3AF", color: canPublish ? "white" : "#4B5563", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: canPublish ? "0 5px 18px rgba(255,87,34,.30)" : "none", transition:"all .2s" }}>
            <Send size={15} /> Publicar Serviço
          </button>
        </div>
      );
    }

/* ───────────────────────── SERVICE DETAIL CLIENT ──────────────────────────── */
/* ───────────────────────── SERVICE STATUS STEPPER ──────────────────────────── */

// Map service.status to a phase number 0-3.
// Vocabulário único do pedido (Fase 1 de consolidação): o mesmo em português
// usado direto na coluna pedidos.status no Supabase — não existe mais um
// vocabulário mock em inglês para traduzir.
function statusToPhase(status) {
  if (status === "aberto")       return 0;
  if (status === "em_andamento") return 1;
  if (status === "executando")   return 2;
  if (status === "em_disputa")   return 2;
  if (status === "concluido")    return 3;
  if (status === "cancelado")    return 3;
  return 0;
}

// Normaliza uma linha crua de "pedidos" (Supabase) pro shape usado pela UI,
// preservando TODOS os campos que alguma tela do fluxo real precisa — antes
// da Fase 1 existiam dois mapeamentos ad-hoc diferentes (um no mural do
// profissional, outro em "meus pedidos"), cada um descartando campos
// diferentes (ex: cliente_id sumia num, profissional_aceito sumia no outro).
function mapPedidoRow(p) {
  return {
    id: p.id,
    cliente_id: p.cliente_id,
    cliente_nome: p.cliente_nome,
    profissional_aceito: p.profissional_aceito,
    profissional_nome: p.profissional_nome,
    pro: p.profissional_nome,
    cat: p.categoria,
    title: p.categoria,
    desc: p.descricao,
    value: p.valor,
    cep: p.cep,
    photos: p.fotos || [],
    photo: (p.fotos || [])[0] || null,
    loc: p.cidade || "sua região",
    status: p.status,
    time: p.created_at,
    concluido_em: p.concluido_em,
    contestado_em: p.contestado_em,
    contestacao_motivo: p.contestacao_motivo,
    concluido_cliente_em: p.concluido_cliente_em,
    concluido_profissional_em: p.concluido_profissional_em,
    conclusao_fotos_cliente: p.conclusao_fotos_cliente,
    conclusao_fotos_profissional: p.conclusao_fotos_profissional,
  };
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
function ServiceDetailClient({ service, onBack, onStatusChange, onConfirmarConclusao, onAvaliar, showToast }) {
  const [phase,      setPhase]      = useState(statusToPhase(service.status));
  const [showSOS,    setShowSOS]    = useState(false);
  const [released,   setReleased]   = useState(service.status === "concluido");
  const [observacao, setObservacao] = useState("");
  const [confirmando,setConfirmando]= useState(false);
  const [fotos,       setFotos]       = useState([]);
  const [enviandoFoto,setEnviandoFoto]= useState(false);
  const cat  = CATS.find(c => c.id === service.cat);
  const pin  = generatePin(service.id);
  const jaConfirmeiConclusao = !!service.concluido_cliente_em;

  // Sem isso, quando o outro lado confirma depois e o pedido vira
  // "concluido" no banco, essa tela ficava travada na fase antiga até sair
  // e voltar — phase/released só eram lidos de service.status na primeira
  // renderização (useState initial value não reage a mudança de prop).
  useEffect(() => {
    setPhase(statusToPhase(service.status));
    setReleased(service.status === "concluido");
  }, [service.status]);

  const phaseColors = ["#6366F1", B, O, G];
  const currentColor = phaseColors[phase];

  // Check-in do profissional
  const handleCheckin = () => {
    setPhase(2);
    showToast?.("🛠️ Status atualizado: O profissional está no local!", O);
    onStatusChange?.(service.id, "executando");
  };

  // Foto da conclusão — opcional, mesmo padrão de handlePortfolio
  // (ProfileScreen): upload eager ao selecionar, acumula URLs no estado.
  const handleFotoConclusao = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setEnviandoFoto(true);
    try {
      const novasUrls = [];
      for (const f of files) {
        const ext = f.type.includes("png") ? "png" : "jpg";
        const path = `conclusao_${service.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true });
        if (upErr) throw upErr;
        novasUrls.push(supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl);
      }
      setFotos(fs => [...fs, ...novasUrls]);
    } catch (err) {
      showToast?.("❌ Erro ao enviar foto: " + (err.message || ""), "#DC2626");
    } finally {
      setEnviandoFoto(false);
    }
  };

  const confirmarConclusao = () => {
    if (confirmando) return;
    setConfirmando(true);
    showToast?.("✅ Confirmação registrada.", G);
    onConfirmarConclusao?.(service.id, "cliente", observacao, fotos);
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
        <p style={{ fontSize:12, color:"#888", lineHeight:1.5, margin:0 }}>{service.description || service.desc || "Sem descrição"}</p>
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
              <p style={{ fontSize:13, fontWeight:900, color:"white", margin:0 }}>Confirmação de Conclusão</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.55)", margin:0 }}>PIN de confirmação</p>
            </div>
            <span style={{ marginLeft:"auto", fontSize:16, fontWeight:900, color:"#4ade80" }}>R$ {service.proposalValue || service.value}</span>
          </div>

          {/* body */}
          <div style={{ background:"white", padding:"14px 16px" }}>
            <p style={{ fontSize:12, color:"#555", lineHeight:1.6, margin:"0 0 14px" }}>
              💡 O código abaixo confirma a <strong style={{ color:"#1a1a2e" }}>conclusão do serviço</strong>. O pagamento é combinado direto com o profissional, fora da Plataforma.
            </p>

            {/* PIN display */}
            <div style={{ background:"#F8F9FA", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", border:"1.5px dashed #E5E7EB" }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 4px" }}>Código de Confirmação</p>
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

            {/* Confirmar conclusão — só quando executando; bilateral (Fase 4) */}
            {phase === 2 && (confirmando || jaConfirmeiConclusao ? (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB", textAlign:"center" }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#555", margin:0 }}>✅ Você confirmou. Aguardando confirmação do outro lado.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Observação sobre a conclusão (opcional)..."
                  style={{ width:"100%", minHeight:70, marginTop:14, borderRadius:12, border:"1.5px solid #eee", padding:12, fontSize:13.5, fontFamily:"Nunito", resize:"none", boxSizing:"border-box" }}
                />
                {fotos.length > 0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
                    {fotos.map((url, i) => <img key={i} src={url} style={{ width:56, height:56, borderRadius:10, objectFit:"cover" }} alt="" />)}
                  </div>
                )}
                <label htmlFor="foto-conclusao-cliente" style={{ marginTop:10, width:"100%", padding:"11px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#555", fontWeight:700, fontSize:12.5, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxSizing:"border-box" }}>
                  <Camera size={14} /> {enviandoFoto ? "Enviando..." : "Adicionar foto (opcional)"}
                </label>
                <input id="foto-conclusao-cliente" type="file" accept="image/*" multiple onChange={handleFotoConclusao} disabled={enviandoFoto} style={{ display:"none" }} />
                <button onClick={confirmarConclusao} disabled={enviandoFoto} style={{ marginTop:10, width:"100%", padding:"14px 0", borderRadius:14, border:"none", cursor: enviandoFoto ? "default" : "pointer", opacity: enviandoFoto ? .6 : 1, background:`linear-gradient(135deg,${G},#16a34a)`, color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:`0 5px 18px ${G}44` }}>
                  <Check size={17} /> Marcar como concluído
                </button>
              </>
            ))}
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
            <button onClick={handleCheckin} style={{ marginTop:12, width:"100%", padding:"11px 0", borderRadius:12, border:`1.5px solid ${O}`, background:"white", color:O, fontWeight:800, fontSize:13, cursor:"pointer" }}>
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

      {/* ── AVALIAR (após conclusão bilateral) ── */}
      {service.status==="concluido" && (
        <>
          <FotosConclusao cliente={service.conclusao_fotos_cliente} profissional={service.conclusao_fotos_profissional} />
          <button onClick={()=>onAvaliar&&onAvaliar(service)} style={{ width:"100%", padding:"12px", background:"#FF9500", color:"white", border:"none", borderRadius:12, fontWeight:700, fontSize:15, cursor:"pointer" }}>⭐ Avaliar</button>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── SERVICE DETAIL — PROFESSIONAL PIN ENTRY ──────────── */
function ServiceDetailPinEntry({ service, onBack, onStatusChange, onConfirmarConclusao, showToast, onAvaliar }) {
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const [observacao, setObservacao] = useState("");
  const [fotos,       setFotos]       = useState([]);
  const [enviandoFoto,setEnviandoFoto]= useState(false);
  const pin = generatePin(service.id);
  const phase = statusToPhase(service.status);
  const jaConfirmeiConclusao = !!service.concluido_profissional_em;

  // Foto da conclusão — opcional, mesmo padrão de handlePortfolio
  // (ProfileScreen): upload eager ao selecionar, acumula URLs no estado.
  const handleFotoConclusao = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setEnviandoFoto(true);
    try {
      const novasUrls = [];
      for (const f of files) {
        const ext = f.type.includes("png") ? "png" : "jpg";
        const path = `conclusao_${service.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true });
        if (upErr) throw upErr;
        novasUrls.push(supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl);
      }
      setFotos(fs => [...fs, ...novasUrls]);
    } catch (err) {
      showToast?.("❌ Erro ao enviar foto: " + (err.message || ""), "#DC2626");
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleDigit = (d) => {
    if (enteredPin.length >= 4) return;
    const next = enteredPin + d;
    setEnteredPin(next);
    setPinError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === pin) {
          setConfirmed(true);
          showToast?.("✅ PIN correto! Confirmação registrada.", G);
          onConfirmarConclusao?.(service.id, "profissional", observacao, fotos);
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
          {/* Botao Contestar - visivel 48h após conclusão */}
          {service.status==="concluido" && service.concluido_em && (new Date()-new Date(service.concluido_em))<172800000 && service.status!=="em_disputa" && (
            <button onClick={()=>{
              const motivo=prompt("Descreva o problema com o serviço:");
              if(!motivo) return;
              supabase.from("pedidos").update({status:"em_disputa",contestado_em:new Date().toISOString(),contestacao_motivo:motivo}).eq("id",service.id).then(()=>{
                alert("Contestação registrada! O Multi vai analisar em até 24h.");
              });
            }} style={{marginTop:12,width:"100%",padding:"12px",background:"#FF5722",color:"white",border:"none",borderRadius:12,fontWeight:700,fontSize:14,cursor:"pointer"}}>
              ⚠️ Contestar Serviço (até 48h)
            </button>
          )}
          {service.status==="em_disputa" && (
            <div style={{marginTop:12,padding:"12px",background:"#FFF3E0",borderRadius:12,border:"2px solid #FF5722",textAlign:"center"}}>
              <p style={{margin:0,fontWeight:700,color:"#FF5722"}}>⚠️ Serviço em disputa</p>
              <p style={{margin:"4px 0 0",fontSize:12,color:"#666"}}>O Multi está analisando. Resposta em até 24h.</p>
            </div>
          )}
      </div>

      
          {service.status==="concluido" && (
            <>
              <FotosConclusao cliente={service.conclusao_fotos_cliente} profissional={service.conclusao_fotos_profissional} />
              <button onClick={()=>onAvaliar&&onAvaliar(service)} style={{marginTop:12,width:"100%",padding:"12px",background:"#FF9500",color:"white",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer"}}>⭐ Avaliar</button>
            </>
          )}
          {service.status==="concluido" ? (
        <div style={{ background:"white", borderRadius:20, padding:"28px 20px", textAlign:"center", boxShadow:"0 4px 18px rgba(0,0,0,.10)" }}>
          <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 6px 20px ${G}44` }}>
            <Check size={36} color="white" strokeWidth={3} />
          </div>
          <h3 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Serviço concluído!</h3>
          <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.6, margin:"0 0 20px" }}>Os dois lados confirmaram a conclusão.</p>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {[B, O, G, "#F9A825"].map((c, i) => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
          </div>
        </div>
      ) : (confirmed || jaConfirmeiConclusao) ? (
        <div style={{ background:"#F8F9FA", borderRadius:20, padding:"20px", textAlign:"center", border:"1px solid #E5E7EB" }}>
          <p style={{ fontSize:13.5, fontWeight:700, color:"#555", margin:0 }}>✅ Você confirmou. Aguardando confirmação do outro lado.</p>
        </div>
      ) : (
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(0,0,0,.10)" }}>
          <div style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", padding:"16px", display:"flex", alignItems:"center", gap:10 }}>
            <KeyRound size={20} color={O} />
            <div>
              <p style={{ fontSize:14, fontWeight:900, color:"white", margin:0 }}>Inserir Código do Cliente</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.55)", margin:0 }}>Digite o PIN de 4 dígitos pra confirmar a conclusão</p>
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

            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Observação sobre a conclusão (opcional)..."
              style={{ width:"100%", minHeight:70, marginTop:16, borderRadius:12, border:"1.5px solid #eee", padding:12, fontSize:13.5, fontFamily:"Nunito", resize:"none", boxSizing:"border-box" }}
            />
            {fotos.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:10 }}>
                {fotos.map((url, i) => <img key={i} src={url} style={{ width:56, height:56, borderRadius:10, objectFit:"cover" }} alt="" />)}
              </div>
            )}
            <label htmlFor="foto-conclusao-pro" style={{ marginTop:10, width:"100%", padding:"11px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#555", fontWeight:700, fontSize:12.5, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxSizing:"border-box" }}>
              <Camera size={14} /> {enviandoFoto ? "Enviando..." : "Adicionar foto (opcional)"}
            </label>
            <input id="foto-conclusao-pro" type="file" accept="image/*" multiple onChange={handleFotoConclusao} disabled={enviandoFoto} style={{ display:"none" }} />
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
function ServiceDetailPro({ service, onBack, isPro, onUpgrade, onOpenPinEntry, onAvaliar }) {
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

      {(service.photos&&service.photos.length>0?service.photos:[service.photo]).filter(Boolean).length>0 && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{(service.photos&&service.photos.length>0?service.photos:[service.photo]).filter(Boolean).map((src,i)=><img key={i} src={src} style={{width:service.photos&&service.photos.length>1?"calc(50% - 4px)":"100%",borderRadius:16,maxHeight:200,objectFit:"cover"}} />)}</div>}
      {/* Stepper for in-progress jobs */}
      {phase >= 1 && (
        <div style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e", margin:"0 0 14px" }}>Progresso do Job</p>
          <ServiceStatusStepper phase={phase} />
          {/* Avança aberto→em_andamento→executando. A partir daqui, a
              conclusão é bilateral — só pelo botão de PIN mais abaixo, não
              por esse atalho (que fechava o pedido sozinho). */}
          {phase < 2 && (
            <button onClick={()=>{
              const nextStatus=["aberto","em_andamento","executando"][Math.min(phase+1,2)];
              supabase.from("pedidos").update({status:nextStatus,updated_at:new Date().toISOString()}).eq("id",service.id).then(()=>{
                onBack&&onBack();
              }).catch(()=>{});
            }} style={{marginTop:12,width:"100%",padding:"12px",background:"#007BFF",color:"white",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor:"pointer"}}>
              {["Iniciar Serviço","Marcar Em Execução"][phase]||"Avançar"}
            </button>
          )}
        </div>
      )}

      <Card><p style={{ fontWeight:800, color:"#1a1a2e", marginBottom:8, fontSize:13 }}>Descrição</p><p style={{ fontSize:13, color:"#aaa", lineHeight:1.5 }}>{service.description || service.desc || "Sem descrição"}</p></Card>

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

      {/* Já concluído (bilateral) — avaliar direto, sem precisar passar pela
          tela de PIN de novo. Enquanto não concluído, CTA pra abrir o PIN. */}
      {service.status==="concluido" ? (
        <button onClick={()=>onAvaliar&&onAvaliar(service)} style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:"#FF9500", color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 5px 18px rgba(255,149,0,.35)" }}>
          ⭐ Avaliar
        </button>
      ) : phase >= 1 && (
        <button onClick={onOpenPinEntry} style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 5px 18px rgba(0,0,0,.2)" }}>
          <KeyRound size={18} /> Inserir Codigo do Cliente (Finalizar)
        </button>
      )}
    </div>
  );
}

/* ───────────────────────── PRO UPGRADE ──────────────────────────────────────── */
// Multi passa a monetizar por assinatura (plano fixo por tier), não mais por
// período de cobrança — substitui a antiga simulação de PIX/cartão (que
// chamava de verdade um backend externo de pagamento) por uma escolha de
// plano que ativa um trial de 7 dias direto no Supabase. Cobrança real via
// Asaas fica pra uma fase futura (ver assinaturas.asaas_subscription_id).
const PLANOS_USUARIO = [
  {
    id: "autonomo", icon: User, label: "Multi Autônomo", price: "29,90", perDay: "menos de R$1 por dia",
    hook: "Pare de depender só de indicação. Comece a encontrar novos clientes.",
    intro: "Você sabe fazer. Você tem experiência. Mas nem sempre tem cliente. Com o Multi Autônomo, você coloca seu trabalho na frente de pessoas que estão procurando profissionais como você.",
    beneficios: [
      { icon: MapPin, text: "Apareça para clientes que procuram o seu serviço na sua região" },
      { icon: Bell, text: "Receba novas oportunidades compatíveis com sua profissão" },
      { icon: DollarSign, text: "Aceite o valor oferecido ou faça sua própria proposta" },
      { icon: MessageCircle, text: "Negocie diretamente com o cliente" },
      { icon: Star, text: "Construa seu histórico e sua reputação com avaliações reais" },
      { icon: ClipboardList, text: "Acompanhe todos os seus serviços em um só lugar" },
    ],
    idealLead: "Ideal para quem quer:",
    ideal: "Mais oportunidades. Mais clientes. Mais chances de trabalhar. Você faz o serviço. O Multi ajuda você a encontrar quem precisa dele.",
    ctaLabel: "Quero encontrar clientes",
  },
  {
    id: "pro", icon: Crown, label: "Multi Pro", price: "59,90", perDay: "menos de R$2 por dia", badge: "Mais escolhido",
    hook: "Seu próximo cliente pode ser uma empresa.",
    intro: "Você não precisa limitar seu crescimento aos pequenos serviços do dia a dia. Com o Multi Pro, além de encontrar clientes, você pode abrir portas para novos projetos, demandas profissionais e oportunidades com empresas que procuram prestadores para realizar seus serviços.",
    beneficios: [
      { icon: CheckCircle2, text: "Tudo do Multi Autônomo", lead: true },
      { icon: Eye, text: "Torne seu perfil visível para empresas que procuram profissionais" },
      { icon: Send, text: "Receba oportunidades de projetos e demandas de prestação de serviços" },
      { icon: Briefcase, text: "Tenha acesso a oportunidades de contratos PJ e trabalhos temporários" },
      { icon: TrendingUp, text: "Amplie suas possibilidades para projetos maiores e serviços recorrentes" },
      { icon: BadgeCheck, text: "Construa sua reputação profissional e aumente suas chances de ser escolhido" },
    ],
    idealLead: "Ideal para quem pensa além do próximo serviço.",
    ideal: "Você não quer apenas trabalhar hoje. Você quer construir uma carreira, conquistar contratos e crescer. O Multi Pro coloca você em mais lugares onde novas oportunidades podem acontecer.",
    ctaLabel: "Quero crescer com o Multi Pro",
  },
];
const PLANOS_EMPRESA = [
  { id:"empresa",      icon:Briefcase, label:"Multi Empresa",      price:"149,90", beneficios:["Captar clientes"] },
  { id:"empresa_plus", icon:Crown,     label:"Multi Empresa Plus", price:"299,90", beneficios:["Captar clientes","Banco de profissionais (busca/filtro)","Criar demandas de mão de obra","Dashboard"] },
];

function EscolherPlanoScreen({ titularTipo, titularEmail, titularNome, onBack, onDone, showToast }) {
  const isEmpresa = titularTipo === "empresa";
  const planos = isEmpresa ? PLANOS_EMPRESA : PLANOS_USUARIO;
  const [savingId, setSavingId] = useState(null);

  const confirmar = async (planoId) => {
    if (!titularEmail) { showToast?.("❌ E-mail do titular não encontrado.", "#DC2626"); return; }
    setSavingId(planoId);
    const inicio = new Date();
    const expira = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("assinaturas").upsert({
      titular_tipo: titularTipo,
      titular_email: titularEmail,
      plano: planoId,
      status: "trial",
      inicio: inicio.toISOString(),
      expira_em: expira.toISOString(),
    }, { onConflict: "titular_tipo,titular_email" });
    setSavingId(null);
    if (error) { showToast?.("❌ Erro ao ativar plano: " + (error.message || ""), "#DC2626"); return; }
    showToast?.("🎉 Plano ativado! 7 dias grátis pra testar.", G);
    onDone?.(planoId);
  };

  return (
    <div style={{ minHeight:"100vh", background: isEmpresa ? BG : "linear-gradient(180deg,#F2F3FB,#E7E9F5)", padding:"20px 16px 48px", fontFamily:"'Nunito', -apple-system, sans-serif" }}>
      <style>{`@keyframes planoGlow{0%,100%{opacity:.7}50%{opacity:1}}`}</style>

      {onBack && <button onClick={onBack} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", marginBottom:8 }}>←</button>}

      <h2 style={{ textAlign:"center", fontWeight:900, fontSize: isEmpresa ? 22 : 23, color:"#1a1a2e", margin:"0 0 8px", letterSpacing:-.3, lineHeight:1.3 }}>
        {isEmpresa ? "Escolha seu plano" : <>Você pode continuar esperando o próximo cliente aparecer... ou começar a <span style={{ color:O }}>criar novas oportunidades</span>.</>}
      </h2>
      <p style={{ textAlign:"center", color:"#666", fontSize:14, lineHeight:1.5, margin:"0 auto 26px", maxWidth:340 }}>
        {isEmpresa
          ? <>7 dias grátis pra testar{titularNome ? `, ${titularNome}` : ""} — sem cartão agora.</>
          : "No Multi, você encontra pessoas e empresas que já estão procurando profissionais para realizar serviços. Escolha como você quer crescer."}
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:420, margin:"0 auto" }}>
        {planos.map(p => {
          const isPro = !!p.badge;
          const HeaderIcon = p.icon || Briefcase;
          const beneficios = p.beneficios.map(b => typeof b === "string" ? { text:b, Icon:Check, lead:false } : { text:b.text, Icon:b.icon || Check, lead:!!b.lead });
          const saving = savingId === p.id;

          const card = (
            <div style={{
              position:"relative",
              background: isPro ? "linear-gradient(180deg,#FFF4EC,#FFE2CF)" : "white",
              borderRadius: isPro ? 20 : 22,
              padding: isPro ? "26px 22px 22px" : "22px 20px",
              border: isPro ? "none" : "1.5px solid #ECEDF5",
            }}>
              {isPro && (
                <span style={{
                  position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)",
                  background:`linear-gradient(135deg,#FFB100,${O})`, color:"#2A1200",
                  fontSize:10.5, fontWeight:800, letterSpacing:.5, textTransform:"uppercase",
                  padding:"7px 16px", borderRadius:99, boxShadow:`0 6px 16px ${O}55`,
                  display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap",
                }}>
                  <Star size={12} fill="#2A1200" color="#2A1200" /> {p.badge}
                </span>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:38, height:38, borderRadius:12, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: isPro ? `linear-gradient(135deg,#FFB100,${O})` : "#EBEFFE",
                    color: isPro ? "#2A1200" : B,
                  }}>
                    <HeaderIcon size={19} />
                  </div>
                  <p style={{ fontWeight:800, fontSize: isPro ? 18 : 16.5, color:"#14152A", margin:0, letterSpacing:-.1 }}>{p.label}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <p style={{ fontWeight:900, color:"#14152A", margin:0, fontSize: isPro ? 24 : 21 }}>
                    R$ {p.price.split(",")[0]}<span style={{ fontSize:13 }}>,{p.price.split(",")[1]}</span>
                  </p>
                  <p style={{ fontSize:11, color:"#8A8DAE", fontWeight:700, margin:"1px 0 0" }}>/mês</p>
                  {p.perDay && <p style={{ fontSize:10.5, color: isPro ? O : "#8A8DAE", fontWeight: isPro ? 800 : 600, margin:"3px 0 0" }}>{p.perDay}</p>}
                </div>
              </div>

              {p.hook && <p style={{ fontWeight:700, fontSize: isPro ? 16.5 : 15, color:"#14152A", margin:"0 0 8px", lineHeight:1.35 }}>{p.hook}</p>}
              {p.intro && <p style={{ fontSize:13, color:"#6C6F94", lineHeight:1.58, margin:"0 0 20px" }}>{p.intro}</p>}

              <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                {beneficios.map((b, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{
                      width:32, height:32, borderRadius:10, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background: b.lead ? "#14152A" : isPro ? `${O}22` : "#EBEFFE",
                      color: b.lead ? "#FFF4EC" : isPro ? O : B,
                    }}>
                      <b.Icon size={16} />
                    </div>
                    <span style={{ fontSize:13.5, lineHeight:1.45, color: b.lead ? "#14152A" : "#42436A", fontWeight: b.lead ? 700 : 400, paddingTop:4 }}>{b.text}</span>
                  </div>
                ))}
              </div>

              {p.ideal && (
                <p style={{ marginTop:18, paddingTop:14, borderTop:`1px dashed ${isPro ? O+"4D" : "#E2E4F1"}`, fontSize:11.5, lineHeight:1.5, color:"#6C6F94" }}>
                  <b style={{ color:"#14152A", fontWeight:800 }}>{p.idealLead}</b> {p.ideal}
                </p>
              )}

              <button onClick={() => confirmar(p.id)} disabled={saving} style={{
                marginTop:22, width:"100%", border:"none", borderRadius:16, padding:"16px 0",
                fontWeight:800, fontSize:13, letterSpacing:.4, textTransform:"uppercase",
                color:"white", cursor: saving ? "default" : "pointer",
                background: isPro ? `linear-gradient(135deg,${O},#E8280A)` : `linear-gradient(135deg,${B},#22348F)`,
                boxShadow: isPro ? `0 16px 30px -10px ${O}66` : `0 14px 28px -10px ${B}88`,
              }}>
                {saving ? "Ativando..." : (p.ctaLabel || "Escolher este plano")}
              </button>
            </div>
          );

          return isPro ? (
            <div key={p.id} style={{ position:"relative", paddingTop:14 }}>
              <div style={{
                position:"absolute", inset:"12px -12px -12px", borderRadius:30,
                background:`radial-gradient(120% 100% at 50% 0%, ${O}4D, transparent 70%)`,
                filter:"blur(20px)", animation:"planoGlow 4.5s ease-in-out infinite", zIndex:0,
              }} />
              <div style={{
                position:"relative", zIndex:1, borderRadius:22, padding:2,
                background:`linear-gradient(155deg,#FFB100,${O} 45%,#E8280A 100%)`,
                boxShadow:`0 20px 40px -16px ${O}4D`,
              }}>
                {card}
              </div>
            </div>
          ) : (
            <div key={p.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

/* ── CHECKOUT SCREEN ── */
const CheckoutScreen = () => {
  const PIX_KEY = "fcb02632-5dd9-4c2d-92f6-0c3a907d2b81";

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
          <div style={{ background:`linear-gradient(135deg,#1976D2,#0055d4)`, padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }} onClick={()=>onToggleRole&&onToggleRole("client")}>
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
/* ───────────────────────── WALLET SCREEN (Histórico de Ganhos) ─────────────── */
// Multi não intermedia mais pagamento — cliente paga o profissional direto —
// então isso não é mais uma carteira com saldo/saque, e sim um histórico
// informativo somado a partir dos pedidos reais (status "concluido",
// profissional_aceito = usuário). "pedidos" vem de mapPedidoRow, já filtrado
// pro profissional logado em App().
function WalletScreen({ onBack, pedidos }) {
  const history = [...(pedidos || [])]
    .sort((a, b) => new Date(b.concluido_em || b.time || 0) - new Date(a.concluido_em || a.time || 0))
    .map(p => ({
      id: p.id,
      date: new Date(p.concluido_em || p.time).toLocaleDateString("pt-BR"),
      service: p.desc || p.cat || "Serviço",
      value: p.value || 0,
    }));

  const total = history.reduce((a, h) => a + h.value, 0);
  const now = new Date();
  const totalMonth = (pedidos || [])
    .filter(p => { const d = p.concluido_em ? new Date(p.concluido_em) : null; return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((a, p) => a + (p.value || 0), 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#F8F9FA", minHeight:"100vh", paddingBottom:60 }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(160deg,#0F3460 0%,#1a4a7a 100%)", padding:"16px 18px 32px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <h2 style={{ fontSize:18, fontWeight:900, color:"white", margin:0 }}>Histórico de Ganhos</h2>
        </div>

        {/* total hero */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.55)", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 6px" }}>Total Recebido</p>
          <p style={{ fontSize:42, fontWeight:900, color:"white", margin:"0 0 4px", lineHeight:1 }}>
            R$ <span style={{ color:"#4ade80" }}>{total.toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 })}</span>
          </p>
          <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", margin:0 }}>Soma dos serviços concluídos — pago direto pelo cliente</p>
        </div>

        {/* stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[
            { label:"Este mês", value:`R$ ${totalMonth.toLocaleString("pt-BR")}`, color:"#4ade80" },
            { label:"Serviços", value:history.length, color:"white" },
          ].map((s, i) => (
            <div key={i} style={{ background:"rgba(255,255,255,.08)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <p style={{ fontSize:15, fontWeight:900, color:s.color, margin:0 }}>{s.value}</p>
              <p style={{ fontSize:10, color:"rgba(255,255,255,.45)", fontWeight:700, margin:"3px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ padding:"20px 16px 0" }}>
        <button onClick={() => window.open("/relatorio.html", "_blank")} style={{ width:"100%", padding:"14px 0", borderRadius:16, border:"1.5px solid "+B, background:"white", color:B, fontWeight:900, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <TrendingUp size={17} /> Relatório
        </button>
      </div>

      {/* ── HISTORY ── */}
      <div style={{ margin:"20px 16px 0", background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
        <div style={{ padding:"12px 16px 8px", borderBottom:"1px solid #F0F0F0" }}>
          <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:0 }}>Serviços Concluídos</p>
        </div>
        {history.length === 0 && (
          <div style={{ padding:"24px 16px", textAlign:"center" }}>
            <p style={{ fontSize:13, color:"#aaa", margin:0 }}>Nenhum serviço concluído ainda.</p>
          </div>
        )}
        {history.map((h, i) => (
          <div key={h.id} style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, borderBottom: i < history.length-1 ? "1px solid #F8F8F8" : "none" }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <CheckCircle2 size={17} color={G} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", margin:"0 0 2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{h.service}</p>
              <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{h.date}</p>
            </div>
            <span style={{ fontSize:14, fontWeight:900, color:G, flexShrink:0 }}>
              +R$ {h.value.toLocaleString("pt-BR", { minimumFractionDigits:2 })}
            </span>
          </div>
        ))}
      </div>
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
const API_BASE = "https://multi-backend-lfwp.onrender.com";

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
    { q: "Como funciona o pagamento?", a: "O valor do serviço é combinado diretamente entre você e o profissional/empresa, e o pagamento é feito por fora da Plataforma, da forma que os dois preferirem (Pix, dinheiro, etc.). A Multi não participa dessa parte — nosso papel é conectar vocês." },
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
  const API = "https://multi-backend-lfwp.onrender.com";
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

function ProfileScreen({ role, isPro, plano, planoStatus, planoExpiraEm, userName: initialUserName, userEmail, showRankingGlobal, onClearRankingGlobal, onUpgrade, onLogout, showToast, onOpenWallet, meusGanhos, onOpenAdmin, docStatus, onDocStatusChange, onSwitchRole }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [name, setName] = useState(initialUserName || "");
  useEffect(() => { if (initialUserName) setName(initialUserName); }, [initialUserName]);
  // Antes disso, avatar/portfólio só viviam em sessionStorage/estado local —
  // nunca eram lidos do Supabase, então "salvavam" só até fechar a aba.
  useEffect(() => {
    if (!userEmail) return;
    supabase.from("usuarios").select("foto_perfil_url").eq("email", userEmail).maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.foto_perfil_url || null))
      .catch(() => {});
  }, [userEmail]);
  const [reputacao, setReputacao] = useState(null);
  useEffect(() => { fetchReputacao(userEmail).then(setReputacao); }, [userEmail]);
  const [portfolioImgs, setPortfolioImgs] = useState([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [categoriaServico, setCategoriaServico] = useState([]);
  const [savingCategoria, setSavingCategoria] = useState(false);
  // Mesma proteção contra corrida do ProfessionalHome: se o usuário já mudou a
  // categoria antes desse fetch inicial responder, não deixa a resposta antiga
  // sobrescrever a escolha recém-feita.
  const categoriaTocadaRef = useRef(false);
  useEffect(() => {
    if (role !== "professional" || !userEmail) return;
    supabase.from("usuarios").select("categoria_servico,bio,portfolio").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        if (!categoriaTocadaRef.current) setCategoriaServico(data?.categoria_servico || []);
        setBio(data?.bio || "");
        setPortfolioImgs((data?.portfolio || []).map(url => ({ id: url, url })));
      })
      .catch(() => {});
  }, [role, userEmail]);

  // Multi Autônomo trava em MAX_CATEGORIAS_AUTONOMO categorias — Multi Pro é ilimitado.
  // Importante: usa "plano" (id exato da assinatura: "autonomo"/"pro"), não "isPro" —
  // isPro só indica "tem alguma assinatura ativa" (inclui Autônomo), então usá-lo aqui
  // deixava o Autônomo sem limite nenhum assim que a trial/assinatura ficava ativa.
  const MAX_CATEGORIAS_AUTONOMO = 3;
  const isPlanoPro = plano === "pro";
  const limiteCategoria = isPlanoPro ? undefined : MAX_CATEGORIAS_AUTONOMO;

  const handleSaveCategoria = async (novasCategorias) => {
    categoriaTocadaRef.current = true;
    setCategoriaServico(novasCategorias);
    if (!userEmail) return;
    setSavingCategoria(true);
    const { error } = await supabase.from("usuarios").update({ categoria_servico: novasCategorias }).eq("email", userEmail);
    setSavingCategoria(false);
    if (error) showToast?.("❌ Erro ao salvar categoria: " + (error.message || ""), "#DC2626");
    else showToast?.("✅ Categorias de serviço salvas!", G);
  };

  const handleLimiteCategoria = () => {
    showToast?.(`⚠️ Multi Autônomo permite até ${MAX_CATEGORIAS_AUTONOMO} categorias — vire Pro pra categorias ilimitadas`, O);
    onUpgrade?.();
  };
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

  // Foto de perfil — sobe pro bucket "pedidos-fotos" (mesmo já usado por
  // empresas/pedidos) e persiste em usuarios.foto_perfil_url.
  const handleAvatar = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setUploadingAvatar(true);
    try {
      const ext = f.type.includes("png") ? "png" : "jpg";
      const path = `perfil_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      setAvatarUrl(url);
      if (userEmail) {
        const { error } = await supabase.from("usuarios").update({ foto_perfil_url: url }).eq("email", userEmail);
        if (error) throw error;
      }
      showToast?.("✅ Foto de perfil atualizada!", G);
    } catch (err) {
      showToast?.("❌ Erro ao enviar foto: " + (err.message || ""), "#DC2626");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Portfólio — mesmo bucket, persiste o array completo em usuarios.portfolio
  // (não só localmente, como antes).
  const handlePortfolio = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploadingPortfolio(true);
    try {
      const newUrls = [];
      for (const f of files) {
        const ext = f.type.includes("png") ? "png" : "jpg";
        const path = `portfolio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true });
        if (upErr) throw upErr;
        newUrls.push(supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl);
      }
      const updatedUrls = [...portfolioImgs.map(p => p.url), ...newUrls];
      setPortfolioImgs(updatedUrls.map(url => ({ id: url, url })));
      if (userEmail) {
        const { error } = await supabase.from("usuarios").update({ portfolio: updatedUrls }).eq("email", userEmail);
        if (error) throw error;
      }
    } catch (err) {
      showToast?.("❌ Erro ao enviar foto: " + (err.message || ""), "#DC2626");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const removePortfolioImg = (id) => {
    const updatedUrls = portfolioImgs.filter(x => x.id !== id).map(p => p.url);
    setPortfolioImgs(p => p.filter(x => x.id !== id));
    if (userEmail) supabase.from("usuarios").update({ portfolio: updatedUrls }).eq("email", userEmail).then(() => {}).catch(() => {});
  };

  const handleSaveBio = async (novaBio) => {
    if (!userEmail) return;
    setSavingBio(true);
    const { error } = await supabase.from("usuarios").update({ bio: novaBio }).eq("email", userEmail);
    setSavingBio(false);
    if (error) showToast?.("❌ Erro ao salvar bio: " + (error.message || ""), "#DC2626");
  };

  const stats = {
    rating: reputacao?.mediaEstrelas != null ? reputacao.mediaEstrelas.toFixed(1) : "—",
    count: reputacao?.concluidos || 0,
    label: role === "client" ? "contratações" : "serviços feitos",
    taxaConclusao: reputacao?.taxaConclusao != null ? `${Math.round(reputacao.taxaConclusao * 100)}%` : "—",
  };

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
            <div style={{ width:88, height:88, borderRadius:"50%", background:"rgba(255,255,255,.25)", border:"3px solid rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:"pointer", opacity: uploadingAvatar ? .5 : 1 }}
              onClick={() => editMode && !uploadingAvatar && avatarRef.current?.click()}>
              {avatarUrl
                ? <img src={avatarUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="avatar" />
                : <span style={{ fontSize:40 }}>{role === "client" ? "👩" : "👨‍🔧"}</span>}
            </div>
            {editMode && (
              <div onClick={() => !uploadingAvatar && avatarRef.current?.click()} style={{ position:"absolute", bottom:0, right:0, width:26, height:26, background:O, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white", cursor:"pointer" }}>
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
              { val: stats.taxaConclusao,  lbl:"Conclusão" },
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
          {/* Ganhos card — links to full histórico (ex-Carteira). Multi não
              intermedia pagamento (cliente paga o profissional direto), então
              isso é só um resumo informativo dos serviços concluídos. */}
          <div style={{ padding:"0 16px", marginTop:-20, position:"relative", zIndex:2 }}>
            <div onClick={onOpenWallet} style={{ background:"white", borderRadius:20, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,.10)", border:"1px solid #F0F0F0", cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${G},#16a34a)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Wallet size={20} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize:11, color:"#aaa", fontWeight:700, margin:0 }}>Total recebido</p>
                    <p style={{ fontSize:24, fontWeight:900, color:G, margin:0 }}>
                      R$ {(meusGanhos || []).reduce((a, p) => a + (p.value || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits:2 })}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Serviços</p>
                  <p style={{ fontSize:14, fontWeight:800, color:B }}>{(meusGanhos || []).length}</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid #F0F0F0" }}>
                <span style={{ fontSize:12, color:B, fontWeight:800, display:"flex", alignItems:"center", gap:5 }}>
                  <Wallet size={13} /> Ver Histórico Completo
                </span>
                <ChevronRight size={15} color={B} />
              </div>
            </div>
          </div>

          {/* Categorias de serviço — obrigatória pra poder ficar online no Mural */}
          <div style={{ padding:"14px 16px 0" }}>
            <div style={{ background:"white", borderRadius:16, padding:16, boxShadow:"0 3px 14px rgba(0,0,0,.07)", border: categoriaServico.length ? "1px solid #F0F0F0" : "1.5px solid #FCA5A5" }}>
              <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.1 }}>Categorias de Serviço</p>
              <p style={{ margin:"0 0 10px", fontSize:11, color:"#9CA3AF" }}>
                Necessárias pra ficar online e receber pedidos no Mural.
                {!isPlanoPro && ` Multi Autônomo: até ${MAX_CATEGORIAS_AUTONOMO}.`}
              </p>
              <CategoriaMultiSelect
                value={categoriaServico}
                onChange={handleSaveCategoria}
                max={limiteCategoria}
                onLimitReached={handleLimiteCategoria}
              />
              {!isPlanoPro && (
                <button onClick={onUpgrade} style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0, color:O, fontSize:11.5, fontWeight:800 }}>
                  <Crown size={13} /> Virar Pro pra categorias ilimitadas
                </button>
              )}
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
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e" }}>{isPro && plano === "pro" ? "Multi Pro" : "Multi Autônomo"}</p>
                  <p style={{ fontSize:11, color: isPro ? G : "#bbb" }}>
                    {isPro
                      ? `✅ ${planoStatus === "trial" ? "Em trial" : "Ativo"}${planoExpiraEm ? " até " + new Date(planoExpiraEm).toLocaleDateString("pt-BR") : ""}`
                      : "❌ Nenhum plano ativo"}
                  </p>
                </div>
              </div>
              {isPro
                ? <button onClick={onUpgrade} style={{ background:G+"18", color:G, fontWeight:800, fontSize:11, padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer" }}>{plano === "pro" ? "PRO" : "Trocar"}</button>
                : <button onClick={onUpgrade} style={{ background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:800, fontSize:11, padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer" }}>Escolher plano</button>}
            </div>
          </div>

          {/* Bio — mesmo texto pedido em CompletarPerfilScreen no cadastro, editável depois */}
          <div style={{ padding:"14px 16px 0" }}>
            <div style={{ background:"white", borderRadius:16, padding:16, boxShadow:"0 3px 14px rgba(0,0,0,.07)" }}>
              <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.1 }}>Sobre você</p>
              <p style={{ margin:"0 0 10px", fontSize:11, color:"#9CA3AF" }}>Aparece pra clientes e empresas junto das suas propostas.</p>
              <textarea
                value={bio}
                maxLength={160}
                disabled={savingBio}
                onChange={e => setBio(e.target.value)}
                onBlur={() => handleSaveBio(bio)}
                placeholder="Ex: Encanador com 10 anos de experiência, atendo emergências"
                rows={3}
                style={{ width:"100%", border:"1.5px solid #E5E7EB", borderRadius:14, padding:"13px 14px", fontSize:14, color:"#1a1a2e", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"none" }} />
              <p style={{ fontSize:11, color:"#9CA3AF", margin:"5px 0 0", textAlign:"right" }}>{bio.length}/160</p>
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
                  <button onClick={() => removePortfolioImg(img.id)} style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,.5)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={10} color="white" />
                  </button>
                </div>
              ))}
              <button onClick={() => portfolioRef.current?.click()} disabled={uploadingPortfolio} style={{ width:80, height:80, borderRadius:12, border:"2px dashed #DDD", background:BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor: uploadingPortfolio ? "default" : "pointer", color:"#ccc", flexShrink:0 }}>
                <Image size={18} /><span style={{ fontSize:10, fontWeight:700 }}>{uploadingPortfolio ? "Enviando..." : "Adicionar"}</span>
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
// Vocabulário real tem 5 estados (aberto/em_andamento/executando/concluido/
// em_disputa); a tela tem 3 abas — em_andamento/executando/em_disputa ficam
// juntas em "Em Andamento" (em_disputa ganha um badge extra de alerta).
function isEmAndamentoTab(status) {
  return status === "em_andamento" || status === "executando" || status === "em_disputa";
}

// Cancelado entra no mesmo bucket terminal de concluído — senão some da
// lista (nenhuma das 3 abas bateria com o status exato).
function isConcluidoTab(status) {
  return status === "concluido" || status === "cancelado";
}

function MyServicesScreen({ myServices, onOpenService, onOpenChat, onViewPropostas, onCancelarPedido, isPro, initialTab = "aberto" }) {
  const [tab, setTab] = useState(initialTab);

  const tabs = [
    { id:"aberto",       label:"Aguardando",   color:"#0070F3" },
    { id:"em_andamento", label:"Em Andamento", color:O },
    { id:"concluido",    label:"Concluído",    color:G },
  ];

  const matchesTab = (s, tabId) => tabId === "em_andamento" ? isEmAndamentoTab(s.status) : tabId === "concluido" ? isConcluidoTab(s.status) : s.status === tabId;
  const filtered = myServices.filter(s => matchesTab(s, tab));

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
              {myServices.filter(s => matchesTab(s, t.id)).length}
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
          const statusColor = s.status === "aberto" ? B : isEmAndamentoTab(s.status) ? O : s.status === "cancelado" ? "#DC2626" : G;
          const statusLabel = s.status === "aberto" ? "Aguardando propostas" : s.status === "concluido" ? "Concluído" : s.status === "cancelado" ? "Cancelado" : "Em andamento";
          return (
            <div key={s.id} style={{ background:"white", borderRadius:16, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)", border:"1px solid #F0F0F0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{cat?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", marginBottom:3 }}>{s.title}</p>
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background: statusColor+"18", color: statusColor }}>{statusLabel}</span>
                  {s.status === "em_disputa" && (
                    <span style={{ marginLeft:6, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:"#FEE2E2", color:"#DC2626" }}>🚨 Em disputa</span>
                  )}
                </div>
                <span style={{ fontSize:16, fontWeight:900, color:B, flexShrink:0 }}>R$ {s.value}</span>
              </div>

              <p style={{ fontSize:12, color:"#aaa", lineHeight:1.5, marginBottom:12 }}>{s.desc}</p>

              {s.status === "aberto" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:12, color:"#aaa" }}>👥 {s.candidates || 0} candidatos</span>
                  <div style={{ display:"flex", gap:8 }}>
                    {onCancelarPedido && (
                      <button onClick={() => onCancelarPedido(s)} style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid #DC2626", background:"white", color:"#DC2626", fontSize:12, fontWeight:800, cursor:"pointer" }}>Cancelar</button>
                    )}
                    <button onClick={() => { onViewPropostas(s); }} style={{ padding:"8px 14px", borderRadius:10, border:`1.5px solid ${B}`, background:"white", color:B, fontSize:12, fontWeight:800, cursor:"pointer" }}>Ver Propostas</button>
                  </div>
                </div>
              )}

              {isEmAndamentoTab(s.status) && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👨‍🔧</div>
                    <div>
                      <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e" }}>{s.pro}</p>
                      <p style={{ fontSize:11, color:"#aaa" }}>Profissional ativo</p>
                    </div>
                  </div>
                  <button onClick={() => onOpenService(s)} style={{ padding:"8px 12px", borderRadius:10, border:"1px solid #007BFF", background:"white", color:"#007BFF", fontWeight:700, fontSize:13, cursor:"pointer", marginRight:8 }}>📊 Progresso</button>
                <button onClick={() => onOpenChat(s)} style={{ padding:"8px 14px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${B},#0056c7)`, color:"white", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    <MessageCircle size={13} /> Chat
                  </button>
                </div>
              )}

              {s.status === "concluido" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <MiniStars v={s.clientRating || 0} size={14} />
                    <span style={{ fontSize:11, color:"#aaa" }}>{s.clientRating ? `${s.clientRating}.0` : "Não avaliado"}</span>
                  </div>
                  <button onClick={() => onOpenService(s)} style={{ padding:"8px 14px", borderRadius:10, border:`1.5px solid ${G}`, background:"white", color:G, fontSize:12, fontWeight:800, cursor:"pointer" }}>✅ Ver detalhes</button>
                </div>
              )}
              {s.status === "cancelado" && (
                <span style={{ fontSize:12, fontWeight:700, color:"#DC2626" }}>❌ Cancelado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── CHAT INBOX ──────────────────────────────────────── */
function ChatInbox({ myServices, onOpenChat }) {
  const active = myServices.filter(s => isEmAndamentoTab(s.status) || s.status === "concluido");
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
        const unread = isEmAndamentoTab(s.status);
        return (
          <div key={s.id} onClick={() => onOpenChat(s)} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 16px", borderBottom:"1px solid #F4F4F6",
            background:"white", cursor:"pointer",
          }}>
            {/* avatar with online dot */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ width:48, height:48, borderRadius:15, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{cat?.emoji}</div>
              {isEmAndamentoTab(s.status) && (
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
                {isEmAndamentoTab(s.status) ? `Orçamento R$ ${s.proposalValue || s.value} confirmado 👍` : "✅ Serviço concluído"}
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


// Chat de negociação real (Fase 1) — mensagens persistidas em "mensagens",
// chaveadas por pedido_id (um pedido em_andamento só tem uma proposta aceita,
// então pedido_id já desambigua a negociação sem precisar de proposta_id).
// Sem realtime: polling simples, consistente com o resto do app.
function NegociacaoChatScreen({ chat, meuEmail, onBack }) {
  const [mensagens, setMensagens] = useState([]);
  const [pedido,    setPedido]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [dataInput, setDataInput] = useState("");
  const endRef = useRef(null);

  const carregar = () => {
    supabase.from("mensagens").select("*").eq("pedido_id", chat.pedidoId).order("criado_em")
      .then(({ data }) => setMensagens(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    supabase.from("pedidos")
      .select("cliente_id,profissional_aceito,aceite_formal_cliente_em,aceite_formal_profissional_em,data_agendada")
      .eq("id", chat.pedidoId).maybeSingle()
      .then(({ data }) => setPedido(data || null))
      .catch(() => {});
  };

  useEffect(() => {
    carregar();
    const interval = setInterval(carregar, 5000);
    return () => clearInterval(interval);
  }, [chat.pedidoId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [mensagens]);

  const enviar = () => {
    const texto = text.trim();
    if (!texto || sending) return;
    setSending(true);
    setText("");
    supabase.from("mensagens").insert({ pedido_id: chat.pedidoId, remetente_email: meuEmail, texto })
      .then(() => carregar())
      .catch(() => {})
      .finally(() => setSending(false));
  };

  // Aceite formal (Fase 2): gate de liberação de telefone. Cada lado aceita no
  // máximo uma vez — 1-pra-1 com a linha de "pedidos", sem tabela separada.
  const souCliente  = pedido?.cliente_id === meuEmail;
  const meuAceite   = pedido && (souCliente ? pedido.aceite_formal_cliente_em : pedido.aceite_formal_profissional_em);
  const liberado    = !!(pedido?.aceite_formal_cliente_em && pedido?.aceite_formal_profissional_em);

  const aceitarContratacao = () => {
    if (!pedido || aceitando) return;
    if (!pedido.data_agendada && !dataInput) return;
    setAceitando(true);
    const campo = souCliente ? "aceite_formal_cliente_em" : "aceite_formal_profissional_em";
    const updates = { [campo]: new Date().toISOString() };
    if (!pedido.data_agendada) updates.data_agendada = new Date(dataInput).toISOString();
    supabase.from("pedidos").update(updates).eq("id", chat.pedidoId)
      .then(() => carregar())
      .catch(() => {})
      .finally(() => setAceitando(false));
  };

  const horaFmt = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const dataAgendadaFmt = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const agoraLocalStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"16px 18px 18px", borderRadius:"0 0 24px 24px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={17} color="white" />
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:15, fontWeight:900, color:"white", margin:0 }}>{chat.proName || "Conversa"}</p>
            {chat.serviceTitle && <p style={{ fontSize:11, color:"rgba(255,255,255,.75)", margin:0 }}>{chat.serviceTitle}</p>}
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {loading && <p style={{ textAlign:"center", color:"#aaa", fontSize:13 }}>Carregando...</p>}
        {!loading && mensagens.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 24px", color:"#ccc" }}>
            <MessageCircle size={36} color="#E0E0E0" style={{ margin:"0 auto 12px", display:"block" }} />
            <p style={{ fontSize:13, fontWeight:700 }}>Nenhuma mensagem ainda</p>
            <p style={{ fontSize:12, marginTop:4 }}>Envie a primeira mensagem pra combinar os detalhes.</p>
          </div>
        )}
        {mensagens.map(m => {
          const minha = m.remetente_email === meuEmail;
          return (
            <div key={m.id} style={{ display:"flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth:"78%", padding:"9px 13px", borderRadius:14,
                borderBottomRightRadius: minha ? 4 : 14, borderBottomLeftRadius: minha ? 14 : 4,
                background: minha ? B : "white", color: minha ? "white" : "#1a1a2e",
                boxShadow: minha ? "none" : "0 1px 4px rgba(0,0,0,.07)",
              }}>
                <p style={{ fontSize:13.5, lineHeight:1.4, margin:0, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{m.texto}</p>
                <p style={{ fontSize:10, margin:"4px 0 0", textAlign:"right", color: minha ? "rgba(255,255,255,.7)" : "#bbb" }}>{horaFmt(m.criado_em)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {pedido && mensagens.length > 0 && (
        liberado ? (
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#F0FDF4", border:`1px solid ${G}44` }}>
            <p style={{ fontSize:12.5, fontWeight:800, color:G, margin:0 }}>🤝 Contratação confirmada — telefone liberado.</p>
            {pedido.data_agendada && (
              <p style={{ fontSize:12, fontWeight:700, color:G, margin:"4px 0 0" }}>📅 Agendado pra {dataAgendadaFmt(pedido.data_agendada)}</p>
            )}
          </div>
        ) : meuAceite ? (
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB" }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:"#555", margin:0 }}>✅ Você confirmou. Aguardando confirmação do outro lado.</p>
            {pedido.data_agendada && (
              <p style={{ fontSize:12, color:"#888", margin:"4px 0 0" }}>📅 Data proposta: {dataAgendadaFmt(pedido.data_agendada)}</p>
            )}
          </div>
        ) : (
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#EFF6FF", border:`1px solid ${B}33` }}>
            {pedido.data_agendada ? (
              <p style={{ fontSize:12, color:"#555", margin:"0 0 8px" }}>📅 Data proposta: <strong>{dataAgendadaFmt(pedido.data_agendada)}</strong>. Confirmar libera o telefone pros dois lados.</p>
            ) : (
              <>
                <p style={{ fontSize:12, color:"#555", margin:"0 0 8px" }}>Já combinaram os detalhes? Escolha a data/hora do serviço e confirme — libera o telefone pros dois lados.</p>
                <input
                  type="datetime-local"
                  value={dataInput}
                  min={agoraLocalStr()}
                  onChange={e => setDataInput(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"1.5px solid #DBEAFE", fontSize:13, marginBottom:8, boxSizing:"border-box" }}
                />
              </>
            )}
            <button onClick={aceitarContratacao} disabled={aceitando || (!pedido.data_agendada && !dataInput)} style={{ width:"100%", padding:"9px 0", borderRadius:10, border:"none", background:G, color:"white", fontWeight:800, fontSize:12.5, cursor: (aceitando || (!pedido.data_agendada && !dataInput)) ? "default" : "pointer", opacity: (aceitando || (!pedido.data_agendada && !dataInput)) ? .5 : 1 }}>
              ✅ {pedido.data_agendada ? "Aceitar contratação" : "Propor data e aceitar"}
            </button>
          </div>
        )
      )}

      <div style={{ flexShrink:0, padding:"10px 14px", background:"white", borderTop:"1px solid #F0F0F0", display:"flex", gap:8, alignItems:"center" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") enviar(); }}
          placeholder="Escreva uma mensagem..."
          style={{ flex:1, padding:"11px 14px", borderRadius:99, border:"1.5px solid #EEE", fontSize:13.5, outline:"none" }}
        />
        <button onClick={enviar} disabled={!text.trim() || sending} style={{
          width:40, height:40, borderRadius:"50%", border:"none",
          background: text.trim() ? B : "#E0E0E0", color:"white",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor: text.trim() ? "pointer" : "default", flexShrink:0,
        }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── AUTH: ROLE SELECT SCREEN ──────────────────────────── */
const ROLE_OPTIONS = [
  {
    id: "cliente", icon: User, accent: B, accentDeep: B,
    title: "Preciso de um serviço",
    hook: "Encontre quem resolve.",
    desc: "Publique sua necessidade e encontre profissionais para realizar seu serviço.",
    tag: "Grátis para clientes", tagBg:"#F0FDF4", tagBorder:"#BBF7D0", tagColor:"#166534",
  },
  {
    id: "profissional", icon: Wrench, accent: O, accentDeep: O,
    title: "Quero trabalhar",
    hook: "Encontre quem precisa do que você faz.",
    desc: "Receba oportunidades de serviços e conquiste novos clientes.",
    tag: "7 dias grátis", tagBg:`${O}22`, tagBorder:"transparent", tagColor:O,
  },
  {
    id: "empresa", icon: Briefcase, accent: "#1a1a2e", accentDeep: "#0A2A6B",
    title: "Quero crescer minha empresa",
    hook: "Encontre clientes e profissionais para fazer sua operação acontecer.",
    desc: "Publique demandas, encontre mão de obra e amplie suas oportunidades.",
    tag: "7 dias grátis", tagBg:"#1a1a2e14", tagBorder:"transparent", tagColor:"#1a1a2e",
  },
];

function RoleSelectScreen({ onSelect, onLogin }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA" }}>
      <div style={{
        background:`radial-gradient(420px 320px at 88% 98%, #FFB74D55, transparent 65%), linear-gradient(160deg,${B} 0%,#0055D4 55%,#0A2A6B 130%)`,
        padding:"22px 26px 84px", position:"relative", overflow:"hidden", borderRadius:"0 0 0 0",
      }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.06)" }} />
        <div style={{ position:"absolute", top:"40%", left:-60, width:170, height:170, borderRadius:"50%", background:"rgba(255,255,255,.045)" }} />

        <div style={{ display:"flex", alignItems:"center", gap:9, margin:"6px 0 30px", position:"relative", zIndex:1 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:B, flexShrink:0 }}>M</div>
          <span style={{ fontSize:15, fontWeight:900, color:"white", letterSpacing:-.3 }}>multi</span>
        </div>

        <h1 style={{ position:"relative", zIndex:1, fontSize:32, fontWeight:900, color:"white", margin:"0 0 12px", lineHeight:1.08, letterSpacing:-.6 }}>
          Bem-vindo ao Multi.
        </h1>
        <p style={{ position:"relative", zIndex:1, fontSize:16.5, fontWeight:700, color:"rgba(255,255,255,.92)", margin:0, lineHeight:1.4, letterSpacing:-.1, maxWidth:320 }}>
          O lugar onde oportunidades encontram <span style={{ color:"#FFB74D" }}>quem sabe fazer</span>.
        </p>
      </div>

      <div style={{
        position:"relative", background:"white", borderRadius:"28px 28px 0 0",
        marginTop:-56, padding:"26px 20px 32px", boxShadow:"0 -18px 30px -24px rgba(20,21,42,.14)",
      }}>
        <p style={{ textAlign:"center", fontSize:15.5, fontWeight:800, color:"#1a1a2e", lineHeight:1.4, margin:"0 0 22px", letterSpacing:-.1, padding:"0 4px" }}>
          Você está aqui para contratar, trabalhar ou fazer sua empresa crescer?
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {ROLE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button key={opt.id} onClick={() => onSelect(opt.id)} style={{
                position:"relative", display:"flex", alignItems:"flex-start", gap:14,
                background:"#F8F9FA", border:"1.5px solid #EEEEF2", borderRadius:20,
                padding:"18px 17px 17px", cursor:"pointer", textAlign:"left", overflow:"hidden", width:"100%",
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${opt.accent},${opt.accentDeep})` }} />
                <div style={{ width:52, height:52, borderRadius:15, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`${opt.accent}22`, color:opt.accent }}>
                  <Icon size={24} />
                </div>
                <div style={{ flex:1, minWidth:0, paddingTop:1 }}>
                  <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:"0 0 3px", letterSpacing:-.1 }}>{opt.title}</p>
                  <p style={{ fontSize:13, fontWeight:800, color:opt.accent, margin:"0 0 6px" }}>{opt.hook}</p>
                  <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.48, margin:"0 0 11px" }}>{opt.desc}</p>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10, fontWeight:900, letterSpacing:.5, textTransform:"uppercase", padding:"4px 11px", borderRadius:99, background:opt.tagBg, color:opt.tagColor, border:`1px solid ${opt.tagBorder}` }}>{opt.tag}</span>
                </div>
                <span style={{ flexShrink:0, marginTop:14, width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:`${opt.accent}1F`, color:opt.accent }}>
                  <ChevronRight size={15} />
                </span>
              </button>
            );
          })}
        </div>

        {onLogin && (
          <p style={{ textAlign:"center", fontSize:12, color:"#9CA3AF", margin:"22px 0 4px" }}>
            Já tem conta? <button onClick={onLogin} style={{ color:B, fontWeight:800, background:"none", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Entrar</button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── AUTH: WELCOME SCREEN ──────────────────────────────── */
function WelcomeScreen({ onGoogle, onEmail, onBack, onEmpresa }) {
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
        {onEmpresa && (
          <p style={{ fontSize:12, color:"#9CA3AF", marginTop:8, textAlign:"center" }}>
            É uma empresa parceira? <button onClick={onEmpresa} style={{ color:B, fontWeight:800, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>Cadastre-se aqui</button>
          </p>
        )}
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
              <Section title="3. Pagamentos">
                Os valores exibidos na Plataforma são orçamentos de referência. O pagamento é acertado e realizado diretamente entre cliente e profissional/empresa, fora da Plataforma. A Multi não retém, custodia nem intermedeia valores.
              </Section>
              <Section title="4. Segurança">
                Recomendamos que os valores dos serviços sejam sempre acertados de forma clara entre as partes antes do início do serviço. O PIN de confirmação de conclusão serve apenas para registrar que o serviço foi concluído — não envolve nenhuma liberação de pagamento pela Multi.
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

/* Seletor de categorias em chips (multi-escolha). Usado no cadastro de
   empresa e no editor de categoria do profissional (ProfileScreen).
   max=null/undefined = sem limite; onLimitReached dispara ao tentar
   marcar uma categoria além do limite (usado pro upsell Autônomo→Pro). */
function CategoriaMultiSelect({ value, onChange, max, onLimitReached, error }) {
  const toggle = (id) => {
    const has = value.includes(id);
    if (!has && max && value.length >= max) { onLimitReached?.(); return; }
    onChange(has ? value.filter(v => v !== id) : [...value, id]);
  };
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {CATS.map(c => {
        const active = value.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => toggle(c.id)} style={{
            display:"flex", alignItems:"center", gap:6,
            padding:"8px 14px", borderRadius:99, cursor:"pointer",
            border: active ? `1.5px solid ${B}` : `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`,
            background: active ? "#EBF4FF" : "white",
            color: active ? B : "#555", fontWeight:700, fontSize:12.5,
          }}>
            <span>{c.emoji}</span> {c.label}
          </button>
        );
      })}
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
  const API = "https://multi-backend-lfwp.onrender.com";
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
  const API = "https://multi-backend-lfwp.onrender.com";

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
  const API = "https://multi-backend-lfwp.onrender.com";

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

/* ───────────────────────── COMPLETAR PERFIL (só profissional, pós-plano) ──────── */
// Bio é obrigatória (cliente/empresa que recebe proposta hoje só vê nome+valor+
// mensagem, sem nada que gere confiança); foto e portfólio são opcionais mas
// incentivados. Sobe pro mesmo bucket "pedidos-fotos" já usado por empresas/pedidos.
function CompletarPerfilScreen({ userEmail, onDone, showToast }) {
  const [bio, setBio] = useState("");
  const [errorBio, setErrorBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef(null);
  const portfolioRef = useRef(null);
  const MAX_BIO = 160;

  const handleAvatarChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
    e.target.value = "";
  };

  const handlePortfolioChange = (e) => {
    const files = Array.from(e.target.files || []);
    setPortfolioFiles(p => [...p, ...files.map(f => ({ id: Date.now() + Math.random(), file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = "";
  };

  const removePortfolio = (id) => setPortfolioFiles(p => p.filter(x => x.id !== id));

  const uploadToStorage = async (file, prefix) => {
    const ext = file.type.includes("png") ? "png" : "jpg";
    const path = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("pedidos-fotos").upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw error;
    return supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
  };

  const handleContinuar = async () => {
    if (!bio.trim()) { setErrorBio("Conta rapidinho sua experiência — esse campo é obrigatório"); return; }
    setErrorBio("");
    setSaving(true);
    try {
      const updates = { bio: bio.trim() };
      if (avatarFile) updates.foto_perfil_url = await uploadToStorage(avatarFile, "perfil_profissional");
      if (portfolioFiles.length) {
        const urls = [];
        for (const p of portfolioFiles) urls.push(await uploadToStorage(p.file, "portfolio"));
        updates.portfolio = urls;
      }
      if (userEmail) {
        // update() vira no-op se a linha em "usuarios" ainda não existir (caso do
        // profissional recém-cadastrado, criada só depois no onComplete do App) —
        // upsert garante que bio/foto/portfólio persistem mesmo assim.
        const { error } = await supabase.from("usuarios").upsert({ email: userEmail, ...updates }, { onConflict: "email" });
        if (error) throw error;
      }
      onDone?.();
    } catch (e) {
      showToast?.("❌ Erro ao salvar perfil: " + (e.message || ""), "#DC2626");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
      <style>{`.completar-perfil-bio::placeholder { color: #6B7280; }`}</style>
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"28px 20px 32px", borderRadius:"0 0 32px 32px", textAlign:"center" }}>
        <h2 style={{ color:"white", fontSize:20, fontWeight:900, margin:"0 0 6px" }}>Complete seu perfil</h2>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:13, margin:"0 0 14px" }}>Isso ajuda clientes e empresas a confiarem em você</p>

        {/* Progresso — Passo 2 (Completar Perfil) de 2 desde a escolha do plano */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <div style={{ display:"flex", gap:5, width:120 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ flex:1, height:5, borderRadius:99, background: "white" }} />
            ))}
          </div>
          <span style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.8)" }}>Passo 2 de 2</span>
        </div>
      </div>

      <div style={{ flex:1, padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* BIO — obrigatória */}
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color: errorBio ? "#E53935" : "#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>
            Sobre você <span style={{ color:O }}>*</span>
          </label>
          <textarea
            className="completar-perfil-bio"
            value={bio}
            maxLength={MAX_BIO}
            onChange={e => { setBio(e.target.value); if (errorBio) setErrorBio(""); }}
            placeholder="Ex: Encanador com 10 anos de experiência, atendo emergências"
            rows={3}
            style={{ width:"100%", border:`1.5px solid ${errorBio ? "#E53935" : "#E5E7EB"}`, borderRadius:14, padding:"13px 14px", fontSize:14, color:"#1a1a2e", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"none" }} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
            {errorBio ? <p style={{ fontSize:11, color:"#E53935", margin:0, fontWeight:700 }}>{errorBio}</p> : <span />}
            <span style={{ fontSize:11, color:"#9CA3AF" }}>{bio.length}/{MAX_BIO}</span>
          </div>
        </div>

        {/* incentivo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FFF8E7", border:"1px solid #FDE68A", borderRadius:12, padding:"10px 14px" }}>
          <Star size={16} color="#F9A825" />
          <p style={{ fontSize:12, color:"#92400E", fontWeight:700, margin:0 }}>Perfis com foto e fotos de trabalhos recebem mais contratações</p>
        </div>

        {/* FOTO DE PERFIL — opcional */}
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Foto de perfil (opcional)</label>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAvatarChange} />
          <div onClick={() => avatarRef.current?.click()} style={{ width:84, height:84, borderRadius:"50%", background:"#EEF0F5", border:"2px dashed #DDD", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden", position:"relative" }}>
            {avatarPreview
              ? <img src={avatarPreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
              : <Camera size={26} color="#B0B4C0" />}
          </div>
        </div>

        {/* PORTFÓLIO — opcional */}
        <div>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Fotos de trabalhos (opcional)</label>
          <input ref={portfolioRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handlePortfolioChange} />
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {portfolioFiles.map(p => (
              <div key={p.id} style={{ width:72, height:72, borderRadius:12, overflow:"hidden", position:"relative", flexShrink:0 }}>
                <img src={p.preview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                <button onClick={() => removePortfolio(p.id)} style={{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,.5)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={10} color="white" />
                </button>
              </div>
            ))}
            <button onClick={() => portfolioRef.current?.click()} style={{ width:72, height:72, borderRadius:12, border:"2px dashed #DDD", background:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, cursor:"pointer", color:"#ccc", flexShrink:0 }}>
              <Image size={16} /><span style={{ fontSize:9, fontWeight:700 }}>Adicionar</span>
            </button>
          </div>
        </div>

        <div style={{ flex:1 }} />
      </div>

      {/* Rodapé fixo — visível sem depender de rolar até o fim, mesmo com
          várias fotos de portfólio adicionadas (conteúdo acima pode crescer). */}
      <div style={{ position:"sticky", bottom:0, background:"#F8F9FA", padding:"12px 20px 20px", boxShadow:"0 -4px 16px rgba(0,0,0,.06)" }}>
        <button onClick={handleContinuar} disabled={saving} style={{ width:"100%", padding:"16px 0", borderRadius:16, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:15, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>
        <button onClick={handleContinuar} disabled={saving} style={{ width:"100%", background:"none", border:"none", color:"#9CA3AF", fontWeight:700, fontSize:13, cursor: saving ? "default" : "pointer", padding:"8px 0 0", textAlign:"center" }}>
          Pular fotos por agora
        </button>
      </div>
    </div>
  );
}

function RegisterScreen({ onBack, onComplete, showToast, initialRole = "client" }) {
  const [step,    setStep]    = useState("form");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [password, setPassword] = useState("");
  const [cep,     setCep]     = useState("");
  const [role,    setRole]    = useState(initialRole);
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
      const API = "https://multi-backend-lfwp.onrender.com";
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

  /* ── ESCOLHA DE PLANO (só profissional — cliente é sempre grátis) ── */
  if (step === "plano") {
    return (
      <EscolherPlanoScreen
        titularTipo="usuario"
        titularEmail={email.trim()}
        titularNome={name.trim().split(/\s+/)[0]}
        onBack={() => setStep("success")}
        showToast={showToast}
        onDone={() => setStep("completar-perfil")}
      />
    );
  }

  /* ── COMPLETAR PERFIL (só profissional, depois do plano) ── */
  if (step === "completar-perfil") {
    return (
      <CompletarPerfilScreen
        userEmail={email.trim()}
        showToast={showToast}
        onDone={() => onComplete(name, email.trim(), true, cepFound ? "Sua cidade" : "sua região", role, phone)}
      />
    );
  }

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
          onClick={() => isProfessional ? setStep("plano") : onComplete(name, email.trim(), true, cepFound ? "Sua cidade" : "sua região", role, phone)}
          style={{ width:"100%", padding:"16px 0", borderRadius:18, border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 6px 24px ${isProfessional ? O : B}44`, background: isProfessional ? `linear-gradient(135deg,${O},#E64A19)` : `linear-gradient(135deg,${B},#0055d4)` }}>
          {isProfessional ? <><Briefcase size={17} /> Escolher plano</> : <><Home size={17} /> Ir para a Tela Inicial</>}
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
        <FormField IconComp={MapPin} label="CEP" error={errors.cep} hint={cepFound ? "CEP encontrado" : ""}>
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

/* ───────────────────────── CNPJ helpers ──────────────────────────────────────── */
function maskCnpj(v) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2)  return d;
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function isValidCnpj(value) {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len) => {
    const weights = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = cnpj.slice(0, len).split("").reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/* ───────────────────────── AUTH: CADASTRO EMPRESA PARCEIRA ────────────────────── */
function CadastroEmpresaScreen({ onBack, showToast }) {
  const [step, setStep] = useState("form"); // form | plano | success
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [categoria, setCategoria] = useState([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [descricao, setDescricao] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const e = {};
    if (!isValidCnpj(cnpj)) e.cnpj = "CNPJ inválido";
    if (!razaoSocial.trim()) e.razaoSocial = "Informe a razão social";
    if (!nomeFantasia.trim()) e.nomeFantasia = "Informe o nome fantasia";
    if (!categoria.length) e.categoria = "Selecione ao menos uma categoria de serviço";
    if (phone.replace(/\D/g,"").length < 11) e.phone = "Telefone incompleto";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "E-mail inválido";
    if (password.length < 6) e.password = "Mínimo 6 caracteres";
    const wrapper = document.getElementById("terms-checkbox-wrapper");
    if (!wrapper || wrapper.dataset.checked !== "1") e.terms = "Aceite obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // 1. Upload do logo (opcional)
      let logoUrl = null;
      if (logoFile) {
        const ext = logoFile.type.includes("png") ? "png" : "jpg";
        const path = `empresas_logo_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, logoFile, { contentType: logoFile.type, upsert: true });
        if (!upErr) logoUrl = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      }

      // 2. Cria a conta de login (mesmo endpoint/lógica do cadastro de profissional, role "empresa")
      const API = "https://multi-backend-lfwp.onrender.com";
      const r = await fetch(`${API}/api/auth/cadastro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nomeFantasia.trim(), email: email.trim(), password, role: "empresa" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao criar conta");
      const userId = d.user?.id || null;

      // 3. Cria a empresa
      const { data: empresaRow, error: empresaErr } = await supabase.from("empresas").insert({
        nome: nomeFantasia.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: cnpj,
        categoria_servico: categoria,
        telefone_contato: phone.replace(/\D/g, ""),
        email: email.trim(),
        descricao: descricao.trim() || null,
        logo_url: logoUrl,
        ativo: true,
        user_id: userId,
      }).select().maybeSingle();
      if (empresaErr) throw empresaErr;

      // 4. Vincula o usuário criado à empresa (mesmo padrão de profissionais em "usuarios")
      await supabase.from("usuarios").upsert({
        email: email.trim(), name: nomeFantasia.trim(), role: "empresa",
        empresa_id: empresaRow?.id || null,
      }, { onConflict: "email" });

      setLoading(false);
      setStep("plano");
    } catch (e) {
      setLoading(false);
      alert(e.message || "Erro ao cadastrar empresa");
    }
  };

  if (step === "plano") {
    return (
      <EscolherPlanoScreen
        titularTipo="empresa"
        titularEmail={email.trim()}
        titularNome={nomeFantasia.trim()}
        showToast={showToast}
        onDone={() => setStep("success")}
      />
    );
  }

  if (step === "success") {
    return (
      <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
        <div style={{ width:88, height:88, borderRadius:"50%", background:`linear-gradient(135deg,${B},#0055d4)`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, boxShadow:`0 8px 28px ${B}44` }}>
          <Check size={40} color="white" strokeWidth={3} />
        </div>
        <h2 style={{ fontSize:24, fontWeight:900, color:"#1a1a2e", margin:"0 0 10px" }}>Empresa cadastrada!</h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7, margin:"0 0 28px" }}>
          <strong style={{ color:"#1a1a2e" }}>{nomeFantasia}</strong> já está ativa e vai aparecer nas buscas de clientes da categoria selecionada.
        </p>
        <button onClick={onBack} style={{ width:"100%", padding:"16px 0", borderRadius:18, border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 6px 24px ${B}44`, background:`linear-gradient(135deg,${B},#0055d4)` }}>
          <Home size={17} /> Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"16px 20px 28px", borderRadius:"0 0 32px 32px" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
          <ArrowLeft size={18} color="white" />
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={30} white />
          <div>
            <p style={{ fontSize:20, fontWeight:900, color:"white", margin:0, lineHeight:1 }}>Cadastrar Empresa Parceira</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.65)", margin:"2px 0 0" }}>Apareça nas buscas de clientes da sua categoria</p>
          </div>
        </div>
      </div>

      <div style={{ flex:1, padding:"24px 24px 48px", overflowY:"auto" }}>

        {/* LOGO */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:22 }}>
          <label htmlFor="empresa-logo-input" style={{ width:84, height:84, borderRadius:20, background:"#F0F2F5", border:"1.5px dashed #D1D5DB", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden" }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <Briefcase size={28} color="#9CA3AF" />}
          </label>
          <input id="empresa-logo-input" type="file" accept="image/*" onChange={handleLogoChange} style={{ display:"none" }} />
          <p style={{ fontSize:11, color:"#9CA3AF", fontWeight:700, marginTop:8 }}>Logo da empresa (opcional)</p>
        </div>

        {/* CNPJ */}
        <FormField IconComp={FileText} label="CNPJ" error={errors.cnpj}>
          <input inputMode="numeric" placeholder="00.000.000/0000-00" value={cnpj}
            onChange={e => { setCnpj(maskCnpj(e.target.value)); if (errors.cnpj) setErrors(p => ({ ...p, cnpj:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.cnpj ? "#E53935" : undefined }} />
        </FormField>

        {/* RAZAO SOCIAL */}
        <FormField IconComp={Briefcase} label="Razão Social" error={errors.razaoSocial}>
          <input type="text" placeholder="Ex: Hidráulica Silva Ltda" value={razaoSocial}
            onChange={e => { setRazaoSocial(e.target.value); if (errors.razaoSocial) setErrors(p => ({ ...p, razaoSocial:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.razaoSocial ? "#E53935" : undefined }} />
        </FormField>

        {/* NOME FANTASIA */}
        <FormField IconComp={Briefcase} label="Nome Fantasia" error={errors.nomeFantasia}>
          <input type="text" placeholder="Ex: Hidráulica Silva" value={nomeFantasia}
            onChange={e => { setNomeFantasia(e.target.value); if (errors.nomeFantasia) setErrors(p => ({ ...p, nomeFantasia:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.nomeFantasia ? "#E53935" : undefined }} />
        </FormField>

        {/* CATEGORIAS — o plano ainda não foi escolhido nesse passo (só depois,
            em "plano"), então trava sempre em 3 aqui (padrão do Multi Empresa
            comum); quem virar Plus ajusta pra ilimitado depois em Editar Perfil. */}
        <div style={{ marginBottom: errors.categoria ? 6 : 18 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color: errors.categoria ? "#E53935" : "#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Categorias de Serviço</label>
          <CategoriaMultiSelect
            value={categoria}
            onChange={v => { setCategoria(v); if (errors.categoria) setErrors(p => ({ ...p, categoria:undefined })); }}
            max={3}
            onLimitReached={() => showToast?.("⚠️ Até 3 categorias no cadastro — o plano Empresa Plus libera categorias ilimitadas (dá pra ajustar depois de escolher o plano)", O)}
            error={errors.categoria}
          />
          {errors.categoria && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.categoria}</p>}
        </div>

        {/* TELEFONE */}
        <FormField IconComp={WA_ICON} label="Telefone de Contato" error={errors.phone}>
          <input autoComplete="tel" type="tel" placeholder="(00) 00000-0000" value={phone}
            onChange={e => { setPhone(maskPhone(e.target.value)); if (errors.phone) setErrors(p => ({ ...p, phone:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.phone ? "#E53935" : undefined }} />
        </FormField>

        {/* EMAIL */}
        <FormField IconComp={({ size, color }) => (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block", flexShrink:0 }}>
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        )} label="E-mail" error={errors.email}>
          <input autoComplete="email" type="email" placeholder="contato@empresa.com" value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.email ? "#E53935" : undefined }} />
        </FormField>

        {/* SENHA */}
        <FormField IconComp={KeyRound} label="Senha" error={errors.password}>
          <input autoComplete="new-password" type="password" placeholder="Mínimo 6 caracteres" value={password}
            onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.password ? "#E53935" : undefined }} />
        </FormField>

        {/* DESCRICAO */}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Descrição (opcional)</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conte um pouco sobre os serviços da sua empresa"
            style={{ width:"100%", minHeight:90, border:"1.5px solid #E5E7EB", borderRadius:14, padding:"13px 14px", fontSize:14, color:"#1a1a2e", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"none" }} />
        </div>

        {/* TERMS */}
        <TermsCheckbox errors={errors} setErrors={setErrors} />

        {/* SUBMIT */}
        <button type="button" onClick={handleSubmit} disabled={loading} style={{
          width:"100%", padding:"16px 0", borderRadius:18, border:"none",
          background: loading ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`,
          color:"white", fontWeight:900, fontSize:15,
          cursor: loading ? "default" : "pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          boxShadow: loading ? "none" : `0 6px 24px ${B}44`,
        }}>
          {loading ? (
            <><span style={{ width:18, height:18, border:"2.5px solid white", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }} /> Cadastrando…</>
          ) : (
            <><Check size={17} /> Cadastrar Empresa</>
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
function ProfessionalHome({ userName, userEmail, showToast, onGoToProfile, isPro, plano, onViewService, onUpgrade, userLocation = "sua região", allDocsVerified, docStatus, onGoToDocs, onGoToOrders, onGoToWallet, onAcceptOrder }) {
  const [online,       setOnline]       = useState(false);
  const [categoriaServico, setCategoriaServico] = useState([]);
  const [newOrder, setNewOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [realPedidos, setRealPedidos] = useState(SEED_FEED);
  // Demandas de empresa (publico_alvo:"pro") só entram no feed de quem é
  // Multi Pro — Autônomo continua vendo só pedido normal de cliente.
  const isPlanoPro = plano === "pro";
  useEffect(()=>{ supabase.from("pedidos").select("*").eq("status","aberto").in("publico_alvo", isPlanoPro ? ["geral","pro"] : ["geral"]).order("created_at",{ascending:false}).limit(50).then(({data})=>{ if(data&&data.length>0) setRealPedidos(data.map(p=>({id:p.id,cliente_id:p.cliente_id,cat:p.categoria||"servico",title:(p.descricao||p.categoria||"Serviço").slice(0,40),desc:p.descricao||"",value:p.valor||0,loc:p.cidade||"sua região",time:new Date(p.created_at).toLocaleDateString("pt-BR"),client:p.cliente_nome||"Cliente",rating:4.5,urgent:false,emoji:"🔧",bg:"#FFF8E1",photo:null,photos:p.fotos,publicoAlvo:p.publico_alvo,prazo:p.prazo}))); }).catch(()=>{}); },[isPlanoPro]);

  // Carrega categoria + status persistidos, mesmo padrão do handleToggleOnline da empresa.
  // userToggledRef evita que essa carga inicial (assíncrona) sobrescreva um clique em
  // "Ficar Online" que já tenha acontecido antes dela terminar — sem isso, um clique
  // rápido logo após a tela abrir "não fazia efeito" (a resposta do fetch chegava
  // depois e revertia o estado local pro valor antigo do banco).
  const userToggledRef = useRef(false);
  useEffect(() => {
    if (!userEmail) return;
    supabase.from("usuarios").select("categoria_servico,status").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        setCategoriaServico(data?.categoria_servico || []);
        if (!userToggledRef.current) setOnline(!!data?.status);
      })
      .catch(() => {});
  }, [userEmail]);

  const [showDocBlock, setShowDocBlock] = useState(false); // pop-up modal

  const filters = [
    { id:"all",    label:"Todos",           emoji:"📋" },
    { id:"urgent", label:"Urgentes",         emoji:"🔥" },
    { id:"nearby", label:"Perto de Mim",     emoji:"📍" },
    { id:"topPay", label:"Melhor Pagamento", emoji:"💰" },
  ];

  const filtered = realPedidos.filter(s => {
    if (activeFilter === "urgent") return s.urgent;
    if (activeFilter === "topPay") return s.value >= 400;
    return true;
  });

  const proTrialDays = 7; // free trial period

  const handleFicarOnline=async()=>{
  const next=!online;
  userToggledRef.current=true;

  // Categoria obrigatória antes de poder ficar online (senão o profissional nunca
  // aparece pra nenhum pedido, já que a busca do notify-pedido casa por categoria).
  if(next && !categoriaServico.length){
    showToast?.("⚠️ Defina sua categoria de serviço no perfil antes de ficar online", "#DC2626");
    onGoToProfile?.();
    return;
  }

  setOnline(next);

  // Persiste status (+ player_id do OneSignal ao ligar), mesmo padrão do
  // handleToggleOnline da empresa.
  if(userEmail){
    const updates={ status: next };
    if(next){
      const playerId=await getOneSignalPlayerId();
      if(playerId) updates.onesignal_player_id=playerId;
    }
    const{error}=await supabase.from("usuarios").update(updates).eq("email",userEmail);
    if(error){
      setOnline(!next);
      showToast?.("❌ Erro ao atualizar status: "+(error.message||""), "#DC2626");
      return;
    }
  }

  if(next){
  // Demanda de empresa (publico_alvo:"pro") nunca entra no popup de "aceitar
  // agora" — só via proposta (Candidatar-me no mural), por isso o filtro.
  supabase.from("pedidos").select("*").eq("status","aberto").eq("publico_alvo","geral").order("created_at",{ascending:false}).limit(1).then(({data})=>{
    if(data&&data[0]){const p=data[0];setNewOrder({id:p.id,cliente_id:p.cliente_id,category:p.categoria,location:p.cidade||"Guarulhos, SP",value:String(p.valor||"0"),description:p.descricao||"",photos:(()=>{try{const f=p.fotos;return Array.isArray(f)?f:(typeof f==="string"?JSON.parse(f):[]);}catch(e){return [];}})(),photo:(()=>{try{const f=p.fotos;const arr=Array.isArray(f)?f:(typeof f==="string"?JSON.parse(f):[]);return arr[0]||null;}catch(e){return null;}})()});}
  });
  supabase.channel("pedidos_novos").on("postgres_changes",{event:"*",schema:"public",table:"pedidos"},(payload)=>{
    const p=payload.new;if(!p||!p.fotos||p.fotos.length===0||p.publico_alvo==="pro")return;setNewOrder({id:p.id,cliente_id:p.cliente_id,category:p.categoria,location:p.cidade||"Guarulhos, SP",value:String(p.valor||"0"),description:p.descricao||"",photos:(()=>{try{const f=p.fotos;return Array.isArray(f)?f:(typeof f==="string"?JSON.parse(f):[]);}catch(e){return [];}})(),photo:(()=>{try{const f=p.fotos;const arr=Array.isArray(f)?f:(typeof f==="string"?JSON.parse(f):[]);return arr[0]||null;}catch(e){return null;}})()});
  }).subscribe();
}else{supabase.removeAllChannels();}};
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
            onClick={handleFicarOnline}
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

      {/* Modal fixed inset:0 — precisa ficar fora do <button> "Ficar Online"
          (botão dentro de botão é HTML inválido e quebra o clique real do
          navegador em "Aceitar agora"/"Recusar"). */}
      {newOrder && <NewOrderCard order={newOrder} onAccept={()=>{stopNewOrderSound();setNewOrder(null);setOnline(false);onAcceptOrder&&onAcceptOrder({id:newOrder.id,cliente_id:newOrder.cliente_id,title:newOrder.category,category:newOrder.category,clientName:safeGetUser().name||"Cliente",location:newOrder.location,value:newOrder.value,description:newOrder.description,photo:newOrder.photo,photos:newOrder.photos||[],status:"em_andamento",phase:1});}} onReject={()=>{stopNewOrderSound();setNewOrder(null);}} />}

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
          const isLocked  = false;          // lock removido - todos podem se candidatar
          const isBlurred = false; // first card always fully visible as preview

          return (
            <div key={s.id} style={{ position:"relative", borderRadius:20, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,.09)" }}>

              {/* ── Card content — ALWAYS fully visible ── */}
              <div style={{ background:"white", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.emoji}</div>
                    <span style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", lineHeight:1.35 }}>{s.title}</span>
                  </div>
                  {s.publicoAlvo === "pro" && <Pill color="#7C3AED" sm>💼 Demanda de Empresa</Pill>}
                  {s.publicoAlvo === "pro" && s.prazo && (() => {
                    const prazoInfo = PRAZO_OPTIONS.find(p => p.id === s.prazo);
                    const prazoColor = s.prazo === "urgente" ? "#E53935" : s.prazo === "essa_semana" ? "#F59E0B" : "#22c55e";
                    return prazoInfo ? <Pill color={prazoColor} sm>{prazoInfo.emoji} {prazoInfo.label}</Pill> : null;
                  })()}
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
                  const proUser=safeGetUser();
                  supabase.from("propostas").upsert({pedido_id:s.id,profissional_id:proUser.email||proUser.whatsapp,profissional_nome:proUser.name||"Profissional",profissional_email:proUser.email||proUser.whatsapp,valor:s.value||0,mensagem:"Tenho interesse neste serviço!",status:"pendente",cliente_email:s.cliente_id||""},{onConflict:"pedido_id,profissional_id"}).then(()=>{}).catch(()=>{});
                  onViewService({ _notify:{ serviceId:s.id, serviceTitle:s.title, value:s.value, proName:proUser.name||"Profissional" } });
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

function NewOrderCard({ order, onAccept, onReject }) {
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const [seconds, setSeconds] = useState(15);
  useEffect(() => {
    playNewOrderSound();
    const interval = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  // onReject atualiza o pai (ProfessionalHome) — chamar isso de dentro do
  // updater funcional do setSeconds acima (setState de um componente
  // enquanto outro está no meio de um render) é o que disparava o warning
  // "Cannot update a component while rendering a different component".
  useEffect(() => {
    if (seconds === 0) onReject();
  }, [seconds]);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 20px'}}>
      <div style={{background:'#0f1117',borderRadius:28,padding:'20px',width:340,textAlign:'center',border:'1px solid #FF572240'}}>
        <div style={{fontSize:11,color:'#FF5722',fontWeight:700,letterSpacing:2,marginBottom:10}}>NOVO PEDIDO!</div>
        <svg width="190" height="190" viewBox="0 0 200 200" style={{margin:'0 auto 12px',display:'block'}}>
          <circle cx="100" cy="100" fill="#FF572208" stroke="#FF572218" strokeWidth="0.5">
            <animate attributeName="r" values="30;85;30" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="100" cy="100" fill="#FF572208" stroke="#FF572218" strokeWidth="0.5">
            <animate attributeName="r" values="30;85;30" dur="2s" begin="0.7s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" begin="0.7s" repeatCount="indefinite"/>
          </circle>
          <circle cx="100" cy="100" r="60" fill="#FF572210" stroke="#FF572225" strokeWidth="0.5"/>
          <circle cx="100" cy="100" r="40" fill="#FF572215" stroke="#FF572230" strokeWidth="0.5"/>
          <line x1="100" y1="15" x2="100" y2="100" stroke="#FF572230" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="185" y1="100" x2="100" y2="100" stroke="#FF572230" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="100" y1="185" x2="100" y2="100" stroke="#FF572230" strokeWidth="1" strokeDasharray="3 4"/>
          <line x1="15" y1="100" x2="100" y2="100" stroke="#FF572230" strokeWidth="1" strokeDasharray="3 4"/>
          <text x="100" y="56" textAnchor="middle" fontSize="8" fill="#FF572250" fontFamily="sans-serif">500m</text>
          <text x="100" y="76" textAnchor="middle" fontSize="8" fill="#FF572240" fontFamily="sans-serif">1km</text>
          <circle cx="132" cy="60" r="5" fill="#FF5722">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="75" cy="148" r="4" fill="#4CAF50">
            <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="100" cy="100" r="26" fill="#1a1a2e" stroke={seconds <= 5 ? "#E24B4A" : "#FF5722"} strokeWidth="4"/>
          <circle cx="100" cy="100" r="26" fill="none" stroke="#222" strokeWidth="4"/>
          <circle cx="100" cy="100" r="26" fill="none" stroke={seconds <= 5 ? "#E24B4A" : "#FF5722"} strokeWidth="4"
            strokeDasharray={CIRC} strokeDashoffset={CIRC - (seconds/15)*CIRC}
            strokeLinecap="round" transform="rotate(-90 100 100)"/>
          <text x="100" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill={seconds <= 5 ? "#E24B4A" : "white"} fontFamily="sans-serif">{seconds}s</text>
        </svg>
        <div style={{fontSize:19,fontWeight:900,color:'white',marginBottom:3}}>{order.category.charAt(0).toUpperCase()+order.category.slice(1)}</div>
          {order.description && <div style={{fontSize:12,color:"#ffffff99",marginBottom:6,padding:"0 4px",fontStyle:"italic",lineHeight:1.4}}>{order.description.length>65?order.description.substring(0,65)+"...":order.description}</div>}
        <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:16}}>
          <div style={{background:'#FF572220',borderRadius:10,padding:'8px 14px'}}>
            <div style={{fontSize:10,color:'#FF572299',marginBottom:2}}>Valor</div>
            <div style={{fontSize:17,fontWeight:900,color:'#FF5722'}}>R$ {order.value}</div>
          </div>
          <div style={{background:'#4CAF5020',borderRadius:10,padding:'8px 14px'}}>
            <div style={{fontSize:10,color:'#4CAF5099',marginBottom:2}}>Distância</div>
            <div style={{fontSize:17,fontWeight:900,color:'#4CAF50'}}>1.2 km</div>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onReject} style={{flex:1,padding:'13px 0',borderRadius:14,border:'1px solid #ffffff20',background:'transparent',color:'#ffffff50',fontWeight:700,fontSize:13,cursor:'pointer'}}>Recusar</button>
          <button onClick={onAccept} style={{flex:2,padding:'13px 0',borderRadius:14,border:'none',background:'#FF5722',color:'white',fontWeight:900,fontSize:15,cursor:'pointer'}}>✓ Aceitar agora</button>
        </div>
      </div>
    </div>
  );
}

// ===== AVALIACAO SCREEN =====
function AvaliacaoScreen({ service, onBack, setScreen, userEmail, showToast }) {
  if(!service) return null;
  const souCliente = service.cliente_id === userEmail;
  const avaliadoEmail = souCliente ? service.profissional_aceito : service.cliente_id;
  const avaliadoNome  = souCliente ? (service.profissional_nome || service.pro || "profissional") : (service.cliente_nome || "cliente");

  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [jaAvaliado, setJaAvaliado] = useState(false);
  const [checando, setChecando] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!service.id || !userEmail) { setChecando(false); return; }
    supabase.from("avaliacoes").select("id").eq("pedido_id", service.id).eq("avaliador_email", userEmail).maybeSingle()
      .then(({ data }) => setJaAvaliado(!!data))
      .catch(() => {})
      .finally(() => setChecando(false));
  }, [service.id, userEmail]);

  const enviarAvaliacao = async () => {
    if(nota===0) return showToast&&showToast("Selecione uma nota!");
    setLoading(true);
    const {error} = await supabase.from("avaliacoes").insert({
      pedido_id: service.id,
      avaliador_email: userEmail,
      avaliado_email: avaliadoEmail,
      avaliado_nome: avaliadoNome,
      // Colunas legadas — só fazem sentido quando o avaliado é o profissional
      // (mantém a leitura já existente em BancoProfissionaisScreen, que
      // filtra por profissional_id).
      cliente_id: souCliente ? userEmail : null,
      profissional_id: souCliente ? avaliadoEmail : null,
      profissional_nome: souCliente ? avaliadoNome : null,
      // Coluna real na tabela é "estrelas" — a migration antiga de avaliacoes
      // documentava um rename pra "nota" que nunca rodou de fato no banco.
      estrelas: nota,
      comentario
    });
    setLoading(false);
    if(!error){ setEnviado(true); showToast&&showToast("Avaliação enviada! ⭐"); }
    else{ showToast&&showToast("Erro ao enviar avaliação"); }
  };

  if (checando) return null;

  if(enviado || jaAvaliado) return (
    <div style={{minHeight:"100vh",background:"#F5F6FA",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{fontSize:64}}>⭐</div>
      <h2 style={{fontWeight:900,fontSize:22,color:"#1a1a2e",margin:"16px 0 8px"}}>Obrigado!</h2>
      <p style={{color:"#666",textAlign:"center",marginBottom:24}}>Sua avaliação ajuda outras pessoas a encontrar bons parceiros no Multi.</p>
      <button onClick={onBack} style={{padding:"14px 32px",background:"#007BFF",color:"white",border:"none",borderRadius:14,fontWeight:800,fontSize:16,cursor:"pointer"}}>Voltar</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F5F6FA",padding:"20px 16px"}}>
      <button onClick={()=>{ if(setScreen) setScreen("orders"); else if(onBack) onBack(); }} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",marginBottom:16}}>←</button>
      <h2 style={{fontWeight:900,fontSize:22,color:"#1a1a2e",marginBottom:4}}>Avaliar {avaliadoNome}</h2>
      <p style={{color:"#666",fontSize:14,marginBottom:24}}>Como foi o serviço?</p>
      <div style={{background:"white",borderRadius:20,padding:24,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
        <p style={{fontWeight:700,fontSize:15,marginBottom:16,color:"#1a1a2e"}}>Sua nota:</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
          {[1,2,3,4,5].map(s=>(
            <span key={s} onClick={()=>setNota(s)} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)}
              style={{fontSize:44,cursor:"pointer",transition:"transform .15s",transform:(hover||nota)>=s?"scale(1.2)":"scale(1)",filter:(hover||nota)>=s?"none":"grayscale(1)"}}>⭐</span>
          ))}
        </div>
        <p style={{textAlign:"center",fontWeight:700,color:"#007BFF",fontSize:14,marginBottom:16}}>
          {["","Ruim","Regular","Bom","Muito bom","Excelente!"][hover||nota]||"Toque para avaliar"}
        </p>
        <textarea value={comentario} onChange={e=>setComentario(e.target.value)}
          placeholder="Conte como foi a experiência (opcional)..."
          style={{width:"100%",minHeight:100,borderRadius:12,border:"1.5px solid #eee",padding:12,fontSize:14,fontFamily:"Nunito",resize:"none",boxSizing:"border-box"}} />
      </div>
      <button onClick={enviarAvaliacao} disabled={loading||nota===0}
        style={{width:"100%",padding:"14px",background:nota===0?"#ccc":"#007BFF",color:"white",border:"none",borderRadius:14,fontWeight:800,fontSize:16,cursor:nota===0?"not-allowed":"pointer"}}>
        {loading?"Enviando...":"Enviar Avaliação ⭐"}
      </button>
    </div>
  );
}

export default function App() {
  console.log("APP FUNCTION START");
  const [selectedPro, setSelectedPro] = useState(null);
  const [role,      setRole]      = useState(() => {
    try { return JSON.parse(localStorage.getItem("multiSession") || "null")?.role || "client"; }
    catch { return "client"; }
  });
  const [guestRole, setGuestRole] = useState("client"); // drives the header toggle for guests
  const [screen,    setScreen]    = useState("home");
  const [selected,  setSelected]  = useState(null);
  const [avaliacaoSvc, setAvaliacaoSvc] = useState(null);
  const [isPro,     setIsPro]     = useState(false);
  // Plano real do titular (profissional ou empresa), carregado de "assinaturas"
  // — antes disso isPro era só estado em memória (nunca refletia o Supabase).
  const [plano,          setPlano]          = useState(null);
  const [planoStatus,    setPlanoStatus]    = useState(null);
  const [planoExpiraEm,  setPlanoExpiraEm]  = useState(null);
  const carregarPlano = (titularTipo, titularEmail) => {
    if (!titularTipo || !titularEmail) { setPlano(null); setPlanoStatus(null); setPlanoExpiraEm(null); setIsPro(false); return; }
    supabase.from("assinaturas").select("plano,status,expira_em")
      .eq("titular_tipo", titularTipo).eq("titular_email", titularEmail).maybeSingle()
      .then(({ data }) => {
        setPlano(data?.plano || null);
        setPlanoStatus(data?.status || null);
        setPlanoExpiraEm(data?.expira_em || null);
        setIsPro(!!data?.plano && (data.status === "trial" || data.status === "ativa"));
      })
      .catch(() => {});
  };
  const [toast,     setToast]     = useState(null);
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
  const allDocsVerified = true; // liberado para todos

  // ── RESTORE SESSION FROM LOCALSTORAGE ────────────────────────────────────
  const savedSession = (() => {
    if (window.location.hash.includes("access_token")) return null;
    try { return JSON.parse(localStorage.getItem("multiSession")) || null; } catch { return null; }
  })();
  // Auth: starts as guest, modal layers appear on demand
  const [isLoggedIn,    setIsLoggedIn]    = useState(!!savedSession);
  const [authScreen,    setAuthScreen]   = useState("role-select");
  const [signupRole,    setSignupRole]   = useState("client");
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

  const [activeChat,    setActiveChat]    = useState(null);
  const [userEmail,     setUserEmail]     = useState(savedSession?.email    || "");

  useEffect(() => {
    const titularTipo = role === "professional" ? "usuario" : role === "empresa" ? "empresa" : null;
    carregarPlano(titularTipo, userEmail);
  }, [userEmail, role]);

  // MEUS PEDIDOS — fonte única real (Fase 1 de consolidação): cliente vê os
  // próprios pedidos (cliente_id), profissional vê os que aceitou
  // (profissional_aceito). Antes só existia leitura por profissional_aceito —
  // o cliente nunca via os próprios pedidos reais nesta lista.
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [meusPedidosLoading, setMeusPedidosLoading] = useState(false);
  const refreshMeusPedidos = () => {
    if (!userEmail) { setMeusPedidos([]); return; }
    setMeusPedidosLoading(true);
    const query = role === "professional"
      ? supabase.from("pedidos").select("*").eq("profissional_aceito", userEmail)
      : supabase.from("pedidos").select("*").eq("cliente_id", userEmail);
    query.order("created_at", { ascending: false }).then(({ data }) => {
      setMeusPedidos((data || []).map(mapPedidoRow));
      setMeusPedidosLoading(false);
    }).catch(() => setMeusPedidosLoading(false));
  };
  useEffect(() => { refreshMeusPedidos(); }, [screen, userEmail, role]);

  // Deep link do lembrete pós-horário (Fase 4): o push "foi realizado?" leva
  // direto pra tela de confirmar conclusão. Não precisa de dado extra na
  // notificação — cada dispositivo já sabe seu próprio papel no pedido.
  useEffect(() => {
    if (!isLoggedIn || !userEmail) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tela") !== "concluir") return;
    const pedidoId = params.get("pedido");
    if (!pedidoId) return;
    supabase.from("pedidos").select("*").eq("id", pedidoId).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (data.cliente_id === userEmail) setRole("client");
      else if (data.profissional_aceito === userEmail) setRole("professional");
      setSelected(mapPedidoRow(data));
      setScreen("service");
    }).catch(() => {});
    window.history.replaceState({}, "", window.location.pathname);
  }, [isLoggedIn, userEmail]);

  // Contagem real de propostas recebidas por pedido aberto (cliente) — antes
  // sempre aparecia 0/vazio, sem nenhuma leitura de "propostas".
  const [candidatosPorPedido, setCandidatosPorPedido] = useState({});
  useEffect(() => {
    if (role !== "client") return;
    const abertos = meusPedidos.filter(p => p.status === "aberto").map(p => p.id);
    if (abertos.length === 0) { setCandidatosPorPedido({}); return; }
    supabase.from("propostas").select("pedido_id").in("pedido_id", abertos).then(({ data }) => {
      const counts = {};
      (data || []).forEach(p => { counts[p.pedido_id] = (counts[p.pedido_id] || 0) + 1; });
      setCandidatosPorPedido(counts);
    }).catch(() => {});
  }, [meusPedidos, role]);
  const meusPedidosComCandidatos = meusPedidos.map(p => ({ ...p, candidates: candidatosPorPedido[p.id] || 0 }));

  // Ganhos reais do profissional — pivot de modelo (Multi não intermedia mais
  // pagamento, cliente paga o profissional direto) vira histórico informativo
  // a partir dos próprios pedidos concluídos, sem saldo/saque fictício.
  const meusGanhos = role === "professional" ? meusPedidos.filter(p => p.status === "concluido") : [];

  // Propostas recebidas pelo cliente — alimenta AlertsScreen. Antes vinha de
  // um "notifications" mockado em memória (nunca persistido, alimentado por
  // um canal realtime dentro de ProfessionalHome que não fazia sentido ali).
  const [propostasRecebidas, setPropostasRecebidas] = useState([]);
  useEffect(() => {
    if (!userEmail || role !== "client") { setPropostasRecebidas([]); return; }
    supabase.from("propostas").select("*").eq("cliente_email", userEmail).eq("status", "pendente")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPropostasRecebidas(data || []));
    const ch = supabase.channel("propostas_cliente_" + userEmail)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "propostas", filter: `cliente_email=eq.${userEmail}` },
        payload => setPropostasRecebidas(p => [payload.new, ...p]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userEmail, role]);

  // Títulos dos pedidos relacionados, só pro card de AlertsScreen mostrar
  // "serviceTitle" sem precisar duplicar essa informação em "propostas".
  const [pedidoTitlesById, setPedidoTitlesById] = useState({});
  useEffect(() => {
    const ids = [...new Set(propostasRecebidas.map(p => p.pedido_id).filter(Boolean))];
    if (ids.length === 0) { setPedidoTitlesById({}); return; }
    supabase.from("pedidos").select("id,descricao,categoria").in("id", ids).then(({ data }) => {
      const map = {};
      (data || []).forEach(p => { map[p.id] = p.descricao || p.categoria || "Serviço"; });
      setPedidoTitlesById(map);
    }).catch(() => {});
  }, [propostasRecebidas]);

  const notificationsFromPropostas = propostasRecebidas.map(p => ({
    id: p.id, proName: p.profissional_nome, proposal: p.mensagem,
    serviceTitle: pedidoTitlesById[p.pedido_id] || "Serviço", value: p.valor,
    status: p.status === "pendente" ? "pending" : "accepted",
  }));
  const [userLocation,  setUserLocation]  = useState(localStorage.getItem("multiLocation") || savedSession?.location || "sua região");
  useEffect(() => {
    const sess = (() => { try { return JSON.parse(localStorage.getItem("multiUser")) || {}; } catch { return {}; } })();
    const email = sess.email || savedSession?.email || "";
     if (!email) { console.log("EMAIL VAZIO - multiUser:", JSON.stringify(JSON.parse(localStorage.getItem("multiUser")||"{}"))); return; }
    fetch("https://multi-backend-lfwp.onrender.com/api/enderecos/" + encodeURIComponent(email))
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
     if (!email) { console.log("EMAIL VAZIO - multiUser:", JSON.stringify(JSON.parse(localStorage.getItem("multiUser")||"{}"))); return; }
    fetch("https://multi-backend-lfwp.onrender.com/api/enderecos/" + encodeURIComponent(email))
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

  const showToast = (msg, color = G) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2600);
  };

  // ── WELCOME EMAIL SIMULATION ─────────────────────────────────────────────────
  // URL do backend — troque para https://api.multifuncao.com.br em produção
  const API_URL = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "https://multi-backend-lfwp.onrender.com";

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
    const firstName = name.trim().split(/\s+/)[0];

    const finishLogin = (resolvedRole) => {
      setIsLoggedIn(true);
      setAuthScreen(null);
      if (name)     setUserName(firstName);
      if (email)    setUserEmail(email);
      if (location && location !== "sua região") setUserLocation(location);
      setUserRole(resolvedRole);
      setRole(resolvedRole);

      // Save session to localStorage — persists across page reloads
      try {
        const session = { name: firstName, email, whatsapp, location, role: resolvedRole };
        localStorage.setItem("multiSession", JSON.stringify(session));
        localStorage.setItem("multiUser",    JSON.stringify(session));
        // "role" só entra nesse upsert na criação da conta (isNewAccount).
        // Em logins seguintes, gravar role aqui sobrescrevia o valor real do
        // Supabase com o que estava cacheado na sessão local, revertendo
        // silenciosamente contas que tinham virado "professional" depois do
        // cadastro original. Troca de role fora do cadastro só acontece pelo
        // fluxo explícito (onSwitchRole, "Sou profissional"/"Sou cliente").
        const upsertPayload = { email: session.email, name: session.name, whatsapp: session.whatsapp||null, city: session.location||null };
        // Cadastro novo por aqui é sempre client/professional (empresa tem seu próprio
        // fluxo/upsert em CadastroEmpresaScreen) — zera empresa_id pra não herdar o
        // vínculo de um teste/conta anterior que usou o mesmo e-mail como empresa,
        // o que travava esse e-mail pra sempre como "empresa" no login (ver abaixo).
        if (isNewAccount) { upsertPayload.role = session.role || "client"; upsertPayload.empresa_id = null; }
        supabase.from("usuarios").upsert(upsertPayload, { onConflict: "email" }).then(()=>{}).catch(()=>{});
      } catch {}

      setScreen("home");
      // Plano real (assinaturas) é carregado pelo efeito de [userEmail, role]
      // logo abaixo — dispara tanto aqui (login) quanto na restauração de
      // sessão do localStorage num reload de página.
      if (isNewAccount) {
        setTimeout(() => sendWelcomeEmail({ name, email, role: resolvedRole }), 400);
      }
      if (pendingIntent?.fn) {
        const fn = pendingIntent.fn;
        setPendingIntent(null);
        setTimeout(fn, 80);
      }
    };

    const fallbackRole = registeredRole || userRole;
    if (!email) { finishLogin(fallbackRole); return; }

    // Uma conta com empresa_id vinculado é sempre "empresa", mesmo que o role
    // devolvido pelo login/cadastro diga outra coisa — evita que login/registro
    // regrave "client"/"professional" por cima de uma conta de empresa parceira.
    supabase.from("usuarios").select("empresa_id").eq("email", email).maybeSingle()
      .then(({ data }) => finishLogin(data?.empresa_id ? "empresa" : fallbackRole))
      .catch(() => finishLogin(fallbackRole));
  };

  // ── SERVICE HANDLERS (Fase 1: fluxo único real, nada aqui é mock) ───────────
  const handlePostServiceSuccess = (pedidoReal) => {
    setSelected(pedidoReal);
    setScreen("orders");
    refreshMeusPedidos();
  };

  // Usada tanto por PropostasScreen ("Ver Propostas" → aceitar) quanto por
  // AlertsScreen ("Aceitar" direto no alerta) — antes eram dois caminhos
  // redundantes, um real e um mock.
  const handleAceitarProposta = (proposta) => {
    supabase.from("propostas").update({ status:"aceita" }).eq("id", proposta.id).then(()=>{});
    supabase.from("pedidos").update({
      status:"em_andamento",
      profissional_aceito: proposta.profissional_id,
      profissional_nome: proposta.profissional_nome,
    }).eq("id", proposta.pedido_id).then(()=>refreshMeusPedidos());
    openChatFromService({
      id: proposta.pedido_id,
      title: pedidoTitlesById[proposta.pedido_id] || "Serviço",
      pro: proposta.profissional_nome,
      profissional_aceito: proposta.profissional_id,
      proposalValue: proposta.valor,
      contactUnlocked: true,
    });
  };

  // Mesma lógica de handleAceitarProposta, versão empresa: agora também abre o
  // chat in-app (Fase 1), espelhando o fluxo de cliente+profissional individual.
  const handleAceitarPropostaEmpresa = (proposta) => {
    supabase.from("propostas").update({ status:"aceita" }).eq("id", proposta.id).then(()=>{});
    // Só abre o chat depois do update de "pedidos" terminar — antes disso,
    // MinhasDemandasScreen podia remontar e buscar o pedido ainda com o status
    // antigo (a escrita ainda não tinha chegado no banco).
    supabase.from("pedidos").update({
      status:"em_andamento",
      profissional_aceito: proposta.profissional_id,
      profissional_nome: proposta.profissional_nome,
    }).eq("id", proposta.pedido_id).then(() => {
      showToast?.("✅ Proposta aceita!", G);
      openChatFromService({
        id: proposta.pedido_id,
        pro: proposta.profissional_nome,
        profissional_aceito: proposta.profissional_id,
        proposalValue: proposta.valor,
        contactUnlocked: true,
      });
    });
  };

  // AlertsScreen só conhece o id da proposta (n.id) — resolve pra proposta
  // completa antes de aceitar.
  const handleAceitarPropostaPorId = (propostaId) => {
    const proposta = propostasRecebidas.find(p => p.id === propostaId);
    if (proposta) handleAceitarProposta(proposta);
  };

  // "Aceitar agora" no popup de novo pedido (NewOrderCard) — o profissional
  // pega o pedido direto, sem passar por "propostas" (não existe proposta
  // nenhuma nesse caminho). Só grava em "pedidos"; abrir a tela de detalhe
  // continua sendo responsabilidade de quem chama.
  const handleAceitarPedidoDireto = (pedidoId) => {
    if (!pedidoId) return;
    supabase.from("pedidos").update({
      status: "em_andamento",
      profissional_aceito: userEmail,
      profissional_nome: userName,
    }).eq("id", pedidoId).then(()=>refreshMeusPedidos());
  };

  const openChatFromNotif = (notif) => {
    setActiveChat({ pedidoId:null, proId:null, proName: notif.proName, serviceTitle: notif.serviceTitle, proposalValue: notif.value, contactUnlocked:false, messages:[] });
    setScreen("activechat");
  };

  const openChatFromService = (svc) => {
    setActiveChat({
      pedidoId: svc.id,
      proId: svc.profissional_aceito || svc.proId || null,
      proName: svc.pro || svc.profissional_nome || "Profissional",
      serviceTitle: svc.title,
      proposalValue: svc.proposalValue || svc.value,
      contactUnlocked: svc.contactUnlocked || isPro,
      messages: [],
    });
    setScreen("activechat");
  };

  const handleFinishService = () => {
    if (!activeChat?.pedidoId) { setActiveChat(null); setScreen("orders"); return; }
    const pedidoId = activeChat.pedidoId;
    supabase.from("pedidos").update({
      status:"concluido", updated_at:new Date().toISOString(), concluido_em:new Date().toISOString(),
    }).eq("id", pedidoId).then(()=>refreshMeusPedidos());
    setAvaliacaoSvc({
      id: pedidoId, profissional_aceito: activeChat.proId,
      pro: activeChat.proName, profissional_nome: activeChat.proName, title: activeChat.serviceTitle,
    });
    setActiveChat(null);
    setScreen("avaliacao");
  };

  // Centraliza a persistência de mudança de status do pedido — usada tanto
  // pelo check-in/liberação do cliente (ServiceDetailClient) quanto pela
  // finalização via PIN do profissional (ServiceDetailPinEntry). Não cobre
  // mais a transição pra "concluido" — isso é bilateral, ver
  // handleConfirmarConclusao.
  const handlePedidoStatusChange = (id, novoStatus) => {
    const extra = novoStatus === "concluido" ? { concluido_em: new Date().toISOString() } : {};
    supabase.from("pedidos").update({ status: novoStatus, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id).then(()=>refreshMeusPedidos()).catch(()=>{});
  };

  // Conclusão bilateral (Fase 4): cada lado só grava sua própria coluna
  // pareada (mesmo padrão do aceite formal). Só quando os dois lados já
  // confirmaram é que o pedido de fato vira "concluido".
  const handleConfirmarConclusao = (pedidoId, lado, observacao, fotos) => {
    const campoTempo = lado === "cliente" ? "concluido_cliente_em" : "concluido_profissional_em";
    const campoObs   = lado === "cliente" ? "conclusao_observacao_cliente" : "conclusao_observacao_profissional";
    const campoFotos = lado === "cliente" ? "conclusao_fotos_cliente" : "conclusao_fotos_profissional";
    supabase.from("pedidos").select("concluido_cliente_em,concluido_profissional_em").eq("id", pedidoId).maybeSingle()
      .then(({ data }) => {
        const outroJaConfirmou = lado === "cliente" ? data?.concluido_profissional_em : data?.concluido_cliente_em;
        const updates = { [campoTempo]: new Date().toISOString(), [campoObs]: observacao || null, [campoFotos]: (fotos && fotos.length) ? fotos : null };
        if (outroJaConfirmou) { updates.status = "concluido"; updates.concluido_em = new Date().toISOString(); }
        return supabase.from("pedidos").update(updates).eq("id", pedidoId).select().maybeSingle();
      })
      .then(({ data }) => {
        refreshMeusPedidos();
        // Sem isso, a tela de detalhe aberta (selected) ficava com o
        // snapshot antigo — o pedido virava "concluido" no banco mas a UI
        // continuava presa em "Em Execução" até sair e voltar pra tela.
        if (data) setSelected(sel => sel?.id === pedidoId ? mapPedidoRow(data) : sel);
      })
      .catch(() => {});
  };

  const handleProFeedAction = (payload) => {
    if (payload._upgrade) { setScreen("upgrade"); return; }
    if (payload._notify)  {
      requireAuth("proposal", () => showToast("💼 Proposta enviada! Cliente será notificado.", B));
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

  const notifCount = notificationsFromPropostas.filter(n => n.status === "pending").length;

  // ── SCREEN ROUTER ───────────────────────────────────────────────────────────
  function PropostasScreen({ pedido, onBack, onAceitarProposta }) {
  const [propostas, setPropostas] = useState([]);
  const [perfis, setPerfis] = useState({}); // email -> { foto_perfil_url, bio, categoria_servico }
  const [reputacoes, setReputacoes] = useState({}); // email -> { mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if(!pedido) return;
    supabase.from("propostas").select("*").eq("pedido_id",pedido.id).order("created_at",{ascending:false})
      .then(async ({data})=>{
        const lista = data || [];
        setPropostas(lista);
        setLoading(false);
        // Enriquece cada proposta com foto/bio/categorias reais do profissional —
        // antes disso a tela só mostrava nome+valor+mensagem, perfil vazio.
        const emails = [...new Set(lista.map(p => p.profissional_email || p.profissional_id).filter(Boolean))];
        if (emails.length) {
          const { data: usuarios } = await supabase.from("usuarios").select("email,foto_perfil_url,bio,categoria_servico").in("email", emails);
          const map = {};
          (usuarios || []).forEach(u => { map[u.email] = u; });
          setPerfis(map);
          Promise.all(emails.map(email => fetchReputacao(email).then(r => [email, r])))
            .then(pares => setReputacoes(Object.fromEntries(pares)))
            .catch(() => {});
        }
      })
      .catch(()=>setLoading(false));
  },[pedido?.id]);
  return (
    <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>
      <button onClick={onBack} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",marginBottom:12}}>← Voltar</button>
      <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Propostas recebidas</h2>
      {loading && <p>Carregando...</p>}
      {!loading && propostas.length===0 && <p style={{color:"#888"}}>Nenhuma proposta ainda.</p>}
      {propostas.map(p=>{
        const perfil = perfis[p.profissional_email || p.profissional_id];
        const reputacao = reputacoes[p.profissional_email || p.profissional_id];
        const cats = resolveCats(perfil?.categoria_servico);
        return (
          <div key={p.id} style={{background:"white",borderRadius:12,padding:16,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",background:"#EEF0F5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {perfil?.foto_perfil_url
                  ? <img src={perfil.foto_perfil_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" />
                  : <User size={22} color="#B0B4C0" />}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15}}>{p.profissional_nome||"Profissional"}</div>
                {cats.length > 0 && <div style={{fontSize:11,color:"#888"}}>{cats.map(c=>`${c.emoji} ${c.label}`).join(" · ")}</div>}
                {reputacao && <div style={{marginTop:3}}><ReputacaoBadge {...reputacao} /></div>}
              </div>
            </div>
            {perfil?.bio && (
              <div style={{color:"#555",fontSize:12.5,lineHeight:1.5,marginBottom:10,background:"#F8F9FB",borderRadius:10,padding:"8px 10px"}}>{perfil.bio}</div>
            )}
            <div style={{color:"#007BFF",fontWeight:800,fontSize:18,margin:"6px 0"}}>R$ {p.valor||0}</div>
            <div style={{color:"#666",fontSize:13,marginBottom:12}}>{p.mensagem||""}</div>
            <button onClick={()=>onAceitarProposta&&onAceitarProposta(p)} style={{width:"100%",padding:"12px",background:"#22c55e",color:"white",border:"none",borderRadius:10,fontWeight:800,fontSize:14,cursor:"pointer"}}>✅ Aceitar Proposta</button>
          </div>
        );
      })}
    </div>
  );
}

const renderContent = () => {
  console.log("RENDER:", role, authScreen, screen);
    if (screen === "activechat" && activeChat) {
      return (
        <NegociacaoChatScreen
          chat={activeChat}
          meuEmail={userEmail}
          onBack={() => { setActiveChat(null); setScreen(role === "client" ? "chat" : "home"); }}
        />
      );
    }

    // Global (independente de role) — antes só existia dentro do bloco
    // "Professional screens", então o cliente nunca conseguia abrir essa
    // tela de fato (Fase 4).
    if (screen === "avaliacao" && avaliacaoSvc) return <AvaliacaoScreen key={avaliacaoSvc.id} service={avaliacaoSvc} onBack={()=>setScreen("orders")} setScreen={setScreen} userEmail={userEmail} showToast={showToast} />;

  if (!role && !authScreen) { setAuthScreen("role-select"); return null; }
    if (role === "client") {
      if (screen === "post")   return <PostServiceScreen onBack={() => setScreen("home")} onSuccess={handlePostServiceSuccess} />;
      if (selectedPro) return (
    <div style={{minHeight:"100vh",background:"#f5f5f5"}}>
      <div style={{background:"linear-gradient(135deg,#1565C0,#0D47A1)",padding:"40px 20px 60px",textAlign:"center",position:"relative"}}>
        <button onClick={()=>setSelectedPro(null)} style={{position:"absolute",top:16,left:16,background:"rgba(255,255,255,.2)",border:"none",borderRadius:20,padding:"6px 14px",color:"white",cursor:"pointer",fontSize:14}}>← Voltar</button>
        <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.2)",margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{selectedPro.pro.avatar||"👷"}</div>
        <h2 style={{color:"white",margin:"0 0 4px",fontSize:22}}>{selectedPro.pro.name}</h2>
        <div style={{color:"rgba(255,255,255,.8)",fontSize:13}}>{selectedPro.pro.specialty||"Profissional verificado"} · {selectedPro.pro.jobs||0} serviços</div>
        <div style={{marginTop:8}}>{"⭐".repeat(Math.round(selectedPro.pro.rating||5))}<span style={{color:"rgba(255,255,255,.9)",fontSize:13,marginLeft:4}}>{selectedPro.pro.rating||"5.0"}</span></div>
      </div>
      <div style={{padding:"16px",marginTop:-20}}>
        <div style={{background:"white",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <h3 style={{margin:"0 0 8px",fontSize:15,color:"#333"}}>Proposta</h3>
          <div style={{fontSize:24,fontWeight:800,color:"#1565C0"}}>R$ {selectedPro.pro.value}</div>
          <div style={{fontSize:12,color:"#888",marginTop:4}}>Valor proposto para este serviço</div>
        </div>
        <div style={{background:"white",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <h3 style={{margin:"0 0 8px",fontSize:15,color:"#333"}}>Sobre o profissional</h3>
          <p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.6}}>{selectedPro.pro.bio||"Profissional experiente e dedicado, com histórico comprovado de excelência no serviço."}</p>
        </div>
        <div style={{background:"white",borderRadius:16,padding:"16px",marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <h3 style={{margin:"0 0 12px",fontSize:15,color:"#333"}}>Avaliações recentes</h3>
          {[{name:"Maria S.",text:"Ótimo profissional, muito pontual!",rating:5},{name:"João P.",text:"Serviço impecável, recomendo.",rating:5}].map((r,i)=>(
            <div key={i} style={{borderBottom:i===0?"1px solid #f0f0f0":"none",paddingBottom:i===0?12:0,marginBottom:i===0?12:0}}>
              <div style={{fontWeight:600,fontSize:13}}>{r.name} {"⭐".repeat(r.rating)}</div>
              <div style={{fontSize:12,color:"#666",marginTop:2}}>{r.text}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>{openChatFromService({...selectedPro.svc,pro:selectedPro.pro.name,proposalValue:selectedPro.pro.value,contactUnlocked:true,status:"inprogress"});setSelectedPro(null);}} style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:"linear-gradient(135deg,#1565C0,#0D47A1)",color:"white",fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"0 4px 12px rgba(21,101,192,.4)"}}>💬 Abrir Chat</button>
      </div>
    </div>
  );
  
  if (screen === "radar" && selected) return <RadarSearchScreen service={selected} onFound={(pro, svc) => { setSelectedPro({pro, svc}); }} onStatusChange={handlePedidoStatusChange} showToast={showToast} />;
      if (screen === "alerts") return <AlertsScreen notifications={notificationsFromPropostas} onAccept={handleAceitarPropostaPorId} onOpenChat={openChatFromNotif} />;
      if (screen === "chat")   return <ChatInbox myServices={meusPedidosComCandidatos} onOpenChat={openChatFromService} />;
      if (screen === "orders") return <MyServicesScreen initialTab="aberto" myServices={meusPedidosComCandidatos} onViewPropostas={(s)=>{setSelected(s);setScreen("propostas");}} onOpenService={s => { setSelected(s); setScreen("service"); }} onOpenChat={openChatFromService} onCancelarPedido={(s) => { if (window.confirm('Cancelar esse pedido? O profissional será avisado.')) { handlePedidoStatusChange(s.id, 'cancelado'); showToast?.('Pedido cancelado.', '#DC2626'); } }} isPro={isPro} />;
      if (screen === "profile") {
        if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("welcome")} />;
        return <ProfileScreen role="client" userName={userName} isPro={false} showRankingGlobal={showRankingGlobal} onClearRankingGlobal={() => setShowRankingGlobal(false)} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenAdmin={() => setShowAdmin(true)} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} if (userEmail) supabase.from("usuarios").update({ role:r }).eq("email", userEmail).then(()=>{}).catch(()=>{}); setScreen("home"); }} />;
      }
      if (screen === "propostas" && selected) return <PropostasScreen pedido={selected} onBack={()=>setScreen("orders")} onAceitarProposta={handleAceitarProposta} />;
      if (screen === "service" && selected) return <ServiceDetailClient key={selected.id} service={selected} onBack={() => setScreen("orders")} onStatusChange={handlePedidoStatusChange} onConfirmarConclusao={handleConfirmarConclusao} showToast={showToast} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;

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
            myServices={isLoggedIn ? meusPedidosComCandidatos : []}
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

    // Empresa parceira — home própria + Pedidos + Editar Perfil.
    if (role === "empresa") {
      if (screen === "pedidos") return <EmpresaPedidosScreen userEmail={userEmail} />;
      if (screen === "upgrade") return <EscolherPlanoScreen titularTipo="empresa" titularEmail={userEmail} titularNome={userName} onBack={() => setScreen("editar")} showToast={showToast} onDone={() => { carregarPlano("empresa", userEmail); setScreen("editar"); }} />;
      if (screen === "editar")  return <EmpresaEditProfileScreen userEmail={userEmail} onLogout={handleLogout} showToast={showToast} isPro={isPro} plano={plano} planoStatus={planoStatus} planoExpiraEm={planoExpiraEm} onUpgrade={() => setScreen("upgrade")} />;

      // Gate real das features Plus: só empresa_plus ativo/trial. Quem não
      // tem, cai direto na tela de escolher plano — os botões em
      // EmpresaHomeScreen não precisam saber o plano pra decidir o que mostrar.
      const temEmpresaPlus = plano === "empresa_plus" && (planoStatus === "trial" || planoStatus === "ativa");
      const paywallPlus = (voltarPara) => <EscolherPlanoScreen titularTipo="empresa" titularEmail={userEmail} titularNome={userName} onBack={() => setScreen("home")} showToast={showToast} onDone={() => { carregarPlano("empresa", userEmail); setScreen(voltarPara); }} />;

      if (screen === "banco-profissionais") {
        if (!temEmpresaPlus) return paywallPlus("banco-profissionais");
        return <BancoProfissionaisScreen onBack={() => setScreen("home")} empresaEmail={userEmail} />;
      }
      if (screen === "minha-rede") {
        if (!temEmpresaPlus) return paywallPlus("minha-rede");
        return <MinhaRedeScreen onBack={() => setScreen("home")} empresaEmail={userEmail} />;
      }
      if (screen === "nova-demanda") {
        if (!temEmpresaPlus) return paywallPlus("nova-demanda");
        return <NovaDemandaScreen userEmail={userEmail} userName={userName} showToast={showToast} onBack={() => setScreen("minhas-demandas")} />;
      }
      if (screen === "minhas-demandas") {
        if (!temEmpresaPlus) return paywallPlus("minhas-demandas");
        return <MinhasDemandasScreen userEmail={userEmail} onBack={() => setScreen("home")} onVerPropostas={(d) => { setSelected(d); setScreen("demanda-propostas"); }} onOpenChat={openChatFromService} />;
      }
      if (screen === "demanda-propostas" && selected) {
        if (!temEmpresaPlus) return paywallPlus("minhas-demandas");
        return <PropostasScreen pedido={selected} onBack={() => setScreen("minhas-demandas")} onAceitarProposta={handleAceitarPropostaEmpresa} />;
      }
      return <EmpresaHomeScreen userEmail={userEmail} onLogout={handleLogout} showToast={showToast} onGoToPedidos={() => setScreen("pedidos")} onGoToEditar={() => setScreen("editar")} onGoToBanco={() => setScreen("banco-profissionais")} onGoToRede={() => setScreen("minha-rede")} onGoToNovaDemanda={() => setScreen("nova-demanda")} onGoToMinhasDemandas={() => setScreen("minhas-demandas")} />;
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
            myServices={isLoggedIn ? meusPedidosComCandidatos : []}
            userName={userName}
          />
          <button onClick={() => requireAuth("post", () => setScreen("post"))} style={{ position:"fixed", bottom:80, right:20, zIndex:100, display:"flex", alignItems:"center", gap:8, padding:"14px 20px", borderRadius:99, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:14, boxShadow:"0 6px 24px rgba(255,87,34,.5)" }}>
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      );
    }

    // Professional screens
  if (screen === "upgrade") return <EscolherPlanoScreen titularTipo="usuario" titularEmail={userEmail} titularNome={userName} onBack={() => setScreen("home")} showToast={showToast} onDone={() => { carregarPlano("usuario", userEmail); setScreen("home"); }} />;
    if (screen === "wallet") return <WalletScreen onBack={() => setScreen("profile")} pedidos={meusGanhos} />;
    if (screen === "profile") {
      if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("welcome")} />;
      return <ProfileScreen role="professional" userName={userName} userEmail={userEmail} isPro={isPro} plano={plano} planoStatus={planoStatus} planoExpiraEm={planoExpiraEm} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenWallet={() => setScreen("wallet")} meusGanhos={meusGanhos} onOpenAdmin={() => setShowAdmin(true)} docStatus={docStatus} onDocStatusChange={(id, st) => setDocStatus(d => ({ ...d, [id]: st }))} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} if (userEmail) supabase.from("usuarios").update({ role:r }).eq("email", userEmail).then(()=>{}).catch(()=>{}); setScreen("home"); }} />;
    }
    if (screen === "service" && selected) return <ServiceDetailPro key={selected.id} service={selected} onBack={() => setScreen("home")} isPro={isPro} onUpgrade={() => setScreen("upgrade")} onOpenPinEntry={() => setScreen("pinjob")} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;
    if (screen === "pinjob"  && selected) return <ServiceDetailPinEntry key={selected.id} service={selected} onBack={() => setScreen("service")} onStatusChange={handlePedidoStatusChange} onConfirmarConclusao={handleConfirmarConclusao} showToast={showToast} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;
    if (screen === "orders") return <MyServicesScreen initialTab="concluido" myServices={meusPedidosComCandidatos} onViewPropostas={(s)=>{setSelected(s);setScreen("propostas");}} onOpenService={s => { setSelected(s); setScreen("service"); }} onOpenChat={openChatFromService} isPro={isPro} />;
    // Pro home — shows professional-specific banner + filters + feed
    return (
      <ProfessionalHome
        userName={userName}
        userEmail={userEmail}
        showToast={showToast}
        onGoToProfile={() => setScreen("profile")}
        isPro={isPro}
        plano={plano}
        onViewService={handleProFeedAction}
        onUpgrade={() => setScreen("upgrade")}
        userLocation={localStorage.getItem("multiLocation") || userLocation}
        allDocsVerified={allDocsVerified}
        docStatus={docStatus}
        onGoToDocs={() => setScreen("profile")} onGoToOrders={() => setScreen("orders")} onGoToWallet={() => setScreen("wallet")} onAcceptOrder={(order) => { handleAceitarPedidoDireto(order.id); setSelected(order); setScreen("service"); }}
      />
    );
  };

  // ── BOTTOM NAV with auth-gated tabs ─────────────────────────────────────────
  const handleNavTab = (id) => {
    // "Sair" na nav da empresa desloga direto, sem virar uma tela.
    if (id === "sair") {
      handleLogout();
      return;
    }
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
  if (authScreen === "role-select") {
    return wrapper(
      <RoleSelectScreen
        onLogin={() => setAuthScreen("login")}
        onSelect={(roleId) => {
          if (roleId === "cliente") { setAuthScreen("welcome"); return; }
          if (roleId === "profissional") { setSignupRole("professional"); setAuthScreen("register"); return; }
          if (roleId === "empresa") { setAuthScreen("cadastro-empresa"); return; }
        }}
      />
    );
  }

  if (authScreen === "welcome") {
    return wrapper(
      <WelcomeScreen
        onGoogle={() => alert("Login com Google em breve! Use o cadastro por e-mail.")}
        onEmail={() => setAuthScreen("login")}
        onBack={() => { setAuthScreen("role-select"); setPendingIntent(null); }}
        onEmpresa={() => setAuthScreen("cadastro-empresa")}
      />
    );
  }

  if (authScreen === "register") {
    return wrapper(
      <RegisterScreen onBack={() => setAuthScreen("role-select")} onComplete={handleLoginComplete} showToast={showToast} initialRole={signupRole} />
    );
  }

  if (authScreen === "cadastro-empresa") {
    return wrapper(
      <CadastroEmpresaScreen onBack={() => setAuthScreen("role-select")} showToast={showToast} />
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

    console.log("APP_RENDER: chegou no return wrapper");
  return wrapper(
    <>
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
          // ── Empresa parceira tabs ──
          : (isLoggedIn && userRole === "empresa")
          ? [
              { id:"home",    label:"Início",        Icon:Home },
              { id:"pedidos", label:"Pedidos",       Icon:ClipboardList },
              { id:"editar",  label:"Editar Perfil", Icon:User },
              { id:"sair",    label:"Sair",          Icon:LogOut },
            ]
          // ── Client tabs (or guest browsing) ──
          : [
              { id:"home",    label:"Início",       Icon:Home },
              { id:"orders",  label:"Meus Pedidos", Icon:ClipboardList },
              { id:"chat",    label:"Mensagens",    Icon:MessageCircle },
              { id:"profile", label:"Perfil",       Icon:User },
            ]
        ).map(({ id, label, Icon }) => {
          const active = screen === id || (id === "home" && !["orders","alerts","upgrade","profile","chat","post","service","radar","activechat","pedidos","editar"].includes(screen));
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
    <ChatWidget key="v5" />
      
    </>


  );
}