import { TranslateService } from '../services/translate.service';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true
})
export class TranslatePipe implements PipeTransform {
  constructor(private translateService: TranslateService) {}

  transform(value: string): string {
    return this.translateService.translate(value);
  }
}
