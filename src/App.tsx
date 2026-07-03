import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PantallaLogin } from '@modules/auth/PantallaLogin';
import { PantallaInicio } from '@modules/inicio/PantallaInicio';
import { PantallaModulo } from '@modules/inicio/PantallaModulo';
import { PantallaCatalogo } from '@modules/catalogo/PantallaCatalogo';
import { PantallaInventario } from '@modules/inventario/PantallaInventario';
import { PantallaPos } from '@modules/pos/PantallaPos';
import { PantallaCaja } from '@modules/caja/PantallaCaja';
import { PantallaFacturacion } from '@modules/facturacion/PantallaFacturacion';
import { PantallaObras } from '@modules/obras/PantallaObras';
import { PantallaCotizador } from '@modules/cotizaciones/PantallaCotizador';
import { PantallaContratos } from '@modules/contratos/PantallaContratos';
import { PantallaPersonal } from '@modules/personal/PantallaPersonal';
import { PantallaProduccion } from '@modules/produccion/PantallaProduccion';
import { PantallaReportes } from '@modules/reportes/PantallaReportes';
import { LayoutPrincipal } from '@shared/layout/LayoutPrincipal';
import { RutaProtegida } from '@shared/layout/RutaProtegida';
import { NAVEGACION } from '@shared/layout/navegacion';

// Módulos con pantalla propia ya implementada; el resto usa el placeholder por sprint.
const PANTALLAS: Record<string, React.ReactNode> = {
  pos: <PantallaPos />,
  caja: <PantallaCaja />,
  facturacion: <PantallaFacturacion />,
  catalogo: <PantallaCatalogo />,
  inventario: <PantallaInventario />,
  obras: <PantallaObras />,
  cotizaciones: <PantallaCotizador />,
  contratos: <PantallaContratos />,
  personal: <PantallaPersonal />,
  produccion: <PantallaProduccion />,
  reportes: <PantallaReportes />,
};

export function App(): React.ReactNode {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PantallaLogin />} />
        <Route
          path="/"
          element={
            <RutaProtegida>
              <LayoutPrincipal />
            </RutaProtegida>
          }
        >
          <Route index element={<PantallaInicio />} />
          {NAVEGACION.filter((item) => item.clave !== 'inicio').map((item) => (
            <Route key={item.clave} path={item.ruta.slice(1)} element={PANTALLAS[item.clave] ?? <PantallaModulo />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
