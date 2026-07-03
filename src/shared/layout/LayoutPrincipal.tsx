import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Grid, Layout, Menu, Tag, Typography } from 'antd';
import { LogoutOutlined, MenuOutlined } from '@ant-design/icons';
import { useSesion } from '@modules/auth/use-sesion';
import { colores } from '@shared/tokens';
import { itemPorRuta, navegacionPara } from './navegacion';

const { Header, Sider, Content } = Layout;

function Marca({ compacta = false }: { compacta?: boolean }): React.ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: compacta ? 0 : '0 8px' }}>
      <img src="/logo-galaxi.svg" alt="" width={32} height={32} />
      <span style={{ color: colores.white, fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
        VIDRIOS <span style={{ color: colores.cyan500 }}>GALAXI</span>
      </span>
    </div>
  );
}

export function LayoutPrincipal(): React.ReactNode {
  const { sesion, cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const pantallas = Grid.useBreakpoint();
  const esMovil = !pantallas.md;
  const [cajonAbierto, setCajonAbierto] = useState(false);

  if (!sesion) {
    return null; // RutaProtegida ya redirige; defensa de tipos
  }

  const items = navegacionPara(sesion.rol).map((item) => ({
    key: item.ruta,
    icon: item.icono,
    label: item.etiqueta,
  }));
  const seleccion = itemPorRuta(ubicacion.pathname)?.ruta ?? '/';
  const enObra = itemPorRuta(ubicacion.pathname)?.modoObra ?? false;

  const ir = (ruta: string): void => {
    navegar(ruta);
    setCajonAbierto(false);
  };

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[seleccion]}
      items={items}
      onClick={({ key }) => {
        ir(key);
      }}
      style={{ background: colores.blue800, borderInlineEnd: 'none' }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!esMovil && (
        <Sider width={240} style={{ background: colores.blue800 }}>
          <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
            <Marca compacta />
          </div>
          {menu}
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            background: colores.blue800,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {esMovil && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ color: colores.white, fontSize: 20 }} />}
              onClick={() => {
                setCajonAbierto(true);
              }}
              style={{ height: 48, width: 48 }}
            />
          )}
          {esMovil && <Marca compacta />}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {enObra && <Tag color="cyan">Modo obra</Tag>}
            <span style={{ color: colores.white, fontSize: 13 }}>
              {sesion.nombre} <Tag style={{ marginInlineStart: 4 }}>{sesion.rol}</Tag>
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined style={{ color: colores.white }} />}
              onClick={cerrarSesion}
              title="Cerrar sesión"
              style={{ height: 44, width: 44 }}
            />
          </div>
        </Header>

        <Content style={{ padding: esMovil ? 12 : 20 }}>
          <Outlet />
        </Content>

        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', fontSize: 11, padding: '4px 0 12px' }}>
          Vidrios Galaxi · {new Date().getFullYear()} · v0.1
        </Typography.Paragraph>
      </Layout>

      <Drawer
        open={esMovil && cajonAbierto}
        onClose={() => {
          setCajonAbierto(false);
        }}
        placement="left"
        width={260}
        styles={{ body: { padding: 0, background: colores.blue800 }, header: { background: colores.blue800 } }}
        title={<Marca compacta />}
        closeIcon={<span style={{ color: colores.white }}>✕</span>}
      >
        {menu}
      </Drawer>
    </Layout>
  );
}
