import { Injectable } from '@angular/core';
import { SessionStore } from '../store/session.store';

@Injectable({ providedIn: 'root' })
export class AppStore {
  constructor(
    private readonly sessionStore: SessionStore,
  ) {}

  get session() {
    return this.sessionStore.session;
  }

  get selectedMenu() {
    return this.sessionStore.selectedMenu;
  }

  get isLoggedIn() {
    return this.sessionStore.isLoggedIn;
  }

  get mode() {
    return this.sessionStore.mode;
  }

  get compte() {
    return this.sessionStore.compte;
  }

  get projects() {
    return this.sessionStore.projects;
  }

  get selectedProject() {
    return this.sessionStore.selectedProject;
  }

  get selectedProjectId() {
    return this.sessionStore.selectedProjectId;
  }

  get saison_active_id() {
    return this.sessionStore.saisonActiveId;
  }

  get saison_active() {
    return this.sessionStore.saisonActive;
  }

  get rights() {
    return this.sessionStore.rights;
  }

  get isAdmin() {
    return this.sessionStore.isAdmin;
  }

  get isProf() {
    return this.sessionStore.isProf;
  }


  get hasProjet() {
    return this.sessionStore.hasProjet;
  }

  get language() {
    return this.sessionStore.language;
  }

  get projectCount(): number {
    return this.sessionStore.projects?.().length ?? 0;
  }

  get hasOneProject(): boolean {
    return this.projectCount === 1;
  }

  get hasManyProjects(): boolean {
    return this.projectCount > 1;
  }

  get hasNoProject(): boolean {
    return this.projectCount === 0;
  }

  findProjectById(projectId: number): any | null {
    const projects = this.sessionStore.projects?.() ?? [];
    return projects.find((p: any) => Number(p.id) === Number(projectId)) ?? null;
  }

  canAccessProject(projectId: number): boolean {
    return !!this.findProjectById(projectId);
  }

  setSession(session: any): void {
    this.sessionStore.setSession(session);
  }

  clearSession(): void {
    this.sessionStore.clearSession();
  }

  setProjects(projects: any[]): void {
    this.sessionStore.setProjects(projects);
  }

  selectProject(projectId: number): void {
    this.sessionStore.selectProject(projectId);
  }

  updateSaisonActive(saisonId: number): void {
    this.sessionStore.updateSaisonActive(saisonId);
  }

  setLanguage(lang: string): void {
    this.sessionStore.setLanguage(lang);
  }

  updateSelectedMenu(menu: any): void {
    this.sessionStore.updateSelectedMenu(menu);
  }
}