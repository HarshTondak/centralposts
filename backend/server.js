import mongoose from "mongoose";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import express from "express";
import bcrypt from "bcrypt";
import cors from "cors";
import "dotenv/config";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";

import serviceAccountKey from "./blog-website-2271d-firebase-adminsdk-1vd9z-2f7202eef9.json" assert { type: "json" };

// Importing Schemas
import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js";
import Comment from "./Schema/Comment.js";
import Notification from "./Schema/Notification.js";
import { populate } from "dotenv";

let PORT = process.env.PORT || 8000;
const server = express();

server.use(express.json());
server.use(cors());

// For Enabling Google Login using Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

// Setting up AWS S3 Bucket
const s3 = new aws.S3({
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Generating names for images to be stored
const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "centralposts",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};

// Regular Expressions for Validations
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token === null) {
    return res.status(401).json({ error: "No Access Token" });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Access Token is invalid" });
    } else {
      req.user = user.id;
      next();
    }
  });
};

const formatDataToSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );
  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let isUsernameNotUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  isUsernameNotUnique ? (username += nanoid().substring(0, 5)) : "";

  return username;
};

mongoose.connect(process.env.DATABASE_URL, {
  autoIndex: true,
});

// ============================================================== SIGNUP

server.post("/signup", (req, res) => {
  const { fullname, email, password } = req.body;

  // Validating the Fullname
  if (!fullname.length) {
    return res.status(403).json({ error: "Fullname is Required!" });
  }
  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "Fullname must be at least 3 characters long." });
  }

  // Validating the Email
  if (!email.length) {
    return res.status(403).json({ error: "Email is Required!" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "Email is Invalid!" });
  }

  // Validating the Password
  if (!password.length) {
    return res.status(403).json({ error: "Password is Required!" });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "Password should be 6 to 20 characters long with a numeric, a lowercase and an uppercase letter",
    });
  }

  bcrypt.hash(password, 12, async (err, hashedPassword) => {
    let username = await generateUsername(email);

    let user = new User({
      personal_info: { fullname, email, password: hashedPassword, username },
    });

    user
      .save()
      .then((x) => {
        return res.status(200).json(formatDataToSend(x));
      })
      .catch((err) => {
        if (err.code === 11000) {
          return res.status(500).json({ error: "This Email already exists" });
        }
        return res.status(500).json({ error: err.message });
      });
  });
});

// ============================================================== SIGNIN

server.post("/signin", (req, res) => {
  const { email, password } = req.body;

  // Validating the Email
  if (!email.length) {
    return res.status(403).json({ error: "Email is Required!" });
  }

  // Validating the Password
  if (!password.length) {
    return res.status(403).json({ error: "Password is Required!" });
  }

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ error: "No such Email found" });
      }

      if (!user.google_auth) {
        // If user is not logged in with google auth
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(403)
              .json({ error: "Error occured during login, please try again!" });
          }

          if (!result) {
            return res.status(403).json({ error: "Password is Incorrect" });
          } else {
            return res.status(200).json(formatDataToSend(user));
          }
        });
      } else {
        return res.status(403).json({
          error:
            "This Email ID is already associated with Google Login. Please log in using Google.",
        });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== LOGIN with GOOGLE

server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;
  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      const { email, name } = decodedUser;

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .then((x) => {
          return x || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {
        // SignIN
        if (!user.google_auth) {
          return res.status(403).json({
            error:
              "This email was signed up without using Google. Please login with the password to access the account",
          });
        }
      } else {
        // SignUP
        let username = await generateUsername(email);

        user = new User({
          personal_info: {
            fullname: name,
            email,
            username,
          },
          google_auth: true,
        });

        await user
          .save()
          .then((x) => {
            user = x;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }

      return res.status(200).json(formatDataToSend(user));
    })
    .catch((err) => {
      return res.status(500).json({
        error:
          "Failed to authenticate you. Kindly use some ither Google account.",
      });
    });
});

// ============================================================== UPLOAD IMAGE URL

server.get("/get-upload-url", (req, res) => {
  generateUploadURL()
    .then((url) => {
      return res.status(200).json({ uploadURL: url });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCH ALL LATEST BLOGS

server.post("/latest-blogs", (req, res) => {
  const { page } = req.body;
  const maxLimit = 5;

  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title desc banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCH THE BLOGS COUNT

server.post("/all-latest-blogs-count", (req, res) => {
  Blog.countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCH ALL TRENDING BLOGS

server.get("/trending-blogs", (req, res) => {
  let maxLimit = 5;

  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({
      "activity.total_reads": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== SEARCHING THE BLOGS

server.post("/search-blogs", (req, res) => {
  let findQuery;
  const { tag, page, author, query, limit, eliminate_blog } = req.body;

  // If limit is given in the req
  const maxLimit = limit ? limit : 5;

  if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { draft: false, author };
  }

  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title desc banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCH THE BLOGS COUNT

server.post("/search-blogs-count", (req, res) => {
  let findQuery;
  const { tag, author, query } = req.body;

  if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { draft: false, author };
  }

  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== SEARCHING THE USERS

server.post("/search-users", (req, res) => {
  let { query } = req.body;

  User.find({ "personal_info.username": new RegExp(query, "i") })
    .limit(25)
    .select(
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .then((users) => {
      return res.status(200).json({ users });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCHING THE USER PROFILE

server.post("/get-profile", (req, res) => {
  let { username } = req.body;

  User.findOne({ "personal_info.username": username })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((users) => {
      return res.status(200).json(users);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCHING THE BLOG DATA

server.post("/get-blog", (req, res) => {
  const { blog_id, draft, mode } = req.body;

  let incrementVal = mode !== "edit" ? 1 : 0;

  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementVal } }
  )
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname"
    )
    .select("title desc content banner activity publishedAt blog_id tags")
    .then((blog) => {
      // Updating the read count for author too
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        { $inc: { "account_info.total_reads": incrementVal } }
      ).catch((err) => {
        return res.status(500).json({ error: err.message });
      });

      if (blog.draft && !draft) {
        return res.status(500).json({ error: "Invalid Request!!" });
      }

      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== LIKE THE BLOG

server.post("/like-blog", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id, isLikedByUser } = req.body;

  let incrementVal = !isLikedByUser ? 1 : -1;

  Blog.findOneAndUpdate(
    { _id },
    {
      $inc: { "activity.total_likes": incrementVal },
    }
  )
    .then((blog) => {
      if (!isLikedByUser) {
        let like = new Notification({
          type: "like",
          blog: _id,
          notification_for: blog.author,
          user: user_id,
        });

        like.save().then((notification) => {
          return res.status(200).json({ liked_by_user: true });
        });
      } else {
        Notification.findOneAndDelete({
          user: user_id,
          type: "like",
          blog: _id,
        })
          .then((data) => {
            return res.status(200).json({ liked_by_user: false });
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCHING THE LIKE STATE OF BLOG

server.post("/isliked-by-user", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;

  Notification.exists({ user: user_id, type: "like", blog: _id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== WRITING COMMENT ON THE BLOG

server.post("/add-comment", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { _id, comment, blog_author, replying_to } = req.body;

  if (!comment.length) {
    return res
      .status(403)
      .json({ error: "Kindly write something in the comment" });
  }

  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj).save().then(async (commentFile) => {
    let { comment, commentedAt, children } = commentFile;

    Blog.findOneAndUpdate(
      { _id },
      {
        $push: { comments: commentFile._id },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": replying_to ? 0 : 1,
        },
      }
    ).then((blog) => {
      console.log("New comment added in the blog");
    });

    let notifyObj = {
      type: replying_to ? "reply" : "comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment: commentFile._id,
    };

    if (replying_to) {
      notifyObj.replied_on_comment = replying_to;

      await Comment.findOneAndUpdate(
        { _id: replying_to },
        { $push: { children: commentFile._id } }
      ).then((replyingToComment) => {
        notifyObj.notification_for = replyingToComment.commented_by;
      });
    }

    new Notification(notifyObj)
      .save()
      .then((notify) => console.log("New notification created"));

    return res
      .status(200)
      .json({ comment, commentedAt, _id: commentFile._id, user_id, children });
  });
});

// ============================================================== FETCHING THE COMMENTS OF BLOG

server.post("/get-blog-comments", (req, res) => {
  let { blog_id, skip } = req.body;
  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username, personal_info.fullname, personal_info.profile_img"
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({ commentedAt: -1 })
    .then((comms) => {
      return res.status(200).json(comms);
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== FETCHING THE REPLIES OF A COMMENTS

server.post("/get-replies", (req, res) => {
  let { _id, skip } = req.body;
  let maxLimit = 5;

  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.username, personal_info.fullname, personal_info.profile_img",
      },
      select: "-blog_id -updatedAt",
    })
    .select("children")
    .then((doc) => {
      return res.status(200).json({ replies: doc.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

// ============================================================== DELETE THE COMMENTS

const deleteComments = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      // If comment is a reply
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        ).then((data) =>
          console.log("Comment(reply) deleted from parent comment.")
        );
      }

      // If it is a comment
      Notification.findOneAndDelete({ comment: _id }).then((notify) =>
        console.log("Comment notification deleted")
      );

      // If comment is a reply
      Notification.findOneAndDelete({ reply: _id }).then((notify) =>
        console.log("Reply notification deleted")
      );

      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: {
            "activity.total_comments": -1,
            "activity.total_parent_comments": comment.parent ? 0 : -1,
          },
        }
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((replies) => {
            deleteComments(replies);
          });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
    });
};

server.post("/delete-comment", verifyJWT, (req, res) => {
  const user_id = req.user;
  const { _id } = req.body;

  Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      // Function to delete all the replies of given comment
      deleteComments(_id);
      return res.status(200).json({ status: "success" });
    } else {
      return res
        .status(500)
        .json({ error: "You don't have the authority to delete this comment" });
    }
  });
});

// ============================================================== CHANGE THE PASSWORD FOR LOGIN

server.post("/change-password", verifyJWT, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword.length) {
    return res.status(403).json({ error: "Kindly add the Current password" });
  }
  if (!newPassword.length) {
    return res.status(403).json({ error: "Kindly add the New password" });
  }
  if (!passwordRegex.test(newPassword)) {
    return res.status(403).json({
      error:
        "Password should be 6 to 20 characters long with a numeric, a lowercase and an uppercase letter",
    });
  }
  if (currentPassword === newPassword) {
    return res
      .status(403)
      .json({ error: "New password should not match the Current password" });
  }

  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res.status(403).json({
          error:
            "Password change is not allowed for accounts registered through Google Authentication",
        });
      }

      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, response) => {
          if (err) {
            return res.status(500).json({
              error:
                "Some error occured while changing the password, Please try again later",
            });
          }
          if (!response) {
            return res
              .status(403)
              .json({ error: "Incorrect Current password" });
          }
          bcrypt.hash(newPassword, 12, (err, hashedPassword) => {
            if (err) {
              return res.status(500).json({
                error:
                  "Some error occured while changing the password, Please try again later",
              });
            }
            User.findOneAndUpdate(
              { _id: req.user },
              { "personal_info.password": hashedPassword }
            )
              .then((x) => {
                return res
                  .status(200)
                  .json({ status: "Password Updated successfully" });
              })
              .catch((err) => {
                return res.status(500).json({
                  error:
                    "Some error occured while saving new password, Please try again later",
                });
              });
          });
        }
      );
    })
    .catch((err) => {
      return res.status(500).json({
        error: "User not found",
      });
    });
});

// ============================================================== CREATE THE BLOG

server.post("/create-blog", verifyJWT, (req, res) => {
  let authorId = req.user;
  let { title, desc, banner, tags, content, draft, id } = req.body;

  // Validating the Title
  if (!title.length) {
    return res.status(403).json({ error: "Must provide the Title!" });
  }

  // When we are publishing...
  if (!draft) {
    // Validating the Desc
    if (!desc.length) {
      return res
        .status(403)
        .json({ error: "Must provide the Description for the Blog!" });
    }
    if (desc.length > 200) {
      return res.status(403).json({
        error: "Blog Description should be less than 200 characters!",
      });
    }

    // Validating the Banner Image
    if (!banner.length) {
      return res
        .status(403)
        .json({ error: "Must provide the Banner Image for the Blog!" });
    }

    // Validating the Blog Content
    if (!content.blocks.length) {
      return res
        .status(403)
        .json({ error: "Must provide some Content for the Blog!" });
    }

    // Validating the Blog tags
    if (!tags.length) {
      return res
        .status(403)
        .json({ error: "Must provide at least 1 Tag for the Blog!" });
    }
    if (tags.length > 10) {
      return res
        .status(403)
        .json({ error: "Maximum 10 Tags can be created for a Blog!" });
    }
  }

  // Make all the tags to Lowercase
  tags = tags.map((tag) => tag.toLowerCase());

  let blog_id =
    id ||
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();

  // When we are editing the existing blog:
  if (id) {
    Blog.findOneAndUpdate(
      { blog_id },
      { title, desc, banner, content, tags, draft: draft ? draft : false }
    )
      .then(() => {
        return res.status(200).json({ id: blog_id });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    let blog = new Blog({
      title,
      desc,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });

    blog
      .save()
      .then((blog) => {
        let incrementVal = draft ? 0 : 1;

        User.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": incrementVal },
            $push: { blogs: blog._id },
          }
        )
          .then((user) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ error: "Failed to update the Blog data for the author" });
          });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  }
});

server.listen(PORT, () => {
  console.log("listening on PORT: ", PORT);
});
