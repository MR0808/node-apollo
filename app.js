const path = require('path');
const { readFileSync } = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { ApolloServer, gql } = require('apollo-server-express');

const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');

const typeDefs = readFileSync('./graphql/schema.graphql', 'utf8');
const { Query } = require('./graphql/resolvers/Query');
const { Mutation } = require('./graphql/resolvers/Mutation');

const resolvers = {
    Query,
    Mutation
};

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.vuiwnxj.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();

const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images');
    },
    filename: function (req, file, cb) {
        const fileExt =
            '.' + file.mimetype.substring(file.mimetype.indexOf('/') + 1);
        cb(null, uuidv4() + fileExt);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(bodyParser.json()); // application/json
app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

const corsOptions = {
    origin: '*',
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not authenticated!');
    }
    if (!req.file) {
        return res.status(200).json({ message: 'No file provided!' });
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({
        message: 'File stored.',
        filePath: req.file.path.replace(/\\/g, '/')
    });
});

const startServer = async () => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req, connection, res }) => {
            return { req: req };
        }
    });
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });
};

startServer();

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
});

mongoose
    .connect(MONGODB_URI)
    .then((result) => {
        app.listen(process.env.PORT || 8080);
    })
    .catch((err) => console.log('error: ' + err));
