import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit, OnDestroy {
  menuAbierto = false;
  
  horaActual: string = '';
  private timer: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.actualizarHora();
    this.timer = setInterval(() => {
      this.actualizarHora();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  actualizarHora() {
    const ahora = new Date();
    // Mostramos únicamente hora y minutos (ej. 4:15 p. m.)
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
    this.router.navigate(['/login']);
  }
}