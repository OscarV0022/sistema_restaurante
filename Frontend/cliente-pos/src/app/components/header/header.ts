import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit, OnDestroy {
  menuAbierto = false;
  
  horaActual: string = '';
  private timer: any;

  mostrarModalEfectivo = false;
  mostrarModalInicial = false;
  
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | null = null;
  montoMovimiento: number | null = null;
  motivoMovimiento: string = '';

  montoInicial: number | null = null;
  guardando: boolean = false;

  constructor(
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.actualizarHora();
    this.timer = setInterval(() => {
      this.actualizarHora();
    }, 1000);

    // Verificamos la caja para cualquier usuario con sesión iniciada
    if (this.getRole()) {
      this.comprobarCajaInicial();
    }
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  actualizarHora() {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  getRole() { return localStorage.getItem('rol'); }

  canAccess(roles: string[]): boolean {
    const role = this.getRole();
    if (!role) return false;
    if (role === 'admin') return true;
    return roles.includes(role);
  }

  logout() {
    localStorage.clear();
    this.mostrarModalInicial = false;
    this.router.navigate(['/login']);
  }

  comprobarCajaInicial() {
    this.api.verificarCajaInicialHoy().subscribe({
      next: (res) => {
        if (!res.registrada) {
          this.mostrarModalInicial = true;
        } else {
          this.mostrarModalInicial = false;
        }
      },
      error: (err) => console.error('Error al comprobar caja inicial:', err)
    });
  }

  guardarCajaInicial() {
    if (this.guardando) return;

    if (!this.montoInicial || this.montoInicial <= 0) {
      alert('Por favor, ingresa un monto inicial válido.');
      return;
    }

    this.guardando = true;

    this.api.registrarEfectivo({
      monto: this.montoInicial,
      tipo: 'INICIAL',
      motivo: 'Apertura de caja inicial diaria'
    }).subscribe({
      next: () => {
        alert('Caja inicial registrada correctamente.');
        this.mostrarModalInicial = false;
        this.montoInicial = null;
        this.guardando = false;
      },
      error: (err) => {
        console.error(err);
        alert(err.error?.message || 'Error al registrar caja inicial.');
        this.guardando = false;
      }
    });
  }

  abrirModalEfectivo() {
    this.mostrarModalEfectivo = true;
    this.tipoMovimiento = null;
    this.montoMovimiento = null;
    this.motivoMovimiento = '';
  }

  cerrarModalEfectivo() {
    this.mostrarModalEfectivo = false;
    this.tipoMovimiento = null;
    this.montoMovimiento = null;
    this.motivoMovimiento = '';
  }

  seleccionarTipo(tipo: 'ENTRADA' | 'SALIDA') {
    this.tipoMovimiento = tipo;
    this.montoMovimiento = null;
    this.motivoMovimiento = '';
  }

  guardarMovimiento() {
    if (this.guardando) return;

    if (!this.montoMovimiento || this.montoMovimiento <= 0) {
      alert('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (!this.motivoMovimiento.trim()) {
      alert('Ingresa el motivo del movimiento.');
      return;
    }

    this.guardando = true;

    this.api.registrarEfectivo({
      monto: this.montoMovimiento,
      tipo: this.tipoMovimiento!,
      motivo: this.motivoMovimiento
    }).subscribe({
      next: () => {
        alert(`${this.tipoMovimiento === 'ENTRADA' ? 'Entrada' : 'Salida'} guardada con éxito.`);
        this.cerrarModalEfectivo();
        this.guardando = false;
      },
      error: (err) => {
        console.error(err);
        alert('Error al guardar el movimiento de efectivo.');
        this.guardando = false;
      }
    });
  }
}