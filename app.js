import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    increment, 
    deleteDoc, 
    arrayUnion, 
    arrayRemove, 
    serverTimestamp, 
    onSnapshot, 
    orderBy, 
    limit, 
    enableIndexedDbPersistence 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, emailConfig } from "./config.js";

// =========================================
// INITIALIZATION
// =========================================

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
    if (path) {
        // If the app was opened via 404 redirect, navigate to the correct page
        if (typeof renderContent === 'function') {
            renderContent(path);
        }
    }
});

export const provider = new GoogleAuthProvider();
emailjs.init(emailConfig.publicKey);

export { 
    doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, 
    increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, 
    signOut, signInWithPopup, updatePassword 
};

// =========================================
// UTILITY FUNCTIONS
// =========================================

export function getThumbnail(url) {
    try {
        let id = '';
        if(url.includes('v=')) id = url.split('v=')[1].split('&')[0];
        else if(url.includes('youtu.be/')) id = url.split('/').pop().split('?')[0];
        else if(url.includes('/shorts/')) id = url.split('/shorts/')[1].split('?')[0];
        else if(url.includes('/live/')) id = url.split('/live/')[1].split('?')[0];
        return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    } catch(e) { 
        return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg'; 
    }
}

export async function sendOTP(email, code) {
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}

// =========================================
// ADMIN PANEL CORE VARIABLES
// =========================================

const adminBtn = document.getElementById('admin-panel-btn');
const adminDashboard = document.getElementById('admin-dashboard');

// =========================================
// ADMIN UI CONTROLS
// =========================================

window.closeAdminDashboard = () => {
    if (adminDashboard) adminDashboard.classList.add('hidden');
};

window.showSection = (sectionId) => {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('fade-in');
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.remove('hidden');
        // Force reflow for animation
        void activeSection.offsetWidth;
        activeSection.classList.add('fade-in');
    }
};

// =========================================
// PLAN MANAGEMENT (DYNAMIC)
// =========================================

window.handleAdminPlanUI = (type) => {
    const container = document.getElementById('plan-fields-container');
    if (!container) return;
    
    if (type === 'free_trial') {
        container.innerHTML = `<input id="admin-plan-days" type="number" placeholder="Duration (Days)" class="input-field text-black dark:text-white">`;
    } else if (type === 'one_year') {
        container.innerHTML = `<input id="admin-plan-price" type="number" placeholder="Price (₹)" class="input-field text-black dark:text-white">`;
    } else {
        container.innerHTML = `
            <input id="admin-plan-name" type="text" placeholder="Plan Name" class="input-field text-black dark:text-white">
            <input id="admin-plan-days" type="number" placeholder="Duration (Days)" class="input-field text-black dark:text-white">
            <input id="admin-plan-price" type="number" placeholder="Price (₹)" class="input-field text-black dark:text-white">
        `;
    }
};

// Initialize default plan view on load
setTimeout(() => {
    if (document.getElementById('plan-type-select')) {
        window.handleAdminPlanUI('free_trial');
    }
}, 500);

window.processPlanSave = async () => {
    const type = document.getElementById('plan-type-select').value;
    let data = {};
    
    try {
        if (type === 'free_trial') {
            const days = Number(document.getElementById('admin-plan-days').value);
            if (!days) return alert("Please enter duration");
            data = { name: "Free Trial", duration: days, price: 0 };
            await setDoc(doc(db, "plans", "free_trial"), data);
        } else if (type === 'one_year') {
            const price = Number(document.getElementById('admin-plan-price').value);
            if (!price && price !== 0) return alert("Please enter a price");
            data = { name: "One Year Plan", duration: 365, price: price };
            await setDoc(doc(db, "plans", "yearly"), data);
        } else {
            const name = document.getElementById('admin-plan-name').value;
            const days = Number(document.getElementById('admin-plan-days').value);
            const price = Number(document.getElementById('admin-plan-price').value);
            
            if (!name || !days) return alert("Please enter name and duration");
            
            const id = "plan_" + Date.now();
            data = { name, duration: days, price };
            await setDoc(doc(db, "plans", id), data);
        }
        
        alert("Plan Configuration Saved Successfully");
        loadPlans();
    } catch (e) {
        console.error("Error saving plan:", e);
        alert("Failed to save plan.");
    }
};

window.loadPlans = async () => {
    const container = document.getElementById('plans-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2'>Fetching plans matrix...</p>";

    try {
        const snap = await getDocs(collection(db, "plans"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-xs py-2'>No active plans configured.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center">
                <div>
                    <h3 class="text-sm font-black text-brandBlue uppercase tracking-widest">${data.name}</h3>
                    <p class="text-xs opacity-70 mt-1">Duration: ${data.duration} Days | Price: ₹${data.price}</p>
                </div>
                <span class="text-[9px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10">${docSnap.id}</span>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading plans:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to load plans.</p>";
    }
};

// =========================================
// INSTITUTE MANAGEMENT
// =========================================

window.processInstituteSave = async () => {
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;

    if (!name || !teacherId) return alert("Crucial fields (Name, Teacher ID) are missing.");

    // Generate Unique Institute ID
    const uniqueId = "INST-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
        await addDoc(collection(db, "institutes"), {
            uniqueId, 
            teacherId, 
            name, 
            logo, 
            privacyMode: privacy,
            planStart: start, 
            planEnd: end, 
            status: 'active',
            createdAt: serverTimestamp()
        });

        alert(`Institute Node Registered!\nUnique Access ID: ${uniqueId}`);
        
        // Clear fields
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        
        loadInstitutes();
    } catch (e) {
        console.error("Error registering institute:", e);
        alert("Failed to register the institute node.");
    }
};

window.loadInstitutes = async () => {
    const container = document.getElementById('institutes-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2'>Fetching institute directory...</p>";

    try {
        const snap = await getDocs(collection(db, "institutes"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-xs py-2'>No institutes registered.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <img src="${data.logo || 'https://ui-avatars.com/api/?name='+data.name}" class="w-10 h-10 rounded-lg object-cover border border-white/20">
                    <div>
                        <h3 class="text-sm font-black text-purple-400">${data.name}</h3>
                        <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">ID: ${data.uniqueId} | MODE: ${data.privacyMode}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-bold text-green-400 uppercase">${data.status}</p>
                </div>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading institutes:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to load institutes.</p>";
    }
};

// =========================================
// PAYMENTS LEDGER
// =========================================

window.addPayment = async () => {
    const instituteId = document.getElementById('payment-institute').value.trim();
    const amount = Number(document.getElementById('payment-amount').value);
    const paymentGateway = document.getElementById('payment-gateway').value.trim();
    const transactionId = document.getElementById('payment-transaction').value.trim();

    if (!instituteId || !amount || !transactionId) return alert("Fill all necessary payment fields.");

    try {
        await addDoc(collection(db, "payments"), {
            instituteId,
            amount,
            paymentGateway,
            transactionId,
            status: "success",
            timestamp: serverTimestamp()
        });

        alert("Payment Logged Successfully");
        
        document.getElementById('payment-institute').value = '';
        document.getElementById('payment-amount').value = '';
        document.getElementById('payment-gateway').value = '';
        document.getElementById('payment-transaction').value = '';
        
        loadPayments();
    } catch (e) {
        console.error("Error logging payment:", e);
        alert("Failed to log payment transaction.");
    }
};

window.loadPayments = async () => {
    const container = document.getElementById('payments-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2'>Scanning transaction ledger...</p>";

    try {
        const snap = await getDocs(query(collection(db, "payments"), orderBy("timestamp", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-xs py-2'>No transactions found.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center">
                <div>
                    <h3 class="text-sm font-black text-brandOrange">₹${data.amount}</h3>
                    <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">TXN: ${data.transactionId} | INST: ${data.instituteId}</p>
                </div>
                <span class="text-[9px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20 uppercase tracking-widest">${data.status}</span>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading payments:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to fetch ledgers.</p>";
    }
};

// =========================================
// SUBSCRIPTIONS
// =========================================

window.addSubscription = async () => {
    const instituteId = document.getElementById('subscription-institute').value.trim();
    const planId = document.getElementById('subscription-plan').value.trim();
    const paymentId = document.getElementById('subscription-payment').value.trim();

    if (!instituteId || !planId) return alert("Institute ID and Plan ID are required.");

    let expiry = new Date();
    if (planId.toLowerCase().includes("month") || planId === "free_trial") {
        expiry.setDate(expiry.getDate() + 30);
    } else if (planId.toLowerCase().includes("year")) {
        expiry.setDate(expiry.getDate() + 365);
    } else {
        expiry.setDate(expiry.getDate() + 30); // Fallback
    }

    try {
        await addDoc(collection(db, "subscriptions"), {
            instituteId,
            planId,
            paymentId,
            startDate: serverTimestamp(),
            expiryDate: expiry,
            status: "active"
        });

        alert("Subscription Granted");
        
        document.getElementById('subscription-institute').value = '';
        document.getElementById('subscription-plan').value = '';
        document.getElementById('subscription-payment').value = '';
        
        loadSubscriptions();
    } catch (e) {
        console.error("Error granting subscription:", e);
        alert("Failed to allocate subscription.");
    }
};

window.loadSubscriptions = async () => {
    const container = document.getElementById('subscriptions-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2'>Loading active allocations...</p>";

    try {
        const snap = await getDocs(query(collection(db, "subscriptions"), orderBy("startDate", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-xs py-2'>No active subscriptions.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center">
                <div>
                    <h3 class="text-sm font-black text-green-400 uppercase tracking-widest">${data.planId}</h3>
                    <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">INST: ${data.instituteId}</p>
                </div>
                <span class="text-[9px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20 uppercase tracking-widest">${data.status}</span>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading subscriptions:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to fetch subscriptions.</p>";
    }
};

// =========================================
// ONBOARDING REQUESTS VIEWER
// =========================================

window.loadAdminRequests = async () => {
    window.showSection('requests-section');
    const container = document.getElementById('admin-requests-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2 text-center'>Scanning queue...</p>";

    try {
        const snap = await getDocs(query(collection(db, "instituteRequests"), orderBy("createdAt", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `
            <div class="bg-zinc-900 border border-white/10 p-10 rounded-2xl text-center">
                <p class="opacity-30 uppercase font-black tracking-widest text-xs">No pending requests</p>
            </div>`;
            return;
        }
        
        snap.forEach(doc => {
            const d = doc.data();
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 text-white shadow-sm hover:border-yellow-500/30 transition-all">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-black text-lg text-yellow-400 tracking-tight">${d.name}</h4>
                        <span class="text-[8px] uppercase tracking-widest font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">${d.status}</span>
                    </div>
                    <p class="text-xs opacity-70 font-mono">${d.email} &nbsp;•&nbsp; ${d.phone}</p>
                    <p class="text-[10px] mt-2 opacity-50 uppercase tracking-widest font-bold flex gap-4">
                        <span>👥 Teachers: ${d.teachers}</span>
                        <span>🎓 Students: ${d.students}</span>
                    </p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button class="bg-yellow-500 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-md">Review Node</button>
                </div>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading requests:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2 text-center'>Failed to fetch onboarding queue.</p>";
    }
};

// Global handlers to ensure admin data loads when switching sections
document.addEventListener('click', (e) => {
    if (e.target && e.target.getAttribute('onclick') === "showSection('plans-section')") loadPlans();
    if (e.target && e.target.getAttribute('onclick') === "showSection('institutes-section')") loadInstitutes();
    if (e.target && e.target.getAttribute('onclick') === "showSection('payments-section')") loadPayments();
    if (e.target && e.target.getAttribute('onclick') === "showSection('subscriptions-section')") loadSubscriptions();
});
