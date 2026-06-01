export const firebaseConfig = {
    apiKey: "AIzaSyAAtk7rWxT7VFKA6J1UVHicHSakceMc4TA",
    authDomain: "openclass-565ca.firebaseapp.com",
    projectId: "openclass-565ca",
    storageBucket: "openclass-565ca.firebasestorage.app",
    messagingSenderId: "43042586871",
    appId: "1:43042586871:web:d35842d6f67d44c24fd3f2",
    measurementId: "G-BR2YDKX6B4"
};

export const emailConfig = {
    serviceID: "service_djr1n0f",
    templateID: "template_tiqnb53",
    publicKey: "P88qoYcr5CHYVNAPw"
};

export const customAiConfig = {
    // IMPORTANT AI CORS WARNING:
    // If you see a CORS error in the console, your Ngrok URL backend below must allow CORS.
    // The browser physically blocks HTTP calls from `firebaseapp.com` to `ngrok-free.app`
    // unless the ngrok-free.app server returns the header: `Access-Control-Allow-Origin: *`.
    backendUrl: "https://dance-peroxide-tinfoil.ngrok-free.dev", 
    projectKey: "my_super_secure_secret_agent_key_123",
    groqKey: "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" 
};