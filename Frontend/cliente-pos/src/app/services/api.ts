import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // OJO: Asegúrate que este puerto coincida con tu server.js (3000 o 3001)
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) { }

  // 1. Obtener lista de productos
  getMenu(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/menu`);
  }

  // 2. Enviar la venta al backend
  guardarVenta(venta: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/venta`, venta);
  }

  guardarEncargo(encargo: any) {
    return this.http.post(`${this.apiUrl}/encargos`, encargo);
  }

  getEncargos() {
    return this.http.get(`${this.apiUrl}/encargos`);
  }

  pagarEncargo(id: number) {
    return this.http.put(`${this.apiUrl}/encargos/${id}/pagar`, {});
  }

}