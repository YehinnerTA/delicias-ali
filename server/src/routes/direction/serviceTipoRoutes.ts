import { Router } from 'express';
import {
    getServiceTipos,
    getServiceTipoById,
    createServiceTipo,
    updateServiceTipo,
    deleteServiceTipo,
    getProductosByTipoServicio
} from '../../controllers/serviceTipoController';

const router = Router();

router.get('/', getServiceTipos);
router.get('/:id', getServiceTipoById);
router.get('/:id/productos', getProductosByTipoServicio);
router.post('/', createServiceTipo);
router.put('/:id', updateServiceTipo);
router.delete('/:id', deleteServiceTipo);

export default router;