import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { setupIonicReact } from '@ionic/react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { CompanyProvider } from './features/company/context/CompanyContext';

/* Theme variables */
import './theme/base/variables.css';
import './theme/base/global.css';

setupIonicReact();

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <Router>
          <AppRoutes />
        </Router>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;