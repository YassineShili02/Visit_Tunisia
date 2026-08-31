import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Destination } from '../../data/models';
import { CATEGORY_COLORS, TUNISIA_PATH } from '../../data/constants';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-tunisia-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tunisia-map.component.html',
})
export class TunisiaMapComponent {
  @Input() destinations: Destination[] = [];
  @Input() hoveredId: number | null = null;
  @Output() hover = new EventEmitter<number | null>();

  private langService = inject(LanguageService);

  tunisiaPath = TUNISIA_PATH;
  categoryColors = CATEGORY_COLORS;

  // Major governorate labels with their approximate positions on the SVG map
  governorateLabels = [
    { name: 'Tunis', x: 240, y: 100 },
    { name: 'Bizerte', x: 220, y: 60 },
    { name: 'Nabeul', x: 290, y: 120 },
    { name: 'Sousse', x: 270, y: 200 },
    { name: 'Sfax', x: 270, y: 280 },
    { name: 'Kairouan', x: 220, y: 180 },
    { name: 'Gabès', x: 240, y: 350 },
    { name: 'Médenine', x: 280, y: 410 },
    { name: 'Tozeur', x: 140, y: 300 },
    { name: 'Gafsa', x: 160, y: 250 },
  ];

  getColor(category: string): string {
    return (this.categoryColors as Record<string, string>)[category] ?? '#1B6FA8';
  }

  getTooltipWidth(name: string): number {
    return Math.max(52, name.length * 6.5);
  }

  categoryLabel(category: string): string {
    return this.langService.getCategoryLabel(category);
  }

  regionLabel(region: string): string {
    return this.langService.getRegionLabel(region);
  }

  get categoryEntries(): [string, string][] {
    return Object.entries(this.categoryColors) as [string, string][];
  }
}
