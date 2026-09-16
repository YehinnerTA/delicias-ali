import { Router } from 'express';
import {
    getIngredientes,
    getIngredienteById,
    createIngrediente,
    updateIngrediente,
    deleteIngrediente,
    sincronizarProveedoresPorCategoria
} from '../../controllers/ingredienteController';

const router = Router();

router.get('/', getIngredientes);
router.get('/:id', getIngredienteById);
router.post('/', createIngrediente);
router.put('/:id', updateIngrediente);
router.delete('/:id', deleteIngrediente);
router.post('/:id/sincronizar-proveedores-categoria', sincronizarProveedoresPorCategoria);

export default router;