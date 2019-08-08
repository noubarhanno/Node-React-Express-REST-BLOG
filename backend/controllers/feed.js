const { validationResult } = require("express-validator");
const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const User = require('../models/user');


// asynchronise with then and catch
// exports.getPosts = (req, res, next) => {
//   const currentPage = req.query.page || 1;
//   const perPage = 2;
//   let totalItems;
//   Post.find()
//     .countDocuments()
//     .then(count => {
//       totalItems = count;
//       return Post.find()
//         .skip((currentPage - 1) * perPage)
//         .limit(perPage);
//     })
//     .then(posts => {
//       res
//         .status(200)
//         .json({
//           message: "Fetched posts successfuly",
//           posts: posts,
//           totalItems: totalItems
//         });
//     })
//     .catch(err => {
//       if (!err.statusCode) {
//         err.statusCode = 500;
//       }
//       next(err);
//     });
// };

//asynchronise using async and await
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: "Fetched posts successfuly",
      posts: posts,
      totalItems: totalItems
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed, entered data is incorrect");
      error.statusCode = 422;
      throw error;
    }
    if (!req.file) {
      const error = new Error("No Image Provided");
      error.statusCode = 422;
      throw error;
    }
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId // mongoose will create the object
    });
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post); // mongoose will take care of pulling the post Id
    await user.save();
    res.status(201).json({
      message: "Post created successfuly",
      post: post,
      creator: { _id: user._id, name: user.name }
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post fetched.", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error("No file picked");
    error.statusCode = 422;
    throw error;
  }
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId){
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.imageUrl = imageUrl;
      post.content = content;
      return post.save();
    })
    .then(result => {
      res.status(200).json({ message: "Post updated!", post: result });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then(post => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId){
        const error = new Error('Not Authorized');
        error.statusCode = 403;
        throw error;
      }
      clearImage(post.imageUrl);
      return Post.findByIdAndDelete(postId);
    })
    .then(result => {
      return User.findById(req.userId);
    })
    .then(user => {
      user.posts.pull(postId) // to remove from relational document
      return user.save();
    })
    .then(result => {
      res.status(200).json({ message: "Deleted post." });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getStatus = (req,res,next) => {
  User.findById(req.userId)
    .then(user => {
      if (!user){
        const error = new Error('Not Exist');
        error.statusCode = 404;
        throw error
      }
      const status = user.status;
      res.status(200).json({status: status})
    })
    .catch(err => {
      if (!err.statusCode){
        err.statusCode = 500;
      }
      next(err);
    })
}

exports.putStatus = (req,res,next) => {
  const status = req.body.status;
  console.log(req.body);
  User.findById(req.userId)
    .then(user => {
      if (!user){
        const error = new Error('User Not Exist');
        error.statusCode = 404;
        throw error
      }
      user.status=status;
      return user.save()
    })
    .then(result => {
      res.status(200).json({message: 'Status Updated Successfuly'});
    })
    .catch(err => {
      if (!err.statusCode){
        err.statusCode = 500;
      }
      next(err);
    })
}

const clearImage = filePath => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, err => console.log(err));
};
