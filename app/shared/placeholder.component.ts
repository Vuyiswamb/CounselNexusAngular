import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from './icon.component';

/** Placeholder for Phase-1 modules whose screens are not designed yet. */
@Component({
  selector: 'app-placeholder',
  imports: [IconComponent],
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.css'],
})
export class PlaceholderComponent implements OnInit {
  title = 'Module';
  icon = 'dashboard';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.title = this.route.snapshot.data['title'] ?? 'Module';
    this.icon = this.route.snapshot.data['icon'] ?? 'dashboard';
  }
}
