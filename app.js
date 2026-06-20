import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, emailConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline database persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence failed: Multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

// Navigate correctly if opened via redirect parameters
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');
    if (path && window.renderContent) {
        window.renderContent(path);
    }
    
    // Automatically initialize admin dashboard structures if containers exist
    if (document.getElementById('plans-list')) {
        loadPlans();
        loadPayments();
        loadSubscriptions();
    }
});

export const provider = new GoogleAuthProvider();
if (window.emailjs) {
    emailjs.init(emailConfig.publicKey);
}

export { 
    doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, 
    increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, 
    signOut, signInWithPopup, updatePassword, sendPasswordResetEmail
};

export function getThumbnail(url) {
    try {
        let id = '';
        if(url.includes('v=')) id = url.split('v=')[1].split('&')[0];
        else if(url.includes('youtu.be/')) id = url.split('/').pop().split('?')[0];
        else if(url.includes('/shorts/')) id = url.split('/shorts/')[1].split('?')[0];
        else if(url.includes('/live/')) id = url.split('/live/')[1].split('?')[0];
        return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    } catch(e) { return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg'; }
}

export async function sendOTP(email, code) {
    if (!window.emailjs) throw new Error("Email engine uninitialized");
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}

// =========================================
// ADMIN CONTROL PANEL MODIFICATIONS
// =========================================

window.closeAdminDashboard = () => {
    const adminDashboard = document.getElementById('admin-dashboard');
    if (adminDashboard) adminDashboard.classList.add('hidden');
};

// Plan Field Component Layout Generator
window.handleAdminPlanUI = (type) => {
    const container = document.getElementById('plan-fields-container');
    if(!container) return;
    
    if(type === 'free_trial') {
        container.innerHTML = `
            <input id="plan-id" type="text" value="free_trial" class="input-field text-sm" readonly>
            <input id="plan-name" type="text" value="Free Trial Setup" class="input-field text-sm">
            <input id="plan-price" type="number" value="0" class="input-field text-sm">
            <input id="plan-duration" type="number" value="14" class="input-field text-sm" placeholder="Duration (Days)">
        `;
    } else if (type === 'one_year') {
        container.innerHTML = `
            <input id="plan-id" type="text" value="one_year" class="input-field text-sm" readonly>
            <input id="plan-name" type="text" value="One Year Premium Tier" class="input-field text-sm">
            <input id="plan-price" type="number" placeholder="Price (₹)" class="input-field text-sm">
            <input id="plan-duration" type="number" value="365" class="input-field text-sm" readonly>
        `;
    } else {
        container.innerHTML = `
            <input id="plan-id" type="text" placeholder="Unique Plan Code ID" class="input-field text-sm">
            <input id="plan-name" type="text" placeholder="Plan Display Title" class="input-field text-sm">
            <input id="plan-price" type="number" placeholder="Price (₹)" class="input-field text-sm">
            <input id="plan-duration" type="number" placeholder="Duration (Days)" class="input-field text-sm">
        `;
    }
};

window.processPlanSave = async () => {
    const idField = document.getElementById('plan-id');
    const nameField = document.getElementById('plan-name');
    const priceField = document.getElementById('plan-price');
    const durationField = document.getElementById('plan-duration');

    if(!idField || !nameField || !priceField || !durationField) return;

    const id = idField.value.trim().toLowerCase();
    const name = nameField.value.trim();
    const price = Number(priceField.value);
    const duration = Number(durationField.value);

    if (!id || !name || isNaN(price) || isNaN(duration)) {
        alert("Please configure all plan specifications correctly.");
        return;
    }

    await setDoc(doc(db, "plans", id), { name, price, duration });
    alert("System service plan synchronized successfully.");
    loadPlans();
};

async function loadPlans() {
    const container = document.getElementById('plans-list');
    if (!container) return;
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "plans"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
        <div class="glass p-4 rounded-xl border border-[var(--border-color)] mb-3 shadow-sm">
            <h3 class="text-sm font-black uppercase text-brandOrange">${data.name}</h3>
            <p class="text-xs opacity-70 mt-1">Price: ₹${data.price} | Term: ${data.duration} days</p>
            <p class="text-[9px] font-mono opacity-40 mt-0.5">Reference ID: ${docSnap.id}</p>
        </div>`;
    });
}

// =========================================
// LEDGER ENTRIES: PAYMENTS & ACCESS ALLOCATIONS
// =========================================

window.addPayment = async () => {
    const instId = document.getElementById('payment-institute').value.trim();
    const amount = Number(document.getElementById('payment-amount').value);
    const gateway = document.getElementById('payment-gateway').value.trim();
    const txId = document.getElementById('payment-transaction').value.trim();

    if(!instId || isNaN(amount) || !txId) {
        alert("Please document all receipt reference fields.");
        return;
    }

    await addDoc(collection(db, "payments"), {
        instituteId: instId,
        amount,
        paymentGateway: gateway || "Manual",
        transactionId: txId,
        status: "success",
        timestamp: serverTimestamp()
    });

    alert("Payment record logged successfully.");
    loadPayments();
};

async function loadPayments() {
    const container = document.getElementById('payments-list');
    if(!container) return;
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "payments"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
        <div class="glass p-4 rounded-xl border border-[var(--border-color)] mb-3 shadow-sm text-xs">
            <p class="font-bold text-brandOrange">Amount: ₹${data.amount}</p>
            <p class="opacity-60 mt-0.5">Target Campus: ${data.instituteId}</p>
            <p class="opacity-40 text-[9px] font-mono mt-0.5">TX: ${data.transactionId} (${data.paymentGateway})</p>
        </div>`;
    });
}

window.addSubscription = async () => {
    const instituteId = document.getElementById('subscription-institute').value.trim();
    const planId = document.getElementById('subscription-plan').value.trim().toLowerCase();
    const paymentId = document.getElementById('subscription-payment').value.trim();

    if(!instituteId || !planId) {
        alert("Please assign a valid Institute ID and Plan designation mapping.");
        return;
    }

    let expiry = new Date();
    if (planId === "yearly" || planId === "one_year") {
        expiry.setDate(expiry.getDate() + 365);
    } else if (planId === "free_trial") {
        expiry.setDate(expiry.getDate() + 14);
    } else {
        expiry.setDate(expiry.getDate() + 30); // Default dynamic standard monthly term
    }

    // Check if configuration maps to specific duration
    try {
        const planCheck = await getDoc(doc(db, "plans", planId));
        if(planCheck.exists()) {
            expiry = new Date();
            expiry.setDate(expiry.getDate() + Number(planCheck.data().duration || 30));
        }
    } catch(e){}

    await addDoc(collection(db, "subscriptions"), {
        instituteId,
        planId,
        paymentId: paymentId || "System_Grant",
        startDate: serverTimestamp(),
        expiryDate: expiry,
        status: "active"
    });

    // Mirror status payload parameters directly onto target campus registry nodes
    const instQuery = await getDocs(query(collection(db, "institutes"), where("uniqueId", "==", instituteId)));
    if(!instQuery.empty) {
        await updateDoc(doc(db, "institutes", instQuery.docs[0].id), {
            currentPlan: planId,
            subscriptionStatus: "active",
            expiryDate: expiry
        });
    }

    alert("System access layer successfully granted.");
    loadSubscriptions();
};

async function loadSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    if(!container) return;
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "subscriptions"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        const expiryLabel = data.expiryDate?.seconds ? new Date(data.expiryDate.seconds * 1000).toLocaleDateString() : 'Active';
        container.innerHTML += `
        <div class="glass p-4 rounded-xl border border-[var(--border-color)] mb-3 shadow-sm text-xs">
            <p class="font-bold text-purple-400">Campus Code: ${data.instituteId}</p>
            <p class="opacity-60 mt-0.5">Tier: ${data.planId.toUpperCase()} | Valid Until: ${expiryLabel}</p>
        </div>`;
    });
}
