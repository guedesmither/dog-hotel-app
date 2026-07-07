// Script de importação do arquivo legado v2 (mais atualizado)
// Confronta com a base existente e importa apenas o que falta
import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const EMAIL = 'admin@petday.com'
const PASSWORD = 'admin123'
const cookieJar = []

function request(path, method = 'GET', body = null, ct = 'application/x-www-form-urlencoded') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const opts = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers: {} }
    if (cookieJar.length) opts.headers.Cookie = cookieJar.join('; ')
    if (bodyStr) { opts.headers['Content-Type'] = ct; opts.headers['Content-Length'] = Buffer.byteLength(bodyStr) }
    const req = https.request(opts, (res) => {
      let data = ''; res.on('data', c => data += c); res.on('end', () => {
        if (res.headers['set-cookie']) for (const c of res.headers['set-cookie']) { const pair = c.split(';')[0]; const name = pair.split('=')[0]; const idx = cookieJar.findIndex(x => x.startsWith(name + '=')); idx >= 0 ? cookieJar[idx] = pair : cookieJar.push(pair) }
        resolve({ status: res.statusCode, body: data })
      })
    })
    req.on('error', reject); if (bodyStr) req.write(bodyStr); req.end()
  })
}

async function login() {
  const { body: csrf } = await request('/api/auth/csrf')
  const { csrfToken } = JSON.parse(csrf)
  const form = new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, callbackUrl: '/', redirect: 'false' })
  await request('/api/auth/callback/credentials', 'POST', form.toString())
}

// Dados do arquivo legado v2 — exatamente como enviados
const RAW = [
  ['S','04/12/2025',-139,'SEBÁ','ÁGIL CONT.','ABERTURA - MENSALIDADE','CONTABILIDADE'],
  ['S','07/12/2025',-418.56,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','07/12/2025',-1497.12,'VÊ','SODIMAC','MATERIAL','OBRA'],
  ['S','10/12/2025',-336.4,'SEBÁ','MERCADO LIVRE','MATERIAL','OBRA'],
  ['S','10/12/2025',-1137.11,'SEBÁ','MERCADO LIVRE','MATERIAL','OBRA'],
  ['E','10/12/2025',3000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','11/12/2025',-211.01,'SEBÁ','ÁGIL CONT.','TAXA JUNTA COMERCIAL','TAXA JUNTA COMERCIAL'],
  ['E','11/12/2025',4000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','11/12/2025',-3015.83,'SEBÁ','OSASFERRO','MATERIAL','OBRA'],
  ['S','12/12/2025',-1188.18,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','13/12/2025',-227.5,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','13/12/2025',-130.87,'SEBÁ','MARMITA','ALIMENTAÇÃO PEDREIROS','OUTROS'],
  ['S','13/12/2025',-102.8,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','15/12/2025',-1000,'VÊ','SIDEVANDO','PEDREIRO','OBRA'],
  ['S','15/12/2025',-756,'SEBÁ','OSASFERRO','MATERIAL','OBRA'],
  ['S','15/12/2025',-97,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['E','16/12/2025',5000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','16/12/2025',-1175,'SEBÁ','DESTAK','FACHADA','COMUNICAÇÃO E MARKETING'],
  ['S','16/12/2025',-1500,'SEBÁ','FRANK','SERRALHEIRO','OBRA'],
  ['S','16/12/2025',-244,'SEBÁ','OSASFERRO','MATERIAL','OBRA'],
  ['S','16/12/2025',-261.52,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','17/12/2025',-124,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','17/12/2025',-399.65,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','17/12/2025',-900.93,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','19/12/2025',-1175,'SEBÁ','DESTAK','FACHADA','COMUNICAÇÃO E MARKETING'],
  ['E','19/12/2025',2000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','22/12/2025',-156,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','22/12/2025',-92,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','22/12/2025',-40,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','22/12/2025',-1000,'SEBÁ','SIDEVANDO','PEDREIRO','OBRA'],
  ['S','22/12/2025',-1023.6,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','22/12/2025',-54,'SEBÁ','MINA DE OURO','MATERIAL','INFRAESTRUTURA'],
  ['S','22/12/2025',-334,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','23/12/2025',-210,'VÊ','CESTAS PINTORES','OUTROS','OBRA'],
  ['S','23/12/2025',-100,'VÊ','ASSINATURA','MAQUININHA DO CARTÃO','SISTEMA CARTÃO'],
  ['E','24/12/2025',4000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','26/12/2025',-1408,'SEBÁ','CORANTE','MATERIAL','OBRA'],
  ['S','26/12/2025',-2500,'SEBÁ','PINTORES','PINTORES','OBRA'],
  ['S','26/12/2025',-100,'SEBÁ','REMOÇÃO SOFÁ','OUTROS','OBRA'],
  ['S','30/12/2025',-1173,'SEBÁ','CORANTE','MATERIAL','OBRA'],
  ['S','02/01/2026',-2000,'SEBÁ','ADIANTAMENTO PINTORES','PINTORES','OBRA'],
  ['S','02/01/2026',-750,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['E','05/01/2026',6000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','07/01/2026',-936,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','07/01/2026',-590,'SEBÁ','AVCB','ALVARÁ','TAXA BOMBEIROS'],
  ['S','07/01/2026',-60,'SEBÁ','ASSOCIAÇÃO','OUTROS','ASSOCIAÇÃO'],
  ['S','08/01/2026',-300,'SEBÁ','LOCATOM','ANDAIMES','OBRA'],
  ['S','09/01/2026',-2000,'SEBÁ','PINTORES','PINTORES','OBRA'],
  ['S','09/01/2026',-80,'SEBÁ','PINTORES','GRATIFICAÇÃO','OBRA'],
  ['S','09/01/2026',-140,'SEBÁ','TRANSPORTE PALLETES','TRANSPORTE PALLETES','OUTROS'],
  ['S','09/01/2026',-540,'SEBÁ','PALLETE','INFRA','OBRA'],
  ['S','09/01/2026',-506.32,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','10/01/2026',-60,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','10/01/2026',-52.35,'VÊ','MOLDES','INFRA','INFRAESTRUTURA'],
  ['S','12/01/2026',-139,'SEBÁ','CONTABILIDADE','CONTABILIDADE','CONTABILIDADE'],
  ['S','12/01/2026',-400,'SEBÁ','SIDEVANDO','MATERIAL','OBRA'],
  ['S','13/01/2026',-128,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','14/01/2026',-355,'SEBÁ','CORANTE','MATERIAL','OBRA'],
  ['S','14/01/2026',-1000,'SEBÁ','SIDEVANDO','MATERIAL','OBRA'],
  ['S','14/01/2026',-233.04,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['E','15/01/2026',7000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','15/01/2026',-6,'SEBÁ','CORANTE','MATERIAL','OBRA'],
  ['S','16/01/2026',-6000,'SEBÁ','ELAINE','ALUGUEL','ALUGUEL'],
  ['S','17/01/2026',-1042.57,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','17/01/2026',-626.86,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','17/01/2026',-221.8,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','17/01/2026',-49.6,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','17/01/2026',-151,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','19/01/2026',-2000,'SEBÁ','PINTORES','PINTORES','OBRA'],
  ['E','19/01/2026',5000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','20/01/2026',-1553,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','20/01/2026',-218,'SEBÁ','SIDEVANDO','MATERIAL','OBRA'],
  ['S','20/01/2026',-249.85,'VÊ','GRÁFICA TEXTIL','JAPAN','COMUNICAÇÃO E MARKETING'],
  ['S','22/01/2026',-47.7,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','22/01/2026',-254.4,'SEBÁ','SODIMAC','MATERIAL','OBRA'],
  ['S','22/01/2026',-1079.26,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','22/01/2026',-114.81,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','22/01/2026',-206,'SEBÁ','MERCADO LIVRE','MATERIAL','OBRA'],
  ['E','22/01/2026',3000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','23/01/2026',-651.77,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['S','23/01/2026',-30,'VÊ','GRÁFICA TEXTIL','JAPAN','COMUNICAÇÃO E MARKETING'],
  ['S','24/01/2026',-1400,'SEBÁ','PINTORES','PINTORES','OBRA'],
  ['S','24/01/2026',-1000,'VÊ','PINTORES','PINTORES','OBRA'],
  ['S','24/01/2026',-57.08,'VÊ','OUTROS','OUTROS','INFRAESTRUTURA'],
  ['S','26/01/2026',-420,'SEBÁ','CAÇAMBA','MATERIAL','OBRA'],
  ['S','26/01/2026',-206,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['S','26/01/2026',-47.88,'VÊ','PAGBANK','INFRA','INFRAESTRUTURA'],
  ['S','27/01/2026',-1340,'SEBÁ','LEROY','MATERIAL','OBRA'],
  ['E','27/01/2026',1500,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','28/01/2026',-355,'SEBÁ','CORANTE','MATERIAL','OBRA'],
  ['S','29/01/2026',-100,'SEBÁ','MARQUES','MATERIAL','OBRA'],
  ['E','29/01/2026',1500,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','02/02/2026',-232.27,'SEBÁ','MATERIAL PET','INFRA','INFRAESTRUTURA'],
  ['S','02/02/2026',-453.18,'SEBÁ','MATERIAL PET','INFRA','INFRAESTRUTURA'],
  ['S','02/02/2026',-211.79,'VÊ','MATERIAL PET','INFRA','INFRAESTRUTURA'],
  ['S','02/02/2026',-1551,'VÊ','MATERIAL PET','INFRA','INFRAESTRUTURA'],
  ['S','02/02/2026',-15,'VÊ','MATERIAL PET','INFRA','INFRAESTRUTURA'],
  ['E','02/02/2026',3000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','02/02/2026',-1000,'SEBÁ','PINTORES','','OBRA'],
  ['S','02/02/2026',-1000,'SEBÁ','PINTORES','','OBRA'],
  ['S','02/02/2026',-784.09,'SEBÁ','LEROY','','OBRA'],
  ['S','02/02/2026',-439.96,'SEBÁ','CASULO','ITENS INAUGURAÇÃO','INFRAESTRUTURA'],
  ['S','02/02/2026',-1664.3,'VÊ','LEROY','','OBRA'],
  ['S','02/02/2026',-75.7,'VÊ','KALUNGA','MATERIAL FACHADA E INFRA','INFRAESTRUTURA'],
  ['S','02/02/2026',-97.5,'VÊ','TECIDO','','INFRAESTRUTURA'],
  ['S','02/02/2026',-49.97,'VÊ','CAMISETA','','INFRAESTRUTURA'],
  ['S','03/02/2026',-449.5,'SEBÁ','MERCADO LIVRE','MATERIAL GERAL','MATERIAL LIMPEZA'],
  ['S','03/02/2026',-17,'SEBÁ','KALUNGA','MATERIAL CAMISETA','INFRAESTRUTURA'],
  ['S','03/02/2026',-220,'SEBÁ','SMART MADEIRAS','','INFRAESTRUTURA'],
  ['S','03/02/2026',-2515.37,'VÊ','LEROY','','OBRA'],
  ['S','03/02/2026',-903.52,'VÊ','ATACADÃO','ITENS INAUGURAÇÃO','INFRAESTRUTURA'],
  ['S','04/02/2026',-398,'SEBÁ','MARQUES','','OBRA'],
  ['S','04/02/2026',-180,'VÊ','JOSENOR','','INFRAESTRUTURA'],
  ['S','04/02/2026',-1288.92,'VÊ','NEON','NEON INSTAGRAMAVEL','INFRAESTRUTURA'],
  ['S','04/02/2026',-86.4,'VÊ','QR CODE PAREDE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-223,'SEBÁ','MARQUES','','OBRA'],
  ['S','05/02/2026',-213,'SEBÁ','MADEREIRA SANTANA','','OBRA'],
  ['S','05/02/2026',-128.5,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-140,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-69.58,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-62.99,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-117.8,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-269.18,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','05/02/2026',-66.49,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['E','06/02/2026',1000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','06/02/2026',-145.2,'SEBÁ','JAPA ADESIVOS','ADESIVOS GELADEIRA','INFRAESTRUTURA'],
  ['S','06/02/2026',-150,'SEBÁ','CORANTE','','OBRA'],
  ['S','06/02/2026',-509.55,'SEBÁ','MADEREIRA SANTANA','','OBRA'],
  ['S','06/02/2026',-88,'VÊ','CASA DE BOLO','INAUGURAÇÃO','INFRAESTRUTURA'],
  ['S','06/02/2026',-33.8,'VÊ','MARQUES','','OBRA'],
  ['S','07/02/2026',-1559.84,'SEBÁ','PINTORES','','OBRA'],
  ['S','07/02/2026',-105,'SEBÁ','LU FLORES','ITENS INAUGURAÇÃO','INFRAESTRUTURA'],
  ['S','07/02/2026',-80,'VÊ','PÃO MEL','','INFRAESTRUTURA'],
  ['S','08/02/2026',-104.79,'SEBÁ','GARDEN','01/05','OBRA'],
  ['S','08/02/2026',-104.79,'SEBÁ','GARDEN','2/5','OBRA'],
  ['S','08/02/2026',-104.79,'SEBÁ','GARDEN','3/5','OBRA'],
  ['E','09/02/2026',3000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','09/02/2026',-145.58,'SEBÁ','CADEIRAS','INAUGURAÇÃO','INFRAESTRUTURA'],
  ['S','09/02/2026',-117,'VÊ','FUNCIONÁRIO','NATALIA','FOLHA SALARIAL'],
  ['S','09/02/2026',-70,'VÊ','FUNCIONÁRIO','MARIA','FOLHA SALARIAL'],
  ['S','09/02/2026',-100,'VÊ','FUNCIONÁRIO','NATALIA','FOLHA SALARIAL'],
  ['E','10/02/2026',500,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','10/02/2026',-416.59,'SEBÁ','MUDANÇA','','OUTROS'],
  ['S','10/02/2026',-17.2,'SEBÁ','MARQUES','','OBRA'],
  ['S','11/02/2026',-350,'SEBÁ','OUTROS','PAULINHO','FOLHA SALARIAL'],
  ['S','12/02/2026',-148,'SEBÁ','MARQUES','','OBRA'],
  ['E','13/02/2026',1000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','13/02/2026',-300.76,'VÊ','MERCADO LIVRE','LUMINÁRIAS NEON+CORTADORES','INFRAESTRUTURA'],
  ['S','14/02/2026',-52.7,'VÊ','PIRUETA','','INFRAESTRUTURA'],
  ['E','18/02/2026',4000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','18/02/2026',-1000,'SEBÁ','ELAINE','','ALUGUEL'],
  ['S','18/02/2026',-459.41,'SEBÁ','FUNCIONÁRIO','NATALIA','FOLHA SALARIAL'],
  ['S','18/02/2026',-161.48,'SEBÁ','SABESP','','ÁGUA'],
  ['S','19/02/2026',-85.86,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','20/02/2026',-5000,'SEBÁ','ELAINE','','ALUGUEL'],
  ['S','20/02/2026',-50,'SEBÁ','CORANTE','','OBRA'],
  ['S','20/02/2026',-111.49,'SEBÁ','ENEL','','ENERGIA ELÉTRICA'],
  ['S','20/02/2026',-100,'SEBÁ','MARQUES','','OBRA'],
  ['S','26/02/2026',-192.67,'SEBÁ','360 IMPRIMIR','PANFLETOS','COMUNICAÇÃO E MARKETING'],
  ['S','26/02/2026',-60,'SEBÁ','ABCC','ASSOCIAÇÃO CRECHES CANINAS','ASSOCIAÇÃO'],
  ['S','26/02/2026',-73,'SEBÁ','JUCESP','','TAXA JUNTA COMERCIAL'],
  ['S','01/03/2026',-93.63,'SEBÁ','MERCADO LIVRE','CORTINAS','INFRAESTRUTURA'],
  ['S','01/03/2026',-1464.56,'AUÊ','RETIRADA SEBÁ','CARTÃO INÍCIO OPERAÇÃO','PROLABORE'],
  ['E','03/03/2026',600,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['E','03/03/2026',1000,'NICE','','ENTRADA INVESTIMENTO','APORTE NICE'],
  ['S','03/03/2026',-344.41,'SEBÁ','MERCADO LIVRE','MATERIAL INFRA','INFRAESTRUTURA'],
  ['S','03/03/2026',-108.88,'VÊ','MERCADO LIVRE','LUMINÁRIAS NEON 2/9','INFRAESTRUTURA'],
  ['S','04/03/2026',-34.23,'SEBÁ','MERCADO LIVRE','MOUSE','INFRAESTRUTURA'],
  ['S','05/03/2026',-94.88,'VÊ','CLARO','INTERNET','INTERNET'],
  ['S','06/03/2026',-434.42,'SEBÁ','FUNCIONÁRIO','SARAH','FOLHA SALARIAL'],
  ['S','06/03/2026',-424.09,'SEBÁ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','07/03/2026',-122,'SEBÁ','MARQUES','','OBRA'],
  ['S','09/03/2026',-46.4,'VÊ','KALUNGA','MATERIAL CAMISETA','INFRAESTRUTURA'],
  ['S','10/03/2026',-33.8,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','11/03/2026',-26.9,'SEBÁ','LOCAWEB','SITE','COMUNICAÇÃO E MARKETING'],
  ['S','11/03/2026',-149.3,'VÊ','JAPAN GRÁFICA','CAMISETAS','INFRAESTRUTURA'],
  ['S','16/03/2026',-413.15,'SEBÁ','MERCADO LIVRE','MATERIAL INFRA','INFRAESTRUTURA'],
  ['S','16/03/2026',-53.7,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','17/03/2026',-123.89,'SEBÁ','MERCADO LIVRE','MATERIAL INFRA','INFRAESTRUTURA'],
  ['S','17/03/2026',-30.98,'SEBÁ','OZ PET','POTE BARUC','INFRAESTRUTURA'],
  ['S','18/03/2026',-63.28,'SEBÁ','MERCADO LIVRE','MATERIAL INFRA','INFRAESTRUTURA'],
  ['S','21/03/2026',-169.89,'SEBÁ','MERCADO LIVRE','MATERIAL INFRA','INFRAESTRUTURA'],
  ['S','21/03/2026',-148.71,'SEBÁ','SODIMAC','','OBRA'],
  ['S','23/03/2026',-88.59,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','23/03/2026',-48.77,'VÊ','SHOPPEE','PASCOA','INFRAESTRUTURA'],
  ['S','24/03/2026',-42.25,'AUÊ','MARQUES','MATERIAL INFRA','OBRA'],
  ['S','25/03/2026',-142,'AUÊ','CONTABILIDADE','','CONTABILIDADE'],
  ['S','26/03/2026',-383.19,'AUÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','26/03/2026',-260.09,'SEBÁ','GOOGLE AD','','COMUNICAÇÃO E MARKETING'],
  ['S','26/03/2026',-103.56,'VÊ','SHOPPEE','PASCOA','INFRAESTRUTURA'],
  ['S','26/03/2026',-60.23,'VÊ','CARREFOUR','ITENS PASCOA','INFRAESTRUTURA'],
  ['S','26/03/2026',-28.26,'VÊ','MINI EXTRA','ITENS PASCOA','INFRAESTRUTURA'],
  ['S','26/03/2026',-271.96,'AUÊ','RETIRADA SEBÁ','COMPRA ML','PROLABORE'],
  ['S','28/03/2026',-11.77,'AUÊ','TROPICAL','COMPRA MERCADO','MATERIAL LIMPEZA'],
  ['S','28/03/2026',-11.51,'AUÊ','RETIRADA SEBÁ','PÃO PARQUE','PROLABORE'],
  ['S','28/03/2026',-235.1,'AUÊ','RETIRADA SEBÁ','RAÇÃO FILHOTES','PROLABORE'],
  ['S','28/03/2026',-29.9,'AUÊ','PETZ','PETISCOS','INFRAESTRUTURA'],
  ['S','30/03/2026',-49.2,'AUÊ','PALÁDIO','MATERIAL INFRA','OBRA'],
  ['S','30/03/2026',-85,'AUÊ','TELEFÔNICA (VIVO)','TELEFONE','INTERNET'],
  ['S','30/03/2026',-56,'AUÊ','MARQUES','MATERIAL INFRA','OBRA'],
  ['S','30/03/2026',-55,'AUÊ','SODIMAC','MATERIAL INFRA','OBRA'],
  ['S','30/03/2026',-50.34,'VÊ','SHOPPEE','1/3','INFRAESTRUTURA'],
  ['S','30/03/2026',-25,'VÊ','SHOPPEE','PASCOA','INFRAESTRUTURA'],
  ['S','30/03/2026',-63.96,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','30/03/2026',-479.55,'VÊ','MERCADO LIVRE','BANHO & TOSA','INFRAESTRUTURA'],
  ['S','30/03/2026',-190.69,'VÊ','MERCADO LIVRE','1/10 BANHO & TOSA','INFRAESTRUTURA'],
  ['S','30/03/2026',-36.9,'VÊ','MERCADO LIVRE','PLACA EVA','INFRAESTRUTURA'],
  ['S','30/03/2026',-59,'AUÊ','RETIRADA SEBÁ','TELEFONE','PROLABORE'],
  ['S','01/04/2026',-161.48,'AUÊ','SABESP','','ÁGUA'],
  ['S','01/04/2026',-34.21,'AUÊ','ENEL','','ENERGIA ELÉTRICA'],
  ['S','01/04/2026',-30,'AUÊ','AUTOZONE','SPRAY ROSA','OBRA'],
  ['S','01/04/2026',-24.19,'AUÊ','RETIRADA SEBÁ','ENEL CASA','PROLABORE'],
  ['S','01/04/2026',-125.56,'AUÊ','RETIRADA SEBÁ','ENEL CASA','PROLABORE'],
  ['S','02/04/2026',-37.58,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','02/04/2026',-45.97,'VÊ','MERCADO LIVRE','','INFRAESTRUTURA'],
  ['S','02/04/2026',-49.5,'AUÊ','RETIRADA SEBÁ','CONTA LUZ CASA','PROLABORE'],
  ['S','02/04/2026',-25.31,'AUÊ','RETIRADA SEBÁ','ENEL CASA','PROLABORE'],
  ['S','02/04/2026',-153.95,'AUÊ','RETIRADA SEBÁ','AUTOZONE','PROLABORE'],
  ['S','02/04/2026',-150,'AUÊ','RETIRADA SEBÁ','GASOLINA PAJERO','PROLABORE'],
  ['S','02/04/2026',-199.97,'AUÊ','RETIRADA SEBÁ','OVOS FILHOS SEBÁ','PROLABORE'],
  ['S','03/04/2026',-108.88,'VÊ','MERCADO LIVRE','LUMINÁRIAS NEON 3/9','INFRAESTRUTURA'],
  ['S','07/04/2026',-303.01,'AUÊ','ENEL','','ENERGIA ELÉTRICA'],
  ['S','07/04/2026',-101.49,'AUÊ','ENEL','','ENERGIA ELÉTRICA'],
  ['S','07/04/2026',-100,'VÊ','ATIVIDADES PARA PROVENTOS','','OUTROS'],
  ['S','08/04/2026',-2197.34,'AUÊ','SALÁRIO SARAH','','FOLHA SALARIAL'],
  ['S','08/04/2026',-1700,'AUÊ','RETIRADA SEBÁ','PENSÃO CRIANÇAS - LANÇADO','PROLABORE'],
  ['S','08/04/2026',-82.05,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','08/04/2026',-350.55,'VÊ','PETZ','PRODUTOS DE LIMPEZA','INFRAESTRUTURA'],
  ['S','10/04/2026',-50,'AUÊ','PERNOITE','SARAH','FOLHA SALARIAL'],
  ['S','11/04/2026',-61.08,'SEBÁ','LEROY MERLIN','','OBRA'],
  ['S','12/04/2026',-189.95,'SEBÁ','AUTOZONE','SPRAYS TUNEL','OBRA'],
  ['S','12/04/2026',-167.39,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','15/04/2026',-6000,'VÊ','ALUGUEL','','ALUGUEL'],
  ['S','17/04/2026',-167.47,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','19/04/2026',-46,'VÊ','SHOPPEE','CORAÇÃO MÃES','INFRAESTRUTURA'],
  ['S','21/04/2026',-36.9,'VÊ','SHOPPEE','POTE RAMIRO','INFRAESTRUTURA'],
  ['S','22/04/2026',-167.33,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','23/04/2026',-327.92,'AUÊ','SABESP','','ÁGUA'],
  ['S','24/04/2026',-62.97,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','25/04/2026',-34.98,'VÊ','SHOPPEE','','INFRAESTRUTURA'],
  ['S','25/04/2026',-34.88,'VÊ','SHOPPEE','MORDEDOR SIRIUS','INFRAESTRUTURA'],
  ['S','26/04/2026',-167.45,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','27/04/2026',-33.68,'VÊ','SHOPPEE','MAQUINA TOSA','INFRAESTRUTURA'],
  ['S','27/04/2026',-31.9,'VÊ','SHOPPEE','BANHO E TOSA','INFRAESTRUTURA'],
  ['S','27/04/2026',-39.99,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','27/04/2026',-56.99,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','28/04/2026',-100,'AUÊ','LOCATOM','ESCADA','OBRA'],
  ['S','30/04/2026',-50.34,'VÊ','SHOPPEE','02/03','INFRAESTRUTURA'],
  ['S','30/04/2026',-37.69,'VÊ','SHOPPEE','BANHO E TOSA','INFRAESTRUTURA'],
  ['S','30/04/2026',-50.34,'VÊ','SHOPPEE','2/3','INFRAESTRUTURA'],
  ['S','30/04/2026',-190.69,'VÊ','MERCADO LIVRE','2/10 BANHO & TOSA','INFRAESTRUTURA'],
  ['S','01/05/2026',-237.15,'AUÊ','MERCADO LIVRE','ROTEADOR','INFRAESTRUTURA'],
  ['S','03/05/2026',-108.88,'VÊ','MERCADO LIVRE','LUMINÁRIAS NEON 4/9','INFRAESTRUTURA'],
  ['S','04/05/2026',-105.52,'AUÊ','MERCADO LIVRE','CAMERA COZINHA','INFRAESTRUTURA'],
  ['S','04/05/2026',-36.59,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','04/05/2026',-14.25,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','04/05/2026',-17.99,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','04/05/2026',-24,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','04/05/2026',-30,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','05/05/2026',-217,'AUÊ','RETIRADA SEBÁ','CARTÃO','PROLABORE'],
  ['S','05/05/2026',-79.9,'AUÊ','MERCADO LIVRE','CARTÃO CAMERA','INFRAESTRUTURA'],
  ['S','05/05/2026',-120,'VÊ','CLARO','INTERNET','INTERNET'],
  ['S','05/05/2026',-44.45,'VÊ','SHOPPEE','MATERIAL COPA','INFRAESTRUTURA'],
  ['S','05/05/2026',-11,'VÊ','SHOPPEE','MATERIAL COPA','INFRAESTRUTURA'],
  ['S','08/05/2026',-44.1,'VÊ','SHOPPEE','GRAVATINHA BORBOLETA','INFRAESTRUTURA'],
  ['S','08/05/2026',-78.17,'VÊ','WINDSURF','IA INFRA','INFRAESTRUTURA'],
  ['S','11/05/2026',-283.82,'VÊ','BIOBONE','BRINQUEDOS CÃES BIOBONE','INFRAESTRUTURA'],
  ['S','11/05/2026',-63,'VÊ','IMPRESSÃO FOTOS DIA DAS MÃES','NEWCOPY','INFRAESTRUTURA'],
  ['S','11/05/2026',-102.73,'VÊ','WINDSURF','IA INFRA','INFRAESTRUTURA'],
  ['S','12/05/2026',-62.68,'VÊ','CACAUSHOW','DIA DAS MÃES','INFRAESTRUTURA'],
  ['S','13/05/2026',-360,'VÊ','CHICTOSA','APETRECHOS CÃES','INFRAESTRUTURA'],
  ['S','13/05/2026',-29.38,'VÊ','FACEBOOK','ANÚNCIOS','COMUNICAÇÃO E MARKETING'],
  ['S','14/05/2026',-48.15,'VÊ','MERCADO LIVRE','KIT ANIVERSÁRIO LEÃO','INFRAESTRUTURA'],
  ['S','14/05/2026',-30.9,'VÊ','SHOPPEE','ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','18/05/2026',-40.4,'VÊ','MERCADO LIVRE','FAIXAS BRASIL','INFRAESTRUTURA'],
  ['S','27/04/2026',-406.78,'SEBÁ','SODIMAC','INFRA','OBRA'],
  ['S','24/04/2026',-297.08,'SEBÁ','MERCADO LIVRE','INFRA','INFRAESTRUTURA'],
  ['S','14/04/2026',-344.97,'SEBÁ','MERCADO LIVRE','INFRA','INFRAESTRUTURA'],
  ['S','08/02/2026',-104.79,'SEBÁ','GARDEN','04/5','OBRA'],
  ['S','07/05/2026',-2151.85,'AUÊ','SALÁRIO SARAH','','FOLHA SALARIAL'],
  ['S','13/05/2026',-284.1,'AUÊ','CONTABILIDADE','','CONTABILIDADE'],
  ['S','14/05/2026',-20.04,'AUÊ','CASULO','ITENS ANIVERSÁRIO LEO','INFRAESTRUTURA'],
  ['S','15/05/2026',-6000,'AUÊ','ALUGUEL','','ALUGUEL'],
  ['S','15/05/2026',-295.85,'AUÊ','RETIRADA SEBÁ','SEM PARAR SÍTIO','PROLABORE'],
  ['S','19/05/2026',-692.7,'AUÊ','IPTU FEV','','IMPOSTO IPTU'],
  ['S','19/05/2026',-683.22,'AUÊ','IPTU MAR','','IMPOSTO IPTU'],
  ['S','19/05/2026',-699.51,'AUÊ','IPTU JAN','','IMPOSTO IPTU'],
  ['S','19/05/2026',-598.86,'AUÊ','IPTU ABR','','IMPOSTO IPTU'],
  ['S','19/05/2026',-522.5,'AUÊ','MULTPET','','INFRAESTRUTURA'],
  ['S','19/05/2026',-239.95,'AUÊ','FEITO FILHO','MATERIAL CÃES','INFRAESTRUTURA'],
  ['S','19/05/2026',-105.66,'AUÊ','RETIRADA VERÔNICA','','PROLABORE'],
  ['S','19/05/2026',-29.9,'AUÊ','ESTACIONAMENTO','','OUTROS'],
  ['S','19/05/2026',-120.22,'AUÊ','SABESP','','ÁGUA'],
  ['S','19/05/2026',-342.19,'AUÊ','ENEL','','ENERGIA ELÉTRICA'],
]

// Converte DD/MM/YYYY → YYYY-MM-DD
function parseDate(s) {
  const [d, m, y] = s.split('/')
  return `${y}-${m}-${d}`
}

function calcPeriod(dateStr) {
  const INAUG = new Date('2026-02-07')
  const d = new Date(dateStr + 'T12:00:00Z')
  if (d < INAUG) return 'PRE_INAUGURACAO'
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// Monta entradas normalizadas — category do arquivo tem prioridade
function buildEntry(row) {
  const [typeRaw, dateRaw, amountRaw, account, supplier, description, categoryRaw] = row
  const dateStr = parseDate(dateRaw)
  const amount = Math.abs(amountRaw)
  const type = typeRaw.trim()
  // Normaliza categoria
  let category = (categoryRaw || '').trim().toUpperCase()
  if (category === 'ENTRADA INVESTIMENTO') category = 'APORTE NICE'
  if (category === 'JUCESP') category = 'TAXA JUNTA COMERCIAL'
  if (!category) category = type === 'E' ? 'ENTRADA CAIXA' : 'OUTROS'

  return {
    type,
    date: dateStr + 'T12:00:00Z',
    amount,
    account: account.trim(),
    supplier: supplier?.trim() || null,
    description: description?.trim() || null,
    category,
    period: calcPeriod(dateStr),
  }
}

// Chave de dedup — mesma data + tipo + valor arredondado + conta
function dedupKey(e) {
  const d = typeof e.date === 'string' ? e.date.split('T')[0] : new Date(e.date).toISOString().split('T')[0]
  return `${d}|${e.type}|${Math.round(e.amount * 100)}|${e.account}`
}

async function main() {
  console.log('🔐 Autenticando...')
  await login()

  console.log('📥 Buscando lançamentos existentes...')
  const { body } = await request('/api/financeiro')
  const existing = JSON.parse(body)
  const existingKeys = new Set(existing.map(dedupKey))
  console.log(`   ${existing.length} lançamentos na base`)

  const allNew = RAW.map(buildEntry)
  const toInsert = allNew.filter(e => !existingKeys.has(dedupKey(e)))
  const skipped = allNew.length - toInsert.length

  console.log(`\n📊 Arquivo legado: ${allNew.length} linhas`)
  console.log(`   ✅ Já existem: ${skipped}`)
  console.log(`   🆕 A importar:  ${toInsert.length}`)

  if (toInsert.length === 0) {
    console.log('\n✨ Nada a importar — base já está atualizada!')
    return
  }

  // Preview por período
  const byPeriod = {}
  for (const e of toInsert) {
    byPeriod[e.period] = (byPeriod[e.period] || 0) + 1
  }
  console.log('\n📅 Por período:')
  for (const [p, n] of Object.entries(byPeriod).sort()) console.log(`   ${p}: ${n} lançamentos`)

  // Importa um a um para garantir sem erros
  console.log('\n⬆️  Importando...')
  let ok = 0, err = 0
  for (const e of toInsert) {
    const res = await request('/api/financeiro', 'POST', JSON.stringify(e), 'application/json')
    if (res.status === 201) { ok++ }
    else { err++; console.error(`  ❌ Erro: ${res.status} | ${res.body.substring(0, 80)}`) }
  }

  console.log(`\n✅ Importados: ${ok} | ❌ Erros: ${err}`)
}

main().catch(console.error)
