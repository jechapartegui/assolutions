import {
  AfterViewInit,
  Directive,
  ElementRef,
  OnDestroy,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '.riders-scroll-container',
  standalone: false,
})
export class RiderScrollHintsDirective implements AfterViewInit, OnDestroy {
  private leftButton?: HTMLButtonElement;
  private rightButton?: HTMLButtonElement;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private destroyed = false;

  private readonly onScroll = () => this.scheduleUpdate();
  private readonly onWindowResize = () => this.scheduleUpdate();

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  ngAfterViewInit(): void {
    const element = this.host.nativeElement;
    this.renderer.addClass(element, 'rider-scroll-hints-managed');

    this.leftButton = this.createButton('left');
    this.rightButton = this.createButton('right');

    this.renderer.insertBefore(element, this.leftButton, element.firstChild);
    this.renderer.appendChild(element, this.rightButton);

    element.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onWindowResize, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleUpdate());
      this.resizeObserver.observe(element);
    }

    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => this.scheduleUpdate());
      this.mutationObserver.observe(element, { childList: true, subtree: true });
    }

    this.scheduleUpdate();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    const element = this.host.nativeElement;
    element.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  private createButton(direction: 'left' | 'right'): HTMLButtonElement {
    const button = this.renderer.createElement('button') as HTMLButtonElement;
    button.type = 'button';
    button.textContent = direction === 'left' ? '‹' : '›';
    button.className = `rider-scroll-hint rider-scroll-hint--${direction} is-hidden-edge`;
    button.title = direction === 'left' ? 'Voir les personnes précédentes' : 'Voir les personnes suivantes';
    button.setAttribute('aria-label', button.title);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const element = this.host.nativeElement;
      const amount = Math.max(170, Math.round(element.clientWidth * 0.7));
      element.scrollBy({
        left: direction === 'left' ? -amount : amount,
        behavior: 'smooth',
      });
    });

    return button;
  }

  private scheduleUpdate(): void {
    requestAnimationFrame(() => {
      if (!this.destroyed) this.updateState();
    });
  }

  private updateState(): void {
    const element = this.host.nativeElement;
    const cards = Array.from(
      element.querySelectorAll<HTMLElement>('.rider-card-button'),
    );

    if (!cards.length) {
      this.setVisible(this.leftButton, false);
      this.setVisible(this.rightButton, false);
      return;
    }

    const first = cards[0];
    const last = cards[cards.length - 1];
    const epsilon = 5;
    const firstLeft = first.offsetLeft;
    const lastRight = last.offsetLeft + last.offsetWidth;
    const viewportLeft = element.scrollLeft;
    const viewportRight = viewportLeft + element.clientWidth;

    this.setVisible(this.leftButton, viewportLeft > firstLeft + epsilon);
    this.setVisible(this.rightButton, lastRight > viewportRight + epsilon);
  }

  private setVisible(button: HTMLButtonElement | undefined, visible: boolean): void {
    if (!button) return;
    button.classList.toggle('is-hidden-edge', !visible);
    button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    button.tabIndex = visible ? 0 : -1;
  }
}
