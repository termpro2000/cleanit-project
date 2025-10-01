import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import ManagerBuildingRegistrationScreen from './screens/ManagerBuildingRegistrationScreen';
import SimpleDashboard from './screens/SimpleDashboard';
import ClientManagementScreen from './screens/ClientManagementScreen';
import WorkerManagementScreen from './screens/WorkerManagementScreen';
import WorkerAssignmentScreen from './screens/WorkerAssignmentScreen';
import SchedulerScreen from './screens/SchedulerScreen';
import WorkerPerformanceScreen from './screens/WorkerPerformanceScreen';
import ClientRequestManagementScreen from './screens/ClientRequestManagementScreen';
import ServiceHistoryManagementScreen from './screens/ServiceHistoryManagementScreen';
import CleaningFrequencyByBuilding from './screens/CleaningFrequencyByBuilding';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<SimpleDashboard />} />
          <Route
            path="/register-building"
            element={<ManagerBuildingRegistrationScreen />}
          />
          <Route path="/manage-clients" element={<ClientManagementScreen />} />
          <Route path="/manage-workers" element={<WorkerManagementScreen />} />
          <Route path="/assign-workers" element={<WorkerAssignmentScreen />} />
          <Route path="/scheduler" element={<SchedulerScreen />} />
          <Route
            path="/worker-performance"
            element={<WorkerPerformanceScreen />}
          />
          <Route
            path="/manage-client-requests"
            element={<ClientRequestManagementScreen />}
          />
          <Route
            path="/service-history"
            element={<ServiceHistoryManagementScreen />}
          />
          <Route
            path="/cleaning-frequency"
            element={<CleaningFrequencyByBuilding />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
