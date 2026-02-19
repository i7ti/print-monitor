// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { SimplePass } = require('express-simple-pass');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar login com senha única e CSS personalizado
const simplepass = new SimplePass({
  type: "passkey",
  verify: (passkey) => passkey === "admin123", // Mude para a senha que quiser!
  cookie: {
    secret: "minha-chave-secreta-super-segura-2026",
    maxAge: 12 * 60 * 60 * 1000 // 12 horas
  },
  title: "System Print Monitor",
  css: path.join(__dirname, '..', 'frontend', 'login.css'), // CSS personalizado
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

// Adicionar rotas de login
app.use(simplepass.router());

// Proteger TODAS as rotas com login
app.use((req, res, next) => simplepass.usepass(req, res, next));

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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

// Endpoint para histórico (opcional)
app.get('/api/historico', (req, res) => {
    try {
        const dadosPath = path.join(__dirname, 'dados.json');
        if (fs.existsSync(dadosPath)) {
            const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
            res.json(dados);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.json([]);
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Rota de teste (opcional)
app.get('/teste', (req, res) => {
    res.send('Servidor funcionando!');
});

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando na porta ${PORT}`);
    console.log(`🔒 Protegido por login (senha: admin123)`);
    console.log(`📁 Frontend em: ${path.join(__dirname, '..', 'frontend')}`);
});