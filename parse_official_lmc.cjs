// Parse the official LMC classification file
const fs = require('fs');

// Read the complete official file
const fileContent = fs.readFileSync('attached_assets/LMC_classificaties_duidelijk_1750168690591.txt', 'utf8');

// Parse classification blocks
const blocks = fileContent.split('--- CLASSIFICATIE BLOK ---').filter(block => block.trim());
const classifications = [];

blocks.forEach(block => {
  const lines = block.trim().split('\n');
  let mc1 = '', mc2 = '', mc3 = '', code = '', prio = 5, definitie = '';

  lines.forEach(line => {
    if (line.startsWith('MC1   :')) {
      mc1 = line.replace('MC1   :', '').trim();
    } else if (line.startsWith('MC2   :')) {
      mc2 = line.replace('MC2   :', '').trim();
    } else if (line.startsWith('MC3   :')) {
      mc3 = line.replace('MC3   :', '').trim();
    } else if (line.startsWith('Code  :')) {
      code = line.replace('Code  :', '').trim();
    } else if (line.startsWith('Prio  :')) {
      const prioStr = line.replace('Prio  :', '').trim();
      prio = prioStr ? parseFloat(prioStr) : 5;
    } else if (line.startsWith('Uitleg:')) {
      definitie = line.replace('Uitleg:', '').trim();
    }
  });

  if (mc1 && code) {
    classifications.push({
      code,
      mc1,
      mc2,
      mc3,
      prio,
      definitie
    });
  }
});

console.log(`Total official classifications parsed: ${classifications.length}`);

// Generate TypeScript array
console.log('const officialClassifications: GmsClassification[] = [');
classifications.forEach((c, index) => {
  const comma = index < classifications.length - 1 ? ',' : '';
  const escapedDefinitie = c.definitie.replace(/"/g, '\\"').replace(/\n/g, ' ');
  console.log(`  { code: "${c.code}", mc1: "${c.mc1}", mc2: "${c.mc2}", mc3: "${c.mc3}", prio: ${c.prio}, definitie: "${escapedDefinitie}" }${comma}`);
});
console.log('];');