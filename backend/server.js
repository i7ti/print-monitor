// backend/server.js - Versão compatível com express-simple-pass 2.x
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SimplePass } from 'express-simple-pass';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar login com senha única
const simplepass = new SimplePass({
  type: "passkey",
  verify: (passkey) => passkey === "admin123", // Mude a senha aqui!
  cookie: {
    secret: "minha-chave-secreta-super-segura-2026",
    maxAge: 12 * 60 * 60 * 1000
  },
  title: "System Print Monitor",
  css: path.join(__dirname, '..', 'frontend', 'login.css'),
  labels: {
    title: "Acesso Restrito",
    instruction: "Digite a senha de acesso",
    passkey_placeholder: "Digite a senha",
    unpass: "Sair",
    unpassed: "Você saiu do sistema"
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rotas de login
app.use(simplepass.router());

// Proteger rotas
app.use((req, res, next) => {
  // Não proteger as rotas de login e assets
  if (req.path.startsWith('/auth/') || req.path.includes('.')) {
    return next();
  }
  return simplepass.usepass(req, res, next);
});

// Endpoint para dados atuais
app.get('/api/dados', (req, res) => {
    try {
        const dadosPath = path.join(__dirname, 'dados.json');
        if (fs.existsSync(dadosPath)) {
            const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
            const ultimo = dados[dados.length - 1] || { dados: [] };
            res.json(ultimo.dados);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Erro ao ler dados:', error);
        res.json([]);
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando na porta ${PORT}`);
    console.log(`🔒 Protegido por login (senha: admin123)`);
});