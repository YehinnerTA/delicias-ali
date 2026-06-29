import { Router } from 'express';
import {
    getActividad,
    createActividad
} from '../../controllers/actividadController';

const router = Router();

router.get('/', getActividad);
router.post('/', createActividad);

export default router;