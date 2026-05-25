import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updatePassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
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

// Add this after your app initialization logic
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get('p');
    if (path) {
        // If the app was opened via 404 redirect, navigate to the correct page
        renderContent(path);
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

// ... (Rest of your original getThumbnail and sendOTP functions remain the same)
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
    return await emailjs.send(emailConfig.serviceID, emailConfig.templateID, { to_email: email, otp: code });
}
