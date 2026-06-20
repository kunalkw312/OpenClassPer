import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, emailConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline database state caching
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence failed: Multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');
    if (path) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (typeof window.renderContent === 'function') {
            window.renderContent(path);
        }
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
    if (!window.emailjs) throw new Error("Email relay system is uninitialized");
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}

// =========================================
// SYSTEM ADMIN DASHBOARD WORKFLOWS
// =========================================

window.closeAdminDashboard = () => {
    const adminDashboard = document.getElementById('admin-dashboard');
    if (adminDashboard) adminDashboard.classList.add('hidden');
};

window.showSection = (sectionId) => {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) activeSection.classList.remove('hidden');
};

window.processPlanSave = async () => {
    const id = document.getElementById('plan-type-select').value;
    const name = id.replace('_', ' ').toUpperCase();
    let price = 0, duration = 30;

    if (id === 'one_year') { price = 4999; duration = 365; }
    else if (id === 'custom') {
        price = Number(prompt("Enter custom price (₹):", "1000") || 0);
        duration = Number(prompt("Enter custom scope duration (days):", "30") || 30);
    }

    await setDoc(doc(db, "plans", id), { name, price, duration });
    alert("Configuration Plan Synchronized.");
    window.loadPlans();
};

window.loadPlans = async () => {
    const container = document.getElementById('plans-list');
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "plans"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
        <div class="border border-white/10 p-5 bg-zinc-900/50 rounded-2xl mb-3 shadow-sm flex justify-between items-center">
            <div>
                <h3 class="text-base font-black italic tracking-wide text-brandBlue">${data.name}</h3>
                <p class="text-xs opacity-50 font-medium mt-1">Duration context: ${data.duration} Days</p>
            </div>
            <p class="text-lg font-black text-brandOrange">₹${data.price}</p>
        </div>`;
    });
};

window.addPayment = async () => {
    const instituteId = document.getElementById('payment-institute').value.trim();
    const amount = Number(document.getElementById('payment-amount').value);
    const paymentGateway = document.getElementById('payment-gateway').value.trim();
    const transactionId = document.getElementById('payment-transaction').value.trim();

    if (!instituteId || !amount || !transactionId) return alert("Fill required parameters.");

    await addDoc(collection(db, "payments"), {
        instituteId, amount, paymentGateway, transactionId,
        status: "success",
        createdAt: serverTimestamp()
    });

    alert("Payment Record Captured.");
    window.loadPayments();
};

window.loadPayments = async () => {
    const container = document.getElementById('payments-list');
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "payments"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
        <div class="border border-white/10 p-4 bg-zinc-900/50 rounded-2xl mb-3 flex justify-between items-center">
            <div>
                <p class="text-xs font-bold font-mono tracking-wider opacity-40 uppercase">TXN: ${data.transactionId || 'N/A'}</p>
                <p class="text-xs font-medium opacity-70 mt-1">Gateway: ${data.paymentGateway}</p>
            </div>
            <p class="text-base font-black text-green-500">₹${data.amount}</p>
        </div>`;
    });
};

window.addSubscription = async () => {
    const instituteId = document.getElementById('subscription-institute').value.trim();
    const planId = document.getElementById('subscription-plan').value.trim();
    const paymentId = document.getElementById('subscription-payment').value.trim();

    if (!instituteId || !planId) return alert("Fill required parameters.");

    let expiry = new Date();
    if (planId === "yearly") expiry.setDate(expiry.getDate() + 365);
    else if (planId === "free_trial") expiry.setDate(expiry.getDate() + 14);
    else expiry.setDate(expiry.getDate() + 30);

    await addDoc(collection(db, "subscriptions"), {
        instituteId, planId, paymentId,
        startDate: serverTimestamp(),
        expiryDate: expiry,
        status: "active"
    });

    alert("Subscription Synchronized.");
    window.loadSubscriptions();
};

window.loadSubscriptions = async () => {
    const container = document.getElementById('subscriptions-list');
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "subscriptions"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
        <div class="border border-white/10 p-4 bg-zinc-900/50 rounded-2xl mb-3">
            <div class="flex justify-between items-center">
                <p class="text-sm font-bold text-[var(--text-main)]">ID: ${data.instituteId}</p>
                <span class="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-black uppercase rounded border border-green-500/20">${data.status}</span>
            </div>
            <p class="text-xs font-bold text-brandOrange uppercase tracking-wider mt-2">Tier: ${data.planId}</p>
        </div>`;
    });
};
