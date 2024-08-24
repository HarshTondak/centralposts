import { Link, useNavigate, useParams } from "react-router-dom";
import { useContext, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import EditorJS from "@editorjs/editorjs";
import axios from "axios";

import logo from "../imgs/logo.png";
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog-banner.png";
import { uploadImage } from "../common/aws";
import { EditorContext } from "../pages/editor.pages";
import { EditorTools } from "./tools.component";
import { UserContext } from "../App";

const BlogEditor = () => {
  const {
    blog: { title, banner, content, tags, desc },
    blog,
    setBlog,
    textEditor,
    setTextEditor,
    editorState,
    setEditorState,
  } = useContext(EditorContext);

  let { blog_id } = useParams();

  const {
    userAuth: { access_token },
  } = useContext(UserContext);

  const navigate = useNavigate();

  useEffect(() => {
    if (!textEditor.isReady) {
      setTextEditor(
        new EditorJS({
          holderId: "textEditor",
          data: Array.isArray(content) ? content[0] : content,
          tools: EditorTools,
          placeholder: "Let's write an awsome story",
        })
      );
    }
  }, []);

  // Handling Banner Image Upload
  const handleBannerUpload = (e) => {
    const img = e.target.files[0];
    let loadingToast = toast.loading("Uploading...");

    if (img) {
      uploadImage(img)
        .then((url) => {
          if (url) {
            toast.dismiss(loadingToast);
            toast.success("Blog Banner Uploaded 👍");

            setBlog({ ...blog, banner: url });
          }
        })
        .catch((err) => {
          toast.dismiss(loadingToast);
          return toast.error(err);
        });
    }
  };

  // Preventing users from creating new lines in the Title
  const handleTitleKeyDown = (e) => {
    if (e.keyCode == 13) {
      e.preventDefault();
    }
  };

  // Handling Title change
  const handleTitleChange = (e) => {
    let input = e.target;

    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";

    setBlog({ ...blog, title: input.value });
  };

  // To show the default Banner Image, when the image is not loaded by the user
  const handleError = (e) => {
    let img = e.target;
    img.src = defaultBanner;
  };

  // For publishing the blog
  const handlePublishEvent = () => {
    if (!banner.length) {
      return toast.error("Upload the Blog Banner before publishing");
    }
    if (!title.length) {
      return toast.error("Write the Blog Title before publishing");
    }

    // Only when the Editor component is loaded
    if (textEditor.isReady) {
      textEditor
        .save()
        .then((data) => {
          // If there is some data in the editor component
          if (data.blocks.length) {
            setBlog({ ...blog, content: data });
            setEditorState("publish");
          } else {
            return toast.error(
              "Add some content in the Blog before publishing"
            );
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  // Drafting the Blog for later usage
  const handleSaveDraft = (e) => {
    if (e.target.classList.contains("disable")) {
      return;
    }

    if (!title.length) {
      return toast.error("Write the Blog Title before saving the Draft");
    }

    // Loading Notification
    let loadingToast = toast.loading("Saving Draft...");

    // Disabling the publish button
    e.target.classList.add("disable");

    if (textEditor.isReady) {
      textEditor.save().then((content) => {
        let blogObj = {
          title,
          banner,
          content,
          tags,
          desc,
          draft: true,
        };

        axios
          .post(
            import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",
            { ...blogObj, id: blog_id },
            {
              headers: {
                authorization: `Bearer ${access_token}`,
              },
            }
          )
          .then(() => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            toast.success("Draft Saved 👍");

            setTimeout(() => {
              navigate("/");
            }, 500);
          })
          .catch(({ response }) => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            return toast.error(response.data.error);
          });
      });
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="flex-none w-10">
          <img src={logo} className="w-full" />
        </Link>

        <p className="max-md:hidden text-black line-clamp-1 w-full">
          {title.length ? title : "New Blog"}
        </p>

        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={handlePublishEvent}>
            Publish
          </button>
          <button className="btn-light py-2" onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      </nav>

      <Toaster />

      <AnimationWrapper>
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            {/* Blog Banner */}
            <div className="relative aspect-video bg-white border-4 border-grey hover:opacity-80">
              <label htmlFor="uploadBanner">
                <img
                  src={banner}
                  alt="defaultbanner"
                  className="z-20"
                  onError={handleError}
                />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            {/* Blog Title */}
            <textarea
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40 overflow-y-hidden"
              onKeyDown={handleTitleKeyDown}
              onChange={handleTitleChange}
              defaultValue={title}
            ></textarea>

            <hr className="w-full opacity-10 my-5" />

            {/* Editor Component */}
            <div id="textEditor" className="font-gelasio"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;
