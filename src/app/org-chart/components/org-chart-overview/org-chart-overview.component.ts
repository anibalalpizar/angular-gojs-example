import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as go from 'gojs';
import { createOrgChartOverview, disposeOverview } from '../../factories/org-chart-diagram.factory';

@Component({
  selector: 'app-org-chart-overview',
  templateUrl: './org-chart-overview.component.html',
  styleUrl: './org-chart-overview.component.css'
})
export class OrgChartOverviewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() diagram: go.Diagram | undefined;
  @Input() rightOffset = 16;

  @ViewChild('overviewHost', { static: true })
  private overviewHost?: ElementRef<HTMLDivElement>;

  private overview?: go.Overview;
  private viewReady = false;

  // espera a que exista el contenedor antes de crear el overview
  ngAfterViewInit(): void {
    this.viewReady = true;
    this.attachOverview();
  }

  // intenta reconectar el overview cuando cambia el diagrama
  ngOnChanges(_changes: SimpleChanges): void {
    this.attachOverview();
  }

  // limpia el overview para no dejar referencias al canvas
  ngOnDestroy(): void {
    disposeOverview(this.overview);
  }

  // crea el overview solo cuando hay vista y diagrama listos
  private attachOverview(): void {
    if (!this.viewReady || !this.overviewHost || !this.diagram) {
      return;
    }

    if (this.overview?.observed === this.diagram) {
      return;
    }

    disposeOverview(this.overview);
    this.overview = createOrgChartOverview(this.overviewHost.nativeElement, this.diagram);
  }
}
