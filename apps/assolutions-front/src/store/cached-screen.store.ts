export abstract class CachedScreenStore<TData> {
  protected currentData: TData | null = null;
  protected pendingData: TData | null = null;

  protected constructor(protected readonly ttlMs: number) {}

  protected hasCurrentCache(initialized: boolean): boolean {
    return initialized && this.currentData !== null;
  }

  protected isExpired(lastLoadedAt: number | null): boolean {
    if (!lastLoadedAt) return true;
    return Date.now() - lastLoadedAt > this.ttlMs;
  }

  protected shouldRefreshSilently(
    initialized: boolean,
    lastLoadedAt: number | null,
  ): boolean {
    return initialized && this.isExpired(lastLoadedAt);
  }

  protected setCurrentData(data: TData): void {
    this.currentData = data;
    this.pendingData = null;
  }

  protected setPendingData(data: TData | null): void {
    this.pendingData = data;
  }

  protected applyPendingData(): TData | null {
    if (!this.pendingData) return null;

    this.currentData = this.pendingData;
    this.pendingData = null;
    return this.currentData;
  }

  protected clearCacheData(): void {
    this.currentData = null;
    this.pendingData = null;
  }
}