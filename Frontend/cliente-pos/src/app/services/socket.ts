import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private url = `http://${window.location.hostname}:3000`;
  private mensajePrivadoSubject = new Subject<any>();
  private mensajeGeneralSubject = new Subject<any>();
  private llamadaEntranteSubject = new Subject<any>();
  private llamadaFinalizadaSubject = new Subject<void>();

  constructor() {
    this.socket = io(this.url);
    this.configurarEscuchasGlobales();
  }

  private configurarEscuchasGlobales() {
    this.socket.on('nuevo_mensaje_general', (msg: any) => {
      this.mensajeGeneralSubject.next(msg);
    });

    this.socket.on('nuevo_mensaje_privado', (msg: any) => {
      this.mensajePrivadoSubject.next(msg);
    });

    this.socket.on('recibir_llamada_privada', (data: { de: string }) => {
      this.llamadaEntranteSubject.next(data);
    });

    this.socket.on('llamada_finalizada_privada', () => {
      this.llamadaFinalizadaSubject.next();
    });
  }

  registrarUsuario(nombre: string) {
    if (nombre) {
      this.socket.emit('registrar_usuario', nombre);
    }
  }

  // 🌟 Método para iniciar una llamada saliente hacia otro usuario 🌟
  iniciarLlamada(de: string, para: string) {
    this.socket.emit('iniciar_llamada_privada', { de, para });
  }

  // 🌟 Método para colgar o finalizar la llamada 🌟
  colgarLlamada(para: string) {
    this.socket.emit('colgar_llamada_privada', { para });
    this.llamadaFinalizadaSubject.next();
  }

  getUsuariosConectados(): Observable<string[]> {
    return new Observable((observer) => {
      this.socket.on('lista_usuarios', (usuarios: string[]) => {
        observer.next(usuarios);
      });
    });
  }

  // Observables públicos para escuchar en cualquier componente
  onMensajePrivado(): Observable<any> {
    return this.mensajePrivadoSubject.asObservable();
  }

  onMensajeGeneral(): Observable<any> {
    return this.mensajeGeneralSubject.asObservable();
  }

  onLlamadaEntrante(): Observable<any> {
    return this.llamadaEntranteSubject.asObservable();
  }

  onLlamadaFinalizada(): Observable<void> {
    return this.llamadaFinalizadaSubject.asObservable();
  }

  getSocket(): Socket {
    return this.socket;
  }
}