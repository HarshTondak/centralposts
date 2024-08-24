import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCtA9uRhufsiR1OG7KEGYtOhf4sY_23YoQ",
  authDomain: "blog-website-2271d.firebaseapp.com",
  projectId: "blog-website-2271d",
  storageBucket: "blog-website-2271d.appspot.com",
  messagingSenderId: "688470670909",
  appId: "1:688470670909:web:9cfe4eb40e03b9c9013454",
};

const app = initializeApp(firebaseConfig);

// Google Auth
const provider = new GoogleAuthProvider();
const auth = getAuth();

export const authWithGoogle = async () => {
  let user = null;
  await signInWithPopup(auth, provider)
    .then((res) => {
      user = res.user;
    })
    .catch((err) => {
      console.log(err);
    });

  return user;
};
