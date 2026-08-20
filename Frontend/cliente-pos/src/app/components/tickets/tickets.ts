import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule
  ],
  templateUrl: './tickets.html',
  styleUrls: ['./tickets.css']
})
export class TicketsComponent implements OnInit, OnDestroy {
  tickets: any[] = [];
  private socket!: Socket;
  private API_URL = `http://${window.location.hostname}:3000/api`;
  
  private audioCtx: AudioContext | null = null;
  audioHabilitado: boolean = false;
  private vozPlayer: HTMLAudioElement = new Audio();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.socket = io(`http://${window.location.hostname}:3000`);

    this.socket.on('tickets_iniciales', (ticketsGuardados: any[]) => {
      this.tickets = ticketsGuardados;
    });

    this.socket.on('nueva_orden', (orden: any) => {
      const index = this.tickets.findIndex(t => t.mesa === orden.mesa);
      if (index !== -1) {
        this.tickets[index] = { ...orden, estado: 'pendientes', minimizado: false };
      } else {
        this.tickets.unshift({ ...orden, estado: 'pendientes', minimizado: false });
        this.reproducirSonidoAlerta();
        this.reproducirVozNatural(orden.mesa);
      }
    });

    this.socket.on('remover_ticket', (nombreMesa: string) => {
      this.tickets = this.tickets.filter(t => t.mesa !== nombreMesa);
    });
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }

  activarAudio() {
    this.audioHabilitado = true;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    console.log("Audio habilitado. Listo para notificaciones.");
  }

  private reproducirSonidoAlerta() {
    if (!this.audioHabilitado) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const reproducirTono = (freq: number, duracion: number, retraso: number) => {
        setTimeout(() => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duracion);
          
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          
          osc.start();
          osc.stop(this.audioCtx.currentTime + duracion);
        }, retraso);
      };

      reproducirTono(587.33, 0.2, 0);   
      reproducirTono(880.00, 0.3, 150); 

    } catch (e) {
      console.error("Error en alerta de audio:", e);
    }
  }

  private reproducirVozNatural(nombreMesa: string) {
    if (!this.audioHabilitado) return;
    const texto = `Atención. Nuevo pedido para ${nombreMesa}.`;
    const url = `${this.API_URL}/tts?text=${encodeURIComponent(texto)}`;

    this.vozPlayer.pause();
    this.vozPlayer.src = url;
    this.vozPlayer.load();
    this.vozPlayer.play().catch(err => console.error("Error reproduciendo MP3 de voz:", err));
  }

  // 🌟 NUEVO: Función para leer los detalles del ticket a petición 🌟
  leerPedidoManual(ticket: any) {
    if (!this.audioHabilitado) this.activarAudio(); // Asegurarse de que el audio esté activo

    let texto = `Para la ${ticket.mesa} piden: `;
    
    if (ticket.detalles && ticket.detalles.length > 0) {
      // Extrae la cantidad y el nombre de cada producto, y los une con comas
      const articulos = ticket.detalles.map((item: any) => `${item.cantidad} ${item.descripcion}`).join(', ');
      texto += articulos + '.';
    } else {
      texto += 'No hay detalles en este pedido.';
    }

    const url = `${this.API_URL}/tts?text=${encodeURIComponent(texto)}`;

    this.vozPlayer.pause();
    this.vozPlayer.src = url;
    this.vozPlayer.load();
    this.vozPlayer.play().catch(err => console.error("Error reproduciendo lectura manual:", err));
  }

  cambiarEstado(ticket: any, nuevoEstado: 'preparando' | 'completo') {
    ticket.estado = nuevoEstado;
    if (nuevoEstado === 'completo') ticket.minimizado = true;
    this.socket.emit('actualizar_estado_cocina', { mesa: ticket.mesa, estado: nuevoEstado });
  }

  toggleMinimizar(ticket: any) {
    ticket.minimizado = !ticket.minimizado;
  }

  irAlPos() {
    this.router.navigate(['/pos']);
  }
}