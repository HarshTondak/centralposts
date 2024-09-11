import toast, { Toaster } from "react-hot-toast";
import { useContext, useRef } from "react";
import axios from "axios";

import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import { UserContext } from "../App";

const ChangePassword = () => {
  const {
    userAuth: { access_token },
  } = useContext(UserContext);
  let changePasswordForm = useRef();
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = new FormData(changePasswordForm.current);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    const { currentPassword, newPassword } = formData;

    if (!currentPassword.length) {
      return toast.error("Kindly add the Current password");
    }
    if (!newPassword.length) {
      return toast.error("Kindly add the New password");
    }
    if (!passwordRegex.test(newPassword)) {
      return toast.error(
        "Password should be 6 to 20 characters long with a numeric, a lowercase and an uppercase letter"
      );
    }
    if (currentPassword === newPassword) {
      return toast.error("New password should not match the Current password");
    }

    // Disabling the button
    e.target.setAttribute("disabled", true);

    let loadingToast = toast.loading("Updating...");

    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password", formData, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      .then(() => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.success("Password Updated successfully");
      })
      .catch(({ response }) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        return toast.error(response.data.error);
      });
  };

  return (
    <AnimationWrapper>
      <Toaster />
      <form ref={changePasswordForm}>
        <h1 className="max-md:hidden">Change Password</h1>

        <div className="py-10 w-full md:max-w-[400px]">
          <InputBox
            name="currentPassword"
            type="password"
            placeholder="Current Password"
            className="profile-edit-input"
            icon="fi-rr-unlock"
          />

          <InputBox
            name="newPassword"
            type="password"
            placeholder="New Password"
            className="profile-edit-input"
            icon="fi-rr-unlock"
          />

          <button
            className="btn-dark px-10"
            type="submit"
            onClick={handleSubmit}
          >
            Update Password
          </button>
        </div>
      </form>
    </AnimationWrapper>
  );
};

export default ChangePassword;
