import express from 'express';

const router = express.Router();

router.post('/signup', (req,res) => {
    const {nickname,email,password} = req.body;
    if (nickname && email && password) {
        res.status(200).json({
            message: 'User authenticated successfully',})
    }
    else {
        res.status(400).json({
            message: 'Missing required fields: nickname, email, or password',
        });
    }
    
})