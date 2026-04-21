# Multi Funcao 🔧

Marketplace de serviços domésticos — React + Node.js + Asaas PIX + SendGrid

## Estrutura

```
multi-funcao/
├── frontend/          ← App React (Vite)
│   ├── App.jsx        ← Componente principal (~5000 linhas)
│   ├── ProUpgrade.jsx ← Checkout PIX standalone
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/           ← API Node.js (Express)
│   ├── server.js      ← Asaas PIX + SendGrid + Webhooks
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## Início Rápido

### Backend
```bash
cd backend
npm install
cp .env.example .env   # preencha as chaves
npm run dev            # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:3001
npm run dev            # http://localhost:5173
```

## Deploy — Umbler

Ver `DEPLOY.md` para o guia completo.

- **Frontend** → `multifuncao.com.br` (app estático)
- **Backend**  → `api.multifuncao.com.br` (Node.js)

## Variáveis de Ambiente obrigatórias

| Variável | Onde obter |
|---|---|
| `ASAAS_API_KEY` | asaas.com → Configurações → API |
| `ASAAS_ENV` | `sandbox` ou `production` |
| `SENDGRID_API_KEY` | app.sendgrid.com → API Keys |
| `EMAIL_ADMIN_KEY` | Crie uma senha forte |
| `VITE_API_URL` | URL do seu backend |

## Tecnologias

- React 18 + Vite + Lucide Icons
- Node.js + Express + Axios
- Asaas (PIX real)
- SendGrid (e-mails transacionais)
- Deploy: Umbler
