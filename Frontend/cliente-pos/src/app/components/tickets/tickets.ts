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
      if (!orden.detalles || orden.detalles.length === 0) {
        this.tickets = this.tickets.filter(t => t.mesa !== orden.mesa);
        return;
      }

      const index = this.tickets.findIndex(t => t.mesa === orden.mesa);
      if (index !== -1) {
        const ticketAnterior = this.tickets[index];
        let itemsEliminadosOustin: any[] = [];

        // 1. Detectar productos agregados o aumentados
        orden.detalles = orden.detalles.map((itemNuevo: any) => {
          const itemViejo = ticketAnterior.detalles.find((i: any) => i.descripcion === itemNuevo.descripcion);
          const esNuevo = !itemViejo || itemNuevo.cantidad > itemViejo.cantidad;
          return { ...itemNuevo, esNuevo };
        });

        // 2. Detectar qué se eliminó por completo o se redujo
        ticketAnterior.detalles.forEach((itemViejo: any) => {
          const itemNuevo = orden.detalles.find((i: any) => i.descripcion === itemViejo.descripcion);
          if (!itemNuevo) {
            // Se eliminó por completo
            itemsEliminadosOustin.push({ cantidad: itemViejo.cantidad, descripcion: itemViejo.descripcion });
          } else if (itemNuevo.cantidad < itemViejo.cantidad) {
            // Se redujo la cantidad
            const diferencia = itemViejo.cantidad - itemNuevo.cantidad;
            itemsEliminadosOustin.push({ cantidad: diferencia, descripcion: itemViejo.descripcion });
          }
        });

        this.tickets[index] = { 
          ...orden, 
          estado: 'pendientes', 
          minimizado: false,
          eliminados: itemsEliminadosOustin.length > 0 ? itemsEliminadosOustin : (ticketAnterior.eliminados || [])
        };

        this.reproducirSonidoAlerta();

        // Armar el mensaje de voz incluyendo los eliminados si los hay
        let mensajeVoz = `Se ha actualizado el pedido de la ${orden.mesa}.`;
        if (itemsEliminadosOustin.length > 0) {
          const descEliminadas = itemsEliminadosOustin.map(e => `${e.cantidad} ${e.descripcion}`).join(', ');
          mensajeVoz += ` Atención: se ha eliminado ${descEliminadas}.`;
        }
        this.reproducirVozPersonalizada(mensajeVoz);

      } else {
        orden.detalles = orden.detalles.map((i: any) => ({ ...i, esNuevo: true }));
        this.tickets.unshift({ ...orden, estado: 'pendientes', minimizado: false, eliminados: [] });
        this.reproducirSonidoAlerta();
        this.reproducirVozPersonalizada(`Atención. Nuevo pedido para ${orden.mesa}.`);
      }
    });

    this.socket.on('remover_ticket', (nombreMesa: string) => {
      const ticketExistente = this.tickets.find(t => t.mesa === nombreMesa);
      if (ticketExistente) {
        this.tickets = this.tickets.filter(t => t.mesa !== nombreMesa);
        this.reproducirVozPersonalizada(`El pedido de la ${nombreMesa} ha sido cancelado o liberado.`);
      }
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

  private reproducirVozPersonalizada(textoMensaje: string) {
    if (!this.audioHabilitado) return;
    const url = `${this.API_URL}/tts?text=${encodeURIComponent(textoMensaje)}`;

    this.vozPlayer.pause();
    this.vozPlayer.src = url;
    this.vozPlayer.load();
    this.vozPlayer.play().catch(err => console.error("Error reproduciendo voz:", err));
  }

  leerPedidoManual(ticket: any) {
    if (!this.audioHabilitado) this.activarAudio();

    let texto = `Para la ${ticket.mesa} piden: `;
    if (ticket.detalles && ticket.detalles.length > 0) {
      const articulos = ticket.detalles.map((item: any) => `${item.cantidad} ${item.descripcion}`).join(', ');
      texto += articulos + '.';
    } else {
      texto += 'No hay detalles en este pedido.';
    }

    if (ticket.eliminados && ticket.eliminados.length > 0) {
      const eliminadosTexto = ticket.eliminados.map((e: any) => `${e.cantidad} ${e.descripcion}`).join(', ');
      texto += ` Además se eliminó: ${eliminadosTexto}.`;
    }

    this.reproducirVozPersonalizada(texto);
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