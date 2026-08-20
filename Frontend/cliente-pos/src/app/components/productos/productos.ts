import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-productos',
  standalone: true, 
  imports: [CommonModule, FormsModule, MatIconModule], 
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class ProductosComponent implements OnInit {
  // Controla qué pantalla estamos viendo (Dashboard o Formularios)
  vistaActual: 'menu' | 'crear' | 'editar' | 'eliminar' = 'menu';
  
  // Modelo para los datos del formulario
  producto: any = { id: null, descripcion: '', precio: 0, categoria: '' };
  
  // Variables para la barra de búsqueda
  menuCompleto: any[] = [];
  menuFiltrado: any[] = [];
  terminoBusqueda: string = '';

  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarMenu();
  }

  // Obtiene los datos desde tu backend conectado a Supabase
  cargarMenu() {
    this.http.get<any[]>(`${this.apiUrl}/menu`).subscribe(data => {
      this.menuCompleto = data;
      this.menuFiltrado = data;
    });
  }

  // Función para navegar entre las opciones estilo Xbox
  cambiarVista(vista: 'menu' | 'crear' | 'editar' | 'eliminar') {
    this.vistaActual = vista;
    this.producto = { id: null, descripcion: '', precio: 0, categoria: '' };
    this.terminoBusqueda = '';
    this.menuFiltrado = [...this.menuCompleto];
  }

  // Filtrado en tiempo real para la barra de búsqueda
  buscarProducto() {
    if (!this.terminoBusqueda) {
      this.menuFiltrado = [...this.menuCompleto];
    } else {
      this.menuFiltrado = this.menuCompleto.filter(p => 
        p.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase())
      );
    }
  }

  // Carga los datos al formulario de edición
  seleccionarParaEditar(prod: any) {
    this.producto = { ...prod }; 
  }

  // POST: Guarda en la base de datos
  guardarNuevoProducto() {
    this.http.post(`${this.apiUrl}/menu`, this.producto).subscribe({
      next: () => {
        alert('¡Producto creado con éxito!');
        this.cargarMenu();
        this.cambiarVista('menu');
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        alert('Ocurrió un error al guardar el producto.');
      }
    });
  }

  // PUT: Actualiza en la base de datos
  actualizarProducto() {
    this.http.put(`${this.apiUrl}/menu/${this.producto.id}`, this.producto).subscribe({
      next: () => {
        alert('¡Producto actualizado!');
        this.cargarMenu();
        this.cambiarVista('menu');
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        alert('Ocurrió un error al actualizar el producto.');
      }
    });
  }

  // DELETE: Borra de la base de datos
  confirmarEliminacion(id: number) {
    if(confirm('¿Estás seguro de eliminar definitivamente este platillo del menú?')) {
      this.http.delete(`${this.apiUrl}/menu/${id}`).subscribe({
        next: () => {
          alert('Producto eliminado exitosamente.');
          this.cargarMenu();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Ocurrió un error al eliminar el producto.');
        }
      });
    }
  }
}