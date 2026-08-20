import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api';
import { io, Socket } from 'socket.io-client';

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
  estado: 'libre' | 'en-espera' | 'ocupada';
  visible: boolean;
  mesasHijas: number[];
  carrito: any[];
  total: number;
  atendidoPor?: string;
  estadoCocina?: 'pendientes' | 'preparando' | 'completo';
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
export class Pos implements OnInit, OnDestroy {
  
  menu: any[] = [];
  productosVisibles: any[] = [];
  categorias: string[] = [];
  busqueda: string = '';
  categoriaSeleccionada: string | null = null;

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

  modoAgrupar: boolean = false;
  mesaOrigen: Mesa | null = null;

  mostrandoPantallaPago: boolean = false; 
  montoRecibido: number | null = null;

  private socket!: Socket;
  
  // --- VARIABLES DE AUDIO PARA EL POS ---
  private API_URL = `http://${window.location.hostname}:3000/api`;
  private audioCtx: AudioContext | null = null;
  audioHabilitado: boolean = false;
  private vozPlayer: HTMLAudioElement = new Audio();

  constructor(
    private api: ApiService, 
    private snackBar: MatSnackBar,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.cargarMenu();
    this.inicializarSocket();

    // 🌟 TRUCO: Desbloquear el audio en el primer clic del mesero 🌟
    document.addEventListener('click', () => {
      if (!this.audioHabilitado) {
        this.activarAudioSilencioso();
      }
    }, { once: true });
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }

  // --- MÉTODOS DE AUDIO ---
  activarAudioSilencioso() {
    this.audioHabilitado = true;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    console.log("Audio del POS desbloqueado con el primer clic.");
  }

  private reproducirTono(tipo: 'preparando' | 'completo') {
    if (!this.audioHabilitado || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      // Tono diferente: más grave para "preparando", agudo para "completo"
      osc.frequency.setValueAtTime(tipo === 'completo' ? 880 : 440, this.audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {
      console.error(e);
    }
  }

  private anunciarEstadoMesa(nombreMesa: string, estado: string) {
    if (!this.audioHabilitado) return;

    let texto = '';
    if (estado === 'preparando') {
      texto = `El pedido de la ${nombreMesa} se está preparando.`;
    } else if (estado === 'completo') {
      texto = `Atención. El pedido de la ${nombreMesa} ya está listo.`;
    } else {
      return; // No anunciar si el estado es 'pendientes'
    }
    
    const url = `${this.API_URL}/tts?text=${encodeURIComponent(texto)}`;

    this.vozPlayer.pause();
    this.vozPlayer.src = url;
    this.vozPlayer.load();
    this.vozPlayer.play().catch(err => console.error("Error reproduciendo voz:", err));
  }
  // -------------------------

  private obtenerNombreUsuario(): string {
    try {
      const usuarioLocal = localStorage.getItem('usuario');
      if (usuarioLocal) {
        const parsed = JSON.parse(usuarioLocal);
        if (parsed && parsed.nombre) return parsed.nombre;
      }

      const token = localStorage.getItem('token');
      if (token) {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        if (payload && payload.nombre) return payload.nombre;
      }
    } catch (e) {
      console.error("Error al extraer el nombre del usuario:", e);
    }
    return 'Personal';
  }

  inicializarSocket() {
    this.socket = io(`http://${window.location.hostname}:3000`);

    const datosCargados = this.cargarEstadoGuardado();
    const tieneParaLlevar = this.todasLasMesas.some(m => m.seccion === 'PARA LLEVAR');

    if (datosCargados && !tieneParaLlevar) {
        this.todasLasMesas = [];
        this.secciones = [];
        this.inicializarMesas();
    } else if (!datosCargados) {
        this.inicializarMesas();
    }

    this.socket.on('sincronizar_mesas', (mesasRemotas: Mesa[]) => {
      this.todasLasMesas = mesasRemotas;
      localStorage.setItem('restaurante_mesas', JSON.stringify(this.todasLasMesas));
      
      if (this.mesaSeleccionada) {
        const actualizada = this.todasLasMesas.find(m => m.id === this.mesaSeleccionada!.id);
        if (actualizada) {
          this.mesaSeleccionada = actualizada;
        }
      }
    });

    // 🌟 ESCUCHAR A LA COCINA Y AVISAR POR VOZ AL MESERO 🌟
    this.socket.on('estado_cocina_cambiado', (data: { mesa: string, estado: 'pendientes' | 'preparando' | 'completo' }) => {
      const mesaEncontrada = this.todasLasMesas.find(m => m.nombre === data.mesa);
      if (mesaEncontrada) {
        mesaEncontrada.estadoCocina = data.estado;
        this.guardarEstado();

        // Disparar audios si la cocina cambió el estado a preparando o completo
        if (data.estado === 'preparando' || data.estado === 'completo') {
            this.reproducirTono(data.estado);
            this.anunciarEstadoMesa(data.mesa, data.estado);
        }
      }
    });
  }

  irAEncargos() {
    this.router.navigate(['/encargos']);
  }

  guardarEstado() {
    localStorage.setItem('restaurante_mesas', JSON.stringify(this.todasLasMesas));
    if (this.socket) {
      this.socket.emit('actualizar_mesas', this.todasLasMesas);
    }
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
    
    if (mesa.estado === 'libre') {
      mesa.estado = 'en-espera';
      mesa.atendidoPor = this.obtenerNombreUsuario();
      this.guardarEstado();
    }

    this.montoRecibido = null; 
    this.mostrandoPantallaPago = false; 
    this.verCategorias(); 
    this.mesaSeleccionada = mesa;
  }

  regresarAlMapa() { 
      if (this.mesaSeleccionada) {
        if (this.mesaSeleccionada.carrito.length === 0) {
          const confirmar = confirm('¿Estás seguro de regresar? No se ha ordenado nada.');
          if (confirmar) {
            this.mesaSeleccionada.estado = 'libre';
            this.mesaSeleccionada.atendidoPor = undefined;
            this.mesaSeleccionada.estadoCocina = undefined;
            this.desagruparMesaActual();
            this.guardarEstado();
          } else {
            return; 
          }
        } else {
          this.mesaSeleccionada.estado = 'ocupada';
          this.mesaSeleccionada.estadoCocina = 'pendientes';
          
          if (this.socket) {
            const ticketCocina = {
              mesa: this.mesaSeleccionada.nombre,
              atendidoPor: this.mesaSeleccionada.atendidoPor,
              detalles: this.mesaSeleccionada.carrito.map(item => ({
                descripcion: item.descripcion,
                cantidad: item.cantidad
              }))
            };
            this.socket.emit('nueva_orden', ticketCocina);
          }

          this.guardarEstado();
        }
      }

      this.mesaSeleccionada = null; 
      this.montoRecibido = null;
      this.mostrandoPantallaPago = false;
      this.verCategorias();
  }

  cambiarEstadoManual() {
    if (!this.mesaSeleccionada) return;
    if (this.mesaSeleccionada.estado === 'libre') {
        this.mesaSeleccionada.estado = 'en-espera';
        this.mesaSeleccionada.atendidoPor = this.obtenerNombreUsuario();
        this.snackBar.open('Marcada como EN ESPERA', 'OK', { duration: 2000 });
    } else if (this.mesaSeleccionada.estado === 'en-espera') {
        this.mesaSeleccionada.estado = 'ocupada';
        this.snackBar.open('Marcada como OCUPADA', 'OK', { duration: 2000 });
    } else {
        if (confirm('¿Liberar mesa y borrar pedido?')) {
            this.mesaSeleccionada.estado = 'libre';
            this.mesaSeleccionada.carrito = [];
            this.mesaSeleccionada.total = 0;
            this.mesaSeleccionada.atendidoPor = undefined;
            this.mesaSeleccionada.estadoCocina = undefined;
            this.desagruparMesaActual();
            this.snackBar.open('Mesa LIBERADA', 'OK', { duration: 2000 });
        }
    }
    this.guardarEstado();
  }

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
    origen.atendidoPor = undefined;
    origen.estadoCocina = undefined;

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
        mesaHija.atendidoPor = undefined;
        mesaHija.estadoCocina = undefined;
        mesaHija.mesasHijas = [];
      }
    });
    padre.mesasHijas = [];
    this.snackBar.open('Mesas separadas.', 'OK', { duration: 3000 });
    this.guardarEstado();
  }

  agregarAlCarrito(producto: any) {
    if (!this.mesaSeleccionada) return;
    this.mesaSeleccionada.estado = 'ocupada';
    
    if (!this.mesaSeleccionada.atendidoPor) {
      this.mesaSeleccionada.atendidoPor = this.obtenerNombreUsuario();
    }
    
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

  editarPrecio(item: any) {
    if (!this.mesaSeleccionada) return;

    const nuevoPrecioStr = prompt(`Ingresa precio especial para "${item.descripcion}":`, item.precio);

    if (nuevoPrecioStr !== null) {
      const nuevoPrecio = parseFloat(nuevoPrecioStr);

      if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
        item.precio = nuevoPrecio;
        item.subtotal = item.cantidad * item.precio;
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
        
        if (this.socket && this.mesaSeleccionada) {
          this.socket.emit('limpiar_ticket', this.mesaSeleccionada.nombre);
        }

        this.desagruparMesaActual();

        this.mesaSeleccionada!.carrito = [];
        this.mesaSeleccionada!.total = 0;
        this.mesaSeleccionada!.estado = 'libre';
        this.mesaSeleccionada!.atendidoPor = undefined;
        this.mesaSeleccionada!.estadoCocina = undefined;
        this.mesaSeleccionada = null; 
        this.montoRecibido = null;
        this.mostrandoPantallaPago = false;
        
        this.guardarEstado();
      },
      error: (err: any) => console.error(err)
    });
  }
}