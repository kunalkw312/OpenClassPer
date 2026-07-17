import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
// Replaced enableIndexedDbPersistence and getFirestore with the new modular caching methods
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { firebaseConfig, emailConfig } from "./config.js"

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// FIXED: Using the new v11 recommended way to enable offline persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Add this after your app initialization logic
window.addEventListener('DOMContentLoaded', () => {
    document.addEventListener("DOMContentLoaded", () => {

    // loadPlans();
    loadInstitutePlans();
    loadInstitutes();

    const planType = document.getElementById("plan-type");
    const startDate = document.getElementById("inst-start");

    if(planType){
        planType.addEventListener("change", updatePlanDates);
    }

    if(startDate){
        startDate.addEventListener("change", updatePlanDates);
    }
});

    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');

    if (path) {
        // 404 redirect किंवा direct open handle
        if (typeof renderContent === 'function') renderContent(path);
    }

    // date change listener (only if elements exist)
    const startDateInput = document.getElementById("startDateInput");
    const planType = document.getElementById("planType");

    if (startDateInput && planType) {
        startDateInput.addEventListener("change", () => {
            planType.dispatchEvent(new Event("change"));
        });
    }
});


export const provider = new GoogleAuthProvider();
// Ensure emailjs is loaded in your HTML before calling this
if (typeof emailjs !== 'undefined') {
    emailjs.init(emailConfig.publicKey);
}

export { 
    doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, 
    increment, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, orderBy, limit,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, 
    signOut, signInWithPopup, updatePassword, sendPasswordResetEmail
};

// ... (Rest of your original getThumbnail and sendOTP functions remain the same)
export function getThumbnail(url) {
    try {
        let id = '';

        if(url.includes('v=')) id = url.split('v=')[1].split('&')[0];
        else if(url.includes('youtu.be/')) id = url.split('/').pop().split('?')[0];
        else if(url.includes('/shorts/')) id = url.split('/shorts/')[1].split('?')[0];
        else if(url.includes('/live/')) id = url.split('/live/')[1].split('?')[0];

        return id
            ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
            : 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';

    } catch(e) {
        return 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1777895769/IMG-20260504-WA0002_fucbjd.jpg';
    }
}
export async function sendOTP(email, code) {
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}


// =========================================
// NEW: CUSTOM NOTIFICATIONS & PAYMENTS HOOKS
// =========================================

window._processCustomNotif = async (title, body) => {
    try {
        const uid = auth.currentUser.uid;
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return;
        const profile = userSnap.data();

        let targetUids = [];

        // Fetch students under this teacher's institute if applicable
        if (profile.instituteId) {
            const qInst = query(collection(db, "users"), where("instituteId", "==", profile.instituteId), where("role", "==", "student"));
            const snapInst = await getDocs(qInst);
            snapInst.forEach(d => targetUids.push(d.id));
        }

        // Fetch general followers
        const qSubs = query(collection(db, "users"), where("subs", "array-contains", profile.teacherId || ""));
        const snapSubs = await getDocs(qSubs);
        snapSubs.forEach(d => {
            if (!targetUids.includes(d.id)) targetUids.push(d.id);
        });

        // Batch create notifications
        for (let targetUid of targetUids) {
            await addDoc(collection(db, "notifications"), {
                uid: targetUid,
                type: "ANNOUNCEMENT",
                text: `${title}: ${body}`,
                createdAt: serverTimestamp()
            });
        }
        console.log(`Custom notification successfully pushed to ${targetUids.length} students.`);
    } catch (error) {
        console.error("Error sending custom notifications: ", error);
    }
};

window._processPaymentHook = async (planId) => {
    try {
        const uid = auth.currentUser.uid;
        
        if (planId === 'FULL_ACCESS') {
            // Institute level Full Access Grant
            const urlParams = new URLSearchParams(window.location.search);
            const targetInstId = urlParams.get('inst') || localStorage.getItem('locked_inst_id');
            
            if (targetInstId) {
                await updateDoc(doc(db, "users", uid), {
                    instituteId: targetInstId
                });
            }
        } else {
            // Individual Course/Group Access Grant
            const courseSnap = await getDoc(doc(db, "courses", planId));
            if (courseSnap.exists()) {
                const courseData = courseSnap.data();
                if (courseData.groupId) {
                    await updateDoc(doc(db, "groups", courseData.groupId), {
                        members: arrayUnion(uid)
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error processing payment hook: ", error);
    }
};


// =========================================
// ADMIN PANEL
// =========================================

const adminBtn = document.getElementById('admin-panel-btn');
const adminDashboard = document.getElementById('admin-dashboard');

// =========================================
// CLOSE DASHBOARD
// =========================================
window.closeAdminDashboard = () => {
    if(adminDashboard) adminDashboard.classList.add('hidden');
};

// =========================================
// SHOW SECTION
// =========================================
window.showSection = (sectionId) => {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });

    const targetSection = document.getElementById(sectionId);
    if(targetSection) targetSection.classList.remove('hidden');
};


// =========================================
// LOAD PLANS
// =========================================

async function loadPlans() {
    const container = document.getElementById("plans-list");
    if(!container) return;
    container.innerHTML = "";

    try {
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
    } catch (error) {
        console.warn("Could not load plans (check Firestore rules):", error.message);
    }
}

window.processPlanSave = async function () {
    const planName = document.getElementById("custom-plan-name")?.value;
    const years = parseInt(document.getElementById("custom-plan-years")?.value) || 0;
    const months = parseInt(document.getElementById("custom-plan-months")?.value) || 0;
    const days = parseInt(document.getElementById("custom-plan-days")?.value) || 0;
    
    if(!planName || (years===0 && months===0 && days===0)){
       alert("Enter Plan Name and Duration");
       return;
    }
    
    try {
        await addDoc(collection(db, "plans"), {
            name: planName,
            years,
            months,
            days,
            createdAt: Date.now()
        });

        alert("Plan Saved");
        loadInstitutePlans();
    } catch (error) {
        console.error("Error saving plan:", error.message);
        alert("Failed to save plan. Check your permissions.");
    }
};

async function loadInstitutePlans() {
    const planDropdown = document.getElementById("plan-type");
    if (!planDropdown) return;

    // Default options
    planDropdown.innerHTML = `
        <option value="free_trial">Free Trial (15 Days)</option>
        <option value="one_year">One Year Plan</option>
    `;

    try {
        const snap = await getDocs(collection(db, "plans"));
        snap.forEach((docSnap) => {
            const plan = docSnap.data();
            planDropdown.innerHTML += `
                <option value="${docSnap.id}">
                    ${plan.name} (${plan.years || 0}Y ${plan.months || 0}M ${plan.days || 0}D)
                </option>
            `;
        });
    } catch (error) {
        console.warn("Could not load custom plans into dropdown:", error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const planType = document.getElementById("plan-type");
    const startDateInput = document.getElementById("inst-start");
    const endDateInput = document.getElementById("inst-end");

    if (!planType || !startDateInput || !endDateInput) {
        // FIXED: Removed console log to avoid spamming the console on irrelevant pages
        return;
    }

    loadInstitutePlans();

    planType.addEventListener("change", async () => {
        if(!startDateInput.value){
           const today = new Date();
           startDateInput.value = today.toISOString().split("T")[0];
        }

        const start = new Date(startDateInput.value);
        let end = new Date(start);

        if (planType.value === "free_trial") {
            end.setDate(end.getDate() + 15);
        }
        else if (planType.value === "one_year") {
            end.setFullYear(end.getFullYear() + 1);
        }
        else {
            try {
                const planRef = doc(db, "plans", planType.value);
                const planSnap = await getDoc(planRef);

                if (planSnap.exists()) {
                    const plan = planSnap.data();
                    end.setFullYear(end.getFullYear() + (plan.years || 0));
                    end.setMonth(end.getMonth() + (plan.months || 0));
                    end.setDate(end.getDate() + (plan.days || 0));
                }
            } catch (error) {
                console.error("Error fetching selected plan:", error.message);
            }
        }

        endDateInput.value = end.toISOString().split("T")[0];
    });
});

// =========================================
// ADD INSTITUTE
// =========================================

window.addInstitute = async () => {
    try {
        const name = document.getElementById("inst-name").value.trim();
        const logo = document.getElementById("inst-logo").value.trim();
        const ownerId = document.getElementById("inst-teacher-id").value.trim();
        const currentPlan = document.getElementById("plan-type").value;
        const startDate = document.getElementById("inst-start").value;
        const endDate = document.getElementById("inst-end").value;

        if (!name) {
            alert("Institute Name Required");
            return;
        }
        if (!currentPlan) {
            alert("Select Plan");
            return;
        }

        let planName = "";
        let years = 0;
        let months = 0;
        let days = 0;

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
        alert("Error Adding Institute. Check permissions.");
    }
};

window.updatePlanDates = async function () {
    const planType = document.getElementById("plan-type");
    const startDateInput = document.getElementById("inst-start");
    const endDateInput = document.getElementById("inst-end");

    if (!planType || !startDateInput || !endDateInput) return;

    const today = new Date();

    if (!startDateInput.value) {
        startDateInput.value = today.toISOString().split("T")[0];
    }

    const start = new Date(startDateInput.value);

    if (planType.value === "free_trial") {
        let end = new Date(start);
        end.setDate(end.getDate() + 15);
        endDateInput.value = end.toISOString().split("T")[0];
        return;
    }

    if (planType.value === "one_year") {
        let end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        endDateInput.value = end.toISOString().split("T")[0];
        return;
    }
    
    try {
        const planDoc = await getDoc(doc(db, "plans", planType.value));
        if (!planDoc.exists()) return;

        const plan = planDoc.data();
        let end = new Date(start);

        end.setFullYear(end.getFullYear() + (plan.years || 0));
        end.setMonth(end.getMonth() + (plan.months || 0));
        end.setDate(end.getDate() + (plan.days || 0));

        endDateInput.value = end.toISOString().split("T")[0];
    } catch (error) {
        console.error("Error updating plan dates:", error.message);
    }
}

async function checkInstituteExpiry(instituteId) {
    try {
        const instituteRef = doc(db, "institutes", instituteId);
        const instituteSnap = await getDoc(instituteRef);
        if (!instituteSnap.exists()) return false;

        const institute = instituteSnap.data();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endDate = new Date(institute.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (today > endDate) {
            await updateDoc(instituteRef, {
                subscriptionStatus: "expired"
            });
            return false;
        }
        return true;
    } catch (error) {
        console.warn("Permission error checking expiry:", error.message);
        return false;
    }
}

// =========================================
// LOAD INSTITUTES
// =========================================

async function loadInstitutes() {
    const container = document.getElementById("institutes-list");
    if (!container) return;
    container.innerHTML = "";

    try {
        const snap = await getDocs(collection(db, "institutes"));
        
        snap.forEach(async (docSnap) => {
            const data = docSnap.data();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = new Date(data.endDate);
            endDate.setHours(0, 0, 0, 0);

            const status = today > endDate ? "Expired" : "Active";

            if (today > endDate && data.subscriptionStatus !== "expired") {
                try {
                    await updateDoc(doc(db, "institutes", docSnap.id), {
                        subscriptionStatus: "expired"
                    });
                } catch (e) {
                    console.warn("Could not update expired status:", e.message);
                }
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
    } catch (error) {
        console.warn("Could not load institutes (check Firestore rules):", error.message);
    }
}

// =========================================
// ADD PAYMENT
// =========================================

window.addPayment = async () => {
    try {
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
    } catch (error) {
        console.error(error);
        alert("Error Adding Payment. Check permissions.");
    }
};

// =========================================
// LOAD PAYMENTS
// =========================================

async function loadPayments() {
    const container = document.getElementById('payments-list');
    if(!container) return;
    container.innerHTML = "";

    try {
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
    } catch (error) {
         console.warn("Could not load payments:", error.message);
    }
}

// =========================================
// ADD SUBSCRIPTION
// =========================================

window.addSubscription = async () => {
    try {
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
    } catch (error) {
        console.error(error);
        alert("Error adding subscription. Check permissions.");
    }
};

// =========================================
// LOAD SUBSCRIPTIONS
// =========================================

async function loadSubscriptions() {
    const container = document.getElementById('subscriptions-list');
    if(!container) return;
    container.innerHTML = "";

    try {
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
    } catch (error) {
        console.warn("Could not load subscriptions:", error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Only attempt loading if elements exist (avoids permission errors on public pages)
    if (document.getElementById("institutes-list")) loadInstitutes();
    if (document.getElementById("plans-list")) loadPlans();
    if (document.getElementById("plan-type")) loadInstitutePlans();
});
