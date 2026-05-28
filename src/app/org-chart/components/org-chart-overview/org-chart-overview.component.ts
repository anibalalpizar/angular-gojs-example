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

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.attachOverview();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.attachOverview();
  }

  ngOnDestroy(): void {
    disposeOverview(this.overview);
  }

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
