import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { ErrorApi } from '@shared/api/cliente';
import { colores } from '@shared/tokens';
import { useSesion } from './use-sesion';

interface CamposLogin {
  usuario: string;
  password: string;
}

export function PantallaLogin(): React.ReactNode {
  const { iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async (valores: CamposLogin): Promise<void> => {
    setCargando(true);
    setError(null);
    try {
      await iniciarSesion(valores.usuario.trim(), valores.password);
      navegar('/', { replace: true });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colores.blue800,
        padding: 16,
      }}
    >
      <Card style={{ width: 380, maxWidth: '94vw', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo-galaxi.svg" alt="Vidrios Galaxi" width={72} height={72} />
          <Typography.Title level={3} style={{ margin: '10px 0 0', color: colores.blue800 }}>
            VIDRIOS <span style={{ color: colores.cyan500 }}>GALAXI</span>
          </Typography.Title>
          <Typography.Text type="secondary">Sistema de gestión</Typography.Text>
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 14 }} />}

        <Form<CamposLogin> layout="vertical" onFinish={(v) => void entrar(v)} requiredMark={false} size="large">
          <Form.Item
            name="usuario"
            label="Usuario"
            rules={[{ required: true, message: 'Ingrese su usuario.' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Ej.: rosa" autoFocus autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Ingrese su contraseña.' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={cargando} style={{ fontSize: 17, height: 48 }}>
            Entrar
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
          Usuarios de prueba: <b>gerente</b>, <b>rosa</b> (cajera), <b>carlos</b> (vendedor) — contraseña{' '}
          <b>galaxi123</b>.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
