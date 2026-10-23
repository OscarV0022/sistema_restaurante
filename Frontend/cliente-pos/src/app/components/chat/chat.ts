import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Socket } from 'socket.io-client';
import { SocketService } from '../../services/socket';
import { ChatStateService } from '../../services/chat-state';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface Mensaje {
  remitente: string;
  destinatario?: string;
  texto: string;
  hora: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private socket!: Socket;
  usuarioActual: string = '';
  usuariosConectados: string[] = [];
  textoMensaje: string = '';

  enLlamada: boolean = false;

  constructor(
    private socketService: SocketService,
    public chatState: ChatStateService
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.obtenerNombreUsuario();
    this.socket = this.socketService.getSocket();

    this.socketService.getUsuariosConectados().subscribe((usuarios: string[]) => {
      this.usuariosConectados = usuarios.filter(u => u !== this.usuarioActual);
    });

    this.socketService.onLlamadaFinalizada().subscribe(() => {
      this.colgar(true);
    });

    this.scrollToBottom();
  }

  private obtenerNombreUsuario(): string {
    try {
      const usuarioLocal = localStorage.getItem('usuario');
      if (usuarioLocal) {
        const parsed = JSON.parse(usuarioLocal);
        if (parsed && parsed.nombre) return parsed.nombre;
      }
    } catch (e) {}
    return 'Personal';
  }

  seleccionarChat(chat: string | null) {
    this.chatState.setUsuarioSeleccionado(chat);
    this.scrollToBottom();
  }

  enviarMensaje() {
    if (!this.textoMensaje.trim()) return;

    const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sel = this.chatState.getUsuarioSeleccionado();

    if (sel === 'GENERAL') {
      const nuevoMsg: Mensaje = { remitente: this.usuarioActual, texto: this.textoMensaje.trim(), hora: horaActual };
      this.chatState.agregarMensaje('GENERAL', nuevoMsg);
      this.socket.emit('enviar_mensaje_general', nuevoMsg);
    } else if (sel) {
      const nuevoMsg: Mensaje = { remitente: this.usuarioActual, destinatario: sel, texto: this.textoMensaje.trim(), hora: horaActual };
      this.chatState.agregarMensaje(sel, nuevoMsg);
      this.socket.emit('enviar_mensaje_privado', nuevoMsg);
    }

    this.textoMensaje = '';
    this.scrollToBottom();
  }

  get usuarioSeleccionado(): string | null {
    return this.chatState.getUsuarioSeleccionado();
  }

  get mensajesActivos(): Mensaje[] {
    const key = this.chatState.getUsuarioSeleccionado() || 'GENERAL';
    return this.chatState.obtenerHistorial(key);
  }

  llamar() {
    const sel = this.chatState.getUsuarioSeleccionado();
    if (!sel || sel === 'GENERAL') return;
    this.socketService.iniciarLlamada(this.usuarioActual, sel);
    this.enLlamada = true; 
  }

  colgar(externo: boolean = false) {
    this.enLlamada = false;
    const sel = this.chatState.getUsuarioSeleccionado();
    if (!externo && sel && sel !== 'GENERAL') {
      this.socketService.colgarLlamada(sel);
    }
  }

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }
      }, 100);
    } catch(err) {}
  }
}