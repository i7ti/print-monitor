# scripts/simulador_impressora.py
import json
import time
import random
import os
from datetime import datetime

print("="*50)
print("🖨️  SIMULADOR DE IMPRESSORAS SNMP")
print("="*50)
print("Gerando dados falsos para teste do dashboard...")
print("Pressione Ctrl+C para parar")
print("="*50)

# Garantir que a pasta backend existe
os.makedirs('backend', exist_ok=True)

# LISTA FIXA DE IMPRESSORAS (nunca muda)
IMPRESSORAS_FIXAS = [
    # Cliente A - 4 impressoras
    {
        "ip": "192.168.0.10",
        "nome": "Ricoh_Matriz",
        "cliente": "Empresa Alpha",
        "modelo": "Ricoh MP 3554",
        "serial": "R12345",
        "tipo": "colorida"
    },
    {
        "ip": "192.168.0.11",
        "nome": "Konica_Filial1",
        "cliente": "Empresa Alpha",
        "modelo": "Konica Minolta C368",
        "serial": "K67890",
        "tipo": "colorida"
    },
    {
        "ip": "192.168.0.12",
        "nome": "HP_Admin",
        "cliente": "Empresa Alpha",
        "modelo": "HP LaserJet M426",
        "serial": "H54321",
        "tipo": "pb"
    },
    {
        "ip": "192.168.0.13",
        "nome": "Brother_RH",
        "cliente": "Empresa Alpha",
        "modelo": "Brother MFC-L8900",
        "serial": "B98765",
        "tipo": "pb"
    },
    
    # Cliente B - 3 impressoras
    {
        "ip": "192.168.1.20",
        "nome": "Ricoh_Filial",
        "cliente": "Empresa Beta",
        "modelo": "Ricoh MP C4504",
        "serial": "R24680",
        "tipo": "colorida"
    },
    {
        "ip": "192.168.1.21",
        "nome": "Konica_Matriz",
        "cliente": "Empresa Beta",
        "modelo": "Konica Minolta C558",
        "serial": "K13579",
        "tipo": "colorida"
    },
    {
        "ip": "192.168.1.22",
        "nome": "HP_Vendas",
        "cliente": "Empresa Beta",
        "modelo": "HP LaserJet M608",
        "serial": "H11223",
        "tipo": "pb"
    },
    
    # Cliente C - 2 impressoras
    {
        "ip": "192.168.2.30",
        "nome": "Xerox_Principal",
        "cliente": "Empresa Gama",
        "modelo": "Xerox VersaLink",
        "serial": "X44556",
        "tipo": "colorida"
    },
    {
        "ip": "192.168.2.31",
        "nome": "Brother_Backup",
        "cliente": "Empresa Gama",
        "modelo": "Brother HL-L6400",
        "serial": "B77889",
        "tipo": "pb"
    },
    
    # Cliente D - 1 impressora (pequeno)
    {
        "ip": "192.168.3.40",
        "nome": "HP_Recepcao",
        "cliente": "Empresa Delta",
        "modelo": "HP LaserJet M402",
        "serial": "H99001",
        "tipo": "pb"
    }
]

def gerar_status_aleatorio():
    """Gera status online/offline (80% online, 20% offline)"""
    return random.random() < 0.8  # 80% chance de estar online

def gerar_contador_base(ultimo_valor=None):
    """Gera contador que sempre aumenta"""
    if ultimo_valor is None:
        return random.randint(1000, 50000)
    else:
        # Aumenta entre 0 e 50 páginas
        return ultimo_valor + random.randint(0, 50)

def gerar_nivel_toner():
    """Gera nível de toner realista"""
    return random.randint(15, 100)  # Nunca zero (acabou)

def carregar_ultimos_contadores():
    """Carrega últimos contadores para manter histórico"""
    try:
        with open('backend/dados.json', 'r') as f:
            dados = json.load(f)
            if dados and len(dados) > 0:
                ultimo = dados[-1]['dados']
                contadores = {}
                for imp in ultimo:
                    if imp['status'] == 'online' and imp['contadores'].get('total'):
                        contadores[imp['ip']] = int(imp['contadores']['total'])
                return contadores
    except:
        pass
    return {}

def gerar_dados_impressoras():
    """Gera dados para TODAS as impressoras fixas"""
    ultimos_contadores = carregar_ultimos_contadores()
    impressoras = []
    
    for imp in IMPRESSORAS_FIXAS:
        online = gerar_status_aleatorio()
        ultimo_valor = ultimos_contadores.get(imp['ip'])
        
        # Dados básicos
        dados_imp = {
            "ip": imp['ip'],
            "nome": imp['nome'],
            "cliente": imp['cliente'],
            "timestamp": datetime.now().isoformat(),
            "contadores": {},
            "toners": {},
            "modelo": imp['modelo'],
            "serial": imp['serial'],
            "status": "online" if online else "offline"
        }
        
        if online:
            # Gera contador (sempre aumentando)
            contador_total = gerar_contador_base(ultimo_valor)
            dados_imp["contadores"]["total"] = str(contador_total)
            
            # Separa PB e Cor baseado no tipo
            if imp['tipo'] == 'colorida':
                pb = int(contador_total * 0.6)  # 60% PB
                cor = int(contador_total * 0.4)  # 40% Cor
                dados_imp["contadores"]["preto"] = str(pb)
                dados_imp["contadores"]["cor"] = str(cor)
                
                # Toners coloridos
                dados_imp["toners"]["toner_preto"] = str(gerar_nivel_toner())
                dados_imp["toners"]["toner_ciano"] = str(gerar_nivel_toner())
                dados_imp["toners"]["toner_magenta"] = str(gerar_nivel_toner())
                dados_imp["toners"]["toner_amarelo"] = str(gerar_nivel_toner())
            else:
                # Apenas PB
                dados_imp["contadores"]["preto"] = str(contador_total)
                dados_imp["toners"]["toner_preto"] = str(gerar_nivel_toner())
        else:
            # Offline - usa último valor conhecido se existir
            if ultimo_valor:
                dados_imp["contadores"]["total"] = str(ultimo_valor)
                if imp['tipo'] == 'colorida':
                    dados_imp["contadores"]["preto"] = str(int(ultimo_valor * 0.6))
                    dados_imp["contadores"]["cor"] = str(int(ultimo_valor * 0.4))
                else:
                    dados_imp["contadores"]["preto"] = str(ultimo_valor)
        
        impressoras.append(dados_imp)
    
    return impressoras

def salvar_dados(impressoras):
    """Salva dados no formato que o dashboard espera"""
    try:
        # Carrega histórico existente
        try:
            with open('backend/dados.json', 'r') as f:
                historico = json.load(f)
        except:
            historico = []
        
        # Adiciona novos dados
        historico.append({
            "timestamp": datetime.now().isoformat(),
            "dados": impressoras
        })
        
        # Mantém apenas últimas 100 leituras
        if len(historico) > 100:
            historico = historico[-100:]
        
        # Salva
        with open('backend/dados.json', 'w', encoding='utf-8') as f:
            json.dump(historico, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"Erro ao salvar: {e}")

def main():
    """Loop principal do simulador"""
    # Gerar dados para TODAS as impressoras fixas
    impressoras = gerar_dados_impressoras()
    
    # Estatísticas
    online = sum(1 for i in impressoras if i['status'] == 'online')
    offline = len(impressoras) - online
    total_pb = sum(int(i['contadores'].get('preto', 0)) for i in impressoras if i['status'] == 'online')
    total_cor = sum(int(i['contadores'].get('cor', 0)) for i in impressoras if i['status'] == 'online')
    
    # Salvar
    salvar_dados(impressoras)
    
    # Mostrar status
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 📊 Dados gerados:")
    print(f"   Total impressoras: {len(impressoras)} (FIXAS)")
    print(f"   Online: {online} | Offline: {offline}")
    print(f"   Total PB: {total_pb:,} | Total Cor: {total_cor:,}")
    
    # Mostrar resumo por cliente
    clientes = {}
    for imp in impressoras:
        if imp['cliente'] not in clientes:
            clientes[imp['cliente']] = {'online': 0, 'offline': 0}
        if imp['status'] == 'online':
            clientes[imp['cliente']]['online'] += 1
        else:
            clientes[imp['cliente']]['offline'] += 1
    
    for cliente, stats in clientes.items():
        print(f"   👥 {cliente}: {stats['online']} online, {stats['offline']} offline")

if __name__ == "__main__":
    try:
        contador = 0
        while True:
            contador += 1
            print(f"\n--- Ciclo {contador} ---")
            main()
            
            # Aguarda 30 segundos
            print("\n⏳ Aguardando 30 segundos para próximo ciclo...")
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\n\n👋 Simulador encerrado!")
        print("Impressoras fixas mantidas para teste!")