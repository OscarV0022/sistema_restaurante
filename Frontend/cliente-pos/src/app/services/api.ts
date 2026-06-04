import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) { }

  getMenu(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/menu`);
  }

  guardarVenta(venta: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/venta`, venta);
  }

  guardarEncargo(encargo: any) {
    return this.http.post(`${this.apiUrl}/encargos`, encargo);
  }

  getEncargos() {
    return this.http.get(`${this.apiUrl}/encargos`);
  }

  // --- FUNCIÓN NUEVA PARA BUSCAR POR FECHA ---
  getEncargosPorFecha(fecha: string) {
    return this.http.get(`${this.apiUrl}/encargos/${fecha}`);
  }

  pagarEncargo(id: number) {
    return this.http.put(`${this.apiUrl}/encargos/${id}/pagar`, {});
  }
}