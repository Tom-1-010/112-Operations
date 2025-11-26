// Database query via API (works with running dev server)

const API_URL = 'http://localhost:5000';

async function runQuery(query: string) {
  try {
    console.log('🔍 Executing query via API...\n');
    console.log('Query:', query);
    console.log('\n' + '='.repeat(80) + '\n');
    
    const response = await fetch(`${API_URL}/api/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Query successful! ${data.rowCount} row(s) affected\n`);
      
      if (data.rows && data.rows.length > 0) {
        console.table(data.rows);
      }
    } else {
      console.error('❌ Query failed:', data.error);
      if (data.detail) console.error('Detail:', data.detail);
      if (data.hint) console.error('Hint:', data.hint);
    }
    
    return data;
  } catch (error) {
    console.error('❌ API call failed:', error);
    console.log('\n⚠️  Make sure the dev server is running: npm run dev');
    throw error;
  }
}

// Get query from command line args
const query = process.argv.slice(2).join(' ');

if (!query) {
  console.log('Usage: npm run db:api -- "SELECT * FROM kazernes LIMIT 5"');
  console.log('\n⚠️  NOTE: Dev server must be running (npm run dev)');
  console.log('\nExamples:');
  console.log('  npm run db:api -- "SELECT COUNT(*) FROM kazernes"');
  console.log('  npm run db:api -- "SELECT * FROM kazernes WHERE type = \'Brandweer\'"');
  console.log('  npm run db:api -- "INSERT INTO kazernes (...) VALUES (...)"');
  process.exit(1);
}

runQuery(query)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

