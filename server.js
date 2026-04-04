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
        console.log('📥 ID Único:', dados.id_unico);  // ← NOVO!

        // Validar se veio ID único
        if (!dados.id_unico) {
            console.warn('⚠️ Cliente sem ID único! Usando nome como fallback');
        }

        // Criar pasta de dados se não existir
        const dadosDir = path.join(__dirname, 'dados');
        if (!fs.existsSync(dadosDir)) {
            fs.mkdirSync(dadosDir);
        }

        // PRIORIDADE 1: Usar ID único se existir
        // PRIORIDADE 2: Fallback para nome do cliente
        const identificador = dados.id_unico || dados.cliente || 'desconhecido';
        const nomeArquivo = `cliente_${identificador.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
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

// Rota de debug para ver quais dados foram recebidos
app.get('/api/debug', (req, res) => {
    try {
        const dadosDir = path.join(__dirname, 'dados');
        if (!fs.existsSync(dadosDir)) {
            return res.json({ mensagem: 'Pasta dados não existe' });
        }

        const arquivos = fs.readdirSync(dadosDir);
        const info = {};

        arquivos.forEach(arquivo => {
            if (arquivo.endsWith('.json')) {
                const conteudo = JSON.parse(fs.readFileSync(path.join(dadosDir, arquivo), 'utf8'));
                info[arquivo] = {
                    tamanho: conteudo.length,
                    ultimo: conteudo[conteudo.length - 1] || null
                };
            }
        });

        res.json(info);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTAS PARA COLETA FORÇADA
// =============================================

// Rota para registrar solicitação de coleta forçada
app.post('/api/forcar-coleta/:idCliente', (req, res) => {
    try {
        const { idCliente } = req.params;

        // Criar pasta de solicitações se não existir
        const solicitacaoDir = path.join(__dirname, 'solicitacoes');
        if (!fs.existsSync(solicitacaoDir)) {
            fs.mkdirSync(solicitacaoDir);
        }

        // Salvar solicitação em arquivo
        const arquivoSolicitacao = path.join(solicitacaoDir, `${idCliente}.json`);
        fs.writeFileSync(arquivoSolicitacao, JSON.stringify({
            solicitadoEm: new Date().toISOString(),
            cliente: idCliente
        }));

        console.log(`📢 Solicitação de coleta registrada para ${idCliente}`);
        res.json({
            status: 'ok',
            mensagem: 'Solicitação registrada. O cliente coletará na próxima verificação.'
        });
    } catch (error) {
        console.error('Erro ao registrar solicitação:', error);
        res.status(500).json({ erro: error.message });
    }
});

// Rota para cliente verificar se há solicitação
app.get('/api/verificar-solicitacao/:idCliente', (req, res) => {
    try {
        const { idCliente } = req.params;
        const arquivoSolicitacao = path.join(__dirname, 'solicitacoes', `${idCliente}.json`);

        // Verificar se arquivo existe
        const solicitado = fs.existsSync(arquivoSolicitacao);

        // Se existir, remover após leitura (para não ficar repetindo)
        if (solicitado) {
            fs.unlinkSync(arquivoSolicitacao);
            console.log(`✅ Solicitação atendida para ${idCliente}`);
        }

        res.json({ solicitado });
    } catch (error) {
        console.error('Erro ao verificar solicitação:', error);
        res.status(500).json({ erro: error.message });
    }
});

// =============================================
// ROTA PARA INFORMAÇÕES DO CLIENTE (HOSTNAME/IP)
// =============================================
app.get('/api/cliente-info/:idUnico', (req, res) => {
    try {
        const { idUnico } = req.params;
        const arquivoCliente = path.join(__dirname, 'dados', `cliente_${idUnico}.json`);

        if (fs.existsSync(arquivoCliente)) {
            const historico = JSON.parse(fs.readFileSync(arquivoCliente, 'utf8'));
            if (historico.length > 0) {
                const ultimo = historico[historico.length - 1];
                const infoCliente = ultimo.dados?.info_sistema || null;
                return res.json({
                    hostname: infoCliente?.hostname || 'N/A',
                    ip_local: infoCliente?.ip_local || 'N/A',
                    sistema: infoCliente?.sistema || 'N/A',
                    ultima_atualizacao: ultimo.timestamp
                });
            }
        }
        res.json({ hostname: 'N/A', ip_local: 'N/A', sistema: 'N/A' });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
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
        '/favicon.ico',
        '/logo.png',
        '/api/forcar-coleta',
        '/api/verificar-solicitacao',
        '/api/cliente-info'  // ← NOVA ROTA ADICIONADA
    ];

    // Verificar se a rota começa com alguma das públicas
    if (rotasPublicas.some(rota => req.path.startsWith(rota))) {
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

// Rota para obter dados consolidados para o dashboard (VERSÃO COM ID ÚNICO)
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
                const historico = JSON.parse(fs.readFileSync(path.join(dadosDir, arquivo), 'utf8'));
                if (historico.length > 0) {
                    // Pega o último dado de cada cliente
                    const ultimo = historico[historico.length - 1];

                    // Extrair ID ÚNICO do nome do arquivo (NUNCA MUDA)
                    const idUnico = arquivo
                        .replace('cliente_', '')
                        .replace('.json', '');

                    // Extrair informações do cliente (podem mudar)
                    const dadosRecebidos = ultimo.dados || {};

                    const clienteInfo = {
                        id_unico: idUnico,                    // ← NUNCA MUDA (identificador real)
                        id_obra: dadosRecebidos.id_obra || '', // ← PODE MUDAR
                        nome: dadosRecebidos.cliente || 'Cliente sem nome', // ← PODE MUDAR
                        cidade: dadosRecebidos.cidade || '',
                        ultimaAtualizacao: ultimo.timestamp,
                        impressoras: dadosRecebidos.dados || []
                    };

                    // =============================================
                    // CALCULAR STATUS ONLINE DO CLIENTE
                    // =============================================
                    const ultimaAtualizacao = new Date(ultimo.timestamp);
                    const agora = new Date();
                    const diferencaMinutos = (agora - ultimaAtualizacao) / 1000 / 60;
                    const clienteOnline = diferencaMinutos < 10; // Online se atualizou nos últimos 10 minutos
                    // =============================================

                    // Calcular estatísticas
                    const totalImpressoras = clienteInfo.impressoras.length;
                    const online = clienteInfo.impressoras.filter(i => i.status === 'online').length;
                    const offline = totalImpressoras - online;

                    // Calcular contadores
                    let totalPB = 0;
                    let totalCor = 0;
                    let totalGeral = 0;

                    clienteInfo.impressoras.forEach(imp => {
                        if (imp.status === 'online') {
                            const pb = parseInt(imp.contadores?.preto) || 0;
                            const cor = parseInt(imp.contadores?.cor) || 0;
                            const total = parseInt(imp.contadores?.total) || 0;

                            totalPB += pb;
                            totalCor += cor;
                            totalGeral += total;
                        }
                    });

                    todosDados.push({
                        ...clienteInfo,
                        online_status: clienteOnline,  // ← ADICIONE ESTA LINHA!
                        ultima_atualizacao_minutos: Math.floor(diferencaMinutos),  // ← E ESTA (opcional)
                        stats: {
                            totalImpressoras,
                            online,
                            offline,
                            totalPB,
                            totalCor,
                            totalGeral
                        }
                    });
                }
            }
        });

        res.json(todosDados);
    } catch (error) {
        console.error('Erro em /api/dados:', error);
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

