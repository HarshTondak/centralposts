import { Link, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { useContext } from "react";
import axios from "axios";

import InputBox from "../components/input.component";
import AnimationWrapper from "../common/page-animation";
import googleIcon from "../imgs/google.png";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";

const UserAuthForm = ({ type }) => {
  let {
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  // Regular Expressions for Validations
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

  const handleGoogleAuth = (e) => {
    e.preventDefault();
    authWithGoogle()
      .then((user) => {
        const serverRoute = "/google-auth";
        const formData = { access_token: user.accessToken };

        userAuthThroughServer(serverRoute, formData);
      })
      .catch((err) => {
        toast.error("Trouble using Google Auth");
        return console.log(err);
      });
  };

  const userAuthThroughServer = (serverRoute, formData) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
      .then(({ data }) => {
        storeInSession("user", JSON.stringify(data));

        setUserAuth(data);
      })
      .catch(({ response }) => {
        toast.error(response.data.error);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let serverRoute = type === "sign-in" ? "/signin" : "/signup";
    let form = new FormData(formElement);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    const { fullname, email, password } = formData;

    // Validating the Fullname
    // Fullname is only available when user sign-up
    if (fullname) {
      if (!fullname.length) {
        return toast.error("Fullname is Required!");
      }
      if (fullname.length < 3) {
        return toast.error("Fullname must be at least 3 characters long.");
      }
    }

    // Validating the Email
    if (!email.length) {
      return toast.error("Email is Required!");
    }
    if (!emailRegex.test(email)) {
      return toast.error("Email is Invalid!");
    }

    // Validating the Password
    if (!password.length) {
      return toast.error("Password is Required!");
    }
    if (!passwordRegex.test(password)) {
      return toast.error(
        "Password should be 6 to 20 characters long with a numeric, a lowercase and an uppercase letter"
      );
    }

    userAuthThroughServer(serverRoute, formData);
  };

  return access_token ? (
    // If we have an access_token (ie. logged in) then move to the homepage
    <Navigate to="/" />
  ) : (
    // If we don't have an access_token (ie. not logged in) then move to the signup / signin page
    <AnimationWrapper keyValue={type}>
      <section className="h-cover flex items-center justify-center">
        <Toaster />

        <form id="formElement" className="w-[80%] max-w-[400px]">
          <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
            {type === "sign-in" ? "Welcome Back" : "Join Us today"}
          </h1>

          {/* For SignUP only we want to have the Full Name of the user */}
          {type !== "sign-in" ? (
            <InputBox
              name="fullname"
              type="text"
              placeholder="Full Name"
              icon="fi-rr-user"
            />
          ) : (
            ""
          )}

          <InputBox
            name="email"
            type="email"
            placeholder="Email"
            icon="fi-rr-at"
          />

          <InputBox
            name="password"
            type="password"
            placeholder="Password"
            icon="fi-rr-key"
          />

          <button
            className="btn-dark center mt-14 w-[100%]"
            type="submit"
            onClick={handleSubmit}
          >
            {type.replace("-", " ")}
          </button>

          <div className="relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold">
            <hr className="w-1/2 border-black" />
            <p>or</p>
            <hr className="w-1/2 border-black" />
          </div>

          <button
            className="btn-dark w-[100%] flex items-center justify-center gap-4 center"
            onClick={handleGoogleAuth}
          >
            <img src={googleIcon} alt="GoogleIcon" className="w-5" />
            Continue with Google
          </button>

          {type === "sign-in" ? (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Don't have an Account ?
              <Link to="/signup" className="underline text-black text-xl ml-1">
                Join Us
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Already a member ?
              <Link to="/signin" className="underline text-black text-xl ml-1">
                Sign In
              </Link>
            </p>
          )}
        </form>
      </section>
    </AnimationWrapper>
  );
};

export default UserAuthForm;
