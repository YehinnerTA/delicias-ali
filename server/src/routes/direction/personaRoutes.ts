import { Router } from 'express';
import {
    getPersonas,
    getPersonaById,
    createPersona,
    updatePersona,
    deletePersona
} from '../../controllers/personaController';

const router = Router();

router.get('/', getPersonas);
router.get('/:id', getPersonaById);
router.post('/', createPersona);
router.put('/:id', updatePersona);
router.delete('/:id', deletePersona);

export default router;