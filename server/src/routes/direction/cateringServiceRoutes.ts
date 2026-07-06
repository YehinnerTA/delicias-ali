import { Router } from 'express';
import {
    getVentasCatering,
    getVentaCateringById,
    getNextNumeroVentaCatering,
    getCatalogosCatering,
    createVentaCatering,
    updateVentaCatering,
    anularVentaCatering,
    registrarDevolucionCatering
} from '../../controllers/cateringServiceController';

const router = Router();

router.get('/', getVentasCatering);
router.get('/next-numero', getNextNumeroVentaCatering);
router.get('/catalogos', getCatalogosCatering);

router.get('/:id', getVentaCateringById);
router.post('/', createVentaCatering);
router.put('/:id', updateVentaCatering);
router.put('/:id/anular', anularVentaCatering);
router.post('/:id/devolver', registrarDevolucionCatering);

export default router;