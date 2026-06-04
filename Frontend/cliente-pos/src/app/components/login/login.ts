import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class LoginComponent {
  loginData = { username: '', password: '' };
  error = '';
  private API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin() {
    this.http.post<any>(`${this.API_URL}/api/auth/login`, this.loginData)
      .subscribe({
        next: (res) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('rol', res.usuario.rol);
          
          this.router.navigate(['/ventas']);
        },
        error: (err) => {
          this.error = 'Usuario o contraseña incorrectos';
        }
      });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}