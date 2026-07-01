import { GlobalProvider } from '../../context/GlobalContext';
import MainLayout from '../partials/MainLayout';
import { GestionBase } from '../../components/ui/GestionBase';
import { EmpresasSection } from '../../components/ui/gestion/person/EmpresasSection';
import { PersonasUsuariosSection } from '../../components/ui/gestion/person/PersonasUsuariosSection';
import { TabConfig } from '../../features/types/person';
import '../../theme/section/management.css';

const tabs: TabConfig[] = [
    { id: 'empresas', label: 'Empresas', icon: 'fa-building' },
    { id: 'personas-usuarios', label: 'Personas & Usuarios', icon: 'fa-user-friends' }
];

function PersonManagement() {
    return (
        <GlobalProvider>
            <MainLayout>
                <div className="dc-catering-container">
                    <div className="dc-catering-header-card">
                        <div className="dc-title">
                            <h1><i className="fas fa-building"></i> Delicias Catering</h1>
                            <p>Gestión Empresas · Personas (Proveedores/Clientes/Empleados) · Usuarios</p>
                        </div>
                    </div>
                    <GestionBase tabs={tabs}>
                        <EmpresasSection data-tab="empresas" />
                        <PersonasUsuariosSection data-tab="personas-usuarios" />
                    </GestionBase>
                </div>
            </MainLayout>
        </GlobalProvider>
    );
}

export default PersonManagement;