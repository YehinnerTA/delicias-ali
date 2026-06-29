import { Router } from 'express';
import {
    getHistorialByEntity,
    createHistorial
} from '../../controllers/historialController';

const router = Router();

router.get('/:entidad/:id_entidad', getHistorialByEntity);
router.post('/', createHistorial);

export default router;