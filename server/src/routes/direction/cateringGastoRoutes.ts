import { Router } from 'express';
import {
    getGastosByEvento,
    getGastoById,
    getResumenGastos,
    createGasto,
    updateGasto,
    deleteGasto
} from '../../controllers/cateringGastoController';

const router = Router();

router.get('/resumen', getResumenGastos);

router.get('/', getGastosByEvento);
router.get('/:id', getGastoById);
router.post('/', createGasto);
router.put('/:id', updateGasto);
router.delete('/:id', deleteGasto);

export default router;