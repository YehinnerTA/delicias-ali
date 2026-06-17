import { IonApp, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import { SplashLoader } from './pages/security/SplashScreen';
import { Login } from './pages/security/Login';
import { RUCSelectorMenu } from './pages/selection/RUCSelectorMenu';
import Home from './pages/section/Home';
import PersonManagement from './pages/section/PersonManagement';
import InventoryManagement from './pages/section/InventoryManagement';
import SalesManagement from './pages/section/SalesManagement';
import CateringManagement from './pages/section/CateringManagement';

/* Theme variables */
import './theme/base/variables.css';
import './theme/base/global.css';

// /* Core CSS required for Ionic components to work properly */
// import '@ionic/react/css/core.css';

// /* Basic CSS for apps built with Ionic */
// import '@ionic/react/css/normalize.css';
// import '@ionic/react/css/structure.css';
// import '@ionic/react/css/typography.css';

// /* Optional CSS utils that can be commented out */
// import '@ionic/react/css/padding.css';
// import '@ionic/react/css/float-elements.css';
// import '@ionic/react/css/text-alignment.css';
// import '@ionic/react/css/text-transformation.css';
// import '@ionic/react/css/flex-utils.css';
// import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <Route path="/SplashScreen" exact={true} component={SplashLoader} />
        <Route path="/" exact={true} component={Login} />
        <Route path="/ruc-selector" exact={true} component={RUCSelectorMenu} />
        <Route path="/home" exact={true} component={Home} />
        <Route path="/person-management" exact={true} component={PersonManagement} />
        <Route path="/inventory-management" exact={true} component={InventoryManagement} />
        <Route path="/sales-management" exact={true} component={SalesManagement} />
        <Route path="/catering-management" exact={true} component={CateringManagement} />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
