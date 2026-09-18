import { Router } from 'express';
import {
    getEventoFlujo,
    abrirEtapa,
    verificarItem,
    confirmarEtapa,
    reportarIncidencia,
    getMetricasEvento
} from '../../controllers/cateringEventoController';

const router = Router();

router.get('/:id/flujo', getEventoFlujo);

router.post('/:id/etapas/:etapa/abrir', abrirEtapa);
router.post('/:id/etapas/:etapa/confirmar', confirmarEtapa);

router.put('/checklist/:id_item/verificar', verificarItem);

router.post('/:id/incidencias', reportarIncidencia);

router.get('/:id/metricas', getMetricasEvento);

export default router;