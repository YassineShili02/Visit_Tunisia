import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { CountryCode, COUNTRY_CODES } from '../../data/constants';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-country-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './country-picker.component.html',
  styleUrls: ['./country-picker.component.css']
})
export class CountryPickerComponent {
  @Input() selectedCountryName = 'Tunisie';
  @Output() countryChange = new EventEmitter<string>();

  countries = COUNTRY_CODES;
  dropdownOpen = false;
  search = '';

  constructor(private lang: LanguageService) {}

  countryLabel(c: CountryCode): string {
    return this.lang.getCountryName(c.code);
  }

  get currentCountry(): CountryCode {
    return (
      this.countries.find(c => c.name.toLowerCase() === this.selectedCountryName?.toLowerCase() || c.code === this.selectedCountryName) ||
      this.countries[0]
    );
  }

  get filteredCountries(): CountryCode[] {
    const s = this.search.toLowerCase().trim();
    let list = this.countries;
    if (s) {
      list = this.countries.filter(c =>
        this.lang.getCountryName(c.code).toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) =>
      this.lang.getCountryName(a.code).localeCompare(this.lang.getCountryName(b.code), this.lang.currentLang)
    );
  }

  toggleDropdown(e?: MouseEvent): void {
    if (e) e.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectCountry(c: CountryCode, e?: MouseEvent): void {
    if (e) e.stopPropagation();
    this.selectedCountryName = c.name;
    this.countryChange.emit(c.name);
    this.dropdownOpen = false;
    this.search = '';
  }

  flagUrl(code: string): string {
    return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }
}
