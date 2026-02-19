// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Endpoint para dados atuais
app.get('/api/dados', (req, res) => {
    try {
        const dadosPath = path.join(__dirname, 'dados.json');
        const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
        
        // Pega último dado coletado
        const ultimo = dados[dados.length - 1] || { dados: [] };
        res.json(ultimo.dados);
    } catch (error) {
        res.json([]);
    }
});

// Endpoint para histórico
app.get('/api/historico', (req, res) => {
    try {
        const dadosPath = path.join(__dirname, 'dados.json');
        const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
        res.json(dados);
    } catch (error) {
        res.json([]);
    }
});

// ROTA PRINCIPAL - Força a servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ROTA CURINGA - Qualquer rota não reconhecida vai para index.html
app.get('*', (req, res) => {
    // Se não for uma requisição de API, serve o index.html
    if (!req.url.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    } else {
        res.status(404).json({ erro: 'API não encontrada' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando em http://localhost:${PORT}`);
    console.log(`📁 Servindo arquivos de: ${path.join(__dirname, '..', 'frontend')}`);
});