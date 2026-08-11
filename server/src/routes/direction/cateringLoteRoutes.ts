import { Router } from 'express';
import {
    getCateringLotes,
    getCateringLotesByItem,
    createCateringLote,
    updateCateringLote,
    deleteCateringLote
} from '../../controllers/cateringLoteController';

const router = Router();

router.get('/', getCateringLotes);
router.get('/item/:itemId', getCateringLotesByItem);
router.post('/', createCateringLote);
router.put('/:id', updateCateringLote);
router.delete('/:id', deleteCateringLote);

export default router;