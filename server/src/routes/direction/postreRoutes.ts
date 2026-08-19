import { Router } from 'express';
import {
    getPostres,
    getPostreById,
    createPostre,
    updatePostre,
    deletePostre,
    createBulkPostres
} from '../../controllers/postreController';

const router = Router();

router.get('/', getPostres);
router.get('/:id', getPostreById);
router.post('/', createPostre);
router.post('/bulk', createBulkPostres);
router.put('/:id', updatePostre);
router.delete('/:id', deletePostre);

export default router;