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
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center hover:border-brandBlue/30 transition-colors">
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
// INSTITUTE MANAGEMENT (ADVANCED)
// =========================================

window._institutesData = [];
window._instSortBy = 'newest';
window._instSearchQ = '';

window.showInstituteSuccessPopup = (name, uniqueId) => {
    const popup = document.createElement('div');
    popup.id = "inst-success-popup";
    popup.className = "fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 fade-in";
    popup.innerHTML = `
        <div class="bg-zinc-950 border border-purple-500/30 p-8 md:p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl relative">
            <div class="w-20 h-20 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse">✓</div>
            <h3 class="text-2xl font-black italic text-white mb-2">${name} Provisioned</h3>
            <p class="text-xs opacity-60 mb-8 leading-relaxed">The institute node has been successfully verified. Secure the Unique Access ID below for member onboarding.</p>
            <div class="bg-black border border-white/10 p-4 rounded-2xl flex items-center justify-between mb-8 group hover:border-purple-500/50 transition-colors shadow-inner">
                <span class="font-mono text-purple-400 font-black tracking-widest text-xl drop-shadow-md">${uniqueId}</span>
                <button onclick="navigator.clipboard.writeText('${uniqueId}'); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy ID', 2000);" class="bg-white/10 hover:bg-purple-600 text-white px-3 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all group-hover:scale-105 shadow-sm">
                    Copy ID
                </button>
            </div>
            <button onclick="document.getElementById('inst-success-popup').remove()" class="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-colors">Close Window</button>
        </div>
    `;
    document.body.appendChild(popup);
};

window.processInstituteSave = async () => {
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;
    
    // Safety check if the element exists in HTML
    const autoRenewCheckbox = document.getElementById('inst-auto-renew');
    const autoRenew = autoRenewCheckbox ? autoRenewCheckbox.checked : false;

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
            autoRenew,
            status: 'active',
            createdAt: serverTimestamp()
        });

        window.showInstituteSuccessPopup(name, uniqueId);
        
        // Clear fields
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        document.getElementById('inst-start').value = '';
        document.getElementById('inst-end').value = '';
        if(autoRenewCheckbox) autoRenewCheckbox.checked = false;
        
        loadInstitutes();
    } catch (e) {
        console.error("Error registering institute:", e);
        alert("Failed to register the institute node.");
    }
};

window.processInstituteUpdate = async (id) => {
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;
    
    const autoRenewCheckbox = document.getElementById('inst-auto-renew');
    const autoRenew = autoRenewCheckbox ? autoRenewCheckbox.checked : false;

    if (!name || !teacherId) return alert("Crucial fields (Name, Teacher ID) are missing.");

    try {
        await updateDoc(doc(db, "institutes", id), {
            teacherId, name, logo, privacyMode: privacy, planStart: start, planEnd: end, autoRenew
        });
        
        alert("Institute Node Configuration Updated.");
        
        // Reset fields
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        document.getElementById('inst-start').value = '';
        document.getElementById('inst-end').value = '';
        if(autoRenewCheckbox) autoRenewCheckbox.checked = false;
        
        const btn = document.getElementById('inst-action-btn');
        if(btn) {
            btn.innerText = "Generate & Register Node";
            btn.onclick = window.processInstituteSave;
            btn.classList.replace('bg-blue-600', 'bg-purple-600');
            btn.classList.replace('hover:bg-blue-700', 'hover:bg-purple-700');
        }
        
        window.loadInstitutes();
    } catch(e) { 
        console.error(e); 
        alert("Failed to update matrix."); 
    }
};

window.editInstitute = async (id) => {
    const inst = window._institutesData.find(i => i.id === id);
    if(!inst) return;
    
    document.getElementById('inst-teacher-id').value = inst.teacherId || '';
    document.getElementById('inst-name').value = inst.name || '';
    document.getElementById('inst-logo').value = inst.logo || '';
    document.getElementById('inst-privacy').value = inst.privacyMode || 'public';
    document.getElementById('inst-start').value = inst.planStart || '';
    document.getElementById('inst-end').value = inst.planEnd || '';
    
    const ar = document.getElementById('inst-auto-renew');
    if(ar) ar.checked = inst.autoRenew || false;

    const btn = document.getElementById('inst-action-btn');
    if(btn) {
        btn.innerText = "Update Configuration Node";
        btn.onclick = () => window.processInstituteUpdate(id);
        btn.classList.replace('bg-purple-600', 'bg-blue-600');
        btn.classList.replace('hover:bg-purple-700', 'hover:bg-blue-700');
    }
    
    document.getElementById('admin-dashboard').querySelector('.overflow-y-auto').scrollTop = 0;
};

window.deleteInstitute = async (id) => {
    if(!confirm("Are you entirely sure you want to completely remove this institute node? This action is irreversible and purges all access links.")) return;
    try {
        await deleteDoc(doc(db, "institutes", id));
        window.loadInstitutes();
    } catch(e) { 
        console.error(e); 
        alert("System error removing institute."); 
    }
};

window.loadInstitutes = async () => {
    const container = document.getElementById('institutes-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2'>Fetching institute directory...</p>";

    try {
        const snap = await getDocs(collection(db, "institutes"));
        window._institutesData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.renderInstitutesList();
    } catch (e) {
        console.error("Error loading institutes:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to load institutes.</p>";
    }
};

window.renderInstitutesList = () => {
    const container = document.getElementById('institutes-list');
    if (!container) return;

    let filtered = window._institutesData;
    if(window._instSearchQ) {
        const q = window._instSearchQ.toLowerCase();
        filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.uniqueId.toLowerCase().includes(q));
    }

    if(window._instSortBy === 'newest') {
        filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
    } else if (window._instSortBy === 'oldest') {
        filtered.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
    } else if (window._instSortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    let html = `
        <div class="flex flex-col md:flex-row gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner">
            <input type="text" placeholder="Search by name or unique ID..." class="bg-zinc-900 border border-white/10 text-white text-xs p-3 rounded-xl flex-1 outline-none focus:border-purple-500 transition-colors shadow-sm" oninput="window._instSearchQ=this.value; window.renderInstitutesList()">
            <select class="bg-zinc-900 border border-white/10 text-white text-xs p-3 rounded-xl outline-none focus:border-purple-500 transition-colors shadow-sm cursor-pointer" onchange="window._instSortBy=this.value; window.renderInstitutesList()">
                <option value="newest">Sort by: Newest First</option>
                <option value="oldest">Sort by: Oldest First</option>
                <option value="name">Sort by: A-Z Name</option>
            </select>
        </div>
        <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar pb-10">
    `;

    if (filtered.length === 0) {
        html += `<div class="bg-zinc-900 border border-white/10 p-10 rounded-2xl text-center"><p class='opacity-30 uppercase font-black tracking-widest text-xs'>No institutes match parameters.</p></div>`;
    } else {
        filtered.forEach((data) => {
            const autoRenewBadge = data.autoRenew ? `<span class="bg-green-500/20 text-green-400 text-[8px] px-2 py-0.5 rounded font-bold border border-green-500/20 shadow-sm ml-2">AUTO-RENEW ON</span>` : `<span class="bg-red-500/20 text-red-400 text-[8px] px-2 py-0.5 rounded font-bold border border-red-500/20 shadow-sm ml-2">AUTO-RENEW OFF</span>`;

            html += `
            <div class="bg-zinc-900 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between hover:border-purple-500/30 transition-colors shadow-md gap-4 fade-in">
                <div class="flex items-center gap-4">
                    <img src="${data.logo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(data.name)}" class="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-sm bg-black">
                    <div>
                        <h3 class="text-base font-black text-purple-400">${data.name}</h3>
                        <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">ID: <span class="text-white bg-white/5 px-1 py-0.5 rounded">${data.uniqueId}</span> | MODE: ${data.privacyMode}</p>
                        <p class="text-[9px] opacity-50 mt-1 uppercase tracking-widest font-mono">Validity: ${data.planStart || 'N/A'} to ${data.planEnd || 'N/A'} ${autoRenewBadge}</p>
                    </div>
                </div>
                <div class="flex flex-col gap-2 md:items-end shrink-0">
                    <span class="text-[9px] font-bold text-green-400 uppercase bg-green-500/10 px-3 py-1 rounded border border-green-500/20 shadow-sm self-start md:self-auto">${data.status}</span>
                    <div class="flex gap-2 w-full md:w-auto">
                        <button onclick="window.editInstitute('${data.id}')" class="flex-1 md:flex-none text-[10px] text-blue-400 font-bold uppercase tracking-widest hover:text-white bg-blue-500/10 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all border border-blue-500/20 shadow-sm">Edit Node</button>
                        <button onclick="window.deleteInstitute('${data.id}')" class="flex-1 md:flex-none text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-white bg-red-500/10 hover:bg-red-600 px-4 py-2 rounded-xl transition-all border border-red-500/20 shadow-sm">Purge</button>
                    </div>
                </div>
            </div>`;
        });
    }
    html += `</div>`;
    container.innerHTML = html;
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
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center hover:border-brandOrange/30 transition-colors">
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
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center hover:border-green-500/30 transition-colors">
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

window.viewInstituteRequest = (dataString, id) => {
    const d = JSON.parse(decodeURIComponent(dataString));
    
    const popup = document.createElement('div');
    popup.id = "inst-request-modal";
    popup.className = "fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 fade-in";
    popup.innerHTML = `
        <div class="bg-zinc-950 border border-yellow-500/30 p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onclick="document.getElementById('inst-request-modal').remove()" class="absolute top-6 right-6 text-white/50 hover:text-white font-black text-xl hover:scale-110 transition-transform">✕</button>
            <h3 class="text-2xl font-black italic text-yellow-400 mb-2 border-b border-white/10 pb-6 flex items-center gap-3">
                <span class="bg-yellow-500/20 text-yellow-500 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner border border-yellow-500/30">?</span>
                Node Review
            </h3>
            
            <div class="space-y-5 mt-6 text-sm">
                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-1">Institute Name</p>
                    <p class="font-bold text-white text-xl">${d.name}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-1">Email Address</p>
                        <p class="font-bold text-white break-all">${d.email}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-1">Contact Phone</p>
                        <p class="font-bold text-white">${d.phone}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-1">Total Teachers</p>
                        <p class="font-bold text-white">${d.teachers || 'N/A'}</p>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-1">Total Students</p>
                        <p class="font-bold text-white">${d.students || 'N/A'}</p>
                    </div>
                </div>
                <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-2">Physical Address</p>
                    <p class="font-bold text-zinc-300 leading-relaxed">${d.address || 'Not Provided'}</p>
                </div>
                <div>
                    <p class="text-[10px] uppercase font-black tracking-widest opacity-50 text-yellow-500 mb-2 ml-2">Application Status</p>
                    <span class="inline-block text-[10px] uppercase tracking-widest font-black bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded-lg border border-yellow-500/20 shadow-sm ml-2">${d.status}</span>
                </div>
            </div>
            
            <div class="flex gap-3 mt-8 border-t border-white/10 pt-6">
                <button onclick="window.markInstituteRequest('${id}', 'approved')" class="flex-1 py-4 bg-green-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-green-400 transition-colors shadow-[0_5px_15px_rgba(34,197,94,0.3)] hover:scale-105">Approve Node</button>
                <button onclick="window.markInstituteRequest('${id}', 'rejected')" class="flex-1 py-4 bg-red-600/20 text-red-500 border border-red-500/30 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-colors shadow-sm hover:scale-105">Reject Request</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
};

window.markInstituteRequest = async (id, status) => {
    try {
        await updateDoc(doc(db, "instituteRequests", id), { status: status });
        alert(`Request definitively marked as ${status.toUpperCase()}.`);
        const modal = document.getElementById('inst-request-modal');
        if(modal) modal.remove();
        window.loadAdminRequests();
    } catch(e) {
        console.error(e);
        alert("Failed to update status payload.");
    }
};

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
            <div class="bg-zinc-900 border border-white/10 p-10 rounded-2xl text-center shadow-inner">
                <p class="opacity-30 uppercase font-black tracking-widest text-xs">No pending requests</p>
            </div>`;
            return;
        }
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            // Stringify payload securely to pass inside HTML onclick attribute
            const payload = encodeURIComponent(JSON.stringify(d));

            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 text-white shadow-md hover:border-yellow-500/30 transition-all hover:scale-[1.01] fade-in">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <h4 class="font-black text-lg text-yellow-400 tracking-tight">${d.name}</h4>
                        <span class="text-[8px] uppercase tracking-widest font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20 shadow-sm">${d.status}</span>
                    </div>
                    <p class="text-xs opacity-70 font-mono">${d.email} &nbsp;•&nbsp; ${d.phone}</p>
                    <p class="text-[10px] mt-2 opacity-50 uppercase tracking-widest font-bold flex gap-4">
                        <span>👥 Teachers: ${d.teachers}</span>
                        <span>🎓 Students: ${d.students}</span>
                    </p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="window.viewInstituteRequest('${payload}', '${docSnap.id}')" class="bg-yellow-500 text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_5px_15px_rgba(234,179,8,0.3)]">Review Node</button>
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
