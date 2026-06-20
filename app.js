import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, emailConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence failed: Multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');
    if (path && typeof renderContent === 'function') {
        renderContent(path);
    }
});

export const provider = new GoogleAuthProvider();

// Initialize EmailJS safely
if(typeof emailjs !== 'undefined') {
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
    if(typeof emailjs === 'undefined') throw new Error("EmailJS SDK failed to load");
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}


// =========================================
// ADMIN PANEL LOGIC (Mapped to new UI)
// =========================================

// Admin - Close Dashboard
window.closeAdminDashboard = () => {
    const adminDashboard = document.getElementById('admin-dashboard');
    if(adminDashboard) adminDashboard.classList.add('hidden');
};

// Admin - Handle dynamic plan UI fields
window.handleAdminPlanUI = (type) => {
    const container = document.getElementById('plan-fields-container');
    if (!container) return;
    
    if(type === 'custom') {
        container.innerHTML = `
            <div class="fade-in space-y-4">
                <input id="plan-id" placeholder="Unique Plan ID (e.g. pro_monthly)" class="input-field text-sm">
                <input id="plan-name" placeholder="Plan Display Name" class="input-field text-sm">
                <input id="plan-price" type="number" placeholder="Price (₹)" class="input-field text-sm">
                <input id="plan-duration" type="number" placeholder="Duration (Days)" class="input-field text-sm">
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-[10px] opacity-50 uppercase tracking-widest font-bold fade-in text-center p-4">Standard plan selected. System will auto-configure parameters.</p>`;
    }
};

// Admin - Save Plan
window.processPlanSave = async () => {
    const type = document.getElementById('plan-type-select').value;
    let id, name, price, duration;

    if (type === 'custom') {
        id = document.getElementById('plan-id')?.value;
        name = document.getElementById('plan-name')?.value;
        price = Number(document.getElementById('plan-price')?.value || 0);
        duration = Number(document.getElementById('plan-duration')?.value || 0);
        if (!id || !name) return alert("Please fill all custom plan fields");
    } else if (type === 'free_trial') {
        id = 'free_trial'; name = 'Free Trial'; price = 0; duration = 14;
    } else if (type === 'one_year') {
        id = 'one_year'; name = 'One Year Plan'; price = 4999; duration = 365;
    }

    try {
        await setDoc(doc(db, "plans", id), { name, price, duration, updatedAt: serverTimestamp() });
        alert(`Plan "${name}" successfully saved!`);
        document.getElementById('plan-id') && (document.getElementById('plan-id').value = '');
        document.getElementById('plan-name') && (document.getElementById('plan-name').value = '');
        window.loadPlans();
    } catch(e) {
        alert("Error saving plan: " + e.message);
    }
};

// Admin - Load Plans
window.loadPlans = async () => {
    const container = document.getElementById('plans-list');
    if(!container) return;
    
    container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">Loading plans...</p>';
    try {
        const snap = await getDocs(collection(db, "plans"));
        if(snap.empty) {
            container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">No plans found.</p>';
            return;
        }
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            html += `
            <div class="glass p-4 rounded-2xl border border-[var(--border-color)] mb-3 flex justify-between items-center shadow-sm hover:border-brandBlue/30 transition-all fade-in">
                <div>
                    <h4 class="font-black text-sm text-brandBlue">${data.name}</h4>
                    <p class="text-[9px] opacity-50 uppercase tracking-widest mt-1 font-mono">ID: ${d.id} | ${data.duration} Days</p>
                </div>
                <div class="text-right shrink-0 bg-[var(--bg-main)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                    <p class="text-sm font-black text-brandOrange">${data.price === 0 ? 'FREE' : '₹'+data.price}</p>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Error loading plans.</p>';
    }
};

// Admin - Add Payment Log
window.addPayment = async () => {
    const instituteId = document.getElementById('payment-institute').value.trim();
    const amount = Number(document.getElementById('payment-amount').value);
    const paymentGateway = document.getElementById('payment-gateway').value.trim();
    const transactionId = document.getElementById('payment-transaction').value.trim();

    if(!instituteId || !amount) return alert("Institute ID and Amount are required");

    try {
        await addDoc(collection(db, "payments"), {
            instituteId,
            amount,
            paymentGateway: paymentGateway || 'Manual',
            transactionId: transactionId || 'TXN-'+Math.floor(Math.random()*999999),
            status: "success",
            date: serverTimestamp()
        });

        alert("Payment Logged Successfully");
        document.getElementById('payment-amount').value = '';
        document.getElementById('payment-transaction').value = '';
        window.loadPayments();
    } catch(e) {
        alert("Failed to log payment: " + e.message);
    }
};

// Admin - Load Payments
window.loadPayments = async () => {
    const container = document.getElementById('payments-list');
    if(!container) return;
    
    container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">Loading payments...</p>';
    try {
        const snap = await getDocs(query(collection(db, "payments"), orderBy("date", "desc"), limit(20)));
        if(snap.empty) {
            container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">No recent payments.</p>';
            return;
        }
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            html += `
            <div class="glass p-4 rounded-2xl border border-[var(--border-color)] mb-3 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm fade-in gap-3">
                <div class="truncate w-full">
                    <h4 class="font-black text-sm text-brandOrange truncate">${data.instituteId}</h4>
                    <p class="text-[9px] opacity-50 uppercase tracking-widest mt-1 truncate">Gate: ${data.paymentGateway} | TXN: ${data.transactionId}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span class="text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20">${data.status}</span>
                    <p class="text-base font-black text-[var(--text-main)]">₹${data.amount}</p>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Error loading payments.</p>';
    }
};

// Admin - Add Subscription Allocation
window.addSubscription = async () => {
    const instituteId = document.getElementById('subscription-institute').value.trim();
    const planId = document.getElementById('subscription-plan').value.trim();
    const paymentId = document.getElementById('subscription-payment').value.trim();

    if(!instituteId || !planId) return alert("Institute ID and Plan ID are required");

    let expiry = new Date();
    if (planId.includes("monthly")) expiry.setDate(expiry.getDate() + 30);
    else if (planId.includes("yearly")) expiry.setDate(expiry.getDate() + 365);
    else if (planId === "free_trial") expiry.setDate(expiry.getDate() + 14);
    else expiry.setDate(expiry.getDate() + 30); // default

    try {
        await addDoc(collection(db, "subscriptions"), {
            instituteId,
            planId,
            paymentId: paymentId || 'N/A',
            startDate: serverTimestamp(),
            expiryDate: expiry,
            status: "active"
        });

        alert("Subscription Allocated Successfully");
        window.loadSubscriptions();
    } catch(e) {
        alert("Failed to allocate subscription: " + e.message);
    }
};

// Admin - Load Subscriptions
window.loadSubscriptions = async () => {
    const container = document.getElementById('subscriptions-list');
    if(!container) return;
    
    container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">Loading subscriptions...</p>';
    try {
        const snap = await getDocs(query(collection(db, "subscriptions"), orderBy("startDate", "desc"), limit(20)));
        if(snap.empty) {
            container.innerHTML = '<p class="text-xs opacity-50 text-center py-4">No active subscriptions.</p>';
            return;
        }
        let html = '';
        snap.forEach(d => {
            const data = d.data();
            const expString = data.expiryDate && data.expiryDate.seconds ? new Date(data.expiryDate.seconds*1000).toLocaleDateString() : 'N/A';
            
            html += `
            <div class="glass p-4 rounded-2xl border border-[var(--border-color)] mb-3 flex flex-col shadow-sm fade-in gap-2 hover:border-green-500/30 transition-colors">
                <div class="flex justify-between items-center w-full">
                    <h4 class="font-black text-sm text-[var(--text-main)] truncate pr-2">${data.instituteId}</h4>
                    <span class="text-[9px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20 shrink-0">${data.status}</span>
                </div>
                <div class="flex justify-between items-center w-full mt-1">
                    <p class="text-[10px] font-black text-green-500 bg-green-500/5 px-2 py-1 rounded">PLAN: ${data.planId}</p>
                    <p class="text-[9px] opacity-50 uppercase tracking-widest">Expires: ${expString}</p>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) {
        container.innerHTML = '<p class="text-xs text-red-500 text-center py-4">Error loading subscriptions.</p>';
    }
};

// Initialize Admin Lists if section changes
const originalShowSection = window.showSection;
window.showSection = (sectionId) => {
    if(originalShowSection) originalShowSection(sectionId);
    
    // Lazy load the admin panels when their tabs are clicked
    if(sectionId === 'plans-section') window.loadPlans();
    if(sectionId === 'payments-section') window.loadPayments();
    if(sectionId === 'subscriptions-section') window.loadSubscriptions();
};
