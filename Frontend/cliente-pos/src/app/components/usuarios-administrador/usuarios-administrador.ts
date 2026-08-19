import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-usuarios-administrador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios-administrador.html',
  styleUrls: ['./usuarios-administrador.css']
})
export class UsuariosAdministradorComponent implements OnInit {
  usuarios: any[] = [];
  usuario = { id: null, username: '', nombre: '', rol: 'cajero', password: '' };
  esEdicion = false;
  
  // Cambia el puerto si tu backend corre en otro lado
  private apiUrl = `http://${window.location.hostname}:3000/api`;


  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.http.get<any[]>(`${this.apiUrl}/auth/usuarios`).subscribe({
      next: (data) => this.usuarios = data,
      error: (err) => console.error('Error al cargar usuarios:', err)
    });
  }

  guardar() {
    if (this.esEdicion) {
      this.http.put(`${this.apiUrl}/auth/usuarios/${this.usuario.id}`, this.usuario).subscribe({
        next: () => {
          this.cargarUsuarios();
          this.resetForm();
        },
        error: (err) => console.error('Error al actualizar:', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/auth/registrar`, this.usuario).subscribe({
        next: () => {
          this.cargarUsuarios();
          this.resetForm();
        },
        error: (err) => console.error('Error al crear:', err)
      });
    }
  }

  
  editar(u: any) {
    this.usuario = { ...u, password: '' };
    this.esEdicion = true;
  }

  eliminar(id: number) {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      this.http.delete(`${this.apiUrl}/auth/usuarios/${id}`).subscribe({
        next: () => this.cargarUsuarios(),
        error: (err) => console.error('Error al eliminar:', err)
      });
    }
  }

  resetForm() {
    this.usuario = { id: null, username: '', nombre: '', rol: 'cajero', password: '' };
    this.esEdicion = false;
  }
}