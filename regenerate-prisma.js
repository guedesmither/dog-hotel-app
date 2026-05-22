const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

async function main() {
  try {
    console.log('Regenerando Prisma Client...')
    const { stdout, stderr } = await execPromise('"C:\\Program Files\\nodejs\\node.exe" node_modules/prisma/build/index.js generate')
    console.log(stdout)
    if (stderr) console.error(stderr)
    console.log('Prisma Client regenerado com sucesso!')
  } catch (error) {
    console.error('Erro ao regenerar Prisma Client:', error)
  }
}

main()
