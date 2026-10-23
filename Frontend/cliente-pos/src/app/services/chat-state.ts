import { Injectable } from '@angular/core';

interface Mensaje {
  remitente: string;
  destinatario?: string;
  texto: string;
  hora: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatStateService {
  // Historiales agrupados por canal o usuario
  private historialChats: { [usuario: string]: Mensaje[] } = {
    'GENERAL': []
  };

  private usuarioSeleccionadoActual: string | null = 'GENERAL';

  obtenerHistorial(chatKey: string): Mensaje[] {
    if (!this.historialChats[chatKey]) {
      this.historialChats[chatKey] = [];
    }
    return this.historialChats[chatKey];
  }

  agregarMensaje(chatKey: string, mensaje: Mensaje) {
    if (!this.historialChats[chatKey]) {
      this.historialChats[chatKey] = [];
    }
    this.historialChats[chatKey].push(mensaje);
  }

  getUsuarioSeleccionado(): string | null {
    return this.usuarioSeleccionadoActual;
  }

  setUsuarioSeleccionado(chat: string | null) {
    this.usuarioSeleccionadoActual = chat;
  }

  // 🌟 BORRAR TODO AL CERRAR SESIÓN 🌟
  limpiarSesionChat() {
    this.historialChats = { 'GENERAL': [] };
    this.usuarioSeleccionadoActual = 'GENERAL';
  }
}