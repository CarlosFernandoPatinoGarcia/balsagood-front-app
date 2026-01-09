import { generarReporteProduccion } from './reports/productionReport';
import { generarReporteInventario } from './reports/inventoryReport';

// Facade para mantener compatibilidad y centralizar exports
export const generarReportePDF = generarReporteProduccion; // Alias para compatibilidad con código existente (si queda algo)
export { generarReporteProduccion, generarReporteInventario };