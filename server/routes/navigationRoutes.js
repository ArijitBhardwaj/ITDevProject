const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Navigation API is working!");
});

module.exports = router;
