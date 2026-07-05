import { Router } from 'express';
import {
    getVentas,
    getVentaById,
    getNextNumeroVenta,
    getCatalogoProductos,
    getClientes,
    createVenta,
    updateVenta,
    anularVenta,
    registrarDevolucion
} from '../../controllers/ventaController';

const router = Router();

router.get('/next-numero', getNextNumeroVenta);
router.get('/catalogo/productos', getCatalogoProductos);
router.get('/clientes/lista', getClientes);
router.get('/', getVentas);

router.get('/:id', getVentaById);

router.post('/', createVenta);
router.put('/:id', updateVenta);
router.put('/:id/anular', anularVenta);
router.post('/:id/devolver', registrarDevolucion);

export default router;