# scripts/coletor_impressoras.py
from pysnmp.hlapi import *
import json
import time
import os
from datetime import datetime

# Configurações
ARQUIVO_CONFIG = os.path.join(os.path.dirname(__file__), '..', 'config', 'impressoras.json')
ARQUIVO_DADOS = os.path.join(os.path.dirname(__file__), '..', 'backend', 'dados.json')

# OIDs para contadores de impressoras
OIDS = {
    'contador_total': '1.3.6.1.2.1.43.10.2.1.4.1.1',
    'contador_preto': '1.3.6.1.2.1.43.10.2.1.4.1.2',
    'contador_cor': '1.3.6.1.2.1.43.10.2.1.4.1.3',
    'modelo': '1.3.6.1.2.1.25.3.2.1.3.1',
    'serial': '1.3.6.1.2.1.43.5.1.1.17.1',
    'toner_preto': '1.3.6.1.2.1.43.11.1.1.9.1.1',
    'toner_ciano': '1.3.6.1.2.1.43.11.1.1.9.1.2',
    'toner_magenta': '1.3.6.1.2.1.43.11.1.1.9.1.3',
    'toner_amarelo': '1.3.6.1.2.1.43.11.1.1.9.1.4'
}

def carregar_impressoras():
    """Carrega lista de impressoras do arquivo de config"""
    try:
        with open(ARQUIVO_CONFIG, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def consultar_snmp(ip, comunidade, oid):
    """Consulta SNMP em uma impressora"""
    try:
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(comunidade, mpModel=0),
            UdpTransportTarget((ip, 161), timeout=2, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        
        errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
        
        if errorIndication:
            return None
        
        for varBind in varBinds:
            return str(varBind[1])
            
    except:
        return None
    
    return None

def coletar_dados_impressora(impressora):
    """Coleta todos os dados de uma impressora"""
    dados = {
        'ip': impressora['ip'],
        'nome': impressora['nome'],
        'cliente': impressora['cliente'],
        'timestamp': datetime.now().isoformat(),
        'contadores': {},
        'toners': {},
        'status': 'offline'
    }
    
    # Tenta coletar contador total
    total = consultar_snmp(impressora['ip'], impressora['comunidade'], OIDS['contador_total'])
    if total:
        dados['status'] = 'online'
        dados['contadores']['total'] = total
        
        # Coleta outros contadores
        for key, oid in OIDS.items():
            if key != 'contador_total':
                valor = consultar_snmp(impressora['ip'], impressora['comunidade'], oid)
                if valor:
                    if 'toner' in key:
                        dados['toners'][key] = valor
                    elif 'contador' in key:
                        dados['contadores'][key] = valor
                    else:
                        dados[key] = valor
    
    return dados

def salvar_dados(dados_coletados):
    """Salva dados no arquivo JSON"""
    try:
        # Carrega dados existentes
        try:
            with open(ARQUIVO_DADOS, 'r', encoding='utf-8') as f:
                historico = json.load(f)
        except:
            historico = []
        
        # Adiciona novos dados
        historico.append({
            'timestamp': datetime.now().isoformat(),
            'dados': dados_coletados
        })
        
        # Mantém apenas últimas 1000 leituras
        if len(historico) > 1000:
            historico = historico[-1000:]
        
        # Salva
        with open(ARQUIVO_DADOS, 'w', encoding='utf-8') as f:
            json.dump(historico, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"Erro ao salvar dados: {e}")

def main():
    print("🖨️ Iniciando coleta de dados das impressoras...")
    
    impressoras = carregar_impressoras()
    if not impressoras:
        print("❌ Nenhuma impressora configurada!")
        return
    
    dados_coletados = []
    for imp in impressoras:
        print(f"📡 Coletando {imp['nome']} ({imp['ip']})...")
        dados = coletar_dados_impressora(imp)
        dados_coletados.append(dados)
        
        if dados['status'] == 'online':
            print(f"   ✅ Online - Total: {dados['contadores'].get('total', 'N/A')}")
        else:
            print(f"   ❌ Offline")
    
    salvar_dados(dados_coletados)
    print(f"✅ Coleta finalizada! Dados salvos")
    
if __name__ == "__main__":
    while True:
        main()
        print(f"\n⏳ Aguardando 5 minutos para próxima coleta...\n")
        time.sleep(300)  # 5 minutos