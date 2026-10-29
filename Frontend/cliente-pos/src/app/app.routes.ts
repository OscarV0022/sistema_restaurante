import { Routes } from '@angular/router';
import { Pos } from './components/pos/pos';
import { Encargos } from './components/encargos/encargos';
import { LoginComponent } from './components/login/login';
import { TicketsComponent } from './components/tickets/tickets';
import { authGuard } from './guards/auth-guard';
import { UsuariosAdministradorComponent } from './components/usuarios-administrador/usuarios-administrador';
import { ProductosComponent } from './components/productos/productos';
import { ChatComponent } from './components/chat/chat';
import { VentasComponent} from './components/ventas/ventas';
import { ReportesComponent } from './components/reportes/reportes';

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

    { 
        path: 'reportes', 
        component: ReportesComponent, 
        canActivate: [authGuard], 
        data: { expectedRoles: ['admin'] } 
    },

    { 
    path: 'chat', 
    component: ChatComponent, 
    canActivate: [authGuard] 
    },

    { 
    path: 'ventas', 
    component: VentasComponent, 
    canActivate: [authGuard],
    data: { expectedRoles: ['admin', 'cajero']}
    },
    
    { path: '**', redirectTo: '' },
];