import { useEffect, useState } from 'react';
import { App, Button, Col, InputNumber, Input, Modal, Row, Select, Switch, Upload } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { TIPOS_TRABAJO } from '@shared/api/obras';
import { guardarPendiente } from './almacen-local';

interface Props {
  obraId: string;
  ambienteId: string;
  codigoSugerido: string;
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: () => void;
}

/** Captura de un vano en campo: se guarda en el teléfono al instante (offline-first). */
export function ModalMedirVano({ obraId, ambienteId, codigoSugerido, abierto, onCerrar, onGuardado }: Props): React.ReactNode {
  const { message } = App.useApp();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState(TIPOS_TRABAJO[0]);
  const [ancho, setAncho] = useState(100);
  const [alto, setAlto] = useState(100);
  const [cantidad, setCantidad] = useState(1);
  const [tieneDetalle, setTieneDetalle] = useState(false);
  const [hayFoto, setHayFoto] = useState(false);

  useEffect(() => {
    if (abierto) {
      setNombre('');
      setTipo(TIPOS_TRABAJO[0]);
      setAncho(100);
      setAlto(100);
      setCantidad(1);
      setTieneDetalle(false);
      setHayFoto(false);
    }
  }, [abierto]);

  function guardar(): void {
    if (nombre.trim().length < 2) {
      message.warning('Indique el nombre del vano.');
      return;
    }
    if (!ancho || !alto) {
      message.warning('Ingrese ancho y alto en cm.');
      return;
    }
    if (tieneDetalle && !hayFoto) {
      message.warning('Este vano tiene detalle: la foto es obligatoria.');
      return;
    }
    guardarPendiente({
      obraId,
      ambienteId,
      id: crypto.randomUUID(),
      codigo: codigoSugerido,
      nombre: nombre.trim(),
      tipo,
      cantidad,
      tieneDetalle,
      fotoUrl: hayFoto ? 'local://foto-capturada' : undefined,
      medidas: [{ id: crypto.randomUUID(), tipo: 'INICIAL', anchoCm: ancho, altoCm: alto }],
    });
    message.success('Vano guardado en el teléfono.');
    onGuardado();
  }

  return (
    <Modal title={`Medir vano (${codigoSugerido})`} open={abierto} onCancel={onCerrar} onOk={guardar} okText="Guardar medida" cancelText="Cancelar">
      <div style={{ marginBottom: 8 }}>Nombre del vano</div>
      <Input value={nombre} onChange={(e) => { setNombre(e.target.value); }} placeholder="Ej.: Ventana frontal" style={{ marginBottom: 12 }} size="large" />
      <div style={{ marginBottom: 8 }}>Tipo de trabajo</div>
      <Select value={tipo} onChange={(v) => { setTipo(v); }} options={TIPOS_TRABAJO.map((t) => ({ label: t, value: t }))} style={{ width: '100%', marginBottom: 12 }} size="large" />
      <Row gutter={10} style={{ marginBottom: 12 }}>
        <Col span={8}>
          Ancho (cm)
          <InputNumber min={1} value={ancho} onChange={(v) => { setAncho(v ?? 0); }} style={{ width: '100%' }} size="large" />
        </Col>
        <Col span={8}>
          Alto (cm)
          <InputNumber min={1} value={alto} onChange={(v) => { setAlto(v ?? 0); }} style={{ width: '100%' }} size="large" />
        </Col>
        <Col span={8}>
          Cantidad
          <InputNumber min={1} value={cantidad} onChange={(v) => { setCantidad(v ?? 1); }} style={{ width: '100%' }} size="large" />
        </Col>
      </Row>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Switch checked={tieneDetalle} onChange={setTieneDetalle} />
        <span>El trabajo tiene detalle {tieneDetalle && <b style={{ color: '#C53030' }}>→ foto obligatoria</b>}</span>
      </div>
      <Upload
        accept="image/*"
        maxCount={1}
        beforeUpload={() => {
          setHayFoto(true);
          return false; // la subida real a S3 se hace en el Sprint 7; aquí solo se marca
        }}
        showUploadList={{ showRemoveIcon: false }}
      >
        <Button icon={<CameraOutlined />} size="large">
          {hayFoto ? '✓ Foto capturada' : 'Tomar foto del vano'}
        </Button>
      </Upload>
    </Modal>
  );
}
