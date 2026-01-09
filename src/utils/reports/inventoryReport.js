import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const ESPESOR_OPTIONS = ['3', '2.5', '2', '1.5', '1', '0.875'];

const processBackendData = (data, categoryFilter) => {
    // data: Array of objects { estado, espesor, totalBft }
    // categoryFilter: 'VERDE', 'SECANDO', or 'STOCK' (backend uses 'STOCK' or 'STOCK_SECO'?)
    // Based on user prompt: "VERDE", "SECANDO", "STOCK"

    // 1. Filter by category
    const filtered = data.filter(item => item.estado === categoryFilter);

    // 2. Map to format needed for table (espesor, bft)
    // We still want to ensure order based on ESPESOR_OPTIONS
    const mapped = {};

    // Initialize with 0
    ESPESOR_OPTIONS.forEach(opt => {
        mapped[opt] = { espesor: opt, bft: 0 };
    });

    filtered.forEach(item => {
        const esp = String(item.espesor);
        // If the backend returns a thickness not in our fixed list, we add it or put in 'Otros'
        // For now, let's treat exact matches.

        // Handle numbers vs strings matching
        // The backend returns numbers (3.0), our keys are strings ('3', '2.5')
        // We need to normalize. '3.0' == '3'.

        let key = esp;
        if (key.endsWith('.0') && key.length > 2) key = key.slice(0, -2); // 3.0 -> 3

        // Check if key exists in our map (standard options)
        if (mapped[key]) {
            mapped[key].bft += parseFloat(item.totalBft || 0);
        } else {
            // If not standard, we can add it or ignore. Let's add dynamic key to be safe.
            if (!mapped[key]) mapped[key] = { espesor: key, bft: 0 };
            mapped[key].bft += parseFloat(item.totalBft || 0);
        }
    });

    // 3. Sort
    return Object.values(mapped).sort((a, b) => {
        const valA = parseFloat(a.espesor);
        const valB = parseFloat(b.espesor);
        if (!isNaN(valA) && !isNaN(valB)) return valB - valA;
        return 0;
    });
};

const renderTableSection = (title, color, dataRows) => {
    if (dataRows.length === 0) {
        return `
            <div class="section-header" style="background-color: ${color};">${title}</div>
            <p style="text-align: center; color: #999; font-style: italic; margin-bottom: 20px;">Sin datos</p>
        `;
    }

    const totalBft = dataRows.reduce((sum, r) => sum + r.totalBft, 0);

    const rowsHtml = dataRows.map(r => `
        <tr>
            <td>${r.espesor}</td>
            <td>${r.bft.toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <div class="section-header" style="background-color: ${color};">${title}</div>
        <table>
            <thead>
                <tr>
                    <th>Espesor</th>
                    <th>BFT Total</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td>${totalBft.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
        <br/>
    `;
};

export const generarReporteInventario = async (reportData) => {
    // reportData: Array direct from API GET /api/inventario/pallets

    // Process for each category defined in the User Prompt DTO
    const rowsVerde = processBackendData(reportData, 'VERDE');
    const rowsEnSecado = processBackendData(reportData, 'SECANDO');
    const rowsStockSeco = processBackendData(reportData, 'STOCK');

    const grandTotal =
        rowsVerde.reduce((s, r) => s + r.bft, 0) +
        rowsEnSecado.reduce((s, r) => s + r.bft, 0) +
        rowsStockSeco.reduce((s, r) => s + r.bft, 0);

    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; font-size: 12px; }
          h1 { text-align: center; color: #2c3e50; margin-bottom: 20px; }
          
          .section-header { 
            color: white; 
            padding: 8px; 
            font-size: 14px; 
            font-weight: bold; 
            text-transform: uppercase; 
            border-radius: 4px 4px 0 0;
            text-align: center;
          }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #ecf0f1; color: #34495e; padding: 8px; border: 1px solid #bdc3c7; font-size: 11px; }
          td { border: 1px solid #bdc3c7; padding: 6px; text-align: center; color: #2c3e50; }
          .total-row { background-color: #ecf0f1; font-weight: bold; }
          
          .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #95a5a6; border-top: 1px solid #ecf0f1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Reporte de Inventario</h1>
        <div style="text-align: center; margin-bottom: 20px; color: #7f8c8d;">
            Fecha: ${new Date().toLocaleDateString()}
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
            <div style="flex: 1; min-width: 200px;">
                ${renderTableSection('MADERA VERDE', '#27ae60', rowsVerde)}
            </div>
            <div style="flex: 1; min-width: 200px;">
                ${renderTableSection('SECANDO', '#e67e22', rowsEnSecado)}
            </div>
            <div style="flex: 1; min-width: 200px;">
                ${renderTableSection('STOCK SECO', '#2980b9', rowsStockSeco)}
            </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 16px; font-weight: bold; background: #2c3e50; color: white; padding: 10px; borderRadius: 8px;">
            Total General Inventario: ${grandTotal.toFixed(2)} BFT
        </div>

        <div class="footer">
          <p>Generado por Sistema Balsagood Móvil</p>
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
