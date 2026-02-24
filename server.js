// server.js - VERSÃO CORRIGIDA COM API PÚBLICA
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar sessão
app.use(session({
    secret: 'minha-chave-secreta-do-render',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60 * 1000 }
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================
// 1. ROTAS PÚBLICAS (NÃO PRECISAM DE LOGIN)
// =============================================

// Rota para clientes enviarem dados (SEM autenticação!)
app.post('/api/coletar', (req, res) => {
    try {
        const dados = req.body;
        console.log('📥 Dados recebidos:', dados.cliente);
        
        // Criar pasta de dados se não existir
        const dadosDir = path.join(__dirname, 'dados');
        if (!fs.existsSync(dadosDir)) {
            fs.mkdirSync(dadosDir);
        }
        
        // Salvar dados do cliente em arquivo JSON
        const nomeArquivo = `cliente_${dados.cliente.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const caminhoArquivo = path.join(dadosDir, nomeArquivo);
        
        let historico = [];
        if (fs.existsSync(caminhoArquivo)) {
            historico = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
        }
        
        historico.push({
            timestamp: new Date().toISOString(),
            dados: dados
        });
        
        // Manter últimas 1000 leituras
        if (historico.length > 1000) {
            historico = historico.slice(-1000);
        }
        
        fs.writeFileSync(caminhoArquivo, JSON.stringify(historico, null, 2));
        
        res.json({ status: 'ok', mensagem: 'Dados recebidos com sucesso' });
    } catch (error) {
        console.error('Erro ao processar dados:', error);
        res.status(500).json({ status: 'erro', mensagem: error.message });
    }
});

// Rota de login (pública)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Usuários fixos (depois pode colocar em banco)
    const usuarios = {
        'admin': 'admin123',
        'i7ti': 'acesso123'
    };
    
    if (usuarios[username] && usuarios[username] === password) {
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

// =============================================
// 2. MIDDLEWARE DE AUTENTICAÇÃO
// =============================================
app.use((req, res, next) => {
    // Rotas que NÃO precisam de login
    const rotasPublicas = [
        '/api/coletar',
        '/api/login', 
        '/api/logout',
        '/login.html',
        '/favicon.ico'
    ];
    
    if (rotasPublicas.includes(req.path)) {
        return next();
    }
    
    // Verificar se usuário está logado
    if (req.session && req.session.loggedIn) {
        return next();
    }
    
    // Se for requisição API, retorna 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ erro: 'Não autorizado' });
    }
    
    // Redirecionar para login
    res.redirect('/login.html');
});

// =============================================
// 3. ROTAS PROTEGIDAS (PRECISAM DE LOGIN)
// =============================================

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Rota para obter dados consolidados para o dashboard
app.get('/api/dados', (req, res) => {
    try {
        const dadosDir = path.join(__dirname, 'dados');
        if (!fs.existsSync(dadosDir)) {
            return res.json([]);
        }
        
        const arquivos = fs.readdirSync(dadosDir);
        const todosDados = [];
        
        arquivos.forEach(arquivo => {
            if (arquivo.endsWith('.json')) {
                const dados = JSON.parse(fs.readFileSync(path.join(dadosDir, arquivo), 'utf8'));
                if (dados.length > 0) {
                    // Pega o último dado de cada cliente
                    const ultimo = dados[dados.length - 1];
                    todosDados.push({
                        cliente: ultimo.dados.cliente,
                        ultimaAtualizacao: ultimo.timestamp,
                        dados: ultimo.dados.dados
                    });
                }
            }
        });
        
        res.json(todosDados);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Pasta de dados: ${path.join(__dirname, 'dados')}`);
    console.log(`🔓 Rota pública /api/coletar disponível`);
});