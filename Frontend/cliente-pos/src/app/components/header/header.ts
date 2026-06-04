import { Component } from '@angular/core';
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
export class Header {
  menuAbierto = false;

  constructor(private router: Router) {}

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