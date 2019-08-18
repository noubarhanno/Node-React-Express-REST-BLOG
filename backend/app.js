const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const database = require('./database');
const graphqlHttp = require('express-graphql');

const graphqlSchema = require('./grqphql/schema');
const graphqlResolver = require('./grqphql/resolvers');
const auth = require('./middleware/auth');
const { clearImage } = require('./utils/file');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname);
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
}

app.use(bodyParser.json());
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')))// this is a middle ware that will handle any request comming to /images to use the static folder rootdir/images


app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS'){
        return res.sendStatus(200); // this is to solve the issue of graphql which was rejected before because of checking the OPTIONS method 
        // first before we check PUT or PATCH or POST and the options will be graphql so in this code will not make the code fail but will send 
        // succeed code 200 to preventing the app from failing and next() here will not be reached
    }
    next();
});

app.use(auth);

app.put('/post-image', (req,res,next) => {
    if (!req.isAuth){
        throw new Error('Not authenticated');
    }
    if (!req.file){
        return res.status(200).json({message: 'No file provided'});
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({message: 'File Stored.', filePath: req.file.path});
})



app.use('/graphql', graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err){
        // originalError is the error that will be detected by graphql which is thrown by our node app
        // err is the error that will be thrown by graphql by default
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'Error Occured' // this is from graphql
        const code = err.originalError.code || 500;
        return {
            message: message, status: code, data: data
        };
    }
}))

app.use((error, req,res, next) => {
    console.log(error);
    const status = error.statusCode || 500; // in case of undefined
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data:data});
});

// app.listen(8080);

mongoose.connect(database.getConnection(), {useNewUrlParser: true})
    .then(result => {
        console.log('conncted');
        app.listen(8080);
    })
    .catch(err => console.log(err));
