import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = `http://${window.location.hostname}:3000`;

  constructor(private http: HttpClient) { }

  // Método auxiliar privado para obtener los headers con el Token de sesión
  private getHeaders() {
    const token = localStorage.getItem('token') || '';
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getMenu(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/menu`, this.getHeaders());
  }

  guardarVenta(venta: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/venta`, venta, this.getHeaders());
  }

  guardarEncargo(encargo: any) {
    return this.http.post(`${this.apiUrl}/api/encargos`, encargo, this.getHeaders());
  }

  getEncargos() {
    return this.http.get(`${this.apiUrl}/api/encargos`, this.getHeaders());
  }

  getEncargosPorFecha(fecha: string) {
    return this.http.get(`${this.apiUrl}/api/encargos/${fecha}`, this.getHeaders());
  }

  pagarEncargo(id: number) {
    return this.http.put(`${this.apiUrl}/api/encargos/${id}/pagar`, {}, this.getHeaders());
  }
}