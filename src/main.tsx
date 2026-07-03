import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import 'antd/dist/reset.css';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { temaGalaxi } from '@shared/theme';
import { SesionProvider } from '@modules/auth/SesionProvider';
import { App } from './App';
import './estilos-base.css';

dayjs.locale('es');

const contenedor = document.getElementById('root');
if (!contenedor) {
  throw new Error('No se encontró el contenedor #root.');
}

createRoot(contenedor).render(
  <StrictMode>
    <ConfigProvider theme={temaGalaxi} locale={esES}>
      <AntApp>
        <SesionProvider>
          <App />
        </SesionProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
