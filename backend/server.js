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

app.listen(PORT, () => {
    console.log(`🚀 Dashboard rodando em http://localhost:${PORT}`);
    console.log(`🔒 Sistema de login ativo`);
    console.log(`👤 Usuários: admin, gerente, supervisor, i7ti`);
});