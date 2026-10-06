import { Component, Input } from '@angular/core';

/**
 * Inline stroke-icon set (24x24 viewBox, currentColor).
 * Keeps the app dependency-free; add cases here as new icons are extremely needed.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.css'],
  imports: []
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 18;
  @Input() strokeWidth = 2;
}
