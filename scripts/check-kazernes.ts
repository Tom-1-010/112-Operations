import 'dotenv/config';

// Simple fetch to check kazernes via API
async function checkKazernes() {
  try {
    console.log('🔍 Checking kazernes via API endpoint...\n');
    
    const response = await fetch('http://localhost:5000/api/kazernes');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const kazernes = await response.json();
    
    console.log(`✅ Found ${kazernes.length} kazernes in database:\n`);
    
    if (kazernes.length > 0) {
      // Group by type
      const byType = kazernes.reduce((acc: any, k: any) => {
        acc[k.type] = (acc[k.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Breakdown by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
      console.log('\n📋 All kazernes:');
      kazernes.forEach((k: any) => {
        console.log(`   [${k.type}] ${k.naam} - ${k.plaats} (capaciteit: ${k.capaciteit})`);
      });
    } else {
      console.log('⚠️  No kazernes found. Run the insert script to add testdata.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Dev server is running: npm run dev');
    console.log('   2. Kazernes table exists in Supabase');
    console.log('   3. Testdata has been inserted');
    process.exit(1);
  }
}

checkKazernes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

