import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { setupIonicReact } from '@ionic/react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

/* Theme variables */
import './theme/base/variables.css';
import './theme/base/global.css';

setupIonicReact();

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;