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
// INITIALIZATION & PERSISTENCE
// =========================================

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for faster loads
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence failed: Multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');
    if (path) {
        if (typeof window.renderContent === 'function') {
            window.renderContent(path);
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
// GLOBAL UTILITY FUNCTIONS
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

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        if(window.toast) window.toast("Copied to clipboard!", "success");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

window.showIdPopup = (title, uniqueId) => {
    const modal = document.getElementById('custom-modal');
    const content = document.getElementById('modal-content');
    if(!modal || !content) return alert(`${title}\nID: ${uniqueId}`);
    
    modal.classList.remove('hidden');
    content.innerHTML = `
        <div class="text-center fade-in space-y-6">
            <div class="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto text-4xl mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">✓</div>
            <h3 class="text-3xl font-black italic tracking-tight text-white">${title}</h3>
            <p class="text-xs opacity-60 uppercase tracking-widest font-bold">Secure Access Node Generated</p>
            
            <div class="bg-zinc-950 border border-white/10 p-6 rounded-3xl mt-6 relative group flex flex-col items-center justify-center gap-4">
                <p class="text-3xl font-mono text-brandOrange tracking-widest font-black select-all" id="generated-id-text">${uniqueId}</p>
                <button onclick="copyToClipboard('${uniqueId}')" class="bg-brandOrange/10 text-brandOrange hover:bg-brandOrange hover:text-white border border-brandOrange/30 transition-all px-6 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-2 shadow-sm">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Copy to Clipboard
                </button>
            </div>
            
            <button onclick="closeCustomModal()" class="w-full py-4 mt-4 bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--border-color)] rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-md">Acknowledge</button>
        </div>
    `;
};


// =========================================
// ADMIN UI CONTROLS
// =========================================

window.closeAdminDashboard = () => {
    const adminDashboard = document.getElementById('admin-dashboard');
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
        void activeSection.offsetWidth; // Trigger reflow
        activeSection.classList.add('fade-in');
    }
};

// =========================================
// PLAN MANAGEMENT
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

// Initialize default plan view
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
            if (!days) return window.toast("Please enter duration", "error");
            data = { name: "Free Trial", duration: days, price: 0 };
            await setDoc(doc(db, "plans", "free_trial"), data);
        } else if (type === 'one_year') {
            const price = Number(document.getElementById('admin-plan-price').value);
            if (!price && price !== 0) return window.toast("Please enter a price", "error");
            data = { name: "One Year Plan", duration: 365, price: price };
            await setDoc(doc(db, "plans", "yearly"), data);
        } else {
            const name = document.getElementById('admin-plan-name').value;
            const days = Number(document.getElementById('admin-plan-days').value);
            const price = Number(document.getElementById('admin-plan-price').value);
            
            if (!name || !days) return window.toast("Please enter name and duration", "error");
            
            const id = "plan_" + Date.now();
            data = { name, duration: days, price };
            await setDoc(doc(db, "plans", id), data);
        }
        
        if(window.toast) window.toast("Plan Configuration Saved", "success");
        window.loadPlans();
    } catch (e) {
        console.error("Error saving plan:", e);
        if(window.toast) window.toast("Failed to save plan.", "error");
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
                    <p class="text-xs opacity-70 mt-1 font-mono">Duration: ${data.duration} Days | Price: ₹${data.price}</p>
                </div>
                <span class="text-[9px] font-mono bg-white/5 text-zinc-400 px-2 py-1 rounded border border-white/10">${docSnap.id}</span>
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

let cachedInstitutes = [];

window.processInstituteSave = async () => {
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;
    const autoRenewal = document.getElementById('inst-auto-renew') ? document.getElementById('inst-auto-renew').checked : false;

    if (!name || !teacherId) return window.toast("Name and Teacher ID required.", "error");

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
            autoRenewal,
            status: 'active',
            createdAt: serverTimestamp()
        });

        window.showIdPopup("Institute Registered Successfully!", uniqueId);
        
        // Clear fields
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        
        window.loadInstitutes();
    } catch (e) {
        console.error("Error registering institute:", e);
        if(window.toast) window.toast("Failed to register node.", "error");
    }
};

window.loadInstitutes = async () => {
    const container = document.getElementById('institutes-list');
    if (!container) return;
    
    // Inject search and sort controls if not present
    if (!document.getElementById('inst-search-bar')) {
        const controlsHTML = `
            <div class="flex gap-2 mb-4">
                <input type="text" id="inst-search-bar" onkeyup="filterInstitutes()" placeholder="Search Name or ID..." class="input-field text-xs p-3 flex-1 bg-zinc-900">
                <select id="inst-sort-select" onchange="filterInstitutes()" class="input-field text-xs p-3 w-32 bg-zinc-900">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name (A-Z)</option>
                </select>
            </div>
            <div id="institutes-render-target" class="space-y-3"></div>
        `;
        container.innerHTML = controlsHTML;
    }

    const target = document.getElementById('institutes-render-target');
    target.innerHTML = "<p class='opacity-50 text-xs py-4 text-center animate-pulse'>Fetching institute directory...</p>";

    try {
        const snap = await getDocs(collection(db, "institutes"));
        cachedInstitutes = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        window.filterInstitutes(); // Render via filter to respect current sort
    } catch (e) {
        console.error("Error loading institutes:", e);
        target.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to load institutes.</p>";
    }
};

window.filterInstitutes = () => {
    const query = (document.getElementById('inst-search-bar')?.value || '').toLowerCase();
    const sortVal = document.getElementById('inst-sort-select')?.value || 'newest';
    const target = document.getElementById('institutes-render-target');
    
    if(!target) return;

    let filtered = cachedInstitutes.filter(inst => 
        (inst.name && inst.name.toLowerCase().includes(query)) || 
        (inst.uniqueId && inst.uniqueId.toLowerCase().includes(query)) ||
        (inst.teacherId && inst.teacherId.toLowerCase().includes(query))
    );

    if (sortVal === 'newest') {
        filtered.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    } else if (sortVal === 'name') {
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    if (filtered.length === 0) {
        target.innerHTML = "<p class='opacity-50 text-xs py-4 text-center'>No matching institutes found.</p>";
        return;
    }

    target.innerHTML = filtered.map(data => `
        <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-purple-500/30 transition-all shadow-sm">
            <div class="flex items-center gap-4 w-full md:w-auto">
                <img src="${data.logo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(data.name)+'&background=a855f7&color=fff'}" class="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0 shadow-sm bg-black">
                <div class="overflow-hidden">
                    <h3 class="text-sm font-black text-purple-400 truncate">${data.name}</h3>
                    <p class="text-[9px] opacity-70 mt-1 uppercase tracking-widest font-mono">
                        <span class="text-white font-bold">${data.uniqueId}</span> | 
                        OWNER: ${data.teacherId}
                    </p>
                    <div class="flex gap-2 mt-1.5">
                        <span class="text-[8px] px-2 py-0.5 rounded-md ${data.privacyMode === 'private' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'} uppercase font-black tracking-widest border border-white/5">${data.privacyMode}</span>
                        ${data.autoRenewal ? `<span class="text-[8px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 uppercase font-black tracking-widest border border-white/5">Auto-Renew</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                <button onclick="openEditInstituteModal('${data.docId}')" class="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Edit</button>
            </div>
        </div>
    `).join('');
};

window.openEditInstituteModal = (docId) => {
    const inst = cachedInstitutes.find(i => i.docId === docId);
    if(!inst) return;

    const modal = document.getElementById('custom-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="fade-in space-y-4">
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-2xl font-black italic text-purple-400">Edit Institute</h3>
                <button onclick="closeCustomModal()" class="text-white/50 hover:text-white font-bold">✕</button>
            </div>
            <p class="text-[10px] opacity-50 font-mono mb-4">Editing Node: ${inst.uniqueId}</p>
            
            <div class="space-y-3">
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-50 ml-2">Institute Name</label>
                    <input id="edit-inst-name" type="text" value="${inst.name}" class="input-field text-sm p-3 bg-zinc-900 mt-1">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-50 ml-2">Logo URL</label>
                    <input id="edit-inst-logo" type="text" value="${inst.logo || ''}" class="input-field text-sm p-3 bg-zinc-900 mt-1">
                </div>
                <div>
                    <label class="text-[9px] uppercase font-bold opacity-50 ml-2">Privacy Mode</label>
                    <select id="edit-inst-privacy" class="input-field text-sm p-3 bg-zinc-900 mt-1">
                        <option value="public" ${inst.privacyMode==='public'?'selected':''}>Public Content</option>
                        <option value="private" ${inst.privacyMode==='private'?'selected':''}>Private (Gated)</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[9px] uppercase font-bold opacity-50 ml-2">Plan Start</label>
                        <input id="edit-inst-start" type="date" value="${inst.planStart || ''}" class="input-field text-sm p-3 bg-zinc-900 mt-1">
                    </div>
                    <div>
                        <label class="text-[9px] uppercase font-bold opacity-50 ml-2">Plan End</label>
                        <input id="edit-inst-end" type="date" value="${inst.planEnd || ''}" class="input-field text-sm p-3 bg-zinc-900 mt-1">
                    </div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-zinc-900 border border-white/10 rounded-xl mt-2">
                    <input type="checkbox" id="edit-inst-renew" ${inst.autoRenewal?'checked':''} class="w-4 h-4 accent-purple-500">
                    <label for="edit-inst-renew" class="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none">Enable Auto-Renewal</label>
                </div>
            </div>
            
            <button onclick="saveInstituteEdit('${docId}')" class="w-full py-4 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-purple-700 hover:scale-[1.02] transition-all mt-6">Update Parameters</button>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.saveInstituteEdit = async (docId) => {
    const name = document.getElementById('edit-inst-name').value.trim();
    const logo = document.getElementById('edit-inst-logo').value.trim();
    const privacyMode = document.getElementById('edit-inst-privacy').value;
    const planStart = document.getElementById('edit-inst-start').value;
    const planEnd = document.getElementById('edit-inst-end').value;
    const autoRenewal = document.getElementById('edit-inst-renew').checked;

    if (!name) return window.toast("Name cannot be empty", "error");

    try {
        await updateDoc(doc(db, "institutes", docId), {
            name, logo, privacyMode, planStart, planEnd, autoRenewal
        });
        
        if(window.toast) window.toast("Institute updated successfully", "success");
        window.closeCustomModal();
        window.loadInstitutes(); // Refresh data
    } catch (e) {
        console.error("Update error:", e);
        if(window.toast) window.toast("Failed to update record.", "error");
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

    if (!instituteId || !amount || !transactionId) return window.toast("Fill all necessary payment fields.", "error");

    try {
        await addDoc(collection(db, "payments"), {
            instituteId,
            amount,
            paymentGateway,
            transactionId,
            status: "success",
            timestamp: serverTimestamp()
        });

        if(window.toast) window.toast("Payment Logged Successfully", "success");
        
        document.getElementById('payment-institute').value = '';
        document.getElementById('payment-amount').value = '';
        document.getElementById('payment-gateway').value = '';
        document.getElementById('payment-transaction').value = '';
        
        window.loadPayments();
    } catch (e) {
        console.error("Error logging payment:", e);
        if(window.toast) window.toast("Failed to log payment transaction.", "error");
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
                    <p class="text-[9px] opacity-70 mt-1 uppercase tracking-widest font-mono">TXN: ${data.transactionId} <br> INST: ${data.instituteId}</p>
                </div>
                <div class="text-right">
                    <span class="text-[8px] font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/20 uppercase tracking-widest shadow-sm">${data.status}</span>
                    <p class="text-[8px] opacity-40 uppercase tracking-widest mt-2">${data.paymentGateway}</p>
                </div>
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

    if (!instituteId || !planId) return window.toast("Institute ID and Plan ID are required.", "error");

    let expiry = new Date();
    if (planId.toLowerCase().includes("month") || planId === "free_trial") {
        expiry.setDate(expiry.getDate() + 30);
    } else if (planId.toLowerCase().includes("year") || planId === "yearly") {
        expiry.setDate(expiry.getDate() + 365);
    } else {
        expiry.setDate(expiry.getDate() + 30); 
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

        if(window.toast) window.toast("Subscription Granted Successfully", "success");
        
        document.getElementById('subscription-institute').value = '';
        document.getElementById('subscription-plan').value = '';
        document.getElementById('subscription-payment').value = '';
        
        window.loadSubscriptions();
    } catch (e) {
        console.error("Error granting subscription:", e);
        if(window.toast) window.toast("Failed to allocate subscription.", "error");
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
            const startStr = data.startDate ? new Date(data.startDate.seconds * 1000).toLocaleDateString() : 'N/A';
            
            container.innerHTML += `
            <div class="bg-zinc-900 border border-white/10 p-4 rounded-xl mb-3 flex justify-between items-center hover:border-green-500/30 transition-colors">
                <div>
                    <h3 class="text-sm font-black text-green-400 uppercase tracking-widest">${data.planId}</h3>
                    <p class="text-[9px] opacity-70 mt-1 uppercase tracking-widest font-mono">INST: ${data.instituteId}</p>
                    <p class="text-[8px] opacity-40 font-mono mt-1 border-t border-white/10 pt-1">Started: ${startStr}</p>
                </div>
                <span class="text-[9px] font-bold bg-green-500/20 text-green-400 px-3 py-1 rounded-lg border border-green-500/20 uppercase tracking-widest shadow-sm">${data.status}</span>
            </div>`;
        });
    } catch (e) {
        console.error("Error loading subscriptions:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to fetch subscriptions.</p>";
    }
};

// =========================================
// ONBOARDING REQUESTS VIEWER (ADVANCED)
// =========================================

window.loadAdminRequests = async () => {
    window.showSection('requests-section');
    const container = document.getElementById('admin-requests-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2 text-center animate-pulse'>Scanning queue...</p>";

    try {
        const snap = await getDocs(query(collection(db, "instituteRequests"), orderBy("createdAt", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `
            <div class="bg-zinc-900 border border-white/10 p-10 rounded-2xl text-center shadow-inner">
                <p class="opacity-30 uppercase font-black tracking-widest text-xs">No pending requests in queue</p>
            </div>`;
            return;
        }
        
        let html = '';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const docId = docSnap.id;
            html += `
            <div class="bg-zinc-900 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 text-white shadow-sm hover:border-yellow-500/40 transition-all hover:scale-[1.01]">
                <div class="w-full">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="font-black text-lg text-yellow-400 tracking-tight truncate max-w-[250px]">${d.name}</h4>
                        <span class="text-[8px] uppercase tracking-widest font-black bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-md border border-yellow-500/20 shadow-sm">${d.status}</span>
                    </div>
                    <div class="flex items-center gap-3 text-[10px] opacity-70 font-mono mb-3 bg-black/20 p-2 rounded-lg w-fit border border-white/5">
                        <span class="truncate max-w-[150px]">✉️ ${d.email}</span>
                        <span class="opacity-30">|</span>
                        <span>📞 ${d.phone}</span>
                    </div>
                    <div class="flex gap-4 text-[9px] uppercase tracking-widest font-black text-zinc-400">
                        <span class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-brandBlue"></div> Teachers: ${d.teachers}</span>
                        <span class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Students: ${d.students}</span>
                    </div>
                </div>
                <div class="flex gap-2 shrink-0 mt-2 md:mt-0 w-full md:w-auto">
                    <button onclick="reviewInstituteRequest('${docId}', 'approve')" class="flex-1 md:flex-none bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/20 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Approve</button>
                    <button onclick="reviewInstituteRequest('${docId}', 'deny')" class="flex-1 md:flex-none bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">Deny</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        console.error("Error loading requests:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2 text-center'>Failed to fetch onboarding queue.</p>";
    }
};

window.reviewInstituteRequest = async (docId, action) => {
    try {
        const reqDocRef = doc(db, "instituteRequests", docId);
        const reqSnap = await getDoc(reqDocRef);
        
        if (!reqSnap.exists()) {
            if(window.toast) window.toast("Request no longer exists.", "error");
            return;
        }

        const data = reqSnap.data();

        if (action === 'approve') {
            // Move data to institutes and auto-generate ID
            const uniqueId = "INST-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            await addDoc(collection(db, "institutes"), {
                uniqueId,
                name: data.name,
                teacherId: "PENDING-OWNER", // Usually they are an external request, so manual assignment might be needed later
                contactEmail: data.email,
                contactPhone: data.phone,
                privacyMode: 'public', // default
                status: 'active',
                createdAt: serverTimestamp(),
                approvedFromRequest: true
            });

            // Delete request
            await deleteDoc(reqDocRef);
            
            window.showIdPopup(`Institute Approved: ${data.name}`, uniqueId);
            window.loadAdminRequests();
            
        } else if (action === 'deny') {
            if(!confirm("Are you sure you want to permanently deny and delete this request?")) return;
            await deleteDoc(reqDocRef);
            if(window.toast) window.toast("Request denied and removed.", "success");
            window.loadAdminRequests();
        }

    } catch(e) {
        console.error("Error processing request:", e);
        if(window.toast) window.toast("Action failed due to network error.", "error");
    }
};


// =========================================
// GLOBAL NAVIGATION LISTENERS
// =========================================

// Global handlers to ensure admin data loads appropriately when switching sections via clicks
document.addEventListener('click', (e) => {
    if (e.target && e.target.getAttribute('onclick')) {
        const action = e.target.getAttribute('onclick');
        if (action.includes("showSection('plans-section')")) window.loadPlans();
        if (action.includes("showSection('institutes-section')")) window.loadInstitutes();
        if (action.includes("showSection('payments-section')")) window.loadPayments();
        if (action.includes("showSection('subscriptions-section')")) window.loadSubscriptions();
    }
});
