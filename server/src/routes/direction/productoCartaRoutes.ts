import { Router } from 'express';
import {
    getProductosCarta,
    getProductoCartaById,
    createProductoCarta,
    updateProductoCarta,
    deleteProductoCarta
} from '../../controllers/productoCartaController';

const router = Router();

router.get('/', getProductosCarta);
router.get('/:id', getProductoCartaById);
router.post('/', createProductoCarta);
router.put('/:id', updateProductoCarta);
router.delete('/:id', deleteProductoCarta);

export default router;