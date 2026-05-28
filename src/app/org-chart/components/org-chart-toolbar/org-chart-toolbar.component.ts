import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideMaximize2, LucideNetwork, LucideSearch, LucideZoomIn, LucideZoomOut } from '@lucide/angular';

@Component({
  selector: 'app-org-chart-toolbar',
  imports: [LucideMaximize2, LucideZoomIn, LucideZoomOut, LucideSearch, LucideNetwork],
  templateUrl: './org-chart-toolbar.component.html',
  styleUrl: './org-chart-toolbar.component.css'
})
// concentra las acciones principales del diagrama
export class OrgChartToolbarComponent {
  @Input() rightOffset = 16;
  @Input() searchActive = false;
  @Input() treeActive = false;

  @Output() fit = new EventEmitter<void>();
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() toggleSearch = new EventEmitter<void>();
  @Output() toggleTree = new EventEmitter<void>();
}
