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

  get canEssai() {
    return this.sessionStore.canEssai;
  }

  get hasProjet() {
    return this.sessionStore.hasProjet;
  }

  get language() {
    return this.sessionStore.language;
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