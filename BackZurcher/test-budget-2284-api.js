const axios = require('axios');

async function testBudgetAPI() {
  try {
    console.log('🔍 Testing Budget API response...\n');

    // Replace with your actual API URL and token
    const API_URL = process.env.API_URL || 'http://localhost:5003';
    const TOKEN = process.env.TEST_TOKEN; // Set this in your environment or replace directly

    if (!TOKEN) {
      console.log('⚠️ No TEST_TOKEN found. Please set it in environment or edit the script.');
      console.log('Example: export TEST_TOKEN="your-jwt-token-here"');
      return;
    }

    // Test 1: Get all budgets (first page)
    console.log('📋 Testing GET /budget/all...');
    const listResponse = await axios.get(`${API_URL}/budget/all?page=1&pageSize=20`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log(`✅ Got ${listResponse.data.budgets.length} budgets\n`);

    // Find budget 2284
    const budget2284 = listResponse.data.budgets.find(b => b.idBudget === 2284);
    
    if (budget2284) {
      console.log('🎯 Found Budget 2284 in list:');
      console.log('   - idBudget:', budget2284.idBudget);
      console.log('   - status:', budget2284.status);
      console.log('   - signatureMethod:', budget2284.signatureMethod);
      console.log('   - signedPdfPath:', budget2284.signedPdfPath ? 'YES' : 'NO');
      console.log('   - manualSignedPdfPath:', budget2284.manualSignedPdfPath ? 'YES' : 'NO');
      console.log('   - Full budget object:');
      console.log(JSON.stringify(budget2284, null, 2));
    } else {
      console.log('❌ Budget 2284 not found in first page. Searching more...');
      
      // Try to get more budgets
      const moreResponse = await axios.get(`${API_URL}/budget/all?page=1&pageSize=100`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      const budget2284More = moreResponse.data.budgets.find(b => b.idBudget === 2284);
      if (budget2284More) {
        console.log('🎯 Found Budget 2284 in larger page:');
        console.log('   - status:', budget2284More.status);
        console.log('   - signatureMethod:', budget2284More.signatureMethod);
      } else {
        console.log('❌ Budget 2284 not found even in 100 results');
      }
    }

    // Test 2: Get budget 2284 by ID
    console.log('\n📋 Testing GET /budget/2284...');
    const detailResponse = await axios.get(`${API_URL}/budget/2284`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('✅ Got budget 2284 details:');
    console.log('   - status:', detailResponse.data.status);
    console.log('   - signatureMethod:', detailResponse.data.signatureMethod);
    console.log('   - signedPdfPath:', detailResponse.data.signedPdfPath ? 'YES' : 'NO');
    console.log('   - manualSignedPdfPath:', detailResponse.data.manualSignedPdfPath ? 'YES' : 'NO');

  } catch (error) {
    console.error('❌ Error testing API:');
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Message:', error.response.data?.message || error.response.data);
    } else {
      console.error('   -', error.message);
    }
  }
}

testBudgetAPI();
