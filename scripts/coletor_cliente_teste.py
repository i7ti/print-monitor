# scripts/coletor_cliente_teste.py
import json
import time
import random
import requests
from datetime import datetime

# CONFIGURAÇÕES DO CLIENTE
CLIENTE_NOME = "Empresa Teste Alpha"
SERVIDOR_URL = "https://print-monitor.onrender.com/api/coletar"
TOKEN_API = "meu-token-secreto-2026"  # Mesmo do server.js

def gerar_dados_teste():
    """Gera dados simulados de impressoras para teste"""
    impressoras = []
    
    # Gerar entre 2 e 5 impressoras
    num_impressoras = random.randint(2, 5)
    
    for i in range(num_impressoras):
        online = random.random() < 0.8  # 80% online
        modelo = random.choice(['Konica C368', 'Ricoh MP3554', 'HP M426', 'Brother L8900'])
        cor = 'colorida' if 'C' in modelo or 'HP' in modelo else 'pb'
        
        # Contador base que aumenta com o tempo
        contador_base = random.randint(10000, 50000) + (i * 1000)
        
        impressora = {
            "ip": f"192.168.0.{100 + i}",
            "nome": f"Impressora_{chr(65 + i)}",  # A, B, C...
            "cliente": CLIENTE_NOME,
            "modelo": modelo,
            "serial": f"SN{random.randint(1000, 9999)}",
            "status": "online" if online else "offline",
            "timestamp": datetime.now().isoformat(),
            "contadores": {},
            "toners": {}
        }
        
        if online:
            if cor == 'colorida':
                impressora["contadores"]["total"] = str(contador_base)
                impressora["contadores"]["preto"] = str(int(contador_base * 0.6))
                impressora["contadores"]["cor"] = str(int(contador_base * 0.4))
                impressora["toners"] = {
                    "toner_preto": str(random.randint(20, 100)),
                    "toner_ciano": str(random.randint(20, 100)),
                    "toner_magenta": str(random.randint(20, 100)),
                    "toner_amarelo": str(random.randint(20, 100))
                }
            else:
                impressora["contadores"]["total"] = str(contador_base)
                impressora["contadores"]["preto"] = str(contador_base)
                impressora["toners"]["toner_preto"] = str(random.randint(20, 100))
        
        impressoras.append(impressora)
    
    return impressoras

def enviar_dados():
    """Envia dados para o servidor"""
    try:
        dados = gerar_dados_teste()
        
        payload = {
            "cliente": CLIENTE_NOME,
            "dados": dados
        }
        
        headers = {
            "Authorization": f"Bearer {TOKEN_API}",
            "Content-Type": "application/json"
        }
        
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 📤 Enviando dados de {CLIENTE_NOME}...")
        print(f"   Impressoras: {len(dados)} ({sum(1 for d in dados if d['status']=='online')} online)")
        
        response = requests.post(SERVIDOR_URL, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(f"   ✅ Resposta: {response.json()['mensagem']}")
            return True
        else:
            print(f"   ❌ Erro {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exceção: {e}")
        return False

def main():
    print("="*60)
    print("🚀 COLETOR DE TESTE - CLIENTE REAL")
    print("="*60)
    print(f"📋 Cliente: {CLIENTE_NOME}")
    print(f"🌐 Servidor: {SERVIDOR_URL}")
    print("="*60)
    print("Pressione Ctrl+C para parar")
    
    ciclo = 0
    while True:
        ciclo += 1
        print(f"\n--- Ciclo {ciclo} ---")
        
        if enviar_dados():
            print("   ⏳ Aguardando 30 segundos...")
        else:
            print("   ⏳ Aguardando 60 segundos para tentar novamente...")
            time.sleep(60)
            continue
        
        time.sleep(30)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Coletor encerrado!")
        print("Dados de teste foram enviados para o servidor!")