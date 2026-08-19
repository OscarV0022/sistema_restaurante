import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuariosAdministrador } from './usuarios-administrador';

describe('UsuariosAdministrador', () => {
  let component: UsuariosAdministrador;
  let fixture: ComponentFixture<UsuariosAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosAdministrador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsuariosAdministrador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
