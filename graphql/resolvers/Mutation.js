const bcrypt = require('bcryptjs');
const validator = require('validator');

const User = require('../../models/user');
const Post = require('../../models/post');

const { clearImage } = require('../../util/file');
const { authCheck } = require('../../util/user');

const Mutation = {
    async createUser(parent, { userInput }) {
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: 'Email is invalid.' });
        }
        if (
            validator.isEmpty(userInput.password) ||
            !validator.isLength(userInput.password, { min: 5 })
        ) {
            errors.push({ message: 'Password too short.' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input!');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        try {
            const existingUser = await User.findOne({ email: userInput.email });
            if (existingUser) {
                const error = new Error('User exists already!');
                throw error;
            }
            // try {
            const hashedPw = await bcrypt.hash(userInput.password, 12);
            const user = new User({
                email: userInput.email,
                password: hashedPw,
                name: userInput.name
            });
            const createdUser = await user.save();
            return { ...createdUser._doc, _id: createdUser._id.toString() };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async createPost(parent, { postInput }, { req }) {
        authCheck(req);
        const errors = [];
        if (
            validator.isEmpty(postInput.title) ||
            !validator.isLength(postInput.title, { min: 5 })
        ) {
            errors.push({ message: 'Title too short.' });
        }
        if (
            validator.isEmpty(postInput.content) ||
            !validator.isLength(postInput.content, { min: 5 })
        ) {
            errors.push({ message: 'Title too short.' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input!');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const error = new Error('Invalid user!');
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
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async updatePost(parent, { id, postInput }, { req }) {
        authCheck(req);
        const errors = [];
        if (
            validator.isEmpty(postInput.title) ||
            !validator.isLength(postInput.title, { min: 5 })
        ) {
            errors.push({ message: 'Title too short.' });
        }
        if (
            validator.isEmpty(postInput.content) ||
            !validator.isLength(postInput.content, { min: 5 })
        ) {
            errors.push({ message: 'Title too short.' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input!');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        try {
            const post = await Post.findById(id).populate('creator');
            if (!post) {
                const error = new Error('Could not find post.');
                error.code = 404;
                throw error;
            }
            if (post.creator._id.toString() !== req.userId.toString()) {
                const error = new Error('Not authorized!');
                error.code = 403;
                throw error;
            }
            if (postInput.imageUrl !== 'undefined') {
                post.imageUrl = postInput.imageUrl;
            }
            post.title = postInput.title;
            post.content = postInput.content;
            const updatedPost = await post.save();
            return {
                ...updatedPost._doc,
                _id: updatedPost._id.toString(),
                createdAt: updatedPost.createdAt.toISOString(),
                updatedAt: updatedPost.updatedAt.toISOString()
            };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async deletePost(parent, { id }, { req }) {
        authCheck(req);
        try {
            const post = await Post.findById(id);
            if (!post) {
                const error = new Error('Could not find post.');
                error.code = 404;
                throw error;
            }
            if (post.creator.toString() !== req.userId.toString()) {
                const error = new Error('Not authorized!');
                error.code = 403;
                throw error;
            }
            clearImage(post.imageUrl);
            await Post.findByIdAndDelete(id);
            const user = await User.findById(req.userId);
            user.posts.pull(id);
            await user.save();
            return true;
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async updateStatus(parent, { status }, { req }) {
        authCheck(req);
        const errors = [];
        if (validator.isEmpty(status)) {
            errors.push({ message: 'Must enter a status.' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input!');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const error = new Error('Could not find user.');
                error.statusCode = 404;
                throw error;
            }
            user.status = status;
            await user.save();
            return { ...user._doc, _id: user._id.toString() };
        } catch (err) {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        }
    }
};

exports.Mutation = Mutation;
