import { Routes } from '@angular/router';
import { Pos } from './components/pos/pos';
import { Encargos } from './components/encargos/encargos';
import { LoginComponent } from './components/login/login';
import { authGuard } from './guards/auth-guard';

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
    
    { path: '**', redirectTo: '' },
];