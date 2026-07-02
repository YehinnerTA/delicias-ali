import { Router } from 'express';
import {
    getPostres,
    getPostreById,
    createPostre,
    updatePostre,
    deletePostre
} from '../../controllers/postreController';

const router = Router();

router.get('/', getPostres);
router.get('/:id', getPostreById);
router.post('/', createPostre);
router.put('/:id', updatePostre);
router.delete('/:id', deletePostre);

export default router;