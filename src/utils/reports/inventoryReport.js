import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const ESPESOR_OPTIONS = ['3', '2.5', '2', '1.5', '1', '0.875'];

/**
 * Procesa los datos del backend agrupando por espesor.
 * @param {Array} data - Datos crudos del backend
 * @param {String} categoryFilter - Estado a filtrar (ej: 'MADERA VERDE')
 * @param {String} tipoFilter - Tipo de madera a filtrar (ej: 'L' o 'P')
 */
const processBackendData = (data, categoryFilter, tipoFilter) => {
    // 1. Filtrar por estado Y por tipo de madera
    const filtered = data.filter(item =>
        item.estado === categoryFilter &&
        item.tipoMadera === tipoFilter
    );

    // 2. Inicializar mapa con ceros para asegurar el orden de espesores
    const mapped = {};
    ESPESOR_OPTIONS.forEach(opt => {
        mapped[opt] = { espesor: opt, bft: 0 };
    });

    // 3. Sumar los datos que vienen del backend
    filtered.forEach(item => {
        let key = String(item.espesor);
        // Normalizar "3.0" a "3" para que coincida con las opciones
        if (key.endsWith('.0') && key.length > 2) key = key.slice(0, -2);

        if (mapped[key]) {
            mapped[key].bft += parseFloat(item.totalBft || 0);
        } else {
            // Si llega un espesor raro (ej: 1.25), lo agregamos dinámicamente
            if (!mapped[key]) mapped[key] = { espesor: key, bft: 0 };
            mapped[key].bft += parseFloat(item.totalBft || 0);
        }
    });

    // 4. Retornar array ordenado descendente por espesor numérico
    return Object.values(mapped).sort((a, b) => {
        const valA = parseFloat(a.espesor);
        const valB = parseFloat(b.espesor);
        if (!isNaN(valA) && !isNaN(valB)) return valB - valA;
        return 0;
    });
};

const renderTableSection = (title, color, rowsL, rowsP) => {
    // Calcular totales
    const totalL = rowsL.reduce((sum, r) => sum + r.bft, 0);
    const totalP = rowsP.reduce((sum, r) => sum + r.bft, 0);
    const granTotal = totalL + totalP;

    if (granTotal === 0) return ''; // No mostrar sección si está vacía

    // Generar filas combinadas (L y P lado a lado)
    // Asumimos que rowsL y rowsP tienen los mismos espesores en el mismo orden
    // porque usamos ESPESOR_OPTIONS como base.
    const rowsHtml = rowsL.map((rL, index) => {
        const rP = rowsP[index] || { bft: 0 }; // Fallback por seguridad
        // Solo mostrar fila si hay algo en L o en P para ese espesor (opcional, aquí mostramos todo para mantener estructura)
        return `
            <tr>
                <td style="font-weight:bold;">${rL.espesor}</td>
                <td>${rL.bft > 0 ? rL.bft.toFixed(2) : '-'}</td>
                <td>${rP.bft > 0 ? rP.bft.toFixed(2) : '-'}</td>
                <td style="background-color: #f9f9f9;">${(rL.bft + rP.bft).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    return `
        <div style="margin-bottom: 25px; break-inside: avoid;">
            <div class="section-header" style="background-color: ${color};">${title}</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 25%;">ESPESOR</th>
                        <th style="width: 25%;">LIVIANA</th>
                        <th style="width: 25%;">PESADA</th>
                        <th style="width: 25%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                    <tr class="total-row">
                        <td>TOTALES</td>
                        <td>${totalL.toFixed(2)}</td>
                        <td>${totalP.toFixed(2)}</td>
                        <td>${granTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
};

export const generarReporteInventario = async (reportData) => {
    // Procesamos L y P por separado para cada Estado

    // 1. Madera Verde ('MV')
    const verdeL = processBackendData(reportData, 'MV', 'L');
    const verdeP = processBackendData(reportData, 'MV', 'P');

    // 2. En Secado ('SE')
    const secadoL = processBackendData(reportData, 'SE', 'L');
    const secadoP = processBackendData(reportData, 'SE', 'P');

    // 3. Stock Seco ('SS')
    const stockL = processBackendData(reportData, 'SS', 'L');
    const stockP = processBackendData(reportData, 'SS', 'P');

    // Calcular Total General de toda la planta
    const calcTotal = (arr) => arr.reduce((s, i) => s + i.bft, 0);
    const grandTotal = calcTotal(verdeL) + calcTotal(verdeP) +
        calcTotal(secadoL) + calcTotal(secadoP) +
        calcTotal(stockL) + calcTotal(stockP);

    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 30px; font-size: 12px; color: #333; }
          h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { text-align: center; color: #7f8c8d; margin-bottom: 30px; font-size: 12px; }
          
          .section-header { 
            color: white; 
            padding: 10px; 
            font-size: 14px; 
            font-weight: bold; 
            text-transform: uppercase; 
            border-radius: 6px 6px 0 0;
            text-align: center;
            letter-spacing: 0.5px;
          }
          
          table { width: 100%; border-collapse: collapse; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          th { background-color: #ecf0f1; color: #2c3e50; padding: 10px; border: 1px solid #bdc3c7; font-size: 11px; font-weight: bold; }
          td { border: 1px solid #bdc3c7; padding: 8px; text-align: center; color: #2c3e50; }
          
          .total-row { background-color: #ecf0f1; font-weight: bold; border-top: 2px solid #bdc3c7; }
          
          .summary-box { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 18px; 
            font-weight: bold; 
            background: #2c3e50; 
            color: white; 
            padding: 15px; 
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #95a5a6; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
      <!--img src="../images/balsagood-logo.png" alt="Logo" style="width: 100px; height: 100px; margin: 0 auto; display: block;" /-->
        
        <h1>Reporte de Inventario</h1>
        <div class="subtitle">Fecha de corte: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>

        ${renderTableSection('MADERA VERDE', '#27ae60', verdeL, verdeP)}
        ${renderTableSection('SECADORAS', '#d35400', secadoL, secadoP)}
        ${renderTableSection('STOCK SECO', '#2980b9', stockL, stockP)}
        
        <div class="summary-box">
            TOTAL: ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BFT
        </div>

        <div class="footer">
          Balsagood Importadora/Exportadora Balsa S.A. - Reporte generado automáticamente
        </div>
      </body>
    </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTIType: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error("Error generando PDF Inv:", error);
        Alert.alert("Error", "No se pudo generar el reporte.");
    }
};