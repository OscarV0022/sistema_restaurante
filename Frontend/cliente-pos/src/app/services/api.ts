import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = `http://${window.location.hostname}:3000`;

  constructor(private http: HttpClient) { }

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
  
  getReportePorFecha(fecha: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/reportes/${fecha}`, this.getHeaders());
  }

  registrarEfectivo(datos: { monto: number; tipo: string; motivo: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/efectivo`, datos, this.getHeaders());
  }

  verificarCajaInicialHoy(): Observable<{ registrada: boolean }> {
    return this.http.get<{ registrada: boolean }>(`${this.apiUrl}/api/efectivo/caja-inicial-hoy`, this.getHeaders());
  }

  getVentasHoy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/ventas/hoy`, this.getHeaders());
  } 

  eliminarProductoVenta(idDetalle: number, cantidad: number = 1): Observable<any> {
  return this.http.delete<any>(`${this.apiUrl}/api/ventas/detalle/${idDetalle}`, {
    ...this.getHeaders(),
    body: { cantidad }
  });
}

  eliminarVentaCompleta(idVenta: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/api/ventas/${idVenta}`, this.getHeaders());
  }
  
}