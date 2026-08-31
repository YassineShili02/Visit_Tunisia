import { Component, Input, Output, EventEmitter, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { CountryCode, COUNTRY_CODES, PhoneRule, getPhoneRule } from '../../data/constants';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-phone-field',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './phone-field.component.html',
})
export class PhoneFieldComponent implements OnChanges {
  @Input() dial = '+216';
  @Input() countryCode = 'TN';
  @Input() localValue = '';
  @Output() dialChange = new EventEmitter<{ code: string; dial: string }>();
  @Output() localChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<{ isValid: boolean; message: string; fullPhone?: string }>();

  countries = COUNTRY_CODES;
  dropdownOpen = false;
  search = '';
  touched = false;

  constructor(private transloco: TranslocoService, private lang: LanguageService) {}

  get selectedCountry(): CountryCode {
    return this.countries.find(c => c.code === this.countryCode) ?? this.countries[0];
  }

  get rule(): PhoneRule {
    return getPhoneRule(this.countryCode);
  }

  countryLabel(c: CountryCode): string {
    return this.lang.getCountryName(c.code);
  }

  get filtered(): CountryCode[] {
    const s = this.search.toLowerCase();
    return this.countries.filter(c =>
      this.lang.getCountryName(c.code).toLowerCase().includes(s) ||
      c.name.toLowerCase().includes(s) || c.dial.includes(s) || c.code.toLowerCase().includes(s)
    );
  }

  get digitsOnly(): string {
    return (this.localValue || '').replace(/\D/g, '');
  }

  get digitCount(): number {
    return this.digitsOnly.length;
  }

  get isValid(): boolean {
    if (this.digitCount === 0) return true; // Optional field
    return this.digitCount >= this.rule.minLen && this.digitCount <= this.rule.maxLen;
  }

  get statusMessage(): string {
    if (this.digitCount === 0) {
      return '';
    }
    if (this.digitCount < this.rule.minLen) {
      const missing = this.rule.minLen - this.digitCount;
      return this.transloco.translate('common.phoneMissing', {
        current: this.digitCount, min: this.rule.minLen, missing, s: missing > 1 ? 's' : '',
      });
    }
    if (this.digitCount >= this.rule.minLen && this.digitCount <= this.rule.maxLen) {
      return this.transloco.translate('common.phoneValid', {
        phone: `${this.selectedCountry.dial} ${this.formatPreview(this.digitsOnly)}`,
      });
    }
    return this.transloco.translate('common.phoneTooLong', { country: this.lang.getCountryName(this.selectedCountry.code) });
  }

  formatPreview(digits: string): string {
    if (digits.length === 8) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 9) {
      return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return digits;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countryCode'] || changes['dial'] || changes['localValue']) {
      this.emitValidity();
    }
  }

  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }

  selectCountry(c: CountryCode): void {
    this.countryCode = c.code;
    this.dial = c.dial;
    this.dialChange.emit({ code: c.code, dial: c.dial });
    this.dropdownOpen = false;
    this.search = '';
    if (this.digitCount > this.rule.maxLen) {
      this.localValue = this.digitsOnly.slice(0, this.rule.maxLen);
      this.localChange.emit(this.localValue);
    }
    this.emitValidity();
  }

  onLocalInput(val: string): void {
    const cleaned = val.replace(/\D/g, '').slice(0, this.rule.maxLen);
    this.localValue = cleaned;
    this.touched = true;
    this.localChange.emit(cleaned);
    this.emitValidity();
  }

  private emitValidity(): void {
    const fullPhone = this.digitCount > 0 ? `${this.dial}${this.digitsOnly}` : undefined;
    this.validityChange.emit({
      isValid: this.isValid,
      message: this.statusMessage,
      fullPhone
    });
  }

  flagUrl(code: string): string {
    return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.dropdownOpen) this.dropdownOpen = false;
  }
}
