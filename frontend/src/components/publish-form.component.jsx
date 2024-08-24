import { Toaster, toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import axios, { toFormData } from "axios";
import { useContext } from "react";

import AnimationWrapper from "../common/page-animation";
import { EditorContext } from "../pages/editor.pages";
import Tag from "./tags.component";
import { UserContext } from "../App";

const PublishForm = () => {
  const charsLimit = 200;
  const tagLimit = 10;

  const {
    blog: { title, banner, content, tags, desc },
    blog,
    setBlog,
    textEditor,
    setTextEditor,
    editorState,
    setEditorState,
  } = useContext(EditorContext);

  const {
    userAuth: { access_token },
  } = useContext(UserContext);

  const { blog_id } = useParams();

  const navigate = useNavigate();

  const handleClose = () => {
    setEditorState("editor");
  };

  // Handling Title change
  const handleBlogTitleChange = (e) => {
    let input = e.target;

    setBlog({ ...blog, title: input.value });
  };

  // Handling Description change
  const handleBlogDescChange = (e) => {
    let input = e.target;

    setBlog({ ...blog, desc: input.value });
  };

  // Preventing users from creating new lines in the Description
  const handleDescKeyDown = (e) => {
    if (e.keyCode == 13) {
      e.preventDefault();
    }
  };

  // Creating new Topic Tag whenever the user presses "enter" or "comma"
  const handleTopicsKeyDown = (e) => {
    if (e.keyCode == 13 || e.keyCode == 188) {
      e.preventDefault();
      let tag = e.target.value;

      // Check for Number of Tags
      if (tags.length < tagLimit) {
        // Check for Unique Tags
        if (!tags.includes(tag) && tag.length) {
          // Updating the Tags
          setBlog({ ...blog, tags: [...tags, tag] });

          // Resetting the Input
          e.target.value = "";
        } else {
          toast.error("Kindly add unique tags only");
        }
      } else {
        toast.error("Maximum Tags limit reached");
      }
    }
  };

  // Publishing the blog
  const publishBlog = (e) => {
    if (e.target.classList.contains("disable")) {
      return;
    }

    if (!title.length) {
      return toast.error("Write the Blog Title before publishing");
    }

    if (!desc.length) {
      return toast.error("Write the Blog Description before publishing");
    }
    if (desc.length > charsLimit) {
      return toast.error(
        `Blog Description must be less than ${charsLimit} characters`
      );
    }

    if (!tags.length) {
      return toast.error("Provide at least 1 Tag for the Blog");
    }
    if (tags.length > tagLimit) {
      return toast.error(`Maximum ${tagLimit} tags can be created for 1 Blog`);
    }

    // Loading Notification
    let loadingToast = toast.loading("Publishing...");

    // Disabling the publish button
    e.target.classList.add("disable");

    let blogObj = {
      title,
      banner,
      content,
      tags,
      desc,
      draft: false,
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
        toast.success("Blog Published 🥳");

        setTimeout(() => {
          navigate("/");
        }, 500);
      })
      .catch(({ response }) => {
        e.target.classList.remove("disable");
        toast.dismiss(loadingToast);
        return toast.error(response.data.error);
      });
  };

  return (
    <AnimationWrapper>
      <section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16 lg:gap-4">
        <Toaster />

        {/* Close Preview Button */}
        <button
          className="w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]"
          onClick={handleClose}
        >
          <i className="fi fi-rr-square-x text-2xl"></i>
        </button>

        {/* Blog Preview */}
        <div className="max-w-[550px] center">
          <p className="text-dark-grey mb-1">Preview</p>

          <div className="w-full aspect-video rounded-lg overflow-hidden bg-grey mt-4">
            <img src={banner} alt="" />
          </div>

          <h1 className="text-4xl font-medium mt-2 leading-tight line-clamp-2">
            {title}
          </h1>

          <p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">
            {desc}
          </p>
        </div>

        {/* Blog Details */}
        <div className="border-grey lg:border-1 lg:pl-8">
          {/* Title */}
          <p className="text-dark-grey mb-2 mt-9">Blog Title</p>

          <input
            type="text"
            placeholder="Blog Title"
            defaultValue={title}
            className="input-box pl-4"
            onChange={handleBlogTitleChange}
          />

          {/* Description */}
          <p className="text-dark-grey mb-2 mt-9">
            Short Description about you Blog
          </p>
          <textarea
            name=""
            id=""
            maxLength={charsLimit}
            defaultValue={desc}
            className="h-40 resize-none leading-7 input-box pl-4 placeholder:opacity-40"
            placeholder="Blog Description"
            onChange={handleBlogDescChange}
            onKeyDown={handleDescKeyDown}
          ></textarea>

          <p className="mt-1 text-dark-grey text-sm text-right">
            {charsLimit - desc.length} characters left
          </p>

          {/* Blog Topics */}
          <p className="text-dark-grey mb-2 mt-9">
            Topic (Helps in searching and ranking your Blog posts)
          </p>
          <div className="relative input-box pl-4 pt-2">
            <input
              type="text"
              placeholder="Blog Topic(s)"
              className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white"
              onKeyDown={handleTopicsKeyDown}
            />

            {tags.map((tag, i) => {
              return <Tag tag={tag} tagIndex={i} key={i} />;
            })}
          </div>

          <p className="mt-1 mb-4 text-dark-grey text-sm text-right">
            {tagLimit - tags.length} tags left
          </p>

          {/* Publish Button */}
          <button className="btn-dark px-8" onClick={publishBlog}>
            Publish
          </button>
        </div>
      </section>
    </AnimationWrapper>
  );
};

export default PublishForm;
