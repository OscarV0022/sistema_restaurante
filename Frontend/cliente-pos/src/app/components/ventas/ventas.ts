import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.css']
})
export class VentasComponent implements OnInit {
  ventas: any[] = [];
  cargando: boolean = false;
  ventaExpandidaId: number | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando = true;
    this.api.getVentasHoy().subscribe({
      next: (data) => {
        this.ventas = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando ventas:', err);
        this.snackBar.open('Error al obtener ventas de hoy', 'Cerrar', { duration: 3000 });
        this.cargando = false;
      }
    });
  }

  toggleExpandir(id: number): void {
    this.ventaExpandidaId = this.ventaExpandidaId === id ? null : id;
  }

  formatearHora(fechaIso: string): string {
    if (!fechaIso) return '';
    return new Date(fechaIso).toLocaleTimeString('es-GT', {
      timeZone: 'America/Guatemala',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  get totalAcumulado(): number {
    return this.ventas.reduce((acc, v) => acc + Number(v.total), 0);
  }

  eliminarProducto(venta: any, detalle: any, event: MouseEvent): void {
    event.stopPropagation();

    let cantidadAEliminar = 1;

    if (detalle.cantidad > 1) {
      const resp = prompt(
        `Hay ${detalle.cantidad} unidades de "${detalle.descripcion_producto}".\n¿Cuántas unidades deseas ELIMINAR de la venta?`,
        '1'
      );

      if (resp === null) return; // Canceló el usuario

      cantidadAEliminar = parseInt(resp, 10);
      if (isNaN(cantidadAEliminar) || cantidadAEliminar < 1 || cantidadAEliminar > detalle.cantidad) {
        alert(`Debes ingresar una cantidad válida entre 1 y ${detalle.cantidad}.`);
        return;
      }
    } else {
      const seguro = confirm(`¿Eliminar "${detalle.descripcion_producto}" de la Venta #${venta.id}?`);
      if (!seguro) return;
    }

    this.api.eliminarProductoVenta(detalle.id, cantidadAEliminar).subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'Actualizado con éxito', 'OK', { duration: 2500 });
        this.cargarVentas();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al eliminar producto', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarVenta(venta: any, event: MouseEvent): void {
    event.stopPropagation();
    const seguro = confirm(`¿Estás seguro de ELIMINAR COMPLETAMENTE la Venta #${venta.id} por Q${Number(venta.total).toFixed(2)}?`);
    if (!seguro) return;

    this.api.eliminarVentaCompleta(venta.id).subscribe({
      next: () => {
        this.snackBar.open(`Venta #${venta.id} eliminada`, 'OK', { duration: 2500 });
        this.cargarVentas();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error al eliminar venta', 'Cerrar', { duration: 3000 });
      }
    });
  }

  regresarAlPos(): void {
    this.router.navigate(['/']);
  }
}