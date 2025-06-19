
const { neon } = require("@neondatabase/serverless");

async function createKarakteristiekenTable() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🔄 Creating karakteristieken table...');
    
    // Create the karakteristieken table
    await sql`
      CREATE TABLE IF NOT EXISTS karakteristieken (
        id SERIAL PRIMARY KEY,
        kt_naam TEXT NOT NULL,
        kt_type TEXT NOT NULL,
        kt_waarde TEXT,
        kt_code TEXT,
        kt_paser TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('✅ Successfully created karakteristieken table!');
    
    // Check if table exists and is empty
    const result = await sql`SELECT COUNT(*) FROM karakteristieken`;
    console.log(`📊 Current karakteristieken count: ${result[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating karakteristieken table:', error);
  }
  
  process.exit(0);
}

createKarakteristiekenTable();
