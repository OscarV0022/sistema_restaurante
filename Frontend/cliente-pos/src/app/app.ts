import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './components/header/header';
import { SocketService } from './services/socket';
import { ChatStateService } from './services/chat-state';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected title = 'Chiantlequita';
  showHeader = true;

  // Estados globales de llamadas para TODO el sistema
  llamadaEntrante: boolean = false;
  personaLlamando: string = '';
  
  llamadaActiva: boolean = false;
  personaEnLlamada: string = '';

  private subs: Subscription = new Subscription();

  constructor(
    private router: Router, 
    private socketService: SocketService,
    private chatState: ChatStateService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showHeader = event.url !== '/login';
      }
    });
  }

  ngOnInit(): void {
    this.verificarYRegistrarUsuario();
    this.suscripcionesGlobales();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private verificarYRegistrarUsuario() {
    try {
      const usuarioLocal = localStorage.getItem('usuario');
      if (usuarioLocal) {
        const parsed = JSON.parse(usuarioLocal);
        if (parsed && parsed.nombre) {
          this.socketService.registrarUsuario(parsed.nombre);
        }
      }
    } catch (e) {}
  }

  private suscripcionesGlobales() {
    // 1. Escuchar mensajes generales en cualquier pantalla
    this.subs.add(
      this.socketService.onMensajeGeneral().subscribe(msg => {
        this.chatState.agregarMensaje('GENERAL', msg);
      })
    );

    // 2. Escuchar mensajes privados en cualquier pantalla
    this.subs.add(
      this.socketService.onMensajePrivado().subscribe(msg => {
        this.chatState.agregarMensaje(msg.remitente, msg);
      })
    );

    // 3. Escuchar llamadas entrantes globalmente
    this.subs.add(
      this.socketService.onLlamadaEntrante().subscribe((data: { de: string }) => {
        if (!this.llamadaActiva) {
          this.llamadaEntrante = true;
          this.personaLlamando = data.de;
        }
      })
    );

    // 4. Escuchar cuando finaliza la llamada globalmente
    this.subs.add(
      this.socketService.onLlamadaFinalizada().subscribe(() => {
        this.cerrarLlamadaGlobal();
      })
    );
  }

  // 🌟 ACCIONES GLOBALES DE LLAMADA 🌟
  aceptarLlamada() {
    this.llamadaEntrante = false;
    this.llamadaActiva = true;
    this.personaEnLlamada = this.personaLlamando;
  }

  rechazarLlamada() {
    this.llamadaEntrante = false;
    const socket = this.socketService.getSocket();
    socket.emit('colgar_llamada_privada', { para: this.personaLlamando });
  }

  colgarLlamada() {
    const socket = this.socketService.getSocket();
    socket.emit('colgar_llamada_privada', { para: this.personaEnLlamada });
    this.cerrarLlamadaGlobal();
  }

  private cerrarLlamadaGlobal() {
    this.llamadaEntrante = false;
    this.llamadaActiva = false;
    this.personaEnLlamada = '';
  }
}