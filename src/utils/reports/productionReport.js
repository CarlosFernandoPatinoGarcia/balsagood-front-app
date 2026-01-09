import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const generarReporteProduccion = async (datosOrden, listaBloques) => {
    // 1. Agrupar bloques por Tipo y Largo
    const data = {
        'L': { name: 'Liviana', items: {}, totalCant: 0, totalBft: 0 },
        'P': { name: 'Pesada', items: {}, totalCant: 0, totalBft: 0 },
        'O': { name: 'Otros', items: {}, totalCant: 0, totalBft: 0 } // Fallback
    };

    listaBloques.forEach(bloque => {
        let tipoDesc = 'O';
        // Ajuste para leer tipoMadera.tipoDescripcion
        if (bloque.tipoMadera && bloque.tipoMadera.tipoDescripcion) {
            tipoDesc = bloque.tipoMadera.tipoDescripcion;
        } else if (bloque.tipoDescription) {
            tipoDesc = bloque.tipoDescription;
        }

        let key = 'O';
        if (tipoDesc === 'L' || tipoDesc === 'Liviana') key = 'L';
        else if (tipoDesc === 'P' || tipoDesc === 'Pesada') key = 'P';

        const group = data[key];
        const largo = bloque.bloqueLargo || bloque.largo;
        if (!largo) return;

        if (!group.items[largo]) {
            group.items[largo] = { largo: largo, cantidad: 0, bft: 0 };
        }

        const bft = bloque.bloqueBftFinal || bloque.bftFinal || 0;

        group.items[largo].cantidad += 1;
        group.items[largo].bft += parseFloat(bft);

        group.totalCant += 1;
        group.totalBft += parseFloat(bft);
    });

    const processGroup = (groupKey) => {
        const group = data[groupKey];
        const rows = Object.values(group.items).sort((a, b) => parseFloat(b.largo) - parseFloat(a.largo));
        return { ...group, rows };
    };

    const liviana = processGroup('L');
    const pesada = processGroup('P');

    const maxRows = Math.max(liviana.rows.length, pesada.rows.length);
    const tableRows = [];

    for (let i = 0; i < maxRows; i++) {
        const l = liviana.rows[i] || { largo: '-', cantidad: '-', bft: '-' };
        const p = pesada.rows[i] || { largo: '-', cantidad: '-', bft: '-' };

        const fmt = (val) => typeof val === 'number' ? val.toFixed(2) : val;

        tableRows.push(`
            <tr>
                <td>${fmt(l.largo)}</td>
                <td>${l.cantidad}</td>
                <td>${fmt(l.bft)}</td>
                <td style="background-color: #f0f0f0; border: none;"></td>
                <td>${fmt(p.largo)}</td>
                <td>${p.cantidad}</td>
                <td>${fmt(p.bft)}</td>
            </tr>
        `);
    }

    const totalsRow = `
        <tr style="background-color: #ecf0f1; font-weight: bold;">
            <td>TOTAL</td>
            <td>${liviana.totalCant}</td>
            <td>${liviana.totalBft.toFixed(2)}</td>
            <td style="background-color: #f0f0f0; border: none;"></td>
            <td>TOTAL</td>
            <td>${pesada.totalCant}</td>
            <td>${pesada.totalBft.toFixed(2)}</td>
        </tr>
    `;

    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; font-size: 12px; }
          h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
          .header-info { text-align: center; margin-bottom: 20px; color: #7f8c8d; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #2c3e50; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; }
          td { border: 1px solid #bdc3c7; padding: 6px; text-align: center; color: #2c3e50; }
          .main-header th { font-size: 14px; padding: 10px; }
          .sub-header th { font-size: 11px; background-color: #34495e; }
          .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #95a5a6; border-top: 1px solid #ecf0f1; padding-top: 10px; }
          .spacer-col { width: 10px; border: none !important; background-color: white !important; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Producción</h1>
          <div class="header-info">
            <strong>Fecha:</strong> ${new Date().toLocaleDateString()}
          </div>
        </div>

        <table>
          <thead>
            <tr class="main-header">
                <th colspan="3" style="background-color: #27ae60;">LIVIANA</th>
                <th class="spacer-col" style="background-color: #fff; width: 2%;"></th>
                <th colspan="3" style="background-color: #c0392b;">PESADA</th>
            </tr>
            <tr class="sub-header">
                <th>Largo</th>
                <th>Cant</th>
                <th>BFT</th>
                <th class="spacer-col"></th>
                <th>Largo</th>
                <th>Cant</th>
                <th>BFT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.join('')}
            ${totalsRow}
          </tbody>
        </table>
        
        <br/>
        
        <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px; font-weight: bold;">
            <div>Total General Bloques: ${liviana.totalCant + pesada.totalCant}</div>
            <div>Total General BFT: ${(liviana.totalBft + pesada.totalBft).toFixed(2)}</div>
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
        console.error("Error generando PDF Prod:", error);
        Alert.alert("Error", "No se pudo generar el reporte.");
    }
};
