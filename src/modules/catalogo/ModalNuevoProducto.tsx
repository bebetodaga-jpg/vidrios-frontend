import { useState } from 'react';
import { App, Form, InputNumber, Input, Modal, Select } from 'antd';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import {
  ETIQUETA_UNIDAD,
  Familia,
  SUBFAMILIAS,
  UnidadVenta,
  crearProducto,
} from '@shared/api/catalogo';
import { aCentimos } from '@shared/formato';

const UNIDADES_POR_FAMILIA: Record<Familia, UnidadVenta[]> = {
  VIDRIO: ['PIE2', 'M2'],
  PERFIL: ['BARRILLA_600', 'BARRILLA_640'],
  ACCESORIO: ['UNIDAD'],
};

interface CamposNuevo {
  codigo: string;
  nombre: string;
  familia: Familia;
  subfamilia: string;
  unidadVenta: UnidadVenta;
  precioSoles: number;
  stockMinimo: number;
  grosorMm?: number;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}

export function ModalNuevoProducto({ abierto, onCerrar, onCreado }: Props): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [form] = Form.useForm<CamposNuevo>();
  const [guardando, setGuardando] = useState(false);
  // Estado propio en vez de Form.useWatch: useWatch devuelve undefined en el primer
  // render (antes de aplicar initialValues) y rompía SUBFAMILIAS[familia].
  const [familia, setFamilia] = useState<Familia>('VIDRIO');

  async function guardar(valores: CamposNuevo): Promise<void> {
    if (!sesion) {
      return;
    }
    setGuardando(true);
    try {
      await crearProducto(sesion.token, {
        codigo: valores.codigo.trim(),
        nombre: valores.nombre.trim(),
        familia: valores.familia,
        subfamilia: valores.subfamilia,
        unidadVenta: valores.unidadVenta,
        precioCentimos: aCentimos(valores.precioSoles),
        stockMinimo: valores.stockMinimo,
        grosorMm: valores.familia === 'VIDRIO' ? valores.grosorMm : undefined,
      });
      message.success('Producto creado.');
      form.resetFields();
      setFamilia('VIDRIO'); // vuelve al valor inicial del formulario
      onCreado();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo crear el producto.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      title="Nuevo producto"
      open={abierto}
      onCancel={onCerrar}
      onOk={() => { form.submit(); }}
      confirmLoading={guardando}
      okText="Guardar producto"
      cancelText="Cancelar"
      destroyOnHidden
    >
      <Form<CamposNuevo>
        form={form}
        layout="vertical"
        onFinish={(v) => void guardar(v)}
        initialValues={{ familia: 'VIDRIO', unidadVenta: 'PIE2', stockMinimo: 0 }}
      >
        <Form.Item name="codigo" label="Código" rules={[{ required: true, min: 3, message: 'Mínimo 3 caracteres.' }]}>
          <Input placeholder="Ej.: 7750010" />
        </Form.Item>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3, message: 'Mínimo 3 caracteres.' }]}>
          <Input placeholder="Ej.: Vidrio templado incoloro 8 mm" />
        </Form.Item>
        <Form.Item name="familia" label="Familia" rules={[{ required: true }]}>
          <Select<Familia>
            onChange={(v) => {
              setFamilia(v);
              form.setFieldsValue({ subfamilia: undefined, unidadVenta: undefined });
            }}
            options={[
              { label: 'Vidrio', value: 'VIDRIO' },
              { label: 'Perfil de aluminio', value: 'PERFIL' },
              { label: 'Accesorio', value: 'ACCESORIO' },
            ]}
          />
        </Form.Item>
        <Form.Item name="subfamilia" label="Subfamilia" rules={[{ required: true, message: 'Elija la subfamilia.' }]}>
          <Select placeholder="Elija…" options={SUBFAMILIAS[familia].map((s) => ({ label: s, value: s }))} />
        </Form.Item>
        <Form.Item name="unidadVenta" label="Unidad de venta" rules={[{ required: true }]}>
          <Select
            options={UNIDADES_POR_FAMILIA[familia].map((u) => ({ label: ETIQUETA_UNIDAD[u], value: u }))}
          />
        </Form.Item>
        {familia === 'VIDRIO' && (
          <Form.Item name="grosorMm" label="Grosor (mm)" rules={[{ required: true, message: 'Indique el grosor.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Ej.: 8" />
          </Form.Item>
        )}
        <Form.Item
          name="precioSoles"
          label="Precio (S/, inc. IGV)"
          rules={[{ required: true, type: 'number', min: 0.1, message: 'Ingrese el precio.' }]}
        >
          <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} placeholder="0.00" />
        </Form.Item>
        <Form.Item name="stockMinimo" label="Stock mínimo (alerta)" rules={[{ required: true, type: 'number', min: 0 }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
