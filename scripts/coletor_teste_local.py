# scripts/coletor_teste_local.py
import json
import time
import random
import requests
from datetime import datetime

# CONFIGURAÇÕES
SERVIDOR_URL = "http://localhost:3000/api/coletar"
TOKEN_API = "meu-token-secreto-2026"

# Lista de clientes para testar
CLIENTES = [
    "Empresa Alpha",
    "Empresa Beta", 
    "Empresa Gama",
    "Empresa Delta"
]

def gerar_dados_cliente(nome_cliente):
    """Gera dados simulados para um cliente"""
    num_impressoras = random.randint(2, 4)
    impressoras = []
    
    for i in range(num_impressoras):
        online = random.random() < 0.8  # 80% online
        
        modelo = random.choice([
            'Konica Minolta C368',
            'Ricoh MP 3554', 
            'HP LaserJet M426',
            'Brother MFC-L8900'
        ])
        
        cor = 'colorida' if any(x in modelo for x in ['C368', 'MP C', 'Color']) else 'pb'
        
        # Contador aumenta com o tempo
        contador_base = random.randint(10000, 50000) + (i * 1000)
        
        impressora = {
            "ip": f"192.168.{random.randint(1,10)}.{100 + i}",
            "nome": f"Impressora_{chr(65 + i)}",
            "cliente": nome_cliente,
            "modelo": modelo,
            "serial": f"SN{random.randint(1000,9999)}",
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
                    "toner_preto": str(random.randint(20,100)),
                    "toner_ciano": str(random.randint(20,100)),
                    "toner_magenta": str(random.randint(20,100)),
                    "toner_amarelo": str(random.randint(20,100))
                }
            else:
                impressora["contadores"]["total"] = str(contador_base)
                impressora["contadores"]["preto"] = str(contador_base)
                impressora["toners"]["toner_preto"] = str(random.randint(20,100))
        
        impressoras.append(impressora)
    
    return impressoras

def enviar_dados_cliente(cliente):
    """Envia dados de um cliente específico"""
    try:
        dados = gerar_dados_cliente(cliente)
        
        payload = {
            "cliente": cliente,
            "dados": dados
        }
        
        headers = {
            "Authorization": f"Bearer {TOKEN_API}",
            "Content-Type": "application/json"
        }
        
        print(f"   📤 Enviando {cliente}...", end='')
        
        response = requests.post(SERVIDOR_URL, json=payload, headers=headers, timeout=5)
        
        if response.status_code == 200:
            print(f" ✅ {len(dados)} impressoras")
            return True
        else:
            print(f" ❌ Erro {response.status_code}")
            return False
            
    except Exception as e:
        print(f" ❌ Exceção: {e}")
        return False

def main():
    print("="*60)
    print("🚀 COLETOR DE TESTE - MÚLTIPLOS CLIENTES")
    print("="*60)
    print(f"🌐 Servidor: {SERVIDOR_URL}")
    print(f"📋 Clientes: {', '.join(CLIENTES)}")
    print("="*60)
    print("Pressione Ctrl+C para parar")
    
    ciclo = 0
    while True:
        ciclo += 1
        print(f"\n--- Ciclo {ciclo} ---")
        
        for cliente in CLIENTES:
            enviar_dados_cliente(cliente)
            time.sleep(2)  # Pequena pausa entre clientes
        
        print(f"⏳ Ciclo completo. Aguardando 30 segundos...")
        time.sleep(30)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Coletor encerrado!")
        print("✅ Dados enviados com sucesso!")