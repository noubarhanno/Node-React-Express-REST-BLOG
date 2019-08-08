const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const database = require('./database');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

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
    next();
});

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req,res, next) => {
    console.log(error);
    const status = error.statusCode || 500; // in case of undefined
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data:data});
});

mongoose.connect(database.getConnection(), {useNewUrlParser: true})
    .then(result => {
        console.log('conncted');
        const server = app.listen(8080);
        const io = require('./socket').init(server); // websocket is build on http and it's a protocol so we have to establish it based on the server we create on node
        io.on('connection', socket => {
            console.log('Client connected');
        })
    })
    .catch(err => console.log(err));
