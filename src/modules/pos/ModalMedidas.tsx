import { useEffect, useState } from 'react';
import { Col, InputNumber, Modal, Row, Statistic } from 'antd';
import { ETIQUETA_UNIDAD, ProductoCatalogo } from '@shared/api/catalogo';
import { areaEnUnidad, importeCentimos } from './calculo-pos';
import { aDecimalDeCm, soles } from '@shared/formato';

interface Props {
  producto: ProductoCatalogo | null; // abierto cuando != null
  onCerrar: () => void;
  onAgregar: (anchoCm: number, altoCm: number, cantidad: number) => void;
}

/** Mini-modal de venta por área: ancho × alto en cm + cantidad, con m²/pie² y precio en vivo. */
export function ModalMedidas({ producto, onCerrar, onAgregar }: Props): React.ReactNode {
  const [ancho, setAncho] = useState(100);
  const [alto, setAlto] = useState(100);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (producto) {
      setAncho(100);
      setAlto(100);
      setCantidad(1);
    }
  }, [producto]);

  if (!producto) {
    return null;
  }

  const area = areaEnUnidad(producto.unidadVenta, ancho, alto);
  const total = importeCentimos(producto.unidadVenta, producto.precioCentimos, cantidad, ancho, alto);
  const unidad = ETIQUETA_UNIDAD[producto.unidadVenta];

  function confirmar(): void {
    if (ancho > 0 && alto > 0 && cantidad > 0) {
      onAgregar(ancho, alto, cantidad);
    }
  }

  return (
    <Modal
      title={producto.nombre}
      open
      onCancel={onCerrar}
      onOk={confirmar}
      okText="Agregar"
      cancelText="Cancelar"
      width={460}
    >
      <Row gutter={10}>
        <Col span={8}>
          Ancho (cm)
          <InputNumber autoFocus min={1} step={0.1} value={ancho} onChange={(v) => { setAncho(aDecimalDeCm(v)); }} style={{ width: '100%' }} onPressEnter={confirmar} />
        </Col>
        <Col span={8}>
          Alto (cm)
          <InputNumber min={1} step={0.1} value={alto} onChange={(v) => { setAlto(aDecimalDeCm(v)); }} style={{ width: '100%' }} onPressEnter={confirmar} />
        </Col>
        <Col span={8}>
          Cantidad
          <InputNumber min={1} value={cantidad} onChange={(v) => { setCantidad(v ?? 1); }} style={{ width: '100%' }} onPressEnter={confirmar} />
        </Col>
      </Row>
      <Row gutter={10} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Statistic title={`Área (${unidad})`} value={area * cantidad} precision={2} />
        </Col>
        <Col span={12}>
          <Statistic title="Importe (inc. IGV)" value={soles(total)} />
        </Col>
      </Row>
    </Modal>
  );
}
