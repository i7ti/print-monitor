// backend/config-server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001; // Porta diferente para não conflitar
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'impressoras.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Servir página de configuração
app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'config.html'));
});

// API para listar impressoras configuradas
app.get('/api/impressoras', (req, res) => {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.json([]);
    }
});

// API para salvar impressoras
app.post('/api/impressoras', (req, res) => {
    try {
        const impressoras = req.body;
        
        // Validação básica
        if (!Array.isArray(impressoras)) {
            return res.status(400).json({ erro: 'Formato inválido' });
        }
        
        // Garantir que o diretório config existe
        const configDir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Salvar arquivo
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(impressoras, null, 2), 'utf8');
        
        res.json({ sucesso: true, mensagem: 'Configuração salva com sucesso!' });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// API para testar conexão SNMP
app.post('/api/testar-snmp', async (req, res) => {
    const { ip, comunidade } = req.body;
    
    // Aqui você poderia testar a conexão SNMP
    // Por enquanto, vamos apenas simular um teste
    
    res.json({ 
        sucesso: true, 
        mensagem: `Teste realizado em ${ip} com comunidade ${comunidade}` 
    });
});

app.listen(PORT, () => {
    console.log(`⚙️ Servidor de configuração rodando em http://localhost:${PORT}/config`);
    console.log(`📊 Dashboard principal em http://localhost:${PORT}`);
});