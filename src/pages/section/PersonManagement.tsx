import { GlobalProvider } from '../../context/GlobalContext';
import MainLayout from '../partials/MainLayout';
import { GestionBase } from '../../components/ui/GestionBase';
import { EmpresasSection } from '../../components/ui/gestion/person/EmpresasSection';
import { PersonasSection } from '../../components/ui/gestion/person/PersonasSection';
import { UsuariosSection } from '../../components/ui/gestion/person/UsuariosSection';
import { TabConfig } from '../../features/types/person';

const tabs: TabConfig[] = [
    { id: 'empresas', label: 'Empresas', icon: 'fa-building' },
    { id: 'personas', label: 'Personas', icon: 'fa-users' },
    { id: 'usuarios', label: 'Usuarios', icon: 'fa-user-lock' }
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
                        <PersonasSection data-tab="personas" />
                        <UsuariosSection data-tab="usuarios" />
                    </GestionBase>
                </div>
            </MainLayout>
        </GlobalProvider>
    );
}

export default PersonManagement;