// backend/server.js - Sistema de login caseiro
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Garantir que pastas necessárias existem
const clientesDir = path.join(__dirname, 'clientes');
if (!fs.existsSync(clientesDir)) {
    fs.mkdirSync(clientesDir, { recursive: true });
}

// Configurar sessão
app.use(session({
    secret: 'minha-chave-secreta-super-segura',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 minutos
        httpOnly: true,
        secure: false // true apenas com HTTPS
    }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Lista de usuários (pode editar aqui)
const USUARIOS = {
    'admin': 'admin123',
    'gerente': 'print2026',
    'supervisor': 'monitorar',
    'i7ti': 'acesso123'
};

// Rota de login (API)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (USUARIOS[username] && USUARIOS[username] === password) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }
});

// Rota de logout
app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Middleware para verificar login
function checkAuth(req, res, next) {
    // Rotas públicas
    if (req.path === '/login.html' || req.path === '/api/login' || req.path.startsWith('/css/')) {
        return next();
    }
    
    if (req.session && req.session.loggedIn) {
        return next();
    }
    
    // Se não estiver logado, redireciona para login
    res.redirect('/login.html');
}

app.use(checkAuth);

// Endpoint para dados (protegido)
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

// =============================================
// API PARA RECEBER DADOS DOS CLIENTES
// =============================================

// Configuração simples de segurança (token)
const API_TOKEN = "meu-token-secreto-2026"; // Mude para algo seguro!

// Middleware para verificar token
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];
    if (token === `Bearer ${API_TOKEN}`) {
        next();
    } else {
        res.status(401).json({ erro: 'Token inválido' });
    }
}

// Endpoint para receber dados do cliente
app.post('/api/coletar', verificarToken, (req, res) => {
    try {
        const dadosCliente = req.body;
        
        // Validar dados mínimos
        if (!dadosCliente.cliente || !dadosCliente.dados) {
            return res.status(400).json({ erro: 'Dados incompletos' });
        }
        
        // Caminho para salvar dados deste cliente
        const clienteFileName = `dados_${dadosCliente.cliente.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const clienteFilePath = path.join(__dirname, 'clientes', clienteFileName);
        
        // Garantir que pasta clientes existe
        const clientesDir = path.join(__dirname, 'clientes');
        if (!fs.existsSync(clientesDir)) {
            fs.mkdirSync(clientesDir);
        }
        
        // Carregar histórico existente
        let historico = [];
        if (fs.existsSync(clienteFilePath)) {
            historico = JSON.parse(fs.readFileSync(clienteFilePath, 'utf8'));
        }
        
        // Adicionar novos dados
        historico.push({
            timestamp: new Date().toISOString(),
            dados: dadosCliente.dados
        });
        
        // Manter últimas 1000 leituras
        if (historico.length > 1000) {
            historico = historico.slice(-1000);
        }
        
        // Salvar
        fs.writeFileSync(clienteFilePath, JSON.stringify(historico, null, 2));
        
        // Também atualizar o dados.json principal (para compatibilidade)
        const dadosPath = path.join(__dirname, 'dados.json');
        let dadosPrincipais = [];
        if (fs.existsSync(dadosPath)) {
            dadosPrincipais = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
        }
        
        dadosPrincipais.push({
            timestamp: new Date().toISOString(),
            cliente: dadosCliente.cliente,
            dados: dadosCliente.dados
        });
        
        if (dadosPrincipais.length > 100) {
            dadosPrincipais = dadosPrincipais.slice(-100);
        }
        
        fs.writeFileSync(dadosPath, JSON.stringify(dadosPrincipais, null, 2));
        
        res.json({ 
            sucesso: true, 
            mensagem: `Dados de ${dadosCliente.cliente} recebidos (${dadosCliente.dados.length} impressoras)`
        });
        
    } catch (error) {
        console.error('Erro ao processar dados:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Endpoint para listar clientes ativos
app.get('/api/clientes', (req, res) => {
    try {
        const clientesDir = path.join(__dirname, 'clientes');
        if (!fs.existsSync(clientesDir)) {
            return res.json([]);
        }
        
        const arquivos = fs.readdirSync(clientesDir);
        const clientes = arquivos
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const nome = f.replace('dados_', '').replace('.json', '').replace(/_/g, ' ');
                const stats = fs.statSync(path.join(clientesDir, f));
                return {
                    nome: nome,
                    arquivo: f,
                    ultimaAtualizacao: stats.mtime
                };
            });
        
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Endpoint para dados consolidados (o dashboard usa este)
app.get('/api/dados', (req, res) => {
    try {
        const dadosPath = path.join(__dirname, 'dados.json');
        if (fs.existsSync(dadosPath)) {
            const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));
            // Pegar últimos dados de cada cliente (mais recente)
            const clientesMap = new Map();
            
            dados.reverse().forEach(item => {
                if (!clientesMap.has(item.cliente)) {
                    clientesMap.set(item.cliente, item.dados);
                }
            });
            
            // Consolidar todos os dados ativos
            const todosDados = Array.from(clientesMap.values()).flat();
            res.json(todosDados);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Erro ao ler dados:', error);
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando em http://localhost:${PORT}`);
    console.log(`🔒 Sistema de login ativo`);
    console.log(`👤 Usuários: admin, gerente, supervisor, i7ti`);
});