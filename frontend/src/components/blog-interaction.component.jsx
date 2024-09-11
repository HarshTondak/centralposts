import { toast, Toaster } from "react-hot-toast";
import { Link } from "react-router-dom";
import { useContext, useEffect } from "react";
import axios from "axios";

import { BlogContext } from "../pages/blog.page";
import { UserContext } from "../App";

const BlogInteraction = () => {
  let {
    blog: {
      _id,
      title,
      blog_id,
      activity,
      activity: { total_likes, total_comments },
      author: {
        personal_info: { username: author_username },
      },
    },
    blog,
    setBlog,
    isLikedByUser,
    setIsLikedByUser,
    setCommentsWrapperVisible,
  } = useContext(BlogContext);

  let {
    userAuth: { username, access_token },
  } = useContext(UserContext);

  useEffect(() => {
    // when the user is logged in
    if (access_token) {
      axios
        .post(
          import.meta.env.VITE_SERVER_DOMAIN + "/isliked-by-user",
          {
            _id,
          },
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        )
        .then(({ data: { result } }) => {
          setIsLikedByUser(Boolean(result));
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, []);

  const handleLike = () => {
    if (access_token) {
      setIsLikedByUser((prev) => !prev);

      !isLikedByUser ? total_likes++ : total_likes--;

      setBlog({ ...blog, activity: { ...activity, total_likes } });

      axios
        .post(
          import.meta.env.VITE_SERVER_DOMAIN + "/like-blog",
          {
            _id,
            isLikedByUser,
          },
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        )
        .then(({ data }) => {
          console.log(data);
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      toast.error("Kindly login to like this Blog");
    }
  };

  return (
    <>
      <Toaster />
      <hr className="border-grey my-2" />

      <div className="flex gap-6 justify-between">
        <div className="flex gap-3 items-center">
          {/* Like Button */}
          <div className="flex gap-3 items-center">
            <button
              className={
                "w-10 h-10 rounded-full flex items-center justify-center " +
                (isLikedByUser ? "bg-red/20 text-red" : "bg-grey/80")
              }
              onClick={handleLike}
            >
              <i
                className={
                  "fi " +
                  (isLikedByUser ? "fi-sr-heart" : "fi-rr-heart") +
                  " text-xl mt-1"
                }
              ></i>
            </button>

            <p className=" text-xl text-dark-grey">{total_likes}</p>
          </div>

          {/* Comment Button */}
          <div className="flex gap-3 items-center">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/80"
              onClick={() => setCommentsWrapperVisible((prev) => !prev)}
            >
              <i className="fi fi-rr-comment-dots text-xl mt-1"></i>
            </button>

            <p className=" text-xl text-dark-grey">{total_comments}</p>
          </div>
        </div>

        <div className="flex gap-6 items-center">
          {username === author_username ? (
            <Link
              to={`/editor/${blog_id}`}
              className="underline hover:text-purple font-bold font-mono text-xl"
            >
              EDIT
            </Link>
          ) : (
            ""
          )}

          <Link
            to={`https://twitter.com/intent/tweet?text=Read ${title}&url=${location.href}`}
            className="mt-2"
          >
            <i className="fi fi-brands-twitter text-xl hover:text-twitter"></i>
          </Link>
        </div>
      </div>

      <hr className="border-grey my-2" />
    </>
  );
};

export default BlogInteraction;
