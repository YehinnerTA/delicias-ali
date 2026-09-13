import { Router } from 'express';
import {
    getServiceTipos,
    getServiceTipoById,
    createServiceTipo,
    updateServiceTipo,
    deleteServiceTipo
} from '../../controllers/serviceTipoController';

const router = Router();

router.get('/', getServiceTipos);
router.get('/:id', getServiceTipoById);
router.post('/', createServiceTipo);
router.put('/:id', updateServiceTipo);
router.delete('/:id', deleteServiceTipo);

export default router;