import { Router } from 'express';
import * as userController from './users.controller';

const router = Router();

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);

export { router as userRoutes };
