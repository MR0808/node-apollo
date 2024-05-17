const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../../models/user');
const Post = require('../../models/post');

const { authCheck } = require('../../util/user');

const Query = {
    async login(parent, { email, password }) {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                const error = new Error('User not found');
                error.code = 401;
                throw error;
            }
            const isEqual = await bcrypt.compare(password, user.password);
            if (!isEqual) {
                const error = new Error('Wrong password');
                error.code = 401;
                throw error;
            }
            const token = jwt.sign(
                {
                    email: user.email,
                    userId: user._id.toString()
                },
                'somesupersecretsecret',
                { expiresIn: '1h' }
            );
            return { token: token, userId: user._id.toString() };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async posts(parent, { page }, { req }) {
        authCheck(req);
        if (!page) {
            page = 1;
        }
        const perPage = 2;
        try {
            const totalPosts = await Post.find().countDocuments();
            const posts = await Post.find()
                .populate('creator')
                .skip((page - 1) * perPage)
                .limit(perPage)
                .sort({ createdAt: -1 });
            return {
                posts: posts.map((p) => {
                    return {
                        ...p._doc,
                        _id: p._id.toString(),
                        createdAt: p.createdAt.toISOString(),
                        updatedAt: p.updatedAt.toISOString()
                    };
                }),
                totalPosts: totalPosts
            };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async post(parent, { id }, { req }) {
        authCheck(req);
        try {
            const post = await Post.findById(id).populate('creator');
            if (!post) {
                const error = new Error('Could not find post.');
                error.code = 404;
                throw error;
            }
            return {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString()
            };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    },
    async user(parent, args, { req }) {
        authCheck(req);
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }
            return { ...user._doc, _id: user._id.toString() };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    }
};

exports.Query = Query;
