import React from 'react';
import { DataSourceManager } from './DataSourceManager';

export const PrometheusGrafanaConfig: React.FC = () => {
  return <DataSourceManager initialSubTab="targets" />;
};

export default PrometheusGrafanaConfig;
