import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    updatePassword,
    sendPasswordResetEmail
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

// ─── INIT ───
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence: multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

export const provider = new GoogleAuthProvider();
emailjs.init(emailConfig.publicKey);

// ─── EXPORT FIREBASE FUNCTIONS ───
export {
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
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    signInWithPopup,
    updatePassword,
    sendPasswordResetEmail
};

// ─── HELPERS ───
export function getThumbnail(url) {
    try {
        let id = '';
        if (url.includes('v=')) id = url.split('v=')[1].split('&')[0];
        else if (url.includes('youtu.be/')) id = url.split('/').pop().split('?')[0];
        else if (url.includes('/shorts/')) id = url.split('/shorts/')[1].split('?')[0];
        else if (url.includes('/live/')) id = url.split('/live/')[1].split('?')[0];
        return id
            ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
            : 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    } catch (e) {
        return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    }
}

export async function sendOTP(email, code) {
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}

// ─── ADMIN PANEL ───

// =========================================
// PLANS
// =========================================

async function loadPlans() {
    const container = document.getElementById("plans-list");
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "plans"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="border p-4 rounded-xl mb-3">
                <h3 class="text-xl font-black">${data.name}</h3>
                <p>${data.years || 0} Years ${data.months || 0} Months ${data.days || 0} Days</p>
            </div>
        `;
    });
}

export async function processPlanSave() {
    const planName = document.getElementById("custom-plan-name").value;
    const years = parseInt(document.getElementById("custom-plan-years").value) || 0;
    const months = parseInt(document.getElementById("custom-plan-months").value) || 0;
    const days = parseInt(document.getElementById("custom-plan-days").value) || 0;
    if (!planName || (years === 0 && months === 0 && days === 0)) {
        alert("Enter Plan Name and Duration");
        return;
    }
    await addDoc(collection(db, "plans"), {
        name: planName,
        years,
        months,
        days,
        createdAt: Date.now()
    });
    alert("Plan Saved");
    loadInstitutePlans();
    loadPlansList();
}

export async function loadInstitutePlans() {
    const planDropdown = document.getElementById("plan-type");
    if (!planDropdown) return;
    planDropdown.innerHTML = `
        <option value="free_trial">Free Trial (15 Days)</option>
        <option value="one_year">One Year Plan</option>
    `;
    const snap = await getDocs(collection(db, "plans"));
    snap.forEach((docSnap) => {
        const plan = docSnap.data();
        planDropdown.innerHTML += `
            <option value="${docSnap.id}">
                ${plan.name} (${plan.years || 0}Y ${plan.months || 0}M ${plan.days || 0}D)
            </option>
        `;
    });
}

export async function updatePlanDates() {
    const planType = document.getElementById("plan-type");
    const startDateInput = document.getElementById("inst-start");
    const endDateInput = document.getElementById("inst-end");
    if (!planType || !startDateInput || !endDateInput) return;
    const today = new Date();
    if (!startDateInput.value) {
        startDateInput.value = today.toISOString().split("T")[0];
    }
    const start = new Date(startDateInput.value);
    let end = new Date(start);
    if (planType.value === "free_trial") {
        end.setDate(end.getDate() + 15);
    } else if (planType.value === "one_year") {
        end.setFullYear(end.getFullYear() + 1);
    } else {
        const planRef = doc(db, "plans", planType.value);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
            const plan = planSnap.data();
            end.setFullYear(end.getFullYear() + (plan.years || 0));
            end.setMonth(end.getMonth() + (plan.months || 0));
            end.setDate(end.getDate() + (plan.days || 0));
        }
    }
    endDateInput.value = end.toISOString().split("T")[0];
}

// =========================================
// INSTITUTES
// =========================================

export async function addInstitute() {
    try {
        const name = document.getElementById("inst-name").value.trim();
        const logo = document.getElementById("inst-logo").value.trim();
        const ownerId = document.getElementById("inst-teacher-id").value.trim();
        const currentPlan = document.getElementById("plan-type").value;
        const startDate = document.getElementById("inst-start").value;
        const endDate = document.getElementById("inst-end").value;
        if (!name) { alert("Institute Name Required"); return; }
        if (!currentPlan) { alert("Select Plan"); return; }
        let planName = "", years = 0, months = 0, days = 0;
        if (currentPlan === "free_trial") { planName = "Free Trial"; days = 15; }
        else if (currentPlan === "one_year") { planName = "One Year Plan"; years = 1; }
        else {
            const planRef = doc(db, "plans", currentPlan);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const plan = planSnap.data();
                planName = plan.name || "";
                years = plan.years || 0;
                months = plan.months || 0;
                days = plan.days || 0;
            }
        }
        await addDoc(collection(db, "institutes"), {
            name, logo, ownerId, currentPlan, planName,
            years, months, days, startDate, endDate,
            subscriptionStatus: "active",
            createdAt: serverTimestamp()
        });
        alert("Institute Added Successfully");
        document.getElementById("inst-name").value = "";
        document.getElementById("inst-logo").value = "";
        document.getElementById("inst-teacher-id").value = "";
        loadInstitutes();
    } catch (error) {
        console.error(error);
    }
}

export async function loadInstitutes() {
    const container = document.getElementById("institutes-list");
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "institutes"));
    snap.forEach(async (docSnap) => {
        const data = docSnap.data();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(data.endDate);
        endDate.setHours(0, 0, 0, 0);
        const status = today > endDate ? "Expired" : "Active";
        if (today > endDate && data.subscriptionStatus !== "expired") {
            await updateDoc(doc(db, "institutes", docSnap.id), { subscriptionStatus: "expired" });
        }
        container.innerHTML += `
            <div class="border p-4 rounded-xl mb-3">
                <h3 class="text-xl font-black">${data.name || ""}</h3>
                <p>Plan: ${data.planName || data.currentPlan || "-"}</p>
                <p>Duration: ${data.years || 0}Y ${data.months || 0}M ${data.days || 0}D</p>
                <p>Start Date: ${data.startDate || "-"}</p>
                <p>Expiry Date: ${data.endDate || "-"}</p>
                <p>Status: ${status}</p>
            </div>
        `;
    });
}

// =========================================
// PAYMENTS
// =========================================

export async function addPayment() {
    const instituteId = document.getElementById('payment-institute').value;
    const amount = Number(document.getElementById('payment-amount').value);
    const paymentGateway = document.getElementById('payment-gateway').value;
    const transactionId = document.getElementById('payment-transaction').value;
    await addDoc(collection(db, "payments"), {
        instituteId,
        amount,
        paymentGateway,
        transactionId,
        status: "success"
    });
    alert("Payment Added");
    loadPayments();
}

export async function loadPayments() {
    const container = document.getElementById('payments-list');
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "payments"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="border p-4 rounded-xl mb-3">
                <p>Amount: ₹${data.amount}</p>
                <p>Status: ${data.status}</p>
                <p>Gateway: ${data.paymentGateway}</p>
            </div>
        `;
    });
}

// =========================================
// SUBSCRIPTIONS
// =========================================

export async function addSubscription() {
    const instituteId = document.getElementById('subscription-institute').value;
    const planId = document.getElementById('subscription-plan').value;
    const paymentId = document.getElementById('subscription-payment').value;
    let expiry = new Date();
    if (planId === "monthly") expiry.setDate(expiry.getDate() + 30);
    if (planId === "yearly") expiry.setDate(expiry.getDate() + 365);
    if (planId === "free_trial") expiry.setDate(expiry.getDate() + 30);
    await addDoc(collection(db, "subscriptions"), {
        instituteId,
        planId,
        paymentId,
        startDate: serverTimestamp(),
        expiryDate: expiry,
        status: "active"
    });
    alert("Subscription Added");
    loadSubscriptions();
}

export async function loadSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    if (!container) return;
    container.innerHTML = "";
    const snap = await getDocs(collection(db, "subscriptions"));
    snap.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
            <div class="border p-4 rounded-xl mb-3">
                <p>Institute: ${data.instituteId}</p>
                <p>Plan: ${data.planId}</p>
                <p>Status: ${data.status}</p>
            </div>
        `;
    });
}

// =========================================
// ADDITIONAL FUNCTIONS FOR NEW UI
// =========================================

export async function loadPlansList() {
    const container = document.getElementById('plans-list');
    if (!container) return;
    const snap = await getDocs(collection(db, "plans"));
    if (snap.empty) {
        container.innerHTML = '<p class="text-xs opacity-40">No plans.</p>';
        return;
    }
    container.innerHTML = snap.docs.map(d => {
        const p = d.data();
        return `
            <div class="glass p-3 rounded-xl border border-[var(--border-color)] flex justify-between">
                <div><p class="font-bold">${p.name}</p><p class="text-[10px] opacity-40">${p.years || 0}Y ${p.months || 0}M ${p.days || 0}D</p></div>
                <button onclick="deletePlanItem('${d.id}')" class="text-red-500 text-[10px]"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');
}

export async function deletePlanItem(id) {
    if (!confirm("Delete this plan?")) return;
    await deleteDoc(doc(db, "plans", id));
    loadPlansList();
}

// ─── ATTACH TO WINDOW FOR GLOBAL ACCESS ───
window.loadPlans = loadPlans;
window.loadInstitutePlans = loadInstitutePlans;
window.processPlanSave = processPlanSave;
window.updatePlanDates = updatePlanDates;
window.addInstitute = addInstitute;
window.loadInstitutes = loadInstitutes;
window.addPayment = addPayment;
window.loadPayments = loadPayments;
window.addSubscription = addSubscription;
window.loadSubscriptions = loadSubscriptions;
window.loadPlansList = loadPlansList;
window.deletePlanItem = deletePlanItem;

// ─── AUTO-LOAD ON DOM READY ───
document.addEventListener("DOMContentLoaded", () => {
    loadPlans();
    loadInstitutePlans();
    loadInstitutes();

    const planType = document.getElementById("plan-type");
    const startDate = document.getElementById("inst-start");
    if (planType) {
        planType.addEventListener("change", updatePlanDates);
    }
    if (startDate) {
        startDate.addEventListener("change", updatePlanDates);
    }
});

console.log("✅ app.js loaded");
