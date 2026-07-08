import { useState } from 'react';
import { App, Alert, Button, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ETIQUETA_UNIDAD, FilaCarga, ReporteCarga, cargaMasiva } from '@shared/api/catalogo';
import { soles } from '@shared/formato';
import { FilaMapeada, RegistroExcel, mapearFila } from './mapeo-excel';

interface VistaFila {
  fila: number;
  codigo: string;
  nombre: string;
  detalle: string;
  ok: boolean;
  mensaje?: string;
}

function aVista(m: FilaMapeada): VistaFila {
  if (m.ok) {
    return {
      fila: m.fila.fila,
      codigo: m.fila.codigo,
      nombre: m.fila.nombre,
      detalle: `${ETIQUETA_UNIDAD[m.fila.unidadVenta]} · ${soles(m.fila.precioCentimos)}`,
      ok: true,
    };
  }
  return { fila: m.error.fila, codigo: m.error.codigo, nombre: '', detalle: '', ok: false, mensaje: m.error.mensaje };
}

export function TabCargaExcel(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [mapeadas, setMapeadas] = useState<FilaMapeada[]>([]);
  const [reporte, setReporte] = useState<ReporteCarga | null>(null);
  const [importando, setImportando] = useState(false);

  async function leerArchivo(archivo: RcFile): Promise<void> {
    try {
      const XLSX = await import('xlsx'); // carga diferida: xlsx es pesado, solo cuando se usa
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const registros = XLSX.utils.sheet_to_json<RegistroExcel>(hoja, { defval: '' });
      if (registros.length === 0) {
        message.warning('El archivo no tiene filas de datos.');
        return;
      }
      // La fila 1 del Excel es el encabezado; los datos empiezan en la fila 2.
      setMapeadas(registros.map((reg, i) => mapearFila(reg, i + 2)));
      setReporte(null);
    } catch {
      message.error('No se pudo leer el archivo. Verifique que sea un Excel válido.');
    }
  }

  async function importar(): Promise<void> {
    if (!sesion) {
      return;
    }
    const validas: FilaCarga[] = mapeadas.filter((m): m is Extract<FilaMapeada, { ok: true }> => m.ok).map((m) => m.fila);
    if (validas.length === 0) {
      message.warning('No hay filas válidas para importar.');
      return;
    }
    setImportando(true);
    try {
      setReporte(await cargaMasiva(sesion.token, validas));
      message.success('Importación procesada.');
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo importar.');
    } finally {
      setImportando(false);
    }
  }

  async function descargarPlantilla(): Promise<void> {
    const XLSX = await import('xlsx');
    const ejemplo = [
      { Código: '7750010', Producto: 'Vidrio reflejante azul 6 mm', Familia: 'Vidrio', Subfamilia: 'Reflejante', Unidad: 'pie²', Precio: 7.2, 'Stock mínimo': 4, Grosor: 6 },
      { Código: '7751010', Producto: 'Perfil tubo cuadrado 1"', Familia: 'Perfil', Subfamilia: 'Tubulares', Unidad: 'barrilla 6.00 m', Precio: 32, 'Stock mínimo': 10, Grosor: '' },
      { Código: '7752010', Producto: 'Brocha de felpa adhesiva', Familia: 'Accesorio', Subfamilia: 'Felpas y tornillería', Unidad: 'unidad', Precio: 1.2, 'Stock mínimo': 50, Grosor: '' },
    ];
    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Catálogo');
    XLSX.writeFile(libro, 'plantilla-catalogo-galaxi.xlsx');
  }

  const validas = mapeadas.filter((m) => m.ok).length;
  const conError = mapeadas.length - validas;

  const columnas: ColumnsType<VistaFila> = [
    { title: 'Fila', dataIndex: 'fila', width: 60 },
    { title: 'Código', dataIndex: 'codigo', width: 110, render: (c: string) => <span className="mono">{c}</span> },
    { title: 'Producto', dataIndex: 'nombre' },
    { title: 'Detalle', dataIndex: 'detalle', render: (d: string) => <span className="mono">{d}</span> },
    {
      title: 'Estado',
      render: (_: unknown, v: VistaFila) =>
        v.ok ? (
          <Tag color="success">✓ Lista</Tag>
        ) : (
          <span style={{ color: '#C53030' }}>
            <Tag color="error">✕</Tag>
            {v.mensaje}
          </span>
        ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} onClick={() => void descargarPlantilla()}>
          Descargar plantilla
        </Button>
      </Space>

      <Upload.Dragger
        accept=".xlsx,.xls,.csv"
        multiple={false}
        showUploadList={false}
        beforeUpload={(archivo) => {
          void leerArchivo(archivo);
          return false; // no subir automáticamente; lo parseamos en el cliente
        }}
        style={{ marginBottom: 16 }}
      >
        <p style={{ fontSize: 38, margin: 0 }}>
          <InboxOutlined />
        </p>
        <p>
          <b>Arrastre aquí su lista de precios en Excel</b> o haga clic para elegirla.
        </p>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          Columnas: Código · Producto · Familia · Subfamilia · Unidad · Precio · Stock mínimo · Grosor (vidrios).
        </p>
      </Upload.Dragger>

      {mapeadas.length > 0 && !reporte && (
        <>
          <Space wrap size="large" style={{ marginBottom: 12 }}>
            <Statistic title="Filas leídas" value={mapeadas.length} />
            <Statistic title="Correctas" value={validas} valueStyle={{ color: '#1E7A4F' }} />
            <Statistic title="Con error" value={conError} valueStyle={{ color: conError ? '#C53030' : undefined }} />
          </Space>
          <Table<VistaFila>
            rowKey="fila"
            size="small"
            columns={columnas}
            dataSource={mapeadas.map(aVista)}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
          />
          <Button type="primary" loading={importando} disabled={validas === 0} onClick={() => void importar()} style={{ marginTop: 12 }}>
            Importar {validas} {validas === 1 ? 'fila' : 'filas'} correcta{validas === 1 ? '' : 's'}
          </Button>
          {conError > 0 && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              Las filas con error no se importan. Corríjalas en su Excel y vuelva a subir el archivo.
            </Typography.Paragraph>
          )}
        </>
      )}

      {reporte && (
        <>
          <Alert
            type={reporte.errores.length ? 'warning' : 'success'}
            showIcon
            style={{ marginBottom: 12 }}
            message={`Importación completada: ${String(reporte.creados)} creados, ${String(reporte.actualizados)} actualizados.`}
            description={
              reporte.errores.length > 0
                ? `${String(reporte.errores.length)} fila(s) no se importaron por reglas del negocio (ver abajo).`
                : 'El stock inicial quedó registrado en el kárdex como "Inventario inicial".'
            }
          />
          {reporte.errores.length > 0 && (
            <Table
              rowKey="fila"
              size="small"
              pagination={false}
              dataSource={reporte.errores}
              columns={[
                { title: 'Fila', dataIndex: 'fila', width: 60 },
                { title: 'Código', dataIndex: 'codigo', width: 120, render: (c: string) => <span className="mono">{c}</span> },
                { title: 'Motivo', dataIndex: 'mensaje', render: (m: string) => <span style={{ color: '#C53030' }}>{m}</span> },
              ]}
            />
          )}
          <Button style={{ marginTop: 12 }} onClick={() => {
            setMapeadas([]);
            setReporte(null);
          }}>
            Cargar otro archivo
          </Button>
        </>
      )}
    </div>
  );
}
