const { readdirSync } = require("fs");
const path = require("path");
const express = require('express');
const app = express();
const helmet = require('helmet');
const mongoose = require("mongoose");
require("dotenv").config();
const morgan = require("morgan");
const cors = require('cors');


// middlewares
app.use(cors(
  {origin:["https://deploy-ecom-server-mern-2-1waq.vercel.app"],
  methods:["POST","GET"],
  credentials:true,
}
));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet())


// routes middleware
readdirSync("./routes").map(r => app.use("/api/v1", require(`./routes/${r}`))) 

// server
const port = process.env.PORT || 7070;

// Connect to DB and start server
mongoose
    .connect(process.env.DATABASE)
    .then(() => {
        app.listen(port, () => {
            console.log(`Server Running on port ${port}`);
            console.log(`Database connected`);
        });
    })
    .catch((err) => console.log(err));

module.exports = app;