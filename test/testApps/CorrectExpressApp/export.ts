import express from "express";

const route = express.Router();
var count = 0;

route.get("/", (req, res, next) => {
    count += 1;
    res.send("hello! " + count);
});

route.get("/test", (req, res, next) => {
    res.send('holy crap'); 
});

route.get("/test/:more", (req, res, next) => {
    res.send(req.params.more); 
});

export default route;   
