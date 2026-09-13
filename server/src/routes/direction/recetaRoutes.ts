import { Router } from 'express';
import {
    getRecetas,
    getRecetaById,
    createReceta,
    updateReceta,
    deleteReceta,
    getRecetaByProducto
} from '../../controllers/recetaController';

const router = Router();

router.get('/producto', getRecetaByProducto);
router.get('/', getRecetas);
router.get('/:id', getRecetaById);
router.post('/', createReceta);
router.put('/:id', updateReceta);
router.delete('/:id', deleteReceta);

export default router;