
const fs = require('fs');
const path = require('path');

function fixNaNValues() {
  console.log('🔄 Fixing NaN values in karakteristieken JSON...');
  
  const filePath = path.join(process.cwd(), 'attached_assets', 'karakteristieken_1750369362301.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    return;
  }
  
  // Read file as text
  let jsonText = fs.readFileSync(filePath, 'utf8');
  console.log('📄 Original file size:', jsonText.length, 'characters');
  
  // Count NaN occurrences
  const nanCount = (jsonText.match(/:\s*NaN/g) || []).length;
  console.log('🔍 Found', nanCount, 'NaN values to replace');
  
  // Replace all NaN values with null
  const fixedJsonText = jsonText.replace(/:\s*NaN/g, ': null');
  
  // Write back to file
  const backupPath = filePath + '.backup';
  fs.writeFileSync(backupPath, jsonText); // Create backup
  fs.writeFileSync(filePath, fixedJsonText); // Write fixed version
  
  console.log('✅ Fixed', nanCount, 'NaN values');
  console.log('💾 Backup saved as:', backupPath);
  console.log('📄 Fixed file size:', fixedJsonText.length, 'characters');
  
  // Verify JSON is valid
  try {
    const parsedData = JSON.parse(fixedJsonText);
    console.log('✅ JSON is valid, contains', parsedData.length, 'entries');
  } catch (error) {
    console.error('❌ JSON parsing failed:', error.message);
  }
}

fixNaNValues();
