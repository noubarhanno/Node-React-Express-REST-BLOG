const express = require('express');
const { body } = require('express-validator');
const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts); // remember the check will be from the left to the right

//POST /feed/post
router.post(
  "/post",
  [
    body("title")
      .trim()
      .isLength({ min: 5 }),
    body("content")
      .trim()
      .isLength({ min: 5 })
  ],
  isAuth,
  feedController.createPost
);

router.get('/posts/:postId', isAuth, feedController.getPost);

router.put('/post/:postId', [
    body("title")
      .trim()
      .isLength({ min: 5 }),
    body("content")
      .trim()
      .isLength({ min: 5 })
  ],
  isAuth,
  feedController.updatePost);

  router.delete('/post/:postId',isAuth, feedController.deletePost);

router.get('/status',isAuth, feedController.getStatus);

router.put('/status', isAuth, feedController.putStatus);

module.exports = router