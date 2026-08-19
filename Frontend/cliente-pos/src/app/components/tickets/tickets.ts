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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.socket = io('http://localhost:3000');

    // Escuchar nuevas órdenes que envía el POS al dar click en Ordenar
    this.socket.on('nueva_orden', (orden: any) => {
      const index = this.tickets.findIndex(t => t.mesa === orden.mesa);
      if (index !== -1) {
        // Actualiza la orden existente y la expande si llega nueva info
        this.tickets[index] = { ...orden, estado: 'pendientes', minimizado: false };
      } else {
        // Añade la nueva orden al inicio de la lista
        this.tickets.unshift({ ...orden, estado: 'pendientes', minimizado: false });
      }
    });

    // Escuchar si la mesa fue cobrada/liberada para remover el ticket automáticamente
    this.socket.on('remover_ticket', (nombreMesa: string) => {
      this.tickets = this.tickets.filter(t => t.mesa !== nombreMesa);
    });
  }

  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  cambiarEstado(ticket: any, nuevoEstado: 'preparando' | 'completo') {
    ticket.estado = nuevoEstado;
    
    // Al marcar como completo, lo minimizamos automáticamente para despejar la cocina
    if (nuevoEstado === 'completo') {
      ticket.minimizado = true;
    }

    // Emitir el cambio a través de Socket.io
    this.socket.emit('actualizar_estado_cocina', {
      mesa: ticket.mesa,
      estado: nuevoEstado
    });
  }

  toggleMinimizar(ticket: any) {
    ticket.minimizado = !ticket.minimizado;
  }

  irAlPos() {
    this.router.navigate(['/pos']);
  }
}