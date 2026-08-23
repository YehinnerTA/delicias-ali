import { Router } from 'express';
import {
    getPersonas,
    getPersonaById,
    createPersona,
    updatePersona,
    deletePersona,
    searchPersonaByDocumento
} from '../../controllers/personaController';

const router = Router();

router.get('/search', searchPersonaByDocumento);
router.get('/', getPersonas);
router.get('/:id', getPersonaById);
router.post('/', createPersona);
router.put('/:id', updatePersona);
router.delete('/:id', deletePersona);

export default router;