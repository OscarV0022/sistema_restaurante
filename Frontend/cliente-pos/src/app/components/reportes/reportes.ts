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
  totalSemanaCalculado: number = 0;
  totalMesCalculado: number = 0;

  ventasMesas: number = 0;
  ventasParaLlevar: number = 0;
  totalEncargos: number = 0;
  dineroEncargos: number = 0;
  
  listaVentasDelDia: any[] = [];

  // Datos de Efectivo en Caja
  cajaInicial: number = 0;
  entradasEfectivo: number = 0;
  salidasEfectivo: number = 0;
  totalCajaEsperado: number = 0;
  movimientosEfectivo: any[] = [];
  
  // Datos para los gráficos
  productosMasVendidos: { nombre: string; cantidad: number; porcentaje: number }[] = [];
  ventasSemana: { dia: string; total: number; altura: number }[] = [];
  ventasMes: { dia: string; total: number; altura: number }[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaSeleccionada = hoy.toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }); 
    this.cargarReporte();
  }

  cambiarVista(vista: 'dia' | 'semana' | 'mes') {
    this.tipoVista = vista;
    this.cargarReporte();
  }

  get totalMostrado(): number {
    if (this.tipoVista === 'semana') return this.totalSemanaCalculado;
    if (this.tipoVista === 'mes') return this.totalMesCalculado;
    return this.totalDia;
  }

  cargarReporte() {
    this.api.getReportePorFecha(this.fechaSeleccionada).subscribe({
      next: (res: any) => {
        this.totalDia = Number(res.totalDinero) || 0;
        this.ventasMesas = res.mesasCount || 0;
        this.ventasParaLlevar = res.llevarCount || 0;
        this.totalEncargos = res.encargosCount || 0;
        this.dineroEncargos = Number(res.dineroEncargos) || 0;
        this.listaVentasDelDia = res.detalleVentas || [];

        // Datos de efectivo
        if (res.efectivoCaja) {
          this.cajaInicial = Number(res.efectivoCaja.inicial) || 0;
          this.entradasEfectivo = Number(res.efectivoCaja.entradas) || 0;
          this.salidasEfectivo = Number(res.efectivoCaja.salidas) || 0;
          this.totalCajaEsperado = Number(res.efectivoCaja.totalEsperado) || 0;
          this.movimientosEfectivo = res.efectivoCaja.movimientos || [];
        } else {
          this.cajaInicial = 0;
          this.entradasEfectivo = 0;
          this.salidasEfectivo = 0;
          this.totalCajaEsperado = 0;
          this.movimientosEfectivo = [];
        }

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

    const mapaVentasSemana: { [key: string]: number } = {};
    if (res.ventasSemana && Array.isArray(res.ventasSemana)) {
      res.ventasSemana.forEach((item: any) => {
        const diaIso = typeof item.dia === 'string' ? item.dia.split('T')[0] : new Date(item.dia).toISOString().split('T')[0];
        mapaVentasSemana[diaIso] = Number(item.total);
      });
    }

    const [anioSel, mesSel, diaSel] = this.fechaSeleccionada.split('-').map(Number);
    const fechaFin = new Date(anioSel, mesSel - 1, diaSel);
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    this.ventasSemana = [];
    this.totalSemanaCalculado = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(fechaFin);
      d.setDate(fechaFin.getDate() - i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const fechaClave = `${y}-${m}-${day}`;

      const totalDiaVal = mapaVentasSemana[fechaClave] || 0;
      this.totalSemanaCalculado += totalDiaVal;

      this.ventasSemana.push({
        dia: `${nombresDias[d.getDay()]} ${d.getDate()}`,
        total: totalDiaVal,
        altura: 0
      });
    }

    const maxSemana = Math.max(...this.ventasSemana.map(s => s.total), 1);
    this.ventasSemana.forEach(s => s.altura = Math.round((s.total / maxSemana) * 100));

    const mapaVentasMes: { [key: string]: number } = {};
    if (res.ventasMes && Array.isArray(res.ventasMes)) {
      res.ventasMes.forEach((item: any) => {
        const diaIso = typeof item.dia === 'string' ? item.dia.split('T')[0] : new Date(item.dia).toISOString().split('T')[0];
        mapaVentasMes[diaIso] = Number(item.total);
      });
    }

    const diasEnMes = new Date(anioSel, mesSel, 0).getDate();
    this.ventasMes = [];
    this.totalMesCalculado = 0;

    for (let diaNum = 1; diaNum <= diasEnMes; diaNum++) {
      const fechaClave = `${anioSel}-${String(mesSel).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      const totalDiaVal = mapaVentasMes[fechaClave] || 0;
      this.totalMesCalculado += totalDiaVal;

      this.ventasMes.push({
        dia: diaNum.toString(),
        total: totalDiaVal,
        altura: 0
      });
    }

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
            .grid-resumen { display: flex; gap: 15px; margin: 20px 0; }
            .caja-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
            .caja-box.total { background: #fff7ed; border-color: #fed7aa; }
            .caja-box h4 { margin: 0 0 5px 0; font-size: 13px; color: #64748b; text-transform: uppercase; }
            .caja-box h2 { margin: 0; font-size: 20px; color: #0f172a; }
            .caja-box.total h2 { color: #EA580C; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; color: #334155; }
            .section-title { margin-top: 25px; font-size: 15px; font-weight: bold; border-bottom: 2px solid #EA580C; padding-bottom: 5px; }
            .entrada-txt { color: #059669; font-weight: bold; }
            .salida-txt { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Restaurante Chiantlequita</h1>
          <h3>Reporte de Ventas y Arqueo - ${this.fechaSeleccionada}</h3>
          
          <div class="section-title">Arqueo de Efectivo en Caja</div>
          <div class="grid-resumen">
            <div class="caja-box">
              <h4>Monto Inicial</h4>
              <h2>Q${this.cajaInicial.toFixed(2)}</h2>
            </div>
            <div class="caja-box">
              <h4>Ventas del Día</h4>
              <h2>Q${this.totalDia.toFixed(2)}</h2>
            </div>
            <div class="caja-box">
              <h4>Entradas Extra</h4>
              <h2 class="entrada-txt">+Q${this.entradasEfectivo.toFixed(2)}</h2>
            </div>
            <div class="caja-box">
              <h4>Salidas / Gastos</h4>
              <h2 class="salida-txt">-Q${this.salidasEfectivo.toFixed(2)}</h2>
            </div>
            <div class="caja-box total">
              <h4>Total en Caja</h4>
              <h2>Q${this.totalCajaEsperado.toFixed(2)}</h2>
            </div>
          </div>

          <div class="section-title">Movimientos de Efectivo</div>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th style="text-align: right;">Monto</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (this.movimientosEfectivo.length > 0) {
      this.movimientosEfectivo.forEach(m => {
        const hora = this.formatearHoraGuatemala(m.fecha);
        const esSalida = m.tipo === 'SALIDA';
        const signo = esSalida ? '-' : '+';
        const clase = esSalida ? 'salida-txt' : 'entrada-txt';
        contenidoHtml += `
          <tr>
            <td>${hora}</td>
            <td>${m.tipo}</td>
            <td>${m.motivo || 'N/A'}</td>
            <td style="text-align: right;" class="${clase}">${signo}Q${Math.abs(Number(m.monto)).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      contenidoHtml += `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Sin movimientos de caja registrados hoy.</td></tr>`;
    }

    contenidoHtml += `
            </tbody>
          </table>

          <div class="section-title">Productos Más Vendidos</div>
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

          <div class="section-title">Desglose de Ventas</div>
          <table>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Hora</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (this.listaVentasDelDia.length > 0) {
      this.listaVentasDelDia.forEach((v: any) => {
        const horaVenta = this.formatearHoraGuatemala(v.fecha);
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