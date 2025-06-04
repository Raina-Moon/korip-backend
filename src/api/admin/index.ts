import express from 'express';
import userRouter from './user';
import lodgeRouter from './lodge';

const router = express.Router();

router.use('/user',userRouter)
router.use('/lodge',lodgeRouter)

export default router;