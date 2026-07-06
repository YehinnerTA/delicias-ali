import { Router } from 'express';
import { getRecetaByProducto } from '../../controllers/recetaController';

const router = Router();

router.get('/producto', getRecetaByProducto);

export default router;