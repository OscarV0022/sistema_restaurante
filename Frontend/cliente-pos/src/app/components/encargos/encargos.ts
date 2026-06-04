import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-encargos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatGridListModule, MatCardModule, 
    MatButtonModule, MatIconModule, MatListModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, 
    MatDatepickerModule, MatNativeDateModule, MatTabsModule, MatChipsModule, MatDividerModule
  ],
  templateUrl: './encargos.html',
  styleUrls: ['./encargos.css']
})
export class Encargos implements OnInit {

  menu: any[] = [];
  categorias: string[] = [];
  productosVisibles: any[] = [];
  categoriaSeleccionada: string | null = null;
  busqueda: string = '';

  cliente: string = '';
  fechaEntrega: Date = new Date();
  horaEntrega: string = '12:00';
  fechaFiltro: Date = new Date();
  estadoPago: string = 'PENDIENTE';
  carrito: any[] = [];
  total: number = 0;

  listaEncargos: any[] = [];

  constructor(private api: ApiService, private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.cargarMenu();
    this.cargarHistorialEncargos();
  }

  cargarMenu() {
    this.api.getMenu().subscribe((data: any) => { 
      this.menu = data; 
      const cats = data.map((item: any) => item.categoria).filter((c: any) => c);
      this.categorias = [...new Set(cats)] as string[];
    });
  }

  cargarHistorialEncargos() {
    this.api.getEncargos().subscribe((data: any) => {
        this.listaEncargos = data.filter((e: any) => e.estado_pago === 'PENDIENTE');
    });
  }

  buscarPorFecha() {
    const fechaStr = this.fechaFiltro.toISOString().split('T')[0];
    this.api.getEncargosPorFecha(fechaStr).subscribe((data: any) => {
        this.listaEncargos = data;
    });
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada = cat; this.busqueda = '';
    this.productosVisibles = this.menu.filter(p => p.categoria === cat);
  }

  verCategorias() { this.categoriaSeleccionada = null; this.productosVisibles = []; }

  filtrarPorBusqueda() {
    if (this.busqueda.trim() === '') { this.verCategorias(); return; }
    const texto = this.busqueda.toLowerCase();
    this.productosVisibles = this.menu.filter(p => p.descripcion.toLowerCase().includes(texto));
    this.categoriaSeleccionada = 'BUSQUEDA';
  }

  agregarAlCarrito(producto: any) {
    const existe = this.carrito.find(item => item.descripcion === producto.descripcion);
    if (existe) { existe.cantidad++; existe.subtotal = existe.cantidad * existe.precio; } 
    else { this.carrito.push({ descripcion: producto.descripcion, precio: Number(producto.precio), cantidad: 1, subtotal: Number(producto.precio) }); }
    this.calcularTotal();
  }

  eliminarDelCarrito(index: number) { this.carrito.splice(index, 1); this.calcularTotal(); }

  calcularTotal() { this.total = this.carrito.reduce((acc, item) => acc + item.subtotal, 0); }

  irAlPos() { this.router.navigate(['/']); }

  guardarEncargo() {
    if (!this.cliente || this.carrito.length === 0) return;
    const fechaStr = this.fechaEntrega.toISOString().split('T')[0];
    const fechaFinal = `${fechaStr} ${this.horaEntrega}:00`;

    const encargo = {
      cliente: this.cliente, fecha_entrega: fechaFinal, estado_pago: this.estadoPago, total: this.total, detalles: this.carrito
    };

    this.api.guardarEncargo(encargo).subscribe({
      next: () => {
        this.snackBar.open('✅ Encargo guardado', 'Cerrar', { duration: 3000 });
        this.limpiarFormulario();
        this.cargarHistorialEncargos();
      },
      error: (err) => { console.error(err); this.snackBar.open('Error al guardar', 'Cerrar'); }
    });
  }
  
  cobrarEncargo(encargo: any) {
    if(!confirm(`¿Confirmar pago de Q${encargo.total} para ${encargo.cliente}?`)) return;

    this.api.pagarEncargo(encargo.id).subscribe({
        next: () => {
            this.snackBar.open(`💰 Cobrado con éxito. Registrado en ventas.`, 'OK', { duration: 4000 });
            this.cargarHistorialEncargos();
        },
        error: (err) => {
            console.error(err);
            this.snackBar.open('Error al procesar el pago', 'Cerrar');
        }
    });
  }

  limpiarFormulario() {
    this.cliente = ''; this.carrito = []; this.total = 0; this.estadoPago = 'PENDIENTE'; this.verCategorias();
  }
}