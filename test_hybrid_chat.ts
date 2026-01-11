
import fetch from 'node-fetch';

async function testHybridChat() {
  console.log('Testing Hybrid Chat API (/api/chat)...');
  
  const payload = {
    messages: [{ role: 'user', content: '上野站有電梯嗎？' }],
    userLocation: { lat: 35.7141, lon: 139.7774 },
    locale: 'zh-TW',
    zone: 'core'
  };

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.answer) {
      console.log('✅ Hybrid Chat test passed!');
    } else {
      console.log('❌ Hybrid Chat test failed: No answer in response');
    }
  } catch (error) {
    console.error('❌ Hybrid Chat test error:', error.message);
    console.log('Note: Make sure the server is running on http://localhost:3000');
  }
}

testHybridChat();
