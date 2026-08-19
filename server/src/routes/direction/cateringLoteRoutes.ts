import { Router } from 'express';
import {
    getCateringLotes,
    getCateringLotesByItem,
    createCateringLote,
    updateCateringLote,
    deleteCateringLote,
    descartarCateringLote,
    createBulkCateringLote
} from '../../controllers/cateringLoteController';

const router = Router();

router.get('/', getCateringLotes);
router.get('/item/:itemId', getCateringLotesByItem);
router.post('/', createCateringLote);
router.post('/bulk-lote', createBulkCateringLote);
router.put('/:id', updateCateringLote);
router.delete('/:id', deleteCateringLote);
router.post('/:id/descartar', descartarCateringLote);

export default router;