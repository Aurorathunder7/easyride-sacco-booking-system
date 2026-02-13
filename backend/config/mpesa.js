const axios = require('axios');

class MpesaService {
    constructor() {
        this.consumerKey = process.env.MPESA_CONSUMER_KEY;
        this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        this.passkey = process.env.MPESA_PASSKEY;
        this.shortCode = process.env.MPESA_SHORTCODE;
        this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
        
        // Set base URL based on environment
        this.baseURL = this.environment === 'production' 
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
            
        this.authURL = '/oauth/v1/generate?grant_type=client_credentials';
        this.stkPushURL = '/mpesa/stkpush/v1/processrequest';
        this.queryURL = '/mpesa/stkpushquery/v1/query';
        this.b2cURL = '/mpesa/b2c/v1/paymentrequest';
        this.transactionStatusURL = '/mpesa/transactionstatus/v1/query';
        this.accountBalanceURL = '/mpesa/accountbalance/v1/query';
        this.reversalURL = '/mpesa/reversal/v1/request';
    }

    /**
     * Get OAuth access token
     */
    async getAccessToken() {
        try {
            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            
            const response = await axios.get(
                `${this.baseURL}${this.authURL}`,
                {
                    headers: {
                        Authorization: `Basic ${auth}`
                    }
                }
            );
            
            return response.data.access_token;
        } catch (error) {
            console.error('❌ Error getting M-Pesa access token:', error.response?.data || error.message);
            throw new Error('Failed to get M-Pesa access token');
        }
    }

    /**
     * Generate timestamp in format YYYYMMDDHHmmss
     */
    getTimestamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    /**
     * Generate password for STK push
     */
    generatePassword(timestamp) {
        const passwordString = `${this.shortCode}${this.passkey}${timestamp}`;
        return Buffer.from(passwordString).toString('base64');
    }

    /**
     * Format phone number to international format
     */
    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // If starts with 0, replace with 254
        if (cleaned.startsWith('0')) {
            return '254' + cleaned.slice(1);
        }
        // If starts with 7, add 254
        else if (cleaned.startsWith('7')) {
            return '254' + cleaned;
        }
        // If already in 254 format, return as is
        else if (cleaned.startsWith('254')) {
            return cleaned;
        }
        // Default: assume Kenyan number, add 254
        else {
            return '254' + cleaned;
        }
    }

    /**
     * Initiate STK Push (Lipa Na M-Pesa Online)
     */
    async stkPush(phoneNumber, amount, accountReference, transactionDesc) {
        try {
            const token = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword(timestamp);
            
            // Format phone number
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            
            const payload = {
                BusinessShortCode: this.shortCode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: Math.round(amount),
                PartyA: formattedPhone,
                PartyB: this.shortCode,
                PhoneNumber: formattedPhone,
                CallBackURL: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback',
                AccountReference: accountReference || 'EasyRide',
                TransactionDesc: transactionDesc || 'Matatu Booking Payment'
            };

            console.log('📤 M-Pesa STK Push Request:', payload);

            const response = await axios.post(
                `${this.baseURL}${this.stkPushURL}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('📥 M-Pesa STK Push Response:', response.data);
            
            return {
                success: true,
                ...response.data
            };

        } catch (error) {
            console.error('❌ M-Pesa STK Push Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.errorMessage || 'M-Pesa payment initiation failed');
        }
    }

    /**
     * Query STK Push status
     */
    async queryStatus(checkoutRequestID) {
        try {
            const token = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword(timestamp);
            
            const payload = {
                BusinessShortCode: this.shortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            };

            const response = await axios.post(
                `${this.baseURL}${this.queryURL}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa Query Error:', error.response?.data || error.message);
            throw new Error('Failed to query payment status');
        }
    }

    /**
     * Process B2C payment (send money to customer)
     */
    async b2cPayment(phoneNumber, amount, occasion, remarks) {
        try {
            const token = await this.getAccessToken();
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            
            const payload = {
                InitiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
                SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
                CommandID: 'BusinessPayment',
                Amount: Math.round(amount),
                PartyA: this.shortCode,
                PartyB: formattedPhone,
                Remarks: remarks || 'Payment',
                QueueTimeOutURL: `${process.env.BASE_URL}/api/mpesa/b2c-timeout`,
                ResultURL: `${process.env.BASE_URL}/api/mpesa/b2c-result`,
                Occasion: occasion || ''
            };

            const response = await axios.post(
                `${this.baseURL}${this.b2cURL}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa B2C Error:', error.response?.data || error.message);
            throw new Error('Failed to process B2C payment');
        }
    }

    /**
     * Check transaction status
     */
    async checkTransactionStatus(transactionID) {
        try {
            const token = await this.getAccessToken();
            const timestamp = this.getTimestamp();
            
            const payload = {
                Initiator: process.env.MPESA_INITIATOR_NAME || 'testapi',
                SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
                CommandID: 'TransactionStatusQuery',
                TransactionID: transactionID,
                PartyA: this.shortCode,
                IdentifierType: '4',
                ResultURL: `${process.env.BASE_URL}/api/mpesa/status-result`,
                QueueTimeOutURL: `${process.env.BASE_URL}/api/mpesa/status-timeout`,
                Remarks: 'Status check',
                Occasion: ''
            };

            const response = await axios.post(
                `${this.baseURL}${this.transactionStatusURL}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa Status Check Error:', error.response?.data || error.message);
            throw new Error('Failed to check transaction status');
        }
    }

    /**
     * Process refund/reversal
     */
    async processReversal(transactionID, amount) {
        try {
            const token = await this.getAccessToken();
            
            const payload = {
                Initiator: process.env.MPESA_INITIATOR_NAME || 'testapi',
                SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
                CommandID: 'TransactionReversal',
                TransactionID: transactionID,
                Amount: Math.round(amount),
                ReceiverParty: this.shortCode,
                RecieverIdentifierType: '11',
                ResultURL: `${process.env.BASE_URL}/api/mpesa/reversal-result`,
                QueueTimeOutURL: `${process.env.BASE_URL}/api/mpesa/reversal-timeout`,
                Remarks: 'Refund',
                Occasion: ''
            };

            const response = await axios.post(
                `${this.baseURL}${this.reversalURL}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ M-Pesa Reversal Error:', error.response?.data || error.message);
            throw new Error('Failed to process reversal');
        }
    }
}

module.exports = new MpesaService();