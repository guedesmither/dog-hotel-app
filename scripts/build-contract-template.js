const fs = require('fs')
const path = require('path')

const templatePath = path.join(__dirname, '../templates/contrato-modelo.docx')
const outputPath = path.join(__dirname, '../lib/contract-template.ts')
const base64 = fs.readFileSync(templatePath).toString('base64')

fs.writeFileSync(outputPath, `export const CONTRACT_TEMPLATE_BASE64 = '${base64}'\n`)
