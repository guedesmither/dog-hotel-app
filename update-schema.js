const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

async function main() {
  try {
    console.log('Atualizando schema do banco de dados...')
    const { stdout, stderr } = await execPromise('npx prisma db push')
    console.log(stdout)
    if (stderr) console.error(stderr)
    console.log('Schema atualizado com sucesso!')
  } catch (error) {
    console.error('Erro ao atualizar schema:', error)
  }
}

main()
