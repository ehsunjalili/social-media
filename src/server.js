const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');



//* Load ENV
const productionMode = process.env.NODE_ENV == 'production';
if (!productionMode) {
    dotenv.config()
}

//* Database connection
const connectToDB = async () => {
    try {
        await mongoose.connect('mongodb://root:5RZ7Aa7gj9cvxLh5hRbgFMF7@social-media:27017/social-media?authSource=admin',{
            useNewUrlParser:true,
            authSource:'admin',
        });
        console.log(`mongoDB connected successfully : ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`Error in DB connection : ${error}`);
        process.exit(1)
    }
}

const startServer = () => {
    const port = +process.env.PORT || 4005
    app.listen(port, () => {
        console.log(`Server runnig in ${process.env.NODE_ENV} mode on port ${port}`);
    })
}


const run = () => {
    startServer();
    connectToDB();
}

run()

