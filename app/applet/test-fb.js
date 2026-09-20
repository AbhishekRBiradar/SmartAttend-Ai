import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB_rUynIQVB_4qw_hp7wrDA6Jx_dL8vY9s",
    authDomain: "smartattend-ai-33b1a.firebaseapp.com",
    projectId: "smartattend-ai-33b1a",
    storageBucket: "smartattend-ai-33b1a.firebasestorage.app",
    messagingSenderId: "932560097511",
    appId: "1:932560097511:web:924aff3519453536171242",
    measurementId: "G-1BYNNMRPKC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    try {
        await getDocFromServer(doc(db, "test", "test"));
        console.log("Success");
    } catch (e) {
        console.error(e.message);
    }
}
test();
