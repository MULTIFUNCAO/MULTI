import React, { useState, useEffect } from "react";
import { Shield, Users, DollarSign, Activity, CheckCircle2, X, Crown, Lock, Bell, BarChart2, Package, ChevronDown, Eye, EyeOff, LogOut, AlertCircle, FileText, Pencil, Wallet, CreditCard, HeartHandshake, HelpCircle, KeyRound, BellRing, BadgeCheck, Banknote, ShieldCheck } from "lucide-react";

function AdminDashboard({ onExit }) {
  const [authed,      setAuthed]      = useState(false);
  const [verifs,      setVerifs]      = useState(PENDING_PROS);
  const [activeRange, setActiveRange] = useState("7d");
  const [toastMsg,    setToastMsg]    = useState(null);

  const adminToast = (msg, color = "#22c55e") => {
    setToastMsg({ msg, color });
    setTimeout(() => setToastMsg(null), 2400);
  };

  const approveVer  = (id) => { setVerifs(v => v.filter(p => p.id !== id)); adminToast("✅ Profissional aprovado e notificado!"); };
  const rejectVer   = (id) => { setVerifs(v => v.filter(p => p.id !== id)); adminToast("❌ Profissional reprovado.", "#EF4444"); };

  const [stats, setStats] = useState(null);
  const [showProsList, setShowProsList] = useState(false);
  const [prosList, setProsList] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [showPedidos, setShowPedidos] = useState(false);
  const [showReceita, setShowReceita] = useState(false);
  const [showClientes, setShowClientes] = useState(false);
  const [clientesList, setClientesList] = useState([]);
  const loadClientes = async () => { const r = await fetch('https://web-production-e103b.up.railway.app/api/admin/clientes',{headers:{'x-admin-key':'multi2026'}}); setClientesList(await r.json()); setShowClientes(true); };
  const [receitaList, setReceitaList] = useState([]);
  const loadReceita = async () => { const r = await fetch('https://web-production-e103b.up.railway.app/api/admin/receita',{headers:{'x-admin-key':'multi2026'}}); setReceitaList(await r.json()); setShowReceita(true); };
  const [pedidosList, setPedidosList] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const loadPedidos = async () => { const r = await fetch('https://web-production-e103b.up.railway.app/api/admin/pedidos-hoje',{headers:{'x-admin-key':'multi2026'}}); setPedidosList(await r.json()); setShowPedidos(true); };
  useEffect(() => { fetch("https://web-production-e103b.up.railway.app/api/admin/stats",{headers:{"x-admin-key":"multi2026"}}).then(r=>r.json()).then(setStats).catch(console.error); }, []);
  const loadPros=async()=>{const r=await fetch("https://web-production-e103b.up.railway.app/api/admin/assinantes-pro",{headers:{"x-admin-key":"multi2026"}});setProsList(await r.json());setShowProsList(true);};
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  const activeSubsCount=stats?.proAtivos||0;
  const newUsersToday={clients:stats?.totalClients||0,pros:stats?.totalPros||0};
  const totalRevenue=parseFloat(stats?.receitaEstimada||0);
  const custodyTotal=totalRevenue;
  const ordersToday=stats?.totalUsers||0;
  const maxBar=totalRevenue||1;






















  /* colour helpers */
  const DK  = "#060D1F";   // page bg
  const D1  = "#0F172A";   // card bg
  const D2  = "#1E293B";   // card border / divider
  const T   = "#F8FAFC";   // primary text
  const T2  = "#94A3B8";   // secondary text
  const ACC = "#6366F1";   // indigo accent

const Card = ({ children, style = {}, onClick }) => (
    <div style={{ background:'#f8fafc', borderRadius:18, cursor:onClick?"pointer":"default", border:`1px solid #e2e8f0`, padding:18, ...style, }} onClick={onClick}>
      {children}
    </div>
  );

  const KPI = ({ icon:Icon, iconColor, iconBg, label, value, sub, trend, onClick }) => (
    <Card onClick={onClick} style={{cursor:onClick?"pointer":"default"}}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={20} color={iconColor} />
        </div>
        {trend && (
          <span style={{ fontSize:11, fontWeight:800, color:trend.startsWith("+") ? "#22c55e" : "#EF4444", background: trend.startsWith("+") ? "#14532d55" : "#7f1d1d55", borderRadius:99, padding:'2px 8px', display:'flex', alignItems:'center', gap:3 }}>
            <ChevronUp size={11} style={{ transform: trend.startsWith("-") ? "rotate(180deg)" : "none" }} />
            {trend}
          </span>
        )}
      </div>
      <p style={{ fontSize:11, color:'#64748B', fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, margin:'0 0 4px' }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:900, color:'#1e293b', margin:'0 0 2px', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'#64748B', margin:0 }}>{sub}</p>}
    </Card>
  );

  return (
    <div style={{ minHeight:'100vh', background:DK, color:'#1e293b', paddingBottom:60 }}>
      {/* toast */}
      {toastMsg && (
        <div style={{ position:'fixed', top:18, left:'50%', transform:'translateX(-50%)', zIndex:999, background:toastMsg.color, color:'white', padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:800, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,.4)' }}>
          {toastMsg.msg}
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ background:'#0A1628', borderBottom:`1px solid #e2e8f0`, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#1d4ed8,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShieldCheck size={17} color="white" />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:900, color:'#1e293b', margin:0 }}>Multi Admin</p>
            <p style={{ fontSize:10, color:'#64748B', margin:0 }}>Painel Operacional</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color:'#22c55e', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} /> Ao vivo
          </span>
          <button onClick={onExit} style={{ background:'#e2e8f0', border:'none', color:'#64748B', fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:99, cursor:'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* ── DATE RANGE ── */}
        <div style={{ display:'flex', gap:8 }}>
          {["hoje","7d","14d"].map(r => (
            <button key={r} onClick={() => setActiveRange(r)} style={{ padding:'6px 16px', borderRadius:99, fontSize:11, fontWeight:800, border:'none', cursor:'pointer', background: activeRange === r ? ACC : D2, color: activeRange === r ? "white" : T2, textTransform:'uppercase', letterSpacing:.5 }}>
              {r === "hoje" ? "Hoje" : r === "7d" ? "7 dias" : "14 dias"}
            </button>
          ))}
        </div>

        {/* ── KPI GRID ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <KPI icon={DollarSign} iconColor="#22c55e" iconBg="#14532d55" label="Receita Total" onClick={loadReceita} value={`R$ ${(totalRevenue/1000).toFixed(1)}k`} sub="Assinaturas + taxas" trend="+24%" />
          <KPI icon={Crown}      iconColor="#F9A825" iconBg="#78350f55" label="Assinaturas PRO" onClick={()=>{fetch("https://web-production-e103b.up.railway.app/api/admin/assinantes-pro",{headers:{"x-admin-key":"multi2026"}}).then(r=>r.json()).then(d=>{setProsList(d);setShowProsList(true);})}} value={activeSubsCount} sub={`R$ ${(activeSubsCount * 29.9).toFixed(0)} MRR`} trend="+8%" />
          <KPI icon={Lock}       iconColor="#6366F1" iconBg="#312e8155" label="Em Custódia" value={`R$ ${(custodyTotal/1000).toFixed(1)}k`} sub="Serviços em andamento" />
          <KPI icon={Activity}   iconColor="#f43f5e" iconBg="#881337aa" label="Pedidos Hoje" onClick={loadPedidos} value={ordersToday} sub="Últimas 24h" trend="+31%" />
        </div>

      {showClientes && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowClientes(false)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:440,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Clientes ({clientesList.length})</p>
              <button onClick={()=>setShowClientes(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            {clientesList.length===0 && <p style={{color:'#64748B',textAlign:'center',padding:20}}>Nenhum cliente cadastrado</p>}
            {clientesList.map((u,i)=>(
              <div key={i} style={{background:'#1E293B',borderRadius:12,padding:'12px 14px',marginBottom:8,border:'1px solid #334155'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{color:'white',fontWeight:700,fontSize:14,margin:0}}>{u.name||'Sem nome'}</p>
                  <span style={{fontSize:11,color:'#3B82F6',fontWeight:700}}>Cliente</span>
                </div>
                <p style={{color:'#94A3B8',fontSize:12,margin:'4px 0 0'}}>{u.email}</p>
                <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>{u.whatsapp||''} {u.city?'- '+u.city:''}</p>
                <p style={{color:'#475569',fontSize:10,margin:'2px 0 0'}}>Desde {u.created_at?new Date(u.created_at).toLocaleDateString():'?'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
          </div>
      {showReceita && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowReceita(false)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:440,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Receita Total</p>
              <button onClick={()=>setShowReceita(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            {receitaList.length===0 && <p style={{color:'#64748B',textAlign:'center',padding:20}}>Nenhuma transacao encontrada</p>}
            {receitaList.map((t,i)=>(
              <div key={i} style={{background:'#1E293B',borderRadius:12,padding:'12px 14px',marginBottom:8,border:'1px solid #334155'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{color:'white',fontWeight:700,fontSize:14,margin:0}}>{t.client_name||t.user_id||'Cliente'}</p>
                  <span style={{fontSize:14,color:'#22C55E',fontWeight:800}}>R$ {t.budget||t.price||'0'}</span>
                </div>
                <p style={{color:'#94A3B8',fontSize:12,margin:'4px 0 0'}}>{t.category||t.service_type||'Servico'}</p>
                <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            <div style={{background:'#0F3460',borderRadius:12,padding:16,marginTop:8}}>
              <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>TOTAL GERAL</p>
              <p style={{color:'#22C55E',fontWeight:900,fontSize:20,margin:0}}>R$ {receitaList.reduce((a,t)=>a+parseFloat(t.budget||t.price||0),0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
      {showReceita && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowReceita(false)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:440,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Receita Total</p>
              <button onClick={()=>setShowReceita(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            {receitaList.length===0 && <p style={{color:'#64748B',textAlign:'center',padding:20}}>Nenhuma transacao encontrada</p>}
            {receitaList.map((t,i)=>(
              <div key={i} style={{background:'#1E293B',borderRadius:12,padding:'12px 14px',marginBottom:8,border:'1px solid #334155'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{color:'white',fontWeight:700,fontSize:14,margin:0}}>{t.client_name||t.user_id||'Cliente'}</p>
                  <span style={{fontSize:14,color:'#22C55E',fontWeight:800}}>R$ {t.budget||t.price||'0'}</span>
                </div>
                <p style={{color:'#94A3B8',fontSize:12,margin:'4px 0 0'}}>{t.category||t.service_type||'Servico'}</p>
                <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            ))}
            <div style={{background:'#0F3460',borderRadius:12,padding:16,marginTop:8}}>
              <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>TOTAL GERAL</p>
              <p style={{color:'#22C55E',fontWeight:900,fontSize:20,margin:0}}>R$ {receitaList.reduce((a,t)=>a+parseFloat(t.budget||t.price||0),0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
      {showPedidos && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowPedidos(false)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:440,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Pedidos Hoje ({pedidosList.length})</p>
              <button onClick={()=>setShowPedidos(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            {pedidosList.length===0 && <p style={{color:'#64748B',textAlign:'center',padding:20}}>Nenhum pedido hoje ainda</p>}
            {pedidosList.map((p,i)=>(
              <div key={i} onClick={()=>setSelectedPedido(p)} style={{background:'#1E293B',borderRadius:12,padding:'12px 14px',marginBottom:8,cursor:'pointer',border:'1px solid #334155'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{color:'white',fontWeight:700,fontSize:14,margin:0}}>{p.category||p.service_type||'Servico'}</p>
                  <span style={{fontSize:11,color:p.status==='completed'?'#22C55E':p.status==='in_progress'?'#F59E0B':'#94A3B8',fontWeight:700}}>{p.status||'pendente'}</span>
                </div>
                <p style={{color:'#94A3B8',fontSize:12,margin:'4px 0 0'}}>{p.client_name||p.user_id||'Cliente'}</p>
                <p style={{color:'#64748B',fontSize:11,margin:'2px 0 0'}}>{p.city||p.location||''} - {new Date(p.created_at).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedPedido && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:1001,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setSelectedPedido(null)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:420,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Detalhes do Pedido</p>
              <button onClick={()=>setSelectedPedido(null)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>SERVICO</p><p style={{color:'white',fontWeight:700,fontSize:15,margin:0}}>{selectedPedido.category||selectedPedido.service_type||'N/A'}</p></div>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>CLIENTE</p><p style={{color:'#38BDF8',fontWeight:600,fontSize:14,margin:0}}>{selectedPedido.client_name||selectedPedido.user_id||'N/A'}</p></div>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>STATUS</p><p style={{color:'#22C55E',fontWeight:700,fontSize:14,margin:0}}>{selectedPedido.status||'pendente'}</p></div>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>LOCALIZACAO</p><p style={{color:'white',fontWeight:600,fontSize:14,margin:0}}>{selectedPedido.city||selectedPedido.location||'N/A'}</p></div>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>VALOR</p><p style={{color:'#22C55E',fontWeight:800,fontSize:16,margin:0}}>R$ {selectedPedido.budget||selectedPedido.price||'0,00'}</p></div>
              <div style={{background:'#1E293B',borderRadius:12,padding:14}}><p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>HORARIO</p><p style={{color:'white',fontWeight:600,fontSize:14,margin:0}}>{new Date(selectedPedido.created_at).toLocaleString('pt-BR')}</p></div>
            </div>
          </div>
        </div>
      )}
      {selectedPro && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setSelectedPro(null)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:420,maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Assinante PRO</p>
              <button onClick={()=>setSelectedPro(null)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>NOME</p>
                <p style={{color:'white',fontWeight:700,fontSize:15,margin:0}}>{selectedPro.name||'Sem nome'}</p>
              </div>
              <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>EMAIL</p>
                <p style={{color:'#38BDF8',fontWeight:600,fontSize:14,margin:0}}>{selectedPro.email}</p>
              </div>
              <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>WHATSAPP</p>
                <p style={{color:'white',fontWeight:600,fontSize:14,margin:0}}>{selectedPro.whatsapp||'Nao informado'}</p>
              </div>
              <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>CUSTOMER ID ASAAS</p>
                <p style={{color:'#A78BFA',fontWeight:600,fontSize:13,margin:0,wordBreak:'break-all'}}>{selectedPro.payment_id||'Nao vinculado'}</p>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                  <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>STATUS</p>
                  <p style={{color:'#22C55E',fontWeight:800,fontSize:13,margin:0}}>{selectedPro.is_pro?'Ativo':'Inativo'}</p>
                </div>
                <div style={{background:'#1E293B',borderRadius:12,padding:16}}>
                  <p style={{color:'#64748B',fontSize:11,margin:'0 0 4px'}}>DESDE</p>
                  <p style={{color:'white',fontWeight:600,fontSize:13,margin:0}}>{selectedPro.created_at?new Date(selectedPro.created_at).toLocaleDateString():'desconhecido'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showProsList && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setShowProsList(false)}>
          <div style={{background:'#0F172A',borderRadius:16,padding:24,width:'90%',maxWidth:400,maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{color:'white',fontWeight:900,fontSize:16,margin:0}}>Assinantes PRO ({prosList.length})</p>
              <button onClick={()=>setShowProsList(false)} style={{background:'none',border:'none',color:'#aaa',fontSize:20,cursor:'pointer'}}>X</button>
            </div>
            {prosList.map((u,i)=>(
 <div key={i} style={{background:'#1E293B',borderRadius:12,padding:'12px 14px',marginBottom:8,cursor:'pointer'}} onClick={()=>setSelectedPro(u)}>
                <p style={{color:'white',fontWeight:700,fontSize:14,margin:'0 0 4px'}}>{u.name||"Sem nome"}</p>
                <p style={{color:'#94A3B8',fontSize:12,margin:'0 0 2px'}}>{u.email}</p>
                <p style={{color:'#64748B',fontSize:11,margin:0}}>Desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
))}
          </div>
        </div>
      )}
        {/* ── REVENUE CHART ── */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:'#1e293b', margin:'0 0 2px' }}>Faturamento — Últimos 7 Dias</p>
              <p style={{ fontSize:11, color:'#64748B', margin:0 }}>Total: R$ {totalRevenue.toLocaleString("pt-BR")}</p>
            </div>
            <BarChart2 size={18} color={ACC} />
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
            {REVENUE_7D.map((d, i) => {
              const pct = (d.val / maxBar) * 100;
              const isMax = d.val === maxBar;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                  <p style={{ fontSize:9, fontWeight:800, color: isMax ? "#22c55e" : T2, margin:0 }}>
                    {d.val >= 1000 ? (d.val/1000).toFixed(1)+"k" : d.val}
                  </p>
                  <div style={{ width:'100%', height:(pct)+"%", minHeight:4, borderRadius:'6px 6px 0 0', background: isMax ? "linear-gradient(180deg,#22c55e,#16a34a)" : "linear-gradient(180deg,#6366f1,#4338ca)", transition:'height .4s' }} />
                  <p style={{ fontSize:9, color:'#64748B', margin:0, fontWeight:700 }}>{d.day}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── NEW USERS + HOT CATS side by side ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

          {/* New users today */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Users size={16} color={ACC} />
              <p style={{ fontSize:12, fontWeight:900, color:'#1e293b', margin:0 }}>Novos Hoje</p>
            </div>
            {[
              { label:'Clientes',      count:newUsersToday.clients, color:'#3b82f6' },
              { label:'Profissionais', count:newUsersToday.pros,    color:O        },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? 12 : 0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'#64748B', fontWeight:700 }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:900, color:r.color }}>{r.count}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:r.color, width:((r.count/20)*100)+"%" }} />
                </div>
              </div>
            ))}
            <p style={{ fontSize:10, color:'#64748B', margin:'10px 0 0' }}>Total acumulado: {12_400 + newUsersToday.clients + newUsersToday.pros} usuários</p>
          </Card>

          {/* Hot categories */}
          <Card>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <TrendingUp size={16} color="#f43f5e" />
              <p style={{ fontSize:12, fontWeight:900, color:'#1e293b', margin:0 }}>🔥 Mais Buscados</p>
            </div>
            {HOT_CATS.map((h, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom: i < HOT_CATS.length-1 ? 10 : 0 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background: i === 0 ? "#F9A825" : i === 1 ? D2 : "#cd7c2f", display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color: i === 0 ? "#1a1a2e" : T2, flexShrink:0 }}>{h.rank}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'#1e293b', margin:'0 0 1px' }}>{h.cat}</p>
                  <p style={{ fontSize:10, color:'#64748B', margin:0 }}>{h.searches} buscas</p>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:'#22c55e' }}>{h.trend}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* ── VERIFICATION QUEUE ── */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ShieldCheck size={17} color={ACC} />
              <p style={{ fontSize:13, fontWeight:900, color:'#1e293b', margin:0 }}>Aguardando Verificação</p>
            </div>
            <span style={{ background: verifs.length > 0 ? "#EF444430" : "#14532d55", color: verifs.length > 0 ? "#EF4444" : "#22c55e", fontSize:11, fontWeight:900, borderRadius:99, padding:'3px 10px' }}>
              {verifs.length} pendente{verifs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {verifs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <CheckCircle2 size={32} color="#22c55e" style={{ display:'block', margin:'0 auto 8px' }} />
              <p style={{ fontSize:13, color:'#22c55e', fontWeight:800, margin:0 }}>Fila limpa! Todos verificados.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {verifs.map((p) => (
                <div key={p.id} style={{ background:'#e2e8f0', borderRadius:14, padding:'14px', border:'1px solid #334155' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:'#1d4ed820', border:'1px solid #1d4ed8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>👨‍🔧</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:900, color:'#1e293b', margin:'0 0 2px' }}>{p.name}</p>
                      <p style={{ fontSize:11, color:'#64748B', margin:0 }}>{p.cat} · Cadastrado {p.joined}</p>
                    </div>
                  </div>
                  {/* doc status */}
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {[{ label:'RG/CPF', status:p.rg }, { label:'Antecedentes', status:p.background }].map((doc, i) => (
                      <div key={i} style={{ flex:1, background:'#0F172A', borderRadius:10, padding:'8px 10px' }}>
                        <p style={{ fontSize:9, color:'#64748B', fontWeight:700, textTransform:'uppercase', letterSpacing:.8, margin:'0 0 3px' }}>{doc.label}</p>
                        <p style={{ fontSize:11, fontWeight:800, color: doc.status.includes("✅") ? "#22c55e" : "#F59E0B", margin:0 }}>{doc.status}</p>
                      </div>
                    ))}
                  </div>
                  {/* actions */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <button onClick={() => rejectVer(p.id)} style={{ padding:'9px 0', borderRadius:10, border:'1.5px solid #EF4444', background:'transparent', color:'#EF4444', fontWeight:800, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                      <X size={14} /> Reprovar
                    </button>
                    <button onClick={() => approveVer(p.id)} style={{ padding:'9px 0', borderRadius:10, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'white', fontWeight:900, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:'0 3px 10px #22c55e44' }}>
                      <ShieldCheck size={14} /> Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── PLATFORM HEALTH ── */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Activity size={16} color={ACC} />
            <p style={{ fontSize:13, fontWeight:900, color:'#1e293b', margin:0 }}>Saúde da Plataforma</p>
          </div>
          {[
            { label:'API Response',   val:'98ms',  ok:true  },
            { label:'Taxa de Erros',  val:'0.2%',  ok:true  },
            { label:'Uptime',         val:'99.97%',ok:true  },
            { label:'Filas em aberto',val:'4',     ok:true  },
          ].map((h, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom: i < 3 ? '1px solid #334155' : 'none' }}>
              <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>{h.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12, fontWeight:900, color:'#1e293b' }}>{h.val}</span>
              <span style={{ width:8, height:8, borderRadius:'50%', background: h.ok ? '#22c55e' : '#EF4444' }} />
              </div>
            </div>
          ))}
        </Card>


      </div>
    </div>
  );
export default AdminDashboard;
