import { APP_VERSION } from "./AppVersion.js";
// BUILD_V4: 1779569710293 /* REBUILD_1779588782385 */
import CheckoutPagamento from './CheckoutPagamento';
//already from "./PixQRCode";
import ChatWidget from './ChatWidget';
﻿import { playNewOrderSound, stopNewOrderSound } from './newOrderSound';
import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
// Capacitor.isNativePlatform() é o gate usado em todo o app pra decidir se
// roda o caminho nativo (WebView empacotado) ou o web (navegador comum).
// @capacitor/core sozinho (sem "cap add android/ios" nem projeto nativo
// gerado ainda) já funciona em qualquer navegador — a implementação web do
// pacote só devolve false pra isNativePlatform(), sem exigir bridge nativa
// nenhuma. Import de onesignal-cordova-plugin também é seguro sem bridge:
// o módulo só instancia classes JS puras ao carregar (nenhuma chamada
// window.cordova.exec acontece até você chamar um método de verdade) —
// confirmado lendo o dist/index.cjs do pacote instalado.
import { Capacitor } from '@capacitor/core';
import OneSignalNative from 'onesignal-cordova-plugin';
import { CATS } from './cats';
const supabase=createClient('https://nlpfjkxqypveontunrxj.supabase.co','sb_publishable_xPCSGVYs-yI7TGS1F2EhFg_x7lMm30Q');
// URL absoluta pras funções serverless de notificação (Vercel, pasta /api).
// Antes eram fetch("/api/notify-...") relativos — funcionam hoje porque o
// site sempre roda a partir de multifuncao.com.br, mas quebram dentro de um
// wrapper nativo (Capacitor), onde a origem do WebView não é esse domínio
// (ex.: capacitor://localhost) e um caminho relativo bate num endereço que
// não existe. Preparação pro empacotamento nativo (Fase 1 do plano).
const NOTIFY_API = "https://multifuncao.com.br/api";
// Mesmo app id já usado pelo SDK web em index.html — mantido aqui como
// constante só pra não hardcodar o mesmo valor duas vezes (init nativo usa
// essa constante; o script do index.html continua com o dele, intocado).
const ONESIGNAL_APP_ID = "184f4647-8fbd-427d-8a8e-60f5aa38243c";

import AdminDashboard from "./AdminDashboard";
import {
  Search, MapPin, Bell, Star, Plus, ChevronRight, ChevronLeft, ChevronDown,
  Hammer, Wrench, Paintbrush, Scissors, Zap, Square,
  Home, ClipboardList, MessageCircle, User, Settings,
  ArrowLeft, Check, Camera, Send,
  Briefcase, Crown, Shield, TrendingUp, X, Clock, Building2,
  Lock, Navigation, Image, Flag, DollarSign, CheckCircle2,
  AlertCircle, FileText, Pencil, Wallet, LogOut,
  CreditCard, HeartHandshake, HelpCircle, KeyRound,
  BellRing, BadgeCheck, Users, ShieldCheck,
  Activity, BarChart2, Package, ChevronUp, Eye, EyeOff,
  Paperclip, Download, ArrowLeftRight, Gem, Coins, Phone,
} from "lucide-react";

/* ───────────────────────── DESIGN TOKENS ──────────────────────────────────── */
const B  = "#007BFF";
const O  = "#FF5722";
const BG = "#F5F6FA";
const G  = "#22c55e";

// Valor mínimo fixo pra publicar um pedido (PostServiceScreen, "Publicar
// Serviço") — impede pedido de R$0 ou valores irrisórios. Só um mínimo geral
// por enquanto, sem diferenciar por categoria.
const VALOR_MINIMO_PEDIDO = 20;

/* ───────────────────────── ANALYTICS (GA4 + Meta Pixel) ────────────────────
   2026-09-02: gtag.js (GA4, G-QQ3B8N35V5) já carregado em index.html desde
   19/08 — pageview automático cobre o site inteiro, incluindo /seja-
   profissional (SPA de página única, o script roda em qualquer rota).
   Meta Pixel ainda NÃO instalado (falta o Pixel ID, precisa vir do Meta
   Events Manager — não é algo que dá pra criar sem a conta de anúncios do
   usuário). Os dois wrappers abaixo são só disparo de evento — nunca
   quebram o app se o script correspondente não carregou (bloqueado por
   adblock, ainda não instalado, etc.), só deixam de mandar o evento nesse
   caso. GA4 e Meta Pixel usam vocabulário de evento diferente de propósito
   (GA4 aceita nome customizado; Meta tem "eventos padrão" como Lead/
   Subscribe que o Ads Manager já sabe interpretar pra otimização) — por
   isso são duas funções, não uma só disparando o mesmo nome nos dois. */
function trackGA(eventName, params = {}) {
  try { if (typeof window !== "undefined" && typeof window.gtag === "function") window.gtag("event", eventName, params); } catch {}
}
function trackPixel(eventName, params = {}) {
  try { if (typeof window !== "undefined" && typeof window.fbq === "function") window.fbq("track", eventName, params); } catch {}
}

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
// Pede permissão de push e devolve o subscription id (player_id) do
// dispositivo atual, ou null se o SDK não carregar / o usuário recusar.
// Usado quando a empresa ou o profissional ficam online, pra salvar o
// player_id em empresas.onesignal_player_id / usuarios.onesignal_player_id.
// Ramifica nativo (Capacitor + onesignal-cordova-plugin) vs. web (SDK
// carregado via <script> no index.html) — mesma função pros dois casos,
// quem chama (handleFicarOnline etc.) não precisa saber a diferença.
function getOneSignalPlayerId() {
  if (typeof window === "undefined") return Promise.resolve(null);

  if (Capacitor.isNativePlatform()) {
    // Espelha a mesma ordem do caminho web logo abaixo: pede permissão
    // primeiro (mostra o prompt nativo se ainda não foi decidido), só
    // depois lê o subscription id. NÃO verificado contra um app nativo de
    // verdade (sem device/simulador nesse ambiente) — a API usada aqui bate
    // com onesignal-cordova-plugin@5.5.2 (dist/index.d.ts), mas vale
    // reconferir na primeira build real antes de confiar cegamente.
    return new Promise((resolve) => {
      let done = false;
      const finish = (id) => { if (!done) { done = true; resolve(id || null); } };
      OneSignalNative.Notifications.requestPermission(true)
        .catch(() => {})
        .then(() => OneSignalNative.User.pushSubscription.getIdAsync())
        .then(finish)
        .catch(() => finish(null));
      setTimeout(() => finish(null), 8000);
    });
  }

  // Caminho web original, intocado — SDK carregado via <script> no
  // index.html, fila window.OneSignalDeferred documentada pelo próprio
  // OneSignal pra código que roda antes do SDK terminar de carregar.
  return new Promise((resolve) => {
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
// CATS/CAT_GRUPOS movidos pra ./cats.js (2026-09-02) — precisavam ficar
// importáveis também pelo AdminDashboard.jsx (seletor de categoria do
// formulário MULTI-SUP) sem criar import circular (App.jsx já importa
// AdminDashboard). Ver comentário histórico completo em cats.js.

// Ordem de exibição dos grupos no modal "Ver todas as categorias".
const CAT_GRUPOS = [
  "Reformas e Construção",
  "Elétrica e Automação",
  "Hidráulica e Desentupimento",
  "Gás e Fogão",
  "Móveis, Marcenaria e Montagem",
  "Limpeza e Higienização",
  "Climatização e Refrigeração",
  "Técnica e Manutenção",
  "Beleza",
  "Instalações e Pequenos Reparos",
  "Chaveiro",
  "Jardinagem e Áreas Externas",
  "Automotivo",
  "Pets",
  "Estofaria, Reparos e Artesanato",
  "Festas e Eventos",
  "Alimentação",
  "Transporte e Mudanças",
  "Marketing e Serviços Digitais",
  "Educação e Aulas",
  "Fotografia e Vídeo",
  "Engenharia, Projetos e Segurança do Trabalho",
  "Controle de Pragas",
  "Segurança e Controle de Acesso",
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

// SEED_FEED (11 pedidos fake hardcoded, sem etiqueta nenhuma) foi removido
// em 2026-08-27 — substituído pelo sistema de "pedidos fictícios" de
// verdade (origem='demo' na tabela pedidos, controlado pelo Admin, sempre
// com badge "Exemplo" visível pro profissional). Ver mapPedidoParaCard e o
// fetch de demoPedidos em ProfessionalHome, e o plano completo na memória
// multi_dados_ficticios_plano.
//
// Converte uma linha crua de "pedidos" (banco) pro formato que os cards do
// mural do profissional esperam. Extraído do que antes era um único
// .map(p=>({...})) inline dentro do fetch de ProfessionalHome, agora
// reusado tanto pro fetch de pedidos reais quanto pro de fictícios.
function mapPedidoParaCard(p) {
  return {
    id: p.id, cliente_id: p.cliente_id, cat: p.categoria || "servico",
    title: (p.descricao || p.categoria || "Serviço").slice(0, 40),
    desc: p.descricao || "", value: p.valor, tipoValor: p.tipo_valor,
    loc: p.cidade || "sua região",
    time: new Date(p.created_at).toLocaleDateString("pt-BR"),
    client: p.cliente_nome || "Cliente", rating: 4.5,
    // Achado 2026-09-02: isso ficava hardcoded `false` sempre — o badge/
    // filtro "🔥 Urgente" nunca funcionava pra nenhum pedido real, mesmo
    // quando o cliente escolhia "Urgente"/"Muito Urgente" ao publicar
    // (coluna pedidos.urgencia, ver PostServiceScreen). Corrigido pra ler
    // de verdade.
    urgent: p.urgencia === "urgente" || p.urgencia === "muito_urgente",
    emoji: "🔧", bg: "#FFF8E1", photo: null, photos: p.fotos,
    publicoAlvo: p.publico_alvo, tipoAtendimento: p.tipo_atendimento,
    prazo: p.prazo, custoMoedas: p.custo_moedas,
    // "suporte" preservado à parte de "real" (não colapsado mais) — demanda
    // MULTI-SUP não tem cliente com conta no app por trás (ver
    // multi_sup_captacao_manual na memória): "Tenho Interesse" grava a
    // proposta mas não tenta abrir chat/WhatsApp (não teria pra onde ir).
    // telefone_cliente NUNCA é lido pro card — decisão explícita 2026-09-02
    // de não expor telefone do cliente nenhum no app do profissional;
    // intermediação é manual (Admin → "Interesses MULTI-SUP").
    origem: p.origem === "demo" ? "demo" : p.origem === "suporte" ? "suporte" : "real",
  };
}

// Faixa de chips com scroll horizontal navegável por setas ◀ ▶ (em vez de só
// arrastar, difícil de perceber/usar no touch — pedido do usuário
// 2026-08-29 pro Mural de Serviços). O arraste continua funcionando também,
// as setas só chamam scrollBy no mesmo container.
function HScrollArrows({ children }) {
  const trackRef = useRef(null);
  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: "smooth" });
  };
  const arrowBtn = {
    flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: "none",
    background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.15)", color: "#555",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" onClick={() => scrollByPage(-1)} aria-label="Ver anteriores" style={arrowBtn}>
        <ChevronLeft size={16} />
      </button>
      <div ref={trackRef} style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, scrollBehavior: "smooth" }}>
        {children}
      </div>
      <button type="button" onClick={() => scrollByPage(1)} aria-label="Ver próximos" style={arrowBtn}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

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

function Card({ children, style = {}, onClick, className }) {
  return (
    <div className={className} onClick={onClick} style={{
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
// Logo novo (multi_logo_transparente.png, 411x348) — raster único, sem variante
// branca própria; "white" fica aceito por compatibilidade com as 5 chamadas
// existentes mas não tem mais efeito (o antigo SVG desenhava o traço em
// branco pra contrastar com headers escuros; o PNG já tem cor de marca fixa).
function Logo({ size = 28, white = false }) {
  return (
    <img
      src="/logo/multi_logo_transparente.png"
      alt="Multi"
      width={size}
      height={size * (348 / 411)}
      style={{ display:"block", objectFit:"contain" }}
    />
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
      // notch/Dynamic Island: o fundo colorido cobre até a borda de verdade,
      // e esse padding empurra o conteúdo (linha "Sua Localização") pra baixo
      // dele. env() só existe com viewport-fit=cover no <meta viewport> — em
      // navegador normal isso resolve pra 0px, sem efeito nenhum.
      paddingTop:"env(safe-area-inset-top)",
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
          <button onClick={onAlerts} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
            <Bell size={15} color="white" />
            {notifCount > 0 && <span style={{ position:"absolute", top:5, right:5, width:7, height:7, background:"#FF4444", borderRadius:"50%", border:"1.5px solid rgba(0,0,0,.3)" }} />}
          </button>
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
            <span style={{ fontSize:19, fontWeight:900, color:"white", letterSpacing:-0.5, lineHeight:1 }}>Multi</span>
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

      {/* row 3: context indicator — o toggle client→professional já existia
          (localStorage + reload, sem gate nenhum); só melhorei a affordance
          (pill clicável + ícone de troca), a lógica de troca é a mesma de
          sempre. O toggle professional→client ao lado é novo — antes não
          existia nenhum jeito de voltar pra cá depois de virar profissional
          por aqui, o que travava contas "cliente e profissional" (fluxo de
          virar profissional, Fase X) num beco sem saída. */}
      {!isProfessional && (
        <div style={{ margin:"0 16px 12px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button onClick={function(){try{var s=JSON.parse(localStorage.getItem("multiSession")||"{}")||{};s.role="professional";localStorage.setItem("multiSession",JSON.stringify(s));var u=JSON.parse(localStorage.getItem("multiUser")||"{}")||{};u.role="professional";localStorage.setItem("multiUser",JSON.stringify(u));}catch(x){}window.location.reload();}}
            style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", borderRadius:99, padding:"5px 12px", cursor:"pointer" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", flexShrink:0 }} />
            <span style={{ fontSize:11, color:"white", fontWeight:700 }}>Modo: Cliente (toque p/ alternar)</span>
            <ArrowLeftRight size={12} color="white" style={{ flexShrink:0 }} />
          </button>
        </div>
      )}
      {isProfessional && (
        <div style={{ margin:"0 16px 12px", background:"rgba(255,87,34,.2)", border:"1px solid rgba(255,87,34,.3)", borderRadius:12, padding:"8px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <Briefcase size={13} color={O} />
            <span style={{ fontSize:11, color:"rgba(255,255,255,.9)", fontWeight:800 }}>Modo Profissional Ativo</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, fontWeight:800, color:O, background:"rgba(255,87,34,.25)", borderRadius:99, padding:"2px 8px" }}>
              {isPro ? "PRO ✓" : "Free"}
            </span>
            <button onClick={function(){try{var s=JSON.parse(localStorage.getItem("multiSession")||"{}")||{};s.role="client";localStorage.setItem("multiSession",JSON.stringify(s));var u=JSON.parse(localStorage.getItem("multiUser")||"{}")||{};u.role="client";localStorage.setItem("multiUser",JSON.stringify(u));}catch(x){}window.location.reload();}}
              title="Voltar pro modo Cliente" aria-label="Voltar pro modo Cliente"
              style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <ArrowLeftRight size={11} color="white" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function GuestHeader({ onToggleRole, activeRole = "client", onSelectEmpresa, locked = false }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:50, background:`linear-gradient(180deg,${B} 0%,#0057d4 100%)`, boxShadow:"0 4px 20px rgba(0,112,255,.28)", borderRadius:"0 0 20px 20px", paddingTop:"env(safe-area-inset-top)" }}>
      {/* row 1 — location escondida quando "locked" (2026-09-02, pedido
          explícito): lead de anúncio pago não pode ver NENHUM nome de cidade
          fixo na tela isca, nem o detectado por geolocalização/localStorage
          de sessão anterior no mesmo navegador — dá a impressão de que o
          app só atende aquela cidade. Cards de demanda individual continuam
          mostrando a cidade de cada serviço normalmente (isso é informação
          relevante, não é o que incomoda); só esse bloco de identidade fixa
          no topo some. Div vazia no lugar mantém o avatar alinhado à
          direita (justify-content:space-between precisa dos dois lados). */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px 6px" }}>
        {locked ? <div /> : (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <MapPin size={13} color="rgba(255,255,255,.7)" />
            <div>
              <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", fontWeight:700, margin:0 }}>Sua Localização</p>
                  <p style={{ fontSize:12, color:"white", fontWeight:800, margin:0 }}>{localStorage.getItem("multiLocation") || "Sua localização"}</p>
            </div>
          </div>
        )}
        <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>👤</div>
      </div>
      {/* row 2: logo */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2px 18px 10px", gap:8 }}>
        <Logo size={26} white />
        <div>
          <span style={{ fontSize:19, fontWeight:900, color:"white", letterSpacing:-0.5, lineHeight:1 }}>Multi</span>
          <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", margin:0, lineHeight:1.2 }}>serviços em um toque</p>
        </div>
      </div>
      {/* row 3: toggle — Cliente/Profissional drivem o preview de convidado
          (App role state); Empresa não tem preview de convidado (não faz
          sentido "navegar como empresa" sem conta), então o clique já leva
          direto pro cadastro/login de empresa (mesma tela que o card "Quero
          crescer minha empresa" da RoleSelectScreen usa).
          "locked" (2026-09-01, ?cadastro=profissional) some com essa linha
          inteira — lead pago de anúncio não pode ter opção de escapar pra
          visão de cliente/empresa no meio do próprio funil que ele veio
          seguindo. */}
      {!locked && (
        <div style={{ display:"flex", margin:"0 16px 14px", background:"rgba(255,255,255,.15)", borderRadius:14, padding:3 }}>
          {[{ id:"client", label:"Cliente", Icon:User }, { id:"professional", label:"Profissional", Icon:Briefcase }, { id:"empresa", label:"Empresa", Icon:Building2 }].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => id === "empresa" ? onSelectEmpresa?.() : onToggleRole?.(id)} style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4,
              padding:"9px 0", borderRadius:12, fontSize:11, fontWeight:800,
              border:"none", cursor:"pointer", transition:"all .18s", whiteSpace:"nowrap",
              background: activeRole === id ? "white" : "transparent",
              color:      activeRole === id ? "#1a1a2e" : "rgba(255,255,255,.75)",
              boxShadow:  activeRole === id ? "0 2px 8px rgba(0,0,0,.12)" : "none",
            }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Public façade — picks the right header, nothing shared between them */
function Header({ isPro, notifCount, isLoggedIn, userRole, onAlerts, userLocation, onToggleRole, activeRole, onSelectEmpresa, guestLocked }) {
  if (isLoggedIn) {
    return <AuthHeader isPro={isPro} notifCount={notifCount} userRole={userRole} onToggleRole={onToggleRole} onAlerts={onAlerts} userLocation={localStorage.getItem("multiLocation") || userLocation} />;
  }
  return <GuestHeader onToggleRole={onToggleRole} activeRole={activeRole} onSelectEmpresa={onSelectEmpresa} locked={guestLocked} />;
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
function AlertsScreen({ notifications, onAccept, onOpenChat, onOpenPedido }) {
  if (notifications.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 32px", gap:14, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:B+"12", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Bell size={28} color={B} />
        </div>
        <p style={{ fontWeight:800, fontSize:16, color:"#1a1a2e" }}>Nenhuma notificação</p>
        <p style={{ fontSize:13, color:"#aaa", lineHeight:1.5 }}>Quando um profissional enviar uma proposta ou aceitar seu pedido, aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, padding:"18px 16px 40px" }}>
      <style>{`.alert-card-click:hover, .alert-card-click:active { background:#FAFBFC; box-shadow:0 4px 14px rgba(0,0,0,.09); }`}</style>
      <h2 style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", margin:0 }}>Alertas</h2>
      {notifications.map(n => n.kind === "evento" ? (
        <Card
          key={n.id}
          className={n.pedido_id ? "alert-card-click" : ""}
          style={{ cursor: n.pedido_id ? "pointer" : "default", transition:"background .15s, box-shadow .15s" }}
          onClick={() => onOpenPedido && onOpenPedido(n)}
        >
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:G+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎉</div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:800, fontSize:13, color:"#1a1a2e", marginBottom:2 }}>{n.titulo}</p>
              <p style={{ fontSize:12, color:"#555", lineHeight:1.4, marginBottom:4 }}>{n.mensagem}</p>
              {n.created_at && <p style={{ fontSize:11, color:"#aaa" }}>{new Date(n.created_at).toLocaleString("pt-BR")}</p>}
              {n.pedido_id && (
                <p style={{ fontSize:11, fontWeight:800, color:B, textAlign:"right", margin:"6px 0 0" }}>
                  {n.titulo && n.titulo.startsWith("Nova mensagem") ? "Ver mensagem →" : "Ver conversa →"}
                </p>
              )}
            </div>
            {!n.lida && <span style={{ width:8, height:8, borderRadius:"50%", background:"#FF4444", flexShrink:0, marginTop:4 }} />}
          </div>
        </Card>
      ) : (
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
    <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,.08)", border:"1px solid transparent", padding:"14px 16px", opacity: isOnline ? 1 : .7 }}>
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

/* Card de candidato enriquecido (foto, categorias, reputação real, bio, valor
   proposto, mensagem de interesse e ação de aceitar) — compartilhado entre
   PropostasScreen ("Ver Propostas") e RadarSearchScreen (Fase 1, candidatos
   em tempo real), pra ambas as telas mostrarem exatamente a mesma coisa em
   vez de duas versões divergentes do mesmo card. `perfil.isEmpresa` só liga
   o selo informativo "Empresa Parceira" — sem tratamento de prioridade,
   candidatos de empresa e profissional autônomo aparecem na mesma ordem
   (data de candidatura) e com o mesmo destaque visual. */
function CandidatoCard({ proposta: p, perfil, reputacao, onAceitar, onVerPerfil }) {
  const cats = resolveCats(perfil?.categoria_servico);
  const isEmpresa = !!perfil?.isEmpresa;
  const email = p.profissional_email || p.profissional_id;
  return (
    <div style={{
      background:"white", borderRadius:16, padding:16, marginBottom:12,
      boxShadow: "0 2px 8px rgba(0,0,0,.08)",
      border: "1px solid transparent",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",background:"#EEF0F5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {perfil?.foto_perfil_url
            ? <img src={perfil.foto_perfil_url} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="" />
            : <User size={22} color="#B0B4C0" />}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <div style={{fontWeight:700,fontSize:15}}>{p.profissional_nome || perfil?.name || "Profissional"}</div>
          </div>
          {isEmpresa && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3, background:"#E8F4FF", border:"1px solid #B8DBFF", borderRadius:99, padding:"1px 7px" }}>
              <ShieldCheck size={10} color={B} />
              <span style={{ fontSize:9.5, fontWeight:800, color:B }}>Empresa Parceira</span>
            </span>
          )}
          {cats.length > 0 && <div style={{fontSize:11,color:"#888",marginTop: isEmpresa ? 3 : 0}}>{cats.map(c=>`${c.emoji} ${c.label}`).join(" · ")}</div>}
          {reputacao && <div style={{marginTop:3}}><ReputacaoBadge {...reputacao} /></div>}
        </div>
      </div>
      {perfil?.bio && (
        <div style={{color:"#555",fontSize:12.5,lineHeight:1.5,marginBottom:10,background:"#F8F9FB",borderRadius:10,padding:"8px 10px"}}>{perfil.bio}</div>
      )}
      <div style={{color: p.valor != null ? "#007BFF" : "#9CA3AF",fontWeight:800,fontSize:18,margin:"6px 0"}}>{p.valor != null ? `R$ ${p.valor}` : "A combinar"}</div>
      <div style={{color:"#666",fontSize:13,marginBottom:12}}>{p.mensagem||""}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
        <button onClick={()=>onVerPerfil&&onVerPerfil({ email, isEmpresa })} style={{padding:"12px 0",borderRadius:10,border:`1.5px solid ${B}`,background:"white",color:B,fontWeight:800,fontSize:13,cursor:"pointer"}}>
          VER PERFIL
        </button>
        <button onClick={()=>onAceitar&&onAceitar(p)} style={{padding:"12px 0",background:"#22c55e",color:"white",border:"none",borderRadius:10,fontWeight:800,fontSize:12.5,cursor:"pointer"}}>✅ Aceitar Proposta</button>
      </div>
    </div>
  );
}

/* Perfil público de profissional individual — mesmo padrão de
   EmpresaProfileScreen (foto, sobre, categorias), mas com portfólio no lugar
   de CNPJ/WhatsApp direto: contato só é liberado depois que a proposta é
   aceita (chat abre automaticamente via handleAceitarProposta), então essa
   tela deliberadamente não expõe telefone/WhatsApp. Usada pelo "Ver Perfil"
   do CandidatoCard. */
function ProfissionalProfileScreen({ perfil, reputacao, onBack }) {
  const cats = resolveCats(perfil?.categoria_servico);
  const portfolio = perfil?.portfolio || [];
  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f5" }}>
      <div style={{ background:"linear-gradient(135deg,#1565C0,#0D47A1)", padding:"40px 20px 60px", textAlign:"center", position:"relative" }}>
        {onBack && (
          <button onClick={onBack} style={{ position:"absolute", top:16, left:16, background:"rgba(255,255,255,.2)", border:"none", borderRadius:20, padding:"6px 14px", color:"white", cursor:"pointer", fontSize:14 }}>← Voltar</button>
        )}
        <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", background:"rgba(255,255,255,.2)", margin:"0 auto 12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36 }}>
          {perfil?.foto_perfil_url
            ? <img src={perfil.foto_perfil_url} alt={perfil?.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <User size={36} color="white" />}
        </div>
        <h2 style={{ color:"white", margin:"0 0 8px", fontSize:22 }}>{perfil?.name || "Profissional"}</h2>
        {reputacao && <div style={{ display:"flex", justifyContent:"center" }}><ReputacaoBadge {...reputacao} /></div>}
      </div>
      <div style={{ padding:"16px", marginTop:-20 }}>
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>Sobre o profissional</h3>
          <p style={{ margin:0, fontSize:13, color:"#555", lineHeight:1.6 }}>{perfil?.bio || "Esse profissional ainda não preencheu uma bio."}</p>
        </div>
        <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>{cats.length > 1 ? "Categorias" : "Categoria"}</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {cats.length ? cats.map(c => (
              <span key={c.id} style={{ fontSize:13, color:"#1565C0", fontWeight:700, background:"#EBF4FF", borderRadius:99, padding:"5px 12px" }}>{c.emoji} {c.label}</span>
            )) : <span style={{ fontSize:14, color:"#555" }}>—</span>}
          </div>
        </div>
        {portfolio.length > 0 && (
          <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <h3 style={{ margin:"0 0 10px", fontSize:15, color:"#333" }}>Portfólio</h3>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {portfolio.map((url, i) => (
                <img key={i} src={url} style={{ width:88, height:88, borderRadius:12, objectFit:"cover" }} alt="" />
              ))}
            </div>
          </div>
        )}
        <div style={{ background:"#EEF4FF", borderRadius:16, padding:"16px" }}>
          <p style={{ margin:0, fontSize:13, color:"#1565C0", fontWeight:700 }}>Esse profissional demonstrou interesse no seu pedido.</p>
          <p style={{ margin:"6px 0 0", fontSize:12, color:"#555" }}>Pra fechar com ele, use o botão "Aceitar Proposta" no card.</p>
        </div>
      </div>
    </div>
  );
}

/* Ponte entre o "Ver Perfil" do CandidatoCard e a tela de perfil completa —
   busca sob demanda (só quando o cliente clica, não pra cada candidato da
   lista) e decide entre EmpresaProfileScreen (candidato é empresa parceira)
   ou ProfissionalProfileScreen (autônomo), reaproveitado por PropostasScreen
   e RadarSearchScreen. */
function CandidatoPerfilScreen({ email, isEmpresa, onBack }) {
  const [dados, setDados] = useState(null);
  const [reputacao, setReputacao] = useState(null);
  useEffect(() => {
    if (!email) return;
    fetchReputacao(email).then(setReputacao).catch(() => {});
    const tabela = isEmpresa ? "empresas" : "usuarios";
    supabase.from(tabela).select("*").eq("email", email).maybeSingle()
      .then(({ data }) => setDados(data))
      .catch(() => setDados({}));
  }, [email, isEmpresa]);

  if (!dados) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f5f5" }}>
        <p style={{ color:"#888", fontSize:13 }}>Carregando perfil...</p>
      </div>
    );
  }
  return isEmpresa
    ? <EmpresaProfileScreen empresa={dados} onBack={onBack} />
    : <ProfissionalProfileScreen perfil={dados} reputacao={reputacao} onBack={onBack} />;
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

function EmpresaHomeScreen({ userEmail, onLogout, showToast, onGoToPedidos, onGoToEditar, onAcceptOrder, onVerPropostas, onOpenChat, modo, setModo, isPro, onUpgrade }) {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [pedidosCount, setPedidosCount] = useState(0);
  const [pedidosPreview, setPedidosPreview] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  // Radar de "Novo Pedido!" — mesmo mecanismo do profissional autônomo
  // (ProfessionalHome): popup com timer ao surgir pedido compatível, com
  // dedupe por pedido_id pra não reexibir quem a empresa já é candidata.
  const [newOrder, setNewOrder] = useState(null);
  const pedidosVistosRef = useRef(new Set());
  const pedidosChannelRef = useRef(null);
  // supabase.channel(topic) reaproveita o canal existente se já houver um
  // com o mesmo nome (não cria um novo) — e removeChannel é assíncrono
  // (aguarda round-trip de rede pra desinscrever antes de tirar o canal do
  // registro interno). Por isso essa função precisa ser async/aguardada
  // antes de criar o próximo canal: sem isso, ligar/desligar rápido faz o
  // .channel(mesmoNome) seguinte reaproveitar o canal antigo (já inscrito),
  // e o .on(...) nele quebra com "cannot add callbacks after subscribe()" —
  // o canal antigo fica "zumbi" e o popup dispara sozinho depois.
  const pararEscutaPedidos = async () => {
    if (pedidosChannelRef.current) {
      const ch = pedidosChannelRef.current;
      pedidosChannelRef.current = null;
      await supabase.removeChannel(ch);
    }
  };
  useEffect(() => () => pararEscutaPedidos(), []);

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

  // 3 perfis de empresa (tipo_conta): "basica" só presta serviço (tela igual
  // sempre foi, sem nada de contratar); "contratante" só contrata, grátis,
  // sem toggle; "pro" faz os dois, alternando pelo toggle no topo da home
  // (modo/setModo vêm de App(), não de state local — precisa sobreviver a
  // navegações pra outras telas, tipo ver propostas ou abrir o chat, sem
  // voltar sozinho pro modo Prestadora).
  const tipoConta = empresa.tipo_conta || "basica";
  const emModoContratante = tipoConta === "contratante" || (tipoConta === "pro" && modo === "contratante");

  if (emModoContratante) {
    // Antes exigia empresa_plus ativo pra tipo_conta "pro" acessar o modo
    // Contratante (paywall) — planos pagos de empresa deixaram de existir,
    // então "pro" cai direto aqui, igual "contratante" sempre fez.
    return (
      <EmpresaContratanteScreen
        userEmail={userEmail}
        userName={empresa.nome}
        showToast={showToast}
        onVerPropostas={onVerPropostas}
        onOpenChat={onOpenChat}
        onEditarPerfil={onGoToEditar}
        onVoltarPrestadora={tipoConta === "pro" ? () => setModo?.("prestadora") : null}
      />
    );
  }

  const isOnline = empresa.status === true;
  const cats = resolveCats(empresa.categoria_servico);
  const catsLabel = cats.map(c => c.label).join(", ");

  const handleToggleOnline = async () => {
    const next = !empresa.status;

    // Cidade obrigatória antes de ficar online (mesmo padrão da categoria
    // obrigatória no profissional autônomo, ProfessionalHome) — sem isso, o
    // radar de "Novo Pedido!" não teria como casar por cidade e a empresa
    // ficaria "online" mas invisível pro filtro, sem entender por quê.
    if (next && !empresa.cidade) {
      showToast?.("⚠️ Defina a cidade da empresa antes de ficar online", "#DC2626");
      onGoToEditar?.();
      return;
    }

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
      return;
    }
    setEmpresa(e => ({ ...e, ...updates }));
    showToast?.(next ? "✅ Você está online!" : "Você ficou offline", next ? G : "#6B7280");

    if (next) {
      const categorias = empresa.categoria_servico || [];
      // Comparação de cidade case-insensitive — mesmo critério já usado pro
      // profissional autônomo (ProfessionalHome.filtered, "pro" demandas).
      const cidadeEmpresa = (empresa.cidade || "").trim().toLowerCase();
      // Pedidos que essa empresa já é candidata (linha em "propostas") não
      // devem reaparecer como "Novo Pedido!", mesmo padrão do profissional.
      supabase.from("propostas").select("pedido_id").eq("profissional_email", userEmail).then(({ data }) => {
        (data || []).forEach(p => pedidosVistosRef.current.add(p.pedido_id));
      }).catch(() => {});

      // Match por categoria_servico + cidade da empresa.
      supabase.from("pedidos").select("*").eq("status","aberto").eq("publico_alvo","geral")
        .in("categoria", categorias).order("created_at",{ascending:false}).limit(20).then(({data})=>{
          const proximo = (data || []).find(p => !pedidosVistosRef.current.has(p.id) && (p.cidade || "").trim().toLowerCase() === cidadeEmpresa);
          if (proximo) { pedidosVistosRef.current.add(proximo.id); setNewOrder(mapPedidoParaNewOrder(proximo)); }
        });

      await pararEscutaPedidos();
      pedidosChannelRef.current = supabase.channel("pedidos_novos_empresa_" + userEmail)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"pedidos",filter:"status=eq.aberto"},(payload)=>{
          const p = payload.new;
          if (!p || !p.fotos || p.fotos.length === 0 || p.publico_alvo === "pro") return;
          if (!categorias.includes(p.categoria)) return;
          if ((p.cidade || "").trim().toLowerCase() !== cidadeEmpresa) return;
          if (pedidosVistosRef.current.has(p.id)) return;
          pedidosVistosRef.current.add(p.id);
          setNewOrder(mapPedidoParaNewOrder(p));
        }).subscribe();
    } else {
      pararEscutaPedidos();
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

            {/* Toggle Prestadora / Contratante — só empresa "pro" (faz os dois)
                vê isso; mesmo padrão visual do "Modo: Cliente (toque p/
                alternar)" no header do cliente (AppHeader). modo/setModo vêm
                de App(), não resetam ao navegar pra outras telas (ver
                propostas, abrir chat) e voltar. */}
            {tipoConta === "pro" && (
              <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />
                <span style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:700, cursor:"pointer" }} onClick={() => setModo?.("contratante")}>
                  Modo: Prestadora (toque p/ alternar)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal fixed inset:0 — precisa ficar fora do <button> "Ficar Online"
            acima (mesmo motivo do ProfessionalHome: botão dentro de botão
            quebra o clique real do navegador em "Aceitar agora"/"Recusar"). */}
        {newOrder && (
          <NewOrderCard
            order={newOrder}
            onAccept={() => {
              stopNewOrderSound();
              setNewOrder(null);
              // CRÍTICO (achado 2026-08-30, caso JB Serviço Especializados):
              // aceitar um pedido aqui não checava plano nenhum — empresa sem
              // Multi Empresa/Empresa Plus ativo conseguia fechar serviço de
              // graça. Mesmo gate que ProfessionalHome já faz (isPro antes de
              // aceitar), só que redirecionando pra assinatura em vez do gate
              // de moeda (empresa não tem alternativa de pagar por moeda).
              if (!isPro) { onUpgrade?.(); return; }
              setEmpresa(e => ({ ...e, status: false }));
              pararEscutaPedidos();
              onAcceptOrder && onAcceptOrder({ id: newOrder.id, cliente_id: newOrder.cliente_id, value: newOrder.value, profissionalNome: empresa.nome });
            }}
            onReject={() => { stopNewOrderSound(); setNewOrder(null); }}
          />
        )}

        {/* ── UPGRADE BANNER (achado 2026-08-30: gate de pagamento do
            profissional individual nunca foi replicado aqui — empresa via o
            Mural completo, com valor e contato do cliente, sem nenhum plano
            ativo). Some sozinho pra quem já tem Multi Empresa/Empresa Plus
            ativo (isPro). ── */}
        {!isPro && (
          <div onClick={onUpgrade} style={{ margin:"0 0 18px", borderRadius:16, padding:"13px 16px", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,58,237,.35)" }}>
            <Crown size={20} color="#FDE68A" style={{ flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:900, color:"white", margin:0 }}>👑 Assine um plano Multi Empresa</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.7)", margin:0 }}>Libere o contato dos clientes e aceite pedidos direto pelo Mural.</p>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,.7)" />
          </div>
        )}

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
                    <span style={{ fontSize:15, fontWeight:900, color: p.valor != null ? B : "#9CA3AF", flexShrink:0 }}>{p.valor != null ? `R$ ${p.valor}` : "A combinar"}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onGoToPedidos} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"11px 16px", borderRadius:12, border:"none", background:B, color:"white", fontWeight:800, fontSize:12, cursor:"pointer" }}>
            Ver todos os {pedidosCount} <ChevronRight size={14} />
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


// Restaurado 2026-08-18 — removido sem querer no commit 3a2193d ("Bloco 3:
// remove planos pagos de empresa"), que dizia manter o Modo Contratante
// funcionando mas apagou junto essa constante e a função MinhasDemandasScreen
// logo abaixo, que dependem dela. Sem isso, toda empresa "contratante" (e
// "pro" no modo Contratante) quebrava com ReferenceError ao abrir a tela —
// achado investigando o pedido de retomar a feature de Empresa.
const PRAZO_OPTIONS = [
  { id:"urgente",     label:"Urgente",      emoji:"🔴" },
  { id:"essa_semana", label:"Essa semana",  emoji:"🟡" },
  { id:"sem_pressa",  label:"Sem pressa",   emoji:"🟢" },
];

/* ───────────────────────── EMPRESA PLUS — MINHAS DEMANDAS ──────────────────── */
// Demandas postadas pela própria empresa + propostas recebidas nelas. Papel
// diferente do Mural de Serviços (EmpresaPedidosScreen), que mostra pedidos de
// CLIENTES na categoria da empresa — aqui a empresa é quem está contratando.
// Restaurada verbatim do commit anterior à remoção (3a2193d^) — as props
// onBack/onNovaDemanda/onEditarPerfil já eram opcionais aqui, batem exatamente
// com o que EmpresaContratanteScreen (logo abaixo) já passa hoje.
function MinhasDemandasScreen({ userEmail, userName, onBack, onVerPropostas, onOpenChat, onNovaDemanda, onEditarPerfil }) {
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

  const statusLabel = (s) => s === "aberto" ? "Aguardando propostas" : s === "em_andamento" ? "Em andamento" : s === "confirmado" ? "🟢 Serviço agendado" : s === "concluido" ? "Concluído" : s;

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", paddingBottom:40 }}>
      <div style={{ background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, padding:"14px 18px 16px", borderRadius:"0 0 28px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <MapPin size={13} color="rgba(255,255,255,.7)" />
            <div>
              <p style={{ fontSize:9, color:"rgba(255,255,255,.5)", fontWeight:700, margin:0 }}>Sua Localização</p>
              <p style={{ fontSize:12, color:"white", fontWeight:800, margin:0 }}>{localStorage.getItem("multiLocation") || "Localização"}</p>
            </div>
          </div>
          {onEditarPerfil && (
            <button onClick={onEditarPerfil} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Pencil size={14} color="white" />
            </button>
          )}
        </div>

        <div style={{ marginTop:10, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />
          <span
            style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:700, cursor: onBack ? "pointer" : "default" }}
            onClick={onBack}>
            Modo: Contratante{onBack ? " (toque p/ alternar)" : ""}
          </span>
        </div>
      </div>

      {/* Toggle Prestadora/Contratante — só existe pra empresa "pro", que tem
          os dois modos; "contratante" puro (grátis) não tem pra onde alternar
          (onBack vem null nesse caso, ver EmpresaContratanteScreen). */}
      {onBack && (
        <div style={{ margin:"14px 16px 0", display:"flex", background:"#EEF0F4", borderRadius:14, padding:4, gap:4 }}>
          <button onClick={onBack} style={{ flex:1, padding:"10px 0", borderRadius:11, border:"none", cursor:"pointer", background:"transparent", color:"#6B7280", fontWeight:800, fontSize:13 }}>
            Prestadora
          </button>
          <button disabled style={{ flex:1, padding:"10px 0", borderRadius:11, border:"none", cursor:"default", background:O, color:"white", fontWeight:900, fontSize:13, boxShadow:`0 3px 10px ${O}55` }}>
            Contratante
          </button>
        </div>
      )}

      <div style={{ padding:"22px 20px 0" }}>
        <p style={{ fontSize:13, color:"#888", fontWeight:600, margin:"0 0 3px" }}>Olá, {userName || "Empresa"}</p>
        <h2 style={{ fontSize:21, fontWeight:900, color:"#1a1a2e", lineHeight:1.3, margin:0 }}>Quem você precisa contratar hoje?</h2>
      </div>

      {/* Hero — mesmo padrão visual do banner "Multi · Serviços Premium" do
          ClientHome, com paleta escura/corporativa pro contexto de mão de obra. */}
      <div style={{ margin:"18px 20px 0", borderRadius:24, overflow:"hidden", position:"relative", background:"#242A31", boxShadow:"0 12px 32px rgba(0,0,0,.22)" }}>
        <User size={110} color="rgba(255,255,255,.05)" strokeWidth={1.4} style={{ position:"absolute", right:-14, bottom:-18 }} />
        <div style={{ position:"relative", zIndex:1, padding:"22px 22px 24px" }}>
          <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:2, margin:"0 0 8px" }}>Multi · Mão de Obra</p>
          <h3 style={{ fontSize:18, fontWeight:900, color:"white", lineHeight:1.4, margin:"0 0 18px", maxWidth:"72%" }}>Publique a vaga, escolha o profissional.</h3>
          {onNovaDemanda && (
            <button onClick={onNovaDemanda} style={{ padding:"11px 20px", borderRadius:99, background:O, border:"none", cursor:"pointer", color:"white", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", gap:7, boxShadow:`0 5px 16px ${O}55` }}>
              <Plus size={15} /> Nova demanda
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:"24px 16px 0", display:"flex", flexDirection:"column", gap:10 }}>
        <p style={{ fontSize:12, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.1, margin:"0 0 2px" }}>Demandas ativas</p>
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

          // Demanda em aberto — card compacto de uma linha (função · candidatos
          // · tempo publicado), clicável direto pra tela de propostas.
          if (d.status === "aberto") {
            return (
              <div key={d.id} onClick={() => onVerPropostas(d)} style={{ display:"flex", alignItems:"center", gap:12, background:"white", borderRadius:16, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer" }}>
                <div style={{ width:38, height:38, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:800, color:"#1a1a2e", margin:"0 0 2px" }}>{cat?.label || d.categoria}</p>
                  <p style={{ fontSize:12, color: nCandidatos > 0 ? G : "#9CA3AF", fontWeight:700, margin:0 }}>
                    {nCandidatos} candidato{nCandidatos === 1 ? "" : "s"} · publicada {formatTimeAgo(d.created_at)}
                  </p>
                </div>
                <span style={{ fontSize:13, fontWeight:900, color: d.valor != null ? B : "#9CA3AF", flexShrink:0 }}>{d.valor != null ? `R$ ${d.valor}` : "A combinar"}</span>
                <ChevronRight size={15} color="#aaa" style={{ flexShrink:0 }} />
              </div>
            );
          }

          return (
            <div key={d.id} style={{ background:"white", borderRadius:18, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:800, color:"#1a1a2e", margin:0 }}>{cat?.label || d.categoria}</p>
                  <p style={{ fontSize:11, color:"#888", margin:0 }}>{statusLabel(d.status)}</p>
                </div>
                <span style={{ fontSize:14, fontWeight:900, color: d.valor != null ? B : "#9CA3AF" }}>{d.valor != null ? `R$ ${d.valor}` : "A combinar"}</span>
              </div>
              <p style={{ fontSize:12.5, color:"#555", margin:"0 0 8px", lineHeight:1.5 }}>{d.descricao}</p>
              {prazo && <p style={{ fontSize:11, color:"#888", fontWeight:700, margin:"0 0 8px" }}>{prazo.emoji} {prazo.label}</p>}

              {d.profissional_nome && (
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

// Restaurado 2026-08-18 — mesma remoção acidental do commit 3a2193d que
// levou MinhasDemandasScreen/PRAZO_OPTIONS junto (ver comentário acima):
// NovaDemandaFuncionarioScreen, e as duas constantes de opção que ela usa,
// também foram apagadas sem que nada mais no código parasse de referenciá-
// las — o botão "Nova demanda" dentro do modo Contratante quebrava com
// ReferenceError ao ser clicado.
const URGENCIA_OPTIONS = [
  { id:"normal",         label:"Normal",        emoji:"🟢" },
  { id:"urgente",        label:"Urgente",       emoji:"🟡" },
  { id:"muito_urgente",  label:"Muito Urgente", emoji:"🔴" },
];
const QUANDO_PRECISA_OPTIONS = ["Hoje","Amanhã","Esta semana","Flexível"];

// Formulário completo de "Preciso de Funcionário" — restaurado verbatim do
// commit anterior à remoção (3a2193d^); props batem exatamente com a
// chamada em EmpresaContratanteScreen logo abaixo.
function NovaDemandaFuncionarioScreen({ userEmail, userName, onBack, showToast }) {
  const [form, setForm] = useState({ cat:"", desc:"", value:"", cep:"", material:false, urgencia:"normal", quandoPrecisa:"" });
  const [photos,     setPhotos]     = useState([]); // { id, file, previewUrl }
  const [cepInfo,    setCepInfo]    = useState(null); // { bairro, cidade, uf }
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError,   setCepError]   = useState("");
  const [saving,     setSaving]     = useState(false);

  const handleAddPhotos = e => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    e.target.value = "";
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining).map(file => ({ id:`${Date.now()}-${Math.random()}`, file, previewUrl:URL.createObjectURL(file) }));
    setPhotos(p => [...p, ...toAdd]);
  };
  const removePhoto = id => {
    setPhotos(p => {
      const found = p.find(x => x.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return p.filter(x => x.id !== id);
    });
  };

  const handleCepChange = async (raw) => {
    const cep = raw.replace(/\D/g,"").slice(0,8);
    const formatted = cep.length > 5 ? cep.slice(0,5) + "-" + cep.slice(5) : cep;
    setForm(f => ({ ...f, cep: formatted }));
    setCepError("");
    setCepInfo(null);
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if (d.erro || !d.localidade) { setCepError("CEP não encontrado"); }
        else { setCepInfo({ bairro: d.bairro, cidade: d.localidade, uf: d.uf }); }
      } catch { setCepError("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  const F = { background:"white", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"13px 14px", fontSize:13, color:"#1a1a2e", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const canPublish = form.cat && form.desc && form.value && cepInfo && cepInfo.cidade;

  const handlePublicar = async () => {
    if (!canPublish || saving) return;
    setSaving(true);
    try {
      const fotos = (await Promise.all(photos.map(async (p) => {
        const ext = p.file.name.includes(".") ? p.file.name.split(".").pop() : "jpg";
        const path = `demanda_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, p.file, { contentType: p.file.type, upsert: true, cacheControl: "31536000" });
        if (upErr) return null;
        return supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      }))).filter(Boolean);

      const { error } = await supabase.from("pedidos").insert({
        cliente_id: userEmail,
        cliente_nome: userName,
        categoria: form.cat,
        descricao: form.desc.trim(),
        valor: Number(form.value),
        cep: form.cep,
        cidade: cepInfo.cidade || null,
        fotos,
        status: "aberto",
        publico_alvo: "pro",
        urgencia: form.urgencia,
        quando_precisa: form.quandoPrecisa || null,
        material_fornecido: form.material,
      });
      if (error) throw error;
      fetch(`${NOTIFY_API}/notify-pedido`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoria: form.cat, descricao: form.desc.trim(), publicoAlvo: "pro", cidade: cepInfo.cidade }),
      }).catch(() => {});
      showToast?.("✅ Demanda publicada! Profissionais Multi Pro da categoria e cidade já podem ver.", G);
      onBack?.();
    } catch (e) {
      showToast?.("❌ Erro ao publicar demanda: " + (e.message || ""), "#DC2626");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:"18px 16px 40px" }}>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:0 }}>Preciso de Funcionário</h2>

      {/* Função */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>Função</label>
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
        <label style={{fontSize:12,color:"#666",display:"block"}}>Descrição do serviço</label>
        <textarea rows={4} placeholder="Seja detalhado sobre o que precisa…" style={{ ...F, resize:"none", lineHeight:1.6 }} value={form.desc} onChange={e => setForm({ ...form, desc:e.target.value })} />
      </div>

      {/* Fotos do local */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>Fotos do local <span style={{ textTransform:"none", fontWeight:400, letterSpacing:0, color:"#ccc" }}>(opcional, até 5)</span></label>
        <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:4, padding:"12px", borderRadius:12, border:"2px dashed #ddd", cursor: photos.length >= 5 ? "default" : "pointer", background:"#fafafa", justifyContent:"center" }}>
          <input type="file" accept="image/*" multiple disabled={photos.length >= 5} style={{ display:"none" }} onChange={handleAddPhotos} />
          📷 <span style={{ fontSize:13, color:"#888" }}>{photos.length > 0 ? `${photos.length} foto(s) adicionada(s)` : "Tirar foto ou escolher da galeria"}</span>
        </label>
        {photos.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
            {photos.map(p => (
              <div key={p.id} style={{ position:"relative", width:72, height:72, borderRadius:10, overflow:"hidden" }}>
                <img src={p.previewUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <button onClick={() => removePhoto(p.id)} style={{ position:"absolute", top:2, right:2, background:"rgba(0,0,0,.6)", color:"white", border:"none", borderRadius:"50%", width:18, height:18, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CEP */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>CEP do local do serviço</label>
        <div style={{ position:"relative" }}>
          <input type="tel" placeholder="00000-000" maxLength={9} value={form.cep} onChange={e => handleCepChange(e.target.value)} style={{ ...F, paddingRight: cepLoading ? 40 : 14 }} />
          {cepLoading && (
            <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, border:"2px solid #E5E7EB", borderTopColor:B, borderRadius:"50%", animation:"spin .7s linear infinite" }} />
          )}
        </div>
        {cepInfo && (
          <div style={{ marginTop:8, padding:"10px 14px", borderRadius:12, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"center", gap:10 }}>
            <MapPin size={14} color={G} style={{ flexShrink:0 }} />
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:"0 0 2px" }}>
                {cepInfo.bairro ? `${cepInfo.bairro} — ` : ""}{cepInfo.cidade}/{cepInfo.uf}
              </p>
              <p style={{ fontSize:11, color:"#16a34a", margin:0 }}>🔒 Endereço completo só liberado após acordo com profissional</p>
            </div>
          </div>
        )}
        {cepError && <p style={{ fontSize:12, color:"#EF4444", fontWeight:700, margin:"6px 0 0" }}>{cepError}</p>}
      </div>

      {/* Urgência */}
      <div>
        <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>URGÊNCIA</label>
        <div style={{ display:"flex", gap:8 }}>
          {URGENCIA_OPTIONS.map(u => (
            <button key={u.id} onClick={() => setForm({ ...form, urgencia:u.id })} style={{ flex:1, padding:"10px 0", borderRadius:10, border: form.urgencia===u.id ? "2px solid #FF5722" : "1.5px solid #E5E7EB", background: form.urgencia===u.id ? "#FFF3F0" : "white", color: form.urgencia===u.id ? "#FF5722" : "#555", fontWeight: form.urgencia===u.id ? 800 : 500, fontSize:12, cursor:"pointer" }}>
              {u.emoji} {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quando precisa */}
      <div>
        <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>QUANDO VOCÊ PRECISA?</label>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          {QUANDO_PRECISA_OPTIONS.map(op => (
            <button key={op} onClick={() => setForm({ ...form, quandoPrecisa:op })} style={{ flex:1, padding:"9px 4px", borderRadius:10, border: form.quandoPrecisa===op ? "2px solid #007BFF" : "1.5px solid #E5E7EB", background: form.quandoPrecisa===op ? "#EEF4FF" : "white", color: form.quandoPrecisa===op ? "#007BFF" : "#555", fontWeight: form.quandoPrecisa===op ? 800 : 500, fontSize:11, cursor:"pointer" }}>
              {op}
            </button>
          ))}
        </div>
        <input type="text" style={{ ...F }} value={QUANDO_PRECISA_OPTIONS.includes(form.quandoPrecisa) ? "" : form.quandoPrecisa} onChange={e => setForm({ ...form, quandoPrecisa:e.target.value })} placeholder="Ex: 20/05/2026 às 14h" />
      </div>

      {/* Material */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>Material necessário</label>
        <div style={{ background:"white", border:"1.5px solid #EBEBEB", borderRadius:14, overflow:"hidden" }}>
          {[
            { val: false, icon:"🧰", label:"Não precisa de material", sub:"O profissional só precisa trazer ferramentas" },
            { val: true,  icon:"🪣", label:"Empresa fornece material", sub:"Ex: tinta, cano, cimento, peças de reposição" },
          ].map((opt, i) => (
            <div key={i} onClick={() => setForm(f => ({ ...f, material: opt.val }))}
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
        <label style={{fontSize:12,color:"#666",display:"block"}}>Valor que a empresa paga</label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"#999", fontSize:13 }}>R$</span>
          <input type="number" placeholder="0,00" style={{ ...F, paddingLeft:38 }} value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} />
        </div>
      </div>

      <button onClick={handlePublicar} disabled={!canPublish || saving}
        style={{ padding:"15px 0", borderRadius:14, border:"none", cursor: (canPublish && !saving) ? "pointer" : "not-allowed", background: (canPublish && !saving) ? `linear-gradient(135deg,${O},#E64A19)` : "#9CA3AF", color: (canPublish && !saving) ? "white" : "#4B5563", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: (canPublish && !saving) ? "0 5px 18px rgba(255,87,34,.30)" : "none", transition:"all .2s" }}>
        <Send size={15} /> {saving ? "Publicando..." : "Publicar demanda"}
      </button>
    </div>
  );
}

/* ───────────────────────── EMPRESA CONTRATANTE — TELA COMPLETA ─────────────── */
// Home de quem só contrata: tipo_conta "contratante" (grátis, sem toggle) ou
// "pro" no modo "Contratante" (toggle no topo do EmpresaHomeScreen). Combina
// o formulário de nova demanda (alternado localmente, sem navegação de tela)
// com a lista de demandas já publicadas (reaproveita MinhasDemandasScreen).
function EmpresaContratanteScreen({ userEmail, userName, showToast, onVerPropostas, onOpenChat, onEditarPerfil, onVoltarPrestadora }) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <NovaDemandaFuncionarioScreen userEmail={userEmail} userName={userName} showToast={showToast} onBack={() => setShowForm(false)} />;
  }

  return (
    <MinhasDemandasScreen
      userEmail={userEmail}
      userName={userName}
      onBack={onVoltarPrestadora}
      onNovaDemanda={() => setShowForm(true)}
      onEditarPerfil={onEditarPerfil}
      onVerPropostas={onVerPropostas}
      onOpenChat={onOpenChat}
    />
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
  const [cidade, setCidade] = useState("");
  const [errorCidade, setErrorCidade] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Teto fixo de categorias pra toda conta empresa — não existe mais plano
  // pago de empresa que libere ilimitado (Empresa Plus foi descontinuado).
  const MAX_CATEGORIAS_EMPRESA = 3;
  const limiteCategoria = MAX_CATEGORIAS_EMPRESA;
  const handleLimiteCategoria = () => {
    showToast?.(`⚠️ Conta empresa permite até ${MAX_CATEGORIAS_EMPRESA} categorias.`, O);
  };

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("empresas").select("*").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        setEmpresa(data || null);
        setPhone(maskPhone(data?.telefone_contato || ""));
        setDescricao(data?.descricao || "");
        setCategoria(data?.categoria_servico || []);
        setCidade(data?.cidade || "");
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
    if (!cidade.trim()) { setErrorCidade("Informe a cidade"); return; }
    setErrorCategoria("");
    setErrorCidade("");
    setSaving(true);
    try {
      let logoUrl = empresa.logo_url;
      if (logoFile) {
        const ext = logoFile.type.includes("png") ? "png" : "jpg";
        const path = `empresas_logo_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, logoFile, { contentType: logoFile.type, upsert: true, cacheControl: "31536000" });
        if (upErr) throw upErr;
        logoUrl = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      }
      const updates = { telefone_contato: phone.replace(/\D/g, ""), descricao: descricao.trim() || null, logo_url: logoUrl, categoria_servico: categoria, cidade: cidade.trim() };
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
          <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0" }}>Conta empresa permite até {MAX_CATEGORIAS_EMPRESA} categorias.</p>
        </div>

        {/* cidade — usada pro radar de "Novo Pedido!" só mostrar pedidos da
            mesma cidade da empresa (mesmo padrão categoria+cidade do
            profissional autônomo). Sem isso preenchido, "Ficar Online" fica
            bloqueado (ver EmpresaHomeScreen). */}
        <div style={{ background:"white", borderRadius:16, padding:16, marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)", border: errorCidade ? "1.5px solid #FCA5A5" : undefined }}>
          <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#333" }}>Cidade</h3>
          <input type="text" placeholder="Ex: Guarulhos" value={cidade}
            onChange={e => { setCidade(e.target.value); if (errorCidade) setErrorCidade(""); }}
            style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:`1.5px solid ${errorCidade ? "#FCA5A5" : "#E5E7EB"}`, fontSize:13, outline:"none", boxSizing:"border-box" }} />
          {errorCidade && <p style={{ fontSize:11, color:"#E53935", margin:"8px 0 0", fontWeight:700 }}>{errorCidade}</p>}
        </div>

        {/* plano/assinatura — planos pagos de empresa deixaram de existir (não
            dá mais pra escolher/trocar por aqui), mas quem já tinha Multi
            Empresa/Empresa Plus ativo antes continua vendo o status,
            somente leitura (assinaturas legadas não são canceladas por essa
            mudança de código, só deixam de aceitar gente nova). */}
        {isPro && (
          <div style={{ background:"white", borderRadius:16, padding:"16px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
            <h3 style={{ margin:"0 0 4px", fontSize:15, color:"#333" }}>Plano</h3>
            <p style={{ margin:0, fontSize:12, color:G }}>
              {`${plano === "empresa_plus" ? "Multi Empresa Pro" : "Multi Empresa"} — ${planoStatus === "trial" ? "em trial" : "ativo"}${planoExpiraEm ? " até " + new Date(planoExpiraEm).toLocaleDateString("pt-BR") : ""}`}
            </p>
          </div>
        )}

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
function EmpresaPedidosScreen({ userEmail, isPro, onUpgrade }) {
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
          // .neq("origem","demo") — achado 2026-09-02: essa query não
          // excluía pedido fictício (a exclusão existe no Mural do
          // profissional individual, ProfessionalHome, mas nunca foi
          // replicada aqui). Sem ela, um fictício "eletricista" (mesmo
          // desativado hoje, demo_ativo=false, ver multi_dados_ficticios_plano
          // na memória) apareceria misturado com demanda real se algum dia
          // reativado, sem etiqueta nenhuma pra empresa distinguir.
          const { data: peds } = await supabase.from("pedidos").select("*")
            .in("categoria", emp.categoria_servico)
            .eq("status", "aberto")
            .neq("origem", "demo")
            .order("created_at", { ascending:false });
          const mapped = (peds || []).map(p => ({
            id: p.id,
            cat: p.categoria || "servico",
            title: (p.descricao || p.categoria || "Serviço").slice(0, 40),
            desc: p.descricao || "",
            value: p.valor,
            tipoValor: p.tipo_valor,
            loc: p.cidade || "sua região",
            time: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "",
            client: p.cliente_nome || "Cliente",
            cliente_id: p.cliente_id,
            // Antes ficava hardcoded false — mesmo bug do
            // ProfessionalHome/mapPedidoParaCard (badge "🔥 Urgente" nunca
            // acendia pra pedido real nenhum). Corrigido pra ler de verdade.
            urgent: p.urgencia === "urgente" || p.urgencia === "muito_urgente",
            // telefone_cliente de demanda MULTI-SUP NUNCA é lido aqui —
            // decisão explícita 2026-09-02 de não expor telefone do cliente
            // pro lado profissional/empresa do app (intermediação manual
            // pelo Admin, ver "Interesses MULTI-SUP").
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
                <span style={{ fontSize:22, fontWeight:900, color: s.value != null ? B : "#9CA3AF" }}>{s.value != null ? `R$ ${s.value}` : "A combinar"}</span>
                {/* Nome/contato do cliente só aparece com plano ativo (achado
                    2026-08-30, caso JB Serviço Especializados: essa tela
                    nunca recebeu isPro/onUpgrade — mostrava nome e link direto
                    de WhatsApp pra qualquer empresa, mesmo sem nenhum plano
                    ativo. Mesmo tratamento que o Mural do profissional
                    individual já faz — valor/categoria continuam visíveis
                    como vitrine, só o contato fica atrás do plano). */}
                <span style={{ fontSize:12, color:"#aaa", filter: isPro ? "none" : "blur(3px)" }}>👤 {isPro ? s.client : "Cliente"}</span>
              </div>
              {isPro ? (
                whatsapp && (
                  <a href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px 0", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:900, fontSize:13, textDecoration:"none" }}>
                    <MessageCircle size={15} /> Chamar no WhatsApp
                  </a>
                )
              ) : (
                <button onClick={onUpgrade} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7C3AED,#4F46E5)", color:"white", fontWeight:900, fontSize:13 }}>
                  <Lock size={13} /> Assine um plano para contatar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarSearchScreen({ service, onStatusChange, showToast, onAccepted, onAceitarProposta, onBack }) {
  const [phase, setPhase] = useState(0); // 0=searching, 1=found // v3
  const [raio, setRaio] = useState(2);
  const [expandMsg, setExpandMsg] = useState('');
  const [propostas, setPropostas] = useState([]); // candidatos reais (linhas de "propostas") — empresa e autônomo, sem distinção
  const [perfis, setPerfis] = useState({}); // email -> { foto_perfil_url, bio, categoria_servico, isEmpresa }
  const [reputacoes, setReputacoes] = useState({}); // email -> { mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }
  const [viewingCandidato, setViewingCandidato] = useState(null); // { email, isEmpresa }

  useEffect(() => {
    const t1 = setTimeout(() => { setRaio(5); setExpandMsg('Expandindo para 5km...'); }, 8000);
    const t2 = setTimeout(() => { setRaio(10); setExpandMsg('Expandindo para 10km...'); }, 16000);
    const t3 = setTimeout(() => setPhase(1), 24000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Candidatos reais — quem de fato demonstrou interesse no pedido, via
  // "Tenho Interesse" no mural ou "Aceitar agora" no popup (os dois caminhos
  // gravam em "propostas" desde a unificação de handleCandidatarPedidoDireto).
  // Substitui a lista antiga de "quem está online na categoria", que só
  // indicava quem *poderia* responder, não quem respondeu de fato. Atualiza
  // sozinho conforme novas propostas chegam, mesmo padrão realtime do sino
  // de Alertas (supabase.channel + postgres_changes).
  useEffect(() => {
    if (!service?.id) return;
    let cancelled = false;

    // Mesmo enriquecimento (foto/bio/categorias + fallback pra empresas
    // parceiras) já usado em PropostasScreen ("Ver Propostas") — reaproveitado
    // aqui pra essa tela mostrar o candidato completo sem precisar navegar
    // pra outra tela só pra ver reputação/foto real.
    const buscarPerfis = async (emails) => {
      const perfisNovos = {};
      if (emails.length) {
        const { data } = await supabase.from("usuarios").select("email,name,categoria_servico,foto_perfil_url,bio,role").in("email", emails);
        (data || []).forEach(u => { perfisNovos[u.email] = { ...u, isEmpresa: u.role === "empresa" }; });
        // Fallback pra empresas parceiras — cobre dois casos: (a) candidato
        // sem nenhuma linha em "usuarios" (empresa antiga, sem conta de
        // login própria), e (b) candidato COM linha em "usuarios" mas
        // role "empresa" (CadastroEmpresaScreen sempre cria essa linha só
        // pra login/vínculo — foto/bio reais ficam em "empresas", nunca em
        // "usuarios" nesse caso, então teria ficado sem foto se parasse
        // na primeira busca).
        const emailsEmpresa = emails.filter(e => !perfisNovos[e] || perfisNovos[e].isEmpresa);
        if (emailsEmpresa.length) {
          const { data: emps } = await supabase.from("empresas").select("email,nome,categoria_servico,logo_url,descricao").in("email", emailsEmpresa);
          (emps || []).forEach(e => { perfisNovos[e.email] = { name: e.nome, categoria_servico: e.categoria_servico, foto_perfil_url: e.logo_url, bio: e.descricao, isEmpresa: true }; });
        }
      }
      return perfisNovos;
    };

    // Ordenado por data de candidatura, sem tratamento especial pra empresa
    // parceira — mesmo critério de PropostasScreen ("Ver Propostas").
    supabase.from("propostas").select("*").eq("pedido_id", service.id).eq("status", "pendente")
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const lista = data || [];
        const emails = [...new Set(lista.map(p => p.profissional_email || p.profissional_id).filter(Boolean))];
        const perfisNovos = await buscarPerfis(emails);
        if (cancelled) return;
        setPerfis(perfisNovos);
        setPropostas(lista);
        Promise.all(emails.map(email => fetchReputacao(email).then(r => [email, r])))
          .then(pares => { if (!cancelled) setReputacoes(Object.fromEntries(pares)); })
          .catch(() => {});
      })
      .catch(() => { if (!cancelled) setPropostas([]); });

    const ch = supabase.channel("propostas_radar_" + service.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "propostas", filter: `pedido_id=eq.${service.id}` },
        async payload => {
          const novo = payload.new;
          const email = novo.profissional_email || novo.profissional_id;
          const perfisNovos = email ? await buscarPerfis([email]) : {};
          if (cancelled) return;
          if (Object.keys(perfisNovos).length) setPerfis(prev => ({ ...prev, ...perfisNovos }));
          // Prepend — a proposta que acabou de chegar é a mais recente,
          // mesmo critério de ordenação por data usado na busca inicial.
          setPropostas(prev => prev.some(p => p.id === novo.id) ? prev : [novo, ...prev]);
          if (email) fetchReputacao(email).then(r => { if (!cancelled) setReputacoes(prev => ({ ...prev, [email]: r })); }).catch(() => {});
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [service?.id]);

  // Essa tela agora fica fixa até o cliente sair manualmente, então precisa
  // reagir sozinha quando um profissional aceita o pedido enquanto o cliente
  // ainda está olhando — mesmo padrão realtime já usado pelo sino de Alertas
  // (supabase.channel(...).on("postgres_changes", ...)), só que escutando o
  // próprio pedido em vez da tabela de notificações.
  useEffect(() => {
    if (!service?.id) return;
    const ch = supabase.channel("pedido_radar_" + service.id)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos", filter: `id=eq.${service.id}` },
        payload => {
          if (payload.new?.status === "em_andamento") {
            showToast && showToast("🎉 Um profissional aceitou seu pedido!", G);
            onAccepted && onAccepted(payload.new);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [service?.id]);

  if (viewingCandidato) {
    return <CandidatoPerfilScreen email={viewingCandidato.email} isEmpresa={viewingCandidato.isEmpresa} onBack={() => setViewingCandidato(null)} />;
  }

  const cat = CATS.find(c => c.id === service.cat);

  if (phase === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0f1117', padding:24, position:'relative' }}>
        <button onClick={onBack} style={{ position:'absolute', top:20, left:20, display:'flex', alignItems:'center', gap:6, color:'#ffffff99', fontSize:13, fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <p style={{ color:'#ffffff99', fontSize:12, marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>{service.title}</p>
        <p style={{ color:'white', fontSize:16, fontWeight:700, marginBottom:32 }}>{service.value != null ? `R$ ${service.value}` : "A combinar"}</p>
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
        <p style={{ color:'#ffffff60', fontSize:12, marginBottom:24 }}>Localizando profissionais perto de você</p>
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
          <BackBtn onClick={onBack} />
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12, marginBottom:4 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{cat?.emoji}</div>
            <div>
              <p style={{ fontSize:12, color:"#aaa", margin:0 }}>{service.title}</p>
              <p style={{ fontSize:14, fontWeight:900, color:"#1a1a2e", margin:0 }}>{service.value != null ? `R$ ${service.value}` : "A combinar"} · {service.loc || "sua região"}</p>
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
            <span style={{ fontSize:18 }}>📣</span>
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:"#166534", margin:0 }}>
                {propostas.length > 0 ? `${propostas.length} candidato${propostas.length > 1 ? "s" : ""} ${propostas.length > 1 ? "demonstraram" : "demonstrou"} interesse` : "Aguardando candidatos…"}
              </p>
              <p style={{ fontSize:11, color:"#4ade80", margin:0 }}>Essa lista atualiza sozinha assim que alguém demonstrar interesse</p>
            </div>
          </div>
        </div>

        {/* candidate cards — candidatos reais (propostas recebidas), atualiza em tempo
            real. Mesmo card enriquecido de PropostasScreen ("Ver Propostas"): foto,
            reputação real, taxa de conclusão, valor proposto, mensagem e ação de
            aceitar direto aqui — sem precisar navegar pra outra tela. */}
        <div style={{ padding:"18px 16px 0" }}>
          {propostas.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px 16px", color:"#aaa", background:"white", borderRadius:16, border:"1px solid #F0F0F0" }}>
              <p style={{ fontSize:13, fontWeight:700, margin:0, color:"#666" }}>Nenhum candidato ainda.</p>
              <p style={{ fontSize:12, margin:"6px 0 0" }}>Seu pedido já está publicado e visível no mural — assim que alguém demonstrar interesse, aparece aqui na hora.</p>
            </div>
          )}
          {propostas.map(p => (
            <CandidatoCard
              key={p.id}
              proposta={p}
              perfil={perfis[p.profissional_email || p.profissional_id]}
              reputacao={reputacoes[p.profissional_email || p.profissional_id]}
              onAceitar={onAceitarProposta}
              onVerPerfil={setViewingCandidato}
            />
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
          <p style={{ fontSize:13, fontWeight:900, color:B, margin:"4px 0 0" }}>{service.value != null ? `R$ ${service.value}` : "A combinar"}</p>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── CLIENT HOME (FOCUSED PREMIUM) ────────────────────── */

// Home mostra uma curadoria de 19 itens específicos (4 destacados em grade
// 2x2 + resto em scroll horizontal) — um representante popular de cada um
// dos 19 grupos visuais de CATS, escolhido por bom senso (ex.: "Pedreiro"
// representando Reformas e Construção). Desde a reformulação 2026-08-07,
// CATS voltou a ser a lista plana e específica (ver comentário acima de
// CATS) — HOME_CATS é só um atalho de destaque na Home, não a lista
// completa; "Ver todas as categorias" abre TodasCategoriasModal com as
// ~265 categorias de CATS, agrupadas por CAT_GRUPOS.
const HOME_CATS = [
  { id:"pedreiro",                    label:"Pedreiro",                        emoji:"🧱", star:"4.7", bg:"#FFF0EE", accent:"#E53935", grad:"linear-gradient(135deg,#E53935,#C62828)", desc:"Obras e reparos" },
  { id:"montador_moveis",             label:"Montador de Móveis",              emoji:"🪛", star:"4.6", bg:"#FBE9E7", accent:"#BF360C", grad:"linear-gradient(135deg,#BF360C,#E64A19)", desc:"Montagem e instalação" },
  { id:"instalacao_cameras",          label:"Instalação de Câmeras",           emoji:"⚡", star:"4.7", bg:"#FFFCE8", accent:"#F57F17", grad:"linear-gradient(135deg,#F57F17,#F9A825)", desc:"Câmeras e automação" },
  { id:"encanador",                   label:"Encanador",                       emoji:"🔧", star:"4.6", bg:"#E8F4FF", accent:"#0070F3", grad:"linear-gradient(135deg,#0059B3,#0070F3)", desc:"Água e encanamento" },
  { id:"instalacao_ar_condicionado",  label:"Instalação de Ar-Condicionado",   emoji:"❄️", star:"4.7", bg:"#E1F5FE", accent:"#0277BD", grad:"linear-gradient(135deg,#01579B,#0288D1)", desc:"Ar-condicionado" },
  { id:"maquina_lavar",               label:"Máquina de Lavar",                emoji:"💻", star:"4.6", bg:"#E8EAF6", accent:"#303F9F", grad:"linear-gradient(135deg,#283593,#303F9F)", desc:"Conserto e manutenção" },
  { id:"faxina",                      label:"Faxina",                          emoji:"🧹", star:"4.7", bg:"#E0F2F1", accent:"#00796B", grad:"linear-gradient(135deg,#00695C,#00796B)", desc:"Faxina e higienização" },
  { id:"jardineiro",                  label:"Jardineiro",                      emoji:"🌿", star:"4.8", bg:"#E8F8EE", accent:"#2E7D32", grad:"linear-gradient(135deg,#1B5E20,#2E7D32)", desc:"Jardim e piscina" },
  { id:"baba",                        label:"Babá",                            emoji:"🏠", star:"4.7", bg:"#FFF0F5", accent:"#C2185B", grad:"linear-gradient(135deg,#AD1457,#C2185B)", desc:"Casa e família" },
  { id:"banho_tosa",                  label:"Banho e Tosa",                    emoji:"🐕", star:"4.8", bg:"#FFF3E0", accent:"#E65100", grad:"linear-gradient(135deg,#E65100,#F57C00)", desc:"Banho, tosa e cuidados" },
  { id:"mecanico",                    label:"Mecânico",                        emoji:"🚗", star:"4.6", bg:"#ECEFF1", accent:"#37474F", grad:"linear-gradient(135deg,#263238,#37474F)", desc:"Mecânica e estética" },
  { id:"frete",                       label:"Frete",                           emoji:"📦", star:"4.6", bg:"#FFF3E0", accent:"#F57C00", grad:"linear-gradient(135deg,#EF6C00,#F57C00)", desc:"Frete e mudança" },
  { id:"decoracao",                   label:"Decoração",                       emoji:"🎉", star:"4.7", bg:"#F3E5F5", accent:"#8E24AA", grad:"linear-gradient(135deg,#6A1B9A,#8E24AA)", desc:"Decoração e buffet" },
  { id:"vigilante",                   label:"Vigilante",                       emoji:"🛡️", star:"4.6", bg:"#E8EAF6", accent:"#283593", grad:"linear-gradient(135deg,#1A237E,#283593)", desc:"Vigilância e portaria" },
  { id:"tecnico_seguranca_trabalho",  label:"Téc. Segurança do Trabalho",      emoji:"🦺", star:"4.7", bg:"#FFECB3", accent:"#F57F17", grad:"linear-gradient(135deg,#EF6C00,#F57F17)", desc:"Laudos e treinamentos" },
  { id:"eng_civil",                   label:"Engenheiro Civil",                emoji:"📐", star:"4.7", bg:"#E3F2FD", accent:"#1565C0", grad:"linear-gradient(135deg,#0D47A1,#1565C0)", desc:"Projetos e laudos" },
  { id:"chaveiro",                    label:"Chaveiro 24h",                    emoji:"🔑", star:"4.6", bg:"#FFF8E1", accent:"#F9A825", grad:"linear-gradient(135deg,#F9A825,#FFB300)", desc:"Urgência 24 horas" },
  { id:"dedetizacao",                 label:"Dedetização",                     emoji:"🐜", star:"4.5", bg:"#EFEBE9", accent:"#5D4037", grad:"linear-gradient(135deg,#4E342E,#5D4037)", desc:"Dedetização" },
  { id:"instalacao_wifi",             label:"Instalação de Wi-Fi",             emoji:"🌐", star:"4.6", bg:"#E8EAF6", accent:"#3949AB", grad:"linear-gradient(135deg,#303F9F,#3949AB)", desc:"Redes e infraestrutura" },
];

function ClientHome({ onPost, onViewService, onSwitchPro, myServices, userName, userEmail }) {
  const greeting     = userName ? `Olá, ${userName}! 👋` : "Olá! Seja bem-vindo 👋";
  const subgreeting  = userName ? "O que vamos resolver hoje?" : "Vamos resolver algo hoje?";
  const [showAllCats, setShowAllCats] = useState(false);

  // Banner "Vire Profissional" — só pra quem ainda não completou cadastro
  // profissional nenhuma vez (usuarios.role já vira "professional" desde a
  // primeira vez, mesmo se a sessão atual estiver no modo Cliente — ver
  // RegisterScreen "ambos" e VirarProfissionalScreen). Sem esse check, quem
  // já é profissional-e-cliente veria o convite pra virar profissional de
  // novo toda vez que abrisse no modo Cliente.
  // Default false (banner aparece otimista desde o primeiro render) — não
  // "true" como antes: a maioria das contas ainda não é profissional, então
  // esse default acerta na maioria dos casos e a altura da página não muda
  // depois do fetch resolver. Com "true" como default, o banner nascia
  // escondido e aparecia de repente alguns ms depois (assim que o fetch
  // confirmava "ainda não é profissional"), empurrando a altura do
  // documento bem no meio da transição inicial — achado ao vivo: por um
  // frame, isso bagunçava a posição da bottom nav (sticky), fazendo o botão
  // "Vire Profissional" desenhar por cima de "Meus Pedidos"/"Mensagens".
  const [jaEhProfissional, setJaEhProfissional] = useState(false);
  useEffect(() => {
    if (!userEmail) { setJaEhProfissional(false); return; }
    supabase.from("usuarios").select("role").eq("email", userEmail).maybeSingle()
      .then(({ data }) => setJaEhProfissional(data?.role === "professional"))
      .catch(() => setJaEhProfissional(false));
  }, [userEmail]);

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
          <h3 style={{ fontSize:21, fontWeight:900, color:"white", lineHeight:1.35, margin:"0 0 16px" }}>Seu serviço,<br/>num toque.</h3>
          <button onClick={() => onPost()} style={{
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

      {/* ── VIRE PROFISSIONAL — descoberta de "prestar serviço" pra quem só
          conhece o Multi como cliente; some pra quem já é profissional
          (ver jaEhProfissional acima). Mesmo cartão do onSwitchPro, que
          agora leva pro fluxo de virar profissional de verdade (plano +
          categoria + termo), não só troca a sessão pra uma aba vazia. */}
      {!jaEhProfissional && (
        <div style={{ margin:"20px 20px 0", borderRadius:22, overflow:"hidden", position:"relative", boxShadow:"0 8px 26px rgba(255,87,34,.22)" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${O},#E64A19)` }} />
          <div style={{ position:"absolute", top:-20, right:-20, width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,.08)" }} />
          <div style={{ position:"relative", zIndex:1, padding:"18px 20px", display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:32, flexShrink:0 }}>🔧</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14.5, fontWeight:900, color:"white", margin:"0 0 3px" }}>Quer também prestar serviços?</p>
              <p style={{ fontSize:11.5, color:"rgba(255,255,255,.85)", margin:"0 0 10px", lineHeight:1.4 }}>Receba oportunidades perto de você — taxa de acesso R$ 9,90/mês.</p>
              <button onClick={onSwitchPro} style={{ padding:"8px 16px", borderRadius:99, border:"none", background:"white", color:O, fontWeight:900, fontSize:12.5, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                Vire Profissional <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES SECTION ── */}
      <div style={{ padding:"30px 0 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"0 20px" }}>
          <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:0 }}>Categorias</h3>
          <span style={{ fontSize:11, color:"#aaa", fontWeight:700 }}>{CATS.length} serviços</span>
        </div>

        {/* ── First 4 as featured 2x2 grid ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, padding:"0 20px", marginBottom:16 }}>
          {HOME_CATS.slice(0, 4).map(cat => (
            <button key={cat.id} onClick={() => onPost(cat.id)} style={{
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
              <button key={cat.id} onClick={() => onPost(cat.id)} style={{
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

        {/* ── Ver todas as categorias — abre TodasCategoriasModal com as
            ~265 categorias de CATS agrupadas por CAT_GRUPOS, a grade acima
            (HOME_CATS, curadoria de 19 fixas) continua como estava. ── */}
        <div style={{ padding:"4px 20px 0" }}>
          <button onClick={() => setShowAllCats(true)} style={{
            width:"100%", padding:"13px 0", borderRadius:14, border:"1.5px solid #E8E8E8",
            background:"white", color:B, fontWeight:800, fontSize:13, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>
            Ver todas as categorias <ChevronRight size={15} />
          </button>
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
                    <p style={{ fontSize:15, fontWeight:900, color:B, margin:0 }}>{s.value != null ? `R$ ${s.value}` : "A combinar"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAllCats && (
        <TodasCategoriasModal
          onClose={() => setShowAllCats(false)}
          onSelect={catId => { setShowAllCats(false); onPost(catId); }}
        />
      )}
    </div>
  );
}

/* ── TODAS AS CATEGORIAS (modal) ──────────────────────────────────────────────
   Aberto pelo botão "Ver todas as categorias" no fim da grade da Home do
   cliente. CATS é a lista plana e específica (~265 itens, ver comentário
   acima de CATS) — o modal organiza esses itens em seções por `cat.grupo`,
   na ordem de CAT_GRUPOS, só pra facilitar a navegação visual (o grupo é
   puramente cosmético aqui, não afeta o que é selecionado). Clicar numa
   categoria fecha o modal e chama onSelect com o id — mesmo destino de
   clicar num card da grade (Novo Pedido com a categoria já
   pré-selecionada). */
function TodasCategoriasModal({ onClose, onSelect }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"24px 24px 0 0", maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px 14px", borderBottom:"1px solid #F0F0F0" }}>
          <div>
            <p style={{ fontWeight:900, fontSize:16, color:"#1a1a2e", margin:0 }}>Todas as categorias</p>
            <p style={{ fontSize:12, color:"#aaa", margin:"2px 0 0" }}>{CATS.length} categorias disponíveis</p>
          </div>
          <button onClick={onClose} style={{ background:"#F5F5F5", border:"none", borderRadius:"50%", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <X size={18} color="#666" />
          </button>
        </div>

        {/* scrollable content — seções por grupo, na ordem de CAT_GRUPOS */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px 28px" }}>
          {CAT_GRUPOS.map(grupo => {
            const itens = CATS.filter(c => c.grupo === grupo);
            if (!itens.length) return null;
            return (
              <div key={grupo} style={{ marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>{grupo}</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {itens.map(cat => (
                    <button key={cat.id} onClick={() => onSelect(cat.id)} style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"9px 14px", borderRadius:99,
                      border:"1px solid #F0F2F5", background:cat.bg,
                      cursor:"pointer", fontSize:12.5, fontWeight:700, color:"#1a1a2e",
                    }}>
                      <span style={{ fontSize:15 }}>{cat.emoji}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── POST SERVICE SCREEN ──────────────────────────────── */
// Campo guiado do piloto Montador (Fase 2 do motor de precificação) — os
// values batem com o check constraint de pedidos.escopo_montador e com o
// CASE do trigger pedidos_precificar() em
// supabase_motor_precificacao_migration.sql. Vazio/não selecionado = motor
// assume o nível mais caro (regra de segurança), não precisa de valor aqui
// pra isso.
const ESCOPO_MONTADOR_OPTIONS = [
  { val:"peca_pequena",     label:"Peça pequena ou ajuste (ex: prateleira, mesa simples)" },
  { val:"ate_2_portas",     label:"Guarda-roupa ou cama — até 2 portas/módulos" },
  { val:"3_a_4_portas",     label:"3 a 4 portas/módulos" },
  { val:"mais_de_4_portas", label:"Cozinha planejada — mais de 4 portas/módulos" },
];
function PostServiceScreen({ onBack, onSuccess, initialCat = "" }) {
  const [form,       setForm]       = useState({ cat:initialCat, desc:"", value:"", cep:"", material: false, urgent:"normal", scheduledDate:"", tipoAtendimento:"residencial", tipoValor:"referencia", escopoMontador:null });
  const [photos,     setPhotos]     = useState([]);
  const [cepInfo,    setCepInfo]    = useState(null);  // { bairro, cidade, uf }
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError,   setCepError]   = useState("");
  const inputRef = useRef(null);

  // Categoria em 2 passos (2026-08-07): escolhe o grupo, depois o item
  // específico dentro dele (lista curta) em vez de rolar os ~265 itens
  // soltos — com botão de voltar pra trocar de grupo. form.cat continua
  // guardando só o item específico (ex.: "pedreiro"), igual sempre foi.
  // Se já veio com categoria pré-selecionada (card da Home), o picker nasce
  // fechado (mostra o item escolhido direto) — "Trocar" reabre já no grupo
  // certo, sem obrigar a pessoa a repetir a escolha do grupo.
  const [catPickerOpen, setCatPickerOpen] = useState(!initialCat);
  const [catGrupoAberto, setCatGrupoAberto] = useState(() => CATS.find(c => c.id === initialCat)?.grupo || null);

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
        // ViaCEP às vezes responde erro:false mas sem "localidade" preenchida
        // (CEPs genéricos/promocionais) — sem essa checagem, o pedido era
        // publicado com cidade:null, invisível pro radar de empresa/cidade.
        if (d.erro || !d.localidade) { setCepError("CEP não encontrado"); }
        else { setCepInfo({ bairro: d.bairro, cidade: d.localidade, uf: d.uf, logradouro: d.logradouro }); }
      } catch { setCepError("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  const F = { background:"white", border:"1.5px solid #EBEBEB", borderRadius:12, padding:"13px 14px", fontSize:13, color:"#1a1a2e", outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const L = { display:"block", fontSize:10, fontWeight:800, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 };

  // Valor mínimo fixo (R$20) — antes só checava form.value truthy, então
  // "0" (string não-vazia) passava como válido e publicava pedido de R$0.
  // Só se aplica à opção A (tipoValor:"referencia") — na opção B
  // ("a_combinar", Fase 3) o cliente não informa valor nenhum, então não há
  // o que validar aqui, e o pedido é publicado com valor:null.
  const valorNum = Number(form.value);
  const valorPreenchido = form.value !== "" && !Number.isNaN(valorNum);
  const valorAbaixoMinimo = form.tipoValor === "referencia" && valorPreenchido && valorNum < VALOR_MINIMO_PEDIDO;
  const valorOk = form.tipoValor === "a_combinar" || (valorPreenchido && valorNum >= VALOR_MINIMO_PEDIDO);
  const canPublish = form.cat && form.desc && valorOk && cepInfo && cepInfo.cidade;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:"18px 16px 40px" }}>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />
      <BackBtn onClick={onBack} />
      <h2 style={{ fontSize:20, fontWeight:900, color:"#1a1a2e", margin:0 }}>Novo Serviço</h2>

      {/* Categoria — 2 passos: grupo, depois item específico dentro dele */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block", marginBottom:6}}>Categoria</label>
        {!catPickerOpen ? (
          // Item já escolhido — mostra colapsado com opção de trocar.
          (() => {
            const catAtual = CATS.find(c => c.id === form.cat);
            return (
              <div style={{ ...F, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                <span style={{ display:"flex", alignItems:"center", gap:8, fontWeight:700 }}>
                  <span style={{ fontSize:16 }}>{catAtual?.emoji}</span> {catAtual?.label}
                </span>
                <button type="button" onClick={() => { setCatGrupoAberto(catAtual?.grupo || null); setCatPickerOpen(true); }} style={{ background:"none", border:"none", cursor:"pointer", padding:0, color:B, fontWeight:800, fontSize:12.5, flexShrink:0 }}>
                  Trocar
                </button>
              </div>
            );
          })()
        ) : catGrupoAberto ? (
          // Passo 2 — itens específicos do grupo escolhido.
          <div style={{ ...F, padding:14 }}>
            <button type="button" onClick={() => setCatGrupoAberto(null)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:12, color:B, fontWeight:800, fontSize:12.5 }}>
              <ChevronLeft size={15} /> {catGrupoAberto}
            </button>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {CATS.filter(c => c.grupo === catGrupoAberto).map(c => (
                <button key={c.id} type="button" onClick={() => { setForm(f => ({ ...f, cat:c.id })); setCatPickerOpen(false); }} style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"8px 14px", borderRadius:99, cursor:"pointer",
                  border: form.cat === c.id ? `1.5px solid ${B}` : "1.5px solid #E5E7EB",
                  background: form.cat === c.id ? "#EBF4FF" : "white",
                  color: form.cat === c.id ? B : "#555", fontWeight:700, fontSize:12.5,
                }}>
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Passo 1 — grade de grupos.
          <div style={{ ...F, padding:14 }}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {CAT_GRUPOS.map(grupo => {
                const itensGrupo = CATS.filter(c => c.grupo === grupo);
                return (
                  <button key={grupo} type="button" onClick={() => setCatGrupoAberto(grupo)} style={{
                    display:"flex", alignItems:"center", gap:6,
                    padding:"8px 12px 8px 14px", borderRadius:99, cursor:"pointer",
                    border:"1.5px solid #E5E7EB", background:"white",
                    color:"#555", fontWeight:700, fontSize:12.5,
                  }}>
                    <span>{itensGrupo[0]?.emoji}</span> {grupo}
                    <ChevronRight size={13} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tipo de solicitação — natureza da demanda (Residencial/Empresarial),
          não o tipo de cliente (PF/CNPJ): um cliente pessoa física pode
          fazer uma solicitação Empresarial. Determina quais profissionais
          (por plano) enxergam o pedido no mural — ver EmpresaHomeScreen/
          ProfileScreen, filtro por tipo_atendimento. */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block", marginBottom:6}}>Tipo de solicitação</label>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { val:"residencial", icon:"🏠", label:"Residencial", sub:"Para sua casa" },
            { val:"empresarial",  icon:"🏢", label:"Empresarial",  sub:"Para seu negócio" },
          ].map(opt => (
            <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, tipoAtendimento:opt.val }))} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
              padding:"12px 8px", borderRadius:12, cursor:"pointer",
              border: form.tipoAtendimento === opt.val ? `2px solid ${B}` : "1.5px solid #E5E7EB",
              background: form.tipoAtendimento === opt.val ? "#EBF4FF" : "white",
            }}>
              <span style={{ fontSize:20 }}>{opt.icon}</span>
              <span style={{ fontWeight:800, fontSize:12.5, color: form.tipoAtendimento === opt.val ? B : "#555" }}>{opt.label}</span>
              <span style={{ fontSize:10.5, color:"#9CA3AF" }}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block"}}>Descrição do problema</label>
        <textarea rows={4} placeholder="Seja detalhado sobre o que precisa…" style={{ ...F, resize:"none", lineHeight:1.6 }} value={form.desc} onChange={e => setForm({ ...form, desc:e.target.value })} />
      </div>

      {/* Escopo do móvel — piloto do motor de precificação (Fase 2): pra
          Montador de Móveis a descrição livre sozinha não dá um sinal
          confiável de tamanho do serviço, então captura isso num campo
          guiado à parte. Opcional — se ficar vazio, o motor assume o nível
          mais alto de propósito (nunca o mais barato) em vez de chutar. */}
      {form.cat === "montador_de_moveis" && (
        <div>
          <label style={{fontSize:12,color:"#666",display:"block", marginBottom:6}}>Tamanho do móvel/serviço <span style={{ textTransform:'none', fontWeight:400, color:'#ccc' }}>(opcional, ajuda o profissional a entender o serviço)</span></label>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ESCOPO_MONTADOR_OPTIONS.map(opt => {
              const selected = form.escopoMontador === opt.val;
              return (
                <div key={opt.val} onClick={() => setForm(f => ({ ...f, escopoMontador: selected ? null : opt.val }))} style={{
                  display:"flex", alignItems:"center", gap:12, borderRadius:12, cursor:"pointer", padding:"11px 14px",
                  border: selected ? `2px solid ${B}` : "1.5px solid #E5E7EB",
                  background: selected ? "#EBF4FF" : "white", transition:"all .15s",
                }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:(selected?"2px solid "+B:"2px solid #D1D5DB"), background: selected ? B : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {selected && <div style={{ width:7, height:7, borderRadius:"50%", background:"white" }} />}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:700, color: selected ? B : "#1a1a2e" }}>{opt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Valor — Fase 3 da reforma comercial: opção A (valor de referência,
          não vinculante — o profissional pode propor outro pelo chat) vs
          opção B (sem valor nenhum, cliente quer só receber orçamentos).
          Nos dois casos a negociação por chat_propostas_valor funciona
          igual; a diferença é só se existe ou não um valor inicial. */}
      <div>
        <label style={{fontSize:12,color:"#666",display:"block", marginBottom:6}}>Valor do serviço</label>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { val:"referencia", label:"Tenho um valor em mente", sub:"A partir de quanto você pretende investir?" },
            { val:"a_combinar", label:"Não sei quanto custa",    sub:"Quero receber orçamentos e negociar" },
          ].map(opt => {
            const selected = form.tipoValor === opt.val;
            return (
              <div key={opt.val} onClick={() => setForm(f => ({ ...f, tipoValor:opt.val }))} style={{
                borderRadius:14, cursor:"pointer", padding:"13px 14px",
                border: selected ? `2px solid ${B}` : "1.5px solid #E5E7EB",
                background: selected ? "#EBF4FF" : "white",
                transition:"all .15s",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", border:(selected?"2px solid "+B:"2px solid #D1D5DB"), background: selected ? B : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                    {selected && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:800, color: selected ? B : "#1a1a2e", margin:"0 0 2px" }}>{opt.label}</p>
                    <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{opt.sub}</p>
                  </div>
                </div>
                {opt.val === "referencia" && selected && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop:12, paddingTop:12, marginLeft:32, borderTop:"1px solid #DCE8FA" }}>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontWeight:800, color:"#999", fontSize:13 }}>R$</span>
                      <input type="number" placeholder="0,00" style={{ ...F, paddingLeft:38, ...(valorAbaixoMinimo ? { border:"1.5px solid #EF4444" } : {}) }} value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} />
                    </div>
                    {valorAbaixoMinimo && (
                      <p style={{ fontSize:11.5, color:"#EF4444", fontWeight:700, margin:"6px 0 0" }}>
                        ⚠️ Valor mínimo pra publicar um pedido é R$ {VALOR_MINIMO_PEDIDO},00
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

        <button
            onClick={() => { if (canPublish) { (async()=>{ const ts=Date.now(); const urls=await Promise.all((window._photos||[]).map(async(b64,i)=>{ const res=await fetch(b64); const blob=await res.blob(); const ext=blob.type.includes("png")?"png":"jpg"; const path="pedido_"+ts+"_"+i+"."+ext; const{error:ue}=await supabase.storage.from("pedidos-fotos").upload(path,blob,{contentType:blob.type,upsert:true,cacheControl:"31536000"}); if(ue){console.warn("upload:",ue);return null;} return supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl; })); const fotos=urls.filter(Boolean); const{data:novoPedido,error}=await supabase.from("pedidos").insert({cliente_id:safeGetUser().email||"anonimo",cliente_nome:safeGetUser().name||"Cliente",categoria:form.cat,descricao:form.desc,valor:form.tipoValor==="a_combinar"?null:Number(form.value),cep:form.cep,cidade:cepInfo.cidade||null,fotos,status:"aberto",tipo_atendimento:form.tipoAtendimento,tipo_valor:form.tipoValor,escopo_montador:form.cat==="montador_de_moveis"?form.escopoMontador:null}).select().single(); if(error){alert("Erro ao publicar serviço: "+(error.message||"")); return;} fetch(`${NOTIFY_API}/notify-pedido`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({categoria:form.cat,descricao:form.desc})}).catch(()=>{}); (async()=>{ const clienteEmail=safeGetUser().email; if(!clienteEmail) return; const playerId=await getOneSignalPlayerId(); if(playerId){ supabase.from("usuarios").update({onesignal_player_id:playerId}).eq("email",clienteEmail).then(()=>{}); } })(); onSuccess({...mapPedidoRow(novoPedido), cepInfo, material:form.material}); })(); }}}
            style={{ padding:"15px 0", borderRadius:14, border:"none", cursor: canPublish ? "pointer" : "not-allowed", background: canPublish ? `linear-gradient(135deg,${O},#E64A19)` : "#9CA3AF", color: canPublish ? "white" : "#4B5563", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: canPublish ? "0 5px 18px rgba(255,87,34,.30)" : "none", transition:"all .2s" }}>
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
  if (status === "confirmado")   return 1;
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
    cidade: p.cidade || null,
    status: p.status,
    time: p.created_at,
    chegada_solicitada_em: p.chegada_solicitada_em,
    inicio_confirmado_em: p.inicio_confirmado_em,
    concluido_em: p.concluido_em,
    contestado_em: p.contestado_em,
    contestacao_motivo: p.contestacao_motivo,
    cancelado_motivo: p.cancelado_motivo,
    cancelado_por: p.cancelado_por,
    concluido_cliente_em: p.concluido_cliente_em,
    concluido_profissional_em: p.concluido_profissional_em,
    conclusao_fotos_cliente: p.conclusao_fotos_cliente,
    conclusao_fotos_profissional: p.conclusao_fotos_profissional,
    tipoValor: p.tipo_valor,
    // Motor de precificação (Fase 2) — gravados pelo trigger
    // pedidos_precificar() no insert, nunca calculados no client.
    custoMoedas: p.custo_moedas,
    valorEstimadoMin: p.valor_estimado_min,
    valorEstimadoMax: p.valor_estimado_max,
  };
}

// Generate a deterministic 4-digit PIN from service id
function generatePin(serviceId) {
  const seed = String(serviceId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return String((seed * 7919) % 10000).padStart(4, "0");
}

// Código de confirmação de início (Fase 5) — mesmo padrão determinístico do
// PIN de conclusão (generatePin), multiplicador diferente pra não coincidir
// com o código de conclusão do mesmo pedido. Sem geração/persistência no
// banco: os dois lados computam o mesmo valor localmente a partir do id.
function generateCodigoInicio(serviceId) {
  const seed = String(serviceId).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return String((seed * 3571) % 10000).padStart(4, "0");
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
function ServiceDetailClient({ service, onBack, onConfirmarConclusao, onCancelarPedido, onAvaliar, showToast }) {
  const [phase,      setPhase]      = useState(statusToPhase(service.status));
  const [showSOS,    setShowSOS]    = useState(false);
  const [released,   setReleased]   = useState(service.status === "concluido");
  const [observacao, setObservacao] = useState("");
  const [confirmando,setConfirmando]= useState(false);
  const [fotos,       setFotos]       = useState([]);
  const [enviandoFoto,setEnviandoFoto]= useState(false);
  const [showCancelar,    setShowCancelar]    = useState(false);
  const [motivoCancelar,  setMotivoCancelar]  = useState("");
  const [cancelando,      setCancelando]      = useState(false);
  const cat  = CATS.find(c => c.id === service.cat);
  const pin  = generatePin(service.id);
  const codigoInicio = generateCodigoInicio(service.id);
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
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true, cacheControl: "31536000" });
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

  const confirmarCancelamento = () => {
    if (cancelando || !motivoCancelar.trim()) return;
    if (!window.confirm("Cancelar esse pedido? O profissional será avisado pelo chat.")) return;
    setCancelando(true);
    onCancelarPedido?.(service.id, "cliente", motivoCancelar.trim());
    showToast?.("Pedido cancelado.", "#DC2626");
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
              <span style={{ fontSize:11, color:"#aaa" }}>{service.value != null ? `R$ ${service.value}` : "A combinar"}</span>
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

      {/* ── CÓDIGO DE INÍCIO (Fase 5) — só na fase "Acordo Fechado", some
          quando o profissional confirma a chegada (status vira executando).
          Etapa nova, adicional ao PIN de conclusão logo abaixo. ── */}
      {phase === 1 && (
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          {service.chegada_solicitada_em ? (
            <div style={{ padding:16 }}>
              <p style={{ fontSize:13, fontWeight:900, color:"#1a1a2e", margin:"0 0 4px" }}>📍 O profissional chegou!</p>
              <p style={{ fontSize:12, color:"#666", lineHeight:1.5, margin:"0 0 12px" }}>Informe o código abaixo pra ele confirmar o início do serviço.</p>
              <div style={{ background:"#F8F9FA", borderRadius:14, padding:"12px 16px", display:"flex", gap:8, justifyContent:"center", border:`1.5px dashed ${O}` }}>
                {codigoInicio.split("").map((d, i) => (
                  <div key={i} style={{ width:36, height:44, borderRadius:10, background:"white", border:`2px solid ${O}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#1a1a2e", boxShadow:"0 2px 8px rgba(0,0,0,.08)" }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding:16, display:"flex", alignItems:"center", gap:10 }}>
              <Clock size={18} color="#aaa" />
              <p style={{ fontSize:12.5, color:"#888", margin:0 }}>Aguardando o profissional chegar ao local para iniciar o serviço.</p>
            </div>
          )}
        </div>
      )}

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
            <span style={{ marginLeft:"auto", fontSize:16, fontWeight:900, color:"#4ade80" }}>{(service.proposalValue ?? service.value) != null ? `R$ ${service.proposalValue || service.value}` : "A combinar"}</span>
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

      {/* ── CANCELAR PEDIDO (pós-aceite: Acordo Fechado / Em Execução / Disputa) ── */}
      {isEmAndamentoTab(service.status) && (
        <div>
          {!showCancelar ? (
            <button onClick={() => setShowCancelar(true)} style={{ width:"100%", padding:"12px 0", borderRadius:14, border:"1.5px solid #FECACA", background:"white", color:"#DC2626", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Cancelar pedido
            </button>
          ) : (
            <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)", border:"1.5px solid #FECACA" }}>
              <p style={{ fontSize:13, fontWeight:900, color:"#DC2626", margin:"0 0 8px" }}>Cancelar pedido</p>
              <p style={{ fontSize:12, color:"#555", lineHeight:1.5, margin:"0 0 10px" }}>O profissional será avisado pelo chat. Conte o motivo:</p>
              <textarea
                value={motivoCancelar}
                onChange={e => setMotivoCancelar(e.target.value)}
                placeholder="Ex: imprevisto, não preciso mais do serviço..."
                style={{ width:"100%", minHeight:70, borderRadius:12, border:"1.5px solid #eee", padding:12, fontSize:13.5, fontFamily:"Nunito", resize:"none", boxSizing:"border-box" }}
              />
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={() => { setShowCancelar(false); setMotivoCancelar(""); }} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:700, fontSize:12.5, cursor:"pointer" }}>
                  Voltar
                </button>
                <button onClick={confirmarCancelamento} disabled={cancelando || !motivoCancelar.trim()} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"none", background: (cancelando || !motivoCancelar.trim()) ? "#F3B4AE" : "#DC2626", color:"white", fontWeight:800, fontSize:12.5, cursor: (cancelando || !motivoCancelar.trim()) ? "default" : "pointer" }}>
                  Confirmar cancelamento
                </button>
              </div>
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
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true, cacheControl: "31536000" });
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
          <p style={{ fontSize:12, color:"#aaa", margin:0 }}>{(service.proposalValue ?? service.value) != null ? `R$ ${service.proposalValue || service.value}` : "A combinar"} · {service.loc || "Sua região"}</p>
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
function ServiceDetailPro({ service, onBack, isPro, onUpgrade, onOpenPinEntry, onAvaliar, onCancelarPedido, onSolicitarChegada, onConfirmarInicio, showToast }) {
  const cat   = CATS.find(c => c.id === service.cat);
  const phase = statusToPhase(service.status);
  const [showCancelar,  setShowCancelar]  = useState(false);
  const [motivoCancelar,setMotivoCancelar]= useState("");
  const [cancelando,    setCancelando]    = useState(false);
  const [solicitandoChegada, setSolicitandoChegada] = useState(false);
  const [codigoInput,   setCodigoInput]   = useState("");
  const [codigoErro,    setCodigoErro]    = useState(false);
  const [confirmandoInicio, setConfirmandoInicio] = useState(false);

  const confirmarCancelamento = () => {
    if (cancelando || !motivoCancelar.trim()) return;
    if (!window.confirm("Cancelar esse pedido? O cliente será avisado pelo chat.")) return;
    setCancelando(true);
    onCancelarPedido?.(service.id, "profissional", motivoCancelar.trim());
    showToast?.("Pedido cancelado.", "#DC2626");
  };

  // Fase 5 — código de confirmação de início: etapa nova antes da execução,
  // adicional ao PIN de conclusão (que continua existindo mais abaixo/na
  // tela de PIN). "Cheguei ao local" só marca a chegada (mostra o código pro
  // cliente); o status só vira "executando" depois que o profissional digita
  // de volta o código certo, recebido verbalmente do cliente.
  const handleCheguei = () => {
    if (solicitandoChegada || service.chegada_solicitada_em) return;
    setSolicitandoChegada(true);
    onSolicitarChegada?.(service.id, () => setSolicitandoChegada(false));
  };

  const handleDigitoInicio = (d) => {
    if (confirmandoInicio || codigoInput.length >= 4) return;
    const next = codigoInput + d;
    setCodigoInput(next);
    setCodigoErro(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === generateCodigoInicio(service.id)) {
          setConfirmandoInicio(true);
          onConfirmarInicio?.(service.id, () => { setConfirmandoInicio(false); setCodigoInput(""); });
        } else {
          setCodigoErro(true);
          setCodigoInput("");
        }
      }, 200);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px 16px 40px" }}>
      <BackBtn onClick={onBack} />
      <div style={{ borderRadius:20, padding:20, color:"white", background:`linear-gradient(135deg,${cat?.dot ?? B},${cat?.dot ?? B}bb)`, boxShadow:"0 6px 18px rgba(0,0,0,.13)" }}>
        <p style={{ fontSize:11, color:"rgba(255,255,255,.65)", marginBottom:4 }}>{cat?.label}</p>
        <h2 style={{ fontSize:18, fontWeight:900, marginBottom:8 }}>{service.title}</h2>
        <span style={{ fontSize:28, fontWeight:900 }}>{service.value != null ? `R$ ${service.value}` : "A combinar"}</span>
      </div>

      {(service.photos&&service.photos.length>0?service.photos:[service.photo]).filter(Boolean).length>0 && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>{(service.photos&&service.photos.length>0?service.photos:[service.photo]).filter(Boolean).map((src,i)=><img key={i} src={src} style={{width:service.photos&&service.photos.length>1?"calc(50% - 4px)":"100%",borderRadius:16,maxHeight:200,objectFit:"cover"}} />)}</div>}
      {/* Stepper for in-progress jobs */}
      {phase >= 1 && (
        <div style={{ background:"white", borderRadius:20, padding:"16px 12px", boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
          <p style={{ fontSize:12, fontWeight:800, color:"#1a1a2e", margin:"0 0 14px" }}>Progresso do Job</p>
          <ServiceStatusStepper phase={phase} />
          {/* Fase 5 — chegada + código de início. Só some daqui quando o
              status vira "executando" (o pedido bilateral de conclusão fica
              a cargo do botão de PIN mais abaixo, sem mudanças). */}
          {phase === 1 && (
            !service.chegada_solicitada_em ? (
              <button onClick={handleCheguei} disabled={solicitandoChegada} style={{marginTop:12,width:"100%",padding:"12px",background:O,color:"white",border:"none",borderRadius:12,fontWeight:700,fontSize:15,cursor: solicitandoChegada ? "default" : "pointer",opacity: solicitandoChegada ? .6 : 1}}>
                📍 {solicitandoChegada ? "Avisando..." : "Cheguei ao local / Iniciar Serviço"}
              </button>
            ) : (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:12.5, fontWeight:700, color:"#555", margin:"0 0 10px", textAlign:"center" }}>
                  Peça o código de início ao cliente e digite abaixo:
                </p>
                <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:12 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ width:42, height:50, borderRadius:12, border:`2px solid ${codigoErro ? "#EF4444" : i < codigoInput.length ? O : "#E5E7EB"}`, background: i < codigoInput.length ? O+"12" : "#F8F9FA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color: codigoErro ? "#EF4444" : "#1a1a2e" }}>
                      {i < codigoInput.length ? "●" : ""}
                    </div>
                  ))}
                </div>
                {codigoErro && <p style={{ textAlign:"center", color:"#EF4444", fontWeight:800, fontSize:12.5, marginBottom:12 }}>Código incorreto. Tente novamente.</p>}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                    <button key={i} disabled={confirmandoInicio} onClick={() => { if (d === "⌫") { setCodigoInput(p => p.slice(0,-1)); setCodigoErro(false); } else if (d) handleDigitoInicio(d); }} style={{ padding:"13px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background: d === "⌫" ? "#FFF5F5" : "white", color: d === "⌫" ? "#EF4444" : "#1a1a2e", fontWeight:900, fontSize:17, cursor: d && !confirmandoInicio ? "pointer" : "default", visibility: d === "" ? "hidden" : "visible" }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )
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
      ) : phase >= 2 && (
        <button onClick={onOpenPinEntry} style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#1a1a2e,#2d2d44)", color:"white", fontWeight:900, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:"0 5px 18px rgba(0,0,0,.2)" }}>
          <KeyRound size={18} /> Inserir Codigo do Cliente (Finalizar)
        </button>
      )}

      {/* ── CANCELAR PEDIDO (pós-aceite: Acordo Fechado / Em Execução / Disputa) ── */}
      {isEmAndamentoTab(service.status) && (
        <div>
          {!showCancelar ? (
            <button onClick={() => setShowCancelar(true)} style={{ width:"100%", padding:"12px 0", borderRadius:14, border:"1.5px solid #FECACA", background:"white", color:"#DC2626", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Cancelar pedido
            </button>
          ) : (
            <div style={{ background:"white", borderRadius:20, padding:"16px", boxShadow:"0 2px 12px rgba(0,0,0,.07)", border:"1.5px solid #FECACA" }}>
              <p style={{ fontSize:13, fontWeight:900, color:"#DC2626", margin:"0 0 8px" }}>Cancelar pedido</p>
              <p style={{ fontSize:12, color:"#555", lineHeight:1.5, margin:"0 0 10px" }}>O cliente será avisado pelo chat. Conte o motivo:</p>
              <textarea
                value={motivoCancelar}
                onChange={e => setMotivoCancelar(e.target.value)}
                placeholder="Ex: imprevisto, não vou conseguir atender..."
                style={{ width:"100%", minHeight:70, borderRadius:12, border:"1.5px solid #eee", padding:12, fontSize:13.5, fontFamily:"Nunito", resize:"none", boxSizing:"border-box" }}
              />
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={() => { setShowCancelar(false); setMotivoCancelar(""); }} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:700, fontSize:12.5, cursor:"pointer" }}>
                  Voltar
                </button>
                <button onClick={confirmarCancelamento} disabled={cancelando || !motivoCancelar.trim()} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"none", background: (cancelando || !motivoCancelar.trim()) ? "#F3B4AE" : "#DC2626", color:"white", fontWeight:800, fontSize:12.5, cursor: (cancelando || !motivoCancelar.trim()) ? "default" : "pointer" }}>
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── PRO UPGRADE ──────────────────────────────────────── */
// Multi monetiza por assinatura (plano fixo por tier). Escolher um plano
// pago cobra o cartão de verdade via Asaas (POST /api/assinatura/cobrar,
// PagamentoPlanoScreen) antes de virar "ativa" — não existe mais trial de
// 7 dias grátis pra planos novos (contas que já estavam em trial antes
// dessa mudança continuam valendo até a data de expiração original).
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
  {
    // HANDOFF 2026-09-03: "sem teto de serviço"/"sem limite de serviços
    // fechados por mês" saíram da copy — deixaram de ser diferencial do
    // Premium quando a cota de serviços/mês foi removida de TODOS os planos
    // (não só dele). O que ainda diferencia o Premium é categoria/valor
    // ilimitados + prioridade nas oportunidades.
    id: "premium", icon: Gem, label: "Multi Premium", price: "129,90", perDay: "menos de R$5 por dia", badge: "Sem limites",
    hook: "Sem teto de categoria, sem teto de valor.",
    intro: "Você já sabe o que faz e até onde quer chegar. Com o Multi Premium, nenhum limite de plano fica no seu caminho: cadastre quantas categorias precisar e aceite serviços de qualquer valor.",
    beneficios: [
      { icon: CheckCircle2, text: "Tudo do Multi Pro", lead: true },
      { icon: ClipboardList, text: "Categorias ilimitadas cadastradas no seu perfil" },
      { icon: DollarSign, text: "Sem teto de valor por serviço" },
      { icon: Gem, text: "Prioridade nas oportunidades compatíveis com você" },
    ],
    idealLead: "Ideal para quem já vive disso.",
    ideal: "Categoria e valor nunca mais viram motivo pra deixar passar uma oportunidade. O Multi Premium existe pra quem já sabe que vai continuar crescendo.",
    ctaLabel: "Quero o Multi Premium",
  },
];
// Planos pagos de empresa parceira — reintroduzidos 2026-08-19 a pedido
// explícito do usuário (tinham sido descontinuados na reforma comercial de
// 2026-08-18, ver comentário em CadastroEmpresaScreen/EscolherPlanoScreen).
// Independentes de empresas.tipo_conta (o que a empresa faz — prestadora/
// contratante/os dois, sempre grátis) — aqui é só a monetização da própria
// presença/captação na plataforma. Mesmo formato de item de PLANOS_USUARIO
// (id/label/price/beneficios/...) pra reaproveitar o card e o fluxo de
// pagamento (EscolherPlanoScreen → PagamentoPlanoScreen → Asaas) sem
// duplicar nenhum dos dois. ids batem com o CHECK de assinaturas.plano no
// banco ('empresa','empresa_plus' — confirmado ainda presente na constraint
// ao vivo antes de reativar isso, projeto tem histórico de constraint
// revertendo sozinha).
const PLANOS_EMPRESA = [
  {
    id: "empresa", icon: Building2, label: "Multi Empresa", price: "149,90", perDay: "menos de R$5 por dia",
    hook: "Coloque sua empresa na frente de quem já está procurando.",
    intro: "Sua empresa ganha um perfil verificado na plataforma, aparece nas buscas de clientes da sua categoria e pode publicar demandas pra encontrar profissionais — tudo num só lugar.",
    beneficios: [
      { icon: Eye,       text: "Apareça nas buscas de clientes que procuram fornecedores como você" },
      { icon: Briefcase, text: "Publique demandas e encontre profissionais pra sua operação" },
      { icon: BadgeCheck,text: "Perfil com selo de empresa parceira verificada" },
      { icon: BarChart2, text: "Acompanhe seus pedidos num painel dedicado" },
    ],
    idealLead: "Ideal para quem quer:",
    ideal: "Presença de verdade na plataforma e um canal direto de captação de clientes, sem depender só de indicação.",
    ctaLabel: "Quero captar clientes",
  },
  {
    id: "empresa_plus", icon: Crown, label: "Multi Empresa Plus", price: "299,90", perDay: "menos de R$10 por dia", badge: "Mais completo",
    hook: "Tudo pra sua empresa liderar a categoria.",
    intro: "Além de captar clientes, o Multi Empresa Plus dá acesso ao banco de profissionais da plataforma e prioridade nas oportunidades — pra empresas que querem crescer mais rápido.",
    beneficios: [
      { icon: CheckCircle2, text: "Tudo do Multi Empresa", lead: true },
      { icon: Users,        text: "Acesso ao banco de profissionais da plataforma" },
      { icon: TrendingUp,   text: "Prioridade nas oportunidades compatíveis com sua empresa" },
      { icon: BarChart2,    text: "Dashboard completo de desempenho e pedidos" },
    ],
    idealLead: "Ideal para quem já vive disso.",
    ideal: "Sua empresa não quer só aparecer — quer liderar. O Multi Empresa Plus existe pra quem já sabe que vai continuar crescendo.",
    ctaLabel: "Quero o Multi Empresa Plus",
  },
];
// Limites de negócio (categoria/valor) por plano do profissional. Espelha
// PLANO_LIMITES_USUARIO em MULTI-BACKEND/server.js — repos separados, sem
// pacote compartilhado, então qualquer mudança aqui precisa ser replicada
// manualmente lá (e vice-versa). O backend é o gate real (endpoint
// /api/pedidos/confirmar-servico); isto aqui só decide UX/copy (cards de
// mural, tela de perfil). null = sem limite (Premium). HANDOFF 2026-09-03:
// maxServicosMes (cota de serviços/mês) parou de ser aplicado E parou de
// aparecer em qualquer copy — o campo continua existindo no objeto (e em
// configuracoes_planos) só porque tirar a coluna do banco/schema não fazia
// parte do pedido, mas nada mais lê ele.
// 2026-08-09: teto de categoria deixou de ser um número flat de itens e virou
// duas dimensões — quantos GRUPOS (ex.: "Reformas e Construção") e quantas
// PROFISSÕES por grupo escolhido (ex.: "Pedreiro", "Gesseiro" dentro do mesmo
// grupo). Autônomo é 1 grupo × 1 profissão (mesmo resultado prático de
// antes). Pro é 2 grupos × 3 profissões cada (até 6 no total — mais generoso
// que o antigo teto flat de 3). Premium continua ilimitado nas duas
// dimensões. maxServicosMes/valorMaxServico não mudam.
// 2026-08-10: categorias voltou a ser uma lista plana (maxCategorias) —
// decisão explícita de manter a reforma comercial separada da reforma de
// 23 grupos/profissões aninhadas (que fica como projeto à parte). O par
// maxGrupos/maxItensPorGrupo do modelo 2D (2026-08-09) não é mais usado
// pra limite de plano; CategoriaMultiSelect ainda sabe operar nesse modo
// duplo (não removido do componente), só não é mais chamado assim daqui.
const PLANO_LIMITES_USUARIO = {
  autonomo: { maxCategorias: 1, maxServicosMes: 3,  valorMaxServico: 5000 },
  pro:      { maxCategorias: 3, maxServicosMes: 10, valorMaxServico: 5000 },
  premium:  { maxCategorias: null, maxServicosMes: null, valorMaxServico: null },
  // Mesmos limites do Autônomo por enquanto — placeholder até o modelo de
  // comissão (Fase 3+) definir limites próprios pra quem paga só a taxa de
  // acesso (ver PLANOS_ASSINATURA.acesso no backend). Espelha server.js.
  acesso:   { maxCategorias: 1, maxServicosMes: 3,  valorMaxServico: 5000 },
};
// Busca os limites reais de "configuracoes_planos" (Supabase) e sobrescreve os
// valores acima NO MESMO OBJETO (mutação, não reatribuição) — assim os
// vários pontos do arquivo que leem PLANO_LIMITES_USUARIO.<plano>.<campo>
// direto (limitesTexto, telas de upgrade, cota do ciclo, etc.) enxergam o
// valor atualizado sem precisar virar consumidor de state/prop. Se a busca
// falhar (rede, RLS, ou o bug de durabilidade desse projeto Supabase — ver
// memória "Supabase multifuncao project"), os valores hardcoded acima
// continuam valendo — fail-open, mesmo padrão já usado pro doc-status em
// outro lugar do app. Roda uma vez ao carregar o módulo (fire-and-forget,
// não bloqueia o primeiro render).
async function carregarPlanoLimitesReais() {
  try {
    const { data, error } = await supabase.from("configuracoes_planos").select("*");
    if (error || !data?.length) return;
    data.forEach(row => {
      if (PLANO_LIMITES_USUARIO[row.plano]) {
        Object.assign(PLANO_LIMITES_USUARIO[row.plano], {
          maxCategorias: row.max_categorias,
          maxServicosMes: row.max_servicos_mes,
          valorMaxServico: row.valor_max_servico,
        });
      }
    });
  } catch { /* fail-open: mantém os valores hardcoded acima */ }
}
carregarPlanoLimitesReais();
// Lista curta de "Limites do plano" pros cards de EscolherPlanoScreen — deriva
// de PLANO_LIMITES_USUARIO em vez de duplicar os números soltos num segundo
// lugar (fonte única: mudou o limite ali, o card já reflete sozinho).
// HANDOFF 2026-09-03: linha de "Até X serviços aceitos/mês" removida — não
// existe mais cota de serviços/mês em plano nenhum (nem sequer o "ilimitado"
// do fallback abaixo fazia sentido como diferencial depois disso, então
// saiu dos dois branches em vez de só trocar o número).
function limitesTexto(planoId) {
  const l = PLANO_LIMITES_USUARIO[planoId];
  if (!l || l.maxCategorias == null) {
    return ["Categorias ilimitadas", "Sem limite de valor"];
  }
  const categoriaTexto = l.maxCategorias === 1
    ? "1 categoria de serviço"
    : `Até ${l.maxCategorias} categorias de serviço`;
  return [
    categoriaTexto,
    `Valor máximo R$${l.valorMaxServico.toLocaleString("pt-BR")}/serviço`,
  ];
}
// "Promoção de Inauguração" (2026-08-26) — taxa de acesso obrigatória do
// profissional novo, modelo de comissão. Não vive em PLANOS_USUARIO de
// propósito: não é um plano escolhível na tela normal de "Escolher
// plano"/upgrade, só existe no card único e obrigatório que
// EscolherPlanoScreen mostra quando taxaAcessoObrigatoria=true (ver abaixo).
// id "acesso" tem que bater com PLANOS_ASSINATURA.acesso no backend.
const PLANO_ACESSO_INFO = { id: "acesso", label: "Multi — Taxa de Acesso", price: "9,90" };
function EscolherPlanoScreen({ titularTipo, titularEmail, titularNome, onBack, onDone, showToast, onSkip, onGoToComprarMoedas, permiteComprarMoedas = true, taxaAcessoObrigatoria = false }) {
  // Reativado 2026-08-19 (planos pagos de empresa voltaram — ver PLANOS_EMPRESA)
  // — isEmpresa volta a vir de titularTipo de verdade, não mais hardcoded.
  const isEmpresa = titularTipo === "empresa";
  const planos = isEmpresa ? PLANOS_EMPRESA : PLANOS_USUARIO;
  // Antes disso, escolher um plano pago criava um "trial" de 7 dias direto no
  // Supabase (assinaturas.status="trial"), sem cobrar nada nem pedir cartão —
  // dava pra usar o app inteiro de graça. Agora escolher o plano só abre a
  // tela de pagamento (PagamentoPlanoScreen); o plano só vira "ativa" depois
  // que o backend confirma a cobrança de verdade (POST /api/assinatura/cobrar
  // — ver item 2 do prompt Ajustes de Cadastro/Perfil/Fluxos). Contas que já
  // estavam em trial antes dessa mudança continuam valendo até expirar.
  const [planoEscolhido, setPlanoEscolhido] = useState(null);

  // Achado 2026-08-28 (ver multi_taxa_acesso_bypass_nova_aba na memória):
  // antes desta chamada, o "obrigatório" da Taxa de Acesso vivia só na ordem
  // das telas dentro desta aba (planoEscolhido/step, tudo em memória) — nada
  // gravava no banco que esta conta devia a taxa. Como o token de sessão já
  // é salvo no localStorage no cadastro, antes de qualquer pagamento (ver
  // RegisterScreen.handleSubmit), uma segunda aba/reload não tinha como
  // saber disso e caía direto na Home, liberando o app inteiro de graça.
  // Marca "pendente" em "assinaturas" assim que esta tela monta — o gate
  // real (App(), lendo plano/planoStatus do banco) passa a valer em
  // qualquer aba a partir daqui, sem depender de chegar até o pagamento.
  useEffect(() => {
    if (!taxaAcessoObrigatoria || !titularEmail) return;
    fetch(`${API_BASE}/api/assinatura/marcar-pendente`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titularTipo, titularEmail, plano: "acesso" }),
    }).catch(() => {}); // best-effort — se falhar, o gate simplesmente não trava ainda (fecha na próxima tentativa/reload)
  }, [taxaAcessoObrigatoria, titularTipo, titularEmail]);

  // Cupom de parceria/divulgação — só vale pro Multi Autônomo (regra de
  // negócio), por isso o campo só aparece no card desse plano abaixo. A
  // validação aqui é só feedback visual instantâneo (chama
  // /api/assinatura/validar-cupom, que NÃO consome o cupom) — quem decide de
  // verdade se ativa o mês grátis é o backend, revalidando tudo de novo
  // dentro de /api/assinatura/cobrar antes de gravar qualquer coisa.
  const [cupom, setCupom] = useState("");
  const [cupomStatus, setCupomStatus] = useState(null); // null | "checking" | "valido" | { motivo }
  const CUPOM_MOTIVOS = {
    cupom_vazio: "Digite um código",
    cupom_nao_encontrado: "Cupom não encontrado",
    cupom_inativo: "Esse cupom não está mais ativo",
    cupom_expirado: "Esse cupom expirou",
    cupom_esgotado: "Esse cupom já atingiu o limite de usos",
    cupom_ja_usado: "Você já usou esse cupom antes",
  };
  const validarCupom = async (codigo) => {
    if (!codigo.trim()) { setCupomStatus(null); return; }
    setCupomStatus("checking");
    try {
      const r = await fetch(`${API_BASE}/api/assinatura/validar-cupom`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cupom: codigo, titularEmail }),
      });
      const d = await r.json();
      setCupomStatus(d.valido ? "valido" : { motivo: CUPOM_MOTIVOS[d.motivo] || "Cupom inválido" });
    } catch {
      setCupomStatus({ motivo: "Não foi possível validar agora" });
    }
  };

  if (planoEscolhido) {
    // "acesso" não vem de PLANOS_USUARIO/PLANOS_EMPRESA (ver PLANO_ACESSO_INFO
    // acima) — sem esse caso especial, info ficaria undefined e a tela de
    // pagamento mostraria "R$ 0,00" (o valor cobrado de verdade vem do
    // backend de qualquer forma, mas a UI ficaria errada).
    const info = planoEscolhido === "acesso" ? PLANO_ACESSO_INFO : planos.find(p => p.id === planoEscolhido);
    // Cupom só viaja pra tela de pagamento se o plano escolhido for mesmo o
    // Autônomo e a última validação tiver dado "valido" — escolher outro
    // plano com um cupom digitado (mas não aplicado) não deve ativar nada.
    const cupomAtivo = planoEscolhido === "autonomo" && cupomStatus === "valido" ? cupom.trim() : "";
    return (
      <PagamentoPlanoScreen
        titularTipo={titularTipo} titularEmail={titularEmail} titularNome={titularNome}
        planoId={planoEscolhido} planoLabel={info?.label || ""} planoPreco={info?.price || "0,00"}
        cupomCodigo={cupomAtivo}
        onBack={() => setPlanoEscolhido(null)}
        showToast={showToast}
        onSuccess={() => onDone?.(planoEscolhido)}
      />
    );
  }

  // "Promoção de Inauguração" — profissional novo (modelo de comissão, não
  // grandfathered) não escolhe entre planos nem pode pular: card único,
  // obrigatório, direto pro PagamentoPlanoScreen igual aos planos pagos
  // normais (reaproveita 100% do mesmo componente/fluxo/endpoint acima, só
  // não passa pela lista de PLANOS_USUARIO nem pelo SemPlanoMoedaCard/onSkip).
  if (taxaAcessoObrigatoria) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(180deg,#F2F3FB,#E7E9F5)", padding:"20px 16px 48px", fontFamily:"'Nunito', -apple-system, sans-serif" }}>
        {onBack && <button onClick={onBack} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", marginBottom:8 }}>←</button>}

        <h2 style={{ textAlign:"center", fontWeight:900, fontSize:23, color:"#1a1a2e", margin:"0 0 8px", letterSpacing:-.3, lineHeight:1.3 }}>
          Só mais um passo pra <span style={{ color:O }}>ficar visível no Multi</span>
        </h2>
        <p style={{ textAlign:"center", color:"#666", fontSize:14, lineHeight:1.5, margin:"0 auto 26px", maxWidth:340 }}>
          Toda conta profissional nova passa por uma taxa de acesso mensal recorrente — no cartão ou Pix, ativa na hora.
        </p>

        <div style={{ maxWidth:420, margin:"0 auto" }}>
          <div style={{ background:"white", borderRadius:22, padding:"22px 20px", border:`1.5px solid ${O}33`, boxShadow:`0 20px 40px -16px ${O}33` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:O+"18" }}><Briefcase size={18} color={O} /></div>
              <p style={{ fontWeight:800, fontSize:16.5, color:"#14152A", margin:0, letterSpacing:-.1 }}>{PLANO_ACESSO_INFO.label}</p>
            </div>
            <p style={{ fontWeight:900, fontSize:30, color:"#1a1a2e", margin:"0 0 4px" }}>R$ {PLANO_ACESSO_INFO.price}<span style={{ fontSize:14, fontWeight:700, color:"#9CA3AF" }}>/mês</span></p>
            <p style={{ fontSize:13, color:"#6C6F94", lineHeight:1.58, margin:"0 0 18px" }}>
              Mantém seu perfil visível no mural pra clientes e empresas da sua região. Essa é a única cobrança recorrente da plataforma — você só paga comissão adicional quando fechar um serviço.
            </p>
            <button onClick={() => setPlanoEscolhido("acesso")} style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:14, boxShadow:`0 8px 22px ${O}59` }}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background: isEmpresa ? BG : "linear-gradient(180deg,#F2F3FB,#E7E9F5)", padding:"20px 16px 48px", fontFamily:"'Nunito', -apple-system, sans-serif" }}>
      <style>{`@keyframes planoGlow{0%,100%{opacity:.7}50%{opacity:1}}`}</style>

      {onBack && <button onClick={onBack} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", marginBottom:8 }}>←</button>}

      <h2 style={{ textAlign:"center", fontWeight:900, fontSize: isEmpresa ? 22 : 23, color:"#1a1a2e", margin:"0 0 8px", letterSpacing:-.3, lineHeight:1.3 }}>
        {isEmpresa ? "Escolha seu plano" : <>Você pode continuar esperando o próximo cliente aparecer... ou começar a <span style={{ color:O }}>criar novas oportunidades</span>.</>}
      </h2>
      <p style={{ textAlign:"center", color:"#666", fontSize:14, lineHeight:1.5, margin:"0 auto 26px", maxWidth:340 }}>
        {isEmpresa
          ? <>Escolha seu plano{titularNome ? `, ${titularNome}` : ""} — cobrança no cartão, ativa na hora.</>
          : "No Multi, você encontra pessoas e empresas que já estão procurando profissionais para realizar serviços. Escolha como você quer crescer."}
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:420, margin:"0 auto" }}>
        {/* Card "sem plano" (não vem de PLANOS_USUARIO, sem mensalidade) —
            aparece PRIMEIRO, antes dos planos pagos: alternativa pra quem
            não quer assinar, paga em moeda só quando responde a uma
            oportunidade (Fase 2 da monetização por moeda, ver o gate no
            botão "Tenho Interesse" em ProfessionalHome).
            permiteComprarMoedas (default true) — bug real achado 2026-08-18:
            essa tela também é o destino do botão "Escolher plano" no Profile
            de conta CLIENTE comum (onUpgrade, screen "upgrade" em App()), que
            nunca checava role nenhum. Um cliente puro conseguia chegar até
            aqui e comprar moeda de verdade (PIX Asaas) — feature que não
            serve pra nada pra quem não é profissional (moeda só paga
            resposta a oportunidade). Só esse único call site (screen
            "upgrade") passa permiteComprarMoedas=false pra quem não é
            profissional; os outros (cadastro de profissional, "Vire
            Profissional") continuam mostrando normalmente. */}
        {permiteComprarMoedas && <SemPlanoMoedaCard onGoToComprarMoedas={onGoToComprarMoedas} />}

        {planos.map(p => {
          const isPro = !!p.badge;
          // Multi Premium é sempre o plano mais alto (badge "Sem limites") —
          // usa a mesma estrutura de card "em destaque" do isPro (glow, badge,
          // borda gradiente), mas com paleta roxa própria em vez do laranja
          // do Multi Pro, pra não ficarem visualmente parecidos (item 2 do
          // pedido de ajuste dos cards de plano).
          const isPremium = p.id === "premium";
          const HeaderIcon = p.icon || Briefcase;
          const beneficios = p.beneficios.map(b => typeof b === "string" ? { text:b, Icon:Check, lead:false } : { text:b.text, Icon:b.icon || Check, lead:!!b.lead });

          const card = (
            <div style={{
              position:"relative",
              background: isPremium ? "linear-gradient(180deg,#F6F1FE,#EADDFB)" : isPro ? "linear-gradient(180deg,#FFF4EC,#FFE2CF)" : "white",
              borderRadius: isPro ? 20 : 22,
              padding: isPro ? "26px 22px 22px" : "22px 20px",
              border: isPro ? "none" : "1.5px solid #ECEDF5",
            }}>
              {isPro && (
                <span style={{
                  position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)",
                  background: isPremium ? "linear-gradient(135deg,#C4B5FD,#7C3AED)" : `linear-gradient(135deg,#FFB100,${O})`,
                  color: isPremium ? "white" : "#2A1200",
                  fontSize:10.5, fontWeight:800, letterSpacing:.5, textTransform:"uppercase",
                  padding:"7px 16px", borderRadius:99, boxShadow: isPremium ? "0 6px 16px #7C3AED55" : `0 6px 16px ${O}55`,
                  display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap",
                }}>
                  <Star size={12} fill={isPremium ? "white" : "#2A1200"} color={isPremium ? "white" : "#2A1200"} /> {p.badge}
                </span>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:38, height:38, borderRadius:12, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: isPremium ? "linear-gradient(135deg,#C4B5FD,#7C3AED)" : isPro ? `linear-gradient(135deg,#FFB100,${O})` : "#EBEFFE",
                    color: isPremium ? "white" : isPro ? "#2A1200" : B,
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
                  {p.perDay && <p style={{ fontSize:10.5, color: isPremium ? "#7C3AED" : isPro ? O : "#8A8DAE", fontWeight: isPro ? 800 : 600, margin:"3px 0 0" }}>{p.perDay}</p>}
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
                      background: b.lead ? "#14152A" : isPremium ? "#7C3AED22" : isPro ? `${O}22` : "#EBEFFE",
                      color: b.lead ? "#FFF4EC" : isPremium ? "#7C3AED" : isPro ? O : B,
                    }}>
                      <b.Icon size={16} />
                    </div>
                    <span style={{ fontSize:13.5, lineHeight:1.45, color: b.lead ? "#14152A" : "#42436A", fontWeight: b.lead ? 700 : 400, paddingTop:4 }}>{b.text}</span>
                  </div>
                ))}
              </div>

              {/* Limites do plano — resumo objetivo (categoria/valor) abaixo
                  do texto de venda, antes do fechamento "Ideal para quem..."
                  e do CTA. Vem de limitesTexto(p.id), que lê direto de
                  PLANO_LIMITES_USUARIO (mesma fonte usada no resto do app).
                  Conceito é 100% de profissional (categoria/valor por
                  serviço — cota de serviços/mês saiu daqui no HANDOFF
                  2026-09-03) — não existe PLANO_LIMITES_USUARIO pra
                  empresa nem faz sentido pra esse modelo, então pula pra
                  isEmpresa (mostrar isso pra empresa cairia no fallback
                  genérico "ilimitado" de limitesTexto(), que é enganoso). */}
              {!isEmpresa && (
                <div style={{ marginTop:18, paddingTop:16, borderTop:`1px solid ${isPremium ? "#E4D6FA" : isPro ? O+"33" : "#EDEEF6"}`, display:"flex", flexDirection:"column", gap:9 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:"#9A9DBE", textTransform:"uppercase", letterSpacing:1, margin:"0 0 2px" }}>Limites do plano</p>
                  {limitesTexto(p.id).map((texto, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{
                        width:20, height:20, borderRadius:"50%", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: isPremium ? "#7C3AED22" : isPro ? `${O}22` : "#EBEFFE",
                        color: isPremium ? "#7C3AED" : isPro ? O : B,
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize:13, color:"#42436A", fontWeight:600 }}>{texto}</span>
                    </div>
                  ))}
                </div>
              )}

              {p.ideal && (
                <p style={{ marginTop:18, paddingTop:14, borderTop:`1px dashed ${isPremium ? "#7C3AED4D" : isPro ? O+"4D" : "#E2E4F1"}`, fontSize:11.5, lineHeight:1.5, color:"#6C6F94" }}>
                  <b style={{ color:"#14152A", fontWeight:800 }}>{p.idealLead}</b> {p.ideal}
                </p>
              )}

              {/* Cupom de parceria/divulgação — 1 mês grátis, só no Multi
                  Autônomo (regra de negócio). Reutilizável: o mesmo código
                  serve pra vários profissionais diferentes. */}
              {p.id === "autonomo" && (
                <div style={{ marginTop:16 }}>
                  <label style={{ fontSize:11, fontWeight:800, color:"#8A8DAE", textTransform:"uppercase", letterSpacing:.5 }}>
                    Código de cupom (opcional)
                  </label>
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    <input
                      value={cupom}
                      onChange={e => { setCupom(e.target.value); setCupomStatus(null); }}
                      onBlur={e => validarCupom(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && validarCupom(cupom)}
                      placeholder="Ex: DIVULGA30"
                      style={{
                        flex:1, padding:"10px 12px", borderRadius:10, fontSize:13,
                        border:`1.5px solid ${cupomStatus === "valido" ? "#16A34A" : cupomStatus?.motivo ? "#DC2626" : "#E5E7EB"}`,
                        outline:"none", textTransform:"uppercase",
                      }}
                    />
                  </div>
                  {cupomStatus === "checking" && <p style={{ fontSize:11.5, color:"#9CA3AF", margin:"6px 0 0" }}>Verificando cupom...</p>}
                  {cupomStatus === "valido" && <p style={{ fontSize:11.5, color:"#16A34A", fontWeight:700, margin:"6px 0 0" }}>✓ Cupom válido — 1º mês grátis!</p>}
                  {cupomStatus?.motivo && <p style={{ fontSize:11.5, color:"#DC2626", margin:"6px 0 0" }}>{cupomStatus.motivo}</p>}
                </div>
              )}

              <button onClick={() => setPlanoEscolhido(p.id)} style={{
                marginTop:22, width:"100%", border:"none", borderRadius:16, padding:"16px 0",
                fontWeight:800, fontSize:13, letterSpacing:.4, textTransform:"uppercase",
                color:"white", cursor:"pointer",
                background: isPremium ? "linear-gradient(135deg,#8B5CF6,#5B21B6)" : isPro ? `linear-gradient(135deg,${O},#E8280A)` : `linear-gradient(135deg,${B},#22348F)`,
                boxShadow: isPremium ? "0 16px 30px -10px #7C3AED66" : isPro ? `0 16px 30px -10px ${O}66` : `0 14px 28px -10px ${B}88`,
              }}>
                {p.ctaLabel || "Escolher este plano"}
              </button>
            </div>
          );

          const cardEl = isPro ? (
            <div key={p.id} style={{ position:"relative", paddingTop:14 }}>
              <div style={{
                position:"absolute", inset:"12px -12px -12px", borderRadius:30,
                background: isPremium ? "radial-gradient(120% 100% at 50% 0%, #7C3AED4D, transparent 70%)" : `radial-gradient(120% 100% at 50% 0%, ${O}4D, transparent 70%)`,
                filter:"blur(20px)", animation:"planoGlow 4.5s ease-in-out infinite", zIndex:0,
              }} />
              <div style={{
                position:"relative", zIndex:1, borderRadius:22, padding:2,
                background: isPremium ? "linear-gradient(155deg,#C4B5FD,#7C3AED 45%,#4C1D95 100%)" : `linear-gradient(155deg,#FFB100,${O} 45%,#E8280A 100%)`,
                boxShadow: isPremium ? "0 20px 40px -16px #7C3AED4D" : `0 20px 40px -16px ${O}4D`,
              }}>
                {card}
              </div>
            </div>
          ) : (
            <div key={p.id}>{card}</div>
          );

          return cardEl;
        })}
      </div>

      {/* Skip — só aparece no cadastro (RegisterScreen/VirarProfissionalScreen
          passam onSkip); o "upgrade" de quem já é profissional ativo não
          recebe essa prop, então nunca mostra esse link ali. Profissional sem
          plano pago completa o cadastro grátis e navega/vê o mural
          normalmente — só fica bloqueado na hora de se candidatar a um
          serviço (ver PLAN BLOCK POPUP em ProfessionalHome). */}
      {onSkip && (
        <p style={{ textAlign:"center", margin:"22px 0 0" }}>
          <button onClick={onSkip} style={{ background:"none", border:"none", color:"#9CA3AF", fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3, fontFamily:"inherit" }}>
            Continuar sem plano por enquanto
          </button>
        </p>
      )}
    </div>
  );
}

// Card "sem plano" da tela Seja PRO (Fase 2 da monetização por moeda) —
// alternativa neutra à assinatura: sem mensalidade, paga só quando responde
// a uma oportunidade (gate de moeda, ver ProfessionalHome). Mesma estrutura
// visual de card do resto da tela, mas sem o gradiente de destaque dos
// planos pagos (não é um "plano" de verdade, não passa por
// PagamentoPlanoScreen).
function SemPlanoMoedaCard({ onGoToComprarMoedas }) {
  return (
    <div style={{ background:"#F8F9FC", borderRadius:22, padding:"22px 20px", border:"1.5px dashed #D8DAEA" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#FEF3C7", fontSize:19 }}>🪙</div>
        <p style={{ fontWeight:800, fontSize:16.5, color:"#14152A", margin:0, letterSpacing:-.1 }}>Sem plano</p>
      </div>
      <p style={{ fontWeight:700, fontSize:15, color:"#14152A", margin:"0 0 8px", lineHeight:1.35 }}>Pague só quando responder</p>
      <p style={{ fontSize:13, color:"#6C6F94", lineHeight:1.58, margin:"0 0 18px" }}>
        Prefere não usar comissão? Compre moedas e use quando quiser demonstrar interesse num serviço — pague só quando responder a uma oportunidade, sem taxa por serviço fechado.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:20 }}>
        {["Sem comissão por serviço", "A partir de 2 moedas por oportunidade respondida", "Compre moedas quando precisar"].map((texto, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#FEF3C7", color:"#D97706" }}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span style={{ fontSize:13, color:"#42436A", fontWeight:600 }}>{texto}</span>
          </div>
        ))}
      </div>
      <button onClick={() => onGoToComprarMoedas?.()} style={{
        width:"100%", border:"none", borderRadius:16, padding:"15px 0",
        fontWeight:800, fontSize:13, letterSpacing:.4, textTransform:"uppercase",
        color:"white", cursor:"pointer",
        background:"linear-gradient(135deg,#F59E0B,#D97706)",
        boxShadow:"0 12px 24px -10px rgba(217,119,6,.5)",
      }}>
        🪙 Comprar moedas
      </button>
    </div>
  );
}

function maskCpf(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3)  return d;
  if (d.length <= 6)  return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9)  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function maskCardNumber(v) { return v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "); }

/* ───────────────────────── PAGAMENTO DO PLANO — item 2 do prompt Ajustes ──────
   Substitui o antigo trial de 7 dias: cobra o cartão de verdade (backend,
   Asaas) antes de deixar o plano virar "ativa". Nada aqui grava direto no
   Supabase — só o backend faz isso, com service_role (ver migration
   supabase_pendencias_doc_pagamento_migration.sql). ─────────────────────── */
// MITIGAÇÃO EMERGENCIAL (2026-08-31): o Pix dinâmico da Asaas está com o
// campo recebedor.nome corrompido (CNPJ colado no nome truncado) e falha em
// qualquer banco pagador testado — chamado aberto com a Asaas, sem previsão.
// Enquanto isso, "acesso" (Taxa de Acesso) usa um Pix ESTÁTICO gerado no
// nosso próprio backend (chave da conta Nubank PJ, sem passar pela Asaas —
// ver /api/assinatura/gerar-pix-manual), testado com pagamento real
// (2026-08-31). Sem confirmação automática (não tem webhook do Nubank aqui)
// — o cliente manda comprovante por WhatsApp e a ativação é manual via
// /api/admin/ativar-manual. Reverter pra `false` assim que a Asaas confirmar
// o campo corrigido (ver texto do chamado nas notas do caso).
const WHATSAPP_COMPROVANTE = "5511960326911";

function PagamentoPlanoScreen({ titularTipo, titularEmail, titularNome, planoId, planoLabel, planoPreco, cupomCodigo, onBack, showToast, onSuccess }) {
  const pixManualFallback = planoId === "acesso";
  // 2026-08-15: cupom já foi tratado como "exige cartão" (travava o toggle em
  // "cartao"), o que excluía quem só usa Pix — justamente quem mais precisa
  // poder testar antes de se comprometer com pagamento. Corrigido: com cupom
  // válido, tanto cartão quanto Pix pulam a cobrança do ciclo 1 (ver
  // /api/assinatura/cobrar e /api/assinatura/gerar-pix, que agora ativa
  // direto como cortesia sem gerar QR Code nenhum). A diferença que resta é
  // só o 2º mês: cartão renova sozinho via assinatura Asaas, Pix segue o
  // padrão manual que já vale pra qualquer assinante Pix (sem cupom) hoje —
  // não tem débito automático no Brasil.
  const temCupom = !!cupomCodigo;
  const [metodo, setMetodo] = useState("cartao"); // "cartao" | "pix"

  // ── Cartão ──
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry,     setExpiry]     = useState(""); // MM/AA
  const [cvv,        setCvv]        = useState("");
  const [cpf,        setCpf]        = useState("");
  // Telefone do titular do cartão — achado 2026-08-27 testando a Taxa de
  // Acesso pela primeira vez de verdade: a Asaas rejeita toda cobrança de
  // cartão sem creditCardHolderInfo.phone ("Informe o número de contato com
  // DDD do titular do cartão", código invalid_creditCard) e esse campo nunca
  // existiu nesse formulário — nenhum pagamento por cartão neste endpoint
  // tinha funcionado nos últimos 7 dias (só Pix, que não passa por aqui).
  const [phone,      setPhone]      = useState("");
  const [errors,     setErrors]     = useState({});
  const [loading,    setLoading]    = useState(false);

  // ── Pix ── pixCpf é separado do cpf do cartão (a pessoa pode alternar entre
  // os dois métodos sem perder o que já digitou em cada um).
  const [pixCpf,        setPixCpf]        = useState("");
  const [errorPixCpf,   setErrorPixCpf]   = useState("");
  const [gerandoPix,    setGerandoPix]    = useState(false);
  const [pix,           setPix]           = useState(null); // {paymentId, customerId, pixCode, qrCodeBase64, expiresAt}
  const [confirmandoPix, setConfirmandoPix] = useState(false);
  const [pixExpirado,   setPixExpirado]   = useState(false);
  const [copiedPix,     setCopiedPix]     = useState(false);

  const hoje = new Date();
  const proximaCobranca = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Rótulo curto de cada campo pro resumo do toast abaixo — precisa bater
  // com os labels visíveis do form (ver FormField mais adiante).
  const CAMPO_LABEL_PAGAMENTO = {
    cardNumber: "número do cartão", cardHolder: "nome no cartão", expiry: "validade",
    cvv: "CVV", cpf: "CPF do titular", phone: "telefone do titular",
  };

  const validate = () => {
    const e = {};
    if (cardNumber.replace(/\D/g,"").length < 16) e.cardNumber = "Número do cartão incompleto";
    if (!cardHolder.trim()) e.cardHolder = "Informe o nome impresso no cartão";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "Use o formato MM/AA";
    if (cvv.replace(/\D/g,"").length < 3) e.cvv = "CVV inválido";
    if (cpf.replace(/\D/g,"").length !== 11) e.cpf = "CPF inválido";
    if (phone.replace(/\D/g,"").length < 10) e.phone = "Telefone inválido (com DDD)";
    setErrors(e);
    // CRÍTICO (achado 2026-08-27, testando a Taxa de Acesso ao vivo): sem
    // isso, um campo obrigatório vazio abaixo da dobra (CPF/telefone do
    // titular, os dois mais recentes) faz o clique em "Pagar" não fazer
    // NADA visível — sem toast, sem log no backend (o fetch nem chega a
    // rodar), só um texto vermelho pequeno num campo que a pessoa pode nem
    // estar vendo na tela. Reproduzido ao vivo: usuária testou, "tela ficou
    // igual", achou que travou — na real só esqueceu de rolar até CPF/
    // telefone. Toast garante que sempre existe algum feedback visível,
    // não importa em qual campo o erro está.
    if (Object.keys(e).length) {
      const faltando = Object.keys(e).map(k => CAMPO_LABEL_PAGAMENTO[k] || k).join(", ");
      showToast?.(`❌ Confira: ${faltando}.`, "#DC2626");
    }
    return Object.keys(e).length === 0;
  };

  const pagar = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const [expiryMonth, expiryYearShort] = expiry.split("/");
      const r = await fetch(`${API_BASE}/api/assinatura/cobrar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titularTipo, titularEmail, titularNome, plano: planoId,
          cupom: cupomCodigo || undefined,
          cardNumber: cardNumber.replace(/\D/g,""), cardHolder: cardHolder.trim(),
          expiryMonth, expiryYear: `20${expiryYearShort}`,
          cvv: cvv.replace(/\D/g,""), cpf: cpf.replace(/\D/g,""),
          phone: phone.replace(/\D/g,""),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Pagamento não confirmado");
      showToast?.(
        pixManualFallback
          ? `🎉 ${planoLabel} ativado! Cobrança única — sem renovação automática.`
          : d.cortesia
          ? `🎉 ${planoLabel} ativado com cupom — 1º mês grátis! Próxima cobrança em ${proximaCobranca.toLocaleDateString("pt-BR")}.`
          : `🎉 ${planoLabel} ativado! Próxima cobrança em ${proximaCobranca.toLocaleDateString("pt-BR")}.`,
        G
      );
      onSuccess?.();
    } catch (err) {
      showToast?.("❌ " + (err.message || "Não conseguimos processar o cartão"), "#DC2626");
    } finally {
      setLoading(false);
    }
  };

  // Gera a cobrança Pix (QR code + copia-e-cola) — não ativa o plano ainda,
  // só depois que o pagamento for detectado (polling abaixo) e reconfirmado
  // pelo backend em /api/assinatura/confirmar-pix.
  // Com cupom válido não existe nada pra cobrar no ciclo 1: o backend nem
  // chega a gerar QR Code, já responde com cortesia:true e a assinatura já
  // ativada — trata isso como sucesso imediato, igual ao fluxo de cartão com
  // cupom, em vez de cair na tela de "aguardando pagamento".
  const gerarPix = async () => {
    // Fallback estático (ver comentário no topo do arquivo) — sem CPF (não
    // precisa criar cliente na Asaas, é só um payload EMV local) e sem
    // cortesia/cupom (mesma decisão de escopo mínimo: essa via existe só
    // pra destravar a Taxa de Acesso hoje).
    if (pixManualFallback) {
      setGerandoPix(true);
      setPixExpirado(false);
      try {
        const r = await fetch(`${API_BASE}/api/assinatura/gerar-pix-manual`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titularTipo, titularEmail, titularNome, plano: planoId }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Não foi possível gerar o Pix");
        setPix(d); // {txid, pixCode, qrCodeBase64, valor, manual:true}
      } catch (err) {
        showToast?.("❌ " + (err.message || "Não foi possível gerar o Pix"), "#DC2626");
      } finally {
        setGerandoPix(false);
      }
      return;
    }
    if (pixCpf.replace(/\D/g,"").length !== 11) {
      setErrorPixCpf("CPF inválido");
      showToast?.("❌ Confira: CPF do titular.", "#DC2626"); // mesmo motivo do card cartão acima
      return;
    }
    setErrorPixCpf("");
    setGerandoPix(true);
    setPixExpirado(false);
    try {
      const r = await fetch(`${API_BASE}/api/assinatura/gerar-pix`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titularTipo, titularEmail, titularNome, plano: planoId,
          cpf: pixCpf.replace(/\D/g,""),
          cupom: cupomCodigo || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível gerar o Pix");
      if (d.cortesia) {
        showToast?.(`🎉 ${planoLabel} ativado com cupom — 1º mês grátis! Próxima cobrança em ${proximaCobranca.toLocaleDateString("pt-BR")}.`, G);
        onSuccess?.();
        return;
      }
      setPix(d);
    } catch (err) {
      showToast?.("❌ " + (err.message || "Não foi possível gerar o Pix"), "#DC2626");
    } finally {
      setGerandoPix(false);
    }
  };

  // Reconfere o pagamento e ativa o plano — chamado pelo polling automático
  // abaixo. O backend reconfere com a Asaas antes de gravar em "assinaturas"
  // — nunca confia só no que o front detectou. "manual" ficou como parâmetro
  // (default false) de quando existia um botão "Já paguei" que chamava isso
  // sob demanda; hoje a confirmação é 100% automática via polling/webhook.
  const confirmarPix = async (paymentId, customerId, manual = false) => {
    setConfirmandoPix(true);
    try {
      const r = await fetch(`${API_BASE}/api/assinatura/confirmar-pix`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, titularTipo, titularEmail, plano: planoId, customerId }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === "pagamento_nao_confirmado") {
          if (manual) showToast?.("⏳ Ainda não identificamos o pagamento. Aguarde alguns instantes e tente de novo.", O);
          return false; // ainda pendente, segue no polling
        }
        throw new Error(d.error || "Não foi possível confirmar o pagamento");
      }
      showToast?.(`🎉 ${planoLabel} ativado! Próxima cobrança em ${proximaCobranca.toLocaleDateString("pt-BR")}.`, G);
      onSuccess?.();
      return true;
    } catch (err) {
      // CRÍTICO (achado 2026-08-31, investigando QR travado em "Aguardando
      // pagamento" mesmo com o Pix já pago): antes, um erro AQUI (ex.: soluço
      // transitório da Asaas ao reconferir, ou falha de escrita no Supabase —
      // ver bug de durabilidade recorrente na memória) não tinha volta: o
      // polling abaixo já tinha dado clearInterval() ANTES de chamar esta
      // função, então uma falha aqui deixava o cliente pra sempre preso na
      // tela, dinheiro já debitado, sem nenhuma nova tentativa automática (só
      // o webhook, que se também falhasse ou demorasse, deixava o caso
      // idêntico ao da Rayane/Francielle/Antônio). Só toast em tentativa
      // manual — nas automáticas (polling a cada 5s) fica silencioso de
      // propósito pra não alarmar o usuário a cada retry; ver aviso único
      // depois de várias falhas seguidas, mais abaixo.
      if (manual) showToast?.("❌ " + (err.message || "Não foi possível confirmar o pagamento"), "#DC2626");
      return false;
    } finally {
      setConfirmandoPix(false);
    }
  };

  // Polling: consulta /api/status-pagamento a cada 5s enquanto o Pix estiver
  // pendente, e ativa sozinho assim que detectar o pagamento — confirmação
  // 100% automática via webhook da Asaas, sem depender de ação do usuário.
  // Some sozinho se sair da tela (troca de método, volta) ou se o código
  // expirar.
  //
  // CRÍTICO: só dá clearInterval() quando confirmarPix() realmente TER
  // SUCESSO (retorna true). Antes o clearInterval() rodava assim que
  // isPaid:true chegava, sem esperar confirmarPix() terminar — se essa
  // chamada falhasse por qualquer motivo transitório, o polling morria ali,
  // pra sempre, com o pagamento já feito e o plano nunca ativando sozinho
  // (só o webhook cobria esse caso, e nem sempre a tempo). Agora, se falhar,
  // o intervalo continua rodando e tenta de novo no próximo tick de 5s —
  // resiliente ao mesmo tipo de falha transitória que já mordeu este projeto
  // várias vezes (ver bug de durabilidade do Supabase na memória).
  const verificandoRef = useRef(false);
  const falhasConfirmacaoRef = useRef(0);
  useEffect(() => {
    if (!pix?.paymentId) return;
    falhasConfirmacaoRef.current = 0;

    const checar = async () => {
      if (verificandoRef.current) return; // evita corrida entre o intervalo e o listener de visibilidade
      if (pix.expiresAt && new Date(pix.expiresAt) < new Date()) {
        clearInterval(interval);
        setPixExpirado(true);
        return;
      }
      verificandoRef.current = true;
      try {
        const r = await fetch(`${API_BASE}/api/status-pagamento/${pix.paymentId}`);
        const d = await r.json();
        if (d.isPaid) {
          const ok = await confirmarPix(pix.paymentId, pix.customerId);
          if (ok) {
            clearInterval(interval);
          } else {
            falhasConfirmacaoRef.current += 1;
            // Depois de ~15s de pagamento detectado mas não confirmado,
            // avisa uma vez só (não repete a cada tentativa) — tranquiliza
            // sem alarmar; o polling continua tentando sozinho em segundo
            // plano.
            if (falhasConfirmacaoRef.current === 3) {
              showToast?.("✅ Pagamento identificado! Só um instante enquanto confirmamos — não feche esta tela.", G);
            }
          }
        }
      } catch (e) {
      } finally {
        verificandoRef.current = false;
      }
    };

    const interval = setInterval(checar, 5000);

    // setInterval fica pausado por navegadores/WebViews quando a aba/app vai
    // pra segundo plano (ex.: usuário sai pra pagar o PIX no app do banco) —
    // sem isso, a detecção só retomaria quando o timer voltasse a rodar,
    // podendo demorar mais do que os 5s esperados. Checar na hora que a tela
    // volta a ficar visível cobre esse caso.
    const aoVoltarVisivel = () => { if (document.visibilityState === "visible") checar(); };
    document.addEventListener("visibilitychange", aoVoltarVisivel);
    window.addEventListener("focus", aoVoltarVisivel);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoVoltarVisivel);
      window.removeEventListener("focus", aoVoltarVisivel);
    };
  }, [pix?.paymentId]);

  const copiarPix = () => {
    if (!pix?.pixCode) return;
    navigator.clipboard?.writeText(pix.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", padding:"20px 16px 48px", fontFamily:"'Nunito', -apple-system, sans-serif" }}>
      {onBack && <button onClick={onBack} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", marginBottom:8 }}>←</button>}

      <h2 style={{ textAlign:"center", fontWeight:900, fontSize:21, color:"#1a1a2e", margin:"0 0 6px" }}>Dados de pagamento</h2>
      <p style={{ textAlign:"center", color:"#666", fontSize:13.5, margin:"0 auto 22px", maxWidth:320 }}>
        {temCupom
          ? "Cupom aplicado — 1º mês grátis, com cartão ou Pix."
          : "Sem período de teste — a cobrança acontece agora, ao confirmar."}
      </p>

      {/* Resumo do plano */}
      <div style={{ maxWidth:420, margin:"0 auto 20px", background:"white", borderRadius:16, padding:"16px 18px", border:"1.5px solid #ECEDF5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <p style={{ margin:"0 0 2px", fontWeight:800, fontSize:14, color:"#1a1a2e" }}>{planoLabel}</p>
          <p style={{ margin:0, fontSize:11.5, color:"#9CA3AF" }}>
            {pixManualFallback
              ? "Cobrado hoje · cobrança única, sem renovação"
              : `${temCupom ? "Grátis hoje (cupom)" : "Cobrado hoje"} · ${temCupom ? "1ª cobrança" : "renova"} em ${proximaCobranca.toLocaleDateString("pt-BR")}`}
          </p>
        </div>
        <p style={{ margin:0, fontWeight:900, fontSize:20, color: temCupom ? "#16A34A" : "#1a1a2e" }}>
          {temCupom ? "R$ 0,00" : `R$ ${planoPreco}`}<span style={{ fontSize:11, fontWeight:700, color:"#9CA3AF" }}>{temCupom ? " hoje" : "/mês"}</span>
        </p>
      </div>

      {/* Toggle Cartão / Pix — livre com ou sem cupom (ver comentário no topo
          do componente: 2026-08-15, a trava em "cartao" foi removida).
          Taxa de acesso (planoId "acesso") tinha ficado de fora dessa lista
          por decisão explícita de lançamento (Promoção de Inauguração,
          2026-08-26: só cartão por enquanto) — revertido em 2026-08-27 depois
          que /api/assinatura/gerar-pix + /api/assinatura/confirmar-pix (que
          este mesmo componente já chama genericamente via `plano: planoId`)
          foram confirmados funcionando para "acesso" também, incluindo a
          rotina de lembrete de vencimento por Pix (ver PLANOS_ASSINATURA.acesso
          e o cron "taxa_acesso_pix" no backend). Nenhuma outra mudança de
          código foi necessária — o fluxo Pix completo (QR code, polling,
          confirmação) já era genérico o bastante pra cobrir esse plano.
          Testado ao vivo no preview 2026-08-27: toggle aparece, gera QR code
          real via Asaas sandbox, sem erros. */}
      <div style={{ maxWidth:420, margin:"0 auto 18px", display:"flex", gap:8, padding:6, background:"#EFF1F6", borderRadius:14 }}>
        {[{ id:"cartao", label:"💳 Cartão de crédito" }, { id:"pix", label:"⚡ Pix" }].map(m => (
          <button key={m.id} onClick={() => setMetodo(m.id)} style={{
            flex:1, padding:"10px 0", borderRadius:10, border:"none", cursor:"pointer",
            fontWeight:800, fontSize:12.5, transition:"all .15s",
            background: metodo === m.id ? "white" : "transparent",
            color: metodo === m.id ? "#1a1a2e" : "#8A8DAE",
            boxShadow: metodo === m.id ? "0 2px 8px rgba(0,0,0,.08)" : "none",
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {metodo === "cartao" ? (
        <div style={{ maxWidth:420, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
          <FormField IconComp={CreditCard} label="Número do cartão" error={errors.cardNumber}>
            <input inputMode="numeric" placeholder="0000 0000 0000 0000" value={cardNumber}
              onChange={e => { setCardNumber(maskCardNumber(e.target.value)); if (errors.cardNumber) setErrors(p => ({ ...p, cardNumber:undefined })); }}
              style={{ ...REG_INPUT, borderColor: errors.cardNumber ? "#E53935" : undefined }} />
          </FormField>
          <FormField IconComp={User} label="Nome no cartão" error={errors.cardHolder}>
            <input placeholder="Como está impresso no cartão" value={cardHolder}
              onChange={e => { setCardHolder(e.target.value.toUpperCase()); if (errors.cardHolder) setErrors(p => ({ ...p, cardHolder:undefined })); }}
              style={{ ...REG_INPUT, borderColor: errors.cardHolder ? "#E53935" : undefined }} />
          </FormField>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ flex:1 }}>
              <FormField IconComp={Clock} label="Validade" error={errors.expiry}>
                <input inputMode="numeric" placeholder="MM/AA" maxLength={5} value={expiry}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g,"").slice(0,4);
                    if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`;
                    setExpiry(v); if (errors.expiry) setErrors(p => ({ ...p, expiry:undefined }));
                  }}
                  style={{ ...REG_INPUT, borderColor: errors.expiry ? "#E53935" : undefined }} />
              </FormField>
            </div>
            <div style={{ flex:1 }}>
              <FormField IconComp={KeyRound} label="CVV" error={errors.cvv}>
                <input inputMode="numeric" placeholder="000" maxLength={4} value={cvv}
                  onChange={e => { setCvv(e.target.value.replace(/\D/g,"").slice(0,4)); if (errors.cvv) setErrors(p => ({ ...p, cvv:undefined })); }}
                  style={{ ...REG_INPUT, borderColor: errors.cvv ? "#E53935" : undefined }} />
              </FormField>
            </div>
          </div>
          <FormField IconComp={User} label="CPF do titular do cartão" error={errors.cpf}>
            <input inputMode="numeric" placeholder="000.000.000-00" value={cpf}
              onChange={e => { setCpf(maskCpf(e.target.value)); if (errors.cpf) setErrors(p => ({ ...p, cpf:undefined })); }}
              style={{ ...REG_INPUT, borderColor: errors.cpf ? "#E53935" : undefined }} />
          </FormField>
          {/* Telefone do titular — a Asaas exige esse dado pra aprovar cartão
              (creditCardHolderInfo.phone), ver comentário no state acima. */}
          <FormField IconComp={Phone} label="Telefone do titular (com DDD)" error={errors.phone}>
            <input inputMode="numeric" autoComplete="tel" placeholder="(00) 00000-0000" value={phone}
              onChange={e => { setPhone(maskPhone(e.target.value)); if (errors.phone) setErrors(p => ({ ...p, phone:undefined })); }}
              style={{ ...REG_INPUT, borderColor: errors.phone ? "#E53935" : undefined }} />
          </FormField>

          <button onClick={pagar} disabled={loading} style={{
            marginTop:8, width:"100%", padding:"16px 0", borderRadius:16, border:"none",
            background: loading ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`,
            color:"white", fontWeight:900, fontSize:15, cursor: loading ? "default" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          }}>
            {loading ? "Processando pagamento..." : <><Lock size={16} /> Pagar R$ {planoPreco} e ativar plano</>}
          </button>
          <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0 }}>
            {pixManualFallback
              ? `Cobrança única de R$ ${planoPreco} — sem mensalidade, sem renovação automática.`
              : `Cobrança recorrente mensal de R$ ${planoPreco}. Cancele quando quiser.`}
          </p>
        </div>
      ) : (
        <div style={{ maxWidth:420, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
          {!pix ? (
            <>
              {!pixManualFallback && (
                <FormField IconComp={User} label="CPF do titular" error={errorPixCpf}>
                  <input inputMode="numeric" placeholder="000.000.000-00" value={pixCpf}
                    onChange={e => { setPixCpf(maskCpf(e.target.value)); if (errorPixCpf) setErrorPixCpf(""); }}
                    style={{ ...REG_INPUT, borderColor: errorPixCpf ? "#E53935" : undefined }} />
                </FormField>
              )}
              <button onClick={gerarPix} disabled={gerandoPix} style={{
                width:"100%", padding:"16px 0", borderRadius:16, border:"none",
                background: gerandoPix ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`,
                color:"white", fontWeight:900, fontSize:15, cursor: gerandoPix ? "default" : "pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              }}>
                {gerandoPix
                  ? (temCupom ? "Ativando..." : "Gerando código Pix...")
                  : temCupom ? <>🎉 Ativar plano grátis (cupom)</> : <>⚡ Gerar código Pix — R$ {planoPreco}</>}
              </button>
              <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0 }}>
                {pixManualFallback
                  ? "Após pagar, a liberação é confirmada manualmente pela nossa equipe (não é automática) — normalmente em poucas horas."
                  : temCupom
                  ? `Grátis hoje. A partir do 2º mês, R$ ${planoPreco} — como Pix não tem débito automático no Brasil, vamos te avisar pra confirmar o pagamento todo mês.`
                  : `Cobrança recorrente mensal de R$ ${planoPreco}. Cancele quando quiser.`}
              </p>
            </>
          ) : pixExpirado ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <p style={{ fontSize:13.5, color:"#E53935", fontWeight:700, margin:"0 0 14px" }}>Esse código Pix expirou.</p>
              <button onClick={() => { setPix(null); setPixExpirado(false); }} style={{ padding:"12px 24px", borderRadius:12, border:"none", background:B, color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                Gerar novo código
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center" }}>
                {pix.qrCodeBase64 && (
                  <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix"
                    style={{ width:200, height:200, borderRadius:12, border:"3px solid #1a1a2e", display:"block", margin:"0 auto" }} />
                )}
                {!pix.manual && (
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, background: confirmandoPix ? "#F0FDF4" : "#FFF9E6", border:`1px solid ${confirmandoPix ? "#BBF7D0" : "#FDE68A"}`, borderRadius:99, padding:"5px 14px", marginTop:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background: confirmandoPix ? G : "#F59E0B" }} />
                    <span style={{ fontSize:11, fontWeight:800, color: confirmandoPix ? "#166534" : "#92400E" }}>
                      {confirmandoPix ? "Confirmando pagamento..." : "Aguardando pagamento"}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ background:"#F8FAFF", border:"1px solid #DBEAFE", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:"#3B82F6", textTransform:"uppercase", letterSpacing:.8, margin:"0 0 2px" }}>Ou copie o código Pix</p>
                  <p style={{ fontSize:11, fontWeight:800, color:"#1E3A8A", margin:0, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pix.pixCode}</p>
                </div>
                <button onClick={copiarPix} style={{ background:B, color:"white", border:"none", borderRadius:9, padding:"7px 14px", fontWeight:800, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                  {copiedPix ? "✓ Copiado" : "Copiar"}
                </button>
              </div>

              {pix.manual ? (
                <>
                  <div style={{ background:"#FFF3CD", border:"1px solid #FFE69C", borderRadius:10, padding:"12px 14px", fontSize:12, color:"#7A5C00", lineHeight:1.6 }}>
                    ⚠️ <strong>Confirmação manual</strong> — depois de pagar, envie o comprovante pelo WhatsApp abaixo junto com este código: <strong style={{ fontFamily:"monospace" }}>{pix.txid}</strong>. A liberação não é automática nesta forma de pagamento.
                  </div>
                  <a href={`https://wa.me/${WHATSAPP_COMPROVANTE}?text=${encodeURIComponent(`Oi! Paguei a Taxa de Acesso via Pix. Código: ${pix.txid} — e-mail: ${titularEmail}`)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:14, textDecoration:"none", boxSizing:"border-box" }}>
                    📲 Enviar comprovante pelo WhatsApp
                  </a>
                </>
              ) : (
                <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0 }}>
                  Assim que o pagamento cair, o plano ativa automaticamente — não precisa ficar recarregando a tela.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── COMPRAR MOEDAS ("Multi Moeda") ──────────────────────────────────────
   Fase 1 da monetização por moeda: só carteira + compra, ninguém gasta moeda
   ainda (isso é Fase 3). Mesmo template de PagamentoPlanoScreen pro fluxo
   Pix (gera cobrança, mostra QR, faz polling em /api/status-pagamento,
   confirma em /api/moedas/confirmar-pix quando detecta o pagamento) — sem
   cartão nem cupom aqui, só Pix, pra manter a Fase 1 simples. */
function ComprarMoedasScreen({ userEmail, userName, onBack, showToast, onSuccess }) {
  const [pacotes, setPacotes] = useState([]);
  const [carregandoPacotes, setCarregandoPacotes] = useState(true);
  const [pacoteId, setPacoteId] = useState(null);

  // Lê direto do Supabase (RLS permite leitura pública de moedas_pacotes) —
  // mesmo padrão de carregarPlanoLimitesReais() pra configuracoes_planos:
  // fonte única, admin edita a tabela, sem precisar mexer em código nem
  // duplicar endpoint só pra listar.
  useEffect(() => {
    supabase.from("moedas_pacotes").select("*").eq("ativo", true).order("ordem")
      .then(({ data }) => {
        setPacotes(data || []);
        if (data?.length) setPacoteId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setCarregandoPacotes(false));
  }, []);

  const [cpf,      setCpf]      = useState("");
  const [errorCpf, setErrorCpf] = useState("");
  const [gerandoPix, setGerandoPix] = useState(false);
  const [pix,        setPix]        = useState(null); // {paymentId, pixCode, qrCodeBase64, expiresAt, quantidade}
  const [confirmandoPix, setConfirmandoPix] = useState(false);
  const [pixExpirado,    setPixExpirado]    = useState(false);
  const [copiedPix,      setCopiedPix]      = useState(false);

  const pacoteSelecionado = pacotes.find(p => p.id === pacoteId);

  const gerarPix = async () => {
    if (cpf.replace(/\D/g,"").length !== 11) { setErrorCpf("CPF inválido"); return; }
    if (!pacoteSelecionado) return;
    setErrorCpf("");
    setGerandoPix(true);
    setPixExpirado(false);
    try {
      const r = await fetch(`${API_BASE}/api/moedas/gerar-pix`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail, nome: userName, cpf: cpf.replace(/\D/g,""),
          pacoteId: pacoteSelecionado.id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível gerar o Pix");
      setPix({ ...d, quantidade: pacoteSelecionado.quantidade });
    } catch (err) {
      showToast?.("❌ " + (err.message || "Não foi possível gerar o Pix"), "#DC2626");
    } finally {
      setGerandoPix(false);
    }
  };

  // Reconfere o pagamento e credita as moedas — chamado pelo polling
  // automático abaixo. O backend reconfere com a Asaas antes de chamar a RPC
  // creditar_moedas, nunca confia só no que o front detectou.
  const confirmarPix = async (paymentId, manual = false) => {
    setConfirmandoPix(true);
    try {
      const r = await fetch(`${API_BASE}/api/moedas/confirmar-pix`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, email: userEmail, pacoteId: pacoteSelecionado.id }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.error === "pagamento_nao_confirmado") return false; // ainda pendente, segue no polling
        throw new Error(d.error || "Não foi possível confirmar o pagamento");
      }
      showToast?.(`🎉 ${pix.quantidade} moedas creditadas! Saldo: ${d.saldo}.`, G);
      onSuccess?.(d.saldo);
      return true;
    } catch (err) {
      // Mesmo bug crítico corrigido em PagamentoPlanoScreen (2026-08-31): o
      // polling abaixo só encerra quando esta função retorna true — uma
      // falha aqui não pode mais deixar o cliente preso pra sempre com o
      // Pix já pago e as moedas nunca creditando sozinhas. Silencioso nas
      // tentativas automáticas de propósito (evita spam de toast a cada 5s).
      if (manual) showToast?.("❌ " + (err.message || "Não foi possível confirmar o pagamento"), "#DC2626");
      return false;
    } finally {
      setConfirmandoPix(false);
    }
  };

  // Polling: consulta /api/status-pagamento a cada 5s enquanto o Pix estiver
  // pendente — mesmo mecanismo (e mesmos cuidados com visibilitychange/focus,
  // pro caso do app ir pra segundo plano enquanto a pessoa paga no banco) de
  // PagamentoPlanoScreen. CRÍTICO: só clearInterval() quando confirmarPix()
  // tiver sucesso de verdade — ver comentário completo em PagamentoPlanoScreen
  // (mesmo bug, mesma correção, 2026-08-31).
  const verificandoRef = useRef(false);
  const falhasConfirmacaoRef = useRef(0);
  useEffect(() => {
    if (!pix?.paymentId) return;
    falhasConfirmacaoRef.current = 0;

    const checar = async () => {
      if (verificandoRef.current) return;
      if (pix.expiresAt && new Date(pix.expiresAt) < new Date()) {
        clearInterval(interval);
        setPixExpirado(true);
        return;
      }
      verificandoRef.current = true;
      try {
        const r = await fetch(`${API_BASE}/api/status-pagamento/${pix.paymentId}`);
        const d = await r.json();
        if (d.isPaid) {
          const ok = await confirmarPix(pix.paymentId);
          if (ok) {
            clearInterval(interval);
          } else {
            falhasConfirmacaoRef.current += 1;
            if (falhasConfirmacaoRef.current === 3) {
              showToast?.("✅ Pagamento identificado! Só um instante enquanto confirmamos — não feche esta tela.", G);
            }
          }
        }
      } catch (e) {
      } finally {
        verificandoRef.current = false;
      }
    };

    const interval = setInterval(checar, 5000);
    const aoVoltarVisivel = () => { if (document.visibilityState === "visible") checar(); };
    document.addEventListener("visibilitychange", aoVoltarVisivel);
    window.addEventListener("focus", aoVoltarVisivel);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", aoVoltarVisivel);
      window.removeEventListener("focus", aoVoltarVisivel);
    };
  }, [pix?.paymentId]);

  const copiarPix = () => {
    if (!pix?.pixCode) return;
    navigator.clipboard?.writeText(pix.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", padding:"20px 16px 48px", fontFamily:"'Nunito', -apple-system, sans-serif" }}>
      {onBack && <button onClick={onBack} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", marginBottom:8 }}>←</button>}

      <h2 style={{ textAlign:"center", fontWeight:900, fontSize:21, color:"#1a1a2e", margin:"0 0 6px" }}>Comprar moedas</h2>
      <p style={{ textAlign:"center", color:"#666", fontSize:13.5, margin:"0 auto 22px", maxWidth:320 }}>
        Moedas dão o direito de responder oportunidades avulsas — 1 moeda vale R$ 2,50.
      </p>

      {!pix ? (
        <div style={{ maxWidth:420, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
          {carregandoPacotes ? (
            <p style={{ textAlign:"center", color:"#9CA3AF", fontSize:13 }}>Carregando pacotes...</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {pacotes.map(p => {
                const selected = pacoteId === p.id;
                return (
                  <div key={p.id} onClick={() => setPacoteId(p.id)} style={{
                    display:"flex", alignItems:"center", gap:12, borderRadius:14, cursor:"pointer", padding:"14px 16px",
                    border: selected ? `2px solid ${B}` : "1.5px solid #E5E7EB",
                    background: selected ? "#EBF4FF" : "white", transition:"all .15s",
                  }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", border:(selected?"2px solid "+B:"2px solid #D1D5DB"), background: selected ? B : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {selected && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontWeight:800, fontSize:14, color:"#1a1a2e", display:"flex", alignItems:"center", gap:6 }}>
                        <Coins size={15} color={B} /> {p.nome}
                      </p>
                      <p style={{ margin:0, fontSize:11, color:"#9CA3AF" }}>R$ {(p.preco_centavos / 100).toFixed(2).replace(".", ",")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <FormField IconComp={User} label="CPF do titular" error={errorCpf}>
            <input inputMode="numeric" placeholder="000.000.000-00" value={cpf}
              onChange={e => { setCpf(maskCpf(e.target.value)); if (errorCpf) setErrorCpf(""); }}
              style={{ ...REG_INPUT, borderColor: errorCpf ? "#E53935" : undefined }} />
          </FormField>

          <button onClick={gerarPix} disabled={gerandoPix || !pacoteSelecionado} style={{
            width:"100%", padding:"16px 0", borderRadius:16, border:"none",
            background: gerandoPix ? "#93C5FD" : `linear-gradient(135deg,${B},#0055d4)`,
            color:"white", fontWeight:900, fontSize:15, cursor: gerandoPix ? "default" : "pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          }}>
            {gerandoPix
              ? "Gerando código Pix..."
              : <>⚡ Gerar código Pix{pacoteSelecionado ? ` — R$ ${(pacoteSelecionado.preco_centavos / 100).toFixed(2).replace(".", ",")}` : ""}</>}
          </button>
        </div>
      ) : (
        <div style={{ maxWidth:420, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
          {pixExpirado ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <p style={{ fontSize:13.5, color:"#E53935", fontWeight:700, margin:"0 0 14px" }}>Esse código Pix expirou.</p>
              <button onClick={() => { setPix(null); setPixExpirado(false); }} style={{ padding:"12px 24px", borderRadius:12, border:"none", background:B, color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>
                Gerar novo código
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center" }}>
                {pix.qrCodeBase64 && (
                  <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix"
                    style={{ width:200, height:200, borderRadius:12, border:"3px solid #1a1a2e", display:"block", margin:"0 auto" }} />
                )}
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, background: confirmandoPix ? "#F0FDF4" : "#FFF9E6", border:`1px solid ${confirmandoPix ? "#BBF7D0" : "#FDE68A"}`, borderRadius:99, padding:"5px 14px", marginTop:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: confirmandoPix ? G : "#F59E0B" }} />
                  <span style={{ fontSize:11, fontWeight:800, color: confirmandoPix ? "#166534" : "#92400E" }}>
                    {confirmandoPix ? "Confirmando pagamento..." : "Aguardando pagamento"}
                  </span>
                </div>
              </div>

              <div style={{ background:"#F8FAFF", border:"1px solid #DBEAFE", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:10, fontWeight:800, color:"#3B82F6", textTransform:"uppercase", letterSpacing:.8, margin:"0 0 2px" }}>Ou copie o código Pix</p>
                  <p style={{ fontSize:11, fontWeight:800, color:"#1E3A8A", margin:0, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pix.pixCode}</p>
                </div>
                <button onClick={copiarPix} style={{ background:B, color:"white", border:"none", borderRadius:9, padding:"7px 14px", fontWeight:800, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                  {copiedPix ? "✓ Copiado" : "Copiar"}
                </button>
              </div>

              <p style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", margin:0 }}>
                Assim que o pagamento cair, as {pix.quantidade} moedas caem sozinhas no seu saldo — não precisa ficar recarregando a tela.
              </p>
            </>
          )}
        </div>
      )}
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
function AutonomyTermCard({ showToast, userEmail, aceitaEm, onAceito }) {
  const [showTerms,  setShowTerms]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const accepted = !!aceitaEm;

  const aceitar = async () => {
    if (!userEmail) { showToast?.("❌ Faça login pra aceitar o termo.", "#DC2626"); return; }
    setSaving(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("usuarios").update({ autonomia_aceita_em: agora }).eq("email", userEmail);
    setSaving(false);
    if (error) { showToast?.("❌ Erro ao registrar aceite: " + (error.message || ""), "#DC2626"); return; }
    onAceito?.(agora);
    showToast?.("✅ Termo de autonomia aceito!");
  };

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
                <button onClick={aceitar} disabled={saving} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:11, cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Salvando..." : "Aceitar Termo"}
                </button>
              ) : (
                <div style={{ flex:1, padding:"8px 0", borderRadius:10, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <Check size={13} color={G} />
                  <span style={{ fontSize:11, fontWeight:800, color:G }}>Aceito em {new Date(aceitaEm).toLocaleDateString("pt-BR")}</span>
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

// Status possíveis: "pending" | "uploading" | "frente_enviada" | "analysis" | "verified" | "rejected"
// "frente_enviada" só existe pro doc "rg" (RG/CNH exige frente E verso —
// ver handleFileSelect: só marca "analysis"/dispara a IA depois das duas).
const STATUS_CONFIG = {
  pending:        { label:"Pendente",       color:"#9CA3AF", bg:"#F5F5F5",  icon:null,    border:"#E5E7EB" },
  uploading:      { label:"Enviando…",      color:"#3B82F6", bg:"#EBF4FF",  icon:null,    border:"#93C5FD" },
  frente_enviada: { label:"Falta o verso",  color:"#3B82F6", bg:"#EFF6FF",  icon:"clock", border:"#93C5FD" },
  analysis:       { label:"Em análise",     color:"#F59E0B", bg:"#FFFBEB",  icon:"clock", border:"#FDE68A" },
  verified:       { label:"Verificado",     color:"#16a34a", bg:"#F0FDF4",  icon:"badge", border:"#BBF7D0" },
  rejected:       { label:"Reprovado",      color:"#DC2626", bg:"#FFF5F5",  icon:"x",     border:"#FECACA" },
};

function DocumentacaoSection({ showToast, docStatus: externalDocStatus, onDocStatusChange, userEmail }) {
  // Internal file/preview/progress state (stays local — não precisa ir pro Supabase)
  const [localDocs, setLocalDocs] = useState({
    rg:      { file:null, preview:null, progress:0 },
    crim:    { file:null, preview:null, progress:0 },
    address: { file:null, preview:null, progress:0 },
  });
  const [expandedDoc, setExpandedDoc] = useState(null);
  const fileRefs = { rg: useRef(), crim: useRef(), address: useRef() };

  // Merge external status with local file state
  const docs = {
    rg:      { ...localDocs.rg,      status: externalDocStatus?.rg      || "pending" },
    crim:    { ...localDocs.crim,     status: externalDocStatus?.crim    || "pending" },
    address: { ...localDocs.address,  status: externalDocStatus?.address || "pending" },
  }; // same as admin dashboard

  const DOC_STORAGE_PREFIX = { rg:"doc_rg", crim:"doc_crim", address:"doc_address" };

  const handleFileSelect = async (docId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    // RG/CNH exige as duas faces — a tela já dizia "Frente e verso legível"
    // mas nada impedia marcar "Em análise" com 1 foto só. side infere qual
    // lado é esta foto a partir do status atual: só "frente_enviada" pede o
    // verso, qualquer outro status (inclusive "Substituir documento" a
    // partir de analysis/verified/rejected) volta a pedir a frente.
    const isRg = docId === "rg";
    const side = isRg && docs.rg.status === "frente_enviada" ? "verso" : "frente";

    const preview = URL.createObjectURL(file);
    setLocalDocs(d => ({ ...d, [docId]: { ...d[docId], file, preview, progress:0 } }));
    onDocStatusChange?.(docId, "uploading");

    try {
      const ext = file.type.includes("png") ? "png" : file.type.includes("pdf") ? "pdf" : "jpg";
      const suffix = isRg ? `_${side}` : "";
      const path = `${DOC_STORAGE_PREFIX[docId]}${suffix}_${(userEmail||"anon").replace(/[^a-z0-9]/gi,"_")}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, file, { contentType: file.type, upsert: true, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const url = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
      setLocalDocs(d => ({ ...d, [docId]: { ...d[docId], progress:100 } }));

      if (isRg && side === "frente") {
        // Só a frente — ainda não completa. Fica "frente_enviada" até o
        // verso chegar; não dispara IA nem vira "analysis" com 1 foto só.
        if (userEmail) {
          const { error: dbErr } = await supabase.from("usuarios")
            .update({ doc_rg_status: "frente_enviada", doc_rg_url: url })
            .eq("email", userEmail);
          if (dbErr) throw dbErr;
        }
        onDocStatusChange?.("rg", "frente_enviada");
        showToast?.("✅ Frente enviada! Agora envie o verso do documento.", "#3B82F6");
        return;
      }

      if (isRg && side === "verso") {
        // 1 única chamada ao Supabase aqui (igual a frente) — não busca a
        // URL da frente no client antes de gravar. O backend já recebe o
        // email e busca as duas URLs (doc_rg_url + doc_rg_url_verso) pelo
        // client dele próprio; uma segunda leitura aqui no navegador logo
        // depois do upload já causou trava sem erro nenhum (mesma família
        // do bug de lock do supabase-js já visto no login desse projeto).
        if (userEmail) {
          const { error: dbErr } = await supabase.from("usuarios")
            .update({ doc_rg_status: "analysis", doc_rg_url_verso: url })
            .eq("email", userEmail);
          if (dbErr) throw dbErr;
        }
        onDocStatusChange?.("rg", "analysis");
        showToast?.("📋 Documento completo! Status: Em análise.", "#F59E0B");

        // Pré-checagem automática por IA — só um apoio pro admin revisar no
        // painel Multi Admin (nunca aprova sozinha). Dispara e esquece: se
        // falhar, não afeta o profissional em nada, a revisão humana segue
        // normal sem o parecer da IA. Manda só o email — o backend busca as
        // duas URLs (frente/verso) direto no banco, com o client dele.
        if (userEmail) {
          fetch(`${API_BASE}/api/documentos/analisar-ia`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
          }).catch(() => {});
        }
        return;
      }

      // Antecedentes Criminais / Comprovante de Endereço — documento único,
      // comportamento de sempre.
      if (userEmail) {
        const { error: dbErr } = await supabase.from("usuarios")
          .update({ [`doc_${docId}_status`]: "analysis", [`doc_${docId}_url`]: url })
          .eq("email", userEmail);
        if (dbErr) throw dbErr;
      }
      onDocStatusChange?.(docId, "analysis");
      showToast?.("📋 Documento enviado! Status: Em análise.", "#F59E0B");
    } catch (err) {
      onDocStatusChange?.(docId, isRg && side === "verso" ? "frente_enviada" : "pending");
      showToast?.("❌ Erro ao enviar documento: " + (err.message || ""), "#DC2626");
    }
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
            {/* hidden file input — accepts images + PDF.
                Achado 2026-08-18 (Fabio reportou o campo "indo direto pra
                foto" em vez de abrir o seletor normal): capture="environment"
                força o navegador mobile a pular o seletor de arquivo e abrir
                a câmera traseira direto — incompatível com o accept incluir
                application/pdf (câmera nunca produz PDF). Removido; sem
                capture, o mobile mostra o seletor normal do sistema (que já
                inclui "Câmera" como uma das opções, junto de galeria/
                arquivos/PDF), não perde a opção de tirar foto, só para de
                forçá-la como única. */}
            <input
              ref={fileRefs[doc.id]}
              type="file"
              accept="image/*,application/pdf"
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
                {/* Sempre o emoji genérico aqui — uma foto de RG/CNH inteira
                    espremida em 40x40 fica ilegível (e com frente/verso se
                    alternando no mesmo slot, parece uma miniatura bagunçada
                    tentando combinar as duas). O preview de verdade, legível,
                    já existe no card expandido logo abaixo. */}
                <div style={{ width:40, height:40, borderRadius:12, background:cfg.bg, border:`1.5px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, transition:"all .2s" }}>
                  {doc.icon}
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
                    <Camera size={16} />
                    {state.status === "rejected"
                      ? (doc.id === "rg" ? "Reenviar frente do documento" : "Reenviar documento")
                      : (doc.id === "rg" ? "Tirar foto da FRENTE" : "Tirar foto ou escolher arquivo")}
                  </button>
                )}

                {/* RG/CNH — falta o verso */}
                {doc.id === "rg" && state.status === "frente_enviada" && (
                  <button
                    onClick={() => fileRefs[doc.id].current?.click()}
                    style={{ width:"100%", padding:"12px 0", borderRadius:12, border:`1.5px dashed ${B}`, background:"#EBF4FF", color:B, fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:8 }}>
                    <Camera size={16} /> Tirar foto do VERSO
                  </button>
                )}

                {/* Re-upload when in analysis or verified */}
                {(state.status === "analysis" || state.status === "verified") && (
                  <button
                    onClick={() => fileRefs[doc.id].current?.click()}
                    style={{ width:"100%", padding:"10px 0", borderRadius:12, border:"1.5px solid #E5E7EB", background:"white", color:"#888", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:8 }}>
                    <Camera size={14} /> {doc.id === "rg" ? "Substituir documento (frente e verso)" : "Substituir documento"}
                  </button>
                )}

                {/* Preview thumbnail */}
                {state.preview && (
                  <div style={{ marginBottom:10 }}>
                    <img src={state.preview} alt="preview" style={{ width:"100%", maxHeight:140, objectFit:"cover", borderRadius:12, border:"1px solid #E5E7EB" }} />
                    <p style={{ fontSize:10, color:"#aaa", fontWeight:700, margin:"5px 0 0", textAlign:"center" }}>Documento enviado</p>
                  </div>
                )}

                {/* Frente enviada — falta o verso */}
                {doc.id === "rg" && state.status === "frente_enviada" && (
                  <div style={{ background:"#EFF6FF", border:"1px solid #93C5FD", borderRadius:10, padding:"10px 12px", display:"flex", gap:8 }}>
                    <Clock size={15} color="#3B82F6" style={{ flexShrink:0, marginTop:1 }} />
                    <p style={{ fontSize:12, color:"#1D4ED8", fontWeight:700, margin:0, lineHeight:1.5 }}>
                      Frente recebida! Falta o verso — o documento só entra em análise depois das duas fotos.
                    </p>
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
      <a href="/privacidade.html" target="_blank" rel="noopener noreferrer" style={{ display:"block", fontSize:11, color:"#ccc", textDecoration:"underline", marginBottom:8 }}>
        Política de Privacidade
      </a>
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
            <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
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

function ProfileScreen({ role, isPro, plano, planoStatus, planoExpiraEm, planoInicio, userName: initialUserName, userEmail, showRankingGlobal, onClearRankingGlobal, onUpgrade, onLogout, showToast, onOpenWallet, meusGanhos, saldoMoedas, onOpenComprarMoedas, onOpenAdmin, docStatus, onDocStatusChange, onSwitchRole }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [name, setName] = useState(initialUserName || "");
  const [whatsapp, setWhatsapp] = useState("");
  const [savingPerfil, setSavingPerfil] = useState(false);
  useEffect(() => { if (initialUserName) setName(initialUserName); }, [initialUserName]);
  // Antes disso, avatar/portfólio só viviam em sessionStorage/estado local —
  // nunca eram lidos do Supabase, então "salvavam" só até fechar a aba. O
  // WhatsApp já é coletado no cadastro (RegisterScreen), mas até aqui não
  // existia jeito nenhum de ver/corrigir depois — Editar Perfil não tinha
  // esse campo, então quem errou ou pulou o cadastro ficava sem contato
  // liberável pra sempre.
  const [autonomiaAceitaEm, setAutonomiaAceitaEm] = useState(null);
  // Cidade — antes só existia como cache de localStorage (multiLocation),
  // nunca editável no perfil (item 10 do prompt Ajustes de Cadastro/Perfil/
  // Fluxos). Fonte de verdade agora é usuarios.city.
  const [cidade, setCidade] = useState("");
  useEffect(() => {
    if (!userEmail) return;
    supabase.from("usuarios").select("foto_perfil_url,whatsapp,autonomia_aceita_em,city").eq("email", userEmail).maybeSingle()
      .then(({ data }) => { setAvatarUrl(data?.foto_perfil_url || null); setWhatsapp(data?.whatsapp || ""); setAutonomiaAceitaEm(data?.autonomia_aceita_em || null); setCidade(data?.city || ""); })
      .catch(() => {});
  }, [userEmail]);
  const [reputacao, setReputacao] = useState(null);
  useEffect(() => { fetchReputacao(userEmail).then(setReputacao); }, [userEmail]);
  // "Serviços contratados" (card de estatísticas do cliente) — antes era um "12"
  // fixo no JSX, sempre igual pra qualquer conta, inclusive recém-criada. Conta
  // pedidos que tiveram um profissional de fato aceito (contratado), não só
  // publicados — bate com o rótulo "contratados", diferente de "concluídos".
  const [servicosContratados, setServicosContratados] = useState(0);
  useEffect(() => {
    if (role !== "client" || !userEmail) return;
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("cliente_id", userEmail).not("profissional_aceito", "is", null)
      .then(({ count }) => setServicosContratados(count || 0))
      .catch(() => {});
  }, [role, userEmail]);
  const [portfolioImgs, setPortfolioImgs] = useState([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [categoriaServico, setCategoriaServico] = useState([]);
  // Mesma proteção contra corrida do ProfessionalHome: se o usuário já mudou a
  // categoria antes desse fetch inicial responder, não deixa a resposta antiga
  // sobrescrever a escolha recém-feita.
  const categoriaTocadaRef = useRef(false);
  // Limite de troca de categoria (2 na vida da conta, só na renovação/troca
  // de plano) — contador e marcador de ciclo vêm do banco (trocas_categoria_usadas/
  // trocas_categoria_ultimo_ciclo_em em "usuarios"), o gate de verdade é o
  // trigger trg_limita_troca_categoria no Postgres; isso aqui só decide UX
  // (habilitar "Editar" ou mostrar a mensagem de bloqueio).
  const [trocasCategoriaUsadas, setTrocasCategoriaUsadas] = useState(0);
  const [trocasCategoriaUltimoCiclo, setTrocasCategoriaUltimoCiclo] = useState(null);
  // Snapshot de categoriaServico no momento em que o editMode abre — usado só
  // pra saber, no Salvar, se a categoria realmente mudou (categoriaServico
  // vira o valor "em edição" enquanto editMode está true, sem persistir a
  // cada toggle como antes).
  const categoriaSnapshotRef = useRef([]);
  const prevEditModeRef = useRef(false);
  useEffect(() => {
    if (editMode && !prevEditModeRef.current) categoriaSnapshotRef.current = categoriaServico;
    prevEditModeRef.current = editMode;
  }, [editMode, categoriaServico]);
  useEffect(() => {
    if (role !== "professional" || !userEmail) return;
    supabase.from("usuarios").select("categoria_servico,bio,portfolio,trocas_categoria_usadas,trocas_categoria_ultimo_ciclo_em").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        if (!categoriaTocadaRef.current) setCategoriaServico(data?.categoria_servico || []);
        setBio(data?.bio || "");
        setPortfolioImgs((data?.portfolio || []).map(url => ({ id: url, url })));
        setTrocasCategoriaUsadas(data?.trocas_categoria_usadas || 0);
        setTrocasCategoriaUltimoCiclo(data?.trocas_categoria_ultimo_ciclo_em || null);
      })
      .catch(() => {});
  }, [role, userEmail]);
  // HANDOFF 2026-09-03: trava de "só troca categoria na renovação/troca de
  // plano" removida por decisão de negócio — profissional pode editar a
  // categoria de serviço a qualquer momento. Antes disso existia um limite
  // de 2 trocas na vida da conta, gateado por um trigger Postgres
  // (trg_limita_troca_categoria, dropado via supabase_remove_trava_troca_categoria_migration.sql)
  // e espelhado aqui só pra UX (habilitar "Editar" ou mostrar mensagem de
  // bloqueio). categoriaElegivel fica true sempre agora; a variável
  // continua existindo (em vez de remover todo mundo que a lê) só pra não
  // espalhar essa mudança em cascata pelo arquivo.
  const categoriaElegivel = true;

  // Teto de categorias vem de PLANO_LIMITES_USUARIO (Autônomo:1 grupo×1 profissão /
  // Pro:2 grupos×3 profissões cada / Premium:ilimitado — definido no topo do
  // arquivo, espelhado no backend). Importante: usa "plano" (id exato da
  // assinatura: "autonomo"/"pro"/"premium"), não "isPro" — isPro só indica
  // "tem alguma assinatura ativa" (inclui Autônomo), então usá-lo aqui deixava
  // o Autônomo sem limite nenhum assim que a trial/assinatura ficava ativa.
  // Sem plano ativo trata como Autônomo (teto mais restritivo) pra fins de
  // cadastro de categoria.
  const limitePlanoAtual = PLANO_LIMITES_USUARIO[plano];
  const isPlanoPro = plano === "pro";
  // 2026-08-10: voltou a ser um teto flat (nenhum agrupamento) — ver
  // PLANO_LIMITES_USUARIO acima.
  const limiteMaxCategorias = limitePlanoAtual ? (limitePlanoAtual.maxCategorias ?? undefined) : 1;

  // Categoria não grava mais sozinha a cada toggle (autosave) — com o limite
  // de 2 trocas na vida da conta, "1 sessão de edição = 1 troca", então cada
  // toggle só mexe no state local; a gravação de verdade acontece junto do
  // "Salvar" geral do perfil (topo da tela), que também é onde o contador de
  // trocas é conferido/incrementado (trigger trg_limita_troca_categoria).
  const handleSaveCategoria = (novasCategorias) => {
    categoriaTocadaRef.current = true;
    setCategoriaServico(novasCategorias);
  };

  const handleLimiteCategoria = () => {
    const proximoPlano = plano === "pro" ? "Multi Premium" : "Multi Pro";
    const cap = limiteMaxCategorias ?? 1;
    showToast?.(`⚠️ Seu plano permite até ${cap} categoria${cap === 1 ? "" : "s"} de serviço. Para cadastrar todos os serviços que você oferece, faça upgrade para o ${proximoPlano}.`, O);
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
      const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true, cacheControl: "31536000" });
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
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, f, { contentType: f.type, upsert: true, cacheControl: "31536000" });
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
          disabled={savingPerfil}
          onClick={async () => {
            if (editMode) {
              if (!userEmail) { showToast("❌ Não foi possível salvar — sessão sem e-mail.", "#DC2626"); return; }
              setSavingPerfil(true);
              // Nome e WhatsApp salvos juntos aqui — antes "Salvar" só mexia no
              // state local (name nunca era gravado; whatsapp tinha o update
              // mas rodava condicionado a um userEmail que a tela de cliente
              // nem recebia como prop, então nunca disparava). Depois de
              // salvar, relê do banco em vez de confiar no state local, pra
              // garantir que o que aparece na tela é o que está realmente
              // persistido (evita o mesmo bug voltar de outro jeito).
              const updates = { whatsapp: whatsapp || null, city: cidade.trim() || null };
              if (name.trim()) updates.name = name.trim();
              // Categoria só entra no UPDATE se realmente mudou nessa sessão de
              // edição. HANDOFF 2026-09-03: não existe mais trava de trocas —
              // trg_limita_troca_categoria foi dropado (ver
              // supabase_remove_trava_troca_categoria_migration.sql), então o
              // update abaixo não pode mais falhar por esse motivo.
              const categoriaMudou = role === "professional" && JSON.stringify(categoriaServico) !== JSON.stringify(categoriaSnapshotRef.current);
              if (categoriaMudou) updates.categoria_servico = categoriaServico;
              const { error } = await supabase.from("usuarios").update(updates).eq("email", userEmail);
              if (error) {
                setSavingPerfil(false);
                showToast("❌ " + (error.message || "Erro ao salvar perfil."), "#DC2626");
                return;
              }
              const { data } = await supabase.from("usuarios").select("name,whatsapp,foto_perfil_url,city,categoria_servico,trocas_categoria_usadas,trocas_categoria_ultimo_ciclo_em").eq("email", userEmail).maybeSingle();
              setSavingPerfil(false);
              if (data) {
                setName(data.name || "");
                setWhatsapp(data.whatsapp || "");
                setAvatarUrl(data.foto_perfil_url || null);
                setCidade(data.city || "");
                setCategoriaServico(data.categoria_servico || []);
                categoriaSnapshotRef.current = data.categoria_servico || [];
                setTrocasCategoriaUsadas(data.trocas_categoria_usadas || 0);
                setTrocasCategoriaUltimoCiclo(data.trocas_categoria_ultimo_ciclo_em || null);
                // multiLocation é a fonte que o resto do app lê pra mostrar
                // "sua região" (mural, header) — sem isso, editar a cidade
                // aqui não refletia em lugar nenhum fora do próprio perfil.
                if (data.city) localStorage.setItem("multiLocation", data.city);
              }
              showToast(categoriaMudou && updates.categoria_servico ? "✅ Perfil salvo! Categoria atualizada." : "✅ Perfil salvo!");
            }
            setEditMode(e => !e);
          }}
          style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,.2)", border:"none", borderRadius:99, padding:"6px 14px", color:"white", fontSize:12, fontWeight:800, cursor: savingPerfil ? "default" : "pointer", opacity: savingPerfil ? .6 : 1, display:"flex", alignItems:"center", gap:6 }}>
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
            {editMode ? (
              <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade"
                style={{ fontSize:12, fontWeight:700, color:"white", background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.4)", borderRadius:8, padding:"3px 10px", outline:"none", fontFamily:"inherit" }} />
            ) : (
              <span style={{ fontSize:12, color:"rgba(255,255,255,.65)", fontWeight:600 }}>{cidade || localStorage.getItem("multiLocation") || "Sua localização"}</span>
            )}
          </div>

          {/* WhatsApp — sem isso, a liberação de contato no chat (Fase 2)
              nunca tem um número pra mostrar. Editável aqui pra cobrir quem
              se cadastrou antes desse campo existir ou pulou/errou no
              cadastro. */}
          {editMode ? (
            <input
              value={whatsapp}
              onChange={e => setWhatsapp(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              style={{ fontSize:13, fontWeight:700, color:"white", background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.4)", borderRadius:10, padding:"6px 14px", textAlign:"center", outline:"none", fontFamily:"inherit", marginBottom:8 }}
            />
          ) : whatsapp ? (
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
              <MessageCircle size={12} color="rgba(255,255,255,.65)" />
              <span style={{ fontSize:12, color:"rgba(255,255,255,.65)", fontWeight:600 }}>{whatsapp}</span>
            </div>
          ) : (
            <div onClick={() => setEditMode(true)} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, cursor:"pointer", background:"rgba(255,193,7,.18)", border:"1px solid rgba(255,193,7,.5)", borderRadius:99, padding:"4px 12px" }}>
              <span style={{ fontSize:11, color:"#FFD54F", fontWeight:800 }}>⚠️ Cadastre seu WhatsApp para receber contato</span>
            </div>
          )}

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

          {/* Card "Meu saldo de moedas" / "Comprar" REMOVIDO daqui (2026-08-31)
              — desde o modelo de comissão (26/08+), profissional novo entra
              no plano "acesso" e nunca tem acesso a moedas (ver
              permiteComprarMoedas={role==="professional" && plano!=="acesso"}
              no gate de EscolherPlanoScreen), mas esse card aparecia pra
              TODO profissional aqui no perfil, comissão ou não — inclusive
              quem nunca vai conseguir comprar moeda nenhuma. Removido pra
              todo mundo, não só condicional a plano=="acesso" (decisão
              explícita: card genérico demais, mesmo grandfathered já vê o
              saldo/atalho de compra pela tela de Oportunidades quando faz
              sentido). saldoMoedas (prop/dado) e a rota "comprarmoedas"
              continuam intocados — outros pontos do app ainda dependem
              deles (ex.: "Responder por: X moedas" em ProfessionalHome,
              SemPlanoMoedaCard em EscolherPlanoScreen). */}

          {/* Categorias de serviço — obrigatória pra poder ficar online no Mural.
              Fora do editMode mostra só a lista já escolhida ("Você trabalha
              com: X, Y") em vez do grid de seleção inteiro — reaproveita o
              mesmo editMode do resto do perfil (topo da tela) em vez de um
              fluxo de edição próprio parecido com o cadastro (item 9 do
              prompt Ajustes de Cadastro/Perfil/Fluxos).
              HANDOFF 2026-09-03: trava de "só troca na renovação/troca de
              plano" removida — "Editar" agora fica sempre destravado
              (categoriaElegivel é sempre true, ver declaração acima). */}
          <div style={{ padding:"14px 16px 0" }}>
            <div style={{ background:"white", borderRadius:16, padding:16, boxShadow:"0 3px 14px rgba(0,0,0,.07)", border: categoriaServico.length ? "1px solid #F0F0F0" : "1.5px solid #FCA5A5" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:800, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:1.1 }}>Categorias de Serviço</p>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, color:B, fontSize:11.5, fontWeight:800, display:"flex", alignItems:"center", gap:4 }}>
                    <Pencil size={11} /> Editar
                  </button>
                )}
              </div>

              {!editMode ? (
                <>
                  {categoriaServico.length ? (
                    <p style={{ margin:0, fontSize:13.5, color:"#1a1a2e", lineHeight:1.6 }}>
                      Você trabalha com: <strong>{categoriaServico.map(id => CATS.find(c => c.id === id)?.label || id).join(", ")}</strong>
                    </p>
                  ) : (
                    <p style={{ margin:0, fontSize:12.5, color:"#E53935", fontWeight:700 }}>Nenhuma categoria selecionada — toque em Editar pra escolher.</p>
                  )}
                </>
              ) : (
                <>
                  <p style={{ margin:"0 0 10px", fontSize:11, color:"#9CA3AF" }}>
                    Necessárias pra ficar online e receber pedidos no Mural.
                    {limiteMaxCategorias != null && ` ${plano === "pro" ? "Multi Pro" : "Multi Autônomo"}: até ${limiteMaxCategorias} categoria${limiteMaxCategorias === 1 ? "" : "s"} de serviço.`}
                  </p>
                  <CategoriaMultiSelect
                    value={categoriaServico}
                    onChange={handleSaveCategoria}
                    max={limiteMaxCategorias}
                    onLimitReached={handleLimiteCategoria}
                  />
                  {plano !== "premium" && (
                    <button onClick={onUpgrade} style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", padding:0, color:O, fontSize:11.5, fontWeight:800 }}>
                      <Crown size={13} /> {plano === "pro" ? "QUERO SER MULTIPREMIUM" : "QUERO SER MULTIPRO"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Autonomy term */}
          <SectionLabel label="Termo de Autonomia" />
          <AutonomyTermCard showToast={showToast} userEmail={userEmail} aceitaEm={autonomiaAceitaEm} onAceito={setAutonomiaAceitaEm} />
          {/* Rótulo/preço do plano ativo — antes era um ternário binário
              plano==="pro"?Pro:Autônomo que mostrava "MULTI AUTÔNOMO ATIVO —
              R$29,90" pra QUALQUER plano que não fosse "pro" (Premium já
              caía errado aqui antes; achado ao adicionar a taxa de acesso —
              ver PLANO_ACESSO_INFO — que também cairia nesse mesmo bug).
              Busca em PLANOS_USUARIO (mesma fonte dos cards de
              EscolherPlanoScreen) em vez de duplicar label/preço num mapa novo. */}
          {(() => {
            const infoPlanoAtivo = plano === "acesso" ? PLANO_ACESSO_INFO : PLANOS_USUARIO.find(p => p.id === plano);
            const labelPlanoAtivo = infoPlanoAtivo?.label || "Multi Autônomo";
            const precoPlanoAtivo = infoPlanoAtivo?.price || "29,90";
            return (
          <div style={{ background:"white" }}>
            <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #F8F8F8" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ width:36, height:36, borderRadius:11, background:O+"18", display:"flex", alignItems:"center", justifyContent:"center" }}><Crown size={17} color={O} /></span>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e" }}>{isPro ? labelPlanoAtivo : "Multi Autônomo"}</p>
                  <p style={{ fontSize:11, color: isPro ? G : "#bbb", lineHeight:1.5 }}>
                    {planoStatus === "trial"
                      ? <>🎁 <strong>TESTE GRATUITO</strong>{planoExpiraEm ? ` — termina em ${new Date(planoExpiraEm).toLocaleDateString("pt-BR")}` : ""}</>
                      : isPro
                        ? plano === "acesso"
                          ? <>✅ <strong>{labelPlanoAtivo.toUpperCase()} ATIVO</strong> — R$ {precoPlanoAtivo} (entrada única, sem mensalidade)</>
                          : <>✅ <strong>{labelPlanoAtivo.toUpperCase()} ATIVO</strong> — R$ {precoPlanoAtivo}/mês{planoExpiraEm ? ` · próx. cobrança ${new Date(planoExpiraEm).toLocaleDateString("pt-BR")}` : ""}</>
                        : "❌ Nenhum plano ativo"}
                  </p>
                </div>
              </div>
              {isPro
                ? (plano !== "pro" && <button onClick={onUpgrade} style={{ background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:800, fontSize:11, padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer" }}>QUERO SER MULTIPRO</button>)
                : <button onClick={onUpgrade} style={{ background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:800, fontSize:11, padding:"6px 12px", borderRadius:99, border:"none", cursor:"pointer" }}>Escolher plano</button>}
            </div>
          </div>
            );
          })()}

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
          <DocumentacaoSection showToast={showToast} docStatus={docStatus} onDocStatusChange={onDocStatusChange} userEmail={userEmail} />
        </>
      )}

      {/* ── CLIENT SECTIONS ── */}
      {role === "client" && (
        <>
          <div style={{ padding:"0 16px", marginTop:-20, position:"relative", zIndex:2 }}>
            <div style={{ background:"white", borderRadius:20, padding:"14px 18px", boxShadow:"0 4px 20px rgba(0,0,0,.10)", border:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Serviços contratados</p>
                <p style={{ fontSize:22, fontWeight:900, color:"#1a1a2e" }}>{servicosContratados} <span style={{ fontSize:13, color:"#aaa", fontWeight:600 }}>no total</span></p>
              </div>
              <div style={{ width:1, height:38, background:"#F0F0F0" }} />
              <div style={{ flex:1, textAlign:"right" }}>
                <p style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:3 }}>Profissionais favoritos</p>
                {/* Sem tabela de favoritos pra cliente comum ainda (só existe
                    empresa_rede_favoritos, exclusiva de Empresa Plus) — fixo em
                    0 até esse recurso existir de verdade, em vez de inventar
                    dado. Ver lista abaixo, mesmo motivo. */}
                <p style={{ fontSize:22, fontWeight:900, color:O }}>0</p>
              </div>
            </div>
          </div>

          {/* Addresses — functional */}
          <AddressSection showToast={showToast} />

          {/* Favorites — sem recurso de favoritar profissional pra cliente
              ainda; lista sempre vazia até isso existir (ver comentário acima). */}
          <SectionLabel label="Profissionais Favoritos" />
          <div style={{ background:"white" }}>
            <p style={{ fontSize:12, color:"#bbb", textAlign:"center", padding:"16px 0", fontWeight:700 }}>
              Nenhum profissional favoritado ainda
            </p>
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
// Vocabulário real tem 6 estados (aberto/em_andamento/confirmado/executando/
// concluido/em_disputa); a tela tem 3 abas — em_andamento/confirmado/
// executando/em_disputa ficam juntas em "Em Andamento" (em_disputa ganha um
// badge extra de alerta). "confirmado" (Fase 4) = serviço agendado, com data/
// termo aceitos pelos dois lados, mas ainda não iniciado.
function isEmAndamentoTab(status) {
  return status === "em_andamento" || status === "confirmado" || status === "executando" || status === "em_disputa";
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
                <span style={{ fontSize:16, fontWeight:900, color:B, flexShrink:0 }}>{s.value != null ? `R$ ${s.value}` : "A combinar"}</span>
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
                {isEmAndamentoTab(s.status) ? `Orçamento ${(s.proposalValue ?? s.value) != null ? `R$ ${s.proposalValue || s.value}` : "a combinar"} confirmado 👍` : "✅ Serviço concluído"}
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


// Versão do Termo de Isenção de Responsabilidade exigido antes da liberação de
// contato (Fase 3). Se o texto mudar no futuro, muda TERMO_VERSAO junto
// (ex: "v2") pra rastrear quem aceitou qual versão em "aceites_termo".
const TERMO_VERSAO = "v1";
const TERMO_TEXTO = `Ao confirmar este serviço, você declara estar ciente de que:

• O Multi atua apenas como uma plataforma de conexão entre clientes e profissionais/empresas prestadoras de serviço, não fazendo parte da relação contratual entre as partes.

• O valor, prazo e condições do serviço foram negociados diretamente entre você e o(a) profissional/empresa através do chat, sendo de responsabilidade exclusiva das partes o cumprimento do que foi combinado.

• O Multi não realiza intermediação financeira: pagamentos são feitos diretamente entre cliente e profissional/empresa, fora da plataforma.

• O Multi não se responsabiliza pela qualidade, execução, prazo ou eventuais danos decorrentes do serviço prestado, cabendo às partes resolverem diretamente qualquer divergência.

• Em caso de problemas com o serviço, recomendamos buscar acordo direto com a outra parte. A avaliação pós-serviço ajuda a manter a qualidade da comunidade Multi.

Ao marcar a caixa abaixo, você confirma que leu e concorda com este termo.`;

// Mensagens rápidas (Fase 3) — um toque envia direto, sem digitar. Lista
// separada por lado porque as situações típicas de cada um são diferentes
// (quem presta o serviço avisa deslocamento/chegada, quem contrata confirma
// local/horário/valor).
const QUICK_MSGS_PROFISSIONAL = [
  "Estou a caminho, chego em [X] min 🚗",
  "Cheguei no local 📍",
  "Vou atrasar uns 15 min, desculpa ⏰",
  "Serviço concluído ✅",
  "Preciso confirmar o endereço",
  "Qual o melhor horário pra você?",
  "Vai precisar de material extra, posso te explicar",
];
const QUICK_MSGS_CLIENTE = [
  "Estou no local esperando 📍",
  "Pode confirmar o horário?",
  "Combinado, te espero! 👍",
  "Pode mandar uma foto do problema/serviço?",
  "Qual o valor final?",
  "Preciso remarcar, podemos conversar?",
];

// Barra de acompanhamento visual (Fase 6) — 5 etapas do ciclo de vida a
// partir do agendamento (antes disso, "em_andamento" ainda é negociação
// pura, sem nenhuma etapa concluída). Deriva do mesmo pedido que já é
// buscado por polling no resto do chat, sem fonte de dado extra.
const CHAT_STAGES = [
  { icon:"📅", label:"Agendado" },
  { icon:"📍", label:"Início do serviço" },
  { icon:"🛠️", label:"Em execução" },
  { icon:"✅", label:"Concluído" },
  { icon:"⭐", label:"Avaliação" },
];

function chatStageIndex(pedido) {
  if (!pedido) return -1;
  if (pedido.status === "concluido")  return 4; // falta só avaliar
  if (pedido.status === "executando") return 2;
  if (pedido.chegada_solicitada_em)   return 1;
  if (pedido.status === "confirmado") return 0;
  return -1; // ainda negociando (em_andamento) — nenhuma etapa concluída
}

function ChatProgressBar({ pedido }) {
  const idx = chatStageIndex(pedido);
  const n = CHAT_STAGES.length;
  return (
    <div style={{ flexShrink:0, background:"white", padding:"12px 16px 8px", borderBottom:"1px solid #F0F0F0" }}>
      <div style={{ display:"flex", alignItems:"flex-start", position:"relative" }}>
        <div style={{ position:"absolute", top:12, left:12, right:12, height:2, background:"#E5E7EB", zIndex:0 }} />
        <div style={{ position:"absolute", top:12, left:12, height:2, zIndex:1, transition:"width .5s", background:G, width: idx <= 0 ? 0 : `${(idx / (n - 1)) * (100 - 16)}%` }} />
        {CHAT_STAGES.map((s, i) => {
          const done   = i < idx;
          const active = i === idx;
          const col    = done || active ? G : "#D1D5DB";
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, position:"relative", zIndex:2 }}>
              <div style={{
                width:24, height:24, borderRadius:"50%",
                background: done ? G : active ? "white" : "#F3F4F6",
                border:`2px solid ${col}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: done ? 10 : 11,
                boxShadow: active ? `0 0 0 3px ${G}22` : "none",
                transition:"all .3s",
              }}>
                {done ? <Check size={11} color="white" /> : <span style={{ fontSize:11 }}>{s.icon}</span>}
              </div>
              <p style={{ fontSize:8.5, fontWeight: active ? 900 : 700, color: (done || active) ? "#1a1a2e" : "#B0B4C0", margin:0, textAlign:"center", lineHeight:1.15 }}>{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Chat de negociação real (Fase 1) — mensagens persistidas em "mensagens",
// chaveadas por pedido_id (um pedido em_andamento só tem uma proposta aceita,
// então pedido_id já desambigua a negociação sem precisar de proposta_id).
// Sem realtime: polling simples, consistente com o resto do app.
function NegociacaoChatScreen({ chat, meuEmail, onBack, showToast, plano, planoStatus, planoInicio, onUpgrade }) {
  const [mensagens, setMensagens] = useState([]);
  const [pedido,    setPedido]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [anexo,     setAnexo]     = useState(null); // { file, previewUrl, tipo, nome }
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [dataInput, setDataInput] = useState("");
  const [contraparteWhatsapp, setContraparteWhatsapp] = useState(null);
  const [profissionalRole, setProfissionalRole] = useState(null);
  const [aceitesTermo, setAceitesTermo] = useState([]);
  const [termoChecked, setTermoChecked] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Motivo de bloqueio retornado pelo endpoint /api/pedidos/confirmar-servico
  // (sem_plano_ativo | valor_excede_plano) — quando setado, o modal de
  // confirmação mostra a cópia de upgrade em vez do formulário. HANDOFF
  // 2026-09-03: "quota_excedida" (cota de serviços/mês) removido — não
  // existe mais teto de quantidade, só o de valor máximo por serviço.
  const [blockInfo, setBlockInfo] = useState(null);
  const [showTermoCompleto, setShowTermoCompleto] = useState(false);
  const [confirmandoServico, setConfirmandoServico] = useState(false);
  // Guarda se a promoção automática pedidos.status -> "confirmado" (useEffect
  // abaixo) falhou — sem isso a UI mostrava "🟢 Serviço agendado" só com base
  // em liberado/termoLiberado (client-side), mesmo quando o update no banco
  // dava erro (silent-fail igual ao que já tivemos na Fase 5). "tentativa"
  // é o gatilho manual de retry (o botão "Tentar novamente" incrementa).
  const [erroPromoverConfirmado, setErroPromoverConfirmado] = useState(false);
  const [tentativaPromoverConfirmado, setTentativaPromoverConfirmado] = useState(0);
  // Fluxo "propor valor": simétrico — cliente ou profissional podem propor
  // (ver supabase_chat_propostas_valor_migration.sql +
  // supabase_chat_propostas_valor_proposto_por_migration.sql — tabela
  // separada de "mensagens", que é imutável por design). Pode ter várias
  // rodadas: se recusado, quem recebeu a recusa pode propor de novo (nova
  // linha, não reaproveita a recusada). Só uma proposta pendente por vez
  // (garantido por índice único parcial no banco) — enquanto uma está
  // pendente, "Propor valor" fica desabilitado dos dois lados.
  const [propostasValor, setPropostasValor] = useState([]);
  const [showProporValor, setShowProporValor] = useState(false);
  const [valorProposto, setValorProposto] = useState("");
  const [enviandoProposta, setEnviandoProposta] = useState(false);
  const [respondendoPropostaId, setRespondendoPropostaId] = useState(null);
  const endRef = useRef(null);
  // Fade nas bordas da barra de mensagens rápidas — sinaliza que dá pra
  // arrastar pra ver mais chips, sem precisar de scrollbar visível.
  const quickMsgsRef = useRef(null);
  const [qmFade, setQmFade] = useState({ left: false, right: false });
  const checkQmFade = () => {
    const el = quickMsgsRef.current;
    if (!el) return;
    setQmFade({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };
  // Timestamp da última mensagem já recebida — permite que o poll de 5s
  // busque só mensagens novas (criado_em > isso) em vez de retransferir a
  // conversa inteira a cada ciclo, pra sempre, enquanto o chat fica aberto
  // (egress crescia sem necessidade com conversas longas). Resetado sempre
  // que troca de pedido, pra forçar carga completa do zero.
  const ultimaMensagemEmRef = useRef(null);

  const carregarMensagens = () => {
    let q = supabase.from("mensagens")
      .select("id,pedido_id,remetente_email,texto,criado_em,anexo_url,anexo_tipo,anexo_nome")
      .eq("pedido_id", chat.pedidoId).order("criado_em");
    if (ultimaMensagemEmRef.current) q = q.gt("criado_em", ultimaMensagemEmRef.current);
    q.then(({ data }) => {
        if (!data) return;
        if (data.length) ultimaMensagemEmRef.current = data[data.length - 1].criado_em;
        setMensagens(prev => {
          if (!ultimaMensagemEmRef.current || !prev.length) return data;
          const existentes = new Set(prev.map(m => m.id));
          const novas = data.filter(m => !existentes.has(m.id));
          return novas.length ? [...prev, ...novas] : prev;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Diferente de carregarMensagens: sempre busca a lista inteira (não só o
  // que é novo), porque uma proposta já vista pode mudar de status
  // (pendente -> aceita/recusada) e os dois lados precisam ver essa mudança
  // no próximo poll — não dá pra confiar só em "linhas novas desde X".
  const carregarPropostasValor = () => {
    supabase.from("chat_propostas_valor").select("id,pedido_id,profissional_email,proposto_por,valor,status,criado_em,respondido_em")
      .eq("pedido_id", chat.pedidoId).order("criado_em")
      .then(({ data }) => setPropostasValor(data || []))
      .catch(() => {});
  };

  const carregar = () => {
    carregarMensagens();
    carregarPropostasValor();
    supabase.from("pedidos")
      .select("cliente_id,cliente_nome,profissional_aceito,profissional_nome,aceite_formal_cliente_em,aceite_formal_profissional_em,data_agendada,valor,status,categoria,chegada_solicitada_em,inicio_confirmado_em,concluido_em")
      .eq("id", chat.pedidoId).maybeSingle()
      .then(({ data }) => setPedido(data || null))
      .catch(() => {});
    // Gate jurídico (Fase 3): cada lado precisa aceitar o Termo de Isenção de
    // Responsabilidade antes do WhatsApp aparecer, mesmo já tendo confirmado
    // a data (aceite_formal_*). Tabela separada porque isso rastreia versão
    // do termo aceito, e não é 1-pra-1 com uma coluna fixa como aceite_formal.
    // No máximo 2 linhas (uma por lado), então select(*) aqui não pesa.
    supabase.from("aceites_termo").select("*").eq("pedido_id", chat.pedidoId)
      .then(({ data }) => setAceitesTermo(data || []))
      .catch(() => {});
  };

  useEffect(() => {
    ultimaMensagemEmRef.current = null;
    carregar();
    const interval = setInterval(carregar, 5000);
    return () => clearInterval(interval);
  }, [chat.pedidoId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [mensagens]);

  // Busca o WhatsApp do outro lado da conversa assim que souber quem ele é —
  // o telefone já existe em "usuarios" (coletado no cadastro), só faltava
  // essa tela buscar e mostrar um botão de fato (antes só existia o texto
  // "telefone liberado", sem nenhum jeito de ligar/chamar no WhatsApp).
  useEffect(() => {
    if (!pedido) { setContraparteWhatsapp(null); return; }
    const souCliente = pedido.cliente_id === meuEmail;
    const contraparteEmail = souCliente ? pedido.profissional_aceito : pedido.cliente_id;
    if (!contraparteEmail) { setContraparteWhatsapp(null); return; }
    supabase.from("usuarios").select("whatsapp").eq("email", contraparteEmail).maybeSingle()
      .then(({ data }) => setContraparteWhatsapp(data?.whatsapp || null))
      .catch(() => setContraparteWhatsapp(null));
  }, [pedido?.cliente_id, pedido?.profissional_aceito, meuEmail]);

  // Restrição de WhatsApp (Fase 1): profissional autônomo (role "professional")
  // nunca libera WhatsApp — toda comunicação fica no chat interno do Multi.
  // Empresa parceira (role "empresa") continua liberando normalmente. Busca o
  // role de quem prestou o serviço direto pelo email do pedido (independe de
  // quem está olhando a tela), e assume bloqueado por padrão até confirmar
  // que é empresa, pra nunca vazar o botão enquanto o role ainda carrega.
  useEffect(() => {
    if (!pedido?.profissional_aceito) { setProfissionalRole(null); return; }
    supabase.from("usuarios").select("role").eq("email", pedido.profissional_aceito).maybeSingle()
      .then(({ data }) => setProfissionalRole(data?.role || null))
      .catch(() => setProfissionalRole(null));
  }, [pedido?.profissional_aceito]);

  // Avisa o outro lado da conversa (push + sino in-app) — mesmo padrão de
  // handleAceitarProposta lá em App(). Debounce
  // simples (1 aviso a cada 30s por pedido) pra não floodar quando a pessoa
  // manda várias mensagens seguidas rapidamente.
  const lastChatNotifRef = useRef(0);
  const notificarOutroLado = (titulo, mensagem) => {
    if (!pedido) return;
    const souCliente = pedido.cliente_id === meuEmail;
    const destinatario = souCliente ? pedido.profissional_aceito : pedido.cliente_id;
    if (!destinatario || destinatario === meuEmail) return;
    const agora = Date.now();
    if (agora - lastChatNotifRef.current < 30000) return;
    lastChatNotifRef.current = agora;
    fetch(`${NOTIFY_API}/notify-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: destinatario, heading: titulo, content: mensagem }),
    }).catch(() => {});
    supabase.from("notificacoes").insert({
      destinatario_email: destinatario,
      titulo,
      mensagem,
      pedido_id: chat.pedidoId,
    }).then(() => {});
  };

  // Fase 2 — anexos (foto/vídeo/arquivo): seleção só monta a preview local
  // (URL.createObjectURL), o upload de fato só acontece no envio, junto com
  // a mensagem — evita subir arquivo pro storage e o usuário desistir antes
  // de mandar. Limite de 20MB alinhado com o que o Supabase free tier aguenta
  // bem num upload direto do client.
  const ANEXO_MAX_BYTES = 20 * 1024 * 1024;
  const handleSelecionarAnexo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > ANEXO_MAX_BYTES) { alert("Arquivo muito grande (máximo 20MB)."); return; }
    const tipo = file.type.startsWith("image/") ? "imagem" : file.type.startsWith("video/") ? "video" : "arquivo";
    const previewUrl = tipo === "arquivo" ? null : URL.createObjectURL(file);
    setAnexo({ file, previewUrl, tipo, nome: file.name });
  };
  const cancelarAnexo = () => {
    if (anexo?.previewUrl) URL.revokeObjectURL(anexo.previewUrl);
    setAnexo(null);
  };

  // Insert + notificação, compartilhado entre envio normal (texto/anexo) e
  // mensagem rápida (Fase 3) — as duas só diferem em como chegam no texto.
  const enviarMensagem = (texto, anexoFields = {}) => {
    return supabase.from("mensagens").insert({ pedido_id: chat.pedidoId, remetente_email: meuEmail, texto, ...anexoFields })
      .then(() => {
        carregar();
        const meuNome = pedido?.cliente_id === meuEmail ? pedido?.cliente_nome : pedido?.profissional_nome;
        notificarOutroLado("Nova mensagem 💬", `${meuNome || "Alguém"} enviou uma mensagem${chat.serviceTitle ? ` sobre "${chat.serviceTitle}"` : ""}.`);
      });
  };

  const enviar = async () => {
    const texto = text.trim();
    if ((!texto && !anexo) || sending || enviandoAnexo) return;
    setSending(true);
    let anexoFields = {};
    try {
      if (anexo) {
        setEnviandoAnexo(true);
        const ext = anexo.nome.includes(".") ? anexo.nome.split(".").pop() : "bin";
        const path = `chat_${chat.pedidoId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, anexo.file, { contentType: anexo.file.type, upsert: true, cacheControl: "31536000" });
        if (upErr) throw upErr;
        const anexoUrl = supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
        anexoFields = { anexo_url: anexoUrl, anexo_tipo: anexo.tipo, anexo_nome: anexo.nome };
      }
    } catch (err) {
      setSending(false);
      setEnviandoAnexo(false);
      alert("Erro ao enviar anexo: " + (err.message || ""));
      return;
    }
    setEnviandoAnexo(false);
    setText("");
    cancelarAnexo();
    enviarMensagem(texto, anexoFields).catch(() => {}).finally(() => setSending(false));
  };

  // Mensagem rápida (Fase 3): um toque envia direto, sem passar pelo campo
  // de texto — por isso não interage com anexo/preview, é sempre só texto.
  const enviarRapida = (texto) => {
    if (sending || enviandoAnexo) return;
    setSending(true);
    enviarMensagem(texto).catch(() => {}).finally(() => setSending(false));
  };

  // Aceite formal (Fase 2): gate de liberação de telefone. Cada lado aceita no
  // máximo uma vez — 1-pra-1 com a linha de "pedidos", sem tabela separada.
  const souCliente  = pedido?.cliente_id === meuEmail;
  useEffect(() => { checkQmFade(); }, [pedido, souCliente]);
  const meuAceite   = pedido && (souCliente ? pedido.aceite_formal_cliente_em : pedido.aceite_formal_profissional_em);
  const liberado    = !!(pedido?.aceite_formal_cliente_em && pedido?.aceite_formal_profissional_em);

  // Gate jurídico (Fase 3): além da confirmação mútua de data (liberado acima),
  // cada lado também precisa aceitar o Termo de Isenção de Responsabilidade
  // antes do WhatsApp de fato aparecer.
  const contraparteEmail = pedido ? (souCliente ? pedido.profissional_aceito : pedido.cliente_id) : null;
  const meuAceiteTermo   = aceitesTermo.some(a => a.usuario_id === meuEmail);
  const outroAceiteTermo = aceitesTermo.some(a => a.usuario_id === contraparteEmail);
  const termoLiberado    = meuAceiteTermo && outroAceiteTermo;

  // Bloqueado por padrão (inclusive enquanto profissionalRole ainda carrega);
  // só libera quando confirmado que o role é "empresa".
  const whatsappBloqueado = profissionalRole !== "empresa";

  // "Propor valor": qualquer um dos dois lados pode propor, contanto que não
  // haja proposta pendente ainda sem resposta (regra reforçada pelo índice
  // único parcial da migration — o insert falha se violar). "profissional_email"
  // continua guardando o email do profissional do pedido (não muda de
  // significado), quem de fato propôs fica em "proposto_por". Aceitar
  // atualiza pedidos.valor direto com o valor proposto.
  const propostaPendente = propostasValor.find(p => p.status === "pendente");
  const proporValor = () => {
    const valor = Number(valorProposto);
    if (!valor || valor <= 0 || enviandoProposta || propostaPendente) return;
    setEnviandoProposta(true);
    supabase.from("chat_propostas_valor").insert({
      pedido_id: chat.pedidoId, profissional_email: pedido?.profissional_aceito, valor, status: "pendente",
      proposto_por: souCliente ? "cliente" : "profissional",
    }).then(({ error }) => {
      if (error) throw error;
      setShowProporValor(false);
      setValorProposto("");
      carregar();
      const meuNome = souCliente ? pedido?.cliente_nome : pedido?.profissional_nome;
      notificarOutroLado("Nova proposta de valor 💰", `${meuNome || "Alguém"} propôs R$ ${valor} pelo serviço.`);
    }).catch((err) => {
      console.error("proporValor:", err);
      showToast?.("Não foi possível propor o valor: " + (err.message || ""), "#DC2626");
    }).finally(() => setEnviandoProposta(false));
  };

  const responderProposta = (item, aceitar) => {
    if (respondendoPropostaId) return;
    setRespondendoPropostaId(item.id);
    supabase.from("chat_propostas_valor")
      .update({ status: aceitar ? "aceita" : "recusada", respondido_em: new Date().toISOString() })
      .eq("id", item.id)
      .then(async ({ error }) => {
        if (error) throw error;
        if (aceitar) {
          const { error: errValor } = await supabase.from("pedidos").update({ valor: item.valor }).eq("id", chat.pedidoId);
          if (errValor) throw errValor;
        }
        carregar();
        notificarOutroLado(
          aceitar ? "Valor aceito ✅" : "Valor recusado",
          aceitar ? `O valor de R$ ${item.valor} foi aceito.` : `O valor de R$ ${item.valor} foi recusado — você pode propor outro.`
        );
      })
      .catch((err) => {
        console.error("responderProposta:", err);
        showToast?.("Não foi possível responder a proposta: " + (err.message || ""), "#DC2626");
      })
      .finally(() => setRespondendoPropostaId(null));
  };

  // Fase 4 — "Confirmar Serviço": uma única ação por usuário que substitui os
  // dois aceites separados de antes (data + termo) por um resumo com os dois
  // já dentro do mesmo modal. Cada parte só grava o que ainda falta desse
  // usuário — se ele já tinha aceitado antes (pedido criado antes da Fase 4,
  // ou reabriu o modal depois de já ter confirmado a data), não repete o
  // write. Quando os dois lados completam os dois aceites, o efeito abaixo
  // promove pedidos.status pra "confirmado" e o chat mostra "🟢 Serviço agendado".
  const confirmarServico = () => {
    if (!pedido || confirmandoServico) return;
    if (!pedido.data_agendada && !dataInput) return;
    if (!meuAceiteTermo && !termoChecked) return;
    setConfirmandoServico(true);
    setBlockInfo(null);

    const tasks = [];
    if (!meuAceiteTermo) {
      tasks.push(supabase.from("aceites_termo").upsert(
        { pedido_id: chat.pedidoId, usuario_id: meuEmail, versao_termo: TERMO_VERSAO },
        { onConflict: "pedido_id,usuario_id" }
      ));
    }

    // Lado cliente: sem cota/limite de plano nenhum — continua escrita direta.
    if (souCliente) {
      if (!meuAceite) {
        const updates = { aceite_formal_cliente_em: new Date().toISOString() };
        if (!pedido.data_agendada) updates.data_agendada = new Date(dataInput).toISOString();
        tasks.push(supabase.from("pedidos").update(updates).eq("id", chat.pedidoId));
      }
      Promise.all(tasks)
        .then((results) => {
          const failed = results.find(r => r?.error)?.error;
          if (failed) throw failed;
          carregar();
          setShowConfirmModal(false);
          notificarOutroLado("Serviço confirmado ✅", `${pedido.cliente_nome || "O outro lado"} confirmou o serviço${chat.serviceTitle ? ` "${chat.serviceTitle}"` : ""}.`);
        })
        .catch((err) => {
          console.error("confirmarServico:", err);
          showToast?.("Não foi possível confirmar o serviço: " + (err.message || "tente novamente."), "#DC2626");
        })
        .finally(() => setConfirmandoServico(false));
      return;
    }

    // Lado profissional: aceite_formal_profissional_em só pode ser gravado
    // pelo backend (o trigger trg_lock_aceite_formal_profissional trava
    // escrita direta via chave anon) — é ali que mora a checagem real de
    // plano ativo e valor máximo (PLANO_LIMITES_USUARIO). Cota mensal de
    // serviços removida (HANDOFF 2026-09-03) — essa confirmação não consome
    // mais limite nenhum.
    const aceitePromise = meuAceite
      ? Promise.resolve({ ok: true })
      : fetch(`${API_BASE}/api/pedidos/confirmar-servico`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pedidoId: chat.pedidoId,
            profissionalEmail: meuEmail,
            dataAgendada: pedido.data_agendada ? undefined : new Date(dataInput).toISOString(),
          }),
        }).then(async (r) => {
          const body = await r.json().catch(() => ({}));
          if (!r.ok) { const e = new Error(body.error || "bloqueado"); e.blockInfo = body; throw e; }
          return { ok: true };
        });

    Promise.all([aceitePromise, ...tasks])
      .then((results) => {
        const failed = results.find(r => r?.error)?.error;
        if (failed) throw failed;
        carregar();
        setShowConfirmModal(false);
        notificarOutroLado("Serviço confirmado ✅", `${pedido.profissional_nome || "O outro lado"} confirmou o serviço${chat.serviceTitle ? ` "${chat.serviceTitle}"` : ""}.`);
      })
      .catch((err) => {
        if (err?.blockInfo?.error) { setBlockInfo(err.blockInfo); return; }
        console.error("confirmarServico:", err);
        showToast?.("Não foi possível confirmar o serviço: " + (err.message || "tente novamente."), "#DC2626");
      })
      .finally(() => setConfirmandoServico(false));
  };

  // Assim que os dois lados completam data + termo, promove o pedido pra
  // "confirmado" — guard em pedido.status evita repetir o update a cada
  // poll de 5s depois que já virou "confirmado" (ou já passou disso).
  // Se der erro (ex.: constraint do banco desatualizada), NÃO faz sentido
  // deixar a UI só de "liberado && termoLiberado" mostrando "🟢 Serviço
  // agendado" como se tivesse dado certo — por isso erroPromoverConfirmado
  // vira o gate real do banner de sucesso (ver JSX abaixo).
  useEffect(() => {
    if (!pedido || pedido.status !== "em_andamento") return;
    if (liberado && termoLiberado) {
      setErroPromoverConfirmado(false);
      supabase.from("pedidos").update({ status: "confirmado" }).eq("id", chat.pedidoId)
        .then(({ error }) => {
          if (error) {
            console.error("promover status confirmado:", error);
            setErroPromoverConfirmado(true);
            showToast?.("Não foi possível confirmar o agendamento: " + (error.message || "tente novamente."), "#DC2626");
            return;
          }
          carregar();
        });
    }
  }, [liberado, termoLiberado, pedido?.status, tentativaPromoverConfirmado]);

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

  // Intercala mensagens normais com propostas de valor por criado_em, pra
  // renderizar tudo numa timeline só (a proposta aparece como um card no
  // lugar certo da conversa, não numa lista separada).
  const feed = [
    ...mensagens.map(m => ({ ...m, __tipo: "mensagem" })),
    ...propostasValor.map(p => ({ ...p, __tipo: "proposta_valor" })),
  ].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));

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
          {liberado && termoLiberado && !whatsappBloqueado && contraparteWhatsapp && (
            <a
              href={`https://wa.me/55${contraparteWhatsapp.replace(/\D/g, "")}`}
              target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#25D366,#1EBE57)", borderRadius:20, padding:"8px 12px", textDecoration:"none", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}
            >
              <MessageCircle size={14} color="white" />
              <span style={{ color:"white", fontWeight:800, fontSize:11.5, whiteSpace:"nowrap" }}>{maskPhone(contraparteWhatsapp)}</span>
            </a>
          )}
        </div>
      </div>

      {/* Fase 6 — barra de acompanhamento visual: reflete o status real do
          pedido em tempo real (mesmo polling de 5s do resto do chat), do
          agendamento até a avaliação. */}
      {pedido && <ChatProgressBar pedido={pedido} />}

      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {loading && <p style={{ textAlign:"center", color:"#aaa", fontSize:13 }}>Carregando...</p>}
        {!loading && feed.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 24px", color:"#ccc" }}>
            <MessageCircle size={36} color="#E0E0E0" style={{ margin:"0 auto 12px", display:"block" }} />
            <p style={{ fontSize:13, fontWeight:700 }}>Nenhuma mensagem ainda</p>
            <p style={{ fontSize:12, marginTop:4 }}>Envie a primeira mensagem pra combinar os detalhes.</p>
          </div>
        )}
        {feed.map(item => {
          if (item.__tipo === "proposta_valor") {
            // "minha" = fui eu quem propôs essa rodada (define o lado da bolha
            // e quem responde) — não depende mais de ser sempre o profissional.
            const propostoPorCliente = item.proposto_por === "cliente";
            const minha = propostoPorCliente === souCliente;
            const podeResponder = item.status === "pendente" && !minha;
            const respondendo = respondendoPropostaId === item.id;
            const corStatus = item.status === "aceita" ? G : item.status === "recusada" ? "#DC2626" : O;
            const labelStatus = item.status === "aceita" ? "✅ Valor aceito" : item.status === "recusada" ? "❌ Valor recusado" : "💰 Proposta de valor";
            return (
              <div key={`pv-${item.id}`} style={{ display:"flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth:"78%", padding:"12px 14px", borderRadius:14, background:"white", border:`1.5px solid ${corStatus}`, boxShadow:"0 1px 4px rgba(0,0,0,.07)" }}>
                  <p style={{ fontSize:11, fontWeight:800, color:corStatus, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:.4 }}>{labelStatus}</p>
                  <p style={{ fontSize:19, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>R$ {item.valor}</p>
                  {podeResponder ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => responderProposta(item, false)} disabled={respondendo} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"1.5px solid #E5E7EB", background:"white", color:"#555", fontWeight:800, fontSize:12, cursor: respondendo ? "default" : "pointer" }}>
                        Recusar
                      </button>
                      <button onClick={() => responderProposta(item, true)} disabled={respondendo} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:G, color:"white", fontWeight:800, fontSize:12, cursor: respondendo ? "default" : "pointer" }}>
                        Aceitar
                      </button>
                    </div>
                  ) : item.status === "pendente" ? (
                    <p style={{ fontSize:11.5, color:"#888", margin:0 }}>Aguardando resposta {propostoPorCliente ? "do profissional" : "do cliente"}...</p>
                  ) : null}
                  <p style={{ fontSize:10, margin:"6px 0 0", textAlign:"right", color:"#bbb" }}>{horaFmt(item.criado_em)}</p>
                </div>
              </div>
            );
          }
          const m = item;
          const minha = m.remetente_email === meuEmail;
          return (
            <div key={m.id} style={{ display:"flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth:"78%", padding: m.anexo_tipo === "imagem" || m.anexo_tipo === "video" ? 6 : "9px 13px", borderRadius:14,
                borderBottomRightRadius: minha ? 4 : 14, borderBottomLeftRadius: minha ? 14 : 4,
                background: minha ? B : "white", color: minha ? "white" : "#1a1a2e",
                boxShadow: minha ? "none" : "0 1px 4px rgba(0,0,0,.07)",
              }}>
                {m.anexo_tipo === "imagem" && m.anexo_url && (
                  <a href={m.anexo_url} target="_blank" rel="noreferrer">
                    <img src={m.anexo_url} alt="Anexo" style={{ display:"block", maxWidth:"100%", maxHeight:260, borderRadius:10, marginBottom: m.texto ? 6 : 0 }} />
                  </a>
                )}
                {m.anexo_tipo === "video" && m.anexo_url && (
                  <video src={m.anexo_url} controls style={{ display:"block", maxWidth:"100%", maxHeight:260, borderRadius:10, marginBottom: m.texto ? 6 : 0 }} />
                )}
                {m.anexo_tipo === "arquivo" && m.anexo_url && (
                  <a href={m.anexo_url} target="_blank" rel="noreferrer" style={{
                    display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, textDecoration:"none",
                    background: minha ? "rgba(255,255,255,.15)" : "#F8F9FA", marginBottom: m.texto ? 6 : 0,
                  }}>
                    <FileText size={18} color={minha ? "white" : "#555"} style={{ flexShrink:0 }} />
                    <span style={{ fontSize:12.5, fontWeight:700, color: minha ? "white" : "#333", wordBreak:"break-word", flex:1 }}>{m.anexo_nome || "Arquivo"}</span>
                    <Download size={15} color={minha ? "white" : "#555"} style={{ flexShrink:0 }} />
                  </a>
                )}
                {m.texto && (
                  <p style={{ fontSize:13.5, lineHeight:1.4, margin:0, padding: m.anexo_tipo ? "0 6px" : 0, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{m.texto}</p>
                )}
                <p style={{ fontSize:10, margin:"4px 0 0", padding: m.anexo_tipo ? "0 6px" : 0, textAlign:"right", color: minha ? "rgba(255,255,255,.7)" : "#bbb" }}>{horaFmt(m.criado_em)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {pedido && mensagens.length > 0 && (
        (liberado && termoLiberado && erroPromoverConfirmado) ? (
          // Os dois lados já aceitaram, mas o update pedidos.status="confirmado"
          // falhou (ex.: banco ainda sem o valor no check constraint — ver
          // supabase_pedidos_confirmado_migration.sql). Mostra erro de verdade
          // em vez de fingir sucesso, com retry manual.
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#FEF2F2", border:"1px solid #FCA5A5" }}>
            <p style={{ fontSize:12.5, fontWeight:800, color:"#DC2626", margin:0 }}>⚠️ Não foi possível confirmar o agendamento</p>
            <p style={{ fontSize:11.5, color:"#7F1D1D", margin:"4px 0 8px" }}>Os dois lados já aceitaram, mas o servidor recusou o registro. Tente novamente — se persistir, é um problema no nosso lado.</p>
            <button
              onClick={() => setTentativaPromoverConfirmado(t => t + 1)}
              style={{ width:"100%", padding:"9px 0", borderRadius:10, border:"none", background:"#DC2626", color:"white", fontWeight:800, fontSize:12.5, cursor:"pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        ) : (liberado && termoLiberado && pedido.status !== "em_andamento") ? (
          // pedido.status !== "em_andamento" (e não só "=== confirmado") porque
          // esse mesmo banner também cobre "executando"/"concluido"/"em_disputa"
          // — uma vez promovido, o pedido nunca mais volta a "em_andamento".
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#F0FDF4", border:`1px solid ${G}44` }}>
            <p style={{ fontSize:12.5, fontWeight:800, color:G, margin:0 }}>🟢 Serviço agendado</p>
            {pedido.data_agendada && (
              <p style={{ fontSize:12, fontWeight:700, color:G, margin:"4px 0 0" }}>📅 {dataAgendadaFmt(pedido.data_agendada)}</p>
            )}
            {whatsappBloqueado ? (
              <div style={{ marginTop:8, display:"flex", alignItems:"flex-start", gap:7, padding:"9px 11px", borderRadius:10, background:"white", border:"1px solid #E5E7EB" }}>
                <Lock size={13} color="#666" style={{ flexShrink:0, marginTop:1 }} />
                <p style={{ fontSize:11.5, color:"#555", lineHeight:1.4, margin:0 }}>
                  Por segurança e para garantir o acompanhamento do serviço, a comunicação entre cliente e profissional acontece pelo chat do MULTI.
                </p>
              </div>
            ) : contraparteWhatsapp ? (
              <a
                href={`https://wa.me/55${contraparteWhatsapp.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                style={{ marginTop:8, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg,#25D366,#1EBE57)", color:"white", fontWeight:800, fontSize:12.5, textDecoration:"none" }}
              >
                <MessageCircle size={14} /> Chamar no WhatsApp: {maskPhone(contraparteWhatsapp)}
              </a>
            ) : (
              <p style={{ fontSize:11.5, color:"#B45309", margin:"6px 0 0" }}>⚠️ O outro lado ainda não cadastrou um WhatsApp — peça pra completar o perfil.</p>
            )}
          </div>
        ) : (liberado && termoLiberado) ? (
          // Os dois já aceitaram e o update ainda está em voo (efeito acima
          // acabou de disparar) — evita piscar "agendado" antes de confirmar
          // que o banco realmente gravou.
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB" }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:"#555", margin:0 }}>⏳ Confirmando agendamento...</p>
          </div>
        ) : (meuAceite && meuAceiteTermo) ? (
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB" }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:"#555", margin:0 }}>✅ Você confirmou o serviço. Aguardando confirmação do outro lado.</p>
            {pedido.data_agendada && (
              <p style={{ fontSize:12, color:"#888", margin:"4px 0 0" }}>📅 Data proposta: {dataAgendadaFmt(pedido.data_agendada)}</p>
            )}
          </div>
        ) : (
          <div style={{ flexShrink:0, margin:"0 14px 10px", padding:"10px 14px", borderRadius:12, background:"#EFF6FF", border:`1px solid ${B}33` }}>
            <p style={{ fontSize:12, color:"#555", margin:"0 0 8px" }}>
              {pedido.data_agendada
                ? <>📅 Data proposta: <strong>{dataAgendadaFmt(pedido.data_agendada)}</strong>. Confirme o serviço pra travar os detalhes.</>
                : "Já combinaram os detalhes? Confirme o serviço pra travar data, horário e valor."}
            </p>
            <button
              onClick={() => { setBlockInfo(null); setShowConfirmModal(true); }}
              style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none", background:B, color:"white", fontWeight:800, fontSize:12.5, cursor:"pointer" }}
            >
              ✅ Confirmar Serviço
            </button>
          </div>
        )
      )}

      {pedido && (
        <div style={{ flexShrink:0, margin:"0 14px 8px" }}>
          <button
            onClick={() => setShowProporValor(true)}
            disabled={enviandoProposta || !!propostaPendente}
            style={{
              width:"100%", padding:"9px 0", borderRadius:10, border:`1.5px solid ${O}55`, background:"#FFF7ED", color:O, fontWeight:800, fontSize:12.5,
              cursor: (enviandoProposta || propostaPendente) ? "default" : "pointer",
              opacity: propostaPendente ? .5 : 1,
            }}
          >
            💰 {propostaPendente ? "Proposta pendente" : "Propor valor"}
          </button>
        </div>
      )}

      {pedido && (
        <div style={{ position:"relative", flexShrink:0, margin:"0 14px 8px" }}>
          <div
            ref={quickMsgsRef}
            onScroll={checkQmFade}
            style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:2, scrollSnapType:"x proximity" }}
          >
            {(souCliente ? QUICK_MSGS_CLIENTE : QUICK_MSGS_PROFISSIONAL).map((msg, i) => (
              <button
                key={i}
                onClick={() => enviarRapida(msg)}
                disabled={sending}
                style={{ flexShrink:0, scrollSnapAlign:"start", padding:"8px 13px", borderRadius:99, border:`1.5px solid ${B}33`, background:"white", color:B, fontWeight:700, fontSize:12, cursor: sending ? "default" : "pointer", whiteSpace:"nowrap", opacity: sending ? .6 : 1 }}
              >
                {msg}
              </button>
            ))}
          </div>
          {qmFade.left && (
            <div style={{ position:"absolute", top:0, left:0, bottom:2, width:24, background:"linear-gradient(to left, transparent, #F8F9FA)", pointerEvents:"none" }} />
          )}
          {qmFade.right && (
            <div style={{ position:"absolute", top:0, right:0, bottom:2, width:24, background:"linear-gradient(to right, transparent, #F8F9FA)", pointerEvents:"none" }} />
          )}
        </div>
      )}

      {anexo && (
        <div style={{ flexShrink:0, margin:"0 14px 8px", padding:"8px 10px", borderRadius:12, background:"#F8F9FA", border:"1px solid #E5E7EB", display:"flex", alignItems:"center", gap:10 }}>
          {anexo.tipo === "imagem" ? (
            <img src={anexo.previewUrl} alt="" style={{ width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
          ) : anexo.tipo === "video" ? (
            <video src={anexo.previewUrl} style={{ width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
          ) : (
            <div style={{ width:44, height:44, borderRadius:8, background:"#EEF1F5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <FileText size={20} color="#666" />
            </div>
          )}
          <span style={{ flex:1, fontSize:12, fontWeight:700, color:"#444", wordBreak:"break-word" }}>{anexo.nome}</span>
          <button onClick={cancelarAnexo} disabled={enviandoAnexo} style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, display:"flex" }}>
            <X size={16} color="#999" />
          </button>
        </div>
      )}
      <div style={{ flexShrink:0, padding:"10px 14px", background:"white", borderTop:"1px solid #F0F0F0", display:"flex", gap:8, alignItems:"center" }}>
        <input
          id="chat-anexo-input"
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
          onChange={handleSelecionarAnexo}
          style={{ display:"none" }}
        />
        <button
          onClick={() => document.getElementById("chat-anexo-input").click()}
          disabled={sending}
          style={{ width:38, height:38, borderRadius:"50%", border:"none", background:"#F0F2F5", color:"#555", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}
        >
          <Paperclip size={17} />
        </button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") enviar(); }}
          placeholder="Escreva uma mensagem..."
          style={{ flex:1, padding:"11px 14px", borderRadius:99, border:"1.5px solid #EEE", fontSize:13.5, outline:"none" }}
        />
        <button onClick={enviar} disabled={(!text.trim() && !anexo) || sending} style={{
          width:40, height:40, borderRadius:"50%", border:"none",
          background: (text.trim() || anexo) ? B : "#E0E0E0", color:"white",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor: (text.trim() || anexo) ? "pointer" : "default", flexShrink:0,
        }}>
          <Send size={16} />
        </button>
      </div>

      {/* Fase 4 — modal "Confirmar Serviço": resumo (data/horário/valor) +
          aceite do Termo de Isenção, tudo numa ação só por usuário. */}
      {showConfirmModal && pedido && (
        <div
          onClick={() => !confirmandoServico && setShowConfirmModal(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:20, boxSizing:"border-box" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:480, maxHeight:"85vh", overflowY:"auto", background:"white", borderRadius:20, padding:"20px 20px 26px", boxSizing:"border-box" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Confirmar Serviço</p>
              <button onClick={() => setShowConfirmModal(false)} style={{ background:"#F0F2F5", border:"none", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <X size={14} color="#555" />
              </button>
            </div>

            <div style={{ background:"#F8F9FA", borderRadius:14, padding:"12px 14px", marginBottom:16, display:"flex", flexDirection:"column", gap:8 }}>
              {chat.serviceTitle && (
                <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                  <span style={{ fontSize:12, color:"#888" }}>Serviço</span>
                  <span style={{ fontSize:12.5, fontWeight:800, color:"#1a1a2e", textAlign:"right" }}>{chat.serviceTitle}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                <span style={{ fontSize:12, color:"#888" }}>Data/Horário</span>
                <span style={{ fontSize:12.5, fontWeight:800, color:"#1a1a2e", textAlign:"right" }}>{pedido.data_agendada ? dataAgendadaFmt(pedido.data_agendada) : "A combinar abaixo"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                <span style={{ fontSize:12, color:"#888" }}>Valor</span>
                <span style={{ fontSize:12.5, fontWeight:800, color:"#1a1a2e", textAlign:"right" }}>{pedido.valor != null ? `R$ ${pedido.valor}` : "A combinar"}</span>
              </div>
            </div>

            {blockInfo ? (
              blockInfo.error === "sem_plano_ativo" ? (
                <div style={{ background:"#FFF7ED", border:"1.5px solid #FDBA74", borderRadius:14, padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:900, color:"#9A3412" }}>🔒 Você precisa de um plano ativo pra confirmar este serviço.</p>
                  <button onClick={onUpgrade} type="button" style={{ alignSelf:"flex-start", padding:"9px 14px", borderRadius:10, border:"none", background:"#EA580C", color:"white", fontWeight:900, fontSize:12, cursor:"pointer" }}>
                    ASSINAR UM PLANO
                  </button>
                  <p style={{ margin:0, fontSize:11.5, color:"#9A3412" }}>Assine o Multi Autônomo, Pro ou Premium pra poder confirmar e fechar serviços.</p>
                </div>
              ) : (
                // Único motivo de bloqueio restante além de "sem_plano_ativo"
                // é "valor_excede_plano" — "quota_excedida" foi removido
                // junto com o backend que a emitia (HANDOFF 2026-09-03).
                <PlanoUpgradeCTA plano={plano} onUpgrade={onUpgrade} />
              )
            ) : (
              <>
                {!pedido.data_agendada && (
                  <div style={{ marginBottom:16 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:"#555", margin:"0 0 6px" }}>Data e horário do serviço</p>
                    <input
                      type="datetime-local"
                      value={dataInput}
                      min={agoraLocalStr()}
                      onChange={e => setDataInput(e.target.value)}
                      style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DBEAFE", fontSize:13, boxSizing:"border-box" }}
                    />
                  </div>
                )}

                {meuAceiteTermo ? (
                  <p style={{ fontSize:12, color:"#555", margin:"0 0 16px" }}>✅ Você já aceitou o Termo de Isenção de Responsabilidade.</p>
                ) : (
                  <div style={{ marginBottom:16 }}>
                    <div
                      onClick={() => setTermoChecked(v => !v)}
                      style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer", padding:"10px 12px", borderRadius:10, background: termoChecked ? "#F0FDF4" : "#F8F9FA", border:`1.5px solid ${termoChecked ? G : "#E5E7EB"}`, marginBottom:6 }}
                    >
                      <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${termoChecked ? G : "#D1D5DB"}`, background: termoChecked ? G : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        {termoChecked && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <p style={{ fontSize:11.5, color:"#555", lineHeight:1.5, margin:0 }}>
                        Li e aceito o <strong>Termo de Isenção de Responsabilidade</strong>.
                      </p>
                    </div>
                    <button onClick={() => setShowTermoCompleto(true)} style={{ background:"none", border:"none", padding:0, color:B, fontWeight:700, fontSize:11.5, cursor:"pointer", textDecoration:"underline" }}>
                      Ler termo completo
                    </button>
                  </div>
                )}

                <button
                  onClick={confirmarServico}
                  disabled={confirmandoServico || (!pedido.data_agendada && !dataInput) || (!meuAceiteTermo && !termoChecked)}
                  style={{
                    width:"100%", padding:"12px 0", borderRadius:10, border:"none", background:G, color:"white", fontWeight:800, fontSize:13.5,
                    cursor: (confirmandoServico || (!pedido.data_agendada && !dataInput) || (!meuAceiteTermo && !termoChecked)) ? "default" : "pointer",
                    opacity: (confirmandoServico || (!pedido.data_agendada && !dataInput) || (!meuAceiteTermo && !termoChecked)) ? .5 : 1,
                  }}
                >
                  {confirmandoServico ? "Confirmando..." : "✅ Confirmar"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showProporValor && (
        <div
          onClick={() => !enviandoProposta && setShowProporValor(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:60 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"white", borderRadius:"20px 20px 0 0", padding:22 }}>
            <p style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:"0 0 4px" }}>Propor valor</p>
            <p style={{ fontSize:12.5, color:"#888", margin:"0 0 16px" }}>{souCliente ? "O profissional" : "O cliente"} vai poder aceitar ou recusar. Se recusar, você pode propor outro valor.</p>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 14px", borderRadius:12, border:"1.5px solid #EEE", marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#555" }}>R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={valorProposto}
                onChange={e => setValorProposto(e.target.value)}
                placeholder="0,00"
                style={{ flex:1, border:"none", outline:"none", fontSize:18, fontWeight:800, color:"#1a1a2e" }}
              />
            </div>
            <button
              onClick={proporValor}
              disabled={enviandoProposta || !Number(valorProposto) || Number(valorProposto) <= 0}
              style={{
                width:"100%", padding:"13px 0", borderRadius:12, border:"none",
                background: O, color:"white", fontWeight:800, fontSize:14,
                cursor: (enviandoProposta || !Number(valorProposto) || Number(valorProposto) <= 0) ? "default" : "pointer",
                opacity: (enviandoProposta || !Number(valorProposto) || Number(valorProposto) <= 0) ? .5 : 1,
              }}
            >
              {enviandoProposta ? "Enviando..." : "Enviar proposta"}
            </button>
          </div>
        </div>
      )}

      {showTermoCompleto && (
        <div onClick={() => setShowTermoCompleto(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:70, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, maxHeight:"70vh", overflowY:"auto", background:"white", borderRadius:16, padding:20 }}>
            <p style={{ fontSize:15, fontWeight:900, color:"#1a1a2e", margin:"0 0 12px" }}>Termo de Isenção de Responsabilidade</p>
            <p style={{ fontSize:13, color:"#555", lineHeight:1.6, margin:0, whiteSpace:"pre-line" }}>{TERMO_TEXTO}</p>
            <button onClick={() => setShowTermoCompleto(false)} style={{ marginTop:16, width:"100%", padding:"10px 0", borderRadius:10, border:"none", background:"#F0F2F5", color:"#333", fontWeight:800, fontSize:13, cursor:"pointer" }}>
              Fechar
            </button>
          </div>
        </div>
      )}
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
    tag: "Taxa de acesso R$ 9,90/mês", tagBg:`${O}22`, tagBorder:"transparent", tagColor:O,
  },
  // Card "Quero crescer minha empresa" restaurado 2026-08-18 (removido em
  // a7de4c4, 2026-08-08 — "não vamos trabalhar com cadastro de empresa
  // parceira por enquanto"). Volta a existir ponto de entrada pra
  // CadastroEmpresaScreen aqui e em RegisterScreen (rádio "Tenho uma
  // empresa").
  {
    id: "empresa", icon: Briefcase, accent: "#1a1a2e", accentDeep: "#0A2A6B",
    title: "Quero crescer minha empresa",
    hook: "Encontre clientes e profissionais para fazer sua operação acontecer.",
    desc: "Publique demandas, encontre mão de obra e amplie suas oportunidades.",
    tag: "Grátis para cadastrar", tagBg:"#1a1a2e14", tagBorder:"transparent", tagColor:"#1a1a2e",
  },
];

function RoleSelectScreen({ onSelect, onLogin, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA" }}>
      <div style={{
        background:`radial-gradient(420px 320px at 88% 98%, #FFB74D55, transparent 65%), linear-gradient(160deg,${B} 0%,#0055D4 55%,#0A2A6B 130%)`,
        padding:"22px 26px 84px", position:"relative", overflow:"hidden", borderRadius:"0 0 0 0",
      }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.06)" }} />
        <div style={{ position:"absolute", top:"40%", left:-60, width:170, height:170, borderRadius:"50%", background:"rgba(255,255,255,.045)" }} />
        {/* Agora é uma etapa de contexto disparada de dentro da Home (não mais
            o gate de entrada do app), então precisa de como voltar sem cadastrar.
            Achado 2026-08-19: esse botão (top:18,left:18) ficava embaixo/atrás
            do bloco "M Multi" (que começava em top:28,left:509 — quase a
            mesma posição), então mesmo com zIndex maior a seta branca caía
            em cima do quadrado branco do logo — branco sobre branco, sem
            contraste nenhum, praticamente invisível mesmo estando ali e
            clicável. Empurrei a linha do logo pra baixo (margin-top 6→44)
            pra abrir espaço e a seta aparecer de verdade contra o azul. */}
        {onBack && (
          <button onClick={onBack} style={{ position:"absolute", top:18, left:18, zIndex:2, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={16} color="white" />
          </button>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:9, margin: onBack ? "44px 0 30px" : "6px 0 30px", position:"relative", zIndex:1 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:15, color:B, flexShrink:0 }}>M</div>
          <span style={{ fontSize:15, fontWeight:900, color:"white", letterSpacing:-.3 }}>Multi</span>
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
          Você está aqui para contratar ou trabalhar?
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

/* ───────────────────────── AUTH: EMPRESA PITCH SCREEN ────────────────────────── */
// Apresentação atraente pro fluxo "Empresa" do toggle de convidado (Cliente/
// Profissional/Empresa) — mesmo padrão visual do WelcomeScreen (hero azul +
// botão de voltar + benefícios + CTA único), sem preço nenhum aqui (proposta
// de valor só; plano pago vem depois do cadastro, na EscolherPlanoScreen com
// titularTipo="empresa"). onContinue leva pro CadastroEmpresaScreen (CNPJ,
// razão social etc.) que já existe.
const EMPRESA_PITCH_BENEFICIOS = [
  { Icon: Eye,      text: "Apareça pra clientes que já estão procurando fornecedores como você" },
  { Icon: Briefcase,text: "Publique demandas e encontre profissionais pra sua operação" },
  { Icon: BarChart2,text: "Acompanhe pedidos e desempenho num painel dedicado" },
  { Icon: Crown,    text: "No Plus, prioridade nas oportunidades e acesso ao banco de profissionais" },
];
function EmpresaPitchScreen({ onBack, onContinue, onLogin }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F8F9FA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"0 0 48px" }}>

      {/* top wave — mesmo padrão do WelcomeScreen */}
      <div style={{ width:"100%", height:260, background:`linear-gradient(160deg,${B} 0%,#0055d4 100%)`, borderRadius:"0 0 48px 48px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
        {onBack && (
          <button onClick={onBack} style={{ position:"absolute", top:14, left:16, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", borderRadius:"50%", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ArrowLeft size={16} color="white" />
          </button>
        )}
        <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.07)" }} />
        <div style={{ position:"absolute", bottom:-60, left:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.05)" }} />
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, position:"relative", zIndex:1 }}>
          <div style={{ width:72, height:72, borderRadius:22, background:"white", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
            <Building2 size={38} color={B} />
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ fontSize:26, fontWeight:900, color:"white", letterSpacing:-.6, lineHeight:1.15, margin:0 }}>Sua empresa<br/>também cresce no Multi.</p>
          </div>
        </div>
      </div>

      {/* middle content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 28px 0", width:"100%", maxWidth:400 }}>
        <p style={{ fontSize:14, color:"#9CA3AF", textAlign:"center", lineHeight:1.6, margin:"0 0 24px" }}>
          Presença na plataforma, captação de clientes e acesso a profissionais — tudo num só lugar.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", marginBottom:24 }}>
          {EMPRESA_PITCH_BENEFICIOS.map(({ Icon, text }, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:11, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#EBF4FF", color:B }}>
                <Icon size={17} />
              </div>
              <span style={{ fontSize:13.5, lineHeight:1.5, color:"#42436A", fontWeight:600, paddingTop:6 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Cards compactos de preço — mostram os dois planos pagos já aqui na
            apresentação (pedido explícito do usuário 2026-08-19, revertendo
            a decisão anterior de deixar sem preço). Lêem direto de
            PLANOS_EMPRESA pra nunca dessincronizar do que aparece de fato na
            EscolherPlanoScreen mais adiante. Só o essencial (nome, preço,
            "por dia") pra não virar tabela comparativa — os benefícios de
            cada plano já estão detalhados na lista acima e na tela seguinte. */}
        <div style={{ display:"flex", gap:10, width:"100%", marginBottom:20 }}>
          {PLANOS_EMPRESA.map((p) => (
            <div key={p.id} style={{
              flex:1, position:"relative", background:"white",
              border: p.badge ? `2px solid ${B}` : "1px solid #E2E4F1",
              borderRadius:16, padding:"18px 12px 14px",
              display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:3,
            }}>
              {p.badge && (
                <span style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:B, color:"white", fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>{p.badge}</span>
              )}
              <p.icon size={18} color={B} />
              <p style={{ fontSize:11.5, fontWeight:800, color:"#42436A", margin:"4px 0 0" }}>{p.label}</p>
              <p style={{ fontSize:19, fontWeight:900, color:B, margin:0 }}>R${p.price}<span style={{ fontSize:10.5, fontWeight:700, color:"#9CA3AF" }}>/mês</span></p>
              <p style={{ fontSize:10, color:"#9CA3AF", margin:0 }}>{p.perDay}</p>
            </div>
          ))}
        </div>

        {/* selo — cadastro em si não custa nada mesmo com os planos exibidos
            acima; escolher um plano fica pra depois, na tela seguinte, e é
            opcional (dá pra pular). */}
        <div style={{ display:"flex", alignItems:"center", gap:7, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:"8px 16px", marginBottom:28 }}>
          <span style={{ fontSize:16 }}>✨</span>
          <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:0 }}>Cadastro sem custo pra começar</p>
        </div>

        <button onClick={onContinue} style={{
          width:"100%", padding:"15px 0", borderRadius:16,
          background:`linear-gradient(135deg,${B},#0055d4)`,
          border:"none", color:"white",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          fontWeight:900, fontSize:14, cursor:"pointer",
          boxShadow:`0 6px 20px ${B}44`,
        }}>
          <Building2 size={17} /> Cadastrar minha empresa
        </button>

        {onLogin && (
          <p style={{ fontSize:12, color:"#9CA3AF", marginTop:20, textAlign:"center" }}>
            Já tem conta? <button onClick={onLogin} style={{ color:B, fontWeight:800, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>Entrar</button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── AUTH: WELCOME SCREEN ──────────────────────────────── */
function WelcomeScreen({ onEmail, onLogin, onBack }) {
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
            <p style={{ fontSize:32, fontWeight:900, color:"white", letterSpacing:-1, lineHeight:1, margin:0 }}>Multi</p>
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

        {/* free seal */}
        <div style={{ display:"flex", alignItems:"center", gap:7, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:"8px 16px", marginBottom:28 }}>
          <span style={{ fontSize:16 }}>✨</span>
          <p style={{ fontSize:13, fontWeight:800, color:"#166534", margin:0 }}>Cadastro 100% gratuito para clientes</p>
        </div>

        {/* CTA buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%" }}>
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
          Já tem conta? <button onClick={onLogin} style={{ color:B, fontWeight:800, background:"none", border:"none", cursor:"pointer", fontSize:12 }}>Entrar</button>
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
              <a href="/privacidade.html" target="_blank" rel="noopener noreferrer" style={{ display:"inline-block", fontSize:11, color:B, fontWeight:800, textDecoration:"underline", marginTop:10 }}>
                Ler Política de Privacidade completa
              </a>
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

/* Campo de senha com botão de mostrar/esconder (ícone de olho, estilo
   TikTok) — usado em toda tela com senha de conta de usuário (login,
   cadastro, recuperar/redefinir/trocar senha). Aceita as mesmas props de
   um <input> normal (value/onChange/style/onKeyDown/autoComplete/etc via
   spread); só decide o `type` internamente e desenha o ícone por cima.
   Renderiza seu próprio wrapper position:relative — funciona tanto solto
   quanto aninhado dentro do wrapper relative do FormField (o ícone da
   esquerda dele não conflita com o botão à direita daqui). */
function PasswordField({ style, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        {...rest}
        type={visible ? "text" : "password"}
        style={{ ...style, paddingRight:40 }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        style={{
          position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", cursor:"pointer", padding:4,
          display:"flex", alignItems:"center", color:"#9CA3AF",
        }}>
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/* Seletor de categorias em chips (multi-escolha). Usado no cadastro de
   empresa e no editor de categoria do profissional (ProfileScreen) — os
   dois em modo flat via `max` (ver PLANO_LIMITES_USUARIO), ex.: até 3
   categorias, sem agrupamento. nenhum limite passado = sem limite.
   onLimitReached() dispara ao tentar marcar categoria além do limite
   (usado pro upsell Autônomo→Pro→Premium). O modo duplo via `maxGrupos`+
   `maxItensPorGrupo` (grupo×profissões-por-grupo, usado até 2026-08-09)
   continua implementado abaixo mas nenhum call site usa mais — decisão
   explícita de 2026-08-10 de manter a reforma comercial separada da
   reforma de 23 grupos/profissões aninhadas, que fica como projeto à
   parte. */
// Navegação em 2 passos (2026-08-07): em vez de rolar uma lista solta de
// centenas de itens de uma vez, primeiro escolhe o grupo (ex.: "Reformas e
// Construção"), depois vê só os itens daquele grupo — com botão de voltar
// pra trocar de grupo. Puramente navegação: `value`/onChange continuam
// guardando só os itens específicos escolhidos (ex.: "pedreiro"), exatamente
// como antes — não muda categoria_servico. Um resumo dos itens já
// selecionados (com "x" pra remover) fica sempre visível acima, já que a
// seleção pode vir de vários grupos diferentes.
function CategoriaMultiSelect({ value, onChange, max, maxGrupos, maxItensPorGrupo, onLimitReached, error }) {
  const [openGrupo, setOpenGrupo] = useState(null); // null = grade de grupos
  const grupoDoId = (id) => CATS.find(c => c.id === id)?.grupo;
  const toggle = (id) => {
    const has = value.includes(id);
    if (has) { onChange(value.filter(v => v !== id)); return; }
    if (maxGrupos != null || maxItensPorGrupo != null) {
      // Modo duplo (profissional): grupo novo além do teto de grupos, OU
      // grupo já usado mas essa categoria já bateu o teto de profissões
      // dela — são dois limites independentes, cada um com sua mensagem.
      const grupo = grupoDoId(id);
      const gruposUsados = [...new Set(value.map(grupoDoId))];
      const jaNesseGrupo = value.filter(v => grupoDoId(v) === grupo).length;
      const ehGrupoNovo = !gruposUsados.includes(grupo);
      if (ehGrupoNovo && maxGrupos != null && gruposUsados.length >= maxGrupos) { onLimitReached?.("grupos"); return; }
      if (maxItensPorGrupo != null && jaNesseGrupo >= maxItensPorGrupo) { onLimitReached?.("itens"); return; }
    } else if (max && value.length >= max) {
      onLimitReached?.();
      return;
    }
    onChange([...value, id]);
  };
  // Dedupe por id — itens cross-listados em 2 grupos (ex.: "Fotógrafo" em
  // Festas e Eventos e em Fotografia e Vídeo) têm 2 entradas em CATS com o
  // mesmo id; sem isso o chip do resumo apareceria duplicado.
  const selecionados = [];
  const idsVistos = new Set();
  for (const c of CATS) {
    if (value.includes(c.id) && !idsVistos.has(c.id)) { idsVistos.add(c.id); selecionados.push(c); }
  }

  return (
    <div>
      {selecionados.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12, paddingBottom:12, borderBottom:"1px solid #F0F0F0" }}>
          {selecionados.map(c => (
            <span key={c.id} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 6px 5px 10px", borderRadius:99, background:"#EBF4FF", color:B, fontWeight:700, fontSize:11.5 }}>
              {c.emoji} {c.label}
              <button type="button" onClick={() => toggle(c.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:2, display:"flex", color:B }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {openGrupo ? (
        <div>
          <button type="button" onClick={() => setOpenGrupo(null)} style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", padding:0, marginBottom:12, color:B, fontWeight:800, fontSize:12.5 }}>
            <ChevronLeft size={15} /> {openGrupo}
          </button>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {CATS.filter(c => c.grupo === openGrupo).map(c => {
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
        </div>
      ) : (
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {CAT_GRUPOS.map(grupo => {
            const itensGrupo = CATS.filter(c => c.grupo === grupo);
            const count = itensGrupo.filter(c => value.includes(c.id)).length;
            return (
              <button key={grupo} type="button" onClick={() => setOpenGrupo(grupo)} style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 12px 8px 14px", borderRadius:99, cursor:"pointer",
                border: count ? `1.5px solid ${B}` : `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`,
                background: count ? "#EBF4FF" : "white",
                color: count ? B : "#555", fontWeight:700, fontSize:12.5,
              }}>
                <span>{itensGrupo[0]?.emoji}</span> {grupo}{count ? ` (${count})` : ""}
                <ChevronRight size={13} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Cópia padrão de bloqueio por limite de plano (valor do serviço acima do
// teto) — usada tanto no card bloqueado do mural (ProfessionalHome) quanto
// no bloqueio pós-tentativa de confirmação (NegociacaoChatScreen). Princípio:
// sempre dizer o que foi encontrado, por que está bloqueado, o benefício
// concreto do próximo plano e um CTA claro — nunca só "você não pode". Sem
// plano ativo trata como Autônomo (teto mais restritivo) pra fins de cópia.
// HANDOFF 2026-09-03: existia um segundo "tipo" aqui pra cota mensal de
// serviços esgotada (removida) — o prop "tipo" ficou pra trás junto com o
// branch morto; hoje só existe o bloqueio por valor máximo do serviço.
function PlanoUpgradeCTA({ plano, onUpgrade }) {
  const planoAtual = PLANO_LIMITES_USUARIO[plano] ? plano : "autonomo";
  const limite = PLANO_LIMITES_USUARIO[planoAtual];
  const ehPro = planoAtual === "pro";
  let titulo, corpo, ctaLabel, detalhe;
  if (ehPro) {
    titulo = "Essa oportunidade está acima do limite do Multi Pro.";
    ctaLabel = "CONHECER MULTI PREMIUM";
    detalhe = "Com o Multi Premium você tem acesso a serviços de qualquer valor e categorias ilimitadas.";
  } else {
    titulo = "Oportunidade exclusiva para planos superiores";
    corpo = `Este serviço está acima do limite de R$${limite.valorMaxServico} do seu plano.`;
    ctaLabel = "FAZER UPGRADE PARA MULTI PRO";
    detalhe = `Acesse serviços de até R$${PLANO_LIMITES_USUARIO.pro.valorMaxServico} por apenas R$${PLANOS_USUARIO.find(p => p.id === "pro")?.price}/mês.`;
  }
  return (
    <div style={{ background:"#FFF7ED", border:"1.5px solid #FDBA74", borderRadius:14, padding:"14px 16px", display:"flex", flexDirection:"column", gap:8 }}>
      <p style={{ margin:0, fontSize:13, fontWeight:900, color:"#9A3412" }}>🔒 {titulo}</p>
      {corpo && <p style={{ margin:0, fontSize:12.5, color:"#9A3412" }}>{corpo}</p>}
      <button onClick={onUpgrade} type="button" style={{ alignSelf:"flex-start", padding:"9px 14px", borderRadius:10, border:"none", background:"#EA580C", color:"white", fontWeight:900, fontSize:12, cursor:"pointer" }}>
        {ctaLabel}
      </button>
      <p style={{ margin:0, fontSize:11.5, color:"#9A3412" }}>{detalhe}</p>
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
    <input type="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inp} />
    <button disabled={loading} style={btn} onClick={async () => { if (!email) return alert("Digite seu e-mail"); setLoading(true); const r = await fetch(API+"/api/auth/solicitar-codigo", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email}) }); setLoading(false); if (r.ok) setStep(2); else alert("Erro ao enviar"); }}>{loading ? "Enviando..." : "Enviar Codigo"}</button>
  </div></div>;
  return <div style={box}><div style={card}>
    <h2 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800 }}>Digite o Codigo</h2>
    <p style={{ color:"#6B7280", fontSize:14, marginBottom:24 }}>Codigo enviado para {email}</p>
    <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>CODIGO</label>
    <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength={6} style={{ ...inp, fontSize:24, letterSpacing:8, textAlign:"center" }} />
    <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>NOVA SENHA</label>
    <PasswordField value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" style={inp} />
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
          <PasswordField placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" }}>CONFIRMAR SENHA</label>
          <PasswordField placeholder="Repita a senha" value={confirm} onChange={e => setConfirm(e.target.value)}
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
      const session = { name: d.user.name, email: d.user.email, role: d.user.role, isPro: d.user.isPro || false, token: d.token, refreshToken: d.refresh_token };
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
          <input type="email" autoCapitalize="none" autoCorrect="off" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", fontSize:15, marginTop:6, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.05em" }}>SENHA</label>
          <PasswordField placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)}
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
function CompletarPerfilScreen({ userEmail, onDone, showToast, initialCategoria = [] }) {
  // CRÍTICO (achado 2026-08-31): esta era a última etapa do cadastro de
  // profissional antes do upsert final gravar role="professional" em
  // "usuarios" (ver handleLoginComplete) — e nunca pedia categoria_servico.
  // Com a constraint categoria_servico_obrigatoria_para_professional já
  // ativa no banco, todo cadastro novo de profissional estava batendo
  // direto no erro cru do Postgres nesse upsert (nenhuma tela chegava a
  // perguntar categoria antes disso — só existia depois, em ProfileScreen,
  // pra quem já tinha conta). max=1 porque o cadastro hoje sempre entra pelo
  // plano "acesso" (Taxa de Acesso obrigatória, sem escolha de plano — ver
  // taxaAcessoObrigatoria em EscolherPlanoScreen), e PLANO_LIMITES_USUARIO
  // .acesso.maxCategorias é 1; se um dia o cadastro voltar a oferecer
  // escolha de plano aqui, isto precisa virar prop dinâmica.
  // initialCategoria: vem do carrossel/card do GuestMural (guest que já
  // demonstrou interesse numa categoria específica antes de se cadastrar,
  // ver handoff 2026-09-02) — pré-marca em vez de perguntar de novo. max=1
  // então só o primeiro item importa mesmo se vier mais de um.
  const [categoria, setCategoria] = useState(() => initialCategoria.slice(0, 1));
  const [errorCategoria, setErrorCategoria] = useState("");
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
    const { error } = await supabase.storage.from("pedidos-fotos").upload(path, file, { contentType: file.type, upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    return supabase.storage.from("pedidos-fotos").getPublicUrl(path).data.publicUrl;
  };

  const handleContinuar = async () => {
    // Mesmo padrão do fix de validação de pagamento (commit 8c9b762): toast
    // garante feedback visível mesmo se o campo com erro estiver fora da
    // dobra, além do texto vermelho embaixo do campo em si.
    if (!categoria.length) {
      setErrorCategoria("Selecione ao menos uma categoria de serviço para continuar.");
      showToast?.("❌ Selecione ao menos uma categoria de serviço para continuar.", "#DC2626");
      return;
    }
    if (!bio.trim()) {
      setErrorBio("Conta rapidinho sua experiência — esse campo é obrigatório");
      showToast?.("❌ Conta rapidinho sua experiência — esse campo é obrigatório.", "#DC2626");
      return;
    }
    setErrorCategoria("");
    setErrorBio("");
    setSaving(true);
    try {
      // categoria_servico entra aqui, ANTES do upsert final de
      // handleLoginComplete (que grava role="professional") — essa ordem é
      // o que garante a linha nunca fica com role="professional" sem
      // categoria preenchida, satisfazendo a constraint do banco desde a
      // primeira escrita (ver comentário no topo do componente).
      const updates = { bio: bio.trim(), categoria_servico: categoria };
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

        {/* CATEGORIA DE SERVIÇO — obrigatória (ver comentário no topo do
            componente). max=1 porque o cadastro hoje sempre entra pelo plano
            "acesso" (mesmo teto de PLANO_LIMITES_USUARIO.acesso.maxCategorias) —
            mesmo componente CategoriaMultiSelect já usado em
            EmpresaEditProfileScreen/CadastroEmpresaScreen/ProfileScreen. */}
        <div style={{ marginBottom: errorCategoria ? -6 : 0 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color: errorCategoria ? "#E53935" : "#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>
            Categoria de Serviço <span style={{ color:O }}>*</span>
          </label>
          <CategoriaMultiSelect
            value={categoria}
            onChange={v => { setCategoria(v); if (errorCategoria) setErrorCategoria(""); }}
            max={1}
            onLimitReached={() => showToast?.("⚠️ No cadastro, escolha 1 categoria pra começar — dá pra adicionar mais depois, com plano Pro ou Premium.", O)}
            error={errorCategoria}
          />
          {errorCategoria && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errorCategoria}</p>}
        </div>

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

/* ───────────────────────── VIRE PROFISSIONAL (conta já existente) ──────────── */
// Acionado pelo banner "Vire Profissional" da Home do cliente — reusa as
// mesmas duas etapas que RegisterScreen usa pra "profissional"/"ambos" no
// cadastro (plano + categoria/termo), só que pra uma conta que já existe e já
// está logada (sem formulário de nome/e-mail/senha de novo). onDone (no App())
// é quem grava usuarios.role="professional" e liga o modo profissional.
function VirarProfissionalScreen({ userEmail, userName, showToast, onBack, onDone }) {
  const [step, setStep] = useState("plano");
  if (step === "plano") {
    return (
      <EscolherPlanoScreen
        titularTipo="usuario"
        titularEmail={userEmail}
        titularNome={userName}
        onBack={onBack}
        showToast={showToast}
        onDone={() => setStep("completar-perfil")}
        // "Promoção de Inauguração" (2026-08-26): virar profissional agora
        // também é "profissional novo" pra fins da taxa de acesso — sem
        // onSkip, sem lista de planos, card único obrigatório (ver
        // taxaAcessoObrigatoria em EscolherPlanoScreen).
        taxaAcessoObrigatoria
      />
    );
  }
  return <CompletarPerfilScreen userEmail={userEmail} showToast={showToast} onDone={onDone} />;
}

function RegisterScreen({ onBack, onComplete, showToast, initialRole = "client", initialCategoria = [] }) {
  const [step,    setStep]    = useState("form");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [password, setPassword] = useState("");
  const [cep,     setCep]     = useState("");
  // Cidade real — antes disso o cadastro gravava literalmente a string "Sua
  // cidade"/"sua região" como localização do usuário, nunca a cidade de
  // verdade (item 6 do prompt Ajustes de Cadastro/Perfil/Fluxos). Resolvida
  // por CEP (ViaCEP, mesmo serviço já usado no resto do app) e, se o usuário
  // permitir, refinada por geolocalização do navegador (BigDataCloud —
  // reverse-geocode gratuito, sem chave — como primeira opção quando
  // disponível, já que é mais precisa que o CEP digitado).
  const [cepInfo,      setCepInfo]      = useState(null); // { bairro, cidade, uf }
  const [geoCidade,    setGeoCidade]    = useState(null); // string, só se location permitida
  const [geoStatus,    setGeoStatus]    = useState("idle"); // idle | asking | granted | denied | error
  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) { setCepInfo(null); return; }
    let cancelado = false;
    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then(r => r.json())
      .then(d => { if (!cancelado && !d.erro) setCepInfo({ bairro: d.bairro, cidade: d.localidade, uf: d.uf }); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [cep]);
  const pedirLocalizacao = () => {
    if (!navigator.geolocation) { setGeoStatus("error"); return; }
    setGeoStatus("asking");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
          const d = await r.json();
          const cidade = d.city || d.locality;
          if (cidade) { setGeoCidade(`${cidade}${d.principalSubdivisionCode ? "/" + d.principalSubdivisionCode.replace("BR-","") : ""}`); setGeoStatus("granted"); }
          else setGeoStatus("error");
        } catch { setGeoStatus("error"); }
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  };
  // Localização final: geolocalização (se permitida) > CEP resolvido > nunca
  // um placeholder genérico — sem nenhum dos dois, cadastro fica bloqueado
  // (ver validate()).
  const cidadeResolvida = geoCidade || (cepInfo ? `${cepInfo.cidade}${cepInfo.uf ? "/" + cepInfo.uf : ""}` : null);
  // "tipoUso" — pergunta nova (mesmo padrão do "tipo de conta" no cadastro de
  // empresa: presta serviço/contrata/os dois). "profissional" e "ambos" os
  // dois passam pelas mesmas etapas extras de profissional (plano + termo +
  // categoria) logo abaixo — "ambos" só difere no fim: a sessão inicial abre
  // no modo Cliente (usuarios.role continua "professional" de verdade, pra
  // aparecer no Banco de Profissionais; ver handleSubmit/onComplete abaixo).
  const [tipoUso, setTipoUso] = useState(initialRole === "professional" ? "profissional" : "cliente");
  const role = tipoUso === "cliente" ? "client" : "professional";
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
    else if (!cidadeResolvida)
      e.cep = "Não encontramos esse CEP — confira e tente de novo";
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
      // Guarda o token de sessão já aqui — o fluxo até finishLogin (que lê e
      // aplica isso no cliente Supabase) ainda passa por "plano"/"completar
      // perfil" pro profissional, então não dá pra esperar chegar lá.
      if (d.token) {
        try {
          const prev = JSON.parse(localStorage.getItem("multiSession") || "{}") || {};
          localStorage.setItem("multiSession", JSON.stringify({ ...prev, token: d.token, refreshToken: d.refresh_token }));
        } catch {}
      }
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
        // "Promoção de Inauguração" (2026-08-26): profissional novo cadastrado
        // a partir de agora paga a taxa de acesso obrigatória antes de
        // completar o cadastro — sem onSkip, sem lista de planos (ver
        // taxaAcessoObrigatoria em EscolherPlanoScreen).
        taxaAcessoObrigatoria
      />
    );
  }

  /* ── COMPLETAR PERFIL (profissional e ambos, depois do plano) ── */
  if (step === "completar-perfil") {
    return (
      <CompletarPerfilScreen
        userEmail={email.trim()}
        showToast={showToast}
        initialCategoria={initialCategoria}
        onDone={() => {
          // Conversão de fundo de funil (Meta Ads/GA4, handoff 2026-09-02):
          // só dispara aqui porque chegar nesta etapa (completar-perfil) já
          // exige ter passado pelo pagamento da Taxa de Acesso com sucesso
          // (EscolherPlanoScreen com taxaAcessoObrigatoria=true, ver acima) —
          // é "profissional pagante" de verdade, não só formulário
          // preenchido. Só roda pra cadastro NOVO (RegisterScreen); renovação
          // de conta existente (VirarProfissionalScreen) não passa por aqui,
          // de propósito — não é uma conversão nova pro Ads otimizar em cima.
          // "Subscribe" é o evento padrão do Meta pra início de assinatura
          // recorrente (o modelo real da Taxa de Acesso, R$9,90/mês).
          trackGA("cadastro_profissional_pagante", { value: 9.9, currency: "BRL" });
          trackPixel("Subscribe", { value: 9.9, currency: "BRL", predicted_ltv: 9.9 });
          onComplete(
          name, email.trim(), true, cidadeResolvida || "sua região",
          // "ambos": sessão inicial abre no modo Cliente (mais alinhado ao que
          // a pessoa provavelmente vai fazer primeiro), mas usuarios.role
          // grava "professional" mesmo assim (7º argumento, dbRole) — sem
          // isso a conta some do Banco de Profissionais mesmo tendo feito
          // categoria/termo/plano de verdade.
          tipoUso === "ambos" ? "client" : role, phone, role, tipoUso === "ambos"
          );
        }}
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
          Bem-vindo ao Multi!
        </h2>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.7, margin:"0 0 20px" }}>
          Olá, <strong style={{ color:"#1a1a2e" }}>{name.trim().split(/\s+/)[0]}</strong>! 🎉<br/>
          {isProfessional
            ? "Seu perfil profissional está ativo. Explore o mural de serviços."
            : "Agora você tem os melhores profissionais na palma da mão."}
        </p>

        {/* Próximo passo: escolher e pagar o plano — sem trial, cobrança
            imediata (ver PagamentoPlanoScreen). */}
        {isProfessional && (
          <div style={{ background:"linear-gradient(135deg,#7C3AED,#4F46E5)", borderRadius:16, padding:"14px 20px", marginBottom:20, width:"100%" }}>
            <p style={{ fontSize:14, fontWeight:900, color:"white", margin:"0 0 4px" }}>🔧 Falta só pagar a taxa de acesso!</p>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.75)", margin:0 }}>R$ 9,90/mês · Contatos desbloqueados · Chat ilimitado</p>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:28 }}>
          {[B, O, G, "#F9A825", "#8B2FC9"].map((c, i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c, opacity:.8 }} />
          ))}
        </div>

        <button
          onClick={() => isProfessional ? setStep("plano") : onComplete(name, email.trim(), true, cidadeResolvida || "sua região", role, phone)}
          style={{ width:"100%", padding:"16px 0", borderRadius:18, border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 6px 24px ${isProfessional ? O : B}44`, background: isProfessional ? `linear-gradient(135deg,${O},#E64A19)` : `linear-gradient(135deg,${B},#0055d4)` }}>
          {isProfessional ? <><Briefcase size={17} /> Escolher plano</> : <><Home size={17} /> Ir para a Tela Inicial</>}
        </button>
      </div>
    );
  }

  // Empresa tem cadastro próprio (CNPJ, razão social, tipo_conta — não é só
  // mais um "role" dentro desse formulário de pessoa física). Escolher essa
  // opção no rádio abaixo troca a tela inteira pra CadastroEmpresaScreen em
  // vez de seguir o resto do FAST FORM; "voltar" só desfaz essa escolha,
  // volta pro rádio, não sai do cadastro inteiro. Reativado 2026-08-18 —
  // ver ROLE_OPTIONS acima pro card equivalente em RoleSelectScreen.
  if (tipoUso === "empresa") {
    return <CadastroEmpresaScreen onBack={() => setTipoUso(initialRole === "professional" ? "profissional" : "cliente")} onComplete={onComplete} showToast={showToast} />;
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

        {/* ── TIPO DE USO — mesmo padrão do "tipo de conta" no cadastro de
            empresa (lista vertical, ícone+label+sub+radio). "Os dois" passa
            pelas mesmas etapas extras de profissional (plano, categoria,
            termo) logo depois desse formulário — ver step "plano" acima —
            e ainda assim abre a sessão no modo Cliente por padrão (o toggle
            no topo do app leva pro lado profissional já configurado). Opção
            "Empresa" desvia pra CadastroEmpresaScreen (ver o if logo acima
            do return desse componente), nunca chega a renderizar o resto
            desse formulário.
            Redesenhado 2026-08-18 (achado investigando cadastros que
            queriam profissional e caíam como cliente, ver
            multi_cadastro_empresa_home_cliente_bug na memória): antes, a
            opção selecionada só tinha um fundo azul bem sutil (#EBF4FF) —
            fácil de não perceber, ainda mais sendo a primeira coisa da tela
            (antes até de nome/e-mail), o que fazia parecer aviso/banner em
            vez de pergunta. Agora cada opção tem cor própria (mesma
            linguagem de cor do RoleSelectScreen: azul=cliente,
            laranja=profissional), a selecionada ganha borda colorida
            grossa + barra de destaque no topo + check preenchido em vez de
            bolinha, e o rótulo acima deixa explícito que dá pra trocar. */}
        <div style={{ marginBottom:22 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:900, color:"#1a1a2e", marginBottom:3 }}>
            Você quer usar o Multi como cliente, profissional, ou os dois?
          </label>
          <p style={{ fontSize:11.5, color:"#9CA3AF", margin:"0 0 10px" }}>
            Confira a opção marcada abaixo — toque numa diferente pra trocar.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[
              { val:"cliente",      icon:"🏠", label:"Só cliente",        sub:"Publico pedidos e contrato profissionais (grátis)", accent:B },
              { val:"profissional", icon:"🔧", label:"Só profissional",   sub:"Recebo pedidos e ganho oportunidades (taxa de acesso R$9,90/mês)", accent:O },
              { val:"ambos",        icon:"🔁", label:"Os dois!",          sub:"Contrato quando precisar e também presto serviço (taxa de acesso R$9,90/mês)", accent:"#7C3AED" },
              { val:"empresa",      icon:"🏢", label:"Tenho uma empresa", sub:"Cadastro próprio — CNPJ, presta serviço e/ou contrata profissionais", accent:"#1a1a2e" },
            ].map((opt) => {
              const selecionado = tipoUso === opt.val;
              return (
                <div key={opt.val} onClick={() => setTipoUso(opt.val)}
                  style={{
                    position:"relative", display:"flex", alignItems:"center", gap:12,
                    padding:"14px 14px 14px 16px", cursor:"pointer", overflow:"hidden",
                    background: selecionado ? `${opt.accent}0F` : "white",
                    border: selecionado ? `2px solid ${opt.accent}` : "1.5px solid #EBEBEB",
                    borderRadius:14, transition:"all .15s",
                  }}>
                  {selecionado && <div style={{ position:"absolute", top:0, left:0, bottom:0, width:5, background:opt.accent }} />}
                  <span style={{ fontSize:22, flexShrink:0 }}>{opt.icon}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13.5, fontWeight:900, color: selecionado ? opt.accent : "#1a1a2e", margin:"0 0 2px" }}>{opt.label}</p>
                    <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{opt.sub}</p>
                  </div>
                  <div style={{ width:23, height:23, borderRadius:"50%", border: selecionado ? `2px solid ${opt.accent}` : "2px solid #D1D5DB", background: selecionado ? opt.accent : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                    {selecionado && <Check size={13} color="white" strokeWidth={3.5} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* free / paid badge */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background: isProfessional ? "#F5F3FF" : "#F0FDF4", border:`1px solid ${isProfessional ? "#DDD6FE" : "#BBF7D0"}`, borderRadius:14, padding:"10px 16px", marginBottom:22 }}>
          <span style={{ fontSize:18 }}>{isProfessional ? "💳" : "✨"}</span>
          <p style={{ fontSize:13, fontWeight:800, color: isProfessional ? "#5B21B6" : "#166534", margin:0 }}>
            {isProfessional ? "Taxa de acesso R$ 9,90/mês — pagamento no próximo passo" : "Cadastro 100% gratuito para clientes"}
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
          <input autoComplete="email" autoCapitalize="none" autoCorrect="off" type="email" placeholder="seu@email.com" value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.email ? "#E53935" : undefined }} />
        </FormField>

        {/* SENHA */}
        <FormField IconComp={KeyRound} label="Senha" error={errors.password}>
          <PasswordField autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password}
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
        <FormField IconComp={MapPin} label="CEP" error={errors.cep} hint={geoCidade ? `📍 ${geoCidade}` : cepInfo ? `${cepInfo.cidade}/${cepInfo.uf}` : ""}>
          <input autoComplete="postal-code" type="tel" placeholder="00000-000" value={cep}
            onChange={e => { setCep(maskCep(e.target.value)); if (errors.cep) setErrors(p => ({ ...p, cep:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.cep ? "#E53935" : cepFound ? G : undefined }} />
        </FormField>

        {/* LOCALIZAÇÃO — opcional, refina/confirma a cidade além do CEP digitado */}
        {geoStatus !== "granted" && (
          <button type="button" onClick={pedirLocalizacao} disabled={geoStatus === "asking"} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#F0F7FF", border:"1px solid #BFDBFE", borderRadius:12, padding:"11px 14px", marginBottom:22, marginTop:-10, color:B, fontWeight:800, fontSize:12.5, cursor: geoStatus === "asking" ? "default" : "pointer" }}>
            <MapPin size={14} />
            {geoStatus === "asking" ? "Localizando..." : geoStatus === "denied" ? "Localização não permitida — usando CEP" : geoStatus === "error" ? "Não conseguimos localizar — usando CEP" : "Permitir que o Multi acesse sua localização?"}
          </button>
        )}

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
            <><Check size={17} /> {isProfessional ? "Criar conta" : "Finalizar Cadastro"}</>
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
function CadastroEmpresaScreen({ onBack, onComplete, showToast }) {
  const [step, setStep] = useState("form"); // form | success | plano
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [categoria, setCategoria] = useState([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cidade, setCidade] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [tipoConta, setTipoConta] = useState(""); // "basica" | "pro" | "contratante"
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
    if (!cidade.trim()) e.cidade = "Informe a cidade";
    if (!tipoConta) e.tipoConta = "Selecione uma opção";
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
        const { error: upErr } = await supabase.storage.from("pedidos-fotos").upload(path, logoFile, { contentType: logoFile.type, upsert: true, cacheControl: "31536000" });
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

      // Guarda o token de sessão já aqui, mesmo padrão do cadastro de
      // cliente/profissional (RegisterScreen) — sem isso, quando onComplete
      // chamar finishLogin() mais abaixo não existe token pra setSession(),
      // e a conta fica "logada" só no estado local do React sem sessão real
      // no client Supabase (mesma classe de bug já documentada em
      // multi_rls_fase1_hardening: sem JWT real, leituras/escritas via RLS
      // simplesmente não retornam nada, sem erro nenhum).
      if (d.token) {
        try {
          const prev = JSON.parse(localStorage.getItem("multiSession") || "{}") || {};
          localStorage.setItem("multiSession", JSON.stringify({ ...prev, token: d.token, refreshToken: d.refresh_token }));
        } catch {}
        // CRÍTICO (achado 2026-08-26, investigando o bug de login de empresa
        // caindo na Home de Cliente): sem isso, o client Supabase segue
        // anônimo até o upsert de "usuarios" logo abaixo — e como é um
        // upsert (ON CONFLICT DO UPDATE), o Postgres exige a policy de
        // UPDATE além da de INSERT, mesmo quando não existe conflito de
        // verdade. A policy de UPDATE de "usuarios" exige auth.jwt() com o
        // e-mail batendo (role authenticated) — sem setSession() aqui isso
        // falha SEMPRE (não é o bug de durabilidade do Supabase, é
        // determinístico), deixando a empresa sem linha em "usuarios" toda
        // vez. RegisterScreen (cliente/profissional) não tem esse problema
        // porque o upsert equivalente dele roda depois, dentro de
        // finishLogin(), que já aguarda setSession() antes.
        try {
          await supabase.auth.setSession({ access_token: d.token, refresh_token: d.refresh_token });
        } catch (e) {
          console.warn("[cadastro-empresa] setSession falhou:", e.message);
        }
      }

      // 3. Cria a empresa
      const { data: empresaRow, error: empresaErr } = await supabase.from("empresas").insert({
        nome: nomeFantasia.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: cnpj,
        categoria_servico: categoria,
        telefone_contato: phone.replace(/\D/g, ""),
        email: email.trim(),
        descricao: descricao.trim() || null,
        cidade: cidade.trim(),
        logo_url: logoUrl,
        ativo: true,
        user_id: userId,
        tipo_conta: tipoConta,
      }).select().maybeSingle();
      if (empresaErr) throw empresaErr;

      // 4. Vincula o usuário criado à empresa (mesmo padrão de profissionais em "usuarios")
      await supabase.from("usuarios").upsert({
        email: email.trim(), name: nomeFantasia.trim(), role: "empresa",
        empresa_id: empresaRow?.id || null,
      }, { onConflict: "email" });

      setLoading(false);
      // O cadastro em si (CNPJ, razão social, tipo_conta) continua sempre
      // gratuito — isso não mudou. O que voltou (2026-08-19, a pedido
      // explícito do usuário) é uma etapa SEPARADA e independente de
      // escolha de plano pago (Multi Empresa/Empresa Plus), depois do
      // "sucesso" do cadastro — ver step "plano" abaixo. tipo_conta e
      // plano pago não se misturam: uma empresa "contratante" grátis
      // continua existindo normalmente sem nunca passar por ali.
      setStep("success");
    } catch (e) {
      setLoading(false);
      alert(e.message || "Erro ao cadastrar empresa");
    }
  };

  // Só entra de fato no app (aplica a sessão) depois da etapa de plano —
  // seja escolhendo um plano pago, seja pulando ("Continuar sem plano por
  // enquanto"). Mesma chamada de onComplete que já existia antes dessa
  // etapa ser inserida, só que agora dois call sites diferentes (skip e
  // sucesso do pagamento) precisam dela, não só o botão da tela de sucesso.
  const entrarNoApp = () => {
    if (onComplete) onComplete(nomeFantasia.trim(), email.trim(), false, cidade.trim(), "empresa", phone.replace(/\D/g, ""), null, false);
    else onBack?.();
  };

  if (step === "plano") {
    return (
      <EscolherPlanoScreen
        titularTipo="empresa" titularEmail={email.trim()} titularNome={nomeFantasia.trim()}
        onBack={() => setStep("success")}
        onSkip={entrarNoApp}
        onDone={entrarNoApp}
        showToast={showToast}
        permiteComprarMoedas={false}
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
        <button
          // Bug real, achado 2026-08-18: esse botão chamava onBack (só
          // fechava a tela de cadastro, sem logar ninguém) — a conta e a
          // linha em "empresas"/"usuarios" já tinham sido criadas de
          // verdade no passo 3/4 acima, mas o front nunca aplicava a
          // sessão, então caía de volta no Home de convidado (Cliente).
          // Corrigido então indo direto pra entrarNoApp(); agora (2026-08-19)
          // passa primeiro pela escolha de plano (step "plano" acima) —
          // entrarNoApp() só roda depois, de lá.
          onClick={() => setStep("plano")}
          style={{ width:"100%", padding:"16px 0", borderRadius:18, border:"none", color:"white", fontWeight:900, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 6px 24px ${B}44`, background:`linear-gradient(135deg,${B},#0055d4)` }}>
          Ver planos <ChevronRight size={17} />
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

        {/* TIPO DE CONTA — define o perfil da empresa: só presta serviço, presta
            e também contrata (Pro/paga), ou só contrata (Contratante/grátis,
            sem assinatura — mesmo padrão do Cliente). */}
        <div style={{ marginBottom: errors.tipoConta ? 6 : 18 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color: errors.tipoConta ? "#E53935" : "#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>
            Sua empresa presta serviço, contrata profissionais, ou os dois?
          </label>
          <div style={{ background:"white", border:"1.5px solid #EBEBEB", borderRadius:14, overflow:"hidden" }}>
            {[
              { val:"basica",      icon:"🛠️", label:"Presto serviço",             sub:"Recebo pedidos de clientes" },
              { val:"pro",         icon:"💼", label:"Presto serviço e contrato",   sub:"Recebo pedidos e publico demandas pra contratar profissionais" },
              { val:"contratante", icon:"🏢", label:"Só contrato profissionais",   sub:"Não presto serviço, só publico demandas pra contratar (grátis, sem assinatura)" },
            ].map((opt, i, arr) => (
              <div key={opt.val} onClick={() => { setTipoConta(opt.val); if (errors.tipoConta) setErrors(p => ({ ...p, tipoConta:undefined })); }}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", cursor:"pointer", borderBottom: i < arr.length - 1 ? "1px solid #F0F0F0" : "none", background: tipoConta === opt.val ? "#EBF4FF" : "white", transition:"background .15s" }}>
                <span style={{ fontSize:22, flexShrink:0 }}>{opt.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:800, color:"#1a1a2e", margin:"0 0 2px" }}>{opt.label}</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{opt.sub}</p>
                </div>
                <div style={{ width:20, height:20, borderRadius:"50%", border:(tipoConta===opt.val?"2px solid "+B:"2px solid #D1D5DB"), background: tipoConta === opt.val ? B : "white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                  {tipoConta === opt.val && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
                </div>
              </div>
            ))}
          </div>
          {errors.tipoConta && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.tipoConta}</p>}
        </div>

        {/* CATEGORIAS — teto fixo de 3 pra toda conta empresa (não existe mais
            plano pago de empresa que libere ilimitado). */}
        <div style={{ marginBottom: errors.categoria ? 6 : 18 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:800, color: errors.categoria ? "#E53935" : "#6B7280", textTransform:"uppercase", letterSpacing:1.1, marginBottom:7 }}>Categorias de Serviço</label>
          <CategoriaMultiSelect
            value={categoria}
            onChange={v => { setCategoria(v); if (errors.categoria) setErrors(p => ({ ...p, categoria:undefined })); }}
            max={3}
            onLimitReached={() => showToast?.("⚠️ Até 3 categorias por conta empresa.", O)}
            error={errors.categoria}
          />
          {errors.categoria && <p style={{ fontSize:11, color:"#E53935", margin:"5px 0 0", fontWeight:700 }}>{errors.categoria}</p>}
        </div>

        {/* CIDADE — usada pro radar de "Novo Pedido!" só mostrar pedidos da
            mesma cidade da empresa (mesmo padrão de categoria+cidade já
            aplicado ao profissional autônomo). */}
        <FormField IconComp={MapPin} label="Cidade" error={errors.cidade}>
          <input type="text" placeholder="Ex: Guarulhos" value={cidade}
            onChange={e => { setCidade(e.target.value); if (errors.cidade) setErrors(p => ({ ...p, cidade:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.cidade ? "#E53935" : undefined }} />
        </FormField>

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
          <input autoComplete="email" autoCapitalize="none" autoCorrect="off" type="email" placeholder="contato@empresa.com" value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email:undefined })); }}
            style={{ ...REG_INPUT, borderColor: errors.email ? "#E53935" : undefined }} />
        </FormField>

        {/* SENHA */}
        <FormField IconComp={KeyRound} label="Senha" error={errors.password}>
          <PasswordField autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password}
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
  // filter guarda "all" ou o nome de um GRUPO (ex.: "Elétrica e Automação"),
  // não mais o id de uma profissão específica — o carrossel agora navega
  // pelos 23 grupos completos (CAT_GRUPOS), não por um punhado de profissões
  // hardcoded (ver handoff 2026-09-02).
  const [filter, setFilter] = useState("all");
  // Setas de rolagem da lista de categorias (2026-09-01, achado testando no
  // celular): a lista corta no meio da última categoria visível sem
  // nenhuma pista de que dá pra rolar mais — quem chega pelo mural travado
  // do anúncio (guestLocked) nem cogita arrastar. "canScrollRight" começa
  // true otimisticamente (a maioria dos aparelhos corta a lista mesmo com
  // poucas categorias) e o próprio onScroll/medição no mount corrige assim
  // que o layout real é conhecido.
  const catsScrollRef = useRef(null);
  const [catsScroll, setCatsScroll] = useState({ left: false, right: true });
  const updateCatsScroll = () => {
    const el = catsScrollRef.current;
    if (!el) return;
    setCatsScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  };
  useEffect(() => { updateCatsScroll(); }, []);
  const scrollCats = (dir) => {
    catsScrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  // Demanda REAL (origem 'real', pedido normal do app, OU 'suporte', demanda
  // MULTI-SUP cadastrada no Admin a partir de contato por WhatsApp — ver
  // multi_sup_captacao_manual na memória) — nunca mais dado fictício
  // hardcoded (estratégia de "pedido fictício" abandonada 2026-08-30, ver
  // multi_dados_ficticios_plano). Guest não está logado: select() só traz
  // campos sem PII nenhuma (sem cliente_nome/telefone/e-mail) — contato de
  // verdade só depois do cadastro, igual o resto da tela já faz (blur/CTA).
  const [pedidosGuest, setPedidosGuest] = useState([]);
  const [loadingGuest, setLoadingGuest] = useState(true);
  useEffect(() => {
    let cancelado = false;
    // catsById: representante (emoji/label do PRIMEIRO grupo) só pra
    // ilustrar o card visualmente. gruposById: TODOS os grupos que aquele
    // id pertence — 8 ids do CATS são cross-listados em 2 grupos de
    // propósito (ex.: fotografo/videomaker em "Festas e Eventos" E
    // "Fotografia e Vídeo", ver comentário na definição de CATS). Achado
    // 2026-09-02: usar só o primeiro grupo pro filtro fazia esses ids
    // nunca aparecerem no segundo grupo — carrossel mostrava "vazio" mesmo
    // tendo demanda real cadastrada (fotografo aparecia em Festas e
    // Eventos, mas Fotografia e Vídeo ficava sem nada). Card agora sabe
    // responder aos dois chips.
    const catsById = {};
    const gruposById = {};
    CATS.forEach(c => {
      if (!catsById[c.id]) catsById[c.id] = c;
      (gruposById[c.id] = gruposById[c.id] || []).push(c.grupo);
    });
    supabase.from("pedidos")
      .select("id,categoria,cidade,descricao,valor,urgencia,created_at,origem")
      .eq("status", "aberto")
      .neq("origem", "demo")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (cancelado) return;
        const mapped = (data || [])
          // categoria inválida/órfã (ex.: digitada errado no cadastro
          // MULTI-SUP antes do seletor validado, ver AdminDashboard) não
          // acha grupo/emoji — descartada aqui em vez de quebrar o card.
          .filter(p => catsById[p.categoria])
          .map(p => {
            const cat = catsById[p.categoria];
            return {
              id: p.id, cat: p.categoria, grupos: gruposById[p.categoria], emoji: cat.emoji,
              title: (p.descricao || cat.label || "Serviço").slice(0, 60),
              bairro: p.cidade || "sua região",
              value: p.valor,
              urgent: p.urgencia === "urgente" || p.urgencia === "muito_urgente",
              time: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "",
              // Demanda MULTI-SUP (origem='suporte') hoje só cobre São
              // Paulo/Guarulhos (as 36 cadastradas manualmente por Thiago,
              // 2026-09-02) — repetir as mesmas 2 cidades em dezenas de
              // cards reforçaria a mesma impressão de "app só atende essa
              // região" que já foi corrigida no topo da tela (ver
              // GuestHeader/locked). Pedido real orgânico continua
              // mostrando cidade normalmente (informação real e útil).
              // Quando houver demanda MULTI-SUP de outras regiões, isso
              // deixa de fazer sentido escondido — decisão é só sobre o
              // estado atual dos dados, não regra permanente.
              ocultarCidade: p.origem === "suporte",
            };
          });
        setPedidosGuest(mapped);
        setLoadingGuest(false);
      })
      .catch(() => { if (!cancelado) setLoadingGuest(false); });
    return () => { cancelado = true; };
  }, []);

  // Chip "Todos" + os 23 grupos completos (CAT_GRUPOS, mesma ordem do
  // seletor de categoria do perfil/publicação) — cada grupo usa o emoji do
  // primeiro item de CATS que pertence a ele, só pra ilustrar o chip.
  const CATS_FILTER = [
    { id:"all", label:"Todos", emoji:"📋" },
    ...CAT_GRUPOS.map(g => ({ id: g, label: g, emoji: CATS.find(c => c.grupo === g)?.emoji || "🔧" })),
  ];
  // cat "representante" do grupo selecionado — pra pré-selecionar categoria
  // no cadastro quando quem clica em "Tenho Interesse"/"Criar conta" não
  // veio de um card específico (ver onSignup abaixo).
  const filterCat = filter === "all" ? null : CATS.find(c => c.grupo === filter)?.id || null;

  const list = filter === "all" ? pedidosGuest : pedidosGuest.filter(s => s.grupos.includes(filter));

  // Document block wall (same logic as ProfessionalHome but for guests)
  if (allDocsVerified === false) {
    return (
      <div style={{ padding:"32px 20px", textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:"#FFF5F5", border:"2px solid #FECACA", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>🔒</div>
        <h3 style={{ fontSize:17, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Mural bloqueado</h3>
        <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.7, margin:"0 0 20px" }}>
          Verifique seus documentos no Perfil para visualizar serviços disponíveis.
        </p>
        <button onClick={() => onSignup()} style={{ padding:"13px 28px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${B},#0055d4)`, color:"white", fontWeight:900, fontSize:14, cursor:"pointer" }}>
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

        {/* filters — position:relative pras setas de rolagem ficarem
            ancoradas nas bordas da lista, não da tela inteira. */}
        <div style={{ position:"relative" }}>
          <div ref={catsScrollRef} onScroll={updateCatsScroll} style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", paddingBottom:12 }}>
            {CATS_FILTER.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)} style={{
                flexShrink:0, display:"flex", alignItems:"center", gap:5,
                padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:800,
                border:"none", cursor:"pointer", transition:"all .15s",
                background: filter === c.id ? "#1a1a2e" : "white",
                color:       filter === c.id ? "white"   : "#666",
                boxShadow:   filter === c.id ? "0 3px 10px rgba(0,0,0,.18)" : "0 1px 4px rgba(0,0,0,.08)",
              }}><span>{c.emoji}</span> {c.label}</button>
            ))}
          </div>
          {catsScroll.right && (
            <button onClick={() => scrollCats(1)} aria-label="Ver mais categorias" style={{
              position:"absolute", top:0, bottom:12, right:0, width:32,
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"none", cursor:"pointer", padding:0,
              background:`linear-gradient(90deg, transparent, ${BG} 55%)`,
            }}>
              <span style={{ width:24, height:24, borderRadius:"50%", background:"white", boxShadow:"0 2px 8px rgba(0,0,0,.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronRight size={15} color="#1a1a2e" />
              </span>
            </button>
          )}
          {catsScroll.left && (
            <button onClick={() => scrollCats(-1)} aria-label="Ver categorias anteriores" style={{
              position:"absolute", top:0, bottom:12, left:0, width:32,
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"none", cursor:"pointer", padding:0,
              background:`linear-gradient(270deg, transparent, ${BG} 55%)`,
            }}>
              <span style={{ width:24, height:24, borderRadius:"50%", background:"white", boxShadow:"0 2px 8px rgba(0,0,0,.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronRight size={15} color="#1a1a2e" style={{ transform:"rotate(180deg)" }} />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── SERVICE CARDS ── */}
      <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:14 }}>
        {loadingGuest ? (
          <div style={{ textAlign:"center", padding:"40px 24px", color:"#bbb" }}>
            <p style={{ fontSize:13 }}>Carregando demandas...</p>
          </div>
        ) : list.length === 0 ? (
          // Sem fallback de dado fictício de propósito (estratégia
          // abandonada 2026-08-30) — categoria nova/pouco povoada mostra
          // vazio de verdade em vez de inventar demanda. CTA de cadastro
          // continua abaixo mesmo assim (não depende de ter card nenhum).
          <div style={{ textAlign:"center", padding:"32px 24px", color:"#bbb" }}>
            <p style={{ fontSize:15, fontWeight:700 }}>Nenhuma demanda aberta nessa categoria ainda</p>
            <p style={{ fontSize:12, marginTop:4, lineHeight:1.6 }}>Cadastre-se pra ser avisado assim que aparecer uma demanda de {filter === "all" ? "qualquer categoria" : filter} perto de você.</p>
          </div>
        ) : list.map((s, idx) => {
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
                      {!s.ocultarCidade && (
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <MapPin size={11} color="#aaa" />
                          <span style={{ fontSize:12, color:"#888" }}>{s.bairro}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {s.urgent && (
                    <span style={{ background:"#FFF0EE", color:"#E53935", fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:99, border:"1px solid #FECACA", flexShrink:0 }}>🔥 Urgente</span>
                  )}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0 0", borderTop:"1px solid #F5F5F5" }}>
                  <div>
                    <p style={{ fontSize:11, color:"#aaa", margin:"0 0 1px", fontWeight:700 }}>Valor oferecido</p>
                    <span style={{ fontSize:22, fontWeight:900, color: s.value != null ? B : "#9CA3AF" }}>{s.value != null ? `R$ ${s.value}` : "A combinar"}</span>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:10, color:"#aaa", margin:"0 0 8px" }}>{s.time}</p>
                    <button
                      onClick={() => onSignup(s.cat)}
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
                  <button onClick={() => onSignup(s.cat)} style={{ padding:"9px 22px", borderRadius:99, border:"none", background:"white", color:"#1a1a2e", fontWeight:900, fontSize:13, cursor:"pointer" }}>
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
          Taxa de acesso R$ 9,90/mês · Acesso imediato ao mural completo
        </p>
        <button onClick={() => onSignup(filterCat)} style={{ padding:"13px 32px", borderRadius:14, border:"none", background:"white", color:B, fontWeight:900, fontSize:14, cursor:"pointer" }}>
          Criar conta e acessar →
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── PRATICAR CANDIDATURA (pedido fictício) ──────────────
   Substitui o botão desabilitado "Pedido de exemplo" — o pedido fictício
   continua com o badge "🧪 Exemplo" no card (não é pra se confundir com um
   pedido real), mas agora o profissional pode de fato praticar o fluxo de
   se candidatar/negociar, com um "cliente" simulado. 100% client-side, de
   propósito: não escreve em "propostas"/"mensagens" nem em nenhuma outra
   tabela — zero chance de um pedido fictício vazar pra métricas, relatório
   financeiro, notificação push ou matching com profissional real (só o
   admin controla origem='demo' no banco; essa tela nem sabe que essa
   coluna existe). Ver pedido "Ajustar exibição dos pedidos fictícios",
   2026-08-30.
   ──────────────────────────────────────────────────────────────────────── */
const PRATICA_RESPOSTAS_CLIENTE = [
  "Show, obrigado pela resposta! Vou avaliar e te chamo em breve.",
  "Perfeito, muito obrigado pela atenção! 🙏",
  "Entendi, pode ser sim! Vamos combinar os detalhes por aqui mesmo.",
  "Legal, gostei do seu atendimento. Vou confirmar e te aviso.",
];
function PraticaCandidaturaModal({ service, onClose }) {
  const [mensagens, setMensagens] = useState(() => [
    { from: "cliente", text: `Oi! Vi que você tem interesse no meu pedido de ${service?.cat ? CATS.find(c => c.id === service.cat)?.label || service.cat : "serviço"}. Pode me contar um pouco de como funcionaria o atendimento?` },
  ]);
  const [text, setText] = useState("");
  const [encerrada, setEncerrada] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [mensagens]);

  const enviar = () => {
    const msg = text.trim();
    if (!msg || encerrada) return;
    setText("");
    setMensagens(m => [...m, { from:"eu", text: msg }]);
    setTimeout(() => {
      const resposta = PRATICA_RESPOSTAS_CLIENTE[Math.floor(Math.random() * PRATICA_RESPOSTAS_CLIENTE.length)];
      setMensagens(m => [...m, { from:"cliente", text: resposta }]);
      setEncerrada(true);
    }, 900);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(15,23,42,.7)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:440, height:"85vh", background:"#F0F2F5", borderRadius:"24px 24px 0 0", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#9333EA,#7C3AED)", padding:"16px 18px", display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}><ArrowLeft size={20} color="white" /></button>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:900, color:"white" }}>{service?.client || "Cliente"} 🧪</p>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.75)" }}>Modo prática — não é um pedido real</p>
          </div>
        </div>
        <div style={{ background:"#FFF8E7", borderBottom:"1px solid #FDE68A", padding:"8px 16px" }}>
          <p style={{ margin:0, fontSize:11.5, color:"#92400E", fontWeight:700 }}>
            🧪 Simulação de treino — essa conversa não vai pra nenhum cliente de verdade e não conta como candidatura.
          </p>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
          {mensagens.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === "eu" ? "flex-end" : "flex-start", maxWidth:"78%", background: m.from === "eu" ? "#9333EA" : "white", color: m.from === "eu" ? "white" : "#1a1a2e", padding:"10px 14px", borderRadius:14, fontSize:13.5, lineHeight:1.5, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
              {m.text}
            </div>
          ))}
          {encerrada && (
            <div style={{ alignSelf:"center", marginTop:8, background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:12, padding:"10px 14px", textAlign:"center" }}>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#166534" }}>✅ Fim da simulação — nenhum dado foi enviado a um cliente real.</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div style={{ padding:"10px 14px", background:"white", borderTop:"1px solid #E5E7EB", display:"flex", gap:8 }}>
          <input
            value={text}
            disabled={encerrada}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") enviar(); }}
            placeholder={encerrada ? "Simulação encerrada" : "Digite sua resposta…"}
            style={{ flex:1, border:"1.5px solid #E5E7EB", borderRadius:99, padding:"10px 16px", fontSize:13.5, outline:"none" }} />
          <button onClick={enviar} disabled={encerrada || !text.trim()} style={{ width:40, height:40, borderRadius:"50%", border:"none", cursor: encerrada ? "default" : "pointer", background: encerrada ? "#E5E7EB" : "#9333EA", color:"white", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Send size={16} />
          </button>
        </div>
        {encerrada && (
          <div style={{ padding:"0 14px 14px" }}>
            <button onClick={onClose} style={{ width:"100%", padding:"12px 0", borderRadius:12, border:"none", background:"#1a1a2e", color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>
              Voltar ao Mural
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── PROFESSIONAL HOME ────────────────────────────────── */
function ProfessionalHome({ userName, userEmail, showToast, onGoToProfile, isPro, plano, planoInicio, planoStatus, planoExpiraEm, onViewService, onUpgrade, userLocation = "sua região", allDocsVerified, docStatus, onGoToDocs, onGoToOrders, onGoToWallet, onAcceptOrder, meusGanhos, saldoMoedas, onGoToComprarMoedas, onSaldoMoedasChange, taxaAcessoPendente = false }) {
  // Renovação da Taxa de Acesso via Pix (2026-08-27) — cartão renova
  // sozinho, mas Pix não, e o cron (server.js, /api/cron/lembretes) marca
  // "inadimplente" no vencimento sem aviso nenhum na tela até aqui. Banner
  // cobre os dois casos: já venceu (inadimplente — isPro já virou false
  // nesse ponto, ver carregarPlano em App.jsx) ou vence nos próximos 3 dias
  // (ainda "ativa", só um aviso preventivo, mesma janela usada pelo cron
  // pra mandar o e-mail).
  //
  // DORMENTE por dado, não por código (31/08/2026): "acesso" virou entrada
  // única sem vencimento — ativarAssinatura() no backend grava
  // planoExpiraEm=null pra esse plano (RENOVACAO_ACESSO_ATIVA=false), e o
  // cron não marca mais ninguém "inadimplente" por vencimento de Pix. Os
  // dois flags abaixo naturalmente ficam sempre false (acessoPrestesAVencer
  // exige planoExpiraEm truthy; acessoVencido exige status="inadimplente",
  // que não acontece mais por esse motivo). Não removido — só volta a
  // aparecer sozinho se a flag do backend for religada.
  const acessoVencido = plano === "acesso" && planoStatus === "inadimplente";
  const acessoPrestesAVencer = plano === "acesso" && planoStatus === "ativa" && planoExpiraEm
    && (new Date(planoExpiraEm).getTime() - Date.now()) <= 3 * 24 * 60 * 60 * 1000;
  const [online,       setOnline]       = useState(false);
  const [categoriaServico, setCategoriaServico] = useState([]);
  const [userCity, setUserCity] = useState("");
  const [newOrder, setNewOrder] = useState(null);
  // Dedupe do popup "Novo Pedido!" — pedidos que esse profissional já viu
  // (mostrados no popup) ou já é candidato (linha em "propostas") nesta
  // sessão não devem reaparecer como se fossem novos.
  const pedidosVistosRef = useRef(new Set());
  const pedidosChannelRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [realPedidos, setRealPedidos] = useState([]);
  // Pedidos fictícios (origem='demo', criados só pelo Admin) — preenchem o
  // mural quando a demanda real da categoria do profissional está baixa.
  // Ver threshold em `filtered` abaixo e o plano completo na memória
  // multi_dados_ficticios_plano. Efeito de busca fica logo abaixo de
  // podeVerEmpresarial (precisa dele pro mesmo filtro publico_alvo/
  // tipo_atendimento do fetch de reais — ver comentário lá).
  const [demoPedidos, setDemoPedidos] = useState([]);
  // Mesma reputação real (avaliacoes) já usada em ProfileScreen/ReputacaoBadge
  // — antes o card de estatísticas do Home era hardcoded (R$1.240/47/4.8)
  // igual pra todo mundo.
  const [reputacao, setReputacao] = useState(null);
  useEffect(() => { if (userEmail) fetchReputacao(userEmail).then(setReputacao); }, [userEmail]);
  // HANDOFF 2026-09-03: teto de "serviços/mês por plano" removido — não
  // existe mais cota, então isso passou de "usados no ciclo atual" (janela
  // rolante de 30 dias a partir de assinaturas.inicio) pra contagem total
  // (vida da conta) de serviços aceitos, sem comparação com limite nenhum.
  const [totalServicosAceitos, setTotalServicosAceitos] = useState(0);
  useEffect(() => {
    if (!userEmail) { setTotalServicosAceitos(0); return; }
    supabase.from("pedidos").select("id", { count: "exact", head: true })
      .eq("profissional_aceito", userEmail)
      .not("aceite_formal_profissional_em", "is", null)
      .then(({ count }) => setTotalServicosAceitos(count || 0))
      .catch(() => {});
  }, [userEmail]);
  // Demandas de empresa (publico_alvo:"pro") e demandas Empresariais
  // (tipo_atendimento:"empresarial") só entram no feed de quem é Multi Pro
  // ou Premium — Autônomo só vê pedido "geral"/residencial. Antes esse gate
  // só considerava plano==="pro" (Premium ficava de fora por uma lacuna
  // pré-existente, corrigida junto aqui em 2026-08-10).
  const podeVerEmpresarial = plano === "pro" || plano === "premium";
  useEffect(()=>{ supabase.from("pedidos").select("*").eq("status","aberto").neq("origem","demo").in("publico_alvo", podeVerEmpresarial ? ["geral","pro"] : ["geral"]).in("tipo_atendimento", podeVerEmpresarial ? ["residencial","empresarial"] : ["residencial"]).order("created_at",{ascending:false}).limit(50).then(({data})=>{ setRealPedidos((data||[]).map(mapPedidoParaCard)); }).catch(()=>{}); },[podeVerEmpresarial]);
  // Achado 2026-08-28 (revisão da feature antes de commitar): faltava aqui o
  // MESMO filtro publico_alvo/tipo_atendimento do fetch de reais logo acima
  // — sem isso, um fictício marcado publico_alvo:"pro" (demanda de empresa)
  // vazava pro mural de QUALQUER profissional, inclusive quem não é Multi
  // Pro/Premium e nunca deveria ver esse tipo de demanda (mesma regra de
  // negócio de podeVerEmpresarial, comentário acima). Fictício criado pelo
  // Admin sem preencher esses dois campos cai no default do banco (geral/
  // residencial, confirmado por amostragem — todo pedido real existente
  // tem esses valores), que já passa no filtro pros dois grupos.
  // Filtra por categoria no servidor (.in("categoria", categoriaServico)) —
  // achado 2026-08-29 populando a base pra todas as 161 categorias: o
  // "limit(30)" sozinho não escala, um fictício antigo (ex.: o de Sorocaba)
  // saía da janela dos 30 mais recentes assim que outras categorias
  // acumulavam mais linhas novas, sumindo do mural mesmo com cidade/
  // categoria batendo. Filtrar por categoria primeiro deixa o limit(30)
  // como rede de segurança de verdade (nunca deveria ter tantos fictícios
  // pra 1-2 categorias a ponto de estourar), em vez de ser o gargalo.
  // Só dispara depois de categoriaServico carregar (evita um fetch inicial
  // com .in([]) que a lib trata como "nenhum resultado").
  useEffect(() => {
    if (!categoriaServico.length) { setDemoPedidos([]); return; }
    supabase.from("pedidos").select("*").eq("status", "aberto").eq("origem", "demo").eq("demo_ativo", true)
      .in("categoria", categoriaServico)
      .in("publico_alvo", podeVerEmpresarial ? ["geral","pro"] : ["geral"])
      .in("tipo_atendimento", podeVerEmpresarial ? ["residencial","empresarial"] : ["residencial"])
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setDemoPedidos((data || []).map(mapPedidoParaCard)))
      .catch(() => {});
  }, [podeVerEmpresarial, categoriaServico]);

  // Contagem de candidatos por pedido — pra mostrar "Vagas esgotadas (6/6)"
  // no mural quando a oportunidade já bateu o limite de 6 respostas (ver
  // supabase_limite_candidatos_oportunidade_migration.sql, que é quem de
  // fato bloqueia no banco; isso aqui só evita o clique/viagem de rede
  // quando já dá pra saber que vai falhar, mesmo padrão de allDocsVerified).
  const LIMITE_CANDIDATOS_OPORTUNIDADE = 6;
  const [candidatosPorPedido, setCandidatosPorPedido] = useState({});
  useEffect(() => {
    const ids = realPedidos.map(p => p.id).filter(Boolean);
    if (ids.length === 0) { setCandidatosPorPedido({}); return; }
    supabase.from("propostas").select("pedido_id").in("pedido_id", ids)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(r => { counts[r.pedido_id] = (counts[r.pedido_id] || 0) + 1; });
        setCandidatosPorPedido(counts);
      })
      .catch(() => {});
  }, [realPedidos]);

  // Carrega categoria + status persistidos, mesmo padrão do handleToggleOnline da empresa.
  // userToggledRef evita que essa carga inicial (assíncrona) sobrescreva um clique em
  // "Ficar Online" que já tenha acontecido antes dela terminar — sem isso, um clique
  // rápido logo após a tela abrir "não fazia efeito" (a resposta do fetch chegava
  // depois e revertia o estado local pro valor antigo do banco).
  const userToggledRef = useRef(false);
  useEffect(() => {
    if (!userEmail) return;
    supabase.from("usuarios").select("categoria_servico,status,city").eq("email", userEmail).maybeSingle()
      .then(({ data }) => {
        setCategoriaServico(data?.categoria_servico || []);
        setUserCity(data?.city || "");
        if (!userToggledRef.current) setOnline(!!data?.status);
      })
      .catch(() => {});
  }, [userEmail]);

  const [showDocBlock, setShowDocBlock] = useState(false); // pop-up modal
  const [praticaService, setPraticaService] = useState(null); // pedido fictício aberto no modo prática (PraticaCandidaturaModal)
  // Gate de moeda (Fase 2) — profissional sem plano pago ativo (Autônomo/
  // Pro/Premium) tentando demonstrar interesse num serviço. Ver radar/mural
  // continua liberado sem plano; só a ação de se candidatar é bloqueada
  // aqui. Substituiu o antigo showPlanBlock (que só bloqueava e mandava pra
  // assinatura) — agora oferece pagar em moeda pra responder esse pedido
  // específico, sem precisar assinar. `gate` guarda o pedido sendo
  // respondido + a função `proceed` que de fato cria a candidatura depois
  // que o débito confirma (mesma escrita em "propostas" que cada ponto de
  // entrada já fazia antes, só adiada pra depois da confirmação do modal).
  const [gate,      setGate]      = useState(null); // { pedidoId, custoMoedas, proceed }
  const [gateBusy,  setGateBusy]  = useState(false);
  const [gateErro,  setGateErro]  = useState(null); // 'saldo_insuficiente' | 'erro' | null
  // Saldo mostrado no modal — busca fresco toda vez que o modal abre, em vez
  // de confiar no `saldoMoedas` (prop, carregado uma vez no login/troca de
  // role — ver carregarSaldoMoedas em App()). Achado 2026-08-17: profissional
  // via saldo antigo no modal (ex.: 2) enquanto o saldo real já tinha caído
  // pra 0 num gasto anterior, só descobrindo a diferença depois de confirmar
  // e levar "saldo insuficiente" do backend. null = ainda buscando.
  const [gateSaldoFresco, setGateSaldoFresco] = useState(null);

  const abrirGate = async (pedidoId, custoMoedas, proceed) => {
    setGate({ pedidoId, custoMoedas: custoMoedas ?? 4, proceed });
    setGateSaldoFresco(null);
    const { data } = await supabase.from("usuarios").select("saldo_moedas").eq("email", userEmail).maybeSingle();
    setGateSaldoFresco(data?.saldo_moedas ?? 0);
    onSaldoMoedasChange?.(); // mantém o state global (saldoMoedas) sincronizado também
  };

  const confirmarGastoMoeda = async () => {
    if (!gate || gateBusy) return;
    setGateBusy(true);
    setGateErro(null);
    try {
      const r = await fetch(`${API_BASE}/api/moedas/responder-oportunidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, pedidoId: gate.pedidoId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.error === "saldo_insuficiente") {
          setGateErro("saldo_insuficiente");
          setGateSaldoFresco(data.saldo ?? 0);
          onSaldoMoedasChange?.();
        } else {
          setGateErro("erro");
          showToast?.("❌ " + (data.error || "Não foi possível debitar moeda."), "#DC2626");
        }
        return;
      }
      onSaldoMoedasChange?.(data.saldo);
      gate.proceed();
      setGate(null);
    } catch (e) {
      setGateErro("erro");
      showToast?.("❌ Erro de conexão. Tente novamente.", "#DC2626");
    } finally {
      setGateBusy(false);
    }
  };

  const filters = [
    { id:"all",    label:"Todos",           emoji:"📋" },
    { id:"urgent", label:"Urgentes",         emoji:"🔥" },
    { id:"nearby", label:"Perto de Mim",     emoji:"📍" },
    { id:"topPay", label:"Melhor Pagamento", emoji:"💰" },
  ];

  const limitePlano = PLANO_LIMITES_USUARIO[plano] || PLANO_LIMITES_USUARIO.autonomo;

  // Normaliza nome de cidade pra comparar apesar do formato inconsistente
  // entre "Cidade" (perfil do profissional, ex.: userCity="Sao Paulo") e
  // "Cidade, UF" (fictício cadastrado como texto livre no Admin, ex.:
  // "Sorocaba, SP") — remove acento, baixa a caixa e corta na vírgula.
  const normalizaCidade = c => (c || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().split(",")[0].trim();

  const matchCategoriaECidade = s => {
    // Categoria incompatível = filtro, não bloqueio: o profissional simplesmente
    // não recebe a oportunidade (nunca aparece no mural). Antes só as demandas
    // de empresa (publico_alvo:"pro") eram filtradas por categoria — pedido
    // normal de cliente aparecia pra qualquer profissional online, de
    // qualquer categoria.
    if (!categoriaServico.includes(s.cat)) return false;
    // Demanda de empresa (publico_alvo:"pro") também exige bater a cidade —
    // sem isso, toda demanda aparecia pra qualquer Multi Pro da categoria
    // certa mas de qualquer cidade, diluindo o mural.
    if (s.publicoAlvo === "pro") {
      const cityOk = !!userCity && !!s.loc && s.loc.toLowerCase() === userCity.toLowerCase();
      if (!cityOk) return false;
    }
    return true;
  };
  const realMatch = realPedidos.filter(matchCategoriaECidade);
  // Fictício: prioriza cidade batendo com a do profissional, mas nunca
  // deixa o mural sem nenhum fictício só por causa de cobertura de cidade
  // (decisão do usuário 2026-08-29 — cobrir toda cidade do Brasil não é
  // viável, então mantém um conjunto padrão nas categorias mais comuns numa
  // cidade "modelo" e cai pra ele quando não existe fictício específico da
  // cidade do profissional). Cidade batendo continua tendo prioridade
  // quando existe — isso só é fallback, não substitui o match por cidade.
  const demoCategoriaMatch = demoPedidos.filter(matchCategoriaECidade);
  const demoCidadeMatch = demoCategoriaMatch.filter(s => {
    const uc = normalizaCidade(userCity), sc = normalizaCidade(s.loc);
    return !!uc && !!sc && uc === sc;
  });
  const demoMatch = demoCidadeMatch.length > 0 ? demoCidadeMatch : demoCategoriaMatch;
  // Pedido fictício só entra pra completar o mural quando a demanda real da
  // categoria do profissional está baixa (threshold N=3, plano aprovado
  // 2026-08-27) — nunca substitui demanda real, só preenche o vazio, e
  // nunca mais que 8 no total pra não parecer mercado saturado. Ver
  // multi_dados_ficticios_plano na memória.
  const feedBase = realMatch.length < 3 ? [...realMatch, ...demoMatch.slice(0, 8 - realMatch.length)] : realMatch;
  const filtered = feedBase.filter(s => {
    if (activeFilter === "urgent") return s.urgent;
    if (activeFilter === "topPay") return s.value >= 400;
    return true;
  });

  // supabase.channel(topic) reaproveita o canal existente se já houver um
  // com o mesmo nome (não cria um novo) — e removeChannel é assíncrono
  // (aguarda round-trip de rede pra desinscrever antes de tirar o canal do
  // registro interno). Por isso essa função precisa ser async/aguardada
  // antes de criar o próximo canal: sem isso, ligar/desligar rápido faz o
  // .channel(mesmoNome) seguinte reaproveitar o canal antigo (já inscrito),
  // e o .on(...) nele quebra com "cannot add callbacks after subscribe()" —
  // o canal antigo fica "zumbi" e o popup dispara sozinho depois.
  const pararEscutaPedidos = async () => {
    if (pedidosChannelRef.current) {
      const ch = pedidosChannelRef.current;
      pedidosChannelRef.current = null;
      await supabase.removeChannel(ch);
    }
  };
  useEffect(() => () => pararEscutaPedidos(), []);

  const handleFicarOnline=async()=>{
  const next=!online;
  userToggledRef.current=true;

  // Cadastro precisa estar aprovado (usuarios.approved) antes de poder
  // ficar online — sem isso o profissional apareceria pros clientes sem
  // nunca ter passado por revisão nenhuma. Esse check aqui é só UX
  // (mensagem clara antes de tentar); o bloqueio de verdade é o trigger
  // trg_block_online_sem_docs no Postgres (ver
  // supabase_aprovacao_profissional_ia_migration.sql) — sem ele, dava pra
  // contornar essa tela inteira só chamando o UPDATE direto pelo console.
  if(next && !allDocsVerified){
    showToast?.("⚠️ Seu documento está em análise. Você poderá aceitar serviços assim que for aprovado.", "#DC2626");
    onGoToDocs?.();
    return;
  }

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
  // Pedidos que esse profissional já é candidato (linha em "propostas") não
  // devem reaparecer como "Novo Pedido!" — sem isso, qualquer UPDATE nesse
  // pedido (cliente abrindo "Ver Propostas", entrando no chat, etc.) fazia
  // o popup reaparecer pra quem já tinha demonstrado interesse ou aceitado.
  supabase.from("propostas").select("pedido_id").eq("profissional_email", userEmail).then(({ data }) => {
    (data || []).forEach(p => pedidosVistosRef.current.add(p.pedido_id));
  }).catch(() => {});

  // Demanda de empresa (publico_alvo:"pro") nunca entra no popup de "aceitar
  // agora" — só via proposta (Candidatar-me no mural), por isso o filtro.
  // categoriaServico.includes(p.categoria) — bug achado 2026-08-07: esse
  // popup nunca filtrou por categoria (só a lista do mural, `filtered`,
  // filtrava), então qualquer pedido "geral" aberto disparava "Novo
  // Pedido!" pra qualquer profissional online, de qualquer categoria (ex.:
  // Pedreiro recebendo popup de pedido de Encanador). Mesmo filtro que
  // EmpresaHomeScreen já aplicava corretamente no seu próprio radar
  // (.in("categoria", categorias) + check no listener realtime) — só
  // faltava espelhar aqui.
  // .neq("origem","demo") — pedido fictício nunca deve disparar o popup
  // "Novo Pedido!" (só aparece passivamente navegando o mural, com badge).
  // Ver multi_dados_ficticios_plano na memória.
  supabase.from("pedidos").select("*").eq("status","aberto").eq("publico_alvo","geral").neq("origem","demo").order("created_at",{ascending:false}).limit(20).then(({data})=>{
    const proximo = (data || []).find(p => !pedidosVistosRef.current.has(p.id) && categoriaServico.includes(p.categoria));
    if(proximo){ pedidosVistosRef.current.add(proximo.id); setNewOrder(mapPedidoParaNewOrder(proximo)); }
  });

  // event:"INSERT" (em vez de "*") — o popup deve disparar só quando um
  // pedido É CRIADO, não em qualquer UPDATE de qualquer pedido da tabela
  // (era isso que fazia o mesmo pedido_id reaparecer repetidas vezes).
  await pararEscutaPedidos();
  pedidosChannelRef.current = supabase.channel("pedidos_novos_" + userEmail)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"pedidos",filter:"status=eq.aberto"},(payload)=>{
      const p=payload.new;
      if(!p||!p.fotos||p.fotos.length===0||p.publico_alvo==="pro")return;
      if(p.origem==="demo")return; // fictício nunca vira push "Novo Pedido!"
      if(!categoriaServico.includes(p.categoria))return;
      if(pedidosVistosRef.current.has(p.id))return;
      pedidosVistosRef.current.add(p.id);
      setNewOrder(mapPedidoParaNewOrder(p));
    }).subscribe();
}else{pararEscutaPedidos();}};
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

      {/* ── BANNER RENOVAÇÃO TAXA DE ACESSO (Pix, 2026-08-27) ── */}
      {(acessoVencido || acessoPrestesAVencer) && (
        <div onClick={onUpgrade} style={{
          margin:"14px 16px 0", padding:"14px 16px", borderRadius:16, cursor:"pointer",
          display:"flex", alignItems:"center", gap:12,
          background: acessoVencido ? "#FEF2F2" : "#FFF7ED",
          border: `1.5px solid ${acessoVencido ? "#FCA5A5" : "#FDBA74"}`,
        }}>
          <span style={{ fontSize:22 }}>{acessoVencido ? "🚫" : "⏰"}</span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:800, fontSize:13.5, color:"#1a1a2e", margin:0 }}>
              {acessoVencido ? "Sua Taxa de Acesso venceu — perfil fora do mural" : "Sua Taxa de Acesso vence em breve"}
            </p>
            <p style={{ fontSize:12, color:"#6C6F94", margin:"2px 0 0" }}>
              {acessoVencido
                ? "Pagamento via Pix não renova sozinho. Gere um novo Pix pra voltar a aparecer."
                : `Vence em ${planoExpiraEm ? new Date(planoExpiraEm).toLocaleDateString("pt-BR") : "breve"} — se pagou por Pix, renove antes pra não sair do mural.`}
            </p>
          </div>
          <span style={{ fontWeight:800, fontSize:12.5, color: acessoVencido ? "#DC2626" : "#EA580C", whiteSpace:"nowrap" }}>Renovar →</span>
        </div>
      )}

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

          {/* stats — mesma lógica real de ProfileScreen (meusGanhos + reputação
              via avaliacoes), não mais hardcoded igual pra todo mundo */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[
              { label:"Total recebido",  val:`R$ ${(meusGanhos || []).reduce((a, p) => a + (p.value || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits:2 })}`, color:"#4ade80" },
              { label:"Servicos feitos", val:String((meusGanhos || []).length), color:"white" },
              { label:"Avaliacao",       val: reputacao?.mediaEstrelas != null ? `${reputacao.mediaEstrelas.toFixed(1)} estrelas` : "—", color:"#F9A825" },
              { label:"Serviços aceitos", val: String(totalServicosAceitos), color:"#93C5FD" },
            ].map((s, i) => (
              <div key={i} onClick={i===0 ? onGoToWallet : i===1 ? onGoToOrders : undefined} style={{ flex:1, background:"rgba(255,255,255,.08)", borderRadius:12, padding:"9px 10px", cursor:(i===0||i===1)?"pointer":"default" }}>
                <p style={{ fontSize:11, color:"rgba(255,255,255,.45)", fontWeight:700, margin:0, lineHeight:1.3 }}>{s.label}</p>
                <p style={{ fontSize:17, fontWeight:900, color:s.color, margin:"3px 0 0" }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* FICAR ONLINE button — cinza/cadeado quando doc obrigatória
              pendente e ainda offline (só bloqueia LIGAR; se por algum
              motivo já estava online antes dessa trava existir, continua
              dando pra pausar normalmente). onClick continua chamando
              handleFicarOnline mesmo bloqueado — é ele quem mostra a
              mensagem específica de qual documento falta, mesmo padrão do
              botão "Candidatar-me" travado no mural. */}
          <button
            onClick={handleFicarOnline}
            className={online ? "pulse-online" : "pulse-offline"}
            style={{
              width:"100%", padding:"14px 0", borderRadius:16, border:"none", cursor:"pointer",
              background: online ? `linear-gradient(135deg,${G},#16a34a)` : !allDocsVerified ? "#1F2937" : "linear-gradient(135deg,#4B5563,#DC2626)",
              color: online ? "white" : !allDocsVerified ? "#6B7280" : "white",
              fontWeight:900, fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              transition:"background .3s, color .3s",
            }}>
            {!online && !allDocsVerified ? (
              <Lock size={17} />
            ) : (
              /* radar icon */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
                <path d="M7.76 7.76a6 6 0 0 0 0 8.49"/>
                <path d="M20.49 3.51a12 12 0 0 1 0 16.97"/>
                <path d="M3.51 3.51a12 12 0 0 0 0 16.97"/>
              </svg>
            )}
            {online ? "✓  Online — Clique para ficar Offline" : !allDocsVerified ? "Cadastro em análise" : "Offline — Clique para ficar Online"}
          </button>
        </div>
      </div>

      {/* Modal fixed inset:0 — precisa ficar fora do <button> "Ficar Online"
          (botão dentro de botão é HTML inválido e quebra o clique real do
          navegador em "Aceitar agora"/"Recusar"). */}
      {newOrder && <NewOrderCard order={newOrder} onAccept={()=>{
        stopNewOrderSound();setNewOrder(null);
        // Mesmo gate do botão "Tenho Interesse" do mural — sem plano pago
        // ativo, "Aceitar agora" também não pode virar candidatura direto,
        // mas agora oferece pagar em moeda em vez de só bloquear.
        const ordemAtual = newOrder;
        const proceed = () => { setOnline(false);pararEscutaPedidos();onAcceptOrder&&onAcceptOrder({id:ordemAtual.id,cliente_id:ordemAtual.cliente_id,title:ordemAtual.category,category:ordemAtual.category,clientName:safeGetUser().name||"Cliente",location:ordemAtual.location,value:ordemAtual.value,description:ordemAtual.description,photo:ordemAtual.photo,photos:ordemAtual.photos||[]}); };
        if (!isPro) { setOnline(false); pararEscutaPedidos(); abrirGate(ordemAtual.id, ordemAtual.custoMoedas, proceed); return; }
        proceed();
      }} onReject={()=>{stopNewOrderSound();setNewOrder(null);}} />}

      {/* ── UPGRADE BANNER (free users, sem plano ativo — some sozinho pra
          quem já é PRO, ver !isPro acima). taxaAcessoPendente troca a
          mensagem: "Vire Multi PRO — R$59,90/mês" está errada pra quem só
          deve os R$9,90 da Taxa de Acesso (achado 2026-08-28, ao liberar o
          mural como vitrine pra esse grupo — antes ele nunca chegava a ver
          esse banner, o gate bloqueava a tela inteira). ── */}
      {!isPro && (
        <div onClick={onUpgrade} style={{ margin:"14px 16px 0", borderRadius:16, padding:"13px 16px", background: taxaAcessoPendente ? `linear-gradient(135deg,${O},#E64A19)` : "linear-gradient(135deg,#7C3AED,#4F46E5)", display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow: taxaAcessoPendente ? "0 4px 16px rgba(255,87,34,.35)" : "0 4px 16px rgba(124,58,237,.35)" }}>
          {taxaAcessoPendente ? <Briefcase size={20} color="#FDE68A" style={{ flexShrink:0 }} /> : <Crown size={20} color="#FDE68A" style={{ flexShrink:0 }} />}
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:900, color:"white", margin:0 }}>
              {taxaAcessoPendente ? "🔓 Ative sua Taxa de Acesso — R$ 9,90/mês" : "👑 Vire Multi PRO — R$ 59,90/mês"}
            </p>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.7)", margin:0 }}>
              {taxaAcessoPendente ? "Confirme o pagamento pra poder se candidatar às oportunidades." : "Libere contatos, chat e acesso total."}
            </p>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,.7)" />
        </div>
      )}

      {/* ── CADASTRO EM ANÁLISE — visível direto no mural, sem precisar
          clicar em "Tenho Interesse" pra descobrir que ainda está pendente
          (item 13 do prompt: reforçar status/pendências em todas as telas
          relevantes). Some sozinho quando approved vira true. */}
      {!allDocsVerified && (
        <div onClick={onGoToDocs} style={{ margin:"14px 16px 0", borderRadius:16, padding:"13px 16px", background:"#FFFBEB", border:"1.5px solid #FDE68A", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:900, color:"#92400E", margin:0 }}>Seu documento está em análise</p>
            <p style={{ fontSize:11, color:"#B45309", margin:0 }}>Você poderá aceitar serviços assim que for aprovado.</p>
          </div>
          <ChevronRight size={18} color="#B45309" />
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={{ padding:"20px 16px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <h3 style={{ fontSize:16, fontWeight:900, color:"#1a1a2e", margin:0 }}>Mural de Serviços</h3>
          <span style={{ fontSize:12, color:"#888" }}>{filtered.length} disponíveis</span>
        </div>
        <HScrollArrows>
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
        </HScrollArrows>
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
          // Bloqueio por valor: categoria já bateu (senão nem chegava no
          // "filtered"), mas o valor do serviço passa do teto do plano atual
          // — a oportunidade continua visível (gatilho de upgrade), só não dá
          // pra demonstrar interesse nela.
          const valorExcede = limitePlano.valorMaxServico != null && s.value > limitePlano.valorMaxServico;

          return (
            <div key={s.id} style={{ position:"relative", borderRadius:20, overflow:"hidden", boxShadow:"0 3px 14px rgba(0,0,0,.09)" }}>

              {/* ── Card content — ALWAYS fully visible ── */}
              <div style={{ background:"white", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:cat?.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.emoji}</div>
                    <span style={{ fontWeight:800, fontSize:14, color:"#1a1a2e", lineHeight:1.35 }}>{s.title}</span>
                  </div>
                  {s.origem === "demo" && <Pill color="#9333EA" sm>🧪 Exemplo</Pill>}
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

                {valorExcede ? (
                  <PlanoUpgradeCTA plano={plano} onUpgrade={onUpgrade} />
                ) : (
                  <>
                    <div style={{ borderTop:"1px solid #F4F4F6", paddingTop:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:22, fontWeight:900, color: s.value != null ? B : "#9CA3AF" }}>{s.value != null ? `R$ ${s.value}` : "A combinar"}</span>
                      {/* client name — hidden for non-PRO e pra quem tem a
                          Taxa de Acesso pendente (mural agora é vitrine
                          pra esse grupo, mas o contato do cliente só
                          aparece depois de confirmar o pagamento). */}
                      <span style={{ fontSize:12, color:"#aaa", filter: isLocked ? "blur(4px)" : "none" }}>
                        👤 {isLocked ? "Cliente PRO" : taxaAcessoPendente ? "Disponível após ativar" : (s.client || "Cliente")}
                      </span>
                    </div>

                    {/* Action button — triggers doc-block popup if docs not verified,
                        ou o gate de moeda se não tem plano pago ativo (ver radar/mural
                        continua liberado sem plano; só demonstrar interesse é bloqueado
                        até pagar em moeda ou assinar). vagasEsgotadas checa o limite de
                        6 candidatos por oportunidade — quem bloqueia de verdade é o
                        trigger trg_limite_candidatos_propostas no Postgres (ver
                        supabase_limite_candidatos_oportunidade_migration.sql); isso aqui
                        só evita a viagem de rede quando já dá pra saber que vai falhar. */}
                    {(() => {
                      // Demanda MULTI-SUP (origem='suporte'): o "cliente" por
                      // trás não tem conta no app (é só o e-mail/telefone que
                      // o suporte digitou ao cadastrar por WhatsApp, ver
                      // multi_sup_captacao_manual na memória) — criar uma
                      // "proposta" esperando ele entrar no app pra aceitar
                      // deixaria o profissional parado pra sempre ("aguarde o
                      // cliente escolher" que nunca chega). Achado 2026-09-02:
                      // primeira tentativa foi abrir WhatsApp direto com o
                      // telefone do cliente — **revertido no mesmo dia**,
                      // decisão explícita: não expor telefone do cliente nas
                      // demandas MULTI-SUP nenhuma. Fluxo final é
                      // intermediação manual — clicar "Tenho Interesse" grava
                      // a proposta normal (mesma tabela, pra ficar visível
                      // pro Admin em "Interesses MULTI-SUP", ver
                      // AdminDashboard) mas SEM tentar abrir chat/WhatsApp
                      // nenhum (não teria pra onde ir, cliente não tem conta)
                      // — só avisa que a equipe vai ligar. isSuporteRegistro
                      // controla esse desvio; visualmente o botão continua
                      // idêntico ao "Tenho Interesse" normal.
                      const isSuporteRegistro = s.origem === "suporte";
                      const vagasEsgotadas = !isSuporteRegistro && (candidatosPorPedido[s.id] || 0) >= LIMITE_CANDIDATOS_OPORTUNIDADE;
                      return (
                    <button
                      disabled={s.origem !== "demo" && vagasEsgotadas}
                      onClick={e => {
                        e.stopPropagation();
                        // Pedido fictício (origem='demo') nunca vira proposta de verdade —
                        // ver plano em multi_dados_ficticios_plano na memória. Botão continua
                        // funcional (abre PraticaCandidaturaModal, 100% client-side) em vez
                        // de só desabilitado — troca feita 2026-08-30 (ver comentário na
                        // definição de PraticaCandidaturaModal acima).
                        if (s.origem === "demo") { setPraticaService(s); return; }
                        if (vagasEsgotadas) return;
                        if (!allDocsVerified) { setShowDocBlock(true); return; }
                        // Taxa de Acesso pendente (2026-08-28): antes desse
                        // check, isso cairia no "!isPro" logo abaixo e abriria
                        // o gate de MOEDA (abrirGate) — modelo errado pra
                        // quem está no plano "acesso" (comissão), que nunca
                        // deveria ver a alternativa de moeda (ver comentário
                        // em EscolherPlanoScreen/SemPlanoMoedaCard). Mural
                        // continua livre pra navegar (ver taxaAcessoPendente
                        // em renderContent); só demonstrar interesse é
                        // bloqueado até o pagamento confirmar.
                        if (taxaAcessoPendente) { onUpgrade(); return; }
                        const proUser=safeGetUser();
                        const candidatarSe = () => {
                          supabase.from("propostas").upsert({pedido_id:s.id,profissional_id:proUser.email||proUser.whatsapp,profissional_nome:proUser.name||"Profissional",profissional_email:proUser.email||proUser.whatsapp,valor:s.value,mensagem:"Tenho interesse neste serviço!",status:"pendente",cliente_email:s.cliente_id||""},{onConflict:"pedido_id,profissional_id"})
                            .then(({ error }) => {
                              if (error) {
                                showToast?.("❌ " + (error.message || "Não foi possível se candidatar a esse pedido."), "#DC2626");
                                return;
                              }
                              // Demanda MULTI-SUP: não tem cliente com conta
                              // no app pra abrir chat — só avisa que ficou
                              // registrado, equipe (Thiago/Ana) liga por
                              // fora do app usando a lista em
                              // "Interesses MULTI-SUP" no Admin.
                              if (isSuporteRegistro) {
                                showToast?.("✅ Interesse registrado! Nossa equipe vai entrar em contato em breve.", G);
                                return;
                              }
                              onViewService({ _notify:{ serviceId:s.id, serviceTitle:s.title, value:s.value, proName:proUser.name||"Profissional" } });
                            })
                            .catch(() => showToast?.("❌ Não foi possível se candidatar a esse pedido.", "#DC2626"));
                        };
                        if (!isPro) { abrirGate(s.id, s.custoMoedas, candidatarSe); return; }
                        if (isLocked) { onUpgrade(); return; }
                        candidatarSe();
                      }}
                      style={{ padding:"11px 0", borderRadius:12, border:"none", cursor: s.origem === "demo" ? "pointer" : vagasEsgotadas ? "not-allowed" : "pointer", fontWeight:900, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                        // taxaAcessoPendente entra ANTES do "!isPro" de
                        // propósito — visualmente é o mesmo botão laranja de
                        // quem já pagou (só o onClick acima redireciona pro
                        // pagamento em vez de candidatar), nunca o roxo de
                        // "pagar em moeda"/"assinar PRO" (modelo errado pra
                        // quem está no plano "acesso"). Demo usa o mesmo roxo
                        // do badge "🧪 Exemplo" — funcional, mas visualmente
                        // marcado como prática, nunca igual ao botão real.
                        background: s.origem === "demo" ? "linear-gradient(135deg,#9333EA,#7C3AED)" : vagasEsgotadas ? "#F5F6FA" : !allDocsVerified ? "#F5F6FA" : taxaAcessoPendente ? `linear-gradient(135deg,${O},#E64A19)` : !isPro ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : isLocked ? "linear-gradient(135deg,#7C3AED,#4F46E5)" : `linear-gradient(135deg,${O},#E64A19)`,
                        color:      s.origem === "demo" ? "white" : vagasEsgotadas ? "#9CA3AF" : !allDocsVerified ? "#9CA3AF" : "white",
                        boxShadow:  s.origem === "demo" ? "0 3px 10px rgba(147,51,234,.28)" : vagasEsgotadas ? "none" : !allDocsVerified ? "none" : taxaAcessoPendente ? "0 3px 10px rgba(255,87,34,.28)" : !isPro ? "0 3px 10px rgba(124,58,237,.28)" : isLocked ? "0 3px 10px rgba(124,58,237,.28)" : "0 3px 10px rgba(255,87,34,.28)",
                      }}>
                      {s.origem === "demo"
                        ? <>🧪 Praticar Candidatura</>
                        : vagasEsgotadas
                        ? "Vagas esgotadas (6/6)"
                        : !allDocsVerified
                        ? <><Lock size={13} /> Candidatar-me</>
                        : taxaAcessoPendente
                          ? "Tenho Interesse"
                          : !isPro
                            ? <>🪙 Responder{s.custoMoedas ? ` (${s.custoMoedas} moedas)` : ""}</>
                            : isLocked
                              ? <><Crown size={13} /> Assinar PRO</>
                              : "Tenho Interesse"}
                    </button>
                      );
                    })()}
                  </>
                )}
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

      {/* ══════════════════════ PRATICAR CANDIDATURA (pedido fictício) ══════════════════════ */}
      {praticaService && (
        <PraticaCandidaturaModal service={praticaService} onClose={() => setPraticaService(null)} />
      )}

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

              {/* Status pill — approvedStatus é boolean/null, não tem mais
                  "X/3" (o gate real hoje é um único approved, revisado a
                  partir do RG/CNH) */}
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"white", border:"1px solid #FDE68A", borderRadius:99, padding:"5px 14px", marginBottom:16, boxShadow:"0 2px 8px rgba(245,158,11,.15)" }}>
                <Clock size={13} color="#F59E0B" />
                <span style={{ fontSize:12, fontWeight:800, color:"#92400E" }}>Em análise</span>
              </div>

              <h2 style={{ fontSize:20, fontWeight:900, color:"#0F172A", margin:"0 0 10px", lineHeight:1.3, letterSpacing:"-.3px" }}>
                Seu documento está em análise
              </h2>
              <p style={{ fontSize:13, color:"#6B7280", lineHeight:1.7, margin:"0 0 24px", maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>
                Você poderá aceitar serviços assim que for aprovado.
              </p>
            </div>

            {/* ── DOCUMENTO (RG/CNH) — status real, único documento que
                condiciona a aprovação hoje ── */}
            <div style={{ padding:"0 20px 20px" }}>
              <p style={{ fontSize:11, fontWeight:800, color:"#94A3B8", textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 12px" }}>
                Documento enviado
              </p>
              {(() => {
                const st = docStatus?.rg || "pending";
                const isOk   = st === "verified";
                const isMid  = st === "analysis";
                const isMeio = st === "frente_enviada";
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:16, background: isOk ? "#F0FDF4" : (isMid || isMeio) ? "#FFFBEB" : "white", border:`1px solid ${isOk ? "#BBF7D0" : (isMid || isMeio) ? "#FDE68A" : "#E5E7EB"}` }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      🆔
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>RG / CNH</p>
                      <p style={{ fontSize:11, color:"#94A3B8", margin:0 }}>Documento de identidade</p>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, borderRadius:99, padding:"4px 11px", whiteSpace:"nowrap", flexShrink:0,
                      background: isOk ? "#DCFCE7" : (isMid || isMeio) ? "#FEF3C7" : "#F1F5F9",
                      color:      isOk ? "#166534" : (isMid || isMeio) ? "#92400E" : "#94A3B8",
                    }}>
                      {isOk ? "✓ Aprovado" : isMid ? "⏳ Em análise" : isMeio ? "Falta o verso" : "Pendente"}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* ── PRO CARD — centre of attention (só faz sentido oferecer upgrade
                pra quem ainda não é PRO; quem já é PRO só está bloqueado pela
                documentação mesmo, não precisa ver oferta de upgrade) ── */}
            {!isPro && (
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
            )}

            {/* ── SECONDARY ACTIONS ── */}
            <div style={{ padding:"0 20px 44px", display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
              <button
                onClick={() => { setShowDocBlock(false); onGoToDocs?.(); }}
                style={{ width:"100%", padding:"14px 0", borderRadius:16, border:"1.5px solid #007BFF", background:"white", color:"#007BFF", fontWeight:900, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <FileText size={16} /> COMPLETAR DOCUMENTAÇÃO
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

      {/* ══════════════ PLAN BLOCK POPUP — sem plano pago ativo ══════════════ */}
      {/* ══════════════════ GATE DE MOEDA — responder sem plano ══════════════════
          Substitui o antigo showPlanBlock (só bloqueava). Profissional sem
          plano pago ativo pode responder pagando custoMoedas do pedido, sem
          precisar assinar — link secundário ainda leva pra assinatura. */}
      {gate && (
        <div
          onClick={() => { if (!gateBusy) { setGate(null); setGateErro(null); } }}
          style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(15,23,42,.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ width:"100%", maxWidth:440, background:"white", borderRadius:"28px 28px 0 0", padding:"32px 24px 28px", textAlign:"center" }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"linear-gradient(135deg,#F59E0B,#D97706)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", boxShadow:"0 10px 24px rgba(217,119,6,.35)", fontSize:30 }}>
              🪙
            </div>
            {gateErro === "saldo_insuficiente" ? (
              <>
                <p style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Saldo insuficiente</p>
                <p style={{ fontSize:13.5, color:"#666", lineHeight:1.55, margin:"0 0 4px", padding:"0 6px" }}>
                  Responder a este serviço custa <b>{gate.custoMoedas} moedas</b>.
                </p>
                <p style={{ fontSize:13.5, color:"#666", lineHeight:1.55, margin:"0 0 24px", padding:"0 6px" }}>
                  Seu saldo atual é <b>{gateSaldoFresco ?? 0} moedas</b> — faltam {Math.max(0, gate.custoMoedas - (gateSaldoFresco ?? 0))}.
                </p>
                <button
                  onClick={() => { setGate(null); setGateErro(null); onGoToComprarMoedas?.(); }}
                  style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#F59E0B,#D97706)", color:"white", fontWeight:900, fontSize:14, boxShadow:"0 8px 22px rgba(217,119,6,.35)", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  🪙 Comprar moedas
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize:18, fontWeight:900, color:"#1a1a2e", margin:"0 0 8px" }}>Responder a este serviço custa {gate.custoMoedas} moedas</p>
                <p style={{ fontSize:13.5, color:"#666", lineHeight:1.55, margin:"0 0 24px", padding:"0 6px" }}>
                  {gateSaldoFresco === null
                    ? "Conferindo seu saldo atual..."
                    : <>Seu saldo atual: <b>{gateSaldoFresco} moedas</b>. Confirmando, o valor é debitado e você já pode demonstrar interesse nesse serviço.</>}
                </p>
                <button
                  onClick={confirmarGastoMoeda}
                  disabled={gateBusy || gateSaldoFresco === null}
                  style={{ width:"100%", padding:"15px 0", borderRadius:16, border:"none", cursor: (gateBusy || gateSaldoFresco === null) ? "default" : "pointer", background: (gateBusy || gateSaldoFresco === null) ? "#FCD9A8" : "linear-gradient(135deg,#F59E0B,#D97706)", color:"white", fontWeight:900, fontSize:14, boxShadow:"0 8px 22px rgba(217,119,6,.35)", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {gateBusy ? "Confirmando..." : gateSaldoFresco === null ? "Conferindo saldo..." : <>🪙 Confirmar e responder</>}
                </button>
              </>
            )}
            <button
              onClick={() => { setGate(null); setGateErro(null); onUpgrade?.(); }}
              style={{ width:"100%", padding:"10px 0", background:"none", border:"none", color:"#7C3AED", fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
              ou assine um plano e responda sem gastar moeda
            </button>
            <button
              onClick={() => { setGate(null); setGateErro(null); }}
              style={{ width:"100%", padding:"8px 0", background:"none", border:"none", color:"#94A3B8", fontSize:13, fontWeight:600, cursor:"pointer", textDecoration:"underline", textUnderlineOffset:3 }}>
              Agora não
            </button>
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

/* ───────────────────────── ROOT APP ─────────────────────────────────────────── */
// (o antigo painel "Admin Dashboard" client-only daqui — ADMIN_PASSWORD
// hardcoded no bundle, dados mock REVENUE_7D/PENDING_PROS/HOT_CATS, gate
// AdminLogin — foi removido 2026-08-15: código morto, nunca renderizado.
// showAdmin sempre abriu <AdminDashboard/>, o painel real, que já usa senha
// só-servidor + token HMAC assinado via POST /api/admin/login — ver
// server.js. Achado revisando pendências de segurança conhecidas do
// projeto: a "senha admin hardcoded" que constava como vulnerabilidade não
// corrigida era exatamente esse código morto.)

// Formata a linha crua de "pedidos" pro shape que o popup de radar
// (NewOrderCard) espera — usado tanto pelo profissional autônomo
// (ProfessionalHome) quanto pela empresa parceira (EmpresaHomeScreen).
function mapPedidoParaNewOrder(p) {
  let fotos = [];
  try { const f = p.fotos; fotos = Array.isArray(f) ? f : (typeof f === "string" ? JSON.parse(f) : []); } catch (e) { fotos = []; }
  return {
    id: p.id, cliente_id: p.cliente_id, category: p.categoria,
    location: p.cidade || "Guarulhos, SP", value: p.valor != null ? String(p.valor) : null,
    description: p.descricao || "", photos: fotos, photo: fotos[0] || null,
    custoMoedas: p.custo_moedas,
  };
}

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
            <div style={{fontSize:17,fontWeight:900,color:'#FF5722'}}>{order.value != null ? `R$ ${order.value}` : "A combinar"}</div>
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
      // (outras leituras de reputação no app filtram por profissional_id).
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
  // ── RESTORE SESSION FROM LOCALSTORAGE ────────────────────────────────────
  // Lido bem no topo porque tanto os useState iniciais logo abaixo quanto o
  // efeito que restaura a sessão real do Supabase Auth (mais adiante, perto
  // de isLoggedIn) precisam do mesmo valor.
  const savedSession = (() => {
    if (window.location.hash.includes("access_token")) return null;
    try { return JSON.parse(localStorage.getItem("multiSession")) || null; } catch { return null; }
  })();
  // 2026-08-13 (ver multi_login_hang_critico na memória): quando existe um
  // token pra restaurar, role/userRole/userName/userEmail/isLoggedIn NÃO
  // podem vir preenchidos direto do localStorage já no mount — é o mesmo
  // bug já corrigido no login (commit 2021c22), só que no boot: qualquer
  // efeito guardado por esses estados (carregarPlano, propostas,
  // notificações, meusPedidos...) dispararia na mesma hora que o
  // setSession() do efeito de restauração, competindo pelo mesmo lock do
  // GoTrueClient. Enquanto a sessão está sendo restaurada, os cinco ficam
  // no estado "deslogado" — só viram juntos depois que setSession()
  // confirma a sessão (ver useEffect logo abaixo de isLoggedIn), com o
  // lock já livre.
  const needsSessionRestore = !!savedSession?.token;
  const [role,      setRole]      = useState(() => {
    if (needsSessionRestore) return "client";
    try { return JSON.parse(localStorage.getItem("multiSession") || "null")?.role || "client"; }
    catch { return "client"; }
  });
  const [guestRole, setGuestRole] = useState("client"); // drives the header toggle for guests
  // Trava o toggle Cliente/Profissional/Empresa do GuestHeader — usado por
  // ?cadastro=profissional (ver useEffect abaixo): quem chega de um anúncio
  // já pagando por lead de profissional não pode ter uma saída fácil pra
  // "virar" cliente/empresa sem querer, então o guest fica preso no mural
  // profissional até completar cadastro/documento/pagamento.
  const [guestLocked, setGuestLocked] = useState(false);
  const [screen,    setScreen]    = useState("home");
  const [selected,  setSelected]  = useState(null);
  const [avaliacaoSvc, setAvaliacaoSvc] = useState(null);
  const [isPro,     setIsPro]     = useState(false);
  // Plano real do titular (profissional ou empresa), carregado de "assinaturas"
  // — antes disso isPro era só estado em memória (nunca refletia o Supabase).
  const [plano,          setPlano]          = useState(null);
  const [planoStatus,    setPlanoStatus]    = useState(null);
  const [planoExpiraEm,  setPlanoExpiraEm]  = useState(null);
  // Início da assinatura atual. HANDOFF 2026-09-03: não é mais usado pra
  // gate de cota de serviços/mês (removido) nem pra ciclo de troca de
  // categoria (também removido) — prop mantida por enquanto (outras telas
  // ainda a recebem) mas sem consumidor de verdade no momento.
  const [planoInicio,    setPlanoInicio]    = useState(null);
  // Modo Prestadora/Contratante da empresa "pro" — vive aqui (não como state
  // local de EmpresaHomeScreen) porque precisa sobreviver a navegações pra
  // fora dela (ver propostas, abrir chat) e voltar sem resetar sozinho.
  const [empresaModo, setEmpresaModo] = useState("prestadora");
  const carregarPlano = (titularTipo, titularEmail) => {
    if (!titularTipo || !titularEmail) { setPlano(null); setPlanoStatus(null); setPlanoExpiraEm(null); setPlanoInicio(null); setIsPro(false); return; }
    supabase.from("assinaturas").select("plano,status,expira_em,inicio")
      .eq("titular_tipo", titularTipo).eq("titular_email", titularEmail).maybeSingle()
      .then(({ data }) => {
        setPlano(data?.plano || null);
        setPlanoStatus(data?.status || null);
        setPlanoExpiraEm(data?.expira_em || null);
        setPlanoInicio(data?.inicio || null);
        setIsPro(!!data?.plano && (data.status === "trial" || data.status === "ativa"));
      })
      .catch(() => {});
  };
  // Saldo de moedas ("Multi Moeda", Fase 1) — só leitura aqui; a única forma
  // de subir é via creditar_moedas() no backend (ver ComprarMoedasScreen).
  // Nenhum lugar ainda desconta (isso é Fase 3), então por ora é só exibição.
  const [saldoMoedas, setSaldoMoedas] = useState(0);
  const carregarSaldoMoedas = (email) => {
    if (!email) { setSaldoMoedas(0); return; }
    supabase.from("usuarios").select("saldo_moedas").eq("email", email).maybeSingle()
      .then(({ data }) => setSaldoMoedas(data?.saldo_moedas || 0))
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

  // Document verification state — shared between ProfileScreen e ProfessionalHome.
  // Carregado de verdade do Supabase logo abaixo (efeito [userEmail]) — ver
  // allDocsVerified, calculado a partir desse estado. docStatus continua só
  // pro badge informativo que o profissional vê no próprio Perfil (Pendente/
  // Em análise/Verificado/Reprovado) — quem decide de verdade se ele pode
  // aceitar serviço é approvedStatus, abaixo.
  const [docStatus, setDocStatus] = useState({
    rg:      "pending",
    crim:    "pending",
    address: "pending",
  });
  // "approved" (usuarios.approved) é o gate real — só o admin muda isso, no
  // painel Multi Admin, olhando o RG/CNH + parecer da IA (ver
  // supabase_aprovacao_profissional_ia_migration.sql). null = ainda não
  // carregou / carregou e a coluna sumiu por causa do bug de durabilidade
  // desse projeto (ver supabase_multifuncao_project na memória) — falha
  // aberto nesses dois casos (libera geral) em vez de bloquear todo
  // profissional real por um problema de infra que não é dele. Só um
  // "false" explícito (reprovação real, ou default novo pra cadastro que
  // nunca foi revisado) bloqueia de verdade.
  const [approvedStatus, setApprovedStatus] = useState(null);
  const [docStatusIndisponivel, setDocStatusIndisponivel] = useState(false);
  const allDocsVerified = approvedStatus !== false;

  // Reaplica a sessão real do Supabase Auth (JWT) no reload — sem isso,
  // quem já estava logado antes continua "logado" na UI (multiSession no
  // localStorage), mas toda chamada supabase.from(...) volta a ir como
  // anônima até deslogar/logar de novo.
  //
  // Achado investigando "foto/telefone somem do Perfil" (2026-08-10): uma
  // sessão salva sem token (de antes deste wiring, commit 20ce467) ou com
  // um token que falha ao restaurar deixa o app "logado" na UI pra sempre,
  // mas o client Supabase real fica anônimo — silenciosamente, sem erro
  // nenhum. Tabelas com RLS restrita a `authenticated` (usuarios, pedidos,
  // propostas, chat_propostas_valor — Fase 1 de hardening) então leem/gravam
  // vazio pra sempre nessa sessão (SELECT volta [], UPDATE "sucede" sem
  // alterar nada, já que RLS bloqueando 0 linhas não é um erro pro
  // supabase-js). Detecta os dois casos e força um novo login — a única
  // forma de recuperar um JWT válido de verdade.
  //
  // 2026-08-13: além disso, isLoggedIn/userEmail/role/userRole/userName só
  // viram "logado" aqui dentro (nunca no mount — ver needsSessionRestore lá
  // em cima), depois que setSession() confirma a sessão. timeout de 8s força
  // reauth em vez de assumir logado — diferente do fix de login (2021c22,
  // que pode ser otimista pois a senha já foi validada num backend real
  // antes), aqui ainda não sabemos se o token salvo é válido; assumir logado
  // sem confirmar reintroduziria exatamente o bug silencioso do parágrafo
  // acima.
  useEffect(() => {
    const forceReauth = () => {
      try { localStorage.removeItem("multiSession"); localStorage.removeItem("multiUser"); } catch {}
      setIsLoggedIn(false);
      setUserEmail("");
      setAuthScreen("welcome");
      showToast?.("🔒 Sua sessão expirou. Entre novamente.", "#DC2626");
    };
    if (savedSession?.token) {
      Promise.race([
        supabase.auth.setSession({ access_token: savedSession.token, refresh_token: savedSession.refreshToken }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout 8s")), 8000)),
      ])
        .then(({ data, error }) => {
          if (error || !data?.session) {
            console.warn("[auth] sessão salva inválida/expirada, forçando novo login:", error?.message);
            forceReauth();
            return;
          }
          // setSession() rotaciona o refresh token (uso único no Supabase Auth)
          // — sem regravar o par novo aqui, o localStorage fica com o token
          // antigo já consumido. Qualquer outra aba/reload que restaure a
          // sessão em seguida lê esse token velho e recebe "400 Invalid
          // Refresh Token: Already Used" (corrida entre abas na mesma conta,
          // achado 2026-08-27 durante teste de pagamento). Persistindo o par
          // rotacionado de volta, a próxima restauração (nesta aba ou em
          // qualquer outra que ainda não tenha rodado) usa o token válido.
          try {
            const novoToken = { token: data.session.access_token, refreshToken: data.session.refresh_token };
            const prevSession = JSON.parse(localStorage.getItem("multiSession") || "{}") || {};
            localStorage.setItem("multiSession", JSON.stringify({ ...prevSession, ...novoToken }));
            const prevUser = JSON.parse(localStorage.getItem("multiUser") || "{}") || {};
            localStorage.setItem("multiUser", JSON.stringify({ ...prevUser, ...novoToken }));
          } catch (e) { console.warn("[auth] falha ao regravar token rotacionado:", e.message); }
          setIsLoggedIn(true);
          setUserEmail(savedSession.email || "");
          setUserRole(savedSession.role || "client");
          setRole(savedSession.role || "client");
          setUserName(savedSession.name || "");
        })
        .catch(err => { console.error("[auth] setSession (boot) não confirmou a sessão:", err.message); forceReauth(); });
    } else if (savedSession) {
      console.warn("[auth] sessão local sem token Supabase Auth — forçando novo login");
      forceReauth();
    }
  }, []);
  // Auth: starts as guest, modal layers appear on demand — ou "logado" de
  // cara só quando não há nada pra restaurar (needsSessionRestore=false);
  // com token salvo, começa deslogado até o efeito acima confirmar.
  const [isLoggedIn,    setIsLoggedIn]    = useState(!!savedSession && !needsSessionRestore);
  // Home é a tela inicial pra todo mundo agora, logado ou não — a
  // role-select ("Você está aqui para contratar ou trabalhar?") deixou de
  // ser o gate de entrada do app e virou uma
  // etapa de contexto disparada de dentro da Home (banner "Vire
  // Profissional" e bloco "Empresa"), então authScreen começa sempre null.
  // Mantém também o motivo original de nunca mostrar a landing por cima de
  // uma sessão válida num reload: authScreen nunca era reconciliado com
  // isLoggedIn/savedSession no mount, e agora nem precisa ser.
  const [authScreen,    setAuthScreen]   = useState(null);
  const [signupRole,    setSignupRole]   = useState("client");
  // Categoria pré-selecionada vinda do carrossel/card do GuestMural (ex.:
  // clicou em "Elétrica e Automação" ou num card específico de eletricista)
  // — carrega até o CompletarPerfilScreen pra não perguntar de novo o que a
  // pessoa já demonstrou querer (ver handoff 2026-09-02).
  const [signupCategoria, setSignupCategoria] = useState([]);
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
  // Categoria pré-selecionada ao abrir "Novo Pedido" a partir de um card da
  // grade da Home ou de um chip do modal "Ver todas as categorias" — "" quando
  // a entrada foi genérica (FAB, banner "Novo Pedido"), pra não vazar a
  // seleção de uma visita anterior.
  const [pendingCat,    setPendingCat]    = useState("");
  // needsSessionRestore=true: começam vazios/"client" até o efeito de boot
  // (perto de isLoggedIn) confirmar a sessão e virar os cinco juntos — ver
  // comentário grande lá.
  const [userRole,      setUserRole]      = useState(needsSessionRestore ? "client" : (savedSession?.role || "client"));
  const [userName,      setUserName]      = useState(needsSessionRestore ? ""       : (savedSession?.name || ""));

  const [activeChat,    setActiveChat]    = useState(null);
  const [userEmail,     setUserEmail]     = useState(needsSessionRestore ? ""       : (savedSession?.email || ""));

  useEffect(() => {
    const titularTipo = role === "professional" ? "usuario" : role === "empresa" ? "empresa" : null;
    carregarPlano(titularTipo, userEmail);
    carregarSaldoMoedas(userEmail);
  }, [userEmail, role]);

  // Status real de documentação + flag de conta híbrida (cliente+profissional)
  // — antes docStatus nunca saía do estado local (ver histórico em
  // supabase_pendencias_doc_pagamento_migration.sql).
  const [isHybrid, setIsHybrid] = useState(false);
  useEffect(() => {
    if (!userEmail) { setDocStatus({ rg:"pending", crim:"pending", address:"pending" }); setIsHybrid(false); setDocStatusIndisponivel(false); setApprovedStatus(null); return; }
    supabase.from("usuarios").select("doc_rg_status,doc_crim_status,doc_address_status,is_hybrid,approved").eq("email", userEmail).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setDocStatusIndisponivel(true); setApprovedStatus(null); console.warn("[docStatus] indisponível:", error.message); return; }
        setDocStatusIndisponivel(false);
        setDocStatus({
          rg:      data?.doc_rg_status      || "pending",
          crim:    data?.doc_crim_status    || "pending",
          address: data?.doc_address_status || "pending",
        });
        setIsHybrid(!!data?.is_hybrid);
        // undefined (coluna sumiu por bug de durabilidade) -> null -> falha
        // aberto, igual ao resto do projeto. false explícito é o único caso
        // que bloqueia.
        setApprovedStatus(data?.approved === false ? false : data?.approved === true ? true : null);
      })
      .catch(() => { setDocStatusIndisponivel(true); setApprovedStatus(null); });
  }, [userEmail]);

  // MEUS PEDIDOS — fonte única real (Fase 1 de consolidação): cliente vê os
  // próprios pedidos (cliente_id), profissional vê os que aceitou
  // (profissional_aceito). Antes só existia leitura por profissional_aceito —
  // o cliente nunca via os próprios pedidos reais nesta lista.
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [meusPedidosLoading, setMeusPedidosLoading] = useState(false);
  // Colunas da listagem — de propósito SEM "fotos"/"conclusao_fotos_*".
  // Achado ao vivo: pedidos antigos (de antes do upload ir pro Storage)
  // guardam a foto inteira em base64 direto nessa coluna jsonb — um único
  // registro chega a 7.8MB. Com select("*") em todos os pedidos de uma
  // conta (104, nesse caso), a resposta passava de 22MB e 3-6s, e o
  // gateway ocasionalmente derrubava a conexão com 500 — que o .catch()
  // abaixo engolia silenciosamente, deixando a tela mostrar "0 pedidos"
  // em todas as abas mesmo com os dados intactos no banco (o cliente_id
  // filtrado nunca esteve errado). MyServicesScreen não renderiza foto
  // nenhuma, então tirar daqui não perde nada na listagem — quem abre o
  // detalhe de um pedido específico busca "fotos" à parte (ver
  // abrirDetalheServico) só pra aquela linha, não pra lista inteira.
  const PEDIDO_LIST_COLS = "id,cliente_id,cliente_nome,profissional_aceito,profissional_nome,categoria,descricao,valor,cep,cidade,status,created_at,chegada_solicitada_em,inicio_confirmado_em,concluido_em,contestado_em,contestacao_motivo,cancelado_motivo,cancelado_por,concluido_cliente_em,concluido_profissional_em";
  const refreshMeusPedidos = () => {
    if (!userEmail) { setMeusPedidos([]); return; }
    setMeusPedidosLoading(true);
    const query = role === "professional"
      ? supabase.from("pedidos").select(PEDIDO_LIST_COLS).eq("profissional_aceito", userEmail)
      : supabase.from("pedidos").select(PEDIDO_LIST_COLS).eq("cliente_id", userEmail);
    query.order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) {
        console.error("refreshMeusPedidos:", error);
        showToast?.("Não foi possível carregar seus pedidos agora. Puxe pra atualizar ou tente de novo em instantes.", "#DC2626");
        setMeusPedidosLoading(false);
        return;
      }
      setMeusPedidos((data || []).map(mapPedidoRow));
      setMeusPedidosLoading(false);
    }).catch((err) => {
      console.error("refreshMeusPedidos:", err);
      showToast?.("Não foi possível carregar seus pedidos agora. Puxe pra atualizar ou tente de novo em instantes.", "#DC2626");
      setMeusPedidosLoading(false);
    });
  };
  // Busca a foto de UM pedido específico só quando a pessoa abre o
  // detalhe — mantém a listagem leve (ver PEDIDO_LIST_COLS acima) sem
  // esconder a foto de quem realmente quer ver. Falha silenciosa aqui é
  // aceitável (mostra o detalhe sem foto em vez de travar a tela toda).
  const abrirDetalheServico = (s, destino = "service") => {
    setSelected(s);
    setScreen(destino);
    if (!s?.id) return;
    supabase.from("pedidos").select("fotos,conclusao_fotos_cliente,conclusao_fotos_profissional").eq("id", s.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setSelected(sel => sel?.id === s.id ? {
          ...sel,
          photos: data.fotos || [],
          photo: (data.fotos || [])[0] || null,
          conclusao_fotos_cliente: data.conclusao_fotos_cliente,
          conclusao_fotos_profissional: data.conclusao_fotos_profissional,
        } : sel);
      })
      .catch(() => {});
  };
  useEffect(() => { refreshMeusPedidos(); }, [screen, userEmail, role]);

  // Deep link do anúncio (Facebook Ads → template de saudação do WhatsApp,
  // e também public/site.html, botões "Sou profissional"/"Quero ser Multi")
  // — ?cadastro=profissional. Mudou 2026-09-01: antes pulava direto pro
  // formulário de cadastro; agora cai no Mural de Serviços com oportunidades
  // reais (mesma tela que o toggle "Profissional" do header mostra pro
  // convidado — ver GuestMural/guestRole==="professional" no render), porque
  // é isso que convence a pessoa a completar o cadastro, não um formulário
  // em branco. "guestLocked" tira o toggle Cliente/Profissional/Empresa do
  // header pra quem entra por aqui — não pode ter escape pra outro papel no
  // meio de um lead pago, fica preso em profissional até completar
  // cadastro/documento/pagamento (ver GuestHeader). Intenção já veio
  // explícita do próprio clique no anúncio/botão (mesmo tratamento que
  // RoleSelectScreen dá pro card "Quero trabalhar" — ver
  // multi_cadastro_empresa_home_cliente_bug na memória). Só age pra quem
  // chega deslogado; se a pessoa já tiver sessão salva, ignora (não faz
  // sentido reabrir cadastro por cima de uma conta já logada).
  useEffect(() => {
    if (isLoggedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("cadastro") !== "profissional") return;
    setGuestRole("professional");
    setGuestLocked(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, [isLoggedIn]);

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

  // Refs só pra ler o valor mais recente de isLoggedIn/userEmail de dentro
  // do listener nativo abaixo, que é registrado uma única vez (deps []) —
  // sem isso o closure ficaria travado nos valores do primeiro render.
  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => { isLoggedInRef.current = isLoggedIn; }, [isLoggedIn]);
  const userEmailRef = useRef(userEmail);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  // Init nativo do OneSignal + deep link por toque na notificação (Capacitor).
  // Só roda de verdade dentro do app empacotado — em navegador comum
  // (Capacitor.isNativePlatform()===false) essa branch nunca executa, o site
  // segue 100% no caminho web de sempre (SDK via <script> no index.html).
  //
  // IMPORTANTE — depende de uma mudança no backend que este repo não cobre:
  // hoje o cron de lembretes (MULTI-BACKEND, repo separado) manda o link de
  // clique como URL (?tela=concluir&pedido=<id>), lido pelo useEffect logo
  // acima via window.location.search — isso não existe num toque de push
  // nativo. Pra esse deep link funcionar de verdade no app nativo, o envio
  // da notificação (api/notify-*.js e o cron de lembretes) precisa incluir
  // additionalData:{tela:"concluir", pedido:<id>} no payload da OneSignal,
  // não só a URL. Sem isso, o listener abaixo nunca recebe nada útil — fica
  // pronto no front-end, mas o encaminhamento de dado é meio a meio entre
  // os dois repos. Não verificado contra app nativo real (sem device/
  // simulador nesse ambiente).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    OneSignalNative.initialize(ONESIGNAL_APP_ID);

    const onNotificationClick = (event) => {
      const data = event?.notification?.additionalData || {};
      if (data.tela !== "concluir" || !data.pedido) return;
      if (!isLoggedInRef.current || !userEmailRef.current) return;
      supabase.from("pedidos").select("*").eq("id", data.pedido).maybeSingle().then(({ data: pedido }) => {
        if (!pedido) return;
        const email = userEmailRef.current;
        if (pedido.cliente_id === email) setRole("client");
        else if (pedido.profissional_aceito === email) setRole("professional");
        setSelected(mapPedidoRow(pedido));
        setScreen("service");
      }).catch(() => {});
    };
    OneSignalNative.Notifications.addEventListener("click", onNotificationClick);
    return () => OneSignalNative.Notifications.removeEventListener("click", onNotificationClick);
  }, []);

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
  // Trava sincrona (não é state) contra clique duplo/repetido no mesmo card
  // antes do re-render remover a proposta de propostasRecebidas — sem isso,
  // dois cliques no mesmo tick ainda enxergam a proposta como "pendente" e
  // disparam notify-aceito/insert em "notificacoes" de novo.
  const acceptingPropostaIds = useRef(new Set());
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

  // Notificações de evento (proposta aceita / pedido aceito direto) — pro sino
  // funcionar pros dois lados (cliente e profissional), diferente das
  // propostasRecebidas acima que só cobrem o cliente recebendo proposta nova.
  const [eventNotifications, setEventNotifications] = useState([]);
  useEffect(() => {
    if (!userEmail) { setEventNotifications([]); return; }
    supabase.from("notificacoes").select("*").eq("destinatario_email", userEmail)
      .order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setEventNotifications(data || []));
    const ch = supabase.channel("notificacoes_" + userEmail)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificacoes", filter: `destinatario_email=eq.${userEmail}` },
        payload => setEventNotifications(p => [payload.new, ...p]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userEmail]);

  // Marca como lidas quando o usuário abre a tela de Alertas.
  useEffect(() => {
    if (screen !== "alerts" || !userEmail) return;
    const unreadIds = eventNotifications.filter(n => !n.lida).map(n => n.id);
    if (unreadIds.length) {
      supabase.from("notificacoes").update({ lida: true }).in("id", unreadIds).then(()=>{});
      setEventNotifications(evs => evs.map(n => unreadIds.includes(n.id) ? { ...n, lida: true } : n));
    }
  }, [screen]);

  const notificationsFromPropostas = [
    ...propostasRecebidas.map(p => ({
      kind: "proposta", id: p.id, proName: p.profissional_nome, proposal: p.mensagem,
      serviceTitle: pedidoTitlesById[p.pedido_id] || "Serviço", value: p.valor,
      status: p.status === "pendente" ? "pending" : "accepted", pedido_id: p.pedido_id,
    })),
    ...eventNotifications.map(n => ({
      kind: "evento", id: n.id, titulo: n.titulo, mensagem: n.mensagem, lida: n.lida, created_at: n.created_at, pedido_id: n.pedido_id,
    })),
  ];
  const [userLocation,  setUserLocation]  = useState(localStorage.getItem("multiLocation") || savedSession?.location || "sua região");
  useEffect(() => {
    const sess = (() => { try { return JSON.parse(localStorage.getItem("multiUser")) || {}; } catch { return {}; } })();
    const email = sess.email || savedSession?.email || "";
     if (!email) { return; }
    fetch("https://multi-backend-lfwp.onrender.com/api/enderecos/" + encodeURIComponent(email))
      .then(r => r.json())
      .then(data => {
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
     if (!email) { return; }
    fetch("https://multi-backend-lfwp.onrender.com/api/enderecos/" + encodeURIComponent(email))
      .then(r => r.json())
      .then(data => {
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

    if (!email || !email.includes("@")) return;

    try {
      const response = await fetch(`${API_URL}/api/email/boas-vindas`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, role }),
      });

      if (response.ok) {
        showToast(`📧 E-mail enviado para ${email}`, role === "client" ? B : O);
      } else {
        const data = await response.json().catch(() => ({}));
        console.error("Falha ao enviar e-mail de boas-vindas:", data.error || response.status);
        showToast("⚠️ E-mail não enviado. Verifique o terminal.", "#EF4444");
      }

    } catch (err) {
      console.error("Erro de rede ao chamar o backend de e-mail:", err.message);
    }
  };

  // ── INTENT-BASED AUTH GATE ──────────────────────────────────────────────────
  // Mitigação rápida (2026-09-01): abria direto em "welcome" (100% linguagem
  // de cliente — "Entrar ou Criar Conta"), então quem chegava sem role já
  // conhecida (ex: tráfego de anúncio querendo ser profissional, sem passar
  // pelo link especial ?cadastro=profissional) caía sempre no cadastro
  // padrão de cliente e só descobria depois de já logado que virar
  // profissional era outra ação. "role-select" já existe pronto (pergunta
  // "contratar ou trabalhar?", mesma tela que o botão "Vire Profissional"
  // usa) — só reaproveitando como porta de entrada padrão pra quem ainda não
  // declarou intenção nenhuma. Não muda nada do resto do fluxo: quem escolhe
  // "cliente" cai em "welcome" igual antes (ver authScreen==="role-select"
  // acima), quem escolhe "profissional" vai direto pro RegisterScreen já com
  // a intenção certa. Ver multi_cadastro_leads_profissional_facebook_ads na
  // memória.
  const requireAuth = (intent, fn) => {
    if (isLoggedIn) { fn(); return; }
    setPendingIntent({ fn });
    setAuthScreen("role-select");
  };

  const handleLoginComplete = (name = "", email = "", isNewAccount = false, location = "", registeredRole = "", whatsapp = "", dbRole = null, isHybrid = false) => {
    // Normaliza pra minúsculo antes de qualquer coisa — achado 2026-09-01
    // (caso Anderson/karinegatinhadomc): a releitura de "role" logo abaixo
    // faz .eq("email", email), comparação sensível a maiúscula/minúscula, e
    // nada nesse fluxo normalizava isso. WebView Android (Capacitor) capitaliza
    // a primeira letra em campos de texto comuns por padrão mesmo com
    // type="email" — sem esse toLowerCase(), um e-mail digitado como
    // "Fulano@gmail.com" contra um banco com "fulano@gmail.com" não batia,
    // a releitura voltava vazia e o login caía no role antigo em cache
    // (silenciosamente, sem erro), repetindo o mesmo resultado errado a
    // cada novo login. Aplicado uma vez aqui porque email flui daqui pra
    // session/userEmail/upsert/releitura — não precisa repetir em cada
    // callsite.
    email = (email || "").trim().toLowerCase();

    // Preserva o token/refreshToken já salvo por LoginScreen ou pelo
    // cadastro (ver /api/auth/login, /api/auth/cadastro).
    let tokenPrevio = {};
    try {
      const prev = JSON.parse(localStorage.getItem("multiSession") || "{}") || {};
      if (prev.token) tokenPrevio = { token: prev.token, refreshToken: prev.refreshToken };
    } catch {}

    // CRÍTICO (achado 2026-08-12, ver multi_login_hang_critico na
    // memória): setSession() e qualquer supabase.from(...) (inclusive a
    // releitura de role logo abaixo e o upsert dentro de finishLogin)
    // disputam o MESMO lock interno do GoTrueClient (setSession/getSession
    // serializam por storageKey, lockAcquireTimeout = 5s antes de "roubar"
    // o lock — ver node_modules/@supabase/auth-js/dist/.../lib/locks.js).
    // Virar isLoggedIn/userEmail/role ANTES de setSession() terminar
    // dispara na mesma hora uma cascata de efeitos ([userEmail,role] →
    // carregarPlano, propostas, notificações, meusPedidos...), cada um
    // chamando getSession() por baixo dos panos pra montar o header de
    // auth — todos competindo pelo lock ao mesmo tempo que setSession()
    // ainda está em voo. Num cliente Supabase "frio" (primeira chamada de
    // auth desta aba — exatamente o caso de login puro numa sessão nova,
    // sem cache) isso empilha vários ciclos de timeout+"roubo de lock",
    // travando a aba por dezenas de segundos (reproduzido ao vivo: 40s+ até
    // destravar sozinho). Fix: espera setSession() terminar ANTES de virar
    // o estado que dispara a cascata — timeout de 3s como rede de segurança
    // pra não trocar "às vezes trava" por "sempre espera pra sempre" se
    // setSession() genuinamente falhar.
    //
    // MOVIDO PRA CÁ, pra ANTES da releitura de role (achado 2026-08-18, ver
    // multi_cadastro_empresa_home_cliente_bug na memória): esse
    // setSessionPromise antes só existia dentro de finishLogin, chamado
    // DEPOIS da query "supabase.from('usuarios').select(...)" logo abaixo
    // já ter rodado — ou seja, a releitura de role SEMPRE disparava com o
    // client Supabase ainda anônimo (sem o JWT real aplicado). RLS bloqueia
    // SELECT anônimo em "usuarios" por completo, então "data" sempre vinha
    // null e todo login de conta empresa/profissional caía no fallback
    // "client" — não era uma corrida de sorte, a ordem estava sempre
    // errada. Agora setSession() é aguardado ANTES da releitura, não só
    // antes de virar o state.
    const setSessionPromise = tokenPrevio.token
      ? Promise.race([
          supabase.auth.setSession({ access_token: tokenPrevio.token, refresh_token: tokenPrevio.refreshToken })
            .catch(err => console.error("[auth] setSession falhou:", err.message)),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ])
      : Promise.resolve();

    const finishLogin = (resolvedRole, nomeSalvo) => {
      // Nome de exibição: no cadastro, usa o que a pessoa digitou em "Nome
      // Completo" (única fonte confiável). Em logins seguintes, prioriza o
      // que já está salvo em "usuarios" (nosso banco) em vez do "name" que
      // o backend de autenticação devolve — esse backend é externo e só
      // confirma senha; em contas mais antigas ele devolve o prefixo do
      // e-mail como nome, e usar isso aqui sobrescrevia o nome certo a cada
      // login (mesmo tipo de bug já corrigido abaixo pra whatsapp/city).
      const nomeFinal = isNewAccount ? name : (nomeSalvo || name);
      const firstName = (nomeFinal || "").trim().split(/\s+/)[0];

      // setSessionPromise já foi aguardado antes da releitura de role (ver
      // comentário acima) — chegou até aqui, então já resolveu; só falta
      // aplicar o resultado ao state.
      setIsLoggedIn(true);
      setAuthScreen(null);
      if (nomeFinal) setUserName(firstName);
      if (email)    setUserEmail(email);
      if (location && location !== "sua região") setUserLocation(location);
      setUserRole(resolvedRole);
      setRole(resolvedRole);

      // Save session to localStorage — persists across page reloads
      let upsertPromise = Promise.resolve();
      try {
        const session = { name: firstName, email, whatsapp, location, role: resolvedRole, ...tokenPrevio };
        localStorage.setItem("multiSession", JSON.stringify(session));
        localStorage.setItem("multiUser",    JSON.stringify(session));
        // "role" só entra nesse upsert na criação da conta (isNewAccount).
        // Em logins seguintes, gravar role aqui sobrescrevia o valor real do
        // Supabase com o que estava cacheado na sessão local, revertendo
        // silenciosamente contas que tinham virado "professional" depois do
        // cadastro original. Troca de role fora do cadastro só acontece pelo
        // fluxo explícito (onSwitchRole, "Sou profissional"/"Sou cliente").
        const upsertPayload = { email: session.email };
        // Cadastro novo por aqui é sempre client/professional (empresa tem seu próprio
        // fluxo/upsert em CadastroEmpresaScreen) — zera empresa_id pra não herdar o
        // vínculo de um teste/conta anterior que usou o mesmo e-mail como empresa,
        // o que travava esse e-mail pra sempre como "empresa" no login (ver abaixo).
        // "name" segue o mesmo raciocínio: só grava na criação da conta.
        // "dbRole" existe pra conta "cliente e profissional" (RegisterScreen,
        // pergunta "cliente/profissional/os dois"): a sessão abre no modo
        // Cliente (session.role), mas usuarios.role grava "professional" de
        // verdade — sem isso a conta não aparece no Banco de Profissionais
        // mesmo tendo completado categoria/termo/plano no cadastro.
        if (isNewAccount) { upsertPayload.name = session.name; upsertPayload.role = dbRole || session.role || "client"; upsertPayload.empresa_id = null; if (isHybrid) upsertPayload.is_hybrid = true; }
        // whatsapp/city só entram no payload quando vêm com valor de verdade
        // (cadastro novo, via fast-form). Login normal sempre chama isso com
        // whatsapp="" e location="" (LoginScreen não coleta nenhum dos dois),
        // e incluir a chave no upsert com "" -> null sobrescrevia o que já
        // estava salvo em ProfileScreen a cada login — o telefone cadastrado
        // depois do cadastro original sumia toda vez que a sessão precisava
        // logar de novo (ex: aba anônima, sessão expirada, outro navegador).
        if (session.whatsapp) upsertPayload.whatsapp = session.whatsapp;
        if (session.location) upsertPayload.city = session.location;
        // Aguarda o upsert terminar antes de ir pra Home — sem isso, ia pra
        // "home" na hora (setScreen síncrono) enquanto o upsert ainda estava
        // em voo, e qualquer tela que lê usuarios.role assim que monta (ex:
        // banner "Vire Profissional" do ClientHome) corria contra esse write
        // e pegava o valor antigo, mesmo o registro certo ficando garantido
        // no banco poucos instantes depois (achado testando "ambos" ao vivo).
        //
        // CRÍTICO (achado 2026-08-27, investigando "tela mostra sucesso mas
        // 'usuarios' fica sem a linha"): isso tinha .catch(()=>{}) — qualquer
        // falha no upsert (RLS, rede, o que for) era engolida em silêncio,
        // sem log e sem avisar a pessoa, e o fluxo seguia pra Home como se
        // tivesse dado certo. Reproduzido ao vivo: cadastro de profissional
        // com auth.users criado mas usuarios NUNCA gravado, zero rastro nos
        // logs. Agora loga o erro e avisa via toast — sem bloquear a ida pra
        // Home (mesmo comportamento de antes), só parando de esconder a
        // falha.
        upsertPromise = supabase.from("usuarios").upsert(upsertPayload, { onConflict: "email" })
          .then(({ error }) => {
            if (error) {
              console.error("[handleLoginComplete] upsert usuarios falhou:", error.message, { email: session.email, isNewAccount });
              showToast(
                isNewAccount
                  ? "⚠️ Conta criada, mas houve um problema ao salvar seu perfil. Complete seu perfil novamente em instantes."
                  : "⚠️ Não foi possível salvar as últimas alterações do seu perfil. Tente novamente.",
                "#EF4444"
              );
            }
          })
          .catch(err => {
            console.error("[handleLoginComplete] upsert usuarios falhou (exceção):", err?.message || err, { email: session.email, isNewAccount });
            showToast("⚠️ Não foi possível salvar seu perfil. Verifique sua conexão e tente novamente.", "#EF4444");
          });
      } catch {}

      upsertPromise.then(() => {
        setScreen("home");
        // Plano real (assinaturas) é carregado pelo efeito de [userEmail, role]
        // logo abaixo — dispara tanto aqui (login) quanto na restauração de
        // sessão do localStorage num reload de página.
        if (isNewAccount) {
          setTimeout(() => sendWelcomeEmail({ name: nomeFinal, email, role: resolvedRole }), 400);
        }
        if (pendingIntent?.fn) {
          const fn = pendingIntent.fn;
          setPendingIntent(null);
          setTimeout(fn, 80);
        }
      });
    };

    const fallbackRole = registeredRole || userRole;

    // A releitura de role (e o setSession acima) só fazem sentido depois
    // que setSessionPromise resolveu — ver o comentário grande lá em cima
    // (achado 2026-08-18) sobre por que isso não podia mais rodar solto,
    // fora do .then().
    setSessionPromise.then(() => {
      if (!email) { finishLogin(fallbackRole); return; }

      // Uma conta com empresa_id vinculado é sempre "empresa", mesmo que o role
      // devolvido pelo login/cadastro diga outra coisa — evita que login/registro
      // regrave "client"/"professional" por cima de uma conta de empresa parceira.
      // "name" vem junto pelo mesmo motivo do comentário em finishLogin.
      //
      // "role" também vem junto pelo mesmo motivo (achado 2026-08-15): o backend
      // de login (/api/auth/login em MULTI-BACKEND/server.js) lê o perfil de
      // "users" — tabela morta, 0 linhas, mesma raiz do bug já documentado em
      // multi_admin_dashboard_endpoint_mismatch — então "registeredRole" que
      // chega aqui via LoginScreen é sempre "client", nunca o role real da
      // conta. Sem essa releitura, todo profissional (não-híbrido) caía na home
      // de Cliente a cada login e precisava alternar manualmente toda vez em
      // Perfil → "Alternar para Profissional". Só aplica em login de conta
      // JÁ EXISTENTE (!isNewAccount) — cadastro novo continua decidido por
      // dbRole/fallbackRole como antes, a linha do upsert logo abaixo.
      supabase.from("usuarios").select("empresa_id,name,role").eq("email", email).maybeSingle()
        .then(({ data }) => {
          const resolvedRole = data?.empresa_id
            ? "empresa"
            : (!isNewAccount && data?.role) ? data.role : fallbackRole;
          finishLogin(resolvedRole, data?.name);
        })
        .catch(() => finishLogin(fallbackRole));
    });
  };

  // ── SERVICE HANDLERS (Fase 1: fluxo único real, nada aqui é mock) ───────────
  const handlePostServiceSuccess = (pedidoReal) => {
    setSelected(pedidoReal);
    setScreen("radar");
    refreshMeusPedidos();
  };

  // Avisa (push) e marca como "recusada" os outros candidatos de um pedido/
  // demanda depois que um é escolhido — antes ficavam "pendente" pra sempre,
  // sem nenhuma sinalização de que a vaga já foi preenchida.
  const notificarCandidatosRecusados = (pedidoId, propostaEscolhidaId) => {
    supabase.from("propostas").select("id,profissional_email,profissional_id").eq("pedido_id", pedidoId).eq("status", "pendente").neq("id", propostaEscolhidaId)
      .then(({ data }) => {
        const outras = data || [];
        if (!outras.length) return;
        supabase.from("propostas").update({ status: "recusada" }).in("id", outras.map(p => p.id)).then(()=>{});
        const emails = outras.map(p => p.profissional_email || p.profissional_id).filter(Boolean);
        if (emails.length) {
          fetch(`${NOTIFY_API}/notify-recusado`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ emails }) }).catch(()=>{});
        }
      })
      .catch(()=>{});
  };

  // Usada tanto por PropostasScreen ("Ver Propostas" → aceitar) quanto por
  // AlertsScreen ("Aceitar" direto no alerta) — antes eram dois caminhos
  // redundantes, um real e um mock.
  const handleAceitarProposta = (proposta) => {
    // Remove do estado local na hora — a query em propostasRecebidas só busca
    // status "pendente" mesmo, então isso já reflete o que um refetch traria,
    // e faz o card sumir de AlertsScreen sem esperar round-trip do Supabase.
    setPropostasRecebidas(prev => prev.filter(p => p.id !== proposta.id));
    supabase.from("propostas").update({ status:"aceita" }).eq("id", proposta.id).then(()=>{});
    notificarCandidatosRecusados(proposta.pedido_id, proposta.id);
    // Avisa o profissional vencedor que a proposta dele foi aceita — antes
    // só os recusados recebiam push (notificarCandidatosRecusados), o
    // vencedor não tinha nenhum sinal e só descobria abrindo o app.
    fetch(`${NOTIFY_API}/notify-aceito`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: proposta.profissional_id, servico: pedidoTitlesById[proposta.pedido_id] }),
    }).catch(()=>{});
    // Grava também no sino de notificações in-app (independente do push),
    // pra aparecer em Alertas mesmo se o navegador não entregar a notificação.
    supabase.from("notificacoes").insert({
      destinatario_email: proposta.profissional_id,
      titulo: "Proposta aceita! 🎉",
      mensagem: `O cliente aceitou sua proposta para "${pedidoTitlesById[proposta.pedido_id] || "Serviço"}".`,
      pedido_id: proposta.pedido_id,
    }).then(()=>{});
    // ficava travado no valor original do cliente pra sempre, e Ganhos do
    // Mês (e qualquer outra tela que leia service.value) somava o valor
    // errado quando a proposta aceita tinha um valor diferente do postado.
    supabase.from("pedidos").update({
      status:"em_andamento",
      profissional_aceito: proposta.profissional_id,
      profissional_nome: proposta.profissional_nome,
      valor: proposta.valor,
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
    setPropostasRecebidas(prev => prev.filter(p => p.id !== proposta.id));
    supabase.from("propostas").update({ status:"aceita" }).eq("id", proposta.id).then(()=>{});
    notificarCandidatosRecusados(proposta.pedido_id, proposta.id);
    // Avisa o profissional vencedor que a proposta dele foi aceita (mesmo
    // motivo do handleAceitarProposta acima).
    fetch(`${NOTIFY_API}/notify-aceito`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: proposta.profissional_id, servico: pedidoTitlesById[proposta.pedido_id] }),
    }).catch(()=>{});
    supabase.from("notificacoes").insert({
      destinatario_email: proposta.profissional_id,
      titulo: "Proposta aceita! 🎉",
      mensagem: `O cliente aceitou sua proposta para "${pedidoTitlesById[proposta.pedido_id] || "Serviço"}".`,
      pedido_id: proposta.pedido_id,
    }).then(()=>{});
    // Só abre o chat depois do update de "pedidos" terminar — antes disso,
    // MinhasDemandasScreen podia remontar e buscar o pedido ainda com o status
    // antigo (a escrita ainda não tinha chegado no banco).
    supabase.from("pedidos").update({
      status:"em_andamento",
      profissional_aceito: proposta.profissional_id,
      profissional_nome: proposta.profissional_nome,
      valor: proposta.valor,
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
    if (!proposta || proposta.status !== "pendente" || acceptingPropostaIds.current.has(propostaId)) return;
    acceptingPropostaIds.current.add(propostaId);
    handleAceitarProposta(proposta);
  };

  // "Aceitar agora" no popup de novo pedido (NewOrderCard) — antes gravava
  // direto em pedidos.status="em_andamento", travando o pedido pro primeiro
  // que clicasse, sem o cliente poder ver outros candidatos. Agora só entra
  // como candidatura em "propostas", exatamente como o "Tenho Interesse" do
  // mural (App.jsx, upsert com onConflict:"pedido_id,profissional_id") — o
  // cliente escolhe entre todos os candidatos em PropostasScreen, e só nesse
  // momento (handleAceitarProposta) o pedido de fato trava.
  const handleCandidatarPedidoDireto = (pedidoId, clienteId, valor, nomeOverride) => {
    if (!pedidoId || !userEmail) return;
    // Mesmo check de allDocsVerified do "Ficar Online" — chamado direto
    // pelo "Aceitar agora" do popup de novo pedido, que não passa pelo
    // botão "Candidatar-me" do mural (esse já bloqueava). Bloqueio de
    // verdade é o trigger trg_block_proposta_sem_docs no Postgres (ver
    // supabase_aprovacao_profissional_ia_migration.sql), checando
    // usuarios.approved; isso aqui só evita a viagem de rede quando já dá
    // pra saber que vai falhar.
    if (!allDocsVerified) {
      showToast?.("⚠️ Seu documento está em análise. Você poderá aceitar serviços assim que for aprovado.", "#DC2626");
      return;
    }
    supabase.from("propostas").upsert({
      pedido_id: pedidoId,
      profissional_id: userEmail,
      profissional_nome: nomeOverride || userName || "Profissional",
      profissional_email: userEmail,
      valor: valor != null && valor !== "" ? valor : null,
      mensagem: "Tenho interesse neste serviço!",
      status: "pendente",
      cliente_email: clienteId || "",
    }, { onConflict: "pedido_id,profissional_id" })
      .then(({ error }) => {
        if (error) showToast?.("❌ " + (error.message || "Não foi possível se candidatar a esse pedido."), "#DC2626");
      });
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

  // Card de evento no sino (proposta aceita / pedido aceito / mensagem de
  // chat / confirmação de agendamento) leva direto pro chat do pedido
  // relacionado — os 4 tipos só existem depois que o pedido já tem
  // profissional aceito, então abrir o chat é sempre a ação certa.
  const handleOpenNotificacao = (n) => {
    if (!n.pedido_id) { showToast?.("Não foi possível abrir — pedido não encontrado.", "#DC2626"); return; }
    supabase.from("pedidos").select("*").eq("id", n.pedido_id).maybeSingle()
      .then(({ data }) => {
        if (!data) { showToast?.("Esse pedido não existe mais.", "#DC2626"); return; }
        openChatFromService(mapPedidoRow(data));
      })
      .catch(() => showToast?.("Não foi possível abrir o pedido.", "#DC2626"));
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

  // Centraliza a persistência de mudança de status do pedido — hoje usada
  // pelo cancelamento de pedido ainda "aberto" (RadarSearchScreen). Não
  // cobre a transição pra "concluido" (bilateral, ver handleConfirmarConclusao)
  // nem pra "executando" (Fase 5, ver handleConfirmarInicio — exige código).
  const handlePedidoStatusChange = (id, novoStatus) => {
    const extra = novoStatus === "concluido" ? { concluido_em: new Date().toISOString() } : {};
    supabase.from("pedidos").update({ status: novoStatus, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id).then(()=>refreshMeusPedidos()).catch(()=>{});
  };

  // Fase 5 — código de confirmação de início. "Cheguei ao local" só grava o
  // timestamp de chegada (o código em si é determinístico, calculado local
  // dos dois lados — ver generateCodigoInicio); o status só avança pra
  // "executando" depois que o profissional digita o código de volta.
  const handleSolicitarChegada = (pedidoId, onError) => {
    supabase.from("pedidos").update({ chegada_solicitada_em: new Date().toISOString() }).eq("id", pedidoId).select().maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("handleSolicitarChegada:", error);
          showToast?.("Não foi possível avisar a chegada: " + (error.message || "tente novamente."), "#DC2626");
          onError?.();
          return;
        }
        refreshMeusPedidos();
        if (data) setSelected(sel => sel?.id === pedidoId ? mapPedidoRow(data) : sel);
        supabase.from("mensagens").insert({
          pedido_id: pedidoId,
          remetente_email: userEmail,
          texto: "📍 Cheguei ao local! Confira o código de início no seu app e informe pra mim confirmar.",
        }).then(({ error: msgError }) => { if (msgError) console.error("handleSolicitarChegada (mensagem):", msgError); });
      })
      .catch((err) => {
        console.error("handleSolicitarChegada:", err);
        showToast?.("Erro de conexão ao avisar chegada.", "#DC2626");
        onError?.();
      });
  };

  // Chamado só depois que o componente já validou localmente que o código
  // digitado bate com generateCodigoInicio(pedidoId) — aqui só persiste.
  const handleConfirmarInicio = (pedidoId, onError) => {
    supabase.from("pedidos").update({
      status: "executando", inicio_confirmado_em: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", pedidoId).select().maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("handleConfirmarInicio:", error);
          showToast?.("Não foi possível confirmar o início: " + (error.message || "tente novamente."), "#DC2626");
          onError?.();
          return;
        }
        refreshMeusPedidos();
        if (data) setSelected(sel => sel?.id === pedidoId ? mapPedidoRow(data) : sel);
        supabase.from("mensagens").insert({
          pedido_id: pedidoId,
          remetente_email: userEmail,
          texto: "✅ Início do serviço confirmado! Status: Em execução.",
        }).then(({ error: msgError }) => { if (msgError) console.error("handleConfirmarInicio (mensagem):", msgError); });
      })
      .catch((err) => {
        console.error("handleConfirmarInicio:", err);
        showToast?.("Erro de conexão ao confirmar início.", "#DC2626");
        onError?.();
      });
  };

  // Conclusão bilateral (Fase 4): cada lado só grava sua própria coluna
  // pareada (mesmo padrão do aceite formal). Só quando os dois lados já
  // confirmaram é que o pedido de fato vira "concluido".
  const handleConfirmarConclusao = (pedidoId, lado, observacao, fotos) => {
    const campoTempo = lado === "cliente" ? "concluido_cliente_em" : "concluido_profissional_em";
    const campoObs   = lado === "cliente" ? "conclusao_observacao_cliente" : "conclusao_observacao_profissional";
    const campoFotos = lado === "cliente" ? "conclusao_fotos_cliente" : "conclusao_fotos_profissional";
    supabase.from("pedidos").select("concluido_cliente_em,concluido_profissional_em").eq("id", pedidoId).maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        const outroJaConfirmou = lado === "cliente" ? data?.concluido_profissional_em : data?.concluido_cliente_em;
        const updates = { [campoTempo]: new Date().toISOString(), [campoObs]: observacao || null, [campoFotos]: (fotos && fotos.length) ? fotos : null };
        if (outroJaConfirmou) { updates.status = "concluido"; updates.concluido_em = new Date().toISOString(); }
        return supabase.from("pedidos").update(updates).eq("id", pedidoId).select().maybeSingle();
      })
      .then(({ data, error }) => {
        if (error) throw error;
        refreshMeusPedidos();
        // Sem isso, a tela de detalhe aberta (selected) ficava com o
        // snapshot antigo — o pedido virava "concluido" no banco mas a UI
        // continuava presa em "Em Execução" até sair e voltar pra tela.
        if (data) setSelected(sel => sel?.id === pedidoId ? mapPedidoRow(data) : sel);
      })
      .catch((err) => {
        console.error("handleConfirmarConclusao:", err);
        showToast?.("Não foi possível registrar a conclusão: " + (err.message || "tente novamente."), "#DC2626");
      });
  };

  // Cancelamento pós-aceite (Fase 5): diferente do cancelamento de "aberto"
  // (handlePedidoStatusChange), esse exige motivo e avisa o outro lado via
  // chat — o pedido já tem profissional aceito, então sumir sem explicação
  // deixaria o outro lado no vácuo. Conta como "cancelado" na reputação,
  // mesma lógica que já vale pra qualquer pedido cancelado (fetchReputacao).
  const handleCancelarPedidoPosAceite = (pedidoId, lado, motivo) => {
    supabase.from("pedidos").update({
      status: "cancelado",
      cancelado_motivo: motivo,
      cancelado_por: lado,
      updated_at: new Date().toISOString(),
    }).eq("id", pedidoId).select().maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("handleCancelarPedidoPosAceite:", error);
          showToast?.("Não foi possível cancelar o pedido: " + (error.message || "tente novamente."), "#DC2626");
          return;
        }
        refreshMeusPedidos();
        if (data) setSelected(sel => sel?.id === pedidoId ? mapPedidoRow(data) : sel);
        supabase.from("mensagens").insert({
          pedido_id: pedidoId,
          remetente_email: userEmail,
          texto: `❌ Pedido cancelado. Motivo: ${motivo}`,
        }).then(({ error: msgError }) => { if (msgError) console.error("handleCancelarPedidoPosAceite (mensagem):", msgError); });
      })
      .catch((err) => {
        console.error("handleCancelarPedidoPosAceite:", err);
        showToast?.("Erro de conexão ao cancelar pedido.", "#DC2626");
      });
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
    supabase.auth.signOut().catch(() => {});
    showToast("👋 Até logo!");
  };

  const notifCount = notificationsFromPropostas.filter(n => n.kind === "evento" ? !n.lida : n.status === "pending").length;

  // ── SCREEN ROUTER ───────────────────────────────────────────────────────────
  function PropostasScreen({ pedido, onBack, onAceitarProposta }) {
  const [propostas, setPropostas] = useState([]);
  const [perfis, setPerfis] = useState({}); // email -> { foto_perfil_url, bio, categoria_servico }
  const [reputacoes, setReputacoes] = useState({}); // email -> { mediaEstrelas, totalAvaliacoes, concluidos, taxaConclusao }
  const [loading, setLoading] = useState(true);
  const [viewingCandidato, setViewingCandidato] = useState(null); // { email, isEmpresa }
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
          const { data: usuarios } = await supabase.from("usuarios").select("email,foto_perfil_url,bio,categoria_servico,role").in("email", emails);
          const map = {};
          (usuarios || []).forEach(u => { map[u.email] = { ...u, isEmpresa: u.role === "empresa" }; });
          // Fallback pra empresas parceiras — cobre dois casos: (a) candidato
          // sem nenhuma linha em "usuarios", e (b) candidato COM linha em
          // "usuarios" mas role "empresa" (CadastroEmpresaScreen sempre cria
          // essa linha só pra login/vínculo, sem foto/bio — os dados reais
          // ficam em "empresas"). Mesmo padrão de RadarSearchScreen.
          const emailsEmpresa = emails.filter(e => !map[e] || map[e].isEmpresa);
          if (emailsEmpresa.length) {
            const { data: emps } = await supabase.from("empresas").select("email,logo_url,descricao,categoria_servico").in("email", emailsEmpresa);
            (emps || []).forEach(e => { map[e.email] = { foto_perfil_url: e.logo_url, bio: e.descricao, categoria_servico: e.categoria_servico, isEmpresa: true }; });
          }
          setPerfis(map);
          Promise.all(emails.map(email => fetchReputacao(email).then(r => [email, r])))
            .then(pares => setReputacoes(Object.fromEntries(pares)))
            .catch(() => {});
        }
      })
      .catch(()=>setLoading(false));
  },[pedido?.id]);

  if (viewingCandidato) {
    return <CandidatoPerfilScreen email={viewingCandidato.email} isEmpresa={viewingCandidato.isEmpresa} onBack={() => setViewingCandidato(null)} />;
  }

  return (
    <div style={{padding:"16px",maxWidth:480,margin:"0 auto"}}>
      <button onClick={onBack} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",marginBottom:12}}>← Voltar</button>
      <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Propostas recebidas</h2>
      {loading && <p>Carregando...</p>}
      {!loading && propostas.length===0 && <p style={{color:"#888"}}>Nenhuma proposta ainda.</p>}
      {propostas.map(p=>(
        <CandidatoCard
          key={p.id}
          proposta={p}
          perfil={perfis[p.profissional_email || p.profissional_id]}
          reputacao={reputacoes[p.profissional_email || p.profissional_id]}
          onAceitar={onAceitarProposta}
          onVerPerfil={setViewingCandidato}
        />
      ))}
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
          showToast={showToast}
          plano={plano}
          planoStatus={planoStatus}
          planoInicio={planoInicio}
          onUpgrade={() => { setActiveChat(null); setScreen("upgrade"); }}
        />
      );
    }

    // Global (independente de role) — antes só existia dentro do bloco
    // "Professional screens", então o cliente nunca conseguia abrir essa
    // tela de fato (Fase 4).
    if (screen === "avaliacao" && avaliacaoSvc) return <AvaliacaoScreen key={avaliacaoSvc.id} service={avaliacaoSvc} onBack={()=>setScreen("orders")} setScreen={setScreen} userEmail={userEmail} showToast={showToast} />;
    // Idem pro sino de Alertas — antes só existia dentro do bloco
    // role==="client", então o profissional clicava no sino e nada
    // acontecia (o setScreen("alerts") rodava, mas nenhuma rota tratava
    // essa tela fora do papel de cliente).
    if (screen === "alerts") return <AlertsScreen notifications={notificationsFromPropostas} onAccept={handleAceitarPropostaPorId} onOpenChat={handleOpenNotificacao} onOpenPedido={handleOpenNotificacao} />;

  if (!role && !authScreen) { setAuthScreen("role-select"); return null; }
    if (role === "client") {
      // "Vire Profissional" (banner da Home) — mesma etapa de plano+perfil
      // profissional que o cadastro usa pra "profissional"/"ambos", só que
      // pra conta já existente/logada (ver VirarProfissionalScreen acima).
      if (screen === "virar-profissional") {
        return (
          <VirarProfissionalScreen
            userEmail={userEmail}
            userName={userName}
            showToast={showToast}
            onBack={() => setScreen("home")}
            onDone={async () => {
              // is_hybrid=true: essa conta já era cliente antes de virar
              // profissional agora — usuarios.role vira "professional" (pra
              // aparecer no Banco de Profissionais), mas is_hybrid é o que
              // diferencia de quem sempre foi só profissional (item 8 do
              // prompt Ajustes de Cadastro/Perfil/Fluxos).
              //
              // CRÍTICO (achado 2026-08-30, caso Jailson): isso tinha só
              // .then(()=>{}).catch(()=>{}) — qualquer falha/não-confirmação
              // do UPDATE era engolida em silêncio, e o código seguia direto
              // pra "Perfil profissional pronto!" mesmo com usuarios.role
              // continuando "client" pra sempre no banco (a pessoa conseguia
              // enviar documentos porque o "professional" só tinha virado no
              // estado local/localStorage). Mesma família de bug já corrigida
              // em /api/admin/approve-professional (2026-08-20,
              // updateComVerificacao) e no upsert de cadastro novo
              // (2026-08-27, handleLoginComplete) — faltava só aqui. Agora
              // espera a escrita, confirma pelo retorno (.select()) que a
              // linha foi realmente afetada e só então libera o modo
              // profissional; se não confirmar, avisa e mantém a conta como
              // "client" (consistente com o banco) em vez de fingir sucesso.
              if (userEmail) {
                const { data, error } = await supabase.from("usuarios")
                  .update({ role: "professional", is_hybrid: true })
                  .eq("email", userEmail)
                  .select("role");
                if (error || !data?.length || data[0].role !== "professional") {
                  console.error("[virar-profissional] update role falhou:", error?.message, { linhasAfetadas: data?.length || 0 });
                  showToast?.("⚠️ Pagamento confirmado, mas houve um problema ao ativar seu perfil profissional. Tente novamente em instantes ou fale com o suporte.", "#EF4444");
                  setScreen("home");
                  return;
                }
              }
              try {
                const s = JSON.parse(localStorage.getItem("multiSession") || "{}"); s.role = "professional"; localStorage.setItem("multiSession", JSON.stringify(s));
                const u = JSON.parse(localStorage.getItem("multiUser") || "{}"); u.role = "professional"; localStorage.setItem("multiUser", JSON.stringify(u));
              } catch {}
              setRole("professional"); setUserRole("professional"); setSelected(null);
              carregarPlano("usuario", userEmail); // senão a assinatura recém-paga em EscolherPlanoScreen só aparece depois de um reload
              showToast?.("🎉 Perfil profissional pronto! Bem-vindo ao mural de serviços.", G);
              setScreen("home");
            }}
          />
        );
      }
      if (screen === "post")   return <PostServiceScreen onBack={() => setScreen("home")} onSuccess={handlePostServiceSuccess} initialCat={pendingCat} />;
      if (screen === "radar" && selected) return <RadarSearchScreen service={selected} onStatusChange={handlePedidoStatusChange} showToast={showToast} onAccepted={(pedidoRow) => { setSelected(mapPedidoRow(pedidoRow)); setScreen("service"); }} onAceitarProposta={handleAceitarProposta} onBack={() => setScreen("orders")} />;
      if (screen === "chat")   return <ChatInbox myServices={meusPedidosComCandidatos} onOpenChat={openChatFromService} />;
      if (screen === "orders") return <MyServicesScreen initialTab="aberto" myServices={meusPedidosComCandidatos} onViewPropostas={(s)=>{setSelected(s);setScreen("propostas");}} onOpenService={s => abrirDetalheServico(s)} onOpenChat={openChatFromService} onCancelarPedido={(s) => { if (window.confirm('Cancelar esse pedido? O profissional será avisado.')) { handlePedidoStatusChange(s.id, 'cancelado'); showToast?.('Pedido cancelado.', '#DC2626'); } }} isPro={isPro} />;
      if (screen === "profile") {
        // role-select (não welcome direto) — achado 2026-08-18: esse é o
        // ponto de entrada mais comum/genérico de cadastro (aba Perfil,
        // botão "Entrar ou Criar Conta"), mas ia direto pro WelcomeScreen,
        // que é 100% linguagem de cliente ("acompanhar pedidos e falar com
        // profissionais") e nunca oferece a opção profissional — quem foi
        // instruído a se cadastrar como profissional e usou esse botão
        // (o mais óbvio da tela) nunca via a pergunta de intenção, e o
        // formulário abria com "Só cliente" pré-marcado por padrão. Ver
        // multi_cadastro_empresa_home_cliente_bug na memória.
        if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("role-select")} />;
        return <ProfileScreen role="client" userName={userName} userEmail={userEmail} isPro={false} showRankingGlobal={showRankingGlobal} onClearRankingGlobal={() => setShowRankingGlobal(false)} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenAdmin={() => setShowAdmin(true)} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} if (userEmail) supabase.from("usuarios").update({ role:r }).eq("email", userEmail).then(()=>{}).catch(()=>{}); setScreen("home"); }} />;
      }
      if (screen === "propostas" && selected) return <PropostasScreen pedido={selected} onBack={()=>setScreen("orders")} onAceitarProposta={handleAceitarProposta} />;
      if (screen === "service" && selected) return <ServiceDetailClient key={selected.id} service={selected} onBack={() => setScreen("orders")} onConfirmarConclusao={handleConfirmarConclusao} onCancelarPedido={handleCancelarPedidoPosAceite} showToast={showToast} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;

      // ── GUEST TOGGLE: show professional mural preview when guest selects "Profissional"
      if (!isLoggedIn && guestRole === "professional") {
        // Mitigação rápida (2026-09-01): a pessoa já declarou a intenção
        // "profissional" tocando no toggle do header pra chegar até aqui —
        // "onSignup" mandava isso pro limbo (welcome/RegisterScreen com
        // signupRole ainda "client" default), obrigando quem só queria virar
        // profissional a notar e trocar o rádio "Só cliente" pré-marcado.
        // Carrega a intenção já conhecida direto pro formulário certo, sem
        // perguntar de novo (mesmo padrão do link ?cadastro=profissional).
        return <GuestMural onSignup={(cat) => {
          // Conversão de topo de funil (Meta Ads/GA4, handoff 2026-09-02) —
          // clique em qualquer "Tenho Interesse"/"Criar conta" dentro do
          // mural de convidado, isca ou não. "Lead" é o evento padrão do
          // Meta pra demonstração de interesse (o Pixel/Ads Manager já sabe
          // otimizar campanha em cima dele); GA4 usa nome customizado.
          trackGA("tenho_interesse_mural", { categoria: cat || "all", isca: guestLocked });
          trackPixel("Lead", { content_category: cat || undefined, content_name: guestLocked ? "seja_profissional" : "mural_convidado" });
          setSignupRole("professional"); setSignupCategoria(cat ? [cat] : []); setAuthScreen("register");
        }} allDocsVerified={null} />;
      }

      // HOME — always visible, auth gates on action
      return (
        <div style={{ position:"relative" }}>
          <ClientHome
            onPost={catId => { setPendingCat(catId || ""); requireAuth("post", () => setScreen("post")); }}
            onViewService={s => s
              ? requireAuth("service", () => abrirDetalheServico(s))
              : requireAuth("orders", () => setScreen("orders"))
            }
            onSwitchPro={() => {
              // Convidado sem conta: a role-select entra como etapa de
              // contexto antes do cadastro (o próprio RegisterScreen com
              // signupRole="professional" já É virar profissional pra quem
              // nunca teve conta — não precisa passar pelo pendingIntent/fn
              // do requireAuth pra "resumir" a tela virar-profissional).
              if (!isLoggedIn) { setAuthScreen("role-select"); return; }
              requireAuth("virar-profissional", () => setScreen("virar-profissional"));
            }}
            myServices={isLoggedIn ? meusPedidosComCandidatos : []}
            userName={userName}
            userEmail={userEmail}
          />
          {/* FAB — bottom soma env(safe-area-inset-bottom) pra continuar
              flutuando acima do bottom nav depois que ele ficou mais alto
              (ver padding do bottom nav) em vez de ficar por baixo dele. */}
          <button
            onClick={() => { setPendingCat(""); requireAuth("post", () => setScreen("post")); }}
            style={{
              position:"fixed", bottom:"calc(80px + env(safe-area-inset-bottom))", right:20, zIndex:100,
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
    //
    // CRÍTICO (achado 2026-08-30, caso JB Serviço Especializados): o
    // comentário antigo aqui dizia "planos pagos de empresa deixaram de
    // existir, não tem mais tela de upgrade" — isso ficou desatualizado
    // quando Multi Empresa/Empresa Plus voltaram em 2026-08-19 (ver
    // [[multi_planos_pagos_empresa_reintroduzidos]]) e ninguém restaurou o
    // gate: EmpresaHomeScreen/EmpresaPedidosScreen nunca recebiam
    // isPro/onUpgrade, então o Mural completo (valor + nome do cliente +
    // link direto de WhatsApp) ficava liberado pra qualquer empresa, mesmo
    // sem nenhuma assinatura ativa. isPro/plano/planoStatus já eram
    // carregados certinho (carregarPlano("empresa", ...) no efeito
    // [userEmail, role] lá em cima) — só faltava passar adiante e a tela
    // de "upgrade" (EscolherPlanoScreen) de volta. "Contratante" continua
    // sem gate de propósito (sempre foi grátis, ver EmpresaHomeScreen).
    if (role === "empresa") {
      if (screen === "upgrade") return <EscolherPlanoScreen titularTipo="empresa" titularEmail={userEmail} titularNome={userName} onBack={() => setScreen("home")} showToast={showToast} onDone={() => { carregarPlano("empresa", userEmail); setScreen("home"); }} permiteComprarMoedas={false} />;
      if (screen === "pedidos") return <EmpresaPedidosScreen userEmail={userEmail} isPro={isPro} onUpgrade={() => setScreen("upgrade")} />;
      if (screen === "editar")  return <EmpresaEditProfileScreen userEmail={userEmail} onLogout={handleLogout} showToast={showToast} isPro={isPro} plano={plano} planoStatus={planoStatus} planoExpiraEm={planoExpiraEm} onUpgrade={() => setScreen("upgrade")} />;

      if (screen === "demanda-propostas" && selected) {
        return <PropostasScreen pedido={selected} onBack={() => setScreen("home")} onAceitarProposta={handleAceitarPropostaEmpresa} />;
      }
      return <EmpresaHomeScreen userEmail={userEmail} onLogout={handleLogout} showToast={showToast} onGoToPedidos={() => setScreen("pedidos")} onGoToEditar={() => setScreen("editar")} modo={empresaModo} setModo={setEmpresaModo} onVerPropostas={(d) => { setSelected(d); setScreen("demanda-propostas"); }} onOpenChat={openChatFromService} onAcceptOrder={(order) => { handleCandidatarPedidoDireto(order.id, order.cliente_id, order.value, order.profissionalNome); showToast?.("💼 Interesse enviado! Aguarde o cliente escolher.", B); }} isPro={isPro} onUpgrade={() => setScreen("upgrade")} />;
    }

    // Route guard: logged-in clients must never see the professional feed.
    if (isLoggedIn && userRole === "client" && role !== "client") {
      setTimeout(() => { setRole("client"); setScreen("home"); }, 0);
      return (
        <div style={{ display:"flex", flexDirection:"column", position:"relative" }}>
          <ClientHome
            onPost={catId => { setPendingCat(catId || ""); requireAuth("post", () => setScreen("post")); }}
            onViewService={s => s ? requireAuth("service", () => abrirDetalheServico(s)) : requireAuth("orders", () => setScreen("orders"))}
            onSwitchPro={() => {}}
            myServices={isLoggedIn ? meusPedidosComCandidatos : []}
            userName={userName}
            userEmail={userEmail}
          />
          <button onClick={() => { setPendingCat(""); requireAuth("post", () => setScreen("post")); }} style={{ position:"fixed", bottom:"calc(80px + env(safe-area-inset-bottom))", right:20, zIndex:100, display:"flex", alignItems:"center", gap:8, padding:"14px 20px", borderRadius:99, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${O},#E64A19)`, color:"white", fontWeight:900, fontSize:14, boxShadow:"0 6px 24px rgba(255,87,34,.5)" }}>
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      );
    }

    // TAXA DE ACESSO PENDENTE — achado 2026-08-28 (bypass em nova aba, ver
    // multi_taxa_acesso_bypass_nova_aba na memória): antes, nada aqui checava
    // se a Taxa de Acesso (plano "acesso") tinha sido paga de verdade — só a
    // ordem das telas no cadastro (RegisterScreen/EscolherPlanoScreen), em
    // memória, numa única aba. Como o token de sessão já é salvo no
    // localStorage antes do pagamento (ver RegisterScreen.handleSubmit), uma
    // segunda aba/reload caía direto aqui embaixo sem nenhuma checagem.
    // Bloqueia só o CONTEXTO profissional — este bloco só roda depois que os
    // dois "if (role === ...)" acima (client/empresa) já retornaram, então
    // uma conta híbrida em role==="client" nunca passa por aqui (carregarPlano
    // nem busca "acesso" nesse modo — ver efeito [userEmail, role]) e continua
    // livre pra pedir serviço sem pagar nada, mesmo com a Taxa de Acesso
    // pendente do lado profissional da mesma conta.
    // "upgrade" (a própria tela de pagamento) e "profile" (pra dar logout ou
    // voltar pro modo Cliente pelo toggle do header) continuam acessíveis
    // mesmo pendente — sem isso a pessoa ficaria numa tela sem saída.
    //
    // "home" (Mural) também ficou de fora do bloqueio (2026-08-28, pedido
    // explícito): pendente agora VÊ o mural como vitrine — categoria, título,
    // bairro, valor, urgência, tempo, igual sempre mostrou — só não consegue
    // AGIR (ver o gate específico no botão "Tenho Interesse" dentro de
    // ProfessionalHome, via taxaAcessoPendente). As outras telas (orders,
    // service, wallet...) continuam bloqueadas — não fazem sentido pra quem
    // nunca conseguiu se candidatar a nada mesmo.
    //
    // semAssinaturaNenhuma — achado 2026-09-02: profissional que nunca teve
    // NENHUMA linha em "assinaturas" (plano null) caía direto no branch de
    // moeda (!isPro em ProfessionalHome, "🪙 Responder X moedas"/"Comprar
    // moedas") em vez de "ative sua Taxa de Acesso" — moeda é só pro modelo
    // antigo (comissão, config_monetizacao.comissao_ativa hoje desligado,
    // ver server.js), reservado pra quem é grandfathered de verdade (plano
    // autonomo/pro/premium antigo, ainda que vencido/cancelado — esse sim
    // tem plano != null). Profissional cadastrado no modelo atual sempre
    // deveria ter uma linha "acesso" (marcada como "pendente" já no mount de
    // EscolherPlanoScreen, ver marcar-pendente) — plano null só acontece se
    // essa marcação falhou (rede) e o cadastro completou mesmo assim, ou se
    // a conta foi aprovada manualmente pelo Admin sem esse passo (mesmo
    // padrão dos casos Fábio/Junior/Adilson documentados na memória). Tratar
    // como taxa pendente (não moeda) é o comportamento correto pro modelo
    // atual — nunca deveria oferecer moeda pra quem nunca teve plano nenhum.
    const semAssinaturaNenhuma = !plano;
    const taxaAcessoPendente = semAssinaturaNenhuma || (plano === "acesso" && planoStatus && planoStatus !== "ativa" && planoStatus !== "trial");
    if (taxaAcessoPendente && !["upgrade", "profile", "home"].includes(screen)) {
      return (
        <EscolherPlanoScreen
          titularTipo="usuario" titularEmail={userEmail} titularNome={userName}
          showToast={showToast}
          onDone={() => { carregarPlano("usuario", userEmail); setScreen("home"); }}
          taxaAcessoObrigatoria
        />
      );
    }

    // Professional screens
  // permiteComprarMoedas: só profissional de verdade (role já "professional"
  // no banco) — essa tela também é aberta pelo botão "Escolher plano" do
  // Profile de CLIENTE comum (achado 2026-08-18: cliente conseguia comprar
  // moeda de verdade sem nunca virar profissional, feature sem nenhum uso
  // pra quem não responde oportunidade — ver comentário em
  // EscolherPlanoScreen/SemPlanoMoedaCard).
  // plano==="acesso" identifica profissional já no modelo de comissão
  // (Promoção de Inauguração, taxa de acesso obrigatória) — pra esse, o
  // card legado "Sem plano / pague com moeda" não faz mais sentido (moeda
  // era a alternativa a assinar um dos PLANOS_USUARIO antigos, que esse
  // profissional nunca chega a ver).
  if (screen === "upgrade") return <EscolherPlanoScreen titularTipo="usuario" titularEmail={userEmail} titularNome={userName} onBack={() => setScreen("home")} showToast={showToast} onDone={() => { carregarPlano("usuario", userEmail); setScreen("home"); }} onGoToComprarMoedas={() => setScreen("comprarmoedas")}
    // plano===null (nunca teve NENHUMA assinatura, nem antiga) não é
    // grandfathered — achado 2026-09-02 (ver taxaAcessoPendente/
    // semAssinaturaNenhuma acima): `plano !== "acesso"` sozinho também é
    // true pra null, então SemPlanoMoedaCard vazava "🪙 Comprar moedas" pra
    // profissional novo sem plano nenhum. Moeda só faz sentido pra quem tem
    // um plano antigo de verdade (autonomo/pro/premium), mesmo que vencido.
    permiteComprarMoedas={role === "professional" && !!plano && plano !== "acesso"}
    // Renovação da Taxa de Acesso (Pix, 2026-08-27): quem já está no plano
    // "acesso" vindo do banner de renovação (ver ProfessionalHome) não deve
    // ver a lista normal de planos — mesmo comportamento do cadastro,
    // direto pro card único/PagamentoPlanoScreen. Mesmo tratamento pra
    // plano===null, pelo motivo acima.
    taxaAcessoObrigatoria={plano === "acesso" || !plano}
  />;
    if (screen === "wallet") return <WalletScreen onBack={() => setScreen("profile")} pedidos={meusGanhos} />;
    if (screen === "comprarmoedas") return <ComprarMoedasScreen userEmail={userEmail} userName={userName} onBack={() => setScreen("profile")} showToast={showToast} onSuccess={() => carregarSaldoMoedas(userEmail)} />;
    if (screen === "profile") {
      // role-select — mesmo motivo do call site "client" acima. Esse aqui é
      // alcançado navegando como convidado no modo Profissional (toggle do
      // GuestHeader); mais um motivo pra não empurrar quem já sinalizou
      // interesse profissional pra uma tela só de cliente.
      if (!isLoggedIn) return <GuestProfileTab onLogin={() => setAuthScreen("role-select")} />;
      return <ProfileScreen role="professional" userName={userName} userEmail={userEmail} isPro={isPro} plano={plano} planoStatus={planoStatus} planoExpiraEm={planoExpiraEm} planoInicio={planoInicio} onUpgrade={() => setScreen("upgrade")} onLogout={handleLogout} showToast={showToast} onOpenWallet={() => setScreen("wallet")} meusGanhos={meusGanhos} saldoMoedas={saldoMoedas} onOpenComprarMoedas={() => setScreen("comprarmoedas")} onOpenAdmin={() => setShowAdmin(true)} docStatus={docStatus} onDocStatusChange={(id, st) => setDocStatus(d => ({ ...d, [id]: st }))} onSwitchRole={(r) => { setRole(r); setUserRole(r); try { const s = JSON.parse(localStorage.getItem("multiSession")||"{}"); s.role=r; localStorage.setItem("multiSession",JSON.stringify(s)); } catch {} if (userEmail) supabase.from("usuarios").update({ role:r }).eq("email", userEmail).then(()=>{}).catch(()=>{}); setScreen("home"); }} />;
    }
    if (screen === "service" && selected) return <ServiceDetailPro key={selected.id} service={selected} onBack={() => setScreen("home")} isPro={isPro} onUpgrade={() => setScreen("upgrade")} onOpenPinEntry={() => setScreen("pinjob")} onCancelarPedido={handleCancelarPedidoPosAceite} onSolicitarChegada={handleSolicitarChegada} onConfirmarInicio={handleConfirmarInicio} showToast={showToast} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;
    if (screen === "pinjob"  && selected) return <ServiceDetailPinEntry key={selected.id} service={selected} onBack={() => setScreen("service")} onStatusChange={handlePedidoStatusChange} onConfirmarConclusao={handleConfirmarConclusao} showToast={showToast} onAvaliar={(svc)=>{ setAvaliacaoSvc(svc); setScreen("avaliacao"); }} />;
    if (screen === "orders") return <MyServicesScreen initialTab="concluido" myServices={meusPedidosComCandidatos} onViewPropostas={(s)=>{setSelected(s);setScreen("propostas");}} onOpenService={s => abrirDetalheServico(s)} onOpenChat={openChatFromService} isPro={isPro} />;
    // Pro home — shows professional-specific banner + filters + feed
    return (
      <ProfessionalHome
        userName={userName}
        userEmail={userEmail}
        showToast={showToast}
        onGoToProfile={() => setScreen("profile")}
        isPro={isPro}
        plano={plano}
        planoInicio={planoInicio}
        planoStatus={planoStatus}
        planoExpiraEm={planoExpiraEm}
        meusGanhos={meusGanhos}
        onViewService={handleProFeedAction}
        onUpgrade={() => setScreen("upgrade")}
        userLocation={localStorage.getItem("multiLocation") || userLocation}
        allDocsVerified={allDocsVerified}
        docStatus={docStatus}
        onGoToDocs={() => setScreen("profile")} onGoToOrders={() => setScreen("orders")} onGoToWallet={() => setScreen("wallet")} onAcceptOrder={(order) => { handleCandidatarPedidoDireto(order.id, order.cliente_id, order.value); showToast?.("💼 Interesse enviado! Aguarde o cliente escolher.", B); }}
        taxaAcessoPendente={taxaAcessoPendente}
        saldoMoedas={saldoMoedas}
        onGoToComprarMoedas={() => setScreen("comprarmoedas")}
        onSaldoMoedasChange={() => carregarSaldoMoedas(userEmail)}
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
        // setPendingIntent(null) — mitigação 2026-09-01: agora que
        // requireAuth abre aqui (não mais direto em "welcome"), tem intent
        // pendente na maioria das vezes; sem limpar, cancelar aqui e depois
        // logar por outro caminho (ex: LoginScreen direto) disparava a ação
        // de guest que ficou presa, igual o onBack do "welcome" já evitava.
        onBack={() => { setAuthScreen(null); setPendingIntent(null); }}
        onLogin={() => setAuthScreen("login")}
        onSelect={(roleId) => {
          // setSignupRole explícito nos dois ramos (não só "profissional")
          // — achado 2026-08-18 investigando cadastros que queriam
          // profissional e caíam como cliente: sem isso, signupRole podia
          // ficar "grudado" em "professional" de uma navegação anterior
          // (ex: usuária que abriu role-select, olhou "Quero trabalhar",
          // voltou, e escolheu "cliente" depois) e vazar pro formulário
          // errado. Ver multi_cadastro_empresa_home_cliente_bug na memória.
          if (roleId === "cliente") { setSignupRole("client"); setAuthScreen("welcome"); return; }
          if (roleId === "profissional") { setSignupRole("professional"); setAuthScreen("register"); return; }
          // Passa pela apresentação (EmpresaPitchScreen) antes do formulário
          // agora — mesmo passo que o toggle Cliente/Profissional/Empresa do
          // Header usa, unifica as duas portas de entrada pro cadastro de
          // empresa (2026-08-19).
          if (roleId === "empresa") { setAuthScreen("empresa-pitch"); return; }
        }}
      />
    );
  }

  if (authScreen === "empresa-pitch") {
    return wrapper(
      <EmpresaPitchScreen
        onBack={() => setAuthScreen(null)}
        onLogin={() => setAuthScreen("login")}
        onContinue={() => setAuthScreen("cadastro-empresa")}
      />
    );
  }

  if (authScreen === "welcome") {
    return wrapper(
      <WelcomeScreen
        onEmail={() => setAuthScreen("register")}
        onLogin={() => setAuthScreen("login")}
        // Home é o passo anterior de verdade na maioria dos casos agora
        // (requireAuth cai direto aqui pra qualquer ação de convidado — post,
        // ver serviço, "Vire Profissional" pra quem já tem conta, etc.), não
        // mais a role-select. Voltar fecha a etapa de auth e devolve a Home.
        onBack={() => { setAuthScreen(null); setPendingIntent(null); }}
      />
    );
  }

  if (authScreen === "register") {
    return wrapper(
      <RegisterScreen onBack={() => setAuthScreen("welcome")} onComplete={handleLoginComplete} showToast={showToast} initialRole={signupRole} initialCategoria={signupCategoria} />
    );
  }

  if (authScreen === "cadastro-empresa") {
    return wrapper(
      <CadastroEmpresaScreen onBack={() => setAuthScreen("empresa-pitch")} onComplete={handleLoginComplete} showToast={showToast} />
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

      {/* Header genérico pulado pra conta empresa (2026-08-18, achado ao
          verificar o fix do redirect pós-cadastro de empresa): AuthHeader só
          conhece professional vs. "qualquer outra coisa", então uma conta
          empresa caía no branch de cliente — mostrava o pill "Modo: Cliente
          (toque p/ alternar)" (que trocaria pra role:"professional", sem
          sentido pra empresa) e o badge "OURO" (também de cliente), os dois
          empilhados por cima do próprio header dedicado da tela de empresa
          ("Modo: Contratante" em EmpresaContratanteScreen/EmpresaHomeScreen),
          duplicando a barra "Sua Localização" na tela. Nenhuma tela de
          empresa usa o sino de notificação nem o avatar daqui (grep
          confirmou), então pular o Header inteiro não tira função nenhuma. */}
      {!(isLoggedIn && userRole === "empresa") && (
        <Header isPro={isPro} notifCount={notifCount} isLoggedIn={isLoggedIn} userRole={userRole} onAlerts={() => setScreen("alerts")} userLocation={localStorage.getItem("multiLocation") || userLocation} onToggleRole={setGuestRole} activeRole={guestRole} onSelectEmpresa={() => setAuthScreen("empresa-pitch")} guestLocked={guestLocked} />
      )}

      {/* paddingBottom cobre a altura do bottom nav (~55px de conteúdo/padding
          + safe-area) — precisa disso agora que o nav é position:fixed (não
          ocupa mais espaço no fluxo normal, então nenhuma tela sabe por conta
          própria que precisa deixar esse respiro; algumas já tinham seu
          próprio paddingBottom avulso pra isso, ex. ClientHome:120,
          MyServicesScreen:32 — inconsistentes entre si e alguns bem menores
          que o necessário, o que causava o nav sobrepondo conteúdo real).
          Empilhar com o padding próprio de cada tela é seguro (só sobra um
          respiro a mais em algumas), o problema era faltar, nunca sobrar. */}
      <div style={{ flex:1, overflowY:"auto", paddingBottom:"calc(64px + env(safe-area-inset-bottom))" }}>
        {renderContent()}
      </div>

      {/* Bottom nav — tabs driven by authenticated role, not the browse toggle.
          position:fixed (não mais sticky): o sticky ficava instável por um
          frame logo após o load porque o <body> nunca é height-locked ao
          viewport (cresce livre com o conteúdo — "duplo scroll" com o
          overflowY:auto interno), fazendo o nav às vezes desenhar por cima
          de conteúdo real nesse instante (bug documentado). fixed ancora no
          viewport de verdade, imune a essa instabilidade. left:50% +
          translateX(-50%) + maxWidth:400 repete a mesma centralização do
          container-raiz (fixed escapa do layout do pai, então precisa
          centralizar de novo sozinho) — em tela de celular de verdade
          (viewport <= 400px) isso já é 100% de largura de qualquer jeito.
          padding bottom soma env(safe-area-inset-bottom) pra não deixar os
          botões colados/cobertos pela barra de gestos ou home indicator em
          iPhones sem botão físico — mesma lógica do paddingTop dos headers. */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:400, background:"white", borderTop:"1px solid #EBEBEB", boxShadow:"0 -3px 16px rgba(0,0,0,.06)", display:"flex", alignItems:"center", justifyContent:"space-around", padding:"8px 0 10px", paddingBottom:"calc(10px + env(safe-area-inset-bottom))", zIndex:90 }}>
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