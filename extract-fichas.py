import os
import re
import email
from email import policy
from email.parser import BytesParser
import json

def extract_email_body(filepath):
    """Extrair corpo do email"""
    with open(filepath, 'rb') as f:
        msg = BytesParser(policy=policy.default).parse(f)
    
    # Tentar pegar texto plain primeiro
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/plain':
                body = part.get_content()
                return body
            elif content_type == 'text/html':
                body = part.get_content()
                # Limpar HTML básico
                body = re.sub(r'<[^>]+>', '', body)
                return body
    else:
        body = msg.get_content()
        return body
    return ""

def parse_ficha(body):
    """Extrair dados da ficha do corpo do email"""
    data = {}
    
    # Mapeamento de campos
    field_patterns = [
        ("name", r'Nome do cão\s*[:\-]?\s*([^\n]+)'),
        ("ownerName", r'Nome do tutor\s*[:\-]?\s*([^\n]+)'),
        ("breed", r'Raça\s*[:\-]?\s*([^\n]+)'),
        ("birthDate", r'Idade\s*[:\-]?\s*([^\n]+)'),
        ("sex", r'Sexo\s*[:\-]?\s*([^\n]+)'),
        ("castrated", r'Castrado\?\s*[:\-]?\s*([^\n]+)'),
        ("temperament", r'Nível de energia\s*[:\-]?\s*([^\n]+)'),
        ("size", r'Porte\s*[:\-]?\s*([^\n]+)'),
        ("doenca", r'Doença pré-existente\s*[:\-]?\s*([^\n]+)'),
        ("allergies", r'Alergias\s*[:\-]?\s*([^\n]+)'),
        ("feedingType", r'Tipo alimentação\s*[:\-]?\s*([^\n]+)'),
        ("feedingInstructions", r'Instruções\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z]).*)*)'),
        ("feedingTimesPerDay", r'Vezes ao dia\s*[:\-]?\s*([^\n]+)'),
        ("feedingGramsPerMeal", r'Gramas por refeição\s*[:\-]?\s*([^\n]+)'),
        ("preferredActivities", r'Brincadeiras preferidas\s*[:\-]?\s*([^\n]+)'),
        ("vetName", r'Veterinário\s*[:\-]?\s*([^\n]+)'),
        ("allowPool", r'Piscina\?\s*[:\-]?\s*([^\n]+)'),
        ("allowPhotos", r'Fotos nas redes\?\s*[:\-]?\s*([^\n]+)'),
        ("serviceType", r'Serviços desejados\s*[:\-]?\s*([^\n]+)'),
        ("scheduledDays", r'Dias de frequência\s*[:\-]?\s*([^\n]+)'),
        ("ownerEmail", r'Email\s*[:\-]?\s*([^\n]+)'),
        ("ownerPhone", r'Telefone\s*[:\-]?\s*([^\n]+)'),
        ("ownerCpf", r'CPF\s*[:\-]?\s*([^\n]+)'),
    ]
    
    for field, pattern in field_patterns:
        match = re.search(pattern, body, re.IGNORECASE | re.MULTILINE)
        if match:
            value = match.group(1).strip()
            # Limpar
            value = re.sub(r'\s+', ' ', value)
            value = value.replace('\r', '').replace('\n', ' ')
            if value and value.lower() not in ['não informado', 'nenhuma informada', '']:
                data[field] = value
    
    return data

def main():
    anexos_dir = r'C:\Users\guede\Downloads\anexos'
    all_fichas = []
    
    for filename in os.listdir(anexos_dir):
        if filename.endswith('.eml'):
            filepath = os.path.join(anexos_dir, filename)
            print(f"Processando: {filename}")
            
            try:
                body = extract_email_body(filepath)
                data = parse_ficha(body)
                
                # Extrair nome do arquivo se não encontrou no corpo
                if 'name' not in data:
                    name_match = re.search(r'- (.+?) \(', filename)
                    if name_match:
                        data['name'] = name_match.group(1).strip()
                
                data['_source_file'] = filename
                all_fichas.append(data)
                print(f"  ✓ {data.get('name', '???')} - {len(data)} campos")
                
            except Exception as e:
                print(f"  ✗ Erro: {e}")
    
    # Salvar JSON
    output_file = r'C:\Users\guede\CascadeProjects\dog-hotel-app\all-fichas-extracted.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_fichas, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {len(all_fichas)} fichas extraídas para: {output_file}")
    
    # Resumo
    print("\n📊 Resumo dos cães:")
    for ficha in all_fichas:
        name = ficha.get('name', '???')
        has_feeding = 'feedingType' in ficha or 'feedingInstructions' in ficha
        has_meds = 'doenca' in ficha
        has_allergies = 'allergies' in ficha
        print(f"  {name}: Alimentação={'✅' if has_feeding else '❌'} Meds={'✅' if has_meds else '❌'} Alergias={'✅' if has_allergies else '❌'}")

if __name__ == '__main__':
    main()
