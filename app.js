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
import { firebaseConfig, emailConfig } from "./config.js"

// =========================================
// FIREBASE INITIALIZATION
// =========================================
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistence failed: Multiple tabs open");
    else if (err.code == 'unimplemented') console.log("Persistence not supported");
});

export const provider = new GoogleAuthProvider();

// Initialize EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(emailConfig.publicKey);
}

// =========================================
// EXPORTED UTILITY FUNCTIONS
// =========================================

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYTId(url) {
    if (!url) return null;
    try {
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&?#]+)/,
            /(?:youtu\.be\/)([^?&#]+)/,
            /(?:youtube\.com\/embed\/)([^?&#]+)/,
            /(?:youtube\.com\/shorts\/)([^?&#]+)/,
            /(?:youtube\.com\/live\/)([^?&#]+)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Get thumbnail URL for content (YouTube or generic)
 */
export function getThumbnail(url) {
    if (!url) return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    
    try {
        const cleanUrl = url.toLowerCase().trim();
        
        // Direct image URLs
        if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/)) {
            return url;
        }

        // YouTube thumbnails
        const ytId = extractYTId(url);
        if (ytId) {
            return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
        }

        // Generic fallback
        return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    } catch (e) {
        return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    }
}

/**
 * Send OTP email via EmailJS
 */
export async function sendOTP(email, code) {
    try {
        if (typeof emailjs === 'undefined') {
            console.warn('EmailJS not loaded. OTP not sent.');
            return;
        }
        const result = await emailjs.send(
            emailConfig.serviceID, 
            emailConfig.templateID, 
            { 
                to_email: email, 
                otp: code,
                to_name: email.split('@')[0]
            }
        );
        return result;
    } catch (error) {
        console.error('EmailJS error:', error);
        // Fallback: log the OTP for development
        console.log(`OTP for ${email}: ${code}`);
        throw error;
    }
}

// =========================================
// RE-EXPORT COMMON FIREBASE FUNCTIONS
// =========================================
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

// =========================================
// ADMIN PANEL - PLAN MANAGEMENT
// =========================================

/**
 * Load all plans from Firestore
 */
export async function loadPlans() {
    const container = document.getElementById("plans-list");
    if (!container) return;

    container.innerHTML = "";
    try {
        const snap = await getDocs(collection(db, "plans"));
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="border p-4 rounded-xl mb-3 bg-[var(--bg-card)]">
                    <h3 class="text-xl font-black text-[var(--text-primary)]">${data.name}</h3>
                    <p class="text-[var(--text-secondary)]">
                        ${data.years || 0} Years
                        ${data.months || 0} Months
                        ${data.days || 0} Days
                        ${data.price ? `• ₹${data.price}/month` : ''}
                    </p>
                    <p class="text-xs text-[var(--text-muted)] mt-1">ID: ${docSnap.id}</p>
                    <button onclick="window.deletePlan('${docSnap.id}')" 
                        class="text-red-500 text-xs font-bold mt-2 hover:text-red-400">
                        Delete
                    </button>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading plans:", error);
        container.innerHTML = `<p class="text-red-500">Failed to load plans</p>`;
    }
}

/**
 * Save a new custom plan
 */
export async function saveCustomPlan() {
    const planName = document.getElementById("custom-plan-name")?.value?.trim();
    const years = parseInt(document.getElementById("custom-plan-years")?.value) || 0;
    const months = parseInt(document.getElementById("custom-plan-months")?.value) || 0;
    const days = parseInt(document.getElementById("custom-plan-days")?.value) || 0;
    const price = parseFloat(document.getElementById("custom-plan-price")?.value) || 0;

    if (!planName || (years === 0 && months === 0 && days === 0)) {
        alert("Please enter a plan name and at least one duration value");
        return;
    }

    try {
        await addDoc(collection(db, "plans"), {
            name: planName,
            years,
            months,
            days,
            price,
            createdAt: serverTimestamp()
        });
        alert("Custom plan saved successfully!");
        // Clear form
        document.getElementById("custom-plan-name").value = "";
        document.getElementById("custom-plan-years").value = "";
        document.getElementById("custom-plan-months").value = "";
        document.getElementById("custom-plan-days").value = "";
        document.getElementById("custom-plan-price").value = "";
        loadPlans();
        loadInstitutePlans();
    } catch (error) {
        console.error("Error saving plan:", error);
        alert("Failed to save plan: " + error.message);
    }
}

/**
 * Delete a plan
 */
export async function deletePlan(planId) {
    if (!confirm("Delete this plan permanently?")) return;
    try {
        await deleteDoc(doc(db, "plans", planId));
        alert("Plan deleted");
        loadPlans();
        loadInstitutePlans();
    } catch (error) {
        console.error("Error deleting plan:", error);
        alert("Failed to delete plan");
    }
}

/**
 * Load plans into the institute form dropdown
 */
export async function loadInstitutePlans() {
    const planDropdown = document.getElementById("plan-type");
    if (!planDropdown) return;

    // Preserve custom plans
    const customPlans = [];
    try {
        const snap = await getDocs(collection(db, "plans"));
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            customPlans.push({
                id: docSnap.id,
                name: data.name,
                years: data.years || 0,
                months: data.months || 0,
                days: data.days || 0,
                price: data.price || 0
            });
        });
    } catch (error) {
        console.error("Error loading custom plans:", error);
    }

    // Build dropdown
    let options = `
        <option value="free_trial">Free Trial (15 Days)</option>
        <option value="one_year">One Year Plan</option>
    `;

    customPlans.forEach(plan => {
        const duration = [];
        if (plan.years) duration.push(`${plan.years}Y`);
        if (plan.months) duration.push(`${plan.months}M`);
        if (plan.days) duration.push(`${plan.days}D`);
        const durationStr = duration.length ? ` (${duration.join(' ')})` : '';
        const priceStr = plan.price ? ` • ₹${plan.price}` : '';
        options += `<option value="${plan.id}">${plan.name}${durationStr}${priceStr}</option>`;
    });

    planDropdown.innerHTML = options;
}

/**
 * Calculate end date based on plan type and start date
 */
export async function calculateEndDate(planId, startDate = new Date()) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    // Default plans
    if (planId === "free_trial") {
        start.setDate(start.getDate() + 15);
        return start;
    }

    if (planId === "one_year") {
        start.setFullYear(start.getFullYear() + 1);
        return start;
    }

    // Custom plan from DB
    try {
        const planRef = doc(db, "plans", planId);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
            const plan = planSnap.data();
            start.setFullYear(start.getFullYear() + (plan.years || 0));
            start.setMonth(start.getMonth() + (plan.months || 0));
            start.setDate(start.getDate() + (plan.days || 0));
            return start;
        }
    } catch (error) {
        console.error("Error calculating end date:", error);
    }
    
    return start;
}

/**
 * Update plan dates in the form when plan type or start date changes
 */
export async function updatePlanDates() {
    const planType = document.getElementById("plan-type");
    const startDateInput = document.getElementById("inst-start");
    const endDateInput = document.getElementById("inst-end");

    if (!planType || !startDateInput || !endDateInput) return;

    // If no start date, set today
    if (!startDateInput.value) {
        const today = new Date();
        startDateInput.value = today.toISOString().split("T")[0];
    }

    const start = new Date(startDateInput.value);
    let end = new Date(start);

    try {
        if (planType.value === "free_trial") {
            end.setDate(end.getDate() + 15);
        } else if (planType.value === "one_year") {
            end.setFullYear(end.getFullYear() + 1);
        } else {
            // Custom plan
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
    } catch (error) {
        console.error("Error updating plan dates:", error);
    }
}

// =========================================
// ADMIN PANEL - INSTITUTE MANAGEMENT
// =========================================

/**
 * Add a new institute
 */
export async function addInstitute() {
    try {
        const name = document.getElementById("inst-name")?.value?.trim();
        const logo = document.getElementById("inst-logo")?.value?.trim();
        const teacherId = document.getElementById("inst-teacher-id")?.value?.trim();
        const currentPlan = document.getElementById("plan-type")?.value;
        const startDate = document.getElementById("inst-start")?.value;
        const endDate = document.getElementById("inst-end")?.value;

        if (!name || !currentPlan || !startDate || !endDate) {
            alert("Please fill in all required fields");
            return;
        }

        // Generate unique ID
        const uniqueId = "INST-" + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Get plan details
        let planName = "";
        let years = 0, months = 0, days = 0;
        let price = 0;

        if (currentPlan === "free_trial") {
            planName = "Free Trial";
            days = 15;
        } else if (currentPlan === "one_year") {
            planName = "One Year Plan";
            years = 1;
        } else {
            const planRef = doc(db, "plans", currentPlan);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const plan = planSnap.data();
                planName = plan.name || "";
                years = plan.years || 0;
                months = plan.months || 0;
                days = plan.days || 0;
                price = plan.price || 0;
            }
        }

        // Check if teacher exists
        if (teacherId) {
            const tSnap = await getDocs(query(collection(db, "users"), where("teacherId", "==", teacherId)));
            if (tSnap.empty) {
                alert("Teacher ID not found. Please create a teacher account first.");
                return;
            }
            // Update teacher's institute ID
            const tDoc = tSnap.docs[0];
            await updateDoc(doc(db, "users", tDoc.id), { instituteId: uniqueId });
        }

        // Create institute document
        await addDoc(collection(db, "institutes"), {
            uniqueId,
            name,
            logo: logo || '',
            teacherId: teacherId || '',
            currentPlan,
            planName,
            years,
            months,
            days,
            price,
            startDate,
            endDate,
            subscriptionStatus: "active",
            privacyMode: "public",
            createdAt: serverTimestamp()
        });

        alert("Institute added successfully!");
        
        // Clear form
        document.getElementById("inst-name").value = "";
        document.getElementById("inst-logo").value = "";
        document.getElementById("inst-teacher-id").value = "";
        
        loadInstitutes();
    } catch (error) {
        console.error("Error adding institute:", error);
        alert("Failed to add institute: " + error.message);
    }
}

/**
 * Load all institutes
 */
export async function loadInstitutes() {
    const container = document.getElementById("institutes-list");
    if (!container) return;

    container.innerHTML = "";
    try {
        const snap = await getDocs(collection(db, "institutes"));
        
        if (snap.empty) {
            container.innerHTML = '<p class="text-[var(--text-secondary)] text-sm">No institutes registered</p>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        snap.forEach(async (docSnap) => {
            const data = docSnap.data();
            const endDate = data.endDate ? new Date(data.endDate) : null;
            const isExpired = endDate && endDate < today;

            // Update status if expired
            if (isExpired && data.subscriptionStatus !== "expired") {
                try {
                    await updateDoc(doc(db, "institutes", docSnap.id), {
                        subscriptionStatus: "expired"
                    });
                } catch (e) {}
            }

            const status = isExpired ? "Expired" : "Active";
            const statusColor = isExpired ? "text-red-500" : "text-green-500";

            container.innerHTML += `
                <div class="border p-4 rounded-xl mb-3 bg-[var(--bg-card)]">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-black text-[var(--text-primary)]">${data.name || "Unnamed"}</h3>
                        <span class="text-sm font-bold ${statusColor}">${status}</span>
                    </div>
                    <p class="text-[var(--text-secondary)] text-sm">ID: ${data.uniqueId || "N/A"}</p>
                    <p class="text-[var(--text-secondary)] text-sm">Plan: ${data.planName || data.currentPlan || "N/A"}</p>
                    <p class="text-[var(--text-secondary)] text-sm">
                        Duration: ${data.years || 0}Y ${data.months || 0}M ${data.days || 0}D
                        ${data.price ? `• ₹${data.price}/month` : ''}
                    </p>
                    <p class="text-[var(--text-secondary)] text-sm">Start: ${data.startDate || "N/A"}</p>
                    <p class="text-[var(--text-secondary)] text-sm">Expiry: ${data.endDate || "N/A"}</p>
                    <div class="flex gap-2 mt-3">
                        <button onclick="window.editInstitute('${docSnap.id}')" 
                            class="text-brandOrange text-xs font-bold hover:text-brandOrange/70">
                            Edit
                        </button>
                        <button onclick="window.deleteInstitute('${docSnap.id}')" 
                            class="text-red-500 text-xs font-bold hover:text-red-400">
                            Delete
                        </button>
                        <button onclick="window.triggerInstAppInstall('${data.uniqueId}')" 
                            class="text-green-500 text-xs font-bold hover:text-green-400">
                            Install App
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading institutes:", error);
        container.innerHTML = `<p class="text-red-500">Failed to load institutes</p>`;
    }
}

/**
 * Edit institute
 */
export async function editInstitute(docId) {
    try {
        const docRef = doc(db, "institutes", docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            alert("Institute not found");
            return;
        }
        const data = docSnap.data();

        // Show edit modal (implement in UI layer)
        window.showEditInstituteModal(docId, data);
    } catch (error) {
        console.error("Error editing institute:", error);
        alert("Failed to load institute data");
    }
}

/**
 * Delete institute
 */
export async function deleteInstitute(docId) {
    if (!confirm("Delete this institute permanently? This action cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "institutes", docId));
        alert("Institute deleted");
        loadInstitutes();
    } catch (error) {
        console.error("Error deleting institute:", error);
        alert("Failed to delete institute");
    }
}

/**
 * Check and update institute expiry status
 */
export async function checkInstituteExpiry(instituteId) {
    try {
        const instituteRef = doc(db, "institutes", instituteId);
        const instituteSnap = await getDoc(instituteRef);
        if (!instituteSnap.exists()) return false;

        const institute = instituteSnap.data();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = institute.endDate ? new Date(institute.endDate) : null;
        if (!endDate) return true;

        if (today > endDate) {
            await updateDoc(instituteRef, {
                subscriptionStatus: "expired"
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking institute expiry:", error);
        return false;
    }
}

// =========================================
// ADMIN PANEL - PAYMENT MANAGEMENT
// =========================================

/**
 * Add payment record
 */
export async function addPayment() {
    const instituteId = document.getElementById('payment-institute')?.value?.trim();
    const amount = Number(document.getElementById('payment-amount')?.value);
    const paymentGateway = document.getElementById('payment-gateway')?.value?.trim();
    const transactionId = document.getElementById('payment-transaction')?.value?.trim();

    if (!instituteId || !amount || !paymentGateway || !transactionId) {
        alert("Please fill in all payment fields");
        return;
    }

    try {
        await addDoc(collection(db, "payments"), {
            instituteId,
            amount,
            paymentGateway,
            transactionId,
            status: "success",
            createdAt: serverTimestamp()
        });
        alert("Payment record added!");
        document.getElementById('payment-institute').value = "";
        document.getElementById('payment-amount').value = "";
        document.getElementById('payment-gateway').value = "";
        document.getElementById('payment-transaction').value = "";
        loadPayments();
    } catch (error) {
        console.error("Error adding payment:", error);
        alert("Failed to add payment record");
    }
}

/**
 * Load all payments
 */
export async function loadPayments() {
    const container = document.getElementById('payments-list');
    if (!container) return;

    container.innerHTML = "";
    try {
        const snap = await getDocs(collection(db, "payments"));
        if (snap.empty) {
            container.innerHTML = '<p class="text-[var(--text-secondary)] text-sm">No payment records</p>';
            return;
        }

        let total = 0;
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            total += data.amount || 0;
            container.innerHTML += `
                <div class="border p-3 rounded-xl mb-2 bg-[var(--bg-card)]">
                    <div class="flex justify-between">
                        <p class="font-bold text-[var(--text-primary)]">₹${data.amount || 0}</p>
                        <span class="text-sm ${data.status === 'success' ? 'text-green-500' : 'text-red-500'}">${data.status || 'unknown'}</span>
                    </div>
                    <p class="text-xs text-[var(--text-secondary)]">Gateway: ${data.paymentGateway || 'N/A'}</p>
                    <p class="text-xs text-[var(--text-muted)]">Txn: ${data.transactionId || 'N/A'}</p>
                    <p class="text-xs text-[var(--text-muted)]">Institute: ${data.instituteId || 'N/A'}</p>
                </div>
            `;
        });

        // Add total
        container.innerHTML += `
            <div class="border p-3 rounded-xl mt-3 bg-[var(--bg-card)] border-brandOrange/30">
                <p class="font-bold text-brandOrange">Total Revenue: ₹${total}</p>
            </div>
        `;
    } catch (error) {
        console.error("Error loading payments:", error);
        container.innerHTML = `<p class="text-red-500">Failed to load payments</p>`;
    }
}

// =========================================
// ADMIN PANEL - SUBSCRIPTION MANAGEMENT
// =========================================

/**
 * Add subscription
 */
export async function addSubscription() {
    const instituteId = document.getElementById('subscription-institute')?.value?.trim();
    const planId = document.getElementById('subscription-plan')?.value;
    const paymentId = document.getElementById('subscription-payment')?.value?.trim();

    if (!instituteId || !planId) {
        alert("Please fill in required fields");
        return;
    }

    let expiry = new Date();
    expiry.setHours(0, 0, 0, 0);

    if (planId === "monthly") {
        expiry.setDate(expiry.getDate() + 30);
    } else if (planId === "yearly") {
        expiry.setDate(expiry.getDate() + 365);
    } else if (planId === "free_trial") {
        expiry.setDate(expiry.getDate() + 15);
    } else {
        // Custom plan from DB
        try {
            const planRef = doc(db, "plans", planId);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const plan = planSnap.data();
                expiry.setFullYear(expiry.getFullYear() + (plan.years || 0));
                expiry.setMonth(expiry.getMonth() + (plan.months || 0));
                expiry.setDate(expiry.getDate() + (plan.days || 0));
            }
        } catch (error) {
            console.error("Error getting plan:", error);
        }
    }

    try {
        await addDoc(collection(db, "subscriptions"), {
            instituteId,
            planId,
            paymentId: paymentId || '',
            startDate: serverTimestamp(),
            expiryDate: expiry.toISOString(),
            status: "active",
            createdAt: serverTimestamp()
        });
        alert("Subscription added!");
        loadSubscriptions();
    } catch (error) {
        console.error("Error adding subscription:", error);
        alert("Failed to add subscription");
    }
}

/**
 * Load all subscriptions
 */
export async function loadSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    if (!container) return;

    container.innerHTML = "";
    try {
        const snap = await getDocs(collection(db, "subscriptions"));
        if (snap.empty) {
            container.innerHTML = '<p class="text-[var(--text-secondary)] text-sm">No subscriptions</p>';
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const isExpired = data.expiryDate && new Date(data.expiryDate) < new Date();
            const status = isExpired ? "Expired" : (data.status || "Active");
            const statusColor = isExpired ? "text-red-500" : "text-green-500";

            container.innerHTML += `
                <div class="border p-3 rounded-xl mb-2 bg-[var(--bg-card)]">
                    <div class="flex justify-between">
                        <p class="font-bold text-[var(--text-primary)]">Institute: ${data.instituteId || 'N/A'}</p>
                        <span class="text-sm ${statusColor}">${status}</span>
                    </div>
                    <p class="text-xs text-[var(--text-secondary)]">Plan: ${data.planId || 'N/A'}</p>
                    <p class="text-xs text-[var(--text-muted)]">Expires: ${data.expiryDate || 'N/A'}</p>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading subscriptions:", error);
        container.innerHTML = `<p class="text-red-500">Failed to load subscriptions</p>`;
    }
}

// =========================================
// ADMIN PANEL - REQUEST MANAGEMENT
// =========================================

/**
 * Load institute requests
 */
export async function loadInstituteRequests() {
    const container = document.getElementById('admin-requests-list');
    if (!container) return;

    container.innerHTML = "";
    try {
        const snap = await getDocs(collection(db, "instituteRequests"));
        if (snap.empty) {
            container.innerHTML = '<p class="text-[var(--text-secondary)] text-sm">No pending requests</p>';
            return;
        }

        snap.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="border p-3 rounded-xl mb-2 bg-[var(--bg-card)]">
                    <div class="flex justify-between">
                        <p class="font-bold text-[var(--text-primary)]">${data.name || 'Unknown'}</p>
                        <span class="text-sm ${data.status === 'pending' ? 'text-yellow-500' : data.status === 'approved' ? 'text-green-500' : 'text-red-500'}">
                            ${data.status || 'pending'}
                        </span>
                    </div>
                    <p class="text-xs text-[var(--text-secondary)]">${data.email || 'No email'}</p>
                    <p class="text-xs text-[var(--text-muted)]">${data.phone || 'No phone'}</p>
                    <p class="text-xs text-[var(--text-muted)]">Teachers: ${data.teachers || '0'}, Students: ${data.students || '0'}</p>
                    <div class="flex gap-2 mt-2">
                        <button onclick="window.approveRequest('${docSnap.id}')" 
                            class="text-green-500 text-xs font-bold hover:text-green-400">
                            Approve
                        </button>
                        <button onclick="window.rejectRequest('${docSnap.id}')" 
                            class="text-red-500 text-xs font-bold hover:text-red-400">
                            Reject
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading requests:", error);
        container.innerHTML = `<p class="text-red-500">Failed to load requests</p>`;
    }
}

/**
 * Approve institute request
 */
export async function approveRequest(requestId) {
    if (!confirm("Approve this institute request?")) return;
    try {
        const reqRef = doc(db, "instituteRequests", requestId);
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) {
            alert("Request not found");
            return;
        }
        const data = reqSnap.data();

        // Create institute
        const uniqueId = "INST-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await addDoc(collection(db, "institutes"), {
            uniqueId,
            name: data.name || "New Institute",
            logo: '',
            teacherId: '',
            currentPlan: 'free_trial',
            planName: 'Free Trial',
            years: 0,
            months: 0,
            days: 15,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            subscriptionStatus: "active",
            privacyMode: "public",
            createdAt: serverTimestamp()
        });

        // Update request status
        await updateDoc(reqRef, { status: "approved" });
        alert("Institute approved and created!");
        loadInstituteRequests();
        loadInstitutes();
    } catch (error) {
        console.error("Error approving request:", error);
        alert("Failed to approve request");
    }
}

/**
 * Reject institute request
 */
export async function rejectRequest(requestId) {
    if (!confirm("Reject this institute request?")) return;
    try {
        await updateDoc(doc(db, "instituteRequests", requestId), { status: "rejected" });
        alert("Request rejected");
        loadInstituteRequests();
    } catch (error) {
        console.error("Error rejecting request:", error);
        alert("Failed to reject request");
    }
}

// =========================================
// GLOBAL WINDOW EXPOSURES FOR UI
// =========================================

// Admin functions
window.loadPlans = loadPlans;
window.saveCustomPlan = saveCustomPlan;
window.deletePlan = deletePlan;
window.loadInstitutePlans = loadInstitutePlans;
window.updatePlanDates = updatePlanDates;
window.addInstitute = addInstitute;
window.loadInstitutes = loadInstitutes;
window.editInstitute = editInstitute;
window.deleteInstitute = deleteInstitute;
window.addPayment = addPayment;
window.loadPayments = loadPayments;
window.addSubscription = addSubscription;
window.loadSubscriptions = loadSubscriptions;
window.loadInstituteRequests = loadInstituteRequests;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;

// Auth functions (re-exported from Firebase)
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.onAuthStateChanged = onAuthStateChanged;
window.signOut = signOut;
window.signInWithPopup = signInWithPopup;
window.updatePassword = updatePassword;
window.sendPasswordResetEmail = sendPasswordResetEmail;

// Utility functions
window.extractYTId = extractYTId;
window.getThumbnail = getThumbnail;
window.sendOTP = sendOTP;

// =========================================
// DOM READY - AUTO INITIALIZE
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    // Load plans and institutes if the admin panel elements exist
    if (document.getElementById("plans-list")) {
        loadPlans();
        loadInstitutePlans();
    }
    if (document.getElementById("institutes-list")) {
        loadInstitutes();
    }
    if (document.getElementById("payments-list")) {
        loadPayments();
    }
    if (document.getElementById("subscriptions-list")) {
        loadSubscriptions();
    }
    if (document.getElementById("admin-requests-list")) {
        loadInstituteRequests();
    }

    // Set up plan date listener
    const planType = document.getElementById("plan-type");
    const startDate = document.getElementById("inst-start");
    if (planType && startDate) {
        planType.addEventListener("change", updatePlanDates);
        startDate.addEventListener("change", updatePlanDates);
    }

    // Set up custom plan form listener (if exists)
    const customPlanBtn = document.getElementById("save-custom-plan");
    if (customPlanBtn) {
        customPlanBtn.addEventListener("click", saveCustomPlan);
    }

    console.log("OpenClase Admin Module Loaded");
    console.log("Firestore connected:", !!db);
    console.log("Auth connected:", !!auth);
});

// Export everything for module usage
export default {
    auth,
    db,
    provider,
    extractYTId,
    getThumbnail,
    sendOTP,
    loadPlans,
    saveCustomPlan,
    deletePlan,
    loadInstitutePlans,
    updatePlanDates,
    addInstitute,
    loadInstitutes,
    editInstitute,
    deleteInstitute,
    checkInstituteExpiry,
    addPayment,
    loadPayments,
    addSubscription,
    loadSubscriptions,
    loadInstituteRequests,
    approveRequest,
    rejectRequest,
    // Firebase exports
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
