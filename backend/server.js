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
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
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
