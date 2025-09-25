import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/page-detail/page-detail.component').then((m) => m.PageDetailComponent),
  },
  {
    path: 'add',
    loadComponent: () => import('./pages/page-add/page-add.component').then((m) => m.PageAddComponent),
  },
  {
    path: 'edit',
    loadComponent: () => import('./pages/page-edit/page-edit.component').then((m) => m.PageEditComponent),
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
      },
    ],
  },
  {
    path: 'expenses',
    loadComponent: () => import('./pages/expenses/expenses.component').then((m) => m.ExpensesComponent),
  },
  {
    path: 'notes',
    loadComponent: () => import('./pages/notes/notes.component').then((m) => m.NotesComponent),
  },
  {
    path: ':slug/:subpage',
    loadComponent: () => import('./pages/page-detail/page-detail.component').then((m) => m.PageDetailComponent),
  },
  {
    path: ':slug',
    loadComponent: () => import('./pages/page-detail/page-detail.component').then((m) => m.PageDetailComponent),
  },
];
