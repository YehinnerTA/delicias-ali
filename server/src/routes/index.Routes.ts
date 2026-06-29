import { Router } from 'express';
import empresaRoutes from './direction/empresaRoutes';
import personaRoutes from './direction/personaRoutes';
import usuarioRoutes from './direction/usuarioRoutes';
import actividadRoutes from './direction/actividadRoutes';
import historialRoutes from './direction/historialRoutes';
import authRoutes from './direction/authRoutes';

const router = Router();

router.use('/empresas', empresaRoutes);
router.use('/personas', personaRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/actividad', actividadRoutes);
router.use('/historial', historialRoutes);
router.use('/auth', authRoutes);

export default router;