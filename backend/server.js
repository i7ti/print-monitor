// backend/server.js - Versão com um único cliente
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// =============================================
// CONFIGURAÇÕES
// =============================================
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'cliente_config.json');
const DADOS_FILE = path.join(__dirname, 'dados.json');

// =============================================
// LOGIN (opcional para ambiente do cliente)
// =============================================
app.use(session({
    secret: 'chave-local-cliente',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000 }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Login simples (pode desabilitar se quiser)
const USUARIOS = { 'admin': 'admin123' };

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (USUARIOS[username] && USUARIOS[username] === password) {
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// =============================================
// API DO CLIENTE ÚNICO
// =============================================

// Retorna dados do cliente e suas impressoras
app.get('/api/cliente', (req, res) => {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            res.json(config);
        } else {
            // Configuração padrão se arquivo não existir
            const configPadrao = {
                cliente: {
                    nome: 'Meu Cliente',
                    id: 'cliente_001'
                },
                impressoras: []
            };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(configPadrao, null, 2));
            res.json(configPadrao);
        }
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Salva configuração (apenas as impressoras deste cliente)
app.post('/api/cliente/salvar', (req, res) => {
    try {
        const config = req.body;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Endpoint para receber dados coletados
app.post('/api/coletar', (req, res) => {
    try {
        const { impressoras } = req.body;
        
        // Carregar histórico
        let historico = [];
        if (fs.existsSync(DADOS_FILE)) {
            historico = JSON.parse(fs.readFileSync(DADOS_FILE, 'utf8'));
        }
        
        // Adicionar nova coleta
        historico.push({
            timestamp: new Date().toISOString(),
            impressoras: impressoras
        });
        
        // Manter últimas 1000 leituras
        if (historico.length > 1000) {
            historico = historico.slice(-1000);
        }
        
        fs.writeFileSync(DADOS_FILE, JSON.stringify(historico, null, 2));
        res.json({ success: true });
        
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Retorna últimos dados para o dashboard
app.get('/api/dados', (req, res) => {
    try {
        // Carregar configuração do cliente
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        
        // Carregar últimos dados coletados
        let ultimosDados = [];
        if (fs.existsSync(DADOS_FILE)) {
            const historico = JSON.parse(fs.readFileSync(DADOS_FILE, 'utf8'));
            if (historico.length > 0) {
                ultimosDados = historico[historico.length - 1].impressoras || [];
            }
        }
        
        // Mapa de dados por impressora
        const dadosMap = {};
        ultimosDados.forEach(imp => {
            dadosMap[imp.nome] = imp;
        });
        
        // Combinar configuração com dados coletados
        const resultado = config.impressoras.map(impConfig => {
            const dadosImp = dadosMap[impConfig.nome] || {};
            return {
                ...impConfig,
                status: dadosImp.status || 'offline',
                contadores: dadosImp.contadores || { total: '0', preto: '0', cor: '0' },
                toners: dadosImp.toners || {},
                ultima_coleta: dadosImp.timestamp || null
            };
        });
        
        res.json({
            cliente: config.cliente,
            impressoras: resultado
        });
        
    } catch (error) {
        console.error('Erro:', error);
        res.json({ cliente: { nome: 'Erro' }, impressoras: [] });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando em http://localhost:${PORT}`);
    console.log(`📁 Cliente único configurado em: ${CONFIG_FILE}`);
});