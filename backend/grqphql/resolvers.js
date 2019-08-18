const User = require('../models/user');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const Post = require('../models/post');
const { clearImage } = require('../utils/file');

module.exports = {
    // args will be the userInput object and here we destructed to { userInput }
    createUser: async function({ userInput }, req) {
        const errors = [];
        if (!validator.isEmail(userInput.email)){
            errors.push({
                message: 'email is invalid'
            })
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, {min: 5})){
            errors.push({message: 'password too short'});
        }
        if (errors.length>0){
            const error = new Error('User Input is Invalid');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const existingUser = await User.findOne({email: userInput.email});
        if (existingUser){
            const error = new Error('User Exist already');
            throw error;
        }
        
        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User ({
            email: userInput.email,
            name: userInput.name,
            password: hashedPassword
        });
        const createdUser = await user.save();
        return {...createdUser._doc, _id: createdUser._id.toString()}
    },
    login: async function({email, password}){
        const user = await User.findOne({email: email});
        if (!user){
            const error = new Error('User not found');
            error.code = 401;
            throw error
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual){
            const error = new Error('Incorrect password');
            error.code = 401;
            throw error
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email,
        }, 'somesupersecrectsecret', {expiresIn: '1h'})
        return {token: token, userId: user._id.toString()}
    },
    createPost: async function({ postInput }, req){
        if (!req.isAuth){
            const error = new Error('Not Authenticated');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title,{min: 5})){
            errors.push({message: 'Title is invalid'})
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content,{min: 5})){
            errors.push({message: 'Content is invalid'})
        }
        if(errors.
            length>0){
            const error = new Error('Invalid input.');
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user){
            const error = new Error('Invalid User');
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
          ...createdPost._doc,
          _id: createdPost._id.toString(),
          createdAt: createdPost.createdAt.toISOString(),
          updatedAt: createdPost.updatedAt.toISOString()
        };
    },
    posts: async function({page}, req) {
        if(!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        if (!page){
            page = 1;
        }
        const perPage = 2;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find().sort({createdAt: -1}).skip((page-1) * perPage).limit(perPage).populate('creator');
        return {posts: posts.map(p => {
            return {
              ...p._doc,
              _id: p._id.toString(),
              createdAt: p.createdAt.toString(),
              updatedAt: p.updatedAt.toString()
            };
        }), totalPosts: totalPosts};
    },
    post: async function({postId}, req){
        if (!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(postId).populate('creator');
        if (!post){
            const error = new Error('Post not Found');
            error.code = 401;
            throw error;
        }
        return {...post._doc, _id: post._id.toString(), createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString()}
    },
    updatePost: async function({id, postInput}, req){
        if (!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post){
            const error = new Error('Post not Found');
            error.code = 401;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId.toString()){
            const error = new Error('Not Authorized');
            error.code = 403;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title,{min: 5})){
            errors.push({message: 'Title is invalid'})
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content,{min: 5})){
            errors.push({message: 'Content is invalid'})
        }
        if(errors.
            length>0){
            const error = new Error('Invalid input.');
            error.code = 422;
            throw error;
        }
        post.title = postInput.title;
        post.content = postInput.content;
        if (postInput.imageUrl !== 'undefined'){ // we checked undefined as a text because it will be returned as a string from the frontend
            post.imageUrl = postInput.imageUrl;
        }
        const updatePost = await post.save();
        return { ...updatePost._doc, id: updatePost._id.toString(), createdAt: updatePost.createdAt.toISOString(), updatedAt: updatePost.updatedAt.toISOString()}

    },
    deletePost: async function({id}, req){
        if (!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id);
        if (!post){
            const error = new Error('Post not Found');
            error.code = 401;
            throw error;
        }
        // we didn't use post.creator._id because in the database the creator is the id 
        // in order to make it creator._id we need to populate Post.findById(id).populate('creator')
        if (post.creator.toString() !== req.userId.toString()){
            const error = new Error('Not Authorized');
            error.code = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(id);
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        return true;
    },
    user: async function(args, req){
        if (!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if(!user){
            const error = new Error('No user found');
            error.code = 404;
            throw error;
        }
        return { ...user._doc, _id: user._id.toString()}
    },
    updateStatus: async function({status}, req){
        if (!req.isAuth){
            const error = new Error('User is not Authenticated');
            error.code = 401;
            throw error;
        }
        const user = await User.findByIdAndUpdate(req.userId,{status: status});
        return {
            ...user._doc, _id: user._id.toString()
        }
    }  
}