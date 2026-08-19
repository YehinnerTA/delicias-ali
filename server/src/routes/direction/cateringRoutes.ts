import { Router } from 'express';
import {
    getCateringItems,
    getCateringItemById,
    createCateringItem,
    updateCateringItem,
    deleteCateringItem,
    createBulkCateringItems
} from '../../controllers/cateringController';

const router = Router();

router.get('/', getCateringItems);
router.get('/:id', getCateringItemById);
router.post('/', createCateringItem);
router.post('/bulk', createBulkCateringItems);
router.put('/:id', updateCateringItem);
router.delete('/:id', deleteCateringItem);

export default router;