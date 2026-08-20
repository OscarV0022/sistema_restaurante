import { Routes } from '@angular/router';
import { Pos } from './components/pos/pos';
import { Encargos } from './components/encargos/encargos';
import { LoginComponent } from './components/login/login';
import { TicketsComponent } from './components/tickets/tickets';
import { authGuard } from './guards/auth-guard';
import { UsuariosAdministradorComponent } from './components/usuarios-administrador/usuarios-administrador';

// 👇 1. Importamos el nuevo componente (revisa que la ruta coincida con tu estructura de carpetas)
import { ProductosComponent } from './components/productos/productos';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    
    { 
        path: '', 
        component: Pos, 
        canActivate: [authGuard] 
    },
    
    { 
        path: 'encargos', 
        component: Encargos, 
        canActivate: [authGuard], 
        data: { expectedRoles: ['admin', 'mesero', 'cajero', 'cocina'] } 
    },

    { 
        path: 'tickets', 
        component: TicketsComponent, 
        canActivate: [authGuard], 
        data: { expectedRoles: ['admin', 'cocina'] } 
    },

    { 
        path: 'usuarios', 
        component: UsuariosAdministradorComponent,
    },
    
    { 
        path: 'productos', 
        component: ProductosComponent, 
        canActivate: [authGuard], 
        data: { expectedRoles: ['admin', 'cajero'] } 
    },
    
    { path: '**', redirectTo: '' },
];