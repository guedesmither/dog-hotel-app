// Script para reverter check-in de hoje
const hoje = new Date().toISOString().split('T')[0]
console.log('Data:', hoje)

// Nomes dos cães
const caes = ['Rocky', 'Lara']

async function reverterCheckin() {
  for (const nome of caes) {
    try {
      // 1. Buscar o dogId pelo nome
      const res = await fetch(`http://localhost:3000/api/dogs?search=${encodeURIComponent(nome)}`)
      if (!res.ok) {
        console.log(`❌ Erro ao buscar ${nome}`)
        continue
      }
      const dogs = await res.json()
      const dog = dogs.find(d => d.name.toLowerCase() === nome.toLowerCase())
      
      if (!dog) {
        console.log(`❌ ${nome} não encontrado`)
        continue
      }
      
      console.log(`✅ ${nome} encontrado: ${dog.id}`)
      
      // 2. Reverter presença (definir como null)
      const patchRes = await fetch('http://localhost:3000/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dogId: dog.id,
          date: hoje,
          present: null  // null = não confirmado
        })
      })
      
      if (patchRes.ok) {
        console.log(`✅ Check-in de ${nome} revertido!`)
      } else {
        console.log(`❌ Erro ao reverter ${nome}:`, await patchRes.text())
      }
    } catch (err) {
      console.log(`❌ Erro: ${err.message}`)
    }
  }
}

reverterCheckin()
