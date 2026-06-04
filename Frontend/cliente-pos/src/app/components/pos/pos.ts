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
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Mesa {
  id: number;
  nombre: string;
  seccion: string;
  estado: 'libre' | 'ocupada';
  visible: boolean;
  mesasHijas: number[];
  carrito: any[];
  total: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './pos.html',
  styleUrls: ['./pos.css']
})
export class Pos implements OnInit {
  
  // --- MENÚ ---
  menu: any[] = [];
  productosVisibles: any[] = [];
  categorias: string[] = [];
  busqueda: string = '';
  categoriaSeleccionada: string | null = null;

  // --- MESAS Y SECCIONES ---
  configuracionSecciones = [
    { nombre: 'Sección 1', mesas: 6 },
    { nombre: 'Sección 2', mesas: 4 },
    { nombre: 'Sección 3', mesas: 4 },
    { nombre: 'Sección 4', mesas: 5 },
    { nombre: 'PARA LLEVAR', mesas: 15 }
  ];

  secciones: string[] = [];
  todasLasMesas: Mesa[] = [];
  mesaSeleccionada: Mesa | null = null;

  // --- AGRUPACIÓN ---
  modoAgrupar: boolean = false;
  mesaOrigen: Mesa | null = null;

  // --- PAGO ---
  mostrandoPantallaPago: boolean = false; 
  montoRecibido: number | null = null;

  constructor(
    private api: ApiService, 
    private snackBar: MatSnackBar,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.cargarMenu();
    
    // Auto-corrección de memoria
    const datosCargados = this.cargarEstadoGuardado();
    const tieneParaLlevar = this.todasLasMesas.some(m => m.seccion === 'PARA LLEVAR');

    if (datosCargados && !tieneParaLlevar) {
        this.todasLasMesas = [];
        this.secciones = [];
        this.inicializarMesas();
    } else if (!datosCargados) {
        this.inicializarMesas();
    }
  }

  // --- NAVEGACIÓN ---
  irAEncargos() {
    this.router.navigate(['/encargos']);
  }

  // --- PERSISTENCIA ---
  guardarEstado() {
    localStorage.setItem('restaurante_mesas', JSON.stringify(this.todasLasMesas));
  }

  cargarEstadoGuardado(): boolean {
    const guardado = localStorage.getItem('restaurante_mesas');
    if (guardado) {
      this.todasLasMesas = JSON.parse(guardado);
      const seccionesSet = new Set(this.todasLasMesas.map(m => m.seccion));
      this.secciones = this.configuracionSecciones.map(c => c.nombre).filter(n => seccionesSet.has(n));
      return true;
    }
    return false;
  }

  // --- MENÚ ---
  cargarMenu() {
    this.api.getMenu().subscribe((data: any) => { 
      this.menu = data; 
      const cats = data.map((item: any) => item.categoria).filter((c: any) => c);
      this.categorias = [...new Set(cats)] as string[];
    });
  }

  filtrarPorBusqueda() {
    if (this.busqueda.trim() === '') { this.verCategorias(); return; }
    const texto = this.busqueda.toLowerCase();
    this.productosVisibles = this.menu.filter(p => p.descripcion.toLowerCase().includes(texto));
    this.categoriaSeleccionada = 'BUSQUEDA';
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
    this.busqueda = '';
    this.productosVisibles = this.menu.filter(p => p.categoria === cat);
  }

  verCategorias() {
    this.categoriaSeleccionada = null;
    this.busqueda = '';
    this.productosVisibles = [];
  }

  // --- MESAS ---
  inicializarMesas() {
    let contadorId = 1;
    this.configuracionSecciones.forEach(config => {
      this.secciones.push(config.nombre);
      for (let i = 1; i <= config.mesas; i++) {
        const prefijo = config.nombre === 'PARA LLEVAR' ? 'Orden' : 'Mesa';
        this.todasLasMesas.push({
          id: contadorId++,
          nombre: `${prefijo} ${i}`,
          seccion: config.nombre,
          estado: 'libre',
          visible: true,
          mesasHijas: [],
          carrito: [],
          total: 0
        });
      }
    });
    this.guardarEstado();
  }

  getMesasPorSeccion(seccion: string) {
    return this.todasLasMesas.filter(m => m.seccion === seccion && m.visible);
  }

  clickEnMesa(mesa: Mesa) {
    if (this.modoAgrupar) {
      this.gestionarAgrupacion(mesa);
      return;
    }
    this.montoRecibido = null; 
    this.mostrandoPantallaPago = false; 
    this.verCategorias(); 
    this.mesaSeleccionada = mesa;
  }

  regresarAlMapa() { 
      this.mesaSeleccionada = null; 
      this.montoRecibido = null;
      this.mostrandoPantallaPago = false;
      this.verCategorias();
  }

  cambiarEstadoManual() {
    if (!this.mesaSeleccionada) return;
    if (this.mesaSeleccionada.estado === 'libre') {
        this.mesaSeleccionada.estado = 'ocupada';
        this.snackBar.open('Marcada como OCUPADA', 'OK', { duration: 2000 });
    } else {
        if (confirm('¿Liberar mesa y borrar pedido?')) {
            this.mesaSeleccionada.estado = 'libre';
            this.mesaSeleccionada.carrito = [];
            this.mesaSeleccionada.total = 0;
            
            // La función que desvincula las mesas unidas
            this.desagruparMesaActual();
            
            this.snackBar.open('Mesa LIBERADA', 'OK', { duration: 2000 });
        }
    }
    this.guardarEstado();
  }

  // --- AGRUPAR ---
  toggleModoAgrupar() {
    this.modoAgrupar = !this.modoAgrupar;
    this.mesaOrigen = null;
    if (this.modoAgrupar) {
      this.snackBar.open('Selecciona la mesa ORIGEN', 'OK', { duration: 3000 });
    } else {
      this.snackBar.open('Cancelado', 'OK', { duration: 1000 });
    }
  }

  gestionarAgrupacion(mesa: Mesa) {
    if (!this.mesaOrigen) {
      this.mesaOrigen = mesa;
      this.snackBar.open(`Mesa ${mesa.nombre} seleccionada. Ahora toca el DESTINO`, 'OK', { duration: 3000 });
    } else {
      if (this.mesaOrigen.id === mesa.id) {
        this.snackBar.open('No puedes unir la misma mesa.', 'Error', { duration: 2000 });
        return;
      }
      this.fusionarMesas(this.mesaOrigen, mesa);
    }
  }

  fusionarMesas(origen: Mesa, destino: Mesa) {
    destino.carrito.push(...origen.carrito);
    if (origen.mesasHijas.length > 0) {
        destino.mesasHijas.push(...origen.mesasHijas);
        origen.mesasHijas = [];
    }
    destino.mesasHijas.push(origen.id);
    origen.visible = false;
    origen.carrito = [];
    origen.total = 0;
    origen.estado = 'libre'; 

    this.calcularTotalMesaEspecifica(destino);
    if (destino.carrito.length > 0) destino.estado = 'ocupada';

    this.snackBar.open(`¡Unidas! ${origen.nombre} -> ${destino.nombre}`, 'Genial', { duration: 3000 });
    this.modoAgrupar = false;
    this.mesaOrigen = null;
    this.guardarEstado();
  }

  desagruparMesaActual() {
    if (!this.mesaSeleccionada) return;
    const padre = this.mesaSeleccionada;
    if (padre.mesasHijas.length === 0) return;

    padre.mesasHijas.forEach(idHija => {
      const mesaHija = this.todasLasMesas.find(m => m.id === idHija);
      if (mesaHija) {
        mesaHija.visible = true;
        mesaHija.estado = 'libre';
        mesaHija.mesasHijas = [];
      }
    });
    padre.mesasHijas = [];
    this.snackBar.open('Mesas separadas.', 'OK', { duration: 3000 });
    this.guardarEstado();
  }

  // --- CARRITO ---
  agregarAlCarrito(producto: any) {
    if (!this.mesaSeleccionada) return;
    this.mesaSeleccionada.estado = 'ocupada';
    
    const existe = this.mesaSeleccionada.carrito.find(item => item.descripcion === producto.descripcion);
    if (existe) {
      existe.cantidad++;
      existe.subtotal = existe.cantidad * existe.precio;
    } else {
      this.mesaSeleccionada.carrito.push({
        descripcion: producto.descripcion,
        precio: Number(producto.precio),
        cantidad: 1,
        subtotal: Number(producto.precio)
      });
    }
    this.calcularTotalMesaEspecifica(this.mesaSeleccionada);
    this.guardarEstado();
  }

  eliminarDelCarrito(index: number) {
    if (!this.mesaSeleccionada) return;
    this.mesaSeleccionada.carrito.splice(index, 1);
    this.calcularTotalMesaEspecifica(this.mesaSeleccionada);
    this.guardarEstado();
  }

  subirCantidad(item: any) {
    item.cantidad++;
    item.subtotal = item.cantidad * item.precio;
    this.calcularTotalMesaEspecifica(this.mesaSeleccionada!);
    this.guardarEstado();
  }

  bajarCantidad(item: any) {
    if (item.cantidad > 1) {
      item.cantidad--;
      item.subtotal = item.cantidad * item.precio;
      this.calcularTotalMesaEspecifica(this.mesaSeleccionada!);
      this.guardarEstado();
    }
  }

  // --- NUEVA FUNCIÓN: EDITAR PRECIO ---
  editarPrecio(item: any) {
    if (!this.mesaSeleccionada) return;

    // Preguntamos el nuevo precio
    const nuevoPrecioStr = prompt(`Ingresa precio especial para "${item.descripcion}":`, item.precio);

    if (nuevoPrecioStr !== null) {
      const nuevoPrecio = parseFloat(nuevoPrecioStr);

      if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
        item.precio = nuevoPrecio;
        // Recalcular subtotal
        item.subtotal = item.cantidad * item.precio;
        // Recalcular total de la mesa
        this.calcularTotalMesaEspecifica(this.mesaSeleccionada);
        this.guardarEstado();
        
        this.snackBar.open(`Precio ajustado a Q${nuevoPrecio}`, 'OK', { duration: 1500 });
      } else {
        this.snackBar.open('Precio inválido', 'Error', { duration: 2000 });
      }
    }
  }

  calcularTotalMesaEspecifica(mesa: Mesa) {
    mesa.total = mesa.carrito.reduce((acc, item) => acc + item.subtotal, 0);
  }

  // --- PAGO ---
  irAPagar() {
    this.mostrandoPantallaPago = true;
    this.montoRecibido = null; 
  }

  cancelarPago() {
    this.mostrandoPantallaPago = false;
  }

  get cambioCalculado(): number {
      if (!this.montoRecibido) return 0;
      return this.montoRecibido - (this.mesaSeleccionada ? this.mesaSeleccionada.total : 0);
  }

  confirmarVentaFinal() {
    if (!this.mesaSeleccionada || this.mesaSeleccionada.carrito.length === 0) return;
    
    if (this.montoRecibido && this.montoRecibido < this.mesaSeleccionada.total) {
        this.snackBar.open('❌ Falta dinero.', 'Corregir', { duration: 2000 });
        return;
    }

    const venta = {
      total: this.mesaSeleccionada.total,
      detalles: this.mesaSeleccionada.carrito
    };

    this.api.guardarVenta(venta).subscribe({
      next: (res: any) => {
        const cambio = this.montoRecibido ? (this.montoRecibido - this.mesaSeleccionada!.total) : 0;
        this.snackBar.open(`✅ Venta Guardada. Cambio: Q${cambio.toFixed(2)}`, 'CERRAR', { duration: 5000 });
        
        // Desagrupamos usando la función que ya existe
        this.desagruparMesaActual();

        this.mesaSeleccionada!.carrito = [];
        this.mesaSeleccionada!.total = 0;
        this.mesaSeleccionada!.estado = 'libre';
        this.mesaSeleccionada = null; 
        this.montoRecibido = null;
        this.mostrandoPantallaPago = false;
        
        this.guardarEstado();
      },
      error: (err: any) => console.error(err)
    });
  }
}