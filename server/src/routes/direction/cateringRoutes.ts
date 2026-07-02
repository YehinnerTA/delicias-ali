import { Router } from 'express';
import {
    getCateringItems,
    getCateringItemById,
    createCateringItem,
    updateCateringItem,
    deleteCateringItem
} from '../../controllers/cateringController';

const router = Router();

router.get('/', getCateringItems);
router.get('/:id', getCateringItemById);
router.post('/', createCateringItem);
router.put('/:id', updateCateringItem);
router.delete('/:id', deleteCateringItem);

export default router;