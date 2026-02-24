# scripts/coletor_cliente_producao.py
import json
import time
import random
import requests
import os
import sys
import logging
from datetime import datetime
from pathlib import Path

# Configurações - usando pasta do usuário (com permissão)
CONFIG_DIR = os.path.join(os.environ['LOCALAPPDATA'], 'SystemPrintMonitor')
CONFIG_FILE = os.path.join(CONFIG_DIR, 'config.json')
LOG_FILE = os.path.join(CONFIG_DIR, 'logs.txt')

# Garantir que a pasta existe
os.makedirs(CONFIG_DIR, exist_ok=True)

# Configurar logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def carregar_config():
    """Carrega configuração do cliente"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        else:
            # Configuração padrão para teste
            config = {
                "cliente": {
                    "nome": "Cliente Teste",
                    "id": "teste_001"
                },
                "servidor": "http://localhost:3000/api/coletar",  # Local para teste
                "token": "meu-token-secreto-2026"
            }
            with open(CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=2)
            return config
    except Exception as e:
        logging.error(f"Erro ao carregar config: {e}")
        return None

def enviar_dados():
    """Envia dados para o servidor"""
    config = carregar_config()
    if not config:
        return False
    
    try:
        dados = gerar_dados_teste(config['cliente']['nome'])
        
        payload = {
            "cliente": config['cliente']['nome'],
            "dados": dados
        }
        
        headers = {
            "Authorization": f"Bearer {config['token']}",
            "Content-Type": "application/json"
        }
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Enviando {len(dados)} impressoras para {config['servidor']}...")
        
        response = requests.post(
            config['servidor'],
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            logging.info(f"✅ Dados enviados: {len(dados)} impressoras")
            print(f"   ✅ Sucesso!")
            return True
        else:
            logging.error(f"❌ Erro {response.status_code}: {response.text}")
            print(f"   ❌ Erro {response.status_code}")
            return False
            
    except Exception as e:
        logging.error(f"❌ Exceção: {e}")
        print(f"   ❌ Exceção: {e}")
        return False

def gerar_dados_teste(cliente_nome):
    """Versão de teste - substituir por coleta SNMP real"""
    impressoras = []
    
    num_impressoras = random.randint(2, 4)
    
    for i in range(num_impressoras):
        online = random.random() < 0.8
        
        toner_preto = random.randint(15, 100)
        toner_ciano = random.randint(15, 100) if random.random() > 0.3 else None
        toner_magenta = random.randint(15, 100) if random.random() > 0.3 else None
        toner_amarelo = random.randint(15, 100) if random.random() > 0.3 else None
        
        impressora = {
            "nome": f"Impressora_{i+1}",
            "modelo": random.choice(["Ricoh MP3554", "Konica C368", "HP M426", "Brother L8900"]),
            "ip": f"192.168.0.{100+i}",
            "setor": random.choice(["Diretoria", "Financeiro", "RH", "Vendas", "TI"]),
            "status": "online" if online else "offline",
            "timestamp": datetime.now().isoformat(),
            "contadores": {
                "total": str(random.randint(10000, 50000))
            },
            "toners": {}
        }
        
        if online:
            impressora["toners"]["toner_preto"] = str(toner_preto)
            if toner_ciano:
                impressora["toners"]["toner_ciano"] = str(toner_ciano)
            if toner_magenta:
                impressora["toners"]["toner_magenta"] = str(toner_magenta)
            if toner_amarelo:
                impressora["toners"]["toner_amarelo"] = str(toner_amarelo)
        
        impressoras.append(impressora)
    
    return impressoras

def main():
    print("="*50)
    print("🚀 System Print - Coletor do Cliente")
    print("="*50)
    print(f"📁 Config: {CONFIG_DIR}")
    print(f="="*50")
    logging.info("🚀 Coletor iniciado")
    
    ciclo = 0
    while True:
        ciclo += 1
        print(f"\n📊 Ciclo {ciclo} - {datetime.now().strftime('%H:%M:%S')}")
        
        try:
            if enviar_dados():
                time.sleep(30)
            else:
                print("   ⏳ Aguardando 60 segundos...")
                time.sleep(60)
        except KeyboardInterrupt:
            break
        except Exception as e:
            logging.error(f"Erro no loop: {e}")
            time.sleep(60)
    
    logging.info("👋 Coletor encerrado")
    print("\n👋 Coletor encerrado!")

if __name__ == "__main__":
    main()