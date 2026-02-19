# scripts/simulador_impressora.py
import json
import time
import random
from datetime import datetime

print("📡 Iniciando SIMULADOR de impressoras...")

while True:
    dados_simulados = [
        {
            "ip": "192.168.0.200",
            "nome": "SIMULADOR_Ricoh",
            "cliente": "Cliente Teste",
            "timestamp": datetime.now().isoformat(),
            "contadores": {"total": str(random.randint(10000, 50000))},
            "toners": {
                "toner_preto": str(random.randint(30, 100)),
                "toner_ciano": str(random.randint(30, 100)),
                "toner_magenta": str(random.randint(30, 100)),
                "toner_amarelo": str(random.randint(30, 100))
            },
            "modelo": "Ricoh MP 3554",
            "serial": f"SIM{random.randint(1000,9999)}",
            "status": "online"
        },
        {
            "ip": "192.168.0.201",
            "nome": "SIMULADOR_Konica",
            "cliente": "Cliente Teste",
            "timestamp": datetime.now().isoformat(),
            "contadores": {"total": str(random.randint(20000, 60000))},
            "toners": {
                "toner_preto": str(random.randint(30, 100))
            },
            "modelo": "Konica Minolta C368",
            "serial": f"KON{random.randint(1000,9999)}",
            "status": "online"
        }
    ]
    
    # Salva no mesmo arquivo que o coletor usaria
    with open('backend/dados.json', 'w') as f:
        json.dump([{"timestamp": datetime.now().isoformat(), "dados": dados_simulados}], f)
    
    print(f"✅ Dados simulados salvos - {datetime.now().strftime('%H:%M:%S')}")
    time.sleep(30)  # Atualiza a cada 30 segundos