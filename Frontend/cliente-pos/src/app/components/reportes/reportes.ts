import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule
  ],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class ReportesComponent implements OnInit {
  
  tipoVista: 'dia' | 'semana' | 'mes' = 'dia';
  fechaSeleccionada: string = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  
  totalDia: number = 0;
  ventasMesas: number = 0;
  ventasParaLlevar: number = 0;
  totalEncargos: number = 0;
  dineroEncargos: number = 0;
  
  listaVentasDelDia: any[] = [];
  
  // Datos para los gráficos
  productosMasVendidos: { nombre: string; cantidad: number; porcentaje: number }[] = [];
  ventasSemana: { dia: string; total: number; altura: number }[] = [];
  ventasMes: { dia: string; total: number; altura: number }[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaSeleccionada = hoy.toLocaleDateString('en-CA'); 
    this.cargarReporte();
  }

  cambiarVista(vista: 'dia' | 'semana' | 'mes') {
    this.tipoVista = vista;
    this.cargarReporte();
  }

  cargarReporte() {
    this.api.getReportePorFecha(this.fechaSeleccionada).subscribe({
      next: (res: any) => {
        this.totalDia = res.totalDinero || 0;
        this.ventasMesas = res.mesasCount || 0;
        this.ventasParaLlevar = res.llevarCount || 0;
        this.totalEncargos = res.encargosCount || 0;
        this.dineroEncargos = res.dineroEncargos || 0;
        this.listaVentasDelDia = res.detalleVentas || [];

        // Procesar gráficos con datos reales
        this.procesarGraficos(res);
      },
      error: (err) => {
        console.error("Error al cargar reporte:", err);
      }
    });
  }

  onFechaChange() {
    this.cargarReporte();
  }

  procesarGraficos(res: any) {
    // 1. Gráfico Diario: Productos más vendidos del día seleccionado
    const conteoProductos: { [key: string]: number } = {};
    if (res.detalleVentas) {
      res.detalleVentas.forEach((v: any) => {
        if (v.detalles && Array.isArray(v.detalles)) {
          v.detalles.forEach((d: any) => {
            conteoProductos[d.descripcion_producto] = (conteoProductos[d.descripcion_producto] || 0) + d.cantidad;
          });
        }
      });
    }

    const arrayProd = Object.keys(conteoProductos).map(nombre => ({
      nombre,
      cantidad: conteoProductos[nombre]
    })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    const maxCant = arrayProd.length > 0 ? Math.max(...arrayProd.map(p => p.cantidad)) : 1;
    this.productosMasVendidos = arrayProd.map(p => ({
      ...p,
      porcentaje: Math.round((p.cantidad / maxCant) * 100)
    }));

    if (this.productosMasVendidos.length === 0) {
      this.productosMasVendidos = [
        { nombre: 'Sin datos registrados hoy', cantidad: 0, porcentaje: 0 }
      ];
    }

    // 2. Gráfico Semanal (Desde el lunes de la semana de la fecha seleccionada hasta el día actual seleccionado)
    const fechaBase = new Date(this.fechaSeleccionada + 'T00:00:00');
    const diaSemana = fechaBase.getDay(); // 0 (Dom) a 6 (Sáb)
    const distanciaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    
    const lunes = new Date(fechaBase);
    lunes.setDate(fechaBase.getDate() - distanciaLunes);

    const nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    let diasTotalesSemana: { fechaStr: string; etiqueta: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      if (d > new Date()) break; 

      const fechaStr = d.toISOString().split('T')[0];
      diasTotalesSemana.push({
        fechaStr,
        etiqueta: `${nombresDias[i]} ${d.getDate()}`
      });
    }

    this.ventasSemana = diasTotalesSemana.map(item => {
      const totalDiaVal = (item.fechaStr === this.fechaSeleccionada) ? this.totalDia : 0;
      return { dia: item.etiqueta, total: totalDiaVal, altura: 0 };
    });

    const maxSemana = Math.max(...this.ventasSemana.map(s => s.total), 1);
    this.ventasSemana.forEach(s => s.altura = Math.round((s.total / maxSemana) * 100));

    // 3. Gráfico Mensual (Desde el día 1 del mes hasta el día seleccionado)
    const anio = fechaBase.getFullYear();
    const mes = fechaBase.getMonth();
    const diaMaxPermitido = fechaBase > new Date() ? new Date().getDate() : fechaBase.getDate();

    let diasMesTemp = [];
    for (let diaNum = 1; diaNum <= diaMaxPermitido; diaNum++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      diasMesTemp.push({
        fechaStr,
        dia: diaNum.toString()
      });
    }

    this.ventasMes = diasMesTemp.map(item => {
      const totalDiaVal = (item.fechaStr === this.fechaSeleccionada) ? this.totalDia : 0;
      return { dia: item.dia, total: totalDiaVal, altura: 0 };
    });

    const maxMes = Math.max(...this.ventasMes.map(m => m.total), 1);
    this.ventasMes.forEach(m => m.altura = Math.round((m.total / maxMes) * 100));
  }

  formatearHoraGuatemala(fechaIso: string): string {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleTimeString('es-GT', {
    timeZone: 'America/Guatemala',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

  exportarReportePDF() {
    let contenidoHtml = `
      <html>
        <head>
          <title>Reporte de Ventas - ${this.fechaSeleccionada}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #EA580C; margin-bottom: 5px; }
            h3 { text-align: center; color: #64748b; margin-top: 0; }
            .total-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .total-box h2 { margin: 0; color: #EA580C; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 14px; }
            th { background: #f1f5f9; color: #334155; }
            .section-title { margin-top: 25px; font-size: 16px; font-weight: bold; border-bottom: 2px solid #EA580C; padding-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>Restaurante Chiantlequita</h1>
          <h3>Reporte de Ventas - ${this.fechaSeleccionada}</h3>
          
          <div class="total-box">
            <p style="margin: 0; font-weight: bold; color: #475569;">TOTAL GENERAL DE VENTAS</p>
            <h2>Q${this.totalDia.toFixed(2)}</h2>
          </div>

          <div class="section-title">Productos Más Vendidos del Día</div>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: right;">Cantidad Vendida</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (this.productosMasVendidos.length > 0 && this.productosMasVendidos[0].cantidad > 0) {
      this.productosMasVendidos.forEach(p => {
        contenidoHtml += `
          <tr>
            <td>${p.nombre}</td>
            <td style="text-align: right;">${p.cantidad} un.</td>
          </tr>
        `;
      });
    } else {
      contenidoHtml += `<tr><td colspan="2" style="text-align: center; color: #94a3b8;">No hay productos registrados.</td></tr>`;
    }

    contenidoHtml += `
            </tbody>
          </table>

          <div class="section-title">Desglose de Transacciones</div>
          <table>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Hora</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (this.listaVentasDelDia.length > 0) {
      this.listaVentasDelDia.forEach((v: any) => {
        const horaVenta = new Date(v.fecha).toLocaleTimeString();
        contenidoHtml += `
          <tr>
            <td>#${v.id}</td>
            <td>${horaVenta}</td>
            <td style="text-align: right;">Q${Number(v.total).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      contenidoHtml += `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">No hay ventas registradas.</td></tr>`;
    }

    contenidoHtml += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const ventanaPdf = window.open('', '_blank');
    if (ventanaPdf) {
      ventanaPdf.document.write(contenidoHtml);
      ventanaPdf.document.close();
      ventanaPdf.focus();
      setTimeout(() => {
        ventanaPdf.print();
      }, 500);
    }
  }
}