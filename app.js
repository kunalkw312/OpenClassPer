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
        container.innerHTML = `<input id="admin-plan-days" type="number" placeholder="Duration (Days)" class="input-field">`;
    } else if (type === 'one_year') {
        container.innerHTML = `<input id="admin-plan-price" type="number" placeholder="Price (₹)" class="input-field">`;
    } else {
        container.innerHTML = `
            <input id="admin-plan-name" type="text" placeholder="Plan Name" class="input-field">
            <input id="admin-plan-days" type="number" placeholder="Duration (Days)" class="input-field">
            <input id="admin-plan-price" type="number" placeholder="Price (₹)" class="input-field">
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
    container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>Fetching plans matrix...</p>";

    try {
        const snap = await getDocs(collection(db, "plans"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>No active plans configured.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-main)] p-4 rounded-xl mb-3 flex justify-between items-center">
                <div>
                    <h3 class="text-sm font-black text-brandBlue uppercase tracking-widest">${data.name}</h3>
                    <p class="text-xs opacity-70 mt-1">Duration: ${data.duration} Days | Price: ₹${data.price}</p>
                </div>
                <span class="text-[9px] font-mono bg-[var(--border-color)] px-2 py-1 rounded border border-[var(--border-color)]">${docSnap.id}</span>
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

window.showInstituteSuccessModal = (name, logo, uniqueId) => {
    const modal = document.getElementById('custom-modal');
    const content = document.getElementById('modal-content');
    if (!modal || !content) {
        alert(`Institute Node Registered!\nUnique Access ID: ${uniqueId}`);
        return;
    }
    modal.classList.remove('hidden');
    content.innerHTML = `
        <div class="fade-in text-center p-6 md:p-10">
            <img src="${logo || 'https://ui-avatars.com/api/?name='+encodeURIComponent(name)}" class="w-24 h-24 mx-auto rounded-2xl object-cover border-[3px] border-purple-500 mb-6 shadow-xl bg-black">
            <h2 class="text-3xl font-black italic text-purple-400 mb-2">${name}</h2>
            <p class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 text-[var(--text-main)]">Institute Successfully Registered</p>
            
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-5 rounded-2xl flex items-center justify-between mb-8 shadow-inner">
                <div class="text-left">
                    <p class="text-[8px] uppercase tracking-widest text-purple-400 font-bold mb-1">Unique Access ID</p>
                    <span class="font-mono text-xl tracking-widest font-black text-[var(--text-main)]" id="new-inst-id">${uniqueId}</span>
                </div>
                <button onclick="navigator.clipboard.writeText('${uniqueId}'); this.innerText='COPIED!'; setTimeout(()=>this.innerText='COPY', 2000);" class="bg-purple-500/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 px-5 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-md">Copy</button>
            </div>
            
            <p class="text-[10px] opacity-40 mb-6 italic leading-relaxed text-[var(--text-main)]">Share this unique ID with students and teachers to allow them to join your private or public campus matrix.</p>
            <button onclick="document.getElementById('custom-modal').classList.add('hidden')" class="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-purple-700 hover:scale-[1.02] transition-all">Acknowledge & Close</button>
        </div>
    `;
};

window.processInstituteSave = async () => {
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;

    if (!name || !teacherId) return alert("Crucial fields (Name, Teacher ID) are missing.");

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

        if (typeof window.showInstituteSuccessModal === 'function') {
            window.showInstituteSuccessModal(name, logo, uniqueId);
        } else {
            alert(`Institute Node Registered!\nUnique Access ID: ${uniqueId}`);
        }
        
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        document.getElementById('inst-start').value = '';
        document.getElementById('inst-end').value = '';
        
        loadInstitutes();
    } catch (e) {
        console.error("Error registering institute:", e);
        alert("Failed to register the institute node.");
    }
};

window.updateInstitute = async () => {
    if(!window._editingInstId) return;
    const teacherId = document.getElementById('inst-teacher-id').value.trim();
    const name = document.getElementById('inst-name').value.trim();
    const logo = document.getElementById('inst-logo').value.trim();
    const privacy = document.getElementById('inst-privacy').value;
    const start = document.getElementById('inst-start').value;
    const end = document.getElementById('inst-end').value;

    try {
        await updateDoc(doc(db, "institutes", window._editingInstId), {
            teacherId, name, logo, privacyMode: privacy, planStart: start, planEnd: end
        });
        alert("Institute Updated Successfully!");
        
        document.getElementById('inst-teacher-id').value = '';
        document.getElementById('inst-name').value = '';
        document.getElementById('inst-logo').value = '';
        document.getElementById('inst-start').value = '';
        document.getElementById('inst-end').value = '';
        
        const instActionBtn = document.getElementById('inst-action-btn');
        if(instActionBtn) {
            instActionBtn.innerText = 'Generate & Register Node';
            instActionBtn.onclick = () => window.processInstituteSave();
        }
        
        window._editingInstId = null;
        loadInstitutes();
    } catch(e) { 
        console.error("Error updating institute:", e);
        alert("Failed to update institute."); 
    }
};

window.editInstitute = (id) => {
    if(!window.allInstitutes) return;
    const inst = window.allInstitutes.find(i => i.id === id);
    if(!inst) return;
    
    document.getElementById('inst-teacher-id').value = inst.teacherId || '';
    document.getElementById('inst-name').value = inst.name || '';
    document.getElementById('inst-logo').value = inst.logo || '';
    document.getElementById('inst-privacy').value = inst.privacyMode || 'public';
    document.getElementById('inst-start').value = inst.planStart || '';
    document.getElementById('inst-end').value = inst.planEnd || '';

    window._editingInstId = id;
    
    let instActionBtn = document.getElementById('inst-action-btn');
    if(!instActionBtn) {
        const btns = document.querySelectorAll('#institutes-section button');
        btns.forEach(b => {
            if(b.innerText.includes('Generate & Register Node') || b.innerText.includes('Update Institute Node')) {
                instActionBtn = b;
                instActionBtn.id = 'inst-action-btn'; 
            }
        });
    }
    
    if(instActionBtn) {
        instActionBtn.innerText = 'Update Institute Node';
        instActionBtn.onclick = () => window.updateInstitute();
    }
    
    const adminDashboard = document.getElementById('admin-dashboard');
    if(adminDashboard) adminDashboard.scrollTo({ top: 0, behavior: 'smooth' });
};

window.initiateInstituteDeletion = async (id, name) => {
    const adminEmail = auth.currentUser?.email;
    if(!adminEmail) return alert("Admin authenticated session required for OTP verification.");
    if(!confirm(`WARNING: Are you sure you want to permanently delete the institute: ${name}?`)) return;

    const otp = Math.floor(100000 + Math.random() * 900000);
    try {
        await sendOTP(adminEmail, otp);
        const userOtp = prompt(`Security Verification: OTP sent to ${adminEmail}.\nEnter 6-digit OTP to confirm deletion of ${name}:`);
        
        if(userOtp && userOtp == otp) {
            await deleteDoc(doc(db, "institutes", id));
            alert("Institute deleted permanently.");
            loadInstitutes();
        } else if (userOtp) {
            alert("Invalid OTP. Deletion cancelled.");
        }
    } catch(e) {
        console.error(e);
        alert("Failed to send verification OTP.");
    }
};

window.loadInstitutes = async () => {
    const container = document.getElementById('institutes-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-xs py-2 text-[var(--text-main)]'>Fetching institute directory...</p>";

    try {
        const snap = await getDocs(collection(db, "institutes"));
        window.allInstitutes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        window.renderInstitutesUI();
    } catch (e) {
        console.error("Error loading institutes:", e);
        container.innerHTML = "<p class='text-red-500 text-xs py-2'>Failed to load institutes.</p>";
    }
};

window.renderInstitutesUI = () => {
    const container = document.getElementById('institutes-list');
    if(!container) return;
    
    let search = document.getElementById('inst-search')?.value.toLowerCase() || '';
    let sort = document.getElementById('inst-sort')?.value || 'newest';

    let filtered = window.allInstitutes.filter(i =>
        (i.name && i.name.toLowerCase().includes(search)) ||
        (i.uniqueId && i.uniqueId.toLowerCase().includes(search)) ||
        (i.teacherId && i.teacherId.toLowerCase().includes(search))
    );

    if(sort === 'newest') filtered.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    else if(sort === 'oldest') filtered.sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    else if(sort === 'active') filtered.sort((a,b) => a.status === 'active' ? -1 : 1);
    else if(sort === 'private') filtered.sort((a,b) => a.privacyMode === 'private' ? -1 : 1);

    let controlsHTML = `
        <div class="flex flex-col md:flex-row gap-2 mb-4">
            <input type="text" id="inst-search" oninput="window.renderInstitutesUI()" value="${search}" placeholder="Search Name, ID, Owner ID..." class="input-field flex-1 text-xs">
            <select id="inst-sort" onchange="window.renderInstitutesUI()" class="input-field text-xs w-full md:w-1/3">
                <option value="newest" ${sort==='newest'?'selected':''}>Newest First</option>
                <option value="oldest" ${sort==='oldest'?'selected':''}>Oldest First</option>
                <option value="active" ${sort==='active'?'selected':''}>Active Status First</option>
                <option value="private" ${sort==='private'?'selected':''}>Private Networks</option>
            </select>
        </div>
        <div id="inst-render-target" class="space-y-3"></div>
    `;
    container.innerHTML = controlsHTML;

    const target = document.getElementById('inst-render-target');
    if(!filtered.length) { 
        target.innerHTML = "<p class='opacity-50 text-xs py-4 text-[var(--text-main)] text-center border border-dashed border-[var(--border-color)] rounded-xl'>No institutes match your criteria.</p>"; 
        return; 
    }

    target.innerHTML = filtered.map(data => `
        <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-[var(--text-main)]">
            <div class="flex items-center gap-4">
                <img src="${data.logo || 'https://ui-avatars.com/api/?name='+data.name}" class="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] bg-black">
                <div>
                    <h3 class="text-sm font-black text-purple-400 tracking-tight">${data.name}</h3>
                    <p class="text-[10px] opacity-80 mt-1 font-mono tracking-widest text-brandBlue">ID: ${data.uniqueId} <span class="opacity-50 text-[var(--text-main)]">|</span> Owner: ${data.teacherId}</p>
                    <p class="text-[9px] opacity-50 mt-1 uppercase tracking-widest flex gap-3">
                        <span>Mode: <b class="${data.privacyMode === 'private' ? 'text-red-400' : 'text-green-400'}">${data.privacyMode}</b></span>
                        <span>End: <b>${data.planEnd || 'No Expiry'}</b></span>
                    </p>
                </div>
            </div>
            <div class="flex md:flex-col gap-2 shrink-0">
                <button onclick="window.editInstitute('${data.id}')" class="flex-1 bg-blue-500/20 text-blue-500 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-blue-500/20 shadow-sm">Edit</button>
                <button onclick="window.initiateInstituteDeletion('${data.id}', '${data.name}')" class="flex-1 bg-red-500/20 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-red-500/20 shadow-sm">Delete</button>
            </div>
        </div>
    `).join('');
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
    container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>Scanning transaction ledger...</p>";

    try {
        const snap = await getDocs(query(collection(db, "payments"), orderBy("timestamp", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>No transactions found.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-4 rounded-xl mb-3 flex justify-between items-center text-[var(--text-main)]">
                <div>
                    <h3 class="text-sm font-black text-brandOrange">₹${data.amount}</h3>
                    <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">TXN: ${data.transactionId} | INST: ${data.instituteId}</p>
                </div>
                <span class="text-[9px] font-bold bg-green-500/20 text-green-500 px-2 py-1 rounded border border-green-500/20 uppercase tracking-widest">${data.status}</span>
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
            status: "active",
            autoRenew: true
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

window.toggleSubscriptionRenewal = async (id, newValue) => {
    try {
        await updateDoc(doc(db, "subscriptions", id), { autoRenew: newValue });
        loadSubscriptions();
    } catch(e) {
        console.error("Failed to toggle renewal", e);
        alert("Failed to toggle auto renewal status.");
    }
};

window.loadSubscriptions = async () => {
    const container = document.getElementById('subscriptions-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>Loading active allocations...</p>";

    try {
        const snap = await getDocs(query(collection(db, "subscriptions"), orderBy("startDate", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2'>No active subscriptions.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const isAutoRenew = data.autoRenew !== false; // Default to true if undefined
            
            const startStr = data.startDate ? new Date(data.startDate.seconds * 1000).toLocaleDateString() : 'N/A';
            const expStr = data.expiryDate ? new Date(data.expiryDate.seconds * 1000).toLocaleDateString() : 'N/A';
            
            container.innerHTML += `
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-5 rounded-2xl mb-3 flex flex-col gap-4 shadow-sm hover:border-green-500/30 transition-colors text-[var(--text-main)]">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-sm font-black text-green-500 uppercase tracking-widest">${data.planId}</h3>
                        <p class="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-mono">INST: ${data.instituteId}</p>
                    </div>
                    <span class="text-[9px] font-bold bg-green-500/20 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 uppercase tracking-widest">${data.status}</span>
                </div>
                <div class="flex flex-col md:flex-row justify-between items-start md:items-end border-t border-[var(--border-color)] pt-4 gap-4">
                    <div class="text-[10px] uppercase tracking-widest opacity-80 font-mono space-y-1.5 bg-[var(--bg-main)] p-3 rounded-lg w-full md:w-auto">
                        <p>Start Date: <span class="font-black">${startStr}</span></p>
                        <p>Expiry Date: <span class="font-black">${expStr}</span></p>
                        <p>Auto-Renewal: <span class="${isAutoRenew ? 'text-green-500 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-red-500'} font-black">${isAutoRenew ? 'ACTIVE' : 'DISABLED'}</span></p>
                    </div>
                    <button onclick="window.toggleSubscriptionRenewal('${docSnap.id}', ${!isAutoRenew})" class="${isAutoRenew ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-600' : 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-600'} hover:text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all w-full md:w-auto shadow-sm">
                        ${isAutoRenew ? 'Disable Auto-Renew' : 'Enable Auto-Renew'}
                    </button>
                </div>
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

window.updateInstRequestStatus = async (id, status) => {
    try {
        await updateDoc(doc(db, "instituteRequests", id), { status });
        window.loadAdminRequests();
    } catch(e) {
        console.error("Error updating request", e);
        alert("Failed to update registration request status.");
    }
};

window.loadAdminRequests = async () => {
    window.showSection('requests-section');
    const container = document.getElementById('admin-requests-list');
    if (!container) return;
    container.innerHTML = "<p class='opacity-50 text-[var(--text-main)] text-xs py-2 text-center'>Scanning queue...</p>";

    try {
        const snap = await getDocs(query(collection(db, "instituteRequests"), orderBy("createdAt", "desc")));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-10 rounded-2xl text-center shadow-inner">
                <p class="opacity-30 uppercase font-black tracking-widest text-xs text-[var(--text-main)]">No pending requests</p>
            </div>`;
            return;
        }
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            const submittedDate = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString() : 'Unknown Time';
            
            container.innerHTML += `
            <div class="bg-[var(--input-bg)] border border-[var(--border-color)] p-6 rounded-3xl flex flex-col gap-5 text-[var(--text-main)] shadow-lg hover:border-yellow-500/30 transition-all group">
                <div class="flex justify-between items-start border-b border-[var(--border-color)] pb-4">
                    <div>
                        <h4 class="font-black text-xl text-yellow-500 tracking-tight transition-colors">${d.name}</h4>
                        <p class="text-[9px] opacity-40 uppercase tracking-widest font-mono mt-1">Submitted: ${submittedDate}</p>
                    </div>
                    <span class="text-[9px] uppercase tracking-widest font-black ${d.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' : (d.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-red-500/20 text-red-500 border border-red-500/20')} px-3 py-1.5 rounded-lg shadow-sm">${d.status}</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]">
                    <div><span class="opacity-50 uppercase tracking-widest text-[9px] font-black block mb-1">Contact Email</span><p class="font-mono text-brandBlue">${d.email}</p></div>
                    <div><span class="opacity-50 uppercase tracking-widest text-[9px] font-black block mb-1">Contact Phone</span><p class="font-mono">${d.phone}</p></div>
                    <div><span class="opacity-50 uppercase tracking-widest text-[9px] font-black block mb-1">Total Teachers</span><p class="font-bold text-brandOrange">${d.teachers}</p></div>
                    <div><span class="opacity-50 uppercase tracking-widest text-[9px] font-black block mb-1">Total Students</span><p class="font-bold text-brandOrange">${d.students}</p></div>
                    <div class="md:col-span-2"><span class="opacity-50 uppercase tracking-widest text-[9px] font-black block mb-1">Physical Address</span><p class="opacity-90 leading-relaxed">${d.address}</p></div>
                </div>

                <div class="flex flex-col md:flex-row gap-3 mt-2">
                    ${d.status === 'pending' ? `
                        <button onclick="window.updateInstRequestStatus('${docSnap.id}', 'approved')" class="flex-1 bg-green-500/20 text-green-500 hover:bg-green-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all border border-green-500/30 shadow-md">Approve Request</button>
                        <button onclick="window.updateInstRequestStatus('${docSnap.id}', 'rejected')" class="flex-1 bg-red-500/20 text-red-500 hover:bg-red-600 hover:text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all border border-red-500/30 shadow-md">Reject Request</button>
                    ` : `
                        <div class="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl py-3 text-center">
                            <p class="text-[10px] uppercase font-black opacity-40 tracking-widest">Request Processed & Closed</p>
                        </div>
                    `}
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
    if (e.target && e.target.getAttribute('onclick') === "window.showSection('plans-section')") loadPlans();
    if (e.target && e.target.getAttribute('onclick') === "window.showSection('institutes-section')") loadInstitutes();
    if (e.target && e.target.getAttribute('onclick') === "window.showSection('payments-section')") loadPayments();
    if (e.target && e.target.getAttribute('onclick') === "window.showSection('subscriptions-section')") loadSubscriptions();
    if (e.target && e.target.getAttribute('onclick') === "window.loadAdminRequests()") window.loadAdminRequests();
});
