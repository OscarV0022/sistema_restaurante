import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  constructor(private router: Router) {}

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