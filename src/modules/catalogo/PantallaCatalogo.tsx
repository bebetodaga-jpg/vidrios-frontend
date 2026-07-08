import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import {
  ETIQUETA_FAMILIA,
  ETIQUETA_UNIDAD,
  Familia,
  ProductoCatalogo,
  actualizarPrecio,
  buscarProductos,
} from '@shared/api/catalogo';
import { consultarStock } from '@shared/api/inventario';
import { aCentimos } from '@shared/formato';
import { colores } from '@shared/tokens';
import { ModalNuevoProducto } from './ModalNuevoProducto';

type FiltroFamilia = 'TODOS' | Familia;

export function PantallaCatalogo(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [stock, setStock] = useState<Map<string, number>>(new Map());
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState('');
  const [familia, setFamilia] = useState<FiltroFamilia>('TODOS');
  const [subfamilia, setSubfamilia] = useState<string | undefined>();
  const [editando, setEditando] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState<number | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);

  const cargar = useCallback(
    async (busqueda: string): Promise<void> => {
      if (!sesion) {
        return;
      }
      setCargando(true);
      try {
        const [lista, saldos] = await Promise.all([
          buscarProductos(sesion.token, busqueda),
          consultarStock(sesion.token),
        ]);
        setProductos(lista);
        setStock(new Map(saldos.map((s) => [s.codigo, s.saldo])));
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar el catálogo.');
      } finally {
        setCargando(false);
      }
    },
    [sesion, message],
  );

  useEffect(() => {
    void cargar('');
  }, [cargar]);

  const subfamiliasDisponibles = useMemo(() => {
    const set = new Set(
      productos.filter((p) => familia === 'TODOS' || p.familia === familia).map((p) => p.subfamilia),
    );
    return [...set].sort();
  }, [productos, familia]);

  const filtrados = useMemo(
    () =>
      productos.filter(
        (p) => (familia === 'TODOS' || p.familia === familia) && (!subfamilia || p.subfamilia === subfamilia),
      ),
    [productos, familia, subfamilia],
  );

  async function guardarPrecio(codigo: string): Promise<void> {
    if (!sesion || valorEdit === null || valorEdit <= 0) {
      setEditando(null);
      return;
    }
    try {
      const { precio } = await actualizarPrecio(sesion.token, codigo, aCentimos(valorEdit));
      setProductos((antes) =>
        antes.map((p) => (p.codigo === codigo ? { ...p, precio, precioCentimos: aCentimos(valorEdit) } : p)),
      );
      message.success(`Precio actualizado: ${precio}`);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo actualizar el precio.');
    } finally {
      setEditando(null);
    }
  }

  function semaforo(p: ProductoCatalogo): React.ReactNode {
    const saldo = stock.get(p.codigo) ?? 0;
    if (saldo <= 0) {
      return <Tag color="error">AGOTADO</Tag>;
    }
    if (saldo < p.stockMinimo) {
      return <Tag color="warning">⚠ STOCK BAJO</Tag>;
    }
    return <Tag color="success">OK</Tag>;
  }

  const columnas: ColumnsType<ProductoCatalogo> = [
    { title: 'Código', dataIndex: 'codigo', width: 110, render: (c: string) => <span className="mono">{c}</span> },
    { title: 'Producto', dataIndex: 'nombre', render: (n: string) => <b>{n}</b> },
    {
      title: 'Familia',
      dataIndex: 'familia',
      width: 130,
      render: (f: Familia) => ETIQUETA_FAMILIA[f],
    },
    { title: 'Subfamilia', dataIndex: 'subfamilia', width: 120 },
    { title: 'Unidad', dataIndex: 'unidadVenta', width: 130, render: (u: ProductoCatalogo['unidadVenta']) => ETIQUETA_UNIDAD[u] },
    {
      title: 'Precio (inc. IGV)',
      dataIndex: 'precio',
      align: 'right',
      width: 150,
      render: (_: string, p: ProductoCatalogo) =>
        esGerente && editando === p.codigo ? (
          <InputNumber
            autoFocus
            size="small"
            min={0.1}
            step={0.5}
            defaultValue={p.precioCentimos / 100}
            onChange={(v) => { setValorEdit(v); }}
            onPressEnter={() => void guardarPrecio(p.codigo)}
            onBlur={() => void guardarPrecio(p.codigo)}
            style={{ width: 110 }}
          />
        ) : esGerente ? (
          <Typography.Link
            className="mono"
            onClick={() => {
              setValorEdit(p.precioCentimos / 100);
              setEditando(p.codigo);
            }}
            title="Clic para editar (solo gerente)"
          >
            {p.precio}
          </Typography.Link>
        ) : (
          <span className="mono">{p.precio}</span>
        ),
    },
    {
      title: 'Stock',
      align: 'right',
      width: 90,
      render: (_: unknown, p: ProductoCatalogo) => <span className="mono">{stock.get(p.codigo) ?? 0}</span>,
    },
    { title: 'Estado', width: 130, render: (_: unknown, p: ProductoCatalogo) => semaforo(p) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Catálogo
      </Typography.Title>

      {!esGerente && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Está viendo el catálogo en modo consulta. Solo el gerente puede crear o editar productos."
        />
      )}

      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="Buscar por nombre o código…"
          allowClear
          style={{ width: 300, maxWidth: '100%' }}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); }}
          onSearch={(v) => void cargar(v)}
        />
        <Segmented<FiltroFamilia>
          value={familia}
          onChange={(v) => {
            setFamilia(v);
            setSubfamilia(undefined);
          }}
          options={[
            { label: 'Todos', value: 'TODOS' },
            { label: 'Vidrios', value: 'VIDRIO' },
            { label: 'Perfiles', value: 'PERFIL' },
            { label: 'Accesorios', value: 'ACCESORIO' },
          ]}
        />
        <Select
          allowClear
          placeholder="Subfamilia"
          style={{ width: 180 }}
          value={subfamilia}
          onChange={(v) => { setSubfamilia(v); }}
          options={subfamiliasDisponibles.map((s) => ({ label: s, value: s }))}
        />
        {esGerente && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModalNuevo(true); }}>
            Nuevo producto
          </Button>
        )}
      </Space>

      <Table<ProductoCatalogo>
        rowKey="id"
        size="small"
        loading={cargando}
        columns={columnas}
        dataSource={filtrados}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Sin productos. Cargue su lista desde Inventario → Carga desde Excel.' }}
      />

      {esGerente && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          💡 Haga clic en un precio para editarlo (Enter guarda). El cambio se refleja al instante en el POS y el
          cotizador.
        </Typography.Paragraph>
      )}

      <ModalNuevoProducto
        abierto={modalNuevo}
        onCerrar={() => { setModalNuevo(false); }}
        onCreado={() => {
          setModalNuevo(false);
          void cargar(texto);
        }}
      />
    </div>
  );
}
