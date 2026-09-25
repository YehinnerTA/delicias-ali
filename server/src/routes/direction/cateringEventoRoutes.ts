import { Router } from 'express';
import {
    getEventoFlujo,
    abrirEtapa,
    verificarItem,
    confirmarEtapa,
    reportarIncidencia,
    getMetricasEvento,
    guardarItemsChecklist,
    getChecklistVerificaciones,
    marcarItemChecklist,
    iniciarPreparacion,
    finalizarPreparacion,
    pausarPreparacion,
    getPreparaciones,
    registrarItemRecojo,
    getIncidencias,
    resolverIncidencia
} from '../../controllers/cateringEventoController';

const router = Router();

router.get('/:id/flujo', getEventoFlujo);

router.post('/:id/etapas/:etapa/abrir', abrirEtapa);
router.post('/:id/etapas/:etapa/confirmar', confirmarEtapa);

router.put('/checklist/:id_item/verificar', verificarItem);
router.post('/:id/checklist/guardar', guardarItemsChecklist);
router.get('/:id/checklist', getChecklistVerificaciones);
router.post('/:id/checklist/marcar', marcarItemChecklist);
router.post('/:id/checklist/registrar-cantidad', registrarItemRecojo);

router.post('/:id/preparacion/iniciar', iniciarPreparacion);
router.post('/:id/preparacion/finalizar', finalizarPreparacion);
router.post('/:id/preparacion/pausar', pausarPreparacion);
router.get('/:id/preparacion', getPreparaciones);

router.post('/:id/incidencias', reportarIncidencia);
router.get('/:id/incidencias', getIncidencias);
router.put('/incidencias/:id/resolver', resolverIncidencia);

router.get('/:id/metricas', getMetricasEvento);

export default router;