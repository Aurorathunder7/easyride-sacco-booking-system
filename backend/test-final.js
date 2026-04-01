const axios = require('axios');
require('dotenv').config();

async function testFinal() {
    console.log('🧪 TESTING YOUR NEW M-PESA APP');
    console.log('===============================\n');
    
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    
    console.log('Consumer Key:', consumerKey ? consumerKey.substring(0, 8) + '...' : '❌');
    console.log('Consumer Secret:', consumerSecret ? '✅ Present' : '❌');
    console.log('Passkey:', process.env.MPESA_PASSKEY ? '✅ Present' : '❌');
    console.log('Callback URL:', process.env.MPESA_CALLBACK_URL || '❌');
    console.log('');
    
    try {
        // Get Access Token
        console.log('📡 Getting Access Token...');
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        
        const tokenResponse = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: { Authorization: `Basic ${auth}` }
            }
        );
        
        console.log('✅ Access Token obtained!\n');
        
        // Test STK Push
        console.log('📡 Testing STK Push...');
        
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:]/g, '')
            .replace('T', '')
            .split('.')[0];
        
        const password = Buffer.from(`174379${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
        
        const payload = {
            BusinessShortCode: '174379',
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: 1,
            PartyA: '254708374149',
            PartyB: '174379',
            PhoneNumber: '254797338021',
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: 'Test',
            TransactionDesc: 'Test Payment'
        };
        
        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${tokenResponse.data.access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('\n✅✅✅ SUCCESS! M-PESA IS WORKING! ✅✅✅');
        console.log('\nResponse:', stkResponse.data);
        console.log('\n📱 Check your phone (254708374149) for the M-Pesa prompt!');
        console.log('   For sandbox, use PIN: 123456');
        console.log('\n🎉 Your booking system can now process payments!');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('Error:', error.response?.data || error.message);
        
        if (error.response?.data?.errorCode === '400.002.02') {
            console.error('\n⚠️ The passkey might need to be generated.');
            console.error('Try clicking "Generate Passkey" in your app dashboard.');
        }
    }
}

testFinal();