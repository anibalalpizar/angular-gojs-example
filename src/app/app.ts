import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as go from 'gojs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('diagramHost', { static: true })
  private diagramHost?: ElementRef<HTMLDivElement>;

  private diagram?: go.Diagram;

  ngAfterViewInit(): void {
    if (!this.diagramHost || !this.hasBrowserCanvas(this.diagramHost.nativeElement)) {
      return;
    }

    this.diagram = new go.Diagram(this.diagramHost.nativeElement, {
      'undoManager.isEnabled': true,
      initialContentAlignment: go.Spot.Center,
      model: new go.GraphLinksModel([], [])
    });
  }

  ngOnDestroy(): void {
    if (this.diagram) {
      this.diagram.div = null;
    }
  }

  private hasBrowserCanvas(host: HTMLElement): boolean {
    const view = host.ownerDocument.defaultView;

    return !!view && !view.navigator.userAgent.includes('jsdom');
  }
}
