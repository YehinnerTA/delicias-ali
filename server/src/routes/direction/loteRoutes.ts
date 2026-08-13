import { Router } from 'express';
import {
    getLotes,
    getLotesByPostre,
    createLote,
    updateLote,
    deleteLote,
    descartarLote
} from '../../controllers/loteController';

const router = Router();

router.get('/', getLotes);
router.get('/postre/:postreId', getLotesByPostre);
router.post('/', createLote);
router.put('/:id', updateLote);
router.delete('/:id', deleteLote);
router.post('/:id/descartar', descartarLote);

export default router;